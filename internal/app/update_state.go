package app

import (
	"context"
	"encoding/json"
	"errors"
	"os"
	"path/filepath"
	"strings"

	wailsRuntime "github.com/wailsapp/wails/v2/pkg/runtime"
)

var errUpdateBusy = errors.New("已有更新任务正在进行")

func (a *App) GetUpdateState() UpdateState {
	a.updateMu.Lock()
	defer a.updateMu.Unlock()
	return a.updateState
}

func (a *App) setUpdateState(state UpdateState, emit bool) {
	a.updateMu.Lock()
	a.updateState = state
	a.updateMu.Unlock()
	if emit && a.ctx != nil {
		wailsRuntime.EventsEmit(a.ctx, updateStateEvent, state)
	}
}

func (a *App) autoCheckUpdate() {
	a.updateMu.Lock()
	if a.updateAutoChecked {
		a.updateMu.Unlock()
		return
	}
	a.updateAutoChecked = true
	a.updateMu.Unlock()

	info, err := a.checkUpdate(true)
	if err != nil || !info.HasUpdate {
		return
	}
	a.setUpdateState(UpdateState{
		Phase:            UpdatePhaseAvailable,
		Info:             &info,
		ManualOnlyReason: info.ManualOnlyReason,
		AutoToast:        true,
	}, true)
}

func (a *App) setUpdateError(message string, info *UpdateInfo) UpdateState {
	state := UpdateState{Phase: UpdatePhaseError, Message: message, Info: info}
	a.setUpdateState(state, true)
	return state
}

func (a *App) ensureAvailableInfo() (*UpdateInfo, error) {
	state := a.GetUpdateState()
	if state.Info != nil && state.Info.HasUpdate {
		return state.Info, nil
	}
	info, err := a.CheckUpdate()
	if err != nil {
		return nil, err
	}
	if !info.HasUpdate {
		return &info, nil
	}
	return &info, nil
}

func (a *App) StartUpdate() (UpdateState, error) {
	a.updateMu.Lock()
	if isUpdateBusy(a.updateState.Phase) {
		state := a.updateState
		a.updateMu.Unlock()
		return state, errUpdateBusy
	}
	a.updateState.Phase = UpdatePhaseChecking
	a.updateMu.Unlock()
	a.setUpdateState(UpdateState{Phase: UpdatePhaseChecking}, true)

	info, err := a.ensureAvailableInfo()
	if err != nil {
		return a.setUpdateError(StringError(err), nil), err
	}
	if !info.HasUpdate {
		state := UpdateState{Phase: UpdatePhaseIdle, Info: info}
		a.setUpdateState(state, true)
		return state, nil
	}
	if !info.AutoInstallAvailable {
		state := UpdateState{Phase: UpdatePhaseAvailable, Info: info, ManualOnlyReason: info.ManualOnlyReason}
		a.setUpdateState(state, true)
		return state, errors.New(info.ManualOnlyReason)
	}

	ctx, cancel := context.WithCancel(context.Background())
	a.updateMu.Lock()
	a.updateCancel = cancel
	a.updateMu.Unlock()

	go a.runUpdateDownload(ctx, *info)
	state := UpdateState{Phase: UpdatePhaseDownloading, Info: info}
	a.setUpdateState(state, true)
	return state, nil
}

func (a *App) CancelUpdate() error {
	a.updateMu.Lock()
	cancel := a.updateCancel
	phase := a.updateState.Phase
	a.updateMu.Unlock()
	if phase != UpdatePhaseDownloading || cancel == nil {
		return nil
	}
	cancel()
	return nil
}

func (a *App) prepareUpdateDirs() error {
	for _, dir := range []string{updateDataDir(), updateDownloadsDir(), updateStagedDir()} {
		if err := os.MkdirAll(dir, 0o700); err != nil {
			return err
		}
	}
	return nil
}

func (a *App) cleanupUpdateTemp() {
	_ = os.RemoveAll(updateDownloadsDir())
	_ = os.RemoveAll(updateStagedDir())
	_ = os.MkdirAll(updateDownloadsDir(), 0o700)
	_ = os.MkdirAll(updateStagedDir(), 0o700)
}

func (a *App) cleanupSuccessfulUpdateState() {
	b, err := os.ReadFile(updateStatePath())
	if err != nil {
		return
	}
	var st updateStatusFile
	if json.Unmarshal(b, &st) != nil || st.Status != "success" {
		return
	}
	_ = os.Remove(updateStatePath())
	_ = removeOldBackups()
}

func removeOldBackups() error {
	target, err := installTargetPath()
	if err != nil {
		return err
	}
	entries, err := os.ReadDir(filepath.Dir(target))
	if err != nil {
		return err
	}
	prefix := filepath.Base(target) + ".backup-"
	for _, entry := range entries {
		if entry.IsDir() && strings.HasPrefix(entry.Name(), prefix) {
			_ = os.RemoveAll(filepath.Join(filepath.Dir(target), entry.Name()))
		}
	}
	return nil
}

func isUpdateBusy(phase UpdatePhase) bool {
	switch phase {
	case UpdatePhaseChecking, UpdatePhaseDownloading, UpdatePhaseVerifying, UpdatePhaseExtracting, UpdatePhaseReady, UpdatePhaseInstalling:
		return true
	default:
		return false
	}
}

func StringError(err error) string {
	if err == nil {
		return ""
	}
	return err.Error()
}
