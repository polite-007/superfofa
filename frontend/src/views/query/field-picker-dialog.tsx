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
} from "./columns"

// 字段选择弹窗：勾的是"列"，应用后由列并集出 FOFA Fields
export function FieldPickerDialog({
  open,
  onOpenChange,
  selectedKeys,
  onApply,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  selectedKeys: string[]
  onApply: (keys: string[]) => void
}) {
  // 选中列 key 数组（保留勾选顺序，决定表格列顺序）
  const [picked, setPicked] = useState<string[]>(selectedKeys)

  useEffect(() => {
    if (open) setPicked(selectedKeys)
  }, [open, selectedKeys])

  function toggle(key: string) {
    setPicked((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    )
  }

  function applyPreset(presetKey: string) {
    const p = PRESETS.find((x) => x.key === presetKey)
    if (!p) return
    setPicked(p.columns.map((c) => c.key))
  }

  function resetDefault() {
    const p = PRESETS.find((x) => x.key === DEFAULT_PRESET_KEY)
    setPicked(p ? p.columns.map((c) => c.key) : CATALOG.slice(0, 1).map((c) => c.key))
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
          <DialogTitle>字段选择</DialogTitle>
          <DialogDescription>
            勾选要展示的列，多列组合由后端 FOFA Fields 并集返回。付费列需对应等级账号，越权时 FOFA 会报错。
          </DialogDescription>
        </DialogHeader>

        {/* 预设 */}
        <div className="flex flex-wrap items-center gap-2 py-1">
          <span className="text-xs font-medium text-muted-foreground">预设：</span>
          {PRESETS.map((p) => (
            <Button
              key={p.key}
              variant="outline"
              size="sm"
              onClick={() => applyPreset(p.key)}
            >
              {p.label}
              <span className="text-muted-foreground">· {p.columns.length} 列</span>
            </Button>
          ))}
        </div>

        {/* 分组列勾选 */}
        <div className="flex flex-col gap-4 py-1">
          {FIELD_GROUPS.map((g) => (
            <div key={g.title} className="flex flex-col gap-2">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {g.title}
              </h4>
              <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                {g.columns.map((c) => {
                  const checked = picked.includes(c.key)
                  return (
                    <label
                      key={c.key}
                      className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-muted/60"
                    >
                      <Checkbox checked={checked} onCheckedChange={() => toggle(c.key)} />
                      <span className="flex-1 truncate">{c.label}</span>
                      <Badge
                        variant="outline"
                        className={`shrink-0 border-transparent text-[10px] ${TIER_TONE[c.tier]}`}
                      >
                        {TIER_LABEL[c.tier]}
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
