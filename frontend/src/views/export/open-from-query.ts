import type { ColumnDef } from "@/views/query/columns"

export const EXPORT_QUERY_DRAFT_KEY = "superfofa.export.queryDraft"

export type ExportQueryDraft = {
  query: string
  columnKeys: string[]
  total: number
}

export function saveExportQueryDraft(query: string, columns: ColumnDef[], total: number) {
  const payload: ExportQueryDraft = {
    query,
    columnKeys: columns.map((column) => column.key),
    total,
  }
  localStorage.setItem(EXPORT_QUERY_DRAFT_KEY, JSON.stringify(payload))
}

export function consumeExportQueryDraft(): ExportQueryDraft | null {
  const raw = localStorage.getItem(EXPORT_QUERY_DRAFT_KEY)
  if (!raw) return null
  localStorage.removeItem(EXPORT_QUERY_DRAFT_KEY)
  try {
    return JSON.parse(raw) as ExportQueryDraft
  } catch {
    return null
  }
}
