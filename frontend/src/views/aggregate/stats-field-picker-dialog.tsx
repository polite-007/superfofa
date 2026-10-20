import * as React from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DEFAULT_STATS_FIELDS,
  MAX_STATS_FIELDS,
  STATS_FIELD_GROUPS,
  STATS_FIELDS,
  type StatsFieldKey,
} from "./stats-fields"

export type StatsFieldPickerDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedKeys: StatsFieldKey[]
  onApply: (keys: StatsFieldKey[]) => void
}

export function StatsFieldPickerDialog({
  open,
  onOpenChange,
  selectedKeys,
  onApply,
}: StatsFieldPickerDialogProps) {
  const [draftKeys, setDraftKeys] = React.useState<StatsFieldKey[]>(selectedKeys)

  React.useEffect(() => {
    if (open) {
      setDraftKeys(selectedKeys)
    }
  }, [open, selectedKeys])

  const selectedSet = React.useMemo(() => new Set(draftKeys), [draftKeys])
  const isAtMax = draftKeys.length >= MAX_STATS_FIELDS

  const toggleField = (key: StatsFieldKey, checked: boolean) => {
    setDraftKeys((current) => {
      const exists = current.includes(key)
      if (checked) {
        if (exists || current.length >= MAX_STATS_FIELDS) return current
        return [...current, key]
      }
      return current.filter((currentKey) => currentKey !== key)
    })
  }

  const handleRestoreDefault = () => {
    setDraftKeys([...DEFAULT_STATS_FIELDS])
  }

  const handleCancel = () => {
    setDraftKeys(selectedKeys)
    onOpenChange(false)
  }

  const handleApply = () => {
    onApply(draftKeys)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>选择统计字段</DialogTitle>
          <DialogDescription>
            最多选择 {MAX_STATS_FIELDS} 个字段，统计卡片会按勾选顺序展示。
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[60vh] space-y-4 overflow-y-auto pr-1">
          {STATS_FIELD_GROUPS.map((group) => {
            const fields = STATS_FIELDS.filter((field) => field.group === group)

            return (
              <section key={group} className="space-y-2">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-medium">{group}</h3>
                  <Badge variant="secondary" className="text-xs">
                    {fields.length}
                  </Badge>
                </div>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {fields.map((field) => {
                    const checked = selectedSet.has(field.key)
                    const disabled = !checked && isAtMax

                    return (
                      <label
                        key={field.key}
                        className="group/field flex cursor-pointer items-start gap-2 rounded-lg border bg-background p-3 text-sm transition-colors hover:bg-muted/50 has-disabled:cursor-not-allowed has-disabled:opacity-60"
                      >
                        <Checkbox
                          checked={checked}
                          disabled={disabled}
                          onCheckedChange={(value) => toggleField(field.key, value === true)}
                          aria-label={`选择${field.label}`}
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block font-medium leading-none">{field.label}</span>
                          <span className="mt-1 block truncate text-xs text-muted-foreground">{field.key}</span>
                        </span>
                      </label>
                    )
                  })}
                </div>
              </section>
            )
          })}
        </div>

        <DialogFooter className="items-center sm:justify-between">
          <div className="text-xs text-muted-foreground">
            已选择 {draftKeys.length}/{MAX_STATS_FIELDS}
            {isAtMax && <span>，已达上限</span>}
          </div>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="ghost" onClick={handleRestoreDefault}>
              恢复默认
            </Button>
            <Button type="button" variant="outline" onClick={handleCancel}>
              取消
            </Button>
            <Button type="button" onClick={handleApply} disabled={draftKeys.length === 0}>
              应用
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
