import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

type Preview = {
  totalLines: number
  validItems: number
  duplicateItems: number
  invalidItems: number
  invalidExamples: string[]
}

export function PreviewSummary({ preview }: { preview: Preview | null }) {
  if (!preview) return null
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">预检结果</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="grid gap-2 md:grid-cols-2">
          <div>总行数：{preview.totalLines}</div>
          <div>有效条目：{preview.validItems}</div>
          <div>重复条目：{preview.duplicateItems}</div>
          <div>无效条目：{preview.invalidItems}</div>
        </div>
        {preview.invalidExamples.length > 0 && (
          <div className="text-xs text-muted-foreground">无效示例：{preview.invalidExamples.join("、")}</div>
        )}
      </CardContent>
    </Card>
  )
}
