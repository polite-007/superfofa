export type StatsFieldKey =
  | "protocol"
  | "domain"
  | "port"
  | "title"
  | "os"
  | "server"
  | "country"
  | "asn"
  | "org"
  | "asset_type"
  | "fid"
  | "icp"

export type StatsSize = 10 | 50 | 100 | 500

export type StatsFieldDef = {
  key: StatsFieldKey
  label: string
  group: "基础" | "系统/服务" | "组织/归属" | "端口"
}

export const MAX_STATS_FIELDS = 5

export const STATS_SIZE_OPTIONS: StatsSize[] = [10, 50, 100, 500]

export const DEFAULT_STATS_FIELDS: StatsFieldKey[] = [
  "protocol",
  "title",
  "domain",
  "country",
]

export const STATS_FIELDS: StatsFieldDef[] = [
  { key: "protocol", label: "协议", group: "基础" },
  { key: "domain", label: "域名", group: "基础" },
  { key: "title", label: "标题", group: "基础" },
  { key: "asset_type", label: "资产类型", group: "基础" },
  { key: "os", label: "操作系统", group: "系统/服务" },
  { key: "server", label: "HTTP Server", group: "系统/服务" },
  { key: "fid", label: "FID", group: "系统/服务" },
  { key: "country", label: "国家/地区", group: "组织/归属" },
  { key: "asn", label: "ASN", group: "组织/归属" },
  { key: "org", label: "组织", group: "组织/归属" },
  { key: "icp", label: "ICP备案", group: "组织/归属" },
  { key: "port", label: "端口", group: "端口" },
]

export const STATS_FIELD_GROUPS = ["基础", "系统/服务", "组织/归属", "端口"] as const

export function getStatsField(key: string): StatsFieldDef {
  return STATS_FIELDS.find((field) => field.key === key) ?? { key: key as StatsFieldKey, label: key, group: "基础" }
}

export function statsFieldsToParam(fields: StatsFieldKey[]): string {
  return fields.join(",")
}

export function isStatsSize(value: number): value is StatsSize {
  return value === 10 || value === 50 || value === 100 || value === 500
}
