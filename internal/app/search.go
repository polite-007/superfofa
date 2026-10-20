package app

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/polite-007/toolbox/fofa"

	"myproject/internal/model"
)

// defaultSearchFields 基础预设字段（13 个，全免费）
const defaultSearchFields = "ip,port,protocol,title,status_code,domain,os,server,asn,org,country_name,region,city"

// SearchFofa 执行 FOFA 搜索：取有效账号 → 构造客户端 → client.Search → 行转 map
func (a *App) SearchFofa(req model.SearchFofaReq) (model.SearchFofaResult, error) {
	if a.store == nil {
		return model.SearchFofaResult{}, fmt.Errorf("数据库未初始化")
	}
	query := strings.TrimSpace(req.Query)
	if query == "" {
		return model.SearchFofaResult{}, fmt.Errorf("请输入查询语句")
	}
	fields := strings.TrimSpace(req.Fields)
	if fields == "" {
		fields = defaultSearchFields
	}
	size := req.Size
	if size <= 0 {
		size = 50
	}
	if size > 10000 {
		size = 10000
	}
	page := req.Page
	if page <= 0 {
		page = 1
	}

	acc, err := a.PickAccount()
	if err != nil {
		return model.SearchFofaResult{}, err
	}

	cfg, err := a.store.GetKeyConfig()
	if err != nil {
		return model.SearchFofaResult{}, fmt.Errorf("读取配置失败: %w", err)
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

	start := time.Now()
	resp, err := client.Search(&fofa.SearchRequest{
		Ctx:    ctx,
		Query:  query,
		Size:   size,
		Page:   page,
		Fields: fields,
	})
	elapsed := time.Since(start).Milliseconds()
	if err != nil {
		msg := err.Error()
		switch {
		case strings.HasPrefix(msg, "FOFA API 错误:"):
			return model.SearchFofaResult{}, fmt.Errorf("%s", strings.TrimSpace(strings.TrimPrefix(msg, "FOFA API 错误:")))
		case strings.Contains(msg, "请求过快"):
			return model.SearchFofaResult{}, fmt.Errorf("请求过快，请稍后重试")
		default:
			return model.SearchFofaResult{}, fmt.Errorf("联网搜索失败，请检查网络/代理后重试：%s", msg)
		}
	}

	// 行转换：resp.Results [][]string + resp.Fields → []map[string]string
	fieldList := resp.Fields
	rows := make([]map[string]string, 0, len(resp.Results))
	for _, r := range resp.Results {
		row := make(map[string]string, len(fieldList))
		for i, f := range fieldList {
			if i < len(r) {
				row[f] = r[i]
			} else {
				row[f] = ""
			}
		}
		rows = append(rows, row)
	}

	return model.SearchFofaResult{
		Query:        resp.Query,
		Mode:         resp.Mode,
		Page:         resp.Page,
		PageSize:     size,
		Total:        resp.Size,
		Returned:     len(rows),
		Fields:       fieldList,
		Results:      rows,
		AccountID:    acc.ID,
		AccountEmail: acc.Email,
		ElapsedMs:    elapsed,
	}, nil
}
