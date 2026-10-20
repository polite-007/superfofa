package app

import (
	"fmt"
	"os"
	"path/filepath"
	"runtime"
)

func findStagedSource(root string) (string, error) {
	if runtime.GOOS == "darwin" {
		matches, err := filepath.Glob(filepath.Join(root, "*.app"))
		if err != nil {
			return "", err
		}
		for _, m := range matches {
			if fileExists(filepath.Join(m, "Contents", "MacOS", "superfofa")) && fileExists(filepath.Join(m, "Contents", "MacOS", "superfofa-updater")) {
				return m, nil
			}
		}
		return "", fmt.Errorf("安装包缺少 macOS 应用或更新组件")
	}
	mainName := "superfofa"
	updaterName := "superfofa-updater"
	if runtime.GOOS == "windows" {
		mainName += ".exe"
		updaterName += ".exe"
	}
	candidates := []string{root}
	entries, _ := os.ReadDir(root)
	for _, entry := range entries {
		if entry.IsDir() {
			candidates = append(candidates, filepath.Join(root, entry.Name()))
		}
	}
	for _, c := range candidates {
		if fileExists(filepath.Join(c, mainName)) && fileExists(filepath.Join(c, updaterName)) {
			return c, nil
		}
	}
	return "", fmt.Errorf("安装包缺少主程序或更新组件")
}

func sanitizePathPart(s string) string {
	if s == "" {
		return "unknown"
	}
	out := []rune(s)
	for i, r := range out {
		if (r >= 'a' && r <= 'z') || (r >= 'A' && r <= 'Z') || (r >= '0' && r <= '9') || r == '.' || r == '-' || r == '_' {
			continue
		}
		out[i] = '_'
	}
	return string(out)
}
