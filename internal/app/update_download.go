package app

import (
	"archive/tar"
	"archive/zip"
	"compress/gzip"
	"context"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"
)

func (a *App) runUpdateDownload(ctx context.Context, info UpdateInfo) {
	if err := a.prepareUpdateDirs(); err != nil {
		a.setUpdateError(fmt.Sprintf("准备更新目录失败：%v", err), &info)
		return
	}
	pkgPath := filepath.Join(updateDownloadsDir(), info.AssetName)
	downloading := UpdateState{Phase: UpdatePhaseDownloading, Info: &info}
	a.setUpdateState(downloading, true)
	if err := a.downloadUpdatePackage(ctx, info.DownloadURL, pkgPath, info); err != nil {
		_ = os.Remove(pkgPath)
		if ctx.Err() != nil {
			state := UpdateState{Phase: UpdatePhaseAvailable, Info: &info, ManualOnlyReason: info.ManualOnlyReason}
			a.setUpdateState(state, true)
			return
		}
		a.setUpdateError(fmt.Sprintf("下载更新失败：%v", err), &info)
		return
	}

	a.setUpdateState(UpdateState{Phase: UpdatePhaseVerifying, Info: &info, Message: "正在校验安装包"}, true)
	got, err := sha256File(pkgPath)
	if err != nil {
		_ = os.Remove(pkgPath)
		a.setUpdateError(fmt.Sprintf("读取安装包失败：%v", err), &info)
		return
	}
	if !strings.EqualFold(got, info.ExpectedSHA256) {
		_ = os.Remove(pkgPath)
		a.setUpdateError("安装包校验失败", &info)
		return
	}

	a.setUpdateState(UpdateState{Phase: UpdatePhaseExtracting, Info: &info, Message: "正在解压安装包"}, true)
	stagedRoot := filepath.Join(updateStagedDir(), sanitizePathPart(info.LatestVersion))
	_ = os.RemoveAll(stagedRoot)
	if err := os.MkdirAll(stagedRoot, 0o700); err != nil {
		a.setUpdateError(fmt.Sprintf("创建解压目录失败：%v", err), &info)
		return
	}
	if err := extractArchive(pkgPath, stagedRoot); err != nil {
		_ = os.RemoveAll(stagedRoot)
		a.setUpdateError(fmt.Sprintf("解压更新失败：%v", err), &info)
		return
	}
	source, err := findStagedSource(stagedRoot)
	if err != nil {
		_ = os.RemoveAll(stagedRoot)
		a.setUpdateError(err.Error(), &info)
		return
	}
	target, err := installTargetPath()
	if err != nil {
		a.setUpdateError(fmt.Sprintf("获取安装路径失败：%v", err), &info)
		return
	}
	updater, err := currentUpdaterPath()
	if err != nil {
		a.setUpdateError(fmt.Sprintf("获取更新组件失败：%v", err), &info)
		return
	}
	ready := ReadyUpdate{
		Version:     info.LatestVersion,
		AssetName:   info.AssetName,
		PackagePath: pkgPath,
		StagedPath:  source,
		TargetPath:  target,
		UpdaterPath: updater,
		LaunchPath:  launchPathForTarget(target),
		BackupPath:  backupPathForTarget(target),
	}
	state := UpdateState{Phase: UpdatePhaseReady, Info: &info, Ready: &ready, Message: "更新已准备就绪"}
	a.updateMu.Lock()
	a.updateCancel = nil
	a.updateMu.Unlock()
	a.setUpdateState(state, true)
}

func (a *App) downloadUpdatePackage(ctx context.Context, rawURL, dest string, info UpdateInfo) error {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, rawURL, nil)
	if err != nil {
		return err
	}
	resp, err := a.updateHTTPClientWithTimeout(0).Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("HTTP 状态 %d", resp.StatusCode)
	}
	out, err := os.OpenFile(dest, os.O_CREATE|os.O_WRONLY|os.O_TRUNC, 0o600)
	if err != nil {
		return err
	}
	defer out.Close()

	buf := make([]byte, 64*1024)
	var downloaded int64
	total := resp.ContentLength
	for {
		n, readErr := resp.Body.Read(buf)
		if n > 0 {
			if _, err := out.Write(buf[:n]); err != nil {
				return err
			}
			downloaded += int64(n)
			state := UpdateState{Phase: UpdatePhaseDownloading, Info: &info, Downloaded: downloaded, Total: total}
			if total > 0 {
				p := float64(downloaded) * 100 / float64(total)
				state.Percent = &p
			}
			a.setUpdateState(state, true)
		}
		if readErr == io.EOF {
			break
		}
		if readErr != nil {
			return readErr
		}
	}
	return nil
}

func extractArchive(src, dest string) error {
	if strings.HasSuffix(src, ".zip") {
		return extractZip(src, dest)
	}
	if strings.HasSuffix(src, ".tar.gz") || strings.HasSuffix(src, ".tgz") {
		return extractTarGz(src, dest)
	}
	return fmt.Errorf("不支持的安装包格式")
}

func extractZip(src, dest string) error {
	r, err := zip.OpenReader(src)
	if err != nil {
		return err
	}
	defer r.Close()
	for _, f := range r.File {
		path, err := safeJoin(dest, f.Name)
		if err != nil {
			return err
		}
		if f.FileInfo().IsDir() {
			if err := os.MkdirAll(path, 0o700); err != nil {
				return err
			}
			continue
		}
		if err := os.MkdirAll(filepath.Dir(path), 0o700); err != nil {
			return err
		}
		rc, err := f.Open()
		if err != nil {
			return err
		}
		mode := f.FileInfo().Mode()
		if mode == 0 {
			mode = 0o600
		}
		out, err := os.OpenFile(path, os.O_CREATE|os.O_WRONLY|os.O_TRUNC, mode)
		if err != nil {
			_ = rc.Close()
			return err
		}
		_, copyErr := io.Copy(out, rc)
		closeErr := out.Close()
		_ = rc.Close()
		if copyErr != nil {
			return copyErr
		}
		if closeErr != nil {
			return closeErr
		}
	}
	return nil
}

func extractTarGz(src, dest string) error {
	f, err := os.Open(src)
	if err != nil {
		return err
	}
	defer f.Close()
	gz, err := gzip.NewReader(f)
	if err != nil {
		return err
	}
	defer gz.Close()
	tr := tar.NewReader(gz)
	for {
		h, err := tr.Next()
		if err == io.EOF {
			break
		}
		if err != nil {
			return err
		}
		path, err := safeJoin(dest, h.Name)
		if err != nil {
			return err
		}
		switch h.Typeflag {
		case tar.TypeDir:
			if err := os.MkdirAll(path, 0o700); err != nil {
				return err
			}
		case tar.TypeReg:
			if err := os.MkdirAll(filepath.Dir(path), 0o700); err != nil {
				return err
			}
			mode := os.FileMode(h.Mode)
			if mode == 0 {
				mode = 0o600
			}
			out, err := os.OpenFile(path, os.O_CREATE|os.O_WRONLY|os.O_TRUNC, mode)
			if err != nil {
				return err
			}
			_, copyErr := io.Copy(out, tr)
			closeErr := out.Close()
			if copyErr != nil {
				return copyErr
			}
			if closeErr != nil {
				return closeErr
			}
		}
	}
	return nil
}

func safeJoin(root, name string) (string, error) {
	clean := filepath.Clean(name)
	if filepath.IsAbs(clean) || strings.HasPrefix(clean, ".."+string(filepath.Separator)) || clean == ".." {
		return "", fmt.Errorf("安装包包含非法路径：%s", name)
	}
	path := filepath.Join(root, clean)
	rootClean := filepath.Clean(root)
	if path != rootClean && !strings.HasPrefix(path, rootClean+string(filepath.Separator)) {
		return "", fmt.Errorf("安装包路径越界：%s", name)
	}
	return path, nil
}
