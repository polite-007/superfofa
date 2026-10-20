package main

import (
	"encoding/json"
	"flag"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"syscall"
	"time"
)

type updateStatusFile struct {
	Status  string    `json:"status"`
	Version string    `json:"version,omitempty"`
	Stage   string    `json:"stage,omitempty"`
	Message string    `json:"message,omitempty"`
	Time    time.Time `json:"time"`
	Read    bool      `json:"read,omitempty"`
}

func main() {
	pid := flag.Int("pid", 0, "process id to wait for")
	source := flag.String("source", "", "new unpacked app path")
	target := flag.String("target", "", "current install path")
	backup := flag.String("backup", "", "backup path")
	launch := flag.String("launch", "", "new executable path")
	logPath := flag.String("log", "", "log path")
	statePath := flag.String("state", "", "state json path")
	version := flag.String("version", "", "target version")
	flag.Parse()

	logf := func(format string, args ...any) {
		msg := fmt.Sprintf(format, args...)
		if *logPath != "" {
			_ = os.MkdirAll(filepath.Dir(*logPath), 0o700)
			if f, err := os.OpenFile(*logPath, os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0o600); err == nil {
				_, _ = fmt.Fprintf(f, "%s %s\n", time.Now().Format(time.RFC3339), msg)
				_ = f.Close()
			}
		}
	}
	fail := func(stage string, err error) {
		logf("%s failed: %v", stage, err)
		_ = writeState(*statePath, updateStatusFile{Status: "failed", Version: *version, Stage: stage, Message: err.Error(), Time: time.Now()})
		if *launch != "" && fileExists(*launch) {
			_ = exec.Command(*launch).Start()
		}
	}

	if *source == "" || *target == "" || *backup == "" || *launch == "" {
		fail("args", fmt.Errorf("missing required updater arguments"))
		os.Exit(1)
	}
	if *pid > 0 && !waitForExit(*pid, 15*time.Second) {
		fail("wait", fmt.Errorf("主程序未在超时时间内退出"))
		os.Exit(1)
	}
	logf("replace source=%s target=%s backup=%s", *source, *target, *backup)
	_ = os.RemoveAll(*backup)
	if err := os.Rename(*target, *backup); err != nil {
		fail("backup", err)
		os.Exit(1)
	}
	if err := os.Rename(*source, *target); err != nil {
		_ = os.RemoveAll(*target)
		if rb := os.Rename(*backup, *target); rb != nil {
			fail("rollback", fmt.Errorf("replace failed: %v; rollback failed: %v", err, rb))
		} else {
			fail("replace", err)
		}
		os.Exit(1)
	}
	_ = writeState(*statePath, updateStatusFile{Status: "success", Version: *version, Time: time.Now()})
	if err := exec.Command(*launch).Start(); err != nil {
		fail("launch", err)
		os.Exit(1)
	}
	logf("update success version=%s", *version)
}

func waitForExit(pid int, timeout time.Duration) bool {
	deadline := time.Now().Add(timeout)
	for time.Now().Before(deadline) {
		if !processExists(pid) {
			return true
		}
		time.Sleep(300 * time.Millisecond)
	}
	return !processExists(pid)
}

func processExists(pid int) bool {
	if runtime.GOOS == "windows" {
		cmd := exec.Command("tasklist", "/FI", fmt.Sprintf("PID eq %d", pid))
		out, err := cmd.Output()
		return err == nil && bytesContains(out, []byte(fmt.Sprintf("%d", pid)))
	}
	proc, err := os.FindProcess(pid)
	if err != nil {
		return false
	}
	return proc.Signal(syscall.Signal(0)) == nil
}

func writeState(path string, st updateStatusFile) error {
	if path == "" {
		return nil
	}
	if err := os.MkdirAll(filepath.Dir(path), 0o700); err != nil {
		return err
	}
	b, err := json.MarshalIndent(st, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(path, b, 0o600)
}

func fileExists(path string) bool {
	st, err := os.Stat(path)
	return err == nil && !st.IsDir()
}

func bytesContains(b, sub []byte) bool {
	if len(sub) == 0 {
		return true
	}
	for i := 0; i+len(sub) <= len(b); i++ {
		if string(b[i:i+len(sub)]) == string(sub) {
			return true
		}
	}
	return false
}
