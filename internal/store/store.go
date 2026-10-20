package store

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"sync"

	_ "modernc.org/sqlite" // 纯 Go SQLite 驱动，无 cgo

	"myproject/internal/model"
)

// Store 封装 SQLite 数据访问层
type Store struct {
	db *sql.DB
	mu sync.Mutex // 保护 PickAccount 的 read-modify-write
}

// Open 打开数据库（path 为 SQLite 文件路径），建表并预置 key_config 默认值
func Open(path string) (*Store, error) {
	// _pragma: modernc/sqlite 用 DSN pragma 设置；busy_timeout 防并发锁等待
	dsn := fmt.Sprintf("file:%s?_pragma=busy_timeout(5000)&_pragma=journal_mode(WAL)&_pragma=foreign_keys(1)", path)
	db, err := sql.Open("sqlite", dsn)
	if err != nil {
		return nil, fmt.Errorf("打开数据库失败: %w", err)
	}
	// 单连接串行化，避免 WAL 下的写竞争；CRUD 量小，无需多连接
	db.SetMaxOpenConns(1)

	s := &Store{db: db}
	if err := s.init(); err != nil {
		db.Close()
		return nil, err
	}
	return s, nil
}

func (s *Store) init() error {
	stmts := []string{
		`CREATE TABLE IF NOT EXISTS accounts (
			id          TEXT PRIMARY KEY,
			email       TEXT NOT NULL,
			key         TEXT NOT NULL,
			remark      TEXT NOT NULL DEFAULT '',
			status      TEXT NOT NULL DEFAULT 'unchecked',
			account     TEXT,
			err_msg     TEXT NOT NULL DEFAULT '',
			last_check  TEXT NOT NULL DEFAULT '',
			created_at  TEXT NOT NULL,
			updated_at  TEXT NOT NULL
		)`,
		`CREATE TABLE IF NOT EXISTS key_config (
			key   TEXT PRIMARY KEY,
			value TEXT NOT NULL DEFAULT ''
		)`,
		`CREATE TABLE IF NOT EXISTS host_history (
			id   TEXT PRIMARY KEY,
			host TEXT NOT NULL UNIQUE,
			ts   INTEGER NOT NULL
		)`,
		`CREATE TABLE IF NOT EXISTS fofa_query_history (
			id    TEXT PRIMARY KEY,
			kind  TEXT NOT NULL,
			query TEXT NOT NULL,
			ts    INTEGER NOT NULL,
			UNIQUE(kind, query)
		)`,
	}
	for _, st := range stmts {
		if _, err := s.db.Exec(st); err != nil {
			return fmt.Errorf("建表失败: %w", err)
		}
	}
	// 预置 key_config 内置字段默认值（已存在则忽略）
	defaults := map[string]string{
		"mode":           string(model.KeyModeSequence),
		"base_url":       "https://fofa.info",
		"proxy":          "",
		"active_id":      "",
		"single_id":      "",
		"pool_ids":       "[]",
		"fofa_web_token": "",
	}
	for k, v := range defaults {
		if _, err := s.db.Exec(`INSERT OR IGNORE INTO key_config(key, value) VALUES(?, ?)`, k, v); err != nil {
			return fmt.Errorf("预置配置失败: %w", err)
		}
	}
	return nil
}

// Close 关闭数据库
func (s *Store) Close() error {
	if s.db == nil {
		return nil
	}
	return s.db.Close()
}

// ===================== accounts CRUD =====================

// ListAccounts 返回所有账号（按 created_at 升序，即存储顺序）
func (s *Store) ListAccounts() ([]model.FofaAccount, error) {
	rows, err := s.db.Query(`SELECT id, email, key, remark, status, account, err_msg, last_check, created_at, updated_at
		FROM accounts ORDER BY created_at ASC`)
	if err != nil {
		return nil, fmt.Errorf("查询账号列表失败: %w", err)
	}
	defer rows.Close()

	var list []model.FofaAccount
	for rows.Next() {
		var a model.FofaAccount
		var accountJSON sql.NullString
		if err := rows.Scan(&a.ID, &a.Email, &a.Key, &a.Remark, &a.Status, &accountJSON, &a.ErrMsg, &a.LastCheck, &a.CreatedAt, &a.UpdatedAt); err != nil {
			return nil, fmt.Errorf("扫描账号行失败: %w", err)
		}
		if accountJSON.Valid && accountJSON.String != "" {
			var snap model.AccountSnapshot
			if err := json.Unmarshal([]byte(accountJSON.String), &snap); err == nil {
				a.Account = &snap
			}
		}
		list = append(list, a)
	}
	return list, rows.Err()
}

// GetAccount 按 ID 取单个账号
func (s *Store) GetAccount(id string) (*model.FofaAccount, error) {
	var a model.FofaAccount
	var accountJSON sql.NullString
	err := s.db.QueryRow(`SELECT id, email, key, remark, status, account, err_msg, last_check, created_at, updated_at
		FROM accounts WHERE id = ?`, id).
		Scan(&a.ID, &a.Email, &a.Key, &a.Remark, &a.Status, &accountJSON, &a.ErrMsg, &a.LastCheck, &a.CreatedAt, &a.UpdatedAt)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("查询账号失败: %w", err)
	}
	if accountJSON.Valid && accountJSON.String != "" {
		var snap model.AccountSnapshot
		if err := json.Unmarshal([]byte(accountJSON.String), &snap); err == nil {
			a.Account = &snap
		}
	}
	return &a, nil
}

// InsertAccount 写入新账号
func (s *Store) InsertAccount(a model.FofaAccount) error {
	var accountJSON any
	if a.Account != nil {
		b, err := json.Marshal(a.Account)
		if err != nil {
			return fmt.Errorf("序列化账号快照失败: %w", err)
		}
		accountJSON = string(b)
	}
	_, err := s.db.Exec(`INSERT INTO accounts(id, email, key, remark, status, account, err_msg, last_check, created_at, updated_at)
		VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		a.ID, a.Email, a.Key, a.Remark, a.Status, accountJSON, a.ErrMsg, a.LastCheck, a.CreatedAt, a.UpdatedAt)
	if err != nil {
		return fmt.Errorf("写入账号失败: %w", err)
	}
	return nil
}

// UpdateAccountRemark 仅更新注释 + updated_at
func (s *Store) UpdateAccountRemark(id, remark, updatedAt string) error {
	res, err := s.db.Exec(`UPDATE accounts SET remark = ?, updated_at = ? WHERE id = ?`, remark, updatedAt, id)
	if err != nil {
		return fmt.Errorf("更新注释失败: %w", err)
	}
	if n, _ := res.RowsAffected(); n == 0 {
		return fmt.Errorf("账号不存在: %s", id)
	}
	return nil
}

// UpdateAccountStatus 更新检测结果相关字段
func (s *Store) UpdateAccountStatus(id, status, errMsg string, account *model.AccountSnapshot, lastCheck, updatedAt string) error {
	var accountJSON any
	if account != nil {
		b, err := json.Marshal(account)
		if err != nil {
			return fmt.Errorf("序列化账号快照失败: %w", err)
		}
		accountJSON = string(b)
	}
	res, err := s.db.Exec(`UPDATE accounts SET status = ?, err_msg = ?, account = ?, last_check = ?, updated_at = ? WHERE id = ?`,
		status, errMsg, accountJSON, lastCheck, updatedAt, id)
	if err != nil {
		return fmt.Errorf("更新账号状态失败: %w", err)
	}
	if n, _ := res.RowsAffected(); n == 0 {
		return fmt.Errorf("账号不存在: %s", id)
	}
	return nil
}

// DeleteAccount 删除账号
func (s *Store) DeleteAccount(id string) error {
	res, err := s.db.Exec(`DELETE FROM accounts WHERE id = ?`, id)
	if err != nil {
		return fmt.Errorf("删除账号失败: %w", err)
	}
	if n, _ := res.RowsAffected(); n == 0 {
		return fmt.Errorf("账号不存在: %s", id)
	}
	return nil
}

// ===================== key_config =====================

// GetKeyConfig 读取全部 key/value 组装成 KeyConfig
func (s *Store) GetKeyConfig() (model.KeyConfig, error) {
	cfg := model.KeyConfig{PoolIDs: []string{}}
	rows, err := s.db.Query(`SELECT key, value FROM key_config`)
	if err != nil {
		return cfg, fmt.Errorf("查询配置失败: %w", err)
	}
	defer rows.Close()

	kv := map[string]string{}
	for rows.Next() {
		var k, v string
		if err := rows.Scan(&k, &v); err != nil {
			return cfg, fmt.Errorf("扫描配置行失败: %w", err)
		}
		kv[k] = v
	}
	if err := rows.Err(); err != nil {
		return cfg, err
	}

	cfg.Mode = model.KeyMode(kv["mode"])
	if cfg.Mode == "" {
		cfg.Mode = model.KeyModeSequence
	}
	cfg.BaseURL = kv["base_url"]
	cfg.Proxy = kv["proxy"]
	cfg.ActiveID = kv["active_id"]
	cfg.SingleID = kv["single_id"]
	cfg.FofaWebToken = kv["fofa_web_token"]
	if raw := kv["pool_ids"]; raw != "" {
		_ = json.Unmarshal([]byte(raw), &cfg.PoolIDs)
	}
	if cfg.PoolIDs == nil {
		cfg.PoolIDs = []string{}
	}
	return cfg, nil
}

// SetKeyConfig 逐字段 upsert 配置
func (s *Store) SetKeyConfig(cfg model.KeyConfig) error {
	poolJSON, err := json.Marshal(cfg.PoolIDs)
	if err != nil {
		poolJSON = []byte("[]")
	}
	kv := map[string]string{
		"mode":      string(cfg.Mode),
		"base_url":  cfg.BaseURL,
		"proxy":     cfg.Proxy,
		"active_id": cfg.ActiveID,
		"single_id": cfg.SingleID,
		"pool_ids":  string(poolJSON),
	}
	for k, v := range kv {
		if _, err := s.db.Exec(`INSERT INTO key_config(key, value) VALUES(?, ?)
			ON CONFLICT(key) DO UPDATE SET value = excluded.value`, k, v); err != nil {
			return fmt.Errorf("写入配置 %s 失败: %w", k, err)
		}
	}
	return nil
}

// GetConfigValue 读单个配置项
func (s *Store) GetConfigValue(key string) (string, error) {
	var v string
	err := s.db.QueryRow(`SELECT value FROM key_config WHERE key = ?`, key).Scan(&v)
	if err == sql.ErrNoRows {
		return "", nil
	}
	if err != nil {
		return "", fmt.Errorf("查询配置 %s 失败: %w", key, err)
	}
	return v, nil
}

// SetConfigValue upsert 单个配置项
func (s *Store) SetConfigValue(key, value string) error {
	_, err := s.db.Exec(`INSERT INTO key_config(key, value) VALUES(?, ?)
		ON CONFLICT(key) DO UPDATE SET value = excluded.value`, key, value)
	if err != nil {
		return fmt.Errorf("写入配置 %s 失败: %w", key, err)
	}
	return nil
}

// ===================== host_history =====================

// ListHostHistory 返回主机历史记录，按最新时间倒序。
func (s *Store) ListHostHistory() ([]model.HostHistoryItem, error) {
	rows, err := s.db.Query(`SELECT id, host, ts FROM host_history ORDER BY ts DESC`)
	if err != nil {
		return nil, fmt.Errorf("查询主机历史失败: %w", err)
	}
	defer rows.Close()

	items := []model.HostHistoryItem{}
	for rows.Next() {
		var item model.HostHistoryItem
		if err := rows.Scan(&item.ID, &item.Host, &item.Ts); err != nil {
			return nil, fmt.Errorf("扫描主机历史失败: %w", err)
		}
		items = append(items, item)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return items, nil
}

// AddHostHistory upsert 单条主机历史，并保留最新 limit 条。
func (s *Store) AddHostHistory(item model.HostHistoryItem, limit int) error {
	if limit <= 0 {
		limit = 20
	}
	_, err := s.db.Exec(`INSERT INTO host_history(id, host, ts) VALUES(?, ?, ?)
		ON CONFLICT(host) DO UPDATE SET id = excluded.id, ts = excluded.ts`, item.ID, item.Host, item.Ts)
	if err != nil {
		return fmt.Errorf("写入主机历史失败: %w", err)
	}
	_, err = s.db.Exec(`DELETE FROM host_history
		WHERE id NOT IN (
			SELECT id FROM host_history ORDER BY ts DESC LIMIT ?
		)`, limit)
	if err != nil {
		return fmt.Errorf("裁剪主机历史失败: %w", err)
	}
	return nil
}

// RemoveHostHistory 删除单条主机历史；不存在时视为成功。
func (s *Store) RemoveHostHistory(id string) error {
	if _, err := s.db.Exec(`DELETE FROM host_history WHERE id = ?`, id); err != nil {
		return fmt.Errorf("删除主机历史失败: %w", err)
	}
	return nil
}

// ClearHostHistory 清空主机历史。
func (s *Store) ClearHostHistory() error {
	if _, err := s.db.Exec(`DELETE FROM host_history`); err != nil {
		return fmt.Errorf("清空主机历史失败: %w", err)
	}
	return nil
}

// ===================== fofa_query_history =====================

// ListFofaHistory 按 kind 返回查询/统计历史，按时间倒序。
func (s *Store) ListFofaHistory(kind string) ([]model.QueryHistoryItem, error) {
	rows, err := s.db.Query(`SELECT id, query, ts FROM fofa_query_history WHERE kind = ? ORDER BY ts DESC`, kind)
	if err != nil {
		return nil, fmt.Errorf("查询历史失败: %w", err)
	}
	defer rows.Close()

	items := []model.QueryHistoryItem{}
	for rows.Next() {
		var item model.QueryHistoryItem
		if err := rows.Scan(&item.ID, &item.Query, &item.Ts); err != nil {
			return nil, fmt.Errorf("扫描历史失败: %w", err)
		}
		items = append(items, item)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return items, nil
}

// AddFofaHistory upsert 单条历史（同 kind 同 query 刷新时间），保留最新 limit 条。
func (s *Store) AddFofaHistory(kind string, item model.QueryHistoryItem, limit int) error {
	if limit <= 0 {
		limit = 20
	}
	_, err := s.db.Exec(`INSERT INTO fofa_query_history(id, kind, query, ts) VALUES(?, ?, ?, ?)
		ON CONFLICT(kind, query) DO UPDATE SET id = excluded.id, ts = excluded.ts`,
		item.ID, kind, item.Query, item.Ts)
	if err != nil {
		return fmt.Errorf("写入历史失败: %w", err)
	}
	_, err = s.db.Exec(`DELETE FROM fofa_query_history
		WHERE id NOT IN (
			SELECT id FROM fofa_query_history WHERE kind = ? ORDER BY ts DESC LIMIT ?
		)`, kind, limit)
	if err != nil {
		return fmt.Errorf("裁剪历史失败: %w", err)
	}
	return nil
}

// RemoveFofaHistory 删除单条历史；不存在视为成功。
func (s *Store) RemoveFofaHistory(kind, id string) error {
	if _, err := s.db.Exec(`DELETE FROM fofa_query_history WHERE kind = ? AND id = ?`, kind, id); err != nil {
		return fmt.Errorf("删除历史失败: %w", err)
	}
	return nil
}

// ClearFofaHistory 清空指定 kind 的历史。
func (s *Store) ClearFofaHistory(kind string) error {
	if _, err := s.db.Exec(`DELETE FROM fofa_query_history WHERE kind = ?`, kind); err != nil {
		return fmt.Errorf("清空历史失败: %w", err)
	}
	return nil
}
