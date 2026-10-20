import { COLUMN_MAP, TIER_LABEL, type Tier } from "./columns"

export type CardFieldGroup = "通用" | "网站" | "协议"

export type CardFieldDef = {
  key: string
  label: string
  tier: Tier
  group: CardFieldGroup
  fields: string[]
  render?: (row: Record<string, string>) => string
  mono?: boolean
  /** 长文本代码块（Header / Banner / Body） */
  block?: boolean
  blockTag?: string
}

export type CardTier = Exclude<Tier, "free">

export type CardSettings = {
  tier: CardTier
  fields: string[]
}

/** 卡片身份区固定请求的 FOFA 字段 */
export const CARD_IDENTITY_FIELDS = [
  "ip",
  "port",
  "protocol",
  "host",
  "title",
  "domain",
  "link",
  "status_code",
]

export const MAX_CARD_FIELDS = 12

export const CARD_TIER_ORDER: Record<Tier, number> = {
  free: 0,
  personal: 1,
  professional: 2,
  business: 3,
  enterprise: 4,
}

export const CARD_TIER_OPTIONS: Array<{
  value: CardTier
  label: string
  desc: string
}> = [
  { value: "personal", label: TIER_LABEL.personal, desc: "免费 + 个人字段" },
  { value: "professional", label: TIER_LABEL.professional, desc: "再加专业字段" },
  { value: "business", label: TIER_LABEL.business, desc: "再加商业字段" },
  { value: "enterprise", label: TIER_LABEL.enterprise, desc: "开放全部字段" },
]

export const CARD_TIER_AVAILABLE: Record<CardTier, string> = {
  personal: "免费 / 个人",
  professional: "免费 / 个人 / 专业",
  business: "免费 / 个人 / 专业 / 商业",
  enterprise: "全部字段",
}

export const DEFAULT_CARD_TIER: CardTier = "professional"
export const DEFAULT_CARD_FIELDS = [
  "domain",
  "location",
  "asn_org",
  "os_server",
  "product",
  "cert",
  "jarm",
  "tls.version",
  "header",
  "banner",
  "lastupdatetime",
]

function fromColumn(
  key: string,
  group: CardFieldGroup,
  extra: Partial<Pick<CardFieldDef, "block" | "blockTag">> = {},
): CardFieldDef {
  const column = COLUMN_MAP[key]
  if (!column) throw new Error(`未知卡片字段：${key}`)
  return {
    key,
    label: column.label,
    tier: column.tier,
    group,
    fields: column.fields,
    render: column.render,
    mono: column.mono,
    ...extra,
  }
}

// 证书在卡片上展示为「持有者 CN · 颁发者 CN · 有效期」，底层取多个免费字段
const CERT_FIELD: CardFieldDef = {
  key: "cert",
  label: "证书",
  tier: "free",
  group: "网站",
  fields: ["cert.subject.cn", "cert.issuer.cn", "cert.not_before", "cert.not_after"],
  render: (row) => {
    const subject = row["cert.subject.cn"]?.trim()
    const issuer = row["cert.issuer.cn"]?.trim()
    const from = row["cert.not_before"]?.trim()
    const to = row["cert.not_after"]?.trim()
    const period = from && to ? `${from} ~ ${to}` : from || to || ""
    return [subject, issuer, period].filter(Boolean).join(" · ")
  },
}

const CARD_FIELD_LIST: CardFieldDef[] = [
  // 通用
  fromColumn("domain", "通用"),
  fromColumn("location", "通用"),
  fromColumn("os_server", "通用"),
  fromColumn("asn_org", "通用"),
  fromColumn("lastupdatetime", "通用"),
  // 网站
  fromColumn("header", "网站", { block: true, blockTag: "HEADER" }),
  fromColumn("body", "网站", { block: true, blockTag: "BODY" }),
  CERT_FIELD,
  fromColumn("jarm", "网站"),
  fromColumn("tls.version", "网站"),
  fromColumn("tls.ja3s", "网站"),
  fromColumn("header_hash", "网站"),
  fromColumn("cname", "网站"),
  // 协议
  fromColumn("banner", "协议", { block: true, blockTag: "BANNER" }),
  fromColumn("base_protocol", "协议"),
  fromColumn("product", "协议"),
  fromColumn("product_category", "协议"),
  fromColumn("product.version", "协议"),
  fromColumn("banner_hash", "协议"),
  fromColumn("structinfo", "协议"),
]

export const CARD_FIELD_MAP: Record<string, CardFieldDef> = Object.fromEntries(
  CARD_FIELD_LIST.map((field) => [field.key, field]),
)

export const CARD_FIELD_LIST_ALL = CARD_FIELD_LIST

export const CARD_FIELD_GROUPS: CardFieldGroup[] = ["通用", "网站", "协议"]

export function cardFieldsByGroup(group: CardFieldGroup): CardFieldDef[] {
  return CARD_FIELD_LIST.filter((field) => field.group === group)
}

export function isCardFieldSupported(field: CardFieldDef, tier: CardTier): boolean {
  return CARD_TIER_ORDER[field.tier] <= CARD_TIER_ORDER[tier]
}

export function supportedCardFields(tier: CardTier): CardFieldDef[] {
  return CARD_FIELD_LIST.filter((field) => isCardFieldSupported(field, tier))
}

export function isCardTier(value: unknown): value is CardTier {
  return (
    value === "personal" ||
    value === "professional" ||
    value === "business" ||
    value === "enterprise"
  )
}

export function normalizeCardSettings(value: unknown): CardSettings {
  const fallback: CardSettings = {
    tier: DEFAULT_CARD_TIER,
    fields: [...DEFAULT_CARD_FIELDS],
  }
  if (!value || typeof value !== "object") return fallback
  const raw = value as { tier?: unknown; fields?: unknown }
  const tier = isCardTier(raw.tier) ? raw.tier : DEFAULT_CARD_TIER
  const rawFields = Array.isArray(raw.fields)
    ? raw.fields.filter((key): key is string => typeof key === "string")
    : []
  const seen = new Set<string>()
  const fields = rawFields
    .filter((key) => {
      const def = CARD_FIELD_MAP[key]
      if (!def || !isCardFieldSupported(def, tier) || seen.has(key)) return false
      seen.add(key)
      return true
    })
    .slice(0, MAX_CARD_FIELDS)
  if (fields.length === 0) {
    const defaults = DEFAULT_CARD_FIELDS.filter((key) => {
      const def = CARD_FIELD_MAP[key]
      return def && isCardFieldSupported(def, tier)
    })
    return { tier, fields: defaults }
  }
  return { tier, fields }
}

export function cardFieldsToFOFAFields(fields: string[], tier: CardTier): string[] {
  const out: string[] = []
  const seen = new Set<string>()
  for (const key of fields) {
    const def = CARD_FIELD_MAP[key]
    if (!def || !isCardFieldSupported(def, tier)) continue
    for (const field of def.fields) {
      if (seen.has(field)) continue
      seen.add(field)
      out.push(field)
    }
  }
  return out
}

/** 合并多组 FOFA 字段并去重，返回逗号分隔字符串 */
export function unionFields(...groups: string[][]): string {
  const seen = new Set<string>()
  const out: string[] = []
  for (const group of groups) {
    for (const field of group) {
      const trimmed = field.trim()
      if (!trimmed || seen.has(trimmed)) continue
      seen.add(trimmed)
      out.push(trimmed)
    }
  }
  return out.join(",")
}

export function renderCardFieldValue(
  field: CardFieldDef,
  row: Record<string, string>,
): string {
  if (field.render) return field.render(row).trim()
  return (row[field.fields[0]] ?? "").trim()
}

export function isWebAsset(row: Record<string, string>): boolean {
  const protocol = (row.protocol ?? "").trim().toLowerCase()
  if (protocol === "http" || protocol === "https") return true
  return !protocol && Boolean((row.link ?? "").trim())
}

export function inferCardUrl(row: Record<string, string>): string {
  const link = (row.link ?? "").trim()
  if (link) return link
  if (!isWebAsset(row)) return ""
  const host = (row.host ?? "").trim() || (row.ip ?? "").trim()
  if (!host) return ""
  const scheme = (row.protocol ?? "").trim().toLowerCase() === "https" ? "https" : "http"
  return `${scheme}://${host}`
}

export function cardHostLabel(row: Record<string, string>): string {
  // v4：顶部只保留 host（FOFA host 常是域名/IP），没有 host 再回退 ip
  const host = (row.host ?? "").trim() || (row.ip ?? "").trim()
  const port = (row.port ?? "").trim()
  if (!host) return ""
  if (!port) return host
  // FOFA 的 host 本身可能已经带端口（如 103.41.136.115:9999），避免拼成 ip:port:port
  if (host.endsWith(`:${port}`) || /:\d+$/.test(host)) return host
  return `${host}:${port}`
}

/** 跳转 URL 直接用 host + 协议构造，不依赖 link 字段。 */
export function cardJumpUrl(row: Record<string, string>): string {
  if (!isWebAsset(row)) return ""
  const hostLabel = cardHostLabel(row)
  if (!hostLabel) return ""
  const scheme = (row.protocol ?? "").trim().toLowerCase() === "https" ? "https" : "http"
  return `${scheme}://${hostLabel}`
}

/** v4：无 title 直接显示 "-"，不用 domain/host/ip 替代。 */
export function cardTitle(row: Record<string, string>): string {
  return (row.title ?? "").trim() || "-"
}

export function cardStatusTone(code: string): "ok" | "warn" | "err" | "" {
  const value = code.trim()
  if (!value) return ""
  if (value.startsWith("2")) return "ok"
  if (value.startsWith("3")) return "warn"
  return "err"
}

const CARD_SETTINGS_STORAGE_KEY = "superfofa.query.cardSettings.v4"
const VIEW_MODE_STORAGE_KEY = "superfofa.query.viewMode"

export type QueryViewMode = "list" | "card"

export function loadCardSettings(): CardSettings {
  try {
    const raw = localStorage.getItem(CARD_SETTINGS_STORAGE_KEY)
    if (!raw) return normalizeCardSettings(null)
    return normalizeCardSettings(JSON.parse(raw))
  } catch {
    return normalizeCardSettings(null)
  }
}

export function saveCardSettings(settings: CardSettings) {
  try {
    localStorage.setItem(CARD_SETTINGS_STORAGE_KEY, JSON.stringify(settings))
  } catch {
    // localStorage 不可用时静默降级
  }
}

export function loadViewMode(): QueryViewMode {
  try {
    return localStorage.getItem(VIEW_MODE_STORAGE_KEY) === "card" ? "card" : "list"
  } catch {
    return "list"
  }
}

export function saveViewMode(mode: QueryViewMode) {
  try {
    localStorage.setItem(VIEW_MODE_STORAGE_KEY, mode)
  } catch {
    // localStorage 不可用时静默降级
  }
}
