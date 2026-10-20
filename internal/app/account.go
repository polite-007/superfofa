package app

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/polite-007/toolbox/fofa"

	"myproject/internal/model"
)

// ===================== 账号 CRUD =====================

// ListFofaAccounts 返回所有账号（按创建时间升序）
func (a *App) ListFofaAccounts() ([]model.FofaAccount, error) {
	if a.store == nil {
		return nil, fmt.Errorf("数据库未初始化")
	}
	return a.store.ListAccounts()
}

// AddFofaAccount 新增账号：校验 + 联网检测 + 入库三步合一
// 检测通过(valid)才入库返回卡片；invalid/error 不入库，返回错误让前端提示
func (a *App) AddFofaAccount(req model.AddAccountReq) (model.FofaAccount, error) {
	if a.store == nil {
		return model.FofaAccount{}, fmt.Errorf("数据库未初始化")
	}
	email := strings.TrimSpace(req.Email)
	key := strings.TrimSpace(req.Key)
	if key == "" {
		return model.FofaAccount{}, fmt.Errorf("key 不能为空")
	}
	if email != "" && !strings.Contains(email, "@") {
		return model.FofaAccount{}, fmt.Errorf("email 格式不正确（需包含 @）")
	}

	status, errMsg, snap := a.probeFofa(email, key)
	if status != model.StatusValid {
		if status == model.StatusInvalid {
			return model.FofaAccount{}, fmt.Errorf("key 无效：%s", errMsg)
		}
		return model.FofaAccount{}, fmt.Errorf("联网检测失败，请检查网络/代理后重试：%s", errMsg)
	}

	now := time.Now().UTC().Format(time.RFC3339)
	acc := model.FofaAccount{
		ID:        uuid.NewString(),
		Email:     email,
		Key:       key,
		Remark:    strings.TrimSpace(req.Remark),
		Status:    model.StatusValid,
		Account:   snap,
		LastCheck: now,
		CreatedAt: now,
		UpdatedAt: now,
	}
	if err := a.store.InsertAccount(acc); err != nil {
		return model.FofaAccount{}, err
	}
	return acc, nil
}

// UpdateFofaAccount 仅更新注释（不允许改 email/key），返回更新后的账号
func (a *App) UpdateFofaAccount(req model.UpdateAccountReq) (model.FofaAccount, error) {
	if a.store == nil {
		return model.FofaAccount{}, fmt.Errorf("数据库未初始化")
	}
	if strings.TrimSpace(req.ID) == "" {
		return model.FofaAccount{}, fmt.Errorf("缺少账号 ID")
	}
	now := time.Now().UTC().Format(time.RFC3339)
	if err := a.store.UpdateAccountRemark(req.ID, strings.TrimSpace(req.Remark), now); err != nil {
		return model.FofaAccount{}, err
	}
	acc, err := a.store.GetAccount(req.ID)
	if err != nil {
		return model.FofaAccount{}, err
	}
	if acc == nil {
		return model.FofaAccount{}, fmt.Errorf("账号不存在: %s", req.ID)
	}
	return *acc, nil
}

// DeleteFofaAccount 删除账号；若该账号正被 single 模式选为固定 key 则阻止删除
func (a *App) DeleteFofaAccount(id string) error {
	if a.store == nil {
		return fmt.Errorf("数据库未初始化")
	}
	if strings.TrimSpace(id) == "" {
		return fmt.Errorf("缺少账号 ID")
	}
	cfg, err := a.store.GetKeyConfig()
	if err != nil {
		return err
	}
	// single 模式下，删的恰好是固定使用的 key → 阻止（避免运行中的查询突然无 key 可用）
	if cfg.Mode == model.KeyModeSingle && cfg.SingleID == id {
		return fmt.Errorf("该账号正被单 key 模式使用，请先切换模式或更换选定 key 后再删除")
	}
	if err := a.store.DeleteAccount(id); err != nil {
		return err
	}
	// 清理 key_config 中对该账号的引用
	if cfg.ActiveID == id {
		cfg.ActiveID = ""
		if err := a.store.SetConfigValue("active_id", ""); err != nil {
			return err
		}
	}
	if cfg.SingleID == id {
		cfg.SingleID = ""
		if err := a.store.SetConfigValue("single_id", ""); err != nil {
			return err
		}
	}
	if cfg.Mode == model.KeyModeMulti && len(cfg.PoolIDs) > 0 {
		filtered := make([]string, 0, len(cfg.PoolIDs))
		for _, pid := range cfg.PoolIDs {
			if pid != id {
				filtered = append(filtered, pid)
			}
		}
		if len(filtered) != len(cfg.PoolIDs) {
			if err := a.store.SetKeyConfig(model.KeyConfig{
				Mode:         cfg.Mode,
				BaseURL:      cfg.BaseURL,
				Proxy:        cfg.Proxy,
				ActiveID:     cfg.ActiveID,
				SingleID:     cfg.SingleID,
				PoolIDs:      filtered,
				FofaWebToken: cfg.FofaWebToken,
			}); err != nil {
				return err
			}
		}
	}
	return nil
}

// CheckFofaAccount 检测某账号 key 状态，三种情况都更新 LastCheck 并返回更新后的账号
func (a *App) CheckFofaAccount(id string) (model.FofaAccount, error) {
	if a.store == nil {
		return model.FofaAccount{}, fmt.Errorf("数据库未初始化")
	}
	acc, err := a.store.GetAccount(id)
	if err != nil {
		return model.FofaAccount{}, err
	}
	if acc == nil {
		return model.FofaAccount{}, fmt.Errorf("账号不存在: %s", id)
	}
	status, errMsg, snap := a.probeFofa(acc.Email, acc.Key)
	now := time.Now().UTC().Format(time.RFC3339)
	if err := a.store.UpdateAccountStatus(id, status, errMsg, snap, now, now); err != nil {
		return model.FofaAccount{}, err
	}
	acc.Status = status
	acc.ErrMsg = errMsg
	acc.Account = snap
	acc.LastCheck = now
	acc.UpdatedAt = now
	return *acc, nil
}

// ===================== 内部辅助 =====================

// probeFofa 调 FOFA Account 接口检测 key，返回 status/errMsg/snapshot
// fofa 库把 FOFA 拒绝和网络错误都折进 err，这里用错误前缀区分：
//   - "FOFA API 错误:" → invalid（key 无效，FOFA 明确拒绝）
//   - 其余（账号信息请求失败/解析失败/请求过快/非200）→ error（网络/限流，非 key 问题）
func (a *App) probeFofa(email, key string) (status, errMsg string, snap *model.AccountSnapshot) {
	cfg, err := a.store.GetKeyConfig()
	if err != nil {
		return model.StatusError, "读取配置失败: " + err.Error(), nil
	}
	opts := []fofa.Option{fofa.WithRetryCount(3)}
	if strings.TrimSpace(cfg.BaseURL) != "" {
		opts = append(opts, fofa.WithBaseURL(cfg.BaseURL))
	}
	if strings.TrimSpace(cfg.Proxy) != "" {
		opts = append(opts, fofa.WithProxy(cfg.Proxy))
	}
	client := fofa.NewClient(email, key, opts...)

	ctx := a.ctx
	if ctx == nil {
		ctx = context.Background()
	}
	resp, err := client.Account(ctx)
	if err != nil {
		msg := err.Error()
		if strings.HasPrefix(msg, "FOFA API 错误:") {
			return model.StatusInvalid, strings.TrimSpace(strings.TrimPrefix(msg, "FOFA API 错误:")), nil
		}
		return model.StatusError, msg, nil
	}
	snap = &model.AccountSnapshot{
		Username:        resp.Username,
		Category:        resp.Category,
		Fcoin:           resp.Fcoin,
		FofaPoint:       resp.FofaPoint,
		RemainFreePoint: resp.RemainFreePoint,
		RemainAPIQuery:  resp.RemainAPIQuery,
		RemainAPIData:   resp.RemainAPIData,
		IsVip:           resp.IsVip,
		VipLevel:        resp.VipLevel,
		IsVerified:      resp.IsVerified,
	}
	return model.StatusValid, "", snap
}
