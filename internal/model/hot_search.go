package model

// HotTrend 热搜趋势点（近一个月）
type HotTrend struct {
	DateE  string `json:"date"`   // 2026-07-01
	Value  int    `json:"value"`  // 搜索次数
	IsMark bool   `json:"is_mark"`
}

// HotSearchItem FOFA 热搜条目
type HotSearchItem struct {
	App         string      `json:"app"`          // 应用名称
	QueryString string      `json:"query_string"` // 搜索查询语句
	AssetCount  int         `json:"asset_count"`  // 资产数量
	IsHot       bool        `json:"is_hot"`       // 是否为热门搜索
	HotTrend    []*HotTrend `json:"hot_trend"`    // 热门搜索趋势
}
