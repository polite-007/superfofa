package app

import (
	"fmt"
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"time"
)

const (
	appDataDirName = ".superfofa"
	updateDirName  = "update"
)

func userDataDir() string {
	home, err := os.UserHomeDir()
	if err != nil {
		return "."
	}
	return filepath.Join(home, appDataDirName)
}

func updateDataDir() string {
	return filepath.Join(userDataDir(), updateDirName)
}

func updateDownloadsDir() string {
	return filepath.Join(updateDataDir(), "downloads")
}

func updateStagedDir() string {
	return filepath.Join(updateDataDir(), "staged")
}

func updateStatePath() string {
	return filepath.Join(updateDataDir(), "last-update-state.json")
}

func updateLogPath() string {
	return filepath.Join(updateDataDir(), "update.log")
}

func currentExecutablePath() (string, error) {
	exe, err := os.Executable()
	if err != nil {
		return "", err
	}
	return filepath.EvalSymlinks(exe)
}

func installTargetPath() (string, error) {
	exe, err := currentExecutablePath()
	if err != nil {
		return "", err
	}
	if runtime.GOOS == "darwin" {
		if appPath := findAppBundle(exe); appPath != "" {
			return appPath, nil
		}
	}
	return filepath.Dir(exe), nil
}

func launchPathForTarget(target string) string {
	if runtime.GOOS == "darwin" && strings.HasSuffix(target, ".app") {
		return filepath.Join(target, "Contents", "MacOS", "superfofa")
	}
	if runtime.GOOS == "windows" {
		return filepath.Join(target, "superfofa.exe")
	}
	return filepath.Join(target, "superfofa")
}

func currentUpdaterPath() (string, error) {
	exe, err := currentExecutablePath()
	if err != nil {
		return "", err
	}
	if runtime.GOOS == "darwin" {
		return filepath.Join(filepath.Dir(exe), "superfofa-updater"), nil
	}
	name := "superfofa-updater"
	if runtime.GOOS == "windows" {
		name += ".exe"
	}
	return filepath.Join(filepath.Dir(exe), name), nil
}

func backupPathForTarget(target string) string {
	stamp := time.Now().Format("20060102-150405")
	base := strings.TrimSuffix(filepath.Base(target), string(filepath.Separator))
	return filepath.Join(filepath.Dir(target), fmt.Sprintf("%s.backup-%s", base, stamp))
}

func findAppBundle(path string) string {
	path = filepath.Clean(path)
	for {
		if strings.HasSuffix(path, ".app") {
			return path
		}
		parent := filepath.Dir(path)
		if parent == path {
			return ""
		}
		path = parent
	}
}

func canWriteDir(dir string) error {
	if err := os.MkdirAll(dir, 0o700); err != nil {
		return err
	}
	f, err := os.CreateTemp(dir, ".superfofa-write-test-*")
	if err != nil {
		return err
	}
	name := f.Name()
	_ = f.Close()
	return os.Remove(name)
}
