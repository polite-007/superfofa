package app

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"sort"

	"myproject/internal/model"
)

func (a *App) exportTaskPath(taskID string) string {
	return filepath.Join(a.exportTaskDir, taskID+".json")
}

func (a *App) saveExportTask(task model.ExportTask) error {
	data, err := json.MarshalIndent(task, "", "  ")
	if err != nil {
		return fmt.Errorf("marshal export task: %w", err)
	}
	return os.WriteFile(a.exportTaskPath(task.ID), data, 0o600)
}

func (a *App) loadExportTask(taskID string) (model.ExportTask, error) {
	data, err := os.ReadFile(a.exportTaskPath(taskID))
	if err != nil {
		return model.ExportTask{}, fmt.Errorf("read export task: %w", err)
	}
	var task model.ExportTask
	if err := json.Unmarshal(data, &task); err != nil {
		return model.ExportTask{}, fmt.Errorf("unmarshal export task: %w", err)
	}
	return task, nil
}

func (a *App) listExportTasks() ([]model.ExportTask, error) {
	entries, err := os.ReadDir(a.exportTaskDir)
	if err != nil {
		return nil, err
	}
	items := make([]model.ExportTask, 0, len(entries))
	for _, entry := range entries {
		if entry.IsDir() || filepath.Ext(entry.Name()) != ".json" {
			continue
		}
		data, err := os.ReadFile(filepath.Join(a.exportTaskDir, entry.Name()))
		if err != nil {
			return nil, err
		}
		var task model.ExportTask
		if err := json.Unmarshal(data, &task); err != nil {
			return nil, err
		}
		items = append(items, task)
	}
	sort.Slice(items, func(i, j int) bool { return items[i].CreatedAt > items[j].CreatedAt })
	return items, nil
}

func (a *App) deleteExportTask(taskID string) error {
	// 先取消正在运行的任务 goroutine，避免删除后又被 saveExportTask 复活
	a.stopExportRun(taskID)
	task, err := a.loadExportTask(taskID)
	if err != nil {
		return err
	}
	if task.CheckpointPath != "" {
		_ = os.Remove(task.CheckpointPath)
	}
	return os.Remove(a.exportTaskPath(taskID))
}
