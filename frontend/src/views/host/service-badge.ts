// 协议/端口按服务类型上色的配置（与 result-table 的 SERVICE_BADGES 同源，host 页独立维护一份）

export type ServiceBadge = {
  tokens: string[]
  label: string
  className: string
}

export const SERVICE_BADGES: ServiceBadge[] = [
  { tokens: ["redis"], label: "R", className: "border-red-500/30 bg-red-500/10 text-red-500" },
  { tokens: ["mysql"], label: "My", className: "border-sky-500/30 bg-sky-500/10 text-sky-500" },
  { tokens: ["postgres", "postgresql"], label: "Pg", className: "border-blue-500/30 bg-blue-500/10 text-blue-500" },
  { tokens: ["mongodb", "mongo"], label: "Mg", className: "border-emerald-500/30 bg-emerald-500/10 text-emerald-500" },
  { tokens: ["elastic", "elasticsearch"], label: "Es", className: "border-amber-500/30 bg-amber-500/10 text-amber-500" },
  { tokens: ["nginx"], label: "Ng", className: "border-green-500/30 bg-green-500/10 text-green-500" },
  { tokens: ["apache"], label: "Ap", className: "border-orange-500/30 bg-orange-500/10 text-orange-500" },
  { tokens: ["https"], label: "HTTPS", className: "border-emerald-500/30 bg-emerald-500/10 text-emerald-500" },
  { tokens: ["http"], label: "HTTP", className: "border-sky-500/30 bg-sky-500/10 text-sky-500" },
  { tokens: ["ssh"], label: "SSH", className: "border-violet-500/30 bg-violet-500/10 text-violet-500" },
  { tokens: ["ftp"], label: "FTP", className: "border-cyan-500/30 bg-cyan-500/10 text-cyan-500" },
  { tokens: ["smtp"], label: "SMTP", className: "border-rose-500/30 bg-rose-500/10 text-rose-500" },
  { tokens: ["sip"], label: "SIP", className: "border-fuchsia-500/30 bg-fuchsia-500/10 text-fuchsia-500" },
  { tokens: ["rdp"], label: "RDP", className: "border-orange-500/30 bg-orange-500/10 text-orange-500" },
  { tokens: ["telnet"], label: "TEL", className: "border-yellow-500/30 bg-yellow-500/10 text-yellow-500" },
]

export function serviceBadgeFor(value: string): ServiceBadge | undefined {
  const lower = value.toLowerCase()
  return SERVICE_BADGES.find((b) => b.tokens.some((t) => lower.includes(t)))
}
