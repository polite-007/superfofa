import { useState } from "react"
import { Columns3, Download, LayoutGrid, List, RotateCw, Settings2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { FieldPickerDialog } from "./field-picker-dialog"
import { detectPresetLabel, keysToColumns, type ColumnDef } from "./columns"
import type { QueryViewMode } from "./card-fields"

const SIZE_OPTIONS = [10, 20, 30, 50]

export function ResultToolbar({
  columns,
  size,
  page,
  total,
  returned,
  elapsedMs,
  accountEmail,
  loading,
  viewMode,
  onViewModeChange,
  onOpenCardSettings,
  onColumnsChange,
  onSizeChange,
  onRefresh,
  onOpenStats,
  onExport,
  onOpenExportHistory,
}: {
  columns: ColumnDef[]
  size: number
  page: number
  total: number
  returned: number
  elapsedMs: number
  accountEmail: string
  loading: boolean
  viewMode: QueryViewMode
  onViewModeChange: (mode: QueryViewMode) => void
  onOpenCardSettings: () => void
  onColumnsChange: (cols: ColumnDef[]) => void
  onSizeChange: (s: number) => void
  onRefresh: () => void
  onOpenStats: () => void
  onExport: () => void
  onOpenExportHistory: () => void
}) {
  const [pickerOpen, setPickerOpen] = useState(false)
  const presetLabel = detectPresetLabel(columns)

  return (
    <>
      <div className="flex min-w-0 shrink-0 flex-col gap-1.5 border-b border-border px-3 py-2 md:flex-row md:items-center md:justify-between md:gap-3">
        {/* 结果信息条：小屏独占整行，大屏靠左 */}
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
          <span>
            共 <span className="font-medium text-foreground">{total}</span> 条
          </span>
          <span>
            第 <span className="font-medium text-foreground">{page}</span> 页
          </span>
          <span>
            本页 <span className="font-medium text-foreground">{returned}</span> 条
          </span>
          <span>
            用时 <span className="font-medium text-foreground">{elapsedMs}</span> ms
          </span>
        </div>

        {/* 工具按钮：小屏独占整行，大屏靠右，空间不足时内部换行 */}
        <div className="flex min-w-0 max-w-full flex-wrap items-center justify-end gap-1.5">
          <div className="inline-flex items-center gap-0.5 rounded-lg bg-muted p-0.5">
            <button
              type="button"
              aria-pressed={viewMode === "list"}
              onClick={() => onViewModeChange("list")}
              className={cn(
                "inline-flex h-6 items-center gap-1 rounded-[7px] px-2 text-[11px] transition-colors",
                viewMode === "list"
                  ? "bg-background font-medium text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <List className="size-3" />
              列表
            </button>
            <button
              type="button"
              aria-pressed={viewMode === "card"}
              onClick={() => onViewModeChange("card")}
              className={cn(
                "inline-flex h-6 items-center gap-1 rounded-[7px] px-2 text-[11px] transition-colors",
                viewMode === "card"
                  ? "bg-background font-medium text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <LayoutGrid className="size-3" />
              卡片
            </button>
          </div>

          {viewMode === "card" ? (
            <Button variant="outline" size="sm" onClick={onOpenCardSettings}>
              <Settings2 className="size-3.5" />
              卡片设置
            </Button>
          ) : (
            <Button variant="outline" size="sm" onClick={() => setPickerOpen(true)}>
              <Columns3 className="size-3.5" />
              字段 · {presetLabel} · {columns.length} 列
            </Button>
          )}

          <Select value={String(size)} onValueChange={(v) => onSizeChange(Number(v))}>
            <SelectTrigger size="sm" className="w-[110px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent position="popper" align="end" sideOffset={4}>
              {SIZE_OPTIONS.map((s) => (
                <SelectItem key={s} value={String(s)}>
                  每页 {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="sm"
            onClick={onExport}
            disabled={loading}
          >
            <Download className="size-3.5" />
            导出
          </Button>

          <Button variant="ghost" size="sm" onClick={onOpenExportHistory}>
            导出记录
          </Button>

          <Button
            variant="outline"
            size="icon-sm"
            title="刷新"
            onClick={onRefresh}
            disabled={loading}
          >
            <RotateCw className={loading ? "size-3.5 animate-spin" : "size-3.5"} />
          </Button>
        </div>
      </div>

      <FieldPickerDialog
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        selectedKeys={columns.map((c) => c.key)}
        onApply={(keys) => onColumnsChange(keysToColumns(keys))}
      />
    </>
  )
}
