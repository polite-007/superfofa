package app

import (
	"os"
	"path/filepath"
	"testing"
	"time"

	"myproject/internal/model"
)

func TestAppHasExportDirectories(t *testing.T) {
	a := NewApp()
	if a.exportDataDir != "" || a.exportOutputDir != "" {
		t.Fatalf("new app should not prefill export dirs")
	}
}

func TestSaveAndLoadExportTask(t *testing.T) {
	tmp := t.TempDir()
	a := NewApp()
	a.exportTaskDir = tmp
	task := model.ExportTask{ID: "task-1", Name: "demo", Status: model.ExportTaskPending}
	if err := a.saveExportTask(task); err != nil {
		t.Fatalf("save task failed: %v", err)
	}
	loaded, err := a.loadExportTask("task-1")
	if err != nil {
		t.Fatalf("load task failed: %v", err)
	}
	if loaded.Name != "demo" {
		t.Fatalf("unexpected task name: %s", loaded.Name)
	}
}

func TestCreateExportTaskStoresTask(t *testing.T) {
	tmp := t.TempDir()
	a := NewApp()
	a.exportTaskDir = filepath.Join(tmp, "tasks")
	a.exportCacheDir = filepath.Join(tmp, "checkpoints")
	for _, dir := range []string{a.exportTaskDir, a.exportCacheDir} {
		if err := os.MkdirAll(dir, 0o700); err != nil {
			t.Fatal(err)
		}
	}

	task, err := a.CreateExportTask(model.CreateExportTaskReq{
		Source:          model.ExportSourceText,
		InputType:       model.ExportInputDomain,
		Text:            "example.com\nexample.org",
		SourceFileName:  "domains.txt",
		Fields:          []model.ExportField{{Key: "host", Label: "Host", FofaField: "host"}},
		TimeRange:       model.ExportTimeRange{Start: "2025-01-01T00:00:00Z", End: "2025-01-31T00:00:00Z"},
		NormalizedItems: []string{"example.com", "example.org"},
	})
	if err != nil {
		t.Fatalf("create export task failed: %v", err)
	}
	if task.ID == "" {
		t.Fatal("expected task id")
	}
	if task.Name != "domain-export" {
		t.Fatalf("unexpected default task name: %s", task.Name)
	}
	if task.Status != model.ExportTaskPending {
		t.Fatalf("unexpected task status: %s", task.Status)
	}
	if task.TotalItems != 2 {
		t.Fatalf("unexpected total items: %d", task.TotalItems)
	}
	if task.CreatedAt == "" || task.UpdatedAt == "" {
		t.Fatal("expected timestamps to be set")
	}
	if task.CheckpointPath != filepath.Join(a.exportCacheDir, task.ID+".json") {
		t.Fatalf("unexpected checkpoint path: %s", task.CheckpointPath)
	}
	if len(task.Items) != 2 {
		t.Fatalf("unexpected items length: %d", len(task.Items))
	}
	if task.Items[0].TaskID != task.ID {
		t.Fatalf("unexpected item task id: %s", task.Items[0].TaskID)
	}
	if task.Items[0].Index != 0 || task.Items[1].Index != 1 {
		t.Fatalf("unexpected item indexes: %+v %+v", task.Items[0], task.Items[1])
	}
	if task.Items[0].NormalizedInput != "example.com" || task.Items[1].NormalizedInput != "example.org" {
		t.Fatalf("unexpected normalized inputs: %+v", task.Items)
	}
	if task.Items[0].NormalizedQuery != "domain=\"example.com\" && after=\"2025-01-01T00:00:00Z\" && before=\"2025-01-31T00:00:00Z\"" {
		t.Fatalf("unexpected normalized query: %s", task.Items[0].NormalizedQuery)
	}
	if task.Items[0].NextPage != 1 || task.Items[1].NextPage != 1 {
		t.Fatalf("unexpected next pages: %+v", task.Items)
	}
	if _, err := os.Stat(task.CheckpointPath); err != nil {
		t.Fatalf("expected checkpoint file: %v", err)
	}
	stored, err := a.loadExportTask(task.ID)
	if err != nil {
		t.Fatalf("load stored task failed: %v", err)
	}
	if stored.Name != task.Name || stored.TotalItems != task.TotalItems {
		t.Fatalf("stored task mismatch: %+v", stored)
	}
	if len(stored.Items) != 2 {
		t.Fatalf("unexpected stored items length: %d", len(stored.Items))
	}
}

func TestCreateExportTaskShouldStartExecution(t *testing.T) {
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
		return exportSearchPageResult{Rows: []map[string]string{{"host": "example.com"}}}, nil
	}

	task, err := a.CreateExportTask(model.CreateExportTaskReq{
		TaskName:        "demo",
		Source:          model.ExportSourceText,
		InputType:       model.ExportInputDomain,
		Text:            "example.com",
		Fields:          []model.ExportField{{Key: "host", Label: "Host", FofaField: "host"}},
		NormalizedItems: []string{"example.com"},
	})
	if err != nil {
		t.Fatalf("create export task failed: %v", err)
	}

	stored := waitForTaskStatus(t, a, task.ID, time.Second, func(task model.ExportTask) bool {
		return task.Status != model.ExportTaskPending
	})
	if stored.Status == model.ExportTaskPending {
		t.Fatalf("expected task to leave pending after creation, got %+v", stored)
	}
}

func TestDeleteExportTaskRemovesCheckpointOnly(t *testing.T) {
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
	outputPath := filepath.Join(a.exportOutputDir, "result.xlsx")
	checkpointPath := filepath.Join(a.exportCacheDir, "task-1.json")
	if err := os.WriteFile(outputPath, []byte("xlsx"), 0o600); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(checkpointPath, []byte("checkpoint"), 0o600); err != nil {
		t.Fatal(err)
	}
	task := model.ExportTask{ID: "task-1", CheckpointPath: checkpointPath, OutputPath: outputPath}
	if err := a.saveExportTask(task); err != nil {
		t.Fatal(err)
	}
	if err := a.deleteExportTask("task-1"); err != nil {
		t.Fatalf("delete task failed: %v", err)
	}
	if _, err := os.Stat(outputPath); err != nil {
		t.Fatalf("expected output file to remain, got %v", err)
	}
	if _, err := os.Stat(checkpointPath); !os.IsNotExist(err) {
		t.Fatalf("expected checkpoint to be removed, got %v", err)
	}
}
