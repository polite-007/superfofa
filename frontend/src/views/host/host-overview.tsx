import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { Plug } from "lucide-react"
import { model } from "../../../wailsjs/go/models"

function PortMiniCard({ port }: { port: number }) {
  return (
    <div className="flex items-center rounded-lg border border-border bg-background px-3 py-2 transition-colors hover:bg-muted/40">
      <Plug className="size-3.5 shrink-0 text-muted-foreground" />
      <span className="ml-2 font-mono text-base tabular-nums">{port}</span>
    </div>
  )
}

function Section({ title, items, mono }: { title: string; items?: string[]; mono?: boolean }) {
  const list = items ?? []
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">{title}</span>
      </div>
      {list.length === 0 ? (
        <span className="text-xs text-muted-foreground/50">—</span>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {list.map((v, i) => (
            <Badge key={`${v}-${i}`} variant="outline" className={mono ? "font-mono tabular-nums" : undefined}>
              {v}
            </Badge>
          ))}
        </div>
      )}
    </div>
  )
}

export function HostOverview({ result, loading }: { result: model.HostResult | null; loading: boolean }) {
  if (loading) {
    return (
      <div className="grid gap-3 lg:grid-cols-[260px_1fr]">
        <Card className="border border-border ring-0">
          <CardHeader>
            <Skeleton className="h-4 w-20" />
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-9 w-full" />
            ))}
          </CardContent>
        </Card>
        <Card className="border border-border ring-0">
          <CardHeader>
            <Skeleton className="h-4 w-24" />
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-full max-w-md" />
            ))}
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!result) return null

  const ports = result.port ?? []
  const protocols = result.protocol ?? []
  const categories = result.category ?? []
  const products = result.product ?? []

  return (
    <div className="grid gap-3 lg:grid-cols-[260px_1fr]">
      {/* 左列：开放端口迷你卡列表 */}
      <Card className="border border-border ring-0">
        <CardHeader className="border-b">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Plug className="size-4 text-muted-foreground" />
            开放端口
            <span className="ml-auto font-mono text-xs text-muted-foreground">{ports.length}</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-1.5 pt-3">
          {ports.length === 0 ? (
            <span className="py-6 text-center text-xs text-muted-foreground/50">无端口数据</span>
          ) : (
            ports.map((p) => <PortMiniCard key={p} port={p} />)
          )}
        </CardContent>
      </Card>

      {/* 右列：协议 / 分类 / 产品 分节 */}
      <Card className="border border-border ring-0">
        <CardContent className="flex flex-col gap-4 pt-4">
          <Section title="开放协议" items={protocols} />
          <Separator />
          <Section title="产品分类" items={categories} />
          <Separator />
          <Section title="产品列表" items={products} />
        </CardContent>
      </Card>
    </div>
  )
}
