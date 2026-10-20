import { useState, type Dispatch, type SetStateAction } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { keysToColumns } from "@/views/query/columns"
import type { ExportDraftForm } from "./types"
import { TaskNameInput } from "./task-name-input"
import { InputSourceSelector } from "./input-source-selector"
import { InputEditor } from "./input-editor"
import { TimeRangePicker } from "./time-range-picker"
import { ExportFieldPickerDialog } from "./export-field-picker-dialog"
import { PrecheckConfirmDialog } from "./precheck-confirm-dialog"

function columnKeysToExportFields(keys: string[]) {
  return keysToColumns(keys).flatMap((column) =>
    column.fields.map((field) => ({
      key: `${column.key}:${field}`,
      label: column.label,
      fofa_field: field,
    })),
  )
}

export function NewExportTab({
  draft,
  setDraft,
  fieldCount,
  precheckPreview,
  precheckDialogOpen,
  setPrecheckDialogOpen,
  submitting,
  onRequestCreateTask,
  onConfirmCreateTask,
}: {
  draft: ExportDraftForm
  setDraft: Dispatch<SetStateAction<ExportDraftForm>>
  fieldCount: number
  precheckPreview: { totalLines: number; validItems: number; duplicateItems: number; invalidItems: number; invalidExamples: string[]; estimatedTotal: number } | null
  precheckDialogOpen: boolean
  setPrecheckDialogOpen: (open: boolean) => void
  submitting: boolean
  onRequestCreateTask: () => Promise<void>
  onConfirmCreateTask: () => Promise<void>
}) {
  const [fieldPickerOpen, setFieldPickerOpen] = useState(false)
  const patch = (next: Partial<ExportDraftForm>) => {
    setDraft((prev) => ({ ...prev, ...next }))
  }

  return (
    <Card className="flex h-full min-h-0 flex-col">
      <CardHeader className="shrink-0">
        <CardTitle>新建导出</CardTitle>
        <CardDescription>创建批量导出任务，当前已选择 {fieldCount} 个导出字段。</CardDescription>
      </CardHeader>
      <CardContent className="min-h-0 flex-1 space-y-4 overflow-auto">
        <TaskNameInput value={draft.taskName} onChange={(taskName) => patch({ taskName })} />
        <InputSourceSelector draft={draft} onChange={patch} />
        <InputEditor draft={draft} onChange={patch} />
        <TimeRangePicker value={draft.timeRange} onChange={(timeRange) => patch({ timeRange })} />
        <div className="flex items-center justify-between rounded-md border border-border px-3 py-2">
          <div>
            <p className="text-sm font-medium">导出字段</p>
            <p className="text-xs text-muted-foreground">当前已选择 {fieldCount} 个字段</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => setFieldPickerOpen(true)}>
            选择字段
          </Button>
        </div>
        <ExportFieldPickerDialog
          open={fieldPickerOpen}
          onOpenChange={setFieldPickerOpen}
          selectedKeys={draft.fieldColumnKeys}
          onApply={(fieldColumnKeys) => patch({ fieldColumnKeys, fields: columnKeysToExportFields(fieldColumnKeys) })}
        />
        <PrecheckConfirmDialog
          open={precheckDialogOpen}
          onOpenChange={setPrecheckDialogOpen}
          preview={precheckPreview}
          submitting={submitting}
          onConfirm={() => void onConfirmCreateTask()}
        />
        <div className="flex items-center justify-end gap-2">
          <Button onClick={() => void onRequestCreateTask()} disabled={submitting}>
            {submitting ? "检查中..." : "创建任务"}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
