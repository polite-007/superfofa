package app

import (
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"

	"myproject/internal/model"
)

const fofaHistoryLimit = 20

// ListQueryHistory 返回查询页历史记录。
func (a *App) ListQueryHistory() ([]model.QueryHistoryItem, error) {
	if a.store == nil {
		return nil, fmt.Errorf("数据库未初始化")
	}
	return a.store.ListFofaHistory(model.HistoryKindQuery)
}

// AddQueryHistory 添加或刷新查询页历史，返回最新列表。
func (a *App) AddQueryHistory(query string) ([]model.QueryHistoryItem, error) {
	return a.addFofaHistory(model.HistoryKindQuery, query)
}

// RemoveQueryHistory 删除一条查询页历史，返回最新列表。
func (a *App) RemoveQueryHistory(id string) ([]model.QueryHistoryItem, error) {
	if a.store == nil {
		return nil, fmt.Errorf("数据库未初始化")
	}
	if err := a.store.RemoveFofaHistory(model.HistoryKindQuery, strings.TrimSpace(id)); err != nil {
		return nil, err
	}
	return a.store.ListFofaHistory(model.HistoryKindQuery)
}

// ClearQueryHistory 清空查询页历史，返回最新列表。
func (a *App) ClearQueryHistory() ([]model.QueryHistoryItem, error) {
	if a.store == nil {
		return nil, fmt.Errorf("数据库未初始化")
	}
	if err := a.store.ClearFofaHistory(model.HistoryKindQuery); err != nil {
		return nil, err
	}
	return a.store.ListFofaHistory(model.HistoryKindQuery)
}

// ListStatsHistory 返回统计聚合页历史记录。
func (a *App) ListStatsHistory() ([]model.QueryHistoryItem, error) {
	if a.store == nil {
		return nil, fmt.Errorf("数据库未初始化")
	}
	return a.store.ListFofaHistory(model.HistoryKindStats)
}

// AddStatsHistory 添加或刷新统计聚合页历史，返回最新列表。
func (a *App) AddStatsHistory(query string) ([]model.QueryHistoryItem, error) {
	return a.addFofaHistory(model.HistoryKindStats, query)
}

// RemoveStatsHistory 删除一条统计聚合页历史，返回最新列表。
func (a *App) RemoveStatsHistory(id string) ([]model.QueryHistoryItem, error) {
	if a.store == nil {
		return nil, fmt.Errorf("数据库未初始化")
	}
	if err := a.store.RemoveFofaHistory(model.HistoryKindStats, strings.TrimSpace(id)); err != nil {
		return nil, err
	}
	return a.store.ListFofaHistory(model.HistoryKindStats)
}

// ClearStatsHistory 清空统计聚合页历史，返回最新列表。
func (a *App) ClearStatsHistory() ([]model.QueryHistoryItem, error) {
	if a.store == nil {
		return nil, fmt.Errorf("数据库未初始化")
	}
	if err := a.store.ClearFofaHistory(model.HistoryKindStats); err != nil {
		return nil, err
	}
	return a.store.ListFofaHistory(model.HistoryKindStats)
}

// addFofaHistory 公共逻辑：校验、生成 ID、保证 ts 单调、写入并返回最新列表。
func (a *App) addFofaHistory(kind string, query string) ([]model.QueryHistoryItem, error) {
	if a.store == nil {
		return nil, fmt.Errorf("数据库未初始化")
	}
	q := strings.TrimSpace(query)
	if q == "" {
		return nil, fmt.Errorf("查询语句不能为空")
	}
	ts := time.Now().UnixMilli()
	items, err := a.store.ListFofaHistory(kind)
	if err != nil {
		return nil, err
	}
	if len(items) > 0 && ts <= items[0].Ts {
		ts = items[0].Ts + 1
	}
	item := model.QueryHistoryItem{
		ID:    uuid.NewString(),
		Query: q,
		Ts:    ts,
	}
	if err := a.store.AddFofaHistory(kind, item, fofaHistoryLimit); err != nil {
		return nil, err
	}
	return a.store.ListFofaHistory(kind)
}
