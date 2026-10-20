package model

// 账号状态取值
const (
	StatusUnchecked = "unchecked" // 兜底状态，正常不会出现（新增已强制联网检测）
	StatusValid     = "valid"     // 有效：client.Account() 成功且 FOFA 未报错
	StatusInvalid   = "invalid"   // key 无效：FOFA 明确拒绝（errmsg 非 45012）
	StatusError     = "error"     // 检测失败：网络/代理/超时/限流，非 key 问题
)

// FofaAccount 本地存储的 FOFA 账号
type FofaAccount struct {
	ID        string           `json:"id"`                // 唯一ID（UUID）
	Email     string           `json:"email"`             // FOFA 邮箱
	Key       string           `json:"key"`               // FOFA API Key（完整返回，前端用"小眼睛"切换显隐）
	Remark    string           `json:"remark"`            // 注释，用户自定义，可编辑
	Status    string           `json:"status"`            // unchecked | valid | invalid | error
	Account   *AccountSnapshot `json:"account,omitempty"` // 检测成功后的账号信息快照
	LastCheck string           `json:"last_check"`        // 上次检测时间 RFC3339，空串=未检测
	ErrMsg    string           `json:"err_msg"`           // status=invalid/error 时的错误描述，空串=无
	CreatedAt string           `json:"created_at"`        // 创建时间 RFC3339
	UpdatedAt string           `json:"updated_at"`        // 更新时间 RFC3339
}

// AccountSnapshot FOFA Account 接口返回的关键信息快照
type AccountSnapshot struct {
	Username        string `json:"username"`          // 用户名
	Category        string `json:"category"`          // 用户类别
	Fcoin           int    `json:"fcoin"`             // F币余额
	FofaPoint       int    `json:"fofa_point"`        // F点数
	RemainFreePoint int    `json:"remain_free_point"` // 剩余免费点数
	RemainAPIQuery  int    `json:"remain_api_query"`  // 剩余API查询次数
	RemainAPIData   int    `json:"remain_api_data"`   // 剩余API数据条数
	IsVip           bool   `json:"isvip"`             // 是否VIP
	VipLevel        int    `json:"vip_level"`         // VIP等级
	IsVerified      bool   `json:"is_verified"`       // 是否已认证
}

// AddAccountReq 新增账号请求
type AddAccountReq struct {
	Email  string `json:"email"`
	Key    string `json:"key"`
	Remark string `json:"remark"`
}

// UpdateAccountReq 编辑账号请求（仅注释可改）
type UpdateAccountReq struct {
	ID     string `json:"id"`
	Remark string `json:"remark"`
}

// SearchFofaReq FOFA 搜索请求
type SearchFofaReq struct {
	Query  string `json:"query"`  // 查询语句，非空
	Fields string `json:"fields"` // 返回字段，逗号分隔；空=用默认预设
	Size   int    `json:"size"`   // 每页条数，0=默认 50，上限 10000
	Page   int    `json:"page"`   // 页码，0=1
}

// SearchFofaResult FOFA 搜索结果
type SearchFofaResult struct {
	Query        string              `json:"query"`         // 实际查询语句
	Mode         string              `json:"mode"`          // FOFA 返回的查询模式
	Page         int                 `json:"page"`          // 当前页码
	PageSize     int                 `json:"page_size"`     // 请求的每页条数
	Total        int                 `json:"total"`         // 命中总数（FOFA resp.size）
	Returned     int                 `json:"returned"`      // 本页实际返回条数 = len(Results)
	Fields       []string            `json:"fields"`        // 列字段顺序（后端实际返回，可能含 ensureMinFields 补的 ip/port）
	Results      []map[string]string `json:"results"`       // 每行 field→value
	AccountID    string              `json:"account_id"`    // 本次使用的账号 ID
	AccountEmail string              `json:"account_email"` // 本次使用的账号邮箱
	ElapsedMs    int64               `json:"elapsed_ms"`    // 耗时（毫秒）
}

// StatsFofaReq FOFA 统计聚合请求
type StatsFofaReq struct {
	Query  string `json:"query"`  // 查询语句，非空
	Fields string `json:"fields"` // 统计字段，逗号分隔，最多 5 个
	Size   int    `json:"size"`   // 每个字段返回 TopN，仅支持 10/50/100/500
}

// StatsSubItem 单条子聚合条目，用于 country 下钻的 region/city
type StatsSubItem struct {
	Name  string `json:"name"`
	Count int64  `json:"count"`
}

// StatsAggItem 单条统计聚合项
type StatsAggItem struct {
	Name    string         `json:"name"`              // 字段值
	Count   int64          `json:"count"`             // 该值出现次数
	Regions []StatsSubItem `json:"regions,omitempty"` // country 聚合时下钻的区域/城市统计
}

// StatsFofaResult FOFA 统计聚合结果
type StatsFofaResult struct {
	Query          string                    `json:"query"`          // 实际查询语句
	Fields         []string                  `json:"fields"`         // 后端校验去重后的字段顺序
	Size           int                       `json:"size"`           // 请求 TopN
	Total          int64                     `json:"total"`          // 命中总数（FOFA resp.size）
	Returned       map[string]int            `json:"returned"`       // 每个字段实际返回条数
	Distinct       map[string]int64          `json:"distinct"`       // 唯一计数
	Aggs           map[string][]StatsAggItem `json:"aggs"`           // field -> 聚合列表
	LastUpdateTime string                    `json:"lastupdatetime"` // FOFA 数据更新时间
	AccountID      string                    `json:"account_id"`     // 本次使用账号 ID
	AccountEmail   string                    `json:"account_email"`  // 本次使用账号邮箱
	ElapsedMs      int64                     `json:"elapsed_ms"`     // 真实 API 调用耗时，不含限流等待
}

// ExportSource 导出输入来源
const (
	ExportSourceQuery = "query"
	ExportSourceText  = "text"
	ExportSourceFile  = "file"
)

// ExportInputType 导出输入类型
const (
	ExportInputSyntax = "syntax"
	ExportInputIP     = "ip"
	ExportInputHost   = "host"
	ExportInputDomain = "domain"
)

// ExportTaskStatus 导出任务状态
const (
	ExportTaskPending   = "pending"
	ExportTaskRunning   = "running"
	ExportTaskPaused    = "paused"
	ExportTaskFailed    = "failed"
	ExportTaskCompleted = "completed"
)

// ExportPauseReason 暂停原因
const (
	ExportPauseManual  = "manual"
	ExportPauseNetwork = "network"
	ExportPauseQuota   = "quota"
	ExportPauseUnknown = "unknown"
)

// ExportFailReason 失败原因
const (
	ExportFailInvalidKey   = "invalid_key"
	ExportFailPermission   = "permission_denied"
	ExportFailInvalidInput = "invalid_input"
	ExportFailOutputWrite  = "output_write_failed"
	ExportFailCheckpoint   = "checkpoint_corrupted"
	ExportFailUnknown      = "unknown"
)

// ExportTimeRange 导出时间范围
// Start/End 使用 RFC3339 字符串，空串表示未设置。
type ExportTimeRange struct {
	Preset string `json:"preset"`
	Start  string `json:"start"`
	End    string `json:"end"`
}

// ExportField 导出字段定义。
type ExportField struct {
	Key       string `json:"key"`
	Label     string `json:"label"`
	FofaField string `json:"fofa_field"`
}

// ExportTask 导出任务
type ExportTask struct {
	ID               string           `json:"id"`
	Name             string           `json:"name"`
	Source           string           `json:"source"`
	InputType        string           `json:"input_type"`
	SourceFileName   string           `json:"source_file_name"`
	Status           string           `json:"status"`
	PauseReason      string           `json:"pause_reason"`
	FailReason       string           `json:"fail_reason"`
	Message          string           `json:"message"`
	QueryText        string           `json:"query_text"`
	RawInput         string           `json:"raw_input"`
	TimeRange        ExportTimeRange  `json:"time_range"`
	Fields           []ExportField    `json:"fields"`
	TotalItems       int              `json:"total_items"`
	CompletedItems   int              `json:"completed_items"`
	CurrentItemIndex int              `json:"current_item_index"`
	CurrentItemPage  int              `json:"current_item_page"`
	ExportedRows     int              `json:"exported_rows"`
	CheckpointPath   string           `json:"checkpoint_path"`
	OutputPath       string           `json:"output_path"`
	CreatedAt        string           `json:"created_at"`
	UpdatedAt        string           `json:"updated_at"`
	Items            []ExportTaskItem `json:"items,omitempty"`
}

// ExportTaskItem 导出子项
type ExportTaskItem struct {
	ID              string `json:"id"`
	TaskID          string `json:"task_id"`
	Index           int    `json:"index"`
	RawInput        string `json:"raw_input"`
	NormalizedInput string `json:"normalized_input"`
	NormalizedQuery string `json:"normalized_query"`
	Status          string `json:"status"`
	NextPage        int    `json:"next_page"`
	ExportedRows    int    `json:"exported_rows"`
	ErrorMessage    string `json:"error_message"`
}

// ExportPrecheckReq 创建前预检请求
type ExportPrecheckReq struct {
	Source         string          `json:"source"`
	InputType      string          `json:"input_type"` // 语法 | ip | host | domain
	Text           string          `json:"text"`
	SourceFileName string          `json:"source_file_name"`
	TaskName       string          `json:"task_name"`
	Fields         []ExportField   `json:"fields"`
	TimeRange      ExportTimeRange `json:"time_range"`
}

// ExportPrecheckResult 预检结果
type ExportPrecheckResult struct {
	TaskName        string   `json:"task_name"`
	Source          string   `json:"source"`
	InputType       string   `json:"input_type"`
	TotalLines      int      `json:"total_lines"`
	ValidItems      int      `json:"valid_items"`
	DuplicateItems  int      `json:"duplicate_items"`
	InvalidItems    int      `json:"invalid_items"`
	InvalidExamples []string `json:"invalid_examples"`
	NormalizedItems []string `json:"normalized_items"`
}

// CreateExportTaskReq 根据预检结果创建任务
type CreateExportTaskReq struct {
	TaskName        string          `json:"task_name"`
	Source          string          `json:"source"`
	InputType       string          `json:"input_type"`
	Text            string          `json:"text"`
	SourceFileName  string          `json:"source_file_name"`
	Fields          []ExportField   `json:"fields"`
	TimeRange       ExportTimeRange `json:"time_range"`
	NormalizedItems []string        `json:"normalized_items"`
}

// CloneExportTaskReq 复制任务为新任务
type CloneExportTaskReq struct {
	TaskID string `json:"task_id"`
}

// KeyMode 系统 key 使用模式
type KeyMode string

const (
	KeyModeSequence KeyMode = "sequence" // 顺序使用：按存储顺序依次轮询
	KeyModeSingle   KeyMode = "single"   // 单key运行：固定使用选定的一个key
	KeyModeMulti    KeyMode = "multi"    // 多key运行：选定的多个key并发使用
)

// HostHistoryItem 主机页历史记录项
type HostHistoryItem struct {
	ID   string `json:"id"`
	Host string `json:"host"` // IPv4 字符串
	Ts   int64  `json:"ts"`   // Unix 毫秒时间戳
}

// QueryHistoryItem 查询/统计页历史记录项（kind 区分来源）
type QueryHistoryItem struct {
	ID    string `json:"id"`
	Query string `json:"query"` // FOFA 查询语句
	Ts    int64  `json:"ts"`    // Unix 毫秒时间戳
}

// 历史记录来源类型
const (
	HistoryKindQuery = "query" // 查询页历史
	HistoryKindStats = "stats" // 统计聚合页历史
)

// HostReq 主机画像查询请求
type HostReq struct {
	Host   string `json:"host"`   // IPv4 字符串
	Detail bool   `json:"detail"` // false=普通画像，true=端口详情
}

// HostProduct host 详情模式下的单个产品
type HostProduct struct {
	Product      string `json:"product"`
	Category     string `json:"category"`
	Level        int    `json:"level"`          // 5应用/4支持/3服务/2系统/1硬件/0无
	SortHardCode int    `json:"sort_hard_code"` // 1=硬件，否则非硬件
}

// HostPort host 详情模式下的端口条目
type HostPort struct {
	Port     int           `json:"port"`
	Protocol string        `json:"protocol"`
	Products []HostProduct `json:"products"`
}

// HostResult 主机画像结果（普通/详情两种模式共用，按 Detail 分支渲染）
type HostResult struct {
	Host         string     `json:"host"`
	IP           string     `json:"ip"`
	ASN          int        `json:"asn"`
	Org          string     `json:"org"`
	CountryName  string     `json:"country_name"`
	CountryCode  string     `json:"country_code"`
	Protocol     []string   `json:"protocol"` // detail=false 有值
	Port         []int      `json:"port"`     // detail=false 有值
	Category     []string   `json:"category"` // detail=false 有值
	Product      []string   `json:"product"`  // detail=false 有值
	Ports        []HostPort `json:"ports"`    // detail=true 有值
	UpdateTime   string     `json:"update_time"`
	Detail       bool       `json:"detail"` // 标记本次返回结构
	AccountID    string     `json:"account_id"`
	AccountEmail string     `json:"account_email"`
	ElapsedMs    int64      `json:"elapsed_ms"`
}

// KeyConfig 系统 key 使用配置 + API 地址
type KeyConfig struct {
	Mode         KeyMode  `json:"mode"`           // 使用模式：sequence | single | multi
	BaseURL      string   `json:"base_url"`       // FOFA API 地址，空串=默认 https://fofa.info
	Proxy        string   `json:"proxy"`          // 代理地址，如 http://127.0.0.1:7890 或 socks5://...
	ActiveID     string   `json:"active_id"`      // sequence 模式：当前指针，记录上次用到哪个账号
	SingleID     string   `json:"single_id"`      // single 模式：固定使用的账号ID
	PoolIDs      []string `json:"pool_ids"`       // multi 模式：并发使用的账号ID列表，空切片=所有有效账号
	FofaWebToken string   `json:"fofa_web_token"` // FOFA 用户 Token
}
