package app

import (
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"strings"
	"time"

	"myproject/internal/model"
)

// 热搜接口固定在 api.fofa.info，不受配置的 BaseURL 影响（无需凭证）
const hotSearchAPI = "https://api.fofa.info/v1/hotsearch"

// HotSearch 拉取 FOFA 热搜列表（无需凭证，走配置页代理）
func (a *App) HotSearch() ([]model.HotSearchItem, error) {
	cfg, _ := a.GetKeyConfig()
	client := &http.Client{Timeout: 15 * time.Second}
	if proxy := strings.TrimSpace(cfg.Proxy); proxy != "" {
		if pu, err := url.Parse(proxy); err == nil && pu.Scheme != "" {
			client.Transport = &http.Transport{Proxy: http.ProxyURL(pu)}
		}
	}

	req, err := http.NewRequest(http.MethodGet, hotSearchAPI, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Accept", "application/json")

	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("获取热搜失败（网络）：%v", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("热搜接口返回状态 %d", resp.StatusCode)
	}

	var result struct {
		Code int                   `json:"code"`
		Msg  string                `json:"message"`
		Data []model.HotSearchItem `json:"data"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, err
	}
	if result.Code != 0 {
		return nil, fmt.Errorf("热搜接口错误：%s", result.Msg)
	}
	return result.Data, nil
}
