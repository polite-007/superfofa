package app

import (
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"

	"myproject/internal/model"
)

const hostHistoryLimit = 20

// ListHostHistory 返回主机页历史记录。
func (a *App) ListHostHistory() ([]model.HostHistoryItem, error) {
	if a.store == nil {
		return nil, fmt.Errorf("数据库未初始化")
	}
	return a.store.ListHostHistory()
}

// AddHostHistory 添加或刷新主机页历史记录，并返回最新列表。
func (a *App) AddHostHistory(host string) ([]model.HostHistoryItem, error) {
	if a.store == nil {
		return nil, fmt.Errorf("数据库未初始化")
	}
	h := strings.TrimSpace(host)
	if h == "" {
		return nil, fmt.Errorf("请输入 IPv4 地址")
	}
	if !isIPv4(h) {
		return nil, fmt.Errorf("请输入合法的 IPv4 地址")
	}
	ts := time.Now().UnixMilli()
	items, err := a.store.ListHostHistory()
	if err != nil {
		return nil, err
	}
	if len(items) > 0 && ts <= items[0].Ts {
		ts = items[0].Ts + 1
	}
	item := model.HostHistoryItem{
		ID:   uuid.NewString(),
		Host: h,
		Ts:   ts,
	}
	if err := a.store.AddHostHistory(item, hostHistoryLimit); err != nil {
		return nil, err
	}
	return a.store.ListHostHistory()
}

// RemoveHostHistory 删除一条主机页历史记录，并返回最新列表。
func (a *App) RemoveHostHistory(id string) ([]model.HostHistoryItem, error) {
	if a.store == nil {
		return nil, fmt.Errorf("数据库未初始化")
	}
	if err := a.store.RemoveHostHistory(strings.TrimSpace(id)); err != nil {
		return nil, err
	}
	return a.store.ListHostHistory()
}

// ClearHostHistory 清空主机页历史记录，并返回最新列表。
func (a *App) ClearHostHistory() ([]model.HostHistoryItem, error) {
	if a.store == nil {
		return nil, fmt.Errorf("数据库未初始化")
	}
	if err := a.store.ClearHostHistory(); err != nil {
		return nil, err
	}
	return a.store.ListHostHistory()
}
