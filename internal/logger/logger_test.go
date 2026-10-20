package logger

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestInitCreatesLogFileAndWritesModuleField(t *testing.T) {
	tmp := t.TempDir()
	if err := Init(tmp); err != nil {
		t.Fatalf("Init failed: %v", err)
	}
	defer func() {
		if err := Close(); err != nil {
			t.Fatalf("Close failed: %v", err)
		}
	}()

	For("export").Info("task started", "task_id", "task-1")

	data, err := os.ReadFile(filepath.Join(tmp, "super-fofa.log"))
	if err != nil {
		t.Fatalf("read log file failed: %v", err)
	}
	output := string(data)
	for _, want := range []string{"module=export", "task started", "task_id=task-1"} {
		if !strings.Contains(output, want) {
			t.Fatalf("expected %q in %q", want, output)
		}
	}
}
