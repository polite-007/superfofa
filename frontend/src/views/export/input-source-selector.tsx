import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { ExportDraftForm } from "./types"

export function InputSourceSelector({
  draft,
  onChange,
}: {
  draft: ExportDraftForm
  onChange: (next: Partial<ExportDraftForm>) => void
}) {
  const sourceValue = draft.source === "query" ? undefined : draft.source

  const handleSourceChange = (value: string) => {
    const source = value as Extract<ExportDraftForm["source"], "text" | "file">
    onChange({
      source,
      sourceFileName: "",
      text: source === "file" ? "" : draft.text,
    })
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="space-y-2">
        <Label>输入来源</Label>
        {draft.source === "query" ? (
          <div className="space-y-2">
            <div className="flex h-8 items-center rounded-lg border border-input bg-input/30 px-2.5 text-sm text-muted-foreground">
              查询页（来自查询结果）
            </div>
            <Select value={sourceValue} onValueChange={handleSourceChange}>
              <SelectTrigger>
                <SelectValue placeholder="改为其它来源" />
              </SelectTrigger>
              <SelectContent position="popper" align="start" sideOffset={4}>
                <SelectItem value="text">粘贴文本</SelectItem>
                <SelectItem value="file">读取文件</SelectItem>
              </SelectContent>
            </Select>
          </div>
        ) : (
          <Select value={sourceValue} onValueChange={handleSourceChange}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent position="popper" align="start" sideOffset={4}>
              <SelectItem value="text">粘贴文本</SelectItem>
              <SelectItem value="file">读取文件</SelectItem>
            </SelectContent>
          </Select>
        )}
      </div>
      <div className="space-y-2">
        <Label>输入类型</Label>
        <Select
          value={draft.inputType}
          onValueChange={(value) => onChange({ inputType: value as ExportDraftForm["inputType"] })}
          disabled={draft.source === "query"}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent position="popper" align="start" sideOffset={4}>
            <SelectItem value="syntax">语法</SelectItem>
            <SelectItem value="ip">IP</SelectItem>
            <SelectItem value="host">Host</SelectItem>
            <SelectItem value="domain">Domain</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
