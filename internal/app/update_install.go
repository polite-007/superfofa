package app

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strconv"
	"time"

	wailsRuntime "github.com/wailsapp/wails/v2/pkg/runtime"
)

func (a *App) InstallAndRestart() error {
	state := a.GetUpdateState()
	if state.Phase != UpdatePhaseReady || state.Ready == nil {
		return fmt.Errorf("更新尚未准备就绪")
	}
	ready := *state.Ready
	if !fileExists(ready.UpdaterPath) {
		return fmt.Errorf("更新组件缺失，请手动下载新版安装")
	}
	if err := os.MkdirAll(updateDataDir(), 0o700); err != nil {
		return err
	}
	args := []string{
		"--pid", strconv.Itoa(os.Getpid()),
		"--source", ready.StagedPath,
		"--target", ready.TargetPath,
		"--backup", ready.BackupPath,
		"--launch", ready.LaunchPath,
		"--log", updateLogPath(),
		"--state", updateStatePath(),
		"--version", ready.Version,
	}
	cmd := exec.Command(ready.UpdaterPath, args...)
	cmd.Stdout = nil
	cmd.Stderr = nil
	if err := cmd.Start(); err != nil {
		return fmt.Errorf("启动更新组件失败：%w", err)
	}
	a.setUpdateState(UpdateState{Phase: UpdatePhaseInstalling, Info: state.Info, Ready: &ready, Message: "正在重启安装"}, true)
	go func() {
		time.Sleep(300 * time.Millisecond)
		if a.ctx != nil {
			wailsRuntime.Quit(a.ctx)
		}
	}()
	return nil
}

func (a *App) OnBeforeClose(ctx context.Context) bool {
	state := a.GetUpdateState()
	switch state.Phase {
	case UpdatePhaseDownloading:
		_ = a.CancelUpdate()
		return false
	case UpdatePhaseReady, UpdatePhaseInstalling:
		if a.ctx != nil {
			wailsRuntime.EventsEmit(a.ctx, updateStateEvent, state)
			_, _ = wailsRuntime.MessageDialog(a.ctx, wailsRuntime.MessageDialogOptions{
				Type:    wailsRuntime.WarningDialog,
				Title:   "更新已准备就绪",
				Message: "请点击“重启并安装”完成更新。",
			})
		}
		return true
	default:
		return false
	}
}

func (a *App) RequestQuit() {
	if a.OnBeforeClose(a.ctx) {
		return
	}
	if a.ctx != nil {
		wailsRuntime.Quit(a.ctx)
	}
}

func writeUpdateStatus(path string, st updateStatusFile) error {
	if err := os.MkdirAll(filepath.Dir(path), 0o700); err != nil {
		return err
	}
	b, err := json.MarshalIndent(st, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(path, b, 0o600)
}
