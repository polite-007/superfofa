package app

import (
	"bufio"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"time"
)

const (
	updateRepoOwner       = "polite-007"
	updateRepoName        = "superfofa"
	checksumAssetName     = "checksums.txt"
	manualReasonNoAsset   = "未找到当前平台安装包，请手动下载"
	manualReasonNoHash    = "当前版本未提供校验文件，无法自动安装，请手动下载"
	manualReasonNoUpdater = "更新组件缺失，请手动下载新版安装"
	manualReasonNoWrite   = "当前安装位置无写入权限，请手动下载新版安装"
)

type releaseAsset struct {
	Name               string `json:"name"`
	BrowserDownloadURL string `json:"browser_download_url"`
}

func (a *App) updateHTTPClient() *http.Client {
	return a.updateHTTPClientWithTimeout(30 * time.Second)
}

func (a *App) updateHTTPClientWithTimeout(timeout time.Duration) *http.Client {
	client := &http.Client{Timeout: timeout}
	cfg, _ := a.GetKeyConfig()
	if proxy := strings.TrimSpace(cfg.Proxy); proxy != "" {
		if pu, err := url.Parse(proxy); err == nil && pu.Scheme != "" {
			client.Transport = &http.Transport{Proxy: http.ProxyURL(pu)}
		}
	}
	return client
}

func currentAssetName() string {
	osName := runtime.GOOS
	if osName == "darwin" {
		osName = "macos"
	}
	ext := ".zip"
	if runtime.GOOS == "linux" {
		ext = ".tar.gz"
	}
	return fmt.Sprintf("superfofa-%s-%s%s", osName, runtime.GOARCH, ext)
}

func pickAsset(assets []releaseAsset, name string) *releaseAsset {
	for i := range assets {
		if assets[i].Name == name && assets[i].BrowserDownloadURL != "" {
			return &assets[i]
		}
	}
	return nil
}

func parseChecksums(text string) map[string]string {
	out := map[string]string{}
	s := bufio.NewScanner(strings.NewReader(text))
	for s.Scan() {
		line := strings.TrimSpace(s.Text())
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}
		parts := strings.Fields(line)
		if len(parts) < 2 {
			continue
		}
		hash := strings.ToLower(strings.TrimSpace(parts[0]))
		name := strings.TrimPrefix(strings.TrimSpace(parts[len(parts)-1]), "*")
		if len(hash) == 64 {
			out[name] = hash
		}
	}
	return out
}

func sha256File(path string) (string, error) {
	f, err := os.Open(path)
	if err != nil {
		return "", err
	}
	defer f.Close()
	h := sha256.New()
	if _, err := io.Copy(h, f); err != nil {
		return "", err
	}
	return hex.EncodeToString(h.Sum(nil)), nil
}

func (a *App) downloadText(url string) (string, error) {
	req, err := http.NewRequest(http.MethodGet, url, nil)
	if err != nil {
		return "", err
	}
	req.Header.Set("Accept", "text/plain,*/*")
	resp, err := a.updateHTTPClient().Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("HTTP 状态 %d", resp.StatusCode)
	}
	b, err := io.ReadAll(io.LimitReader(resp.Body, 2<<20))
	if err != nil {
		return "", err
	}
	return string(b), nil
}

func (a *App) applyAutoInstallPrecheck(info *UpdateInfo, checksumsURL string) {
	if info.DownloadURL == "" {
		info.ManualOnlyReason = manualReasonNoAsset
		return
	}
	if checksumsURL == "" {
		info.ManualOnlyReason = manualReasonNoHash
		return
	}
	text, err := a.downloadText(checksumsURL)
	if err != nil {
		info.ManualOnlyReason = manualReasonNoHash
		return
	}
	hash := parseChecksums(text)[info.AssetName]
	if hash == "" {
		info.ManualOnlyReason = manualReasonNoHash
		return
	}
	info.ChecksumURL = checksumsURL
	info.ExpectedSHA256 = hash

	updater, err := currentUpdaterPath()
	if err != nil || !fileExists(updater) {
		info.ManualOnlyReason = manualReasonNoUpdater
		return
	}
	target, err := installTargetPath()
	if err != nil {
		info.ManualOnlyReason = manualReasonNoWrite
		return
	}
	writeDir := target
	if runtime.GOOS == "darwin" && strings.HasSuffix(target, ".app") {
		writeDir = filepath.Dir(target)
	}
	if err := canWriteDir(writeDir); err != nil {
		info.ManualOnlyReason = manualReasonNoWrite
		return
	}
	info.AutoInstallAvailable = true
}

func fileExists(path string) bool {
	st, err := os.Stat(path)
	return err == nil && !st.IsDir()
}
