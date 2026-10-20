import * as React from "react"
import { RefreshCwIcon, SlidersHorizontalIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { formatInteger } from "./stats-format"
import { STATS_SIZE_OPTIONS, getStatsField, type StatsFieldKey, type StatsSize } from "./stats-fields"
import { StatsFieldPickerDialog } from "./stats-field-picker-dialog"

export type StatsToolbarProps = {
  fields: StatsFieldKey[]
  size: StatsSize
  total?: number
  elapsedMs?: number
  lastUpdateTime?: string
  loading?: boolean
  onFieldsChange: (fields: StatsFieldKey[]) => void
  onSizeChange: (size: StatsSize) => void
  onRefresh: () => void
}

function formatElapsed(elapsedMs?: number): string {
  if (!Number.isFinite(elapsedMs)) return "--"
  if ((elapsedMs ?? 0) >= 1000) return `${((elapsedMs ?? 0) / 1000).toFixed(2)}s`
  return `${Math.max(0, Math.round(elapsedMs ?? 0))}ms`
}

export function StatsToolbar({
  fields,
  size,
  total,
  elapsedMs,
  lastUpdateTime,
  loading = false,
  onFieldsChange,
  onSizeChange,
  onRefresh,
}: StatsToolbarProps) {
  const [pickerOpen, setPickerOpen] = React.useState(false)
  const fieldSummary = fields.map((field) => getStatsField(field).label).join("、") || "未选择字段"

  return (
    <div className="flex flex-col gap-3 rounded-xl border bg-card p-3 text-sm sm:flex-row sm:items-center sm:justify-between">
      <div className="grid gap-1 text-muted-foreground sm:grid-cols-2 lg:grid-cols-4">
        <span>
          Top <strong className="font-medium text-foreground">{size}</strong>
        </span>
        <span>
          耗时 <strong className="font-medium text-foreground">{formatElapsed(elapsedMs)}</strong>
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="outline" onClick={() => setPickerOpen(true)} title={fieldSummary}>
          <SlidersHorizontalIcon />
          字段 {fields.length}
        </Button>
        <Select
          value={String(size)}
          onValueChange={(value) => onSizeChange(Number(value) as StatsSize)}
          disabled={loading}
        >
          <SelectTrigger className="w-28" aria-label="选择 TopN">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATS_SIZE_OPTIONS.map((option) => (
              <SelectItem key={option} value={String(option)}>
                Top {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button type="button" variant="outline" onClick={onRefresh} disabled={loading}>
          <RefreshCwIcon className={loading ? "animate-spin" : undefined} />
          刷新
        </Button>
      </div>

      <StatsFieldPickerDialog
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        selectedKeys={fields}
        onApply={onFieldsChange}
      />
    </div>
  )
}
