package app

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/polite-007/toolbox/fofa"

	"myproject/internal/model"
)

const (
	maxStatsFields   = 5
	statsThrottleGap = 5 * time.Second
)

var supportedStatsFields = []string{
	"protocol",
	"domain",
	"port",
	"title",
	"os",
	"server",
	"country",
	"asn",
	"org",
	"asset_type",
	"fid",
	"icp",
}

func (a *App) StatsFofa(req model.StatsFofaReq) (model.StatsFofaResult, error) {
	if a.store == nil {
		return model.StatsFofaResult{}, fmt.Errorf("数据库未初始化")
	}
	query := strings.TrimSpace(req.Query)
	if query == "" {
		return model.StatsFofaResult{}, fmt.Errorf("请输入查询语句")
	}
	fields, err := normalizeStatsFields(req.Fields)
	if err != nil {
		return model.StatsFofaResult{}, err
	}
	size, err := validateStatsSize(req.Size)
	if err != nil {
		return model.StatsFofaResult{}, err
	}

	acc, err := a.PickAccount()
	if err != nil {
		return model.StatsFofaResult{}, err
	}

	cfg, err := a.store.GetKeyConfig()
	if err != nil {
		return model.StatsFofaResult{}, fmt.Errorf("读取配置失败: %w", err)
	}
	opts := []fofa.Option{fofa.WithRetryCount(3)}
	if strings.TrimSpace(cfg.BaseURL) != "" {
		opts = append(opts, fofa.WithBaseURL(cfg.BaseURL))
	}
	if strings.TrimSpace(cfg.Proxy) != "" {
		opts = append(opts, fofa.WithProxy(cfg.Proxy))
	}
	client := fofa.NewClient(acc.Email, acc.Key, opts...)

	ctx := a.ctx
	if ctx == nil {
		ctx = context.Background()
	}

	a.statsMu.Lock()
	defer a.statsMu.Unlock()
	if wait := statsThrottleWaitDuration(a.lastStatsAt, time.Now()); wait > 0 {
		time.Sleep(wait)
	}
	a.lastStatsAt = time.Now()

	start := time.Now()
	resp, err := client.Stats(&fofa.StatsRequest{
		Ctx:    ctx,
		Query:  query,
		Fields: strings.Join(fields, ","),
		Size:   size,
	})
	elapsed := time.Since(start).Milliseconds()
	if err != nil {
		return model.StatsFofaResult{}, translateStatsError(err)
	}

	return convertStatsResponse(query, fields, size, resp, resp.GetAllResults(), acc.ID, acc.Email, elapsed), nil
}

func normalizeStatsFields(raw string) ([]string, error) {
	supported := make(map[string]bool, len(supportedStatsFields))
	for _, field := range supportedStatsFields {
		supported[field] = true
	}

	seen := make(map[string]bool)
	fields := make([]string, 0, maxStatsFields)
	invalids := make([]string, 0)
	for _, part := range strings.Split(raw, ",") {
		field := strings.TrimSpace(part)
		if field == "" {
			continue
		}
		if !supported[field] {
			invalids = append(invalids, field)
			continue
		}
		if seen[field] {
			continue
		}
		seen[field] = true
		fields = append(fields, field)
	}

	if len(invalids) > 0 {
		return nil, fmt.Errorf("不支持的统计字段：%s。支持字段：%s", strings.Join(invalids, ", "), strings.Join(supportedStatsFields, ", "))
	}
	if len(fields) == 0 {
		return nil, fmt.Errorf("请选择统计字段")
	}
	if len(fields) > maxStatsFields {
		return nil, fmt.Errorf("最多选择 5 个统计字段")
	}
	return fields, nil
}

func validateStatsSize(size int) (int, error) {
	if size <= 0 {
		return 0, fmt.Errorf("请选择有效的 TopN")
	}
	if size > 500 {
		return 0, fmt.Errorf("size 最大支持 500")
	}
	switch size {
	case 10, 50, 100, 500:
		return size, nil
	default:
		return 0, fmt.Errorf("TopN 仅支持 10、50、100、500")
	}
}

func convertStatsResponse(query string, fields []string, size int, resp *fofa.StatsResponse, all map[string][]*fofa.StatsResult, accountID, accountEmail string, elapsedMs int64) model.StatsFofaResult {
	resultFields := append([]string(nil), fields...)
	returned := make(map[string]int, len(resultFields))
	distinct := make(map[string]int64, len(resultFields))
	aggs := make(map[string][]model.StatsAggItem, len(resultFields))

	var total int64
	if resp != nil {
		total = int64(resp.Size)
	}

	for _, field := range resultFields {
		if resp != nil && resp.Distinct != nil {
			distinct[field] = int64(resp.Distinct[field])
		} else {
			distinct[field] = 0
		}

		stats := all[field]
		items := make([]model.StatsAggItem, 0, len(stats))
		for _, stat := range stats {
			if stat == nil {
				continue
			}
			item := model.StatsAggItem{
				Name:  stat.Name,
				Count: int64(stat.Count),
			}
			if len(stat.Regions) > 0 {
				regions := make([]model.StatsSubItem, 0, len(stat.Regions))
				for _, r := range stat.Regions {
					regions = append(regions, model.StatsSubItem{
						Name:  r.Name,
						Count: int64(r.Count),
					})
				}
				if len(regions) > 0 {
					item.Regions = regions
				}
			}
			items = append(items, item)
		}
		returned[field] = len(items)
		aggs[field] = items
	}

	return model.StatsFofaResult{
		Query:          query,
		Fields:         resultFields,
		Size:           size,
		Total:          total,
		Returned:       returned,
		Distinct:       distinct,
		Aggs:           aggs,
		LastUpdateTime: statsLastUpdateTime(resp),
		AccountID:      accountID,
		AccountEmail:   accountEmail,
		ElapsedMs:      elapsedMs,
	}
}

// statsLastUpdateTime 从 stats 响应中提取 lastupdatetime。
// FOFA stats 接口返回体包含与 aggs 同级的 lastupdatetime 字段，但
// toolbox fofa.StatsResponse 未声明该字段且未暴露原始 body，故无法获取。
// 保留空值以免误导前端。
func statsLastUpdateTime(_ *fofa.StatsResponse) string {
	return ""
}

func statsThrottleWaitDuration(last, now time.Time) time.Duration {
	if last.IsZero() {
		return 0
	}
	elapsed := now.Sub(last)
	if elapsed >= statsThrottleGap {
		return 0
	}
	return statsThrottleGap - elapsed
}

func translateStatsError(err error) error {
	if err == nil {
		return nil
	}
	msg := err.Error()
	switch {
	case strings.HasPrefix(msg, "FOFA API 错误:"):
		return fmt.Errorf("%s", strings.TrimSpace(strings.TrimPrefix(msg, "FOFA API 错误:")))
	case strings.Contains(msg, "请求过快"):
		return fmt.Errorf("请求过快，请稍后重试")
	default:
		return fmt.Errorf("统计聚合失败，请检查网络/代理后重试：%s", msg)
	}
}
