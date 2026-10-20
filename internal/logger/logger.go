package logger

import (
	"io"
	"log/slog"
	"os"
	"path/filepath"
	"sync"
)

const logFileName = "super-fofa.log"

var (
	mu       sync.Mutex
	fallback = slog.Default()
	current  = fallback
	file     *os.File
)

func Init(logDir string) error {
	mu.Lock()
	defer mu.Unlock()

	if err := os.MkdirAll(logDir, 0o700); err != nil {
		return err
	}

	if file != nil {
		_ = file.Close()
		file = nil
	}

	logPath := filepath.Join(logDir, logFileName)
	f, err := os.OpenFile(logPath, os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0o600)
	if err != nil {
		return err
	}
	file = f

	handler := slog.NewTextHandler(io.MultiWriter(os.Stderr, f), &slog.HandlerOptions{Level: slog.LevelDebug})
	current = slog.New(handler)
	slog.SetDefault(current)
	current.Info("logger initialized", "log_file", logPath)
	return nil
}

func For(module string) *slog.Logger {
	mu.Lock()
	base := current
	mu.Unlock()
	return base.With("module", module)
}

func Close() error {
	mu.Lock()
	defer mu.Unlock()
	if file == nil {
		return nil
	}
	err := file.Close()
	file = nil
	current = fallback
	slog.SetDefault(fallback)
	return err
}
