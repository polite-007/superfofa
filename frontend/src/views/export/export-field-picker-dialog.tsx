import { useEffect, useState } from "react"
import { Check } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import {
  CATALOG,
  DEFAULT_PRESET_KEY,
  FIELD_GROUPS,
  PRESETS,
  TIER_LABEL,
  TIER_TONE,
} from "@/views/query/columns"

export function ExportFieldPickerDialog({
  open,
  onOpenChange,
  selectedKeys,
  onApply,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedKeys: string[]
  onApply: (keys: string[]) => void
}) {
  const [picked, setPicked] = useState<string[]>(selectedKeys)

  useEffect(() => {
    if (open) setPicked(selectedKeys)
  }, [open, selectedKeys])

  function toggle(key: string) {
    setPicked((prev) =>
      prev.includes(key) ? prev.filter((item) => item !== key) : [...prev, key],
    )
  }

  function applyPreset(presetKey: string) {
    const preset = PRESETS.find((item) => item.key === presetKey)
    if (!preset) return
    setPicked(preset.columns.map((column) => column.key))
  }

  function resetDefault() {
    const preset = PRESETS.find((item) => item.key === DEFAULT_PRESET_KEY)
    setPicked(preset ? preset.columns.map((column) => column.key) : CATALOG.slice(0, 1).map((column) => column.key))
  }

  const canApply = picked.length >= 1

  function handleApply() {
    if (!canApply) return
    onApply(picked)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>导出字段</DialogTitle>
          <DialogDescription>
            勾选要导出的列，组合列会展开为对应 FOFA Fields。付费列需对应等级账号，越权时 FOFA 会报错。
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap items-center gap-2 py-1">
          <span className="text-xs font-medium text-muted-foreground">预设：</span>
          {PRESETS.map((preset) => (
            <Button
              key={preset.key}
              variant="outline"
              size="sm"
              onClick={() => applyPreset(preset.key)}
            >
              {preset.label}
              <span className="text-muted-foreground">· {preset.columns.length} 列</span>
            </Button>
          ))}
        </div>

        <div className="flex flex-col gap-4 py-1">
          {FIELD_GROUPS.map((group) => (
            <div key={group.title} className="flex flex-col gap-2">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {group.title}
              </h4>
              <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                {group.columns.map((column) => {
                  const checked = picked.includes(column.key)
                  return (
                    <label
                      key={column.key}
                      className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-muted/60"
                    >
                      <Checkbox checked={checked} onCheckedChange={() => toggle(column.key)} />
                      <span className="flex-1 truncate">{column.label}</span>
                      <Badge
                        variant="outline"
                        className={`shrink-0 border-transparent text-[10px] ${TIER_TONE[column.tier]}`}
                      >
                        {TIER_LABEL[column.tier]}
                      </Badge>
                    </label>
                  )
                })}
              </div>
            </div>
          ))}
        </div>

        <DialogFooter className="gap-2">
          <span className="mr-auto text-xs text-muted-foreground">
            已选 <span className="font-medium text-foreground">{picked.length}</span> 列
          </span>
          <Button variant="ghost" size="sm" onClick={resetDefault}>
            恢复默认
          </Button>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button size="sm" disabled={!canApply} onClick={handleApply}>
            <Check className="size-3.5" />
            应用
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
