import { useMemo, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { RecordFilter } from "./record-filter"
import { RecordList } from "./record-list"
import type { ExportTask } from "./types"

export function RecordListTab({
  tasks,
  loading,
  onRefresh,
  onDelete,
  onContinue,
  onClone,
}: {
  tasks: ExportTask[]
  loading: boolean
  onRefresh: () => Promise<void>
  onDelete: (taskId: string) => Promise<void>
  onContinue: (taskId: string) => Promise<void>
  onClone: (taskId: string) => Promise<void>
}) {
  const [status, setStatus] = useState("all")
  const visibleTasks = useMemo(() => {
    if (status === "all") return tasks
    return tasks.filter((task) => task.status === status)
  }, [status, tasks])

  return (
    <Card className="flex h-full min-h-0 flex-col">
      <CardHeader className="shrink-0">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle>导出记录</CardTitle>
            <CardDescription>统一管理导出任务、进度与恢复入口。</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <RecordFilter value={status} onChange={setStatus} />
            <Button variant="outline" size="sm" onClick={() => void onRefresh()} disabled={loading}>
              刷新
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="min-h-0 flex-1 overflow-auto">
        <RecordList tasks={visibleTasks} onDelete={onDelete} onContinue={onContinue} onClone={onClone} />
      </CardContent>
    </Card>
  )
}
