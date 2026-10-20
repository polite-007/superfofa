package app

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/polite-007/toolbox/fofa"

	"myproject/internal/logger"
	"myproject/internal/model"
)

const (
	defaultExportPageSize = 2000
	bodyExportPageSize    = 500
)

func (a *App) runExportTask(taskID string) {
	log := logger.For("export")
	log.Info("export task runner requested", "task_id", taskID)
	taskCtx, cancel := a.beginExportRun(taskID)
	if cancel == nil {
		log.Info("export task runner skipped", "task_id", taskID, "reason", "already_running")
		return
	}
	defer a.finishExportRun(taskID)
	defer cancel()

	task, err := a.loadExportTask(taskID)
	if err != nil {
		log.Error("export task load failed", "task_id", taskID, "error", err)
		return
	}
	if task.Status != model.ExportTaskPending {
		log.Info("export task runner skipped", "task_id", taskID, "status", task.Status)
		return
	}

	task.Status = model.ExportTaskRunning
	task.PauseReason = ""
	task.FailReason = ""
	task.Message = "导出执行中"
	task.UpdatedAt = time.Now().UTC().Format(time.RFC3339)
	if err := a.saveExportTask(task); err != nil {
		log.Error("export task save running state failed", "task_id", taskID, "error", err)
		return
	}
	log.Info("export task started", "task_id", taskID, "name", task.Name, "items", len(task.Items), "fields", len(task.Fields))

	rows, err := a.executeExportTask(taskCtx, &task)
	if err != nil {
		// 任务被取消（删除/停止）：不写回状态，避免把已删除的任务文件复活
		if taskCtx.Err() != nil {
			log.Info("export task cancelled", "task_id", taskID)
			return
		}
		status, reason := classifyExportError(err.Error())
		switch status {
		case model.ExportTaskFailed:
			markTaskFailed(&task, reason, err.Error())
		default:
			markTaskPaused(&task, reason, err.Error())
		}
		log.Warn("export task stopped", "task_id", taskID, "status", task.Status, "reason", reason, "error", err)
		_ = a.saveExportTask(task)
		return
	}

	log.Info("export task writing xlsx", "task_id", taskID, "rows", len(rows))
	outputPath, err := a.writeExportXLSX(task, rows)
	if err != nil {
		if taskCtx.Err() != nil {
			log.Info("export task cancelled during xlsx write", "task_id", taskID)
			return
		}
		markTaskFailed(&task, model.ExportFailOutputWrite, err.Error())
		log.Error("export task xlsx write failed", "task_id", taskID, "error", err)
		_ = a.saveExportTask(task)
		return
	}
	markTaskCompleted(&task, outputPath)
	log.Info("export task completed", "task_id", taskID, "rows", task.ExportedRows, "output", outputPath)
	_ = a.saveExportTask(task)
}

func (a *App) executeExportTask(ctx context.Context, task *model.ExportTask) ([]map[string]string, error) {
	log := logger.For("export")
	pageSize := exportPageSizeForFields(task.Fields)
	allRows := make([]map[string]string, 0)
	for idx := range task.Items {
		if ctx.Err() != nil {
			return allRows, ctx.Err()
		}
		item := &task.Items[idx]
		if item.Status == model.ExportTaskCompleted {
			log.Debug("export task item skipped", "task_id", task.ID, "item_id", item.ID, "reason", "already_completed")
			continue
		}
		item.Status = model.ExportTaskRunning
		task.Status = model.ExportTaskRunning
		task.CurrentItemIndex = item.Index + 1
		if item.NextPage <= 0 {
			item.NextPage = 1
		}
		log.Info("export task item started", "task_id", task.ID, "item_id", item.ID, "index", item.Index, "query", item.NormalizedQuery, "next_page", item.NextPage, "page_size", pageSize)
		for {
			if ctx.Err() != nil {
				return allRows, ctx.Err()
			}
			task.CurrentItemPage = item.NextPage
			task.Message = fmt.Sprintf("正在导出第 %d 项，第 %d 页", task.CurrentItemIndex, task.CurrentItemPage)
			task.UpdatedAt = time.Now().UTC().Format(time.RFC3339)
			if err := a.saveExportTask(*task); err != nil {
				log.Error("export task progress save failed", "task_id", task.ID, "item_id", item.ID, "page", item.NextPage, "error", err)
				return nil, err
			}

			log.Debug("export task page query started", "task_id", task.ID, "item_id", item.ID, "page", item.NextPage, "page_size", pageSize)
			result, err := a.searchExportPage(ctx, *task, *item, item.NextPage)
			if err != nil {
				if ctx.Err() != nil {
					return allRows, ctx.Err()
				}
				item.ErrorMessage = err.Error()
				item.Status = model.ExportTaskPaused
				log.Warn("export task page query failed", "task_id", task.ID, "item_id", item.ID, "page", item.NextPage, "error", err)
				return nil, err
			}
			log.Debug("export task page query finished", "task_id", task.ID, "item_id", item.ID, "page", item.NextPage, "rows", len(result.Rows))
			allRows = append(allRows, result.Rows...)
			item.ExportedRows += len(result.Rows)
			task.ExportedRows += len(result.Rows)

			if len(result.Rows) < pageSize {
				item.Status = model.ExportTaskCompleted
				item.NextPage++
				item.ErrorMessage = ""
				task.CompletedItems++
				task.UpdatedAt = time.Now().UTC().Format(time.RFC3339)
				if err := a.saveExportTask(*task); err != nil {
					log.Error("export task item completion save failed", "task_id", task.ID, "item_id", item.ID, "error", err)
					return nil, err
				}
				log.Info("export task item completed", "task_id", task.ID, "item_id", item.ID, "exported_rows", item.ExportedRows)
				break
			}
			item.NextPage++
			item.ErrorMessage = ""
			task.UpdatedAt = time.Now().UTC().Format(time.RFC3339)
			if err := a.saveExportTask(*task); err != nil {
				log.Error("export task progress save failed", "task_id", task.ID, "item_id", item.ID, "next_page", item.NextPage, "error", err)
				return nil, err
			}
		}
	}
	return allRows, nil
}

func (a *App) searchExportPage(ctx context.Context, task model.ExportTask, item model.ExportTaskItem, page int) (exportSearchPageResult, error) {
	pageSize := exportPageSizeForFields(task.Fields)
	if a.exportSearchPage != nil {
		return a.exportSearchPage(task, item, page)
	}
	if a.store == nil {
		return exportSearchPageResult{}, fmt.Errorf("数据库未初始化")
	}
	acc, err := a.PickAccount()
	if err != nil {
		return exportSearchPageResult{}, err
	}
	cfg, err := a.store.GetKeyConfig()
	if err != nil {
		return exportSearchPageResult{}, fmt.Errorf("读取配置失败: %w", err)
	}
	opts := []fofa.Option{fofa.WithRetryCount(3)}
	if strings.TrimSpace(cfg.BaseURL) != "" {	
		opts = append(opts, fofa.WithBaseURL(cfg.BaseURL))
	}
	if strings.TrimSpace(cfg.Proxy) != "" {
		opts = append(opts, fofa.WithProxy(cfg.Proxy))
	}
	client := fofa.NewClient(acc.Email, acc.Key, opts...)
	if ctx == nil {
		ctx = context.Background()
	}
	fields := make([]string, 0, len(task.Fields))
	for _, field := range task.Fields {
		fields = append(fields, field.FofaField)
	}
	resp, err := client.Search(&fofa.SearchRequest{
		Ctx:    ctx,
		Query:  item.NormalizedQuery,
		Size:   pageSize,
		Page:   page,
		Fields: strings.Join(fields, ","),
	})
	if err != nil {
		msg := err.Error()
		switch {
		case strings.HasPrefix(msg, "FOFA API 错误:"):
			return exportSearchPageResult{}, fmt.Errorf("%s", strings.TrimSpace(strings.TrimPrefix(msg, "FOFA API 错误:")))
		case strings.Contains(msg, "请求过快"):
			return exportSearchPageResult{}, fmt.Errorf("请求过快，请稍后重试")
		default:
			return exportSearchPageResult{}, fmt.Errorf("联网搜索失败，请检查网络/代理后重试：%s", msg)
		}
	}
	rows := make([]map[string]string, 0, len(resp.Results))
	for _, r := range resp.Results {
		row := make(map[string]string, len(resp.Fields))
		for i, f := range resp.Fields {
			if i < len(r) {
				row[f] = r[i]
			} else {
				row[f] = ""
			}
		}
		rows = append(rows, row)
	}
	return exportSearchPageResult{Rows: rows}, nil
}

func exportPageSizeForFields(fields []model.ExportField) int {
	for _, field := range fields {
		if strings.EqualFold(strings.TrimSpace(field.FofaField), "body") || strings.EqualFold(strings.TrimSpace(field.Key), "body") {
			return bodyExportPageSize
		}
	}
	return defaultExportPageSize
}

func (a *App) beginExportRun(taskID string) (context.Context, context.CancelFunc) {
	a.exportRunMu.Lock()
	defer a.exportRunMu.Unlock()
	if a.runningExportTask == nil {
		a.runningExportTask = map[string]context.CancelFunc{}
	}
	if _, ok := a.runningExportTask[taskID]; ok {
		return nil, nil
	}
	ctx, cancel := context.WithCancel(context.Background())
	a.runningExportTask[taskID] = cancel
	return ctx, cancel
}

func (a *App) finishExportRun(taskID string) {
	a.exportRunMu.Lock()
	defer a.exportRunMu.Unlock()
	delete(a.runningExportTask, taskID)
}

// stopExportRun 取消正在运行的任务 goroutine，返回是否有运行中的任务被停止。
func (a *App) stopExportRun(taskID string) bool {
	a.exportRunMu.Lock()
	defer a.exportRunMu.Unlock()
	if cancel, ok := a.runningExportTask[taskID]; ok {
		cancel()
		delete(a.runningExportTask, taskID)
		return true
	}
	return false
}

func markTaskPaused(task *model.ExportTask, reason string, message string) {
	task.Status = model.ExportTaskPaused
	task.PauseReason = reason
	task.Message = message
	task.UpdatedAt = time.Now().UTC().Format(time.RFC3339)
}

func markTaskFailed(task *model.ExportTask, reason string, message string) {
	task.Status = model.ExportTaskFailed
	task.FailReason = reason
	task.Message = message
	task.UpdatedAt = time.Now().UTC().Format(time.RFC3339)
}

func markTaskCompleted(task *model.ExportTask, outputPath string) {
	task.Status = model.ExportTaskCompleted
	task.OutputPath = outputPath
	task.Message = "导出完成"
	task.UpdatedAt = time.Now().UTC().Format(time.RFC3339)
}
