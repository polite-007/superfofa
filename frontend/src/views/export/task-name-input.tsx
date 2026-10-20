import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export function TaskNameInput({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const base = value.trim() || "默认任务名"
  return (
    <div className="space-y-2">
      <Label>任务名称</Label>
      <Input value={value} onChange={(event) => onChange(event.target.value)} placeholder="留空时使用默认任务名" />
      <p className="text-xs text-muted-foreground">
        任务名称即导出文件名，完成后自动追加时间戳防覆盖：
        <span className="ml-1 font-mono text-foreground">{base}-时间戳.xlsx</span>
      </p>
    </div>
  )
}
