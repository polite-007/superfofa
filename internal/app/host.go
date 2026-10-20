package app

import (
	"context"
	"fmt"
	"net"
	"strings"
	"time"

	"github.com/polite-007/toolbox/fofa"

	"myproject/internal/model"
)

// QueryHost 查询主机画像：
//  1. 校验 host 非空且为合法 IPv4
//  2. PickAccount() 取有效账号
//  3. GetKeyConfig() 取 BaseURL/Proxy
//  4. 调 client.Host()（fofa 库），错误前缀规则与 search.go 完全一致
func (a *App) QueryHost(req model.HostReq) (model.HostResult, error) {
	host := strings.TrimSpace(req.Host)
	if host == "" {
		return model.HostResult{}, fmt.Errorf("请输入 IPv4 地址")
	}
	if !isIPv4(host) {
		return model.HostResult{}, fmt.Errorf("请输入合法的 IPv4 地址")
	}
	if a.store == nil {
		return model.HostResult{}, fmt.Errorf("数据库未初始化")
	}

	acc, err := a.PickAccount()
	if err != nil {
		return model.HostResult{}, err
	}

	cfg, err := a.store.GetKeyConfig()
	if err != nil {
		return model.HostResult{}, fmt.Errorf("读取配置失败: %w", err)
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
	resp, err := client.Host(&fofa.HostRequest{
		Ctx:    ctx,
		Host:   host,
		Detail: req.Detail,
	})
	elapsed := time.Since(start).Milliseconds()
	if err != nil {
		msg := err.Error()
		switch {
		case strings.HasPrefix(msg, "FOFA API 错误:"):
			return model.HostResult{}, fmt.Errorf("%s", strings.TrimSpace(strings.TrimPrefix(msg, "FOFA API 错误:")))
		case strings.Contains(msg, "请求过快"):
			return model.HostResult{}, fmt.Errorf("请求过快，请稍后重试")
		default:
			return model.HostResult{}, fmt.Errorf("查询主机画像失败，请检查网络/代理后重试：%s", msg)
		}
	}

	result := model.HostResult{
		Host:         resp.Host,
		IP:           resp.IP,
		ASN:          resp.ASN,
		Org:          resp.Org,
		CountryName:  resp.CountryName,
		CountryCode:  resp.CountryCode,
		Protocol:     ensureStringSlice(resp.Protocol),
		Port:         ensureIntSlice(resp.Port),
		Category:     ensureStringSlice(resp.Category),
		Product:      ensureStringSlice(resp.Product),
		Ports:        normalizeHostPorts(resp.Ports),
		UpdateTime:   resp.UpdateTime,
		Detail:       req.Detail,
		AccountID:    acc.ID,
		AccountEmail: acc.Email,
		ElapsedMs:    elapsed,
	}
	return result, nil
}

// isIPv4 判断是否合法 IPv4（排除 IPv6/域名）
func isIPv4(s string) bool {
	parsed := net.ParseIP(s)
	if parsed == nil {
		return false
	}
	return parsed.To4() != nil
}

func normalizeHostPorts(ports []fofa.HostPort) []model.HostPort {
	if len(ports) == 0 {
		return []model.HostPort{}
	}
	out := make([]model.HostPort, 0, len(ports))
	for _, p := range ports {
		products := p.Products
		if products == nil {
			products = []fofa.HostProduct{}
		}
		converted := make([]model.HostProduct, 0, len(products))
		for _, pr := range products {
			converted = append(converted, model.HostProduct{
				Product:      pr.Product,
				Category:     pr.Category,
				Level:        pr.Level,
				SortHardCode: pr.SortHardCode,
			})
		}
		out = append(out, model.HostPort{
			Port:     p.Port,
			Protocol: p.Protocol,
			Products: converted,
		})
	}
	return out
}

func ensureStringSlice(v []string) []string {
	if v == nil {
		return []string{}
	}
	return v
}

func ensureIntSlice(v []int) []int {
	if v == nil {
		return []int{}
	}
	return v
}
