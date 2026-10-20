package app

import (
	"fmt"
	"math/rand"

	"myproject/internal/model"
)

// ===================== 系统 key 使用配置 =====================

// GetKeyConfig 获取当前 key 使用配置 + API 地址
func (a *App) GetKeyConfig() (model.KeyConfig, error) {
	if a.store == nil {
		return model.KeyConfig{}, fmt.Errorf("数据库未初始化")
	}
	return a.store.GetKeyConfig()
}

// SetKeyConfig 设置 key 使用配置 + API 地址，返回设置后的配置
func (a *App) SetKeyConfig(cfg model.KeyConfig) (model.KeyConfig, error) {
	if a.store == nil {
		return model.KeyConfig{}, fmt.Errorf("数据库未初始化")
	}
	if cfg.Mode == "" {
		cfg.Mode = model.KeyModeSequence
	}
	if cfg.PoolIDs == nil {
		cfg.PoolIDs = []string{}
	}
	if err := a.store.SetKeyConfig(cfg); err != nil {
		return model.KeyConfig{}, err
	}
	return a.store.GetKeyConfig()
}

// PickAccount 按当前 Mode 选一个账号返回
// sequence 推进指针 / single 固定 / multi 取池里第一个
func (a *App) PickAccount() (model.FofaAccount, error) {
	if a.store == nil {
		return model.FofaAccount{}, fmt.Errorf("数据库未初始化")
	}
	a.pickMu.Lock()
	defer a.pickMu.Unlock()

	cfg, err := a.store.GetKeyConfig()
	if err != nil {
		return model.FofaAccount{}, err
	}
	accounts, err := a.store.ListAccounts()
	if err != nil {
		return model.FofaAccount{}, err
	}
	valid := filterValid(accounts)

	switch cfg.Mode {
	case model.KeyModeSingle:
		if cfg.SingleID == "" {
			return model.FofaAccount{}, fmt.Errorf("未选定单 key，请在配置页选择")
		}
		for _, acc := range valid {
			if acc.ID == cfg.SingleID {
				return acc, nil
			}
		}
		return model.FofaAccount{}, fmt.Errorf("选定的 key 已失效，请重新选择")

	case model.KeyModeMulti:
		pool := pickPool(valid, cfg.PoolIDs)
		// pool_ids 指向的账号全部失效/不存在时，回退到全部有效账号，避免硬报错
		if len(pool) == 0 {
			pool = valid
		}
		if len(pool) == 0 {
			return model.FofaAccount{}, fmt.Errorf("没有可用的 FOFA 账号，请先在配置页添加并检测")
		}
		return pool[rand.Intn(len(pool))], nil

	default: // sequence
		if len(valid) == 0 {
			return model.FofaAccount{}, fmt.Errorf("没有可用的 FOFA 账号，请先在配置页添加并检测")
		}
		next, newActiveID := nextInSequence(valid, cfg.ActiveID)
		if newActiveID != cfg.ActiveID {
			if err := a.store.SetConfigValue("active_id", newActiveID); err != nil {
				return model.FofaAccount{}, err
			}
		}
		return next, nil
	}
}

// PickAccounts multi 模式下返回整个并发池；非 multi 返回长度1切片
func (a *App) PickAccounts() ([]model.FofaAccount, error) {
	if a.store == nil {
		return nil, fmt.Errorf("数据库未初始化")
	}
	cfg, err := a.store.GetKeyConfig()
	if err != nil {
		return nil, err
	}
	if cfg.Mode == model.KeyModeMulti {
		accounts, err := a.store.ListAccounts()
		if err != nil {
			return nil, err
		}
		valid := filterValid(accounts)
		pool := pickPool(valid, cfg.PoolIDs)
		if len(pool) == 0 {
			pool = valid
		}
		if len(pool) == 0 {
			return nil, fmt.Errorf("没有可用的 FOFA 账号，请先在配置页添加并检测")
		}
		return pool, nil
	}
	one, err := a.PickAccount()
	if err != nil {
		return nil, err
	}
	return []model.FofaAccount{one}, nil
}

// ===================== 内部辅助 =====================

// filterValid 只保留 valid 账号
func filterValid(accounts []model.FofaAccount) []model.FofaAccount {
	out := make([]model.FofaAccount, 0, len(accounts))
	for _, a := range accounts {
		if a.Status == model.StatusValid {
			out = append(out, a)
		}
	}
	return out
}

// pickPool multi 模式：pool_ids 空=全部有效；否则按 pool_ids 顺序取有效账号
func pickPool(valid []model.FofaAccount, poolIDs []string) []model.FofaAccount {
	if len(poolIDs) == 0 {
		return valid
	}
	byID := make(map[string]model.FofaAccount, len(valid))
	for _, a := range valid {
		byID[a.ID] = a
	}
	out := make([]model.FofaAccount, 0, len(poolIDs))
	for _, id := range poolIDs {
		if a, ok := byID[id]; ok {
			out = append(out, a)
		}
	}
	return out
}

// nextInSequence 在有效账号里找 active_id 的下一个；active_id 悬空则从第一个开始
// 返回选中的账号和新的 active_id
func nextInSequence(valid []model.FofaAccount, activeID string) (model.FofaAccount, string) {
	if len(valid) == 0 {
		return model.FofaAccount{}, activeID
	}
	if activeID == "" {
		return valid[0], valid[0].ID
	}
	for i, a := range valid {
		if a.ID == activeID {
			next := valid[(i+1)%len(valid)]
			return next, next.ID
		}
	}
	// active_id 悬空（指向已删/无效账号）→ 从第一个重新开始
	return valid[0], valid[0].ID
}
