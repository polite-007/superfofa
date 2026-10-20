package app

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/google/uuid"

	"myproject/internal/logger"
	"myproject/internal/model"
)

func (a *App) PrecheckExport(req model.ExportPrecheckReq) (model.ExportPrecheckResult, error) {
	return a.precheckExport(req)
}

func (a *App) CreateExportTask(req model.CreateExportTaskReq) (model.ExportTask, error) {
	if len(req.NormalizedItems) == 0 {
		return model.ExportTask{}, fmt.Errorf("没有可创建的导出条目")
	}
	now := time.Now().UTC().Format(time.RFC3339)
	taskID := uuid.NewString()
	items := make([]model.ExportTaskItem, 0, len(req.NormalizedItems))
	for idx, item := range req.NormalizedItems {
		items = append(items, model.ExportTaskItem{
			ID:              uuid.NewString(),
			TaskID:          taskID,
			Index:           idx,
			RawInput:        item,
			NormalizedInput: item,
			NormalizedQuery: buildExportQuery(req.InputType, item, req.TimeRange),
			Status:          model.ExportTaskPending,
			NextPage:        1,
		})
	}
	task := model.ExportTask{
		ID:               taskID,
		Name:             strings.TrimSpace(req.TaskName),
		Source:           req.Source,
		InputType:        req.InputType,
		SourceFileName:   req.SourceFileName,
		Status:           model.ExportTaskPending,
		QueryText:        req.Text,
		RawInput:         req.Text,
		TimeRange:        req.TimeRange,
		Fields:           req.Fields,
		TotalItems:       len(items),
		CompletedItems:   0,
		CurrentItemIndex: 0,
		CurrentItemPage:  1,
		CheckpointPath:   filepath.Join(a.exportCacheDir, taskID+".json"),
		CreatedAt:        now,
		UpdatedAt:        now,
		Items:            items,
	}
	if task.Name == "" {
		task.Name = defaultExportTaskName(req.Source, req.InputType, req.SourceFileName)
	}
	if err := a.saveExportTask(task); err != nil {
		return model.ExportTask{}, err
	}
	if err := os.WriteFile(task.CheckpointPath, []byte("{}\n"), 0o600); err != nil {
		return model.ExportTask{}, fmt.Errorf("write checkpoint file: %w", err)
	}
	logger.For("export").Info("export task created",
		"task_id", task.ID,
		"name", task.Name,
		"source", task.Source,
		"input_type", task.InputType,
		"items", len(task.Items),
		"fields", len(task.Fields),
		"checkpoint", task.CheckpointPath,
	)
	go a.runExportTask(task.ID)
	return task, nil
}

func (a *App) ListExportTasks() ([]model.ExportTask, error) {
	return a.listExportTasks()
}

func (a *App) DeleteExportTask(taskID string) error {
	return a.deleteExportTask(taskID)
}

func (a *App) ContinueExportTask(taskID string) (model.ExportTask, error) {
	task, err := a.loadExportTask(taskID)
	if err != nil {
		return model.ExportTask{}, err
	}
	if task.Status != model.ExportTaskPaused {
		return model.ExportTask{}, fmt.Errorf("只有已暂停任务才能继续")
	}
	task.Status = model.ExportTaskPending
	task.PauseReason = ""
	task.Message = "等待继续执行"
	task.UpdatedAt = time.Now().UTC().Format(time.RFC3339)
	if err := a.saveExportTask(task); err != nil {
		return model.ExportTask{}, err
	}
	logger.For("export").Info("export task continue requested", "task_id", task.ID)
	go a.runExportTask(task.ID)
	return task, nil
}

func (a *App) CloneExportTask(req model.CloneExportTaskReq) (model.CreateExportTaskReq, error) {
	task, err := a.loadExportTask(req.TaskID)
	if err != nil {
		return model.CreateExportTaskReq{}, err
	}
	out := model.CreateExportTaskReq{
		TaskName:       task.Name + "-副本",
		Source:         task.Source,
		InputType:      task.InputType,
		Text:           task.RawInput,
		SourceFileName: task.SourceFileName,
		Fields:         task.Fields,
		TimeRange:      task.TimeRange,
	}
	for _, item := range task.Items {
		out.NormalizedItems = append(out.NormalizedItems, item.NormalizedInput)
	}
	return out, nil
}
