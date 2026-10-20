import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

type PrecheckPreview = {
  totalLines: number
  validItems: number
  duplicateItems: number
  invalidItems: number
  invalidExamples: string[]
  estimatedTotal: number
}

export function PrecheckConfirmDialog({
  open,
  onOpenChange,
  preview,
  submitting,
  onConfirm,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  preview: PrecheckPreview | null
  submitting: boolean
  onConfirm: () => void
}) {
  if (!preview) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>确认创建导出任务</DialogTitle>
          <DialogDescription>已完成任务预检。确认后将仅使用有效且去重后的条目创建导出任务。</DialogDescription>
        </DialogHeader>

        <div className="space-y-3 rounded-md border border-border p-3 text-sm">
          <div className="grid gap-2 md:grid-cols-2">
            <div>总行数：{preview.totalLines}</div>
            <div>有效条目：{preview.validItems}</div>
            <div>重复条目：{preview.duplicateItems}</div>
            <div>无效条目：{preview.invalidItems}</div>
          </div>
          {preview.estimatedTotal > 0 && (
            <div className="rounded bg-muted/50 px-2 py-1.5 text-sm">
              预计下载数量：<strong className="font-medium text-foreground">{preview.estimatedTotal.toLocaleString()}</strong> 条
              <span className="ml-2 text-xs text-muted-foreground">（来自查询页结果总数）</span>
            </div>
          )}
          {(preview.duplicateItems > 0 || preview.invalidItems > 0) && (
            <p className="text-xs text-muted-foreground">
              重复条目和无效条目不会下发，实际创建任务数为 {preview.validItems} 条。
            </p>
          )}
          {preview.invalidExamples.length > 0 && (
            <div className="text-xs text-muted-foreground">无效示例：{preview.invalidExamples.join("、")}</div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={submitting}>
            取消
          </Button>
          <Button onClick={onConfirm} disabled={submitting}>
            {submitting ? "创建中..." : "确认创建"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
