import { Accordion } from "@/components/ui/accordion"
import type { ExportTask } from "./types"
import { RecordItem } from "./record-item"

export function RecordList({
  tasks,
  onDelete,
  onContinue,
  onClone,
}: {
  tasks: ExportTask[]
  onDelete: (taskId: string) => Promise<void>
  onContinue: (taskId: string) => Promise<void>
  onClone: (taskId: string) => Promise<void>
}) {
  if (tasks.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
        暂无导出记录
      </div>
    )
  }

  return (
    <Accordion type="single" collapsible className="space-y-3">
      {tasks.map((task) => (
        <RecordItem key={task.id} task={task} onDelete={onDelete} onContinue={onContinue} onClone={onClone} />
      ))}
    </Accordion>
  )
}
