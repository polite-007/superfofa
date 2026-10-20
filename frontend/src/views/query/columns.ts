// 结果表格列定义：列与 FOFA 字段分离，一列可由多字段组合渲染。
// 后端只感知 FOFA Fields 并集；列定义纯前端维护。

export type Tier = "free" | "personal" | "professional" | "business" | "enterprise"

export type ColumnDef = {
  key: string // 列 id（唯一）
  label: string // 中文表头
  fields: string[] // 该列依赖的 FOFA 字段
  tier: Tier // 该列所需账号等级（取字段最高等级）
  // 单元格渲染：默认取 fields[0]，组合列传 render
  render?: (row: Record<string, string>) => string
  // 文本类型：影响字体/截断展示
  mono?: boolean // 等宽（ip/port/status_code 等）
  long?: boolean // 长文截断 + title 悬停（title/host/banner/header/cert 等）
}

// 组合列渲染规则
function joinNonEmpty(parts: (string | undefined)[], sep: string): string {
  const v = parts.map((p) => (p ?? "").trim()).filter(Boolean).join(sep)
  return v
}

export const CATALOG: ColumnDef[] = [
  // —— 基础 ——
  { key: "ip", label: "IP", fields: ["ip"], tier: "free", mono: true },
  { key: "port", label: "端口", fields: ["port"], tier: "free", mono: true },
  { key: "protocol", label: "协议", fields: ["protocol"], tier: "free" },
  { key: "title", label: "标题", fields: ["title"], tier: "free", long: true },
  { key: "status_code", label: "状态码", fields: ["status_code"], tier: "free", mono: true },
  { key: "domain", label: "域名", fields: ["domain"], tier: "free", long: true },
  { key: "host", label: "主机", fields: ["host"], tier: "free", long: true },
  { key: "icp", label: "ICP", fields: ["icp"], tier: "free", long: true },
  { key: "link", label: "URL", fields: ["link"], tier: "free", long: true },
  { key: "country", label: "国家代码", fields: ["country"], tier: "free", mono: true },

  // —— 组合 ——
  {
    key: "os_server",
    label: "系统/服务",
    fields: ["os", "server"],
    tier: "free",
    long: true,
    render: (r) => {
      const os = r.os?.trim()
      const sv = r.server?.trim()
      if (os && sv) return `${os} / ${sv}`
      return os || sv || ""
    },
  },
  {
    key: "asn_org",
    label: "ASN/组织",
    fields: ["asn", "org"],
    tier: "free",
    long: true,
    render: (r) => {
      const asn = r.asn?.trim()
      const org = r.org?.trim()
      if (asn && org) return `${asn}（${org}）`
      return asn || org || ""
    },
  },
  {
    key: "location",
    label: "位置",
    fields: ["country_name", "region", "city"],
    tier: "free",
    long: true,
    render: (r) => joinNonEmpty([r.country_name, r.region, r.city], " "),
  },
  {
    key: "geo",
    label: "经纬度",
    fields: ["longitude", "latitude"],
    tier: "free",
    mono: true,
    render: (r) => joinNonEmpty([r.longitude, r.latitude], ", "),
  },

  // —— 网站 ——
  { key: "header", label: "响应头", fields: ["header"], tier: "free", long: true },
  { key: "header_hash", label: "响应头Hash", fields: ["header_hash"], tier: "personal", mono: true, long: true },
  { key: "icon_hash", label: "图标hash", fields: ["icon_hash"], tier: "business", mono: true },
  { key: "icon", label: "图标", fields: ["icon"], tier: "enterprise" },
  { key: "body", label: "正文", fields: ["body"], tier: "business", long: true },
  { key: "cname", label: "CNAME", fields: ["cname"], tier: "professional", long: true },
  { key: "cname_domain", label: "CNAME域名", fields: ["cname_domain"], tier: "business", long: true },

  // —— 证书 ——
  { key: "cert", label: "证书", fields: ["cert"], tier: "free", long: true },
  { key: "cert.subject.cn", label: "持有者CN", fields: ["cert.subject.cn"], tier: "free", long: true },
  { key: "cert.issuer.cn", label: "颁发者CN", fields: ["cert.issuer.cn"], tier: "free", long: true },
  { key: "tls.version", label: "TLS版本", fields: ["tls.version"], tier: "free" },
  { key: "jarm", label: "JARM", fields: ["jarm"], tier: "free", mono: true, long: true },
  { key: "tls.ja3s", label: "JA3S", fields: ["tls.ja3s"], tier: "free", mono: true, long: true },
  {
    key: "cert_period",
    label: "有效期",
    fields: ["cert.not_before", "cert.not_after"],
    tier: "free",
    long: true,
    render: (r) => {
      const a = r["cert.not_before"]?.trim()
      const b = r["cert.not_after"]?.trim()
      if (a && b) return `${a} ~ ${b}`
      return a || b || ""
    },
  },
  { key: "cert.subject.org", label: "持有者组织", fields: ["cert.subject.org"], tier: "free", long: true },
  { key: "cert.issuer.org", label: "颁发者组织", fields: ["cert.issuer.org"], tier: "free", long: true },
  { key: "cert.sn", label: "证书序列号", fields: ["cert.sn"], tier: "free", mono: true, long: true },
  { key: "cert.domain", label: "证书根域名", fields: ["cert.domain"], tier: "free", long: true },
  { key: "cert.is_valid", label: "证书有效", fields: ["cert.is_valid"], tier: "business", mono: true },
  { key: "cert.is_match", label: "颁发/持有相同", fields: ["cert.is_match"], tier: "business", mono: true },
  { key: "cert.is_equal", label: "证书域名匹配", fields: ["cert.is_equal"], tier: "business", mono: true },

  // —— 服务 ——
  { key: "banner", label: "Banner", fields: ["banner"], tier: "free", long: true },
  { key: "banner_hash", label: "Banner Hash", fields: ["banner_hash"], tier: "personal", mono: true, long: true },
  { key: "banner_fid", label: "Banner指纹", fields: ["banner_fid"], tier: "personal", mono: true, long: true },
  { key: "base_protocol", label: "基础协议", fields: ["base_protocol"], tier: "free" },
  { key: "product", label: "产品", fields: ["product"], tier: "professional", long: true },
  { key: "product_category", label: "产品分类", fields: ["product_category"], tier: "professional", long: true },
  { key: "product.version", label: "产品版本", fields: ["product.version"], tier: "business", long: true },
  { key: "structinfo", label: "结构化信息", fields: ["structinfo"], tier: "enterprise", long: true },

  // —— 时间 ——
  { key: "lastupdatetime", label: "更新时间", fields: ["lastupdatetime"], tier: "professional", long: true },

  // —— 标记 ——
  { key: "fid", label: "指纹", fields: ["fid"], tier: "enterprise", mono: true, long: true },
]

export const COLUMN_MAP: Record<string, ColumnDef> = Object.fromEntries(
  CATALOG.map((c) => [c.key, c]),
)

// —— 预设（列预设，快捷按钮）——
export type Preset = { key: string; label: string; columns: ColumnDef[] }

export const PRESETS: Preset[] = [
  {
    key: "basic",
    label: "基础",
    columns: [
      "ip", "port", "protocol", "host", "title", "status_code",
      "domain", "os_server", "asn_org", "location",
    ].map((k) => COLUMN_MAP[k]).filter(Boolean),
  },
  {
    key: "web",
    label: "网站详情",
    columns: [
      "host", "title", "status_code", "header", "icp",
      "cert", "jarm", "location",
    ].map((k) => COLUMN_MAP[k]).filter(Boolean),
  },
  {
    key: "service",
    label: "服务协议",
    columns: [
      "ip", "port", "protocol", "banner", "base_protocol",
      "os_server", "location",
    ].map((k) => COLUMN_MAP[k]).filter(Boolean),
  },
  {
    key: "cert",
    label: "证书分析",
    columns: [
      "ip", "port", "cert", "cert.subject.cn", "cert.issuer.cn",
      "tls.version", "tls.ja3s", "jarm", "cert_period",
    ].map((k) => COLUMN_MAP[k]).filter(Boolean),
  },
  {
    key: "advanced",
    label: "高级",
    columns: [
      "product", "product.version", "icon_hash", "cname",
      "body", "lastupdatetime",
    ].map((k) => COLUMN_MAP[k]).filter(Boolean),
  },
]

export const DEFAULT_PRESET_KEY = "basic"

export function getPreset(key: string): Preset | undefined {
  return PRESETS.find((p) => p.key === key)
}

// 由当前列匹配预设标签（匹配不上则"自定义"）
export function detectPresetLabel(columns: ColumnDef[]): string {
  const keys = columns.map((c) => c.key).join(",")
  for (const p of PRESETS) {
    if (p.columns.map((c) => c.key).join(",") === keys) return p.label
  }
  return "自定义"
}

// 由选中列计算 FOFA Fields 并集（保持稳定顺序，去重）
export function fieldsOf(columns: ColumnDef[]): string {
  const seen = new Set<string>()
  const out: string[] = []
  for (const c of columns) {
    for (const f of c.fields) {
      if (!seen.has(f)) {
        seen.add(f)
        out.push(f)
      }
    }
  }
  return out.join(",")
}

// 渲染单元格文本
export function renderCell(col: ColumnDef, row: Record<string, string>): string {
  if (col.render) return col.render(row)
  return (row[col.fields[0]] ?? "").trim()
}

// 字段选择器分组（FieldPickerDialog 用）
export type FieldGroup = { title: string; columns: ColumnDef[] }

export const FIELD_GROUPS: FieldGroup[] = [
  {
    title: "基础",
    columns: ["ip", "port", "protocol", "title", "status_code", "domain", "host", "icp", "link", "country"]
      .map((k) => COLUMN_MAP[k]).filter(Boolean),
  },
  {
    title: "组合",
    columns: ["os_server", "asn_org", "location", "geo"]
      .map((k) => COLUMN_MAP[k]).filter(Boolean),
  },
  {
    title: "网站",
    columns: ["header", "header_hash", "icon_hash", "icon", "body", "cname", "cname_domain"]
      .map((k) => COLUMN_MAP[k]).filter(Boolean),
  },
  {
    title: "证书",
    columns: ["cert", "cert.subject.cn", "cert.issuer.cn", "cert.subject.org", "cert.issuer.org", "cert.sn", "cert.domain", "tls.version", "jarm", "tls.ja3s", "cert_period", "cert.is_valid", "cert.is_match", "cert.is_equal"]
      .map((k) => COLUMN_MAP[k]).filter(Boolean),
  },
  {
    title: "服务",
    columns: ["banner", "banner_hash", "banner_fid", "base_protocol", "product", "product_category", "product.version", "structinfo"]
      .map((k) => COLUMN_MAP[k]).filter(Boolean),
  },
  { title: "时间", columns: ["lastupdatetime"].map((k) => COLUMN_MAP[k]).filter(Boolean) },
  { title: "标记", columns: ["fid"].map((k) => COLUMN_MAP[k]).filter(Boolean) },
]

export const TIER_LABEL: Record<Tier, string> = {
  free: "免费",
  personal: "个人版",
  professional: "专业版",
  business: "商业版",
  enterprise: "企业版",
}

export const TIER_TONE: Record<Tier, string> = {
  free: "text-muted-foreground",
  personal: "text-sky-500",
  professional: "text-violet-500",
  business: "text-amber-500",
  enterprise: "text-rose-500",
}

// 由 key 数组解析为 ColumnDef（过滤未知 key）
export function keysToColumns(keys: string[]): ColumnDef[] {
  return keys.map((k) => COLUMN_MAP[k]).filter(Boolean)
}

export type ExportFieldOption = {
  key: string
  label: string
  fofaField: string
  group: string
}

export function exportFieldOptions(): ExportFieldOption[] {
  const seen = new Set<string>()
  const options: ExportFieldOption[] = []

  for (const group of FIELD_GROUPS) {
    for (const column of group.columns) {
      if (column.fields.length !== 1) continue
      const fofaField = column.fields[0]
      if (seen.has(fofaField)) continue
      seen.add(fofaField)
      options.push({
        key: column.key,
        label: column.label,
        fofaField,
        group: group.title,
      })
    }
  }

  return options
}
