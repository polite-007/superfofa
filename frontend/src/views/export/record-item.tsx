import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import type { ExportTask } from "./types"

function statusLabel(status: ExportTask["status"]) {
  switch (status) {
    case "pending":
      return "等待中"
    case "running":
      return "执行中"
    case "paused":
      return "已暂停"
    case "failed":
      return "失败"
    case "completed":
      return "已完成"
    default:
      return status
  }
}

function timeRangeLabel(task: ExportTask) {
  const range = task.time_range
  if (!range) return "-"
  if (range.start || range.end) return `${range.start || "-"} ~ ${range.end || "-"}`
  if (range.preset === "custom") return "自定义"
  const monthMatch = /^month-(\d+)$/.exec(range.preset || "")
  if (monthMatch) return `最近 ${monthMatch[1]} 个月`
  return "默认一年内"
}

function formatBeijingTime(value: string) {
  if (!value) return "-"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  const parts = new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(date)
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value ?? ""
  return `${part("year")}-${part("month")}-${part("day")} ${part("hour")}:${part("minute")}:${part("second")}`
}

export function RecordItem({
  task,
  onDelete,
  onContinue,
  onClone,
}: {
  task: ExportTask
  onDelete: (taskId: string) => Promise<void>
  onContinue: (taskId: string) => Promise<void>
  onClone: (taskId: string) => Promise<void>
}) {
  return (
    <AccordionItem value={task.id} className="rounded-lg border border-border px-4">
      <AccordionTrigger className="py-3 hover:no-underline">
        <div className="flex min-w-0 flex-1 flex-col text-left">
          <div className="flex items-center justify-between gap-3">
            <span className="truncate text-sm font-medium">{task.name}</span>
            <Badge variant={task.status === "failed" ? "destructive" : "outline"}>{statusLabel(task.status)}</Badge>
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            来源：{task.source} · 类型：{task.input_type} · 进度：{task.completed_items}/{task.total_items} · 创建于：{formatBeijingTime(task.created_at)}
          </div>
        </div>
      </AccordionTrigger>
      <AccordionContent className="space-y-3 pb-3 text-sm">
        <div className="space-y-2 rounded-md border border-border bg-muted/30 p-3">
          <div className="text-xs font-medium text-muted-foreground">任务输入（预检内容）</div>
          <div className="text-xs">
            <span className="text-muted-foreground">输入文本：</span>
            <div className="mt-1 line-clamp-3 whitespace-pre-wrap break-all rounded bg-background px-2 py-1.5 font-mono text-[11px] leading-relaxed">
              {task.query_text || task.raw_input || "-"}
            </div>
          </div>
          {task.source === "file" && task.source_file_name && (
            <div className="text-xs">
              <span className="text-muted-foreground">来源文件：</span>
              <span className="ml-1">{task.source_file_name}</span>
            </div>
          )}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs text-muted-foreground">字段（{(task.fields ?? []).length}）：</span>
            {(task.fields ?? []).length === 0 ? (
              <span className="text-xs text-muted-foreground">-</span>
            ) : (
              (task.fields ?? []).map((f) => (
                <Badge key={f.key} variant="outline" className="text-[10px]">{f.label}</Badge>
              ))
            )}
          </div>
        </div>
        <div>时间范围：{timeRangeLabel(task)}</div>
        <div>当前执行：第 {task.current_item_index || 0} 项，第 {task.current_item_page || 0} 页</div>
        <div>累计导出：{task.exported_rows || 0}</div>
        <div>原因：{task.message || "-"}</div>
        <div>文件路径：{task.output_path || "-"}</div>
        <div className="flex flex-wrap gap-2">
          {task.status === "paused" && <Button variant="outline" size="sm" onClick={() => void onContinue(task.id)}>继续</Button>}
          {task.status === "failed" && (
            <Button variant="outline" size="sm" onClick={() => window.dispatchEvent(new CustomEvent("superfofa:open-config"))}>
              前往配置
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => void onClone(task.id)}>复制为新任务</Button>
          <Button variant="outline" size="sm" onClick={() => void onDelete(task.id)}>删除记录</Button>
        </div>
      </AccordionContent>
    </AccordionItem>
  )
}
