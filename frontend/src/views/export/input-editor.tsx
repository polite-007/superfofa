import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import type { ExportDraftForm } from "./types"

export function InputEditor({
  draft,
  onChange,
}: {
  draft: ExportDraftForm
  onChange: (next: Partial<ExportDraftForm>) => void
}) {
  async function handleTxtFile(file: File) {
    if (!file.name.toLowerCase().endsWith(".txt")) {
      toast.warning("仅支持导入 txt 文件")
      return
    }
    const text = await file.text()
    onChange({ source: "file", sourceFileName: file.name, text })
  }

  if (draft.source === "query") {
    return (
      <div className="space-y-2">
        <Label>导出语法</Label>
        <Input value={draft.text} readOnly title={draft.text} className="bg-input/30" />
        <p className="text-xs text-muted-foreground">查询语句来自查询页，若需修改请返回查询页后重新导出。</p>
      </div>
    )
  }

  if (draft.source === "file") {
    return (
      <div className="space-y-3">
        <Label>输入文本</Label>
        <div className="flex flex-wrap items-center gap-3 rounded-md border border-border px-3 py-3">
          <Button asChild variant="outline" size="sm">
            <label>
              读取文本文档
              <input
                type="file"
                accept=".txt,text/plain"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0]
                  if (file) {
                    void handleTxtFile(file)
                  }
                  event.currentTarget.value = ""
                }}
              />
            </label>
          </Button>
          <span className="text-sm text-muted-foreground">
            {draft.sourceFileName ? `当前文件：${draft.sourceFileName}` : "未选择文件"}
          </span>
        </div>
        <p className="text-xs text-muted-foreground">每行一个条目，仅支持 txt 文件。</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <Label>输入文本</Label>
      <Textarea
        className="min-h-40"
        value={draft.text}
        onChange={(event) => onChange({ text: event.target.value })}
        placeholder="每行一个条目"
      />
    </div>
  )
}
