import { useEffect, useState } from "react"
import { Minus, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { ExportTimeRange } from "./types"

const MONTH_MIN = 1
const MONTH_MAX = 24
const MONTH_DEFAULT = 12

type TimeRangeMode = "none" | "months" | "custom"

function clampMonthCount(value: number) {
  if (!Number.isFinite(value)) return MONTH_DEFAULT
  return Math.min(MONTH_MAX, Math.max(MONTH_MIN, Math.trunc(value)))
}

function getMonthCount(preset: string) {
  const match = /^month-(\d+)$/.exec(preset)
  if (!match) return null
  return clampMonthCount(Number(match[1]))
}

function toMonthPreset(months: number) {
  return `month-${clampMonthCount(months)}`
}

function getMode(value: ExportTimeRange): TimeRangeMode {
  if (value.preset === "custom") return "custom"
  if (getMonthCount(value.preset)) return "months"
  return "none"
}

export function TimeRangePicker({
  value,
  onChange,
}: {
  value: ExportTimeRange
  onChange: (value: ExportTimeRange) => void
}) {
  const mode = getMode(value)
  const monthCount = getMonthCount(value.preset) ?? MONTH_DEFAULT
  const [monthInput, setMonthInput] = useState(String(monthCount))
  const isCustom = mode === "custom"
  const isMonths = mode === "months"

  useEffect(() => {
    if (isMonths) {
      setMonthInput(String(monthCount))
    }
  }, [isMonths, monthCount])

  const updateMonthCount = (next: number) => {
    const normalized = clampMonthCount(next)
    setMonthInput(String(normalized))
    onChange({ preset: toMonthPreset(normalized), start: "", end: "" })
  }

  const handleMonthInputBlur = () => {
    if (monthInput.trim() === "") {
      updateMonthCount(MONTH_DEFAULT)
      return
    }
    updateMonthCount(Number(monthInput))
  }

  return (
    <div className="space-y-2">
      <Label>时间范围</Label>
      <Select
        value={mode}
        onValueChange={(next) => {
          if (next === "custom") {
            onChange({ ...value, preset: "custom" })
            return
          }
          if (next === "months") {
            updateMonthCount(monthCount)
            return
          }
          onChange({ preset: "", start: "", end: "" })
        }}
      >
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent position="popper" align="start" sideOffset={4}>
          <SelectItem value="none">默认一年内</SelectItem>
          <SelectItem value="months">最近 N 个月</SelectItem>
          <SelectItem value="custom">自定义</SelectItem>
        </SelectContent>
      </Select>

      {isMonths && (
        <div className="flex flex-wrap items-center gap-2 rounded-md border border-border px-3 py-2">
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            onClick={() => updateMonthCount(monthCount - 1)}
            disabled={monthCount <= MONTH_MIN}
            title="减少月份"
          >
            <Minus className="size-3.5" />
          </Button>
          <Input
            type="number"
            min={MONTH_MIN}
            max={MONTH_MAX}
            value={monthInput}
            onChange={(event) => setMonthInput(event.target.value)}
            onBlur={handleMonthInputBlur}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.currentTarget.blur()
              }
            }}
            className="w-20 text-center"
          />
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            onClick={() => updateMonthCount(monthCount + 1)}
            disabled={monthCount >= MONTH_MAX}
            title="增加月份"
          >
            <Plus className="size-3.5" />
          </Button>
          <span className="text-sm text-muted-foreground">个月</span>
          <span className="text-xs text-muted-foreground">支持 {MONTH_MIN}-{MONTH_MAX} 个月，默认 {MONTH_DEFAULT} 个月</span>
        </div>
      )}

      {isCustom && (
        <div className="grid gap-4 md:grid-cols-2">
          <Input
            type="date"
            value={value.start}
            onChange={(event) => onChange({ ...value, preset: "custom", start: event.target.value })}
          />
          <Input
            type="date"
            value={value.end}
            onChange={(event) => onChange({ ...value, preset: "custom", end: event.target.value })}
          />
        </div>
      )}
      <p className="text-xs text-muted-foreground">默认导出最近一年内数据；也可选择最近 N 个月，或按日自定义范围。</p>
    </div>
  )
}
