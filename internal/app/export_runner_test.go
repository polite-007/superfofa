package app

import (
	"errors"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"myproject/internal/logger"
	"myproject/internal/model"
)

func TestMarkTaskPausedUpdatesReasonAndMessage(t *testing.T) {
	task := model.ExportTask{Status: model.ExportTaskRunning}
	markTaskPaused(&task, model.ExportPauseNetwork, "网络异常")
	if task.Status != model.ExportTaskPaused {
		t.Fatalf("unexpected status: %s", task.Status)
	}
	if task.PauseReason != model.ExportPauseNetwork || task.Message != "网络异常" {
		t.Fatalf("unexpected task state: %#v", task)
	}
}

func TestContinueExportTaskMovesPausedTaskBackToPending(t *testing.T) {
	tmp := t.TempDir()
	a := NewApp()
	a.exportTaskDir = tmp
	a.exportCacheDir = filepath.Join(tmp, "checkpoints")
	task := model.ExportTask{ID: "task-1", Status: model.ExportTaskPaused}
	if err := a.saveExportTask(task); err != nil {
		t.Fatal(err)
	}
	updated, err := a.ContinueExportTask("task-1")
	if err != nil {
		t.Fatalf("ContinueExportTask failed: %v", err)
	}
	if updated.Status != model.ExportTaskPending {
		t.Fatalf("unexpected status: %#v", updated)
	}
}

func TestRunExportTaskCompletesAndWritesOutput(t *testing.T) {
	tmp := t.TempDir()
	a := NewApp()
	a.exportTaskDir = filepath.Join(tmp, "tasks")
	a.exportCacheDir = filepath.Join(tmp, "checkpoints")
	a.exportOutputDir = filepath.Join(tmp, "output")
	for _, dir := range []string{a.exportTaskDir, a.exportCacheDir, a.exportOutputDir} {
		if err := os.MkdirAll(dir, 0o700); err != nil {
			t.Fatal(err)
		}
	}
	a.exportSearchPage = func(task model.ExportTask, item model.ExportTaskItem, page int) (exportSearchPageResult, error) {
		if page > 1 {
			return exportSearchPageResult{Rows: nil}, nil
		}
		return exportSearchPageResult{Rows: []map[string]string{{"host": "example.com"}}}, nil
	}
	task := model.ExportTask{
		ID:             "task-1",
		Name:           "demo",
		Status:         model.ExportTaskPending,
		Fields:         []model.ExportField{{Key: "host", Label: "Host", FofaField: "host"}},
		CheckpointPath: filepath.Join(a.exportCacheDir, "task-1.json"),
		Items: []model.ExportTaskItem{{
			ID:              "item-1",
			TaskID:          "task-1",
			Index:           0,
			NormalizedInput: "example.com",
			NormalizedQuery: `domain="example.com"`,
			Status:          model.ExportTaskPending,
			NextPage:        1,
		}},
		TotalItems: 1,
	}
	if err := a.saveExportTask(task); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(task.CheckpointPath, []byte("{}\n"), 0o600); err != nil {
		t.Fatal(err)
	}

	a.runExportTask(task.ID)

	stored, err := a.loadExportTask(task.ID)
	if err != nil {
		t.Fatalf("load stored task failed: %v", err)
	}
	if stored.Status != model.ExportTaskCompleted {
		t.Fatalf("unexpected final status: %+v", stored)
	}
	if stored.OutputPath == "" {
		t.Fatalf("expected output path to be set: %+v", stored)
	}
	if stored.ExportedRows != 1 || stored.CompletedItems != 1 {
		t.Fatalf("unexpected progress: %+v", stored)
	}
	if _, err := os.Stat(stored.OutputPath); err != nil {
		t.Fatalf("expected output file: %v", err)
	}
}

func TestRunExportTaskPausesOnSearchError(t *testing.T) {
	tmp := t.TempDir()
	a := NewApp()
	a.exportTaskDir = filepath.Join(tmp, "tasks")
	a.exportCacheDir = filepath.Join(tmp, "checkpoints")
	a.exportOutputDir = filepath.Join(tmp, "output")
	for _, dir := range []string{a.exportTaskDir, a.exportCacheDir, a.exportOutputDir} {
		if err := os.MkdirAll(dir, 0o700); err != nil {
			t.Fatal(err)
		}
	}
	a.exportSearchPage = func(task model.ExportTask, item model.ExportTaskItem, page int) (exportSearchPageResult, error) {
		return exportSearchPageResult{}, errors.New("联网搜索失败，请检查网络/代理后重试：timeout")
	}
	task := model.ExportTask{
		ID:             "task-1",
		Name:           "demo",
		Status:         model.ExportTaskPending,
		Fields:         []model.ExportField{{Key: "host", Label: "Host", FofaField: "host"}},
		CheckpointPath: filepath.Join(a.exportCacheDir, "task-1.json"),
		Items: []model.ExportTaskItem{{
			ID:              "item-1",
			TaskID:          "task-1",
			Index:           0,
			NormalizedInput: "example.com",
			NormalizedQuery: `domain="example.com"`,
			Status:          model.ExportTaskPending,
			NextPage:        1,
		}},
		TotalItems: 1,
	}
	if err := a.saveExportTask(task); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(task.CheckpointPath, []byte("{}\n"), 0o600); err != nil {
		t.Fatal(err)
	}

	a.runExportTask(task.ID)

	stored, err := a.loadExportTask(task.ID)
	if err != nil {
		t.Fatalf("load stored task failed: %v", err)
	}
	if stored.Status != model.ExportTaskPaused {
		t.Fatalf("unexpected final status: %+v", stored)
	}
	if stored.PauseReason != model.ExportPauseNetwork {
		t.Fatalf("unexpected pause reason: %+v", stored)
	}
}

func TestRunExportTaskLogsLifecycle(t *testing.T) {
	tmp := t.TempDir()
	logDir := filepath.Join(tmp, "logs")
	if err := logger.Init(logDir); err != nil {
		t.Fatalf("logger init failed: %v", err)
	}
	defer func() {
		if err := logger.Close(); err != nil {
			t.Fatalf("logger close failed: %v", err)
		}
	}()
	a := NewApp()
	a.exportTaskDir = filepath.Join(tmp, "tasks")
	a.exportCacheDir = filepath.Join(tmp, "checkpoints")
	a.exportOutputDir = filepath.Join(tmp, "output")
	for _, dir := range []string{a.exportTaskDir, a.exportCacheDir, a.exportOutputDir} {
		if err := os.MkdirAll(dir, 0o700); err != nil {
			t.Fatal(err)
		}
	}
	a.exportSearchPage = func(task model.ExportTask, item model.ExportTaskItem, page int) (exportSearchPageResult, error) {
		return exportSearchPageResult{Rows: []map[string]string{{"host": "example.com"}}}, nil
	}
	task := model.ExportTask{
		ID:             "task-1",
		Name:           "demo",
		Status:         model.ExportTaskPending,
		Fields:         []model.ExportField{{Key: "host", Label: "Host", FofaField: "host"}},
		CheckpointPath: filepath.Join(a.exportCacheDir, "task-1.json"),
		Items: []model.ExportTaskItem{{
			ID:              "item-1",
			TaskID:          "task-1",
			Index:           0,
			NormalizedInput: "example.com",
			NormalizedQuery: `domain="example.com"`,
			Status:          model.ExportTaskPending,
			NextPage:        1,
		}},
		TotalItems: 1,
	}
	if err := a.saveExportTask(task); err != nil {
		t.Fatal(err)
	}

	a.runExportTask(task.ID)

	data, err := os.ReadFile(filepath.Join(logDir, "super-fofa.log"))
	if err != nil {
		t.Fatalf("read log file failed: %v", err)
	}
	output := string(data)
	for _, want := range []string{
		"module=export",
		"msg=\"export task runner requested\"",
		"task_id=task-1",
		"msg=\"export task started\"",
		"msg=\"export task page query started\"",
		"msg=\"export task completed\"",
	} {
		if !strings.Contains(output, want) {
			t.Fatalf("expected log %q in %q", want, output)
		}
	}
}

func TestExportPageSizeForFieldsDefaultsTo2000(t *testing.T) {
	fields := []model.ExportField{
		{Key: "ip", Label: "IP", FofaField: "ip"},
		{Key: "host", Label: "主机", FofaField: "host"},
	}
	if got := exportPageSizeForFields(fields); got != 2000 {
		t.Fatalf("exportPageSizeForFields() = %d, want 2000", got)
	}
}

func TestExportPageSizeForFieldsUses500WhenBodySelected(t *testing.T) {
	fields := []model.ExportField{
		{Key: "ip", Label: "IP", FofaField: "ip"},
		{Key: "body", Label: "正文", FofaField: "body"},
	}
	if got := exportPageSizeForFields(fields); got != 500 {
		t.Fatalf("exportPageSizeForFields() = %d, want 500", got)
	}
}

func waitForTaskStatus(t *testing.T, a *App, taskID string, timeout time.Duration, done func(model.ExportTask) bool) model.ExportTask {
	t.Helper()
	deadline := time.Now().Add(timeout)
	for time.Now().Before(deadline) {
		task, err := a.loadExportTask(taskID)
		if err == nil && done(task) {
			return task
		}
		time.Sleep(10 * time.Millisecond)
	}
	task, err := a.loadExportTask(taskID)
	if err != nil {
		t.Fatalf("load stored task failed: %v", err)
	}
	return task
}
