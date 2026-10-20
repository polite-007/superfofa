export function formatInteger(value: number | undefined | null): string {
  return new Intl.NumberFormat("zh-CN").format(value ?? 0)
}

export function formatPercent(count: number, total: number): string | null {
  if (!Number.isFinite(total) || total <= 0) return null
  if (!Number.isFinite(count) || count <= 0) return "0%"
  const percent = (count / total) * 100
  if (percent > 0 && percent < 1) return "<1%"
  return `${percent.toFixed(1)}%`
}

export function percentWidth(count: number, total: number): number {
  if (!Number.isFinite(total) || total <= 0) return 0
  if (!Number.isFinite(count) || count <= 0) return 0
  return Math.max(0, Math.min(100, (count / total) * 100))
}

export function displayAggName(value: string): string {
  return value === "" ? "（空）" : value
}
