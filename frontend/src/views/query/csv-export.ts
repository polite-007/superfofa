import { ColumnDef, renderCell } from "./columns"

type Row = Record<string, string>

// CSV 转义：含 , " \n 时用双引号包裹，内部 " 转 ""
function esc(v: string): string {
  if (v == null) return ""
  if (/[",\n\r]/.test(v)) {
    return `"${v.replace(/"/g, '""')}"`
  }
  return v
}

// 拼装并下载当前页 CSV
// 文件名：fofa-<query>-<page>-<ts>.csv
export function exportCsv(columns: ColumnDef[], rows: Row[], query: string, page: number) {
  const header = columns.map((c) => esc(c.label)).join(",")
  const body = rows
    .map((r) => columns.map((c) => esc(renderCell(c, r))).join(","))
    .join("\n")
  // UTF-8 BOM，避免 Excel 中文乱码
  const content = `\ufeff${header}\n${body}`

  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  const safeQuery = (query || "query").replace(/[\\/:*?"<>|]/g, "_").slice(0, 40)
  a.download = `fofa-${safeQuery}-${page}-${Date.now()}.csv`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
