import { Card, CardContent, CardHeader, CardTitle, CardAction } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Plug } from "lucide-react"
import { model } from "../../../wailsjs/go/models"
import { serviceBadgeFor } from "./service-badge"
import { cn } from "@/lib/utils"

const LEVEL_LABEL: Record<number, string> = {
  5: "应用",
  4: "支持",
  3: "服务",
  2: "系统",
  1: "硬件",
  0: "无",
}

const LEVEL_TONE: Record<number, string> = {
  5: "border-emerald-500/30 bg-emerald-500/10 text-emerald-600",
  4: "border-sky-500/30 bg-sky-500/10 text-sky-600",
  3: "border-violet-500/30 bg-violet-500/10 text-violet-600",
  2: "border-amber-500/30 bg-amber-500/10 text-amber-600",
  1: "border-rose-500/30 bg-rose-500/10 text-rose-600",
  0: "border-muted-foreground/30 bg-muted/40 text-muted-foreground",
}

function maxLevel(products: model.HostProduct[]): number {
  let max = 0
  for (const p of products) if (p.level > max) max = p.level
  return max
}

function PortCard({ port }: { port: model.HostPort }) {
  const products = port.products ?? []
  const protoBadge = port.protocol ? serviceBadgeFor(port.protocol) : undefined
  const level = maxLevel(products)

  return (
    <Card size="sm" className="border border-border ring-0">
      <CardHeader className="border-b">
        <CardTitle className="flex items-center gap-2.5 text-sm">
          <Plug className="size-4 text-muted-foreground" />
          <span className="font-mono text-base font-semibold tabular-nums">{port.port}</span>
          {port.protocol && (
            <span
              className={cn(
                "rounded border px-1.5 py-0.5 text-[10px] font-semibold leading-none",
                protoBadge
                  ? protoBadge.className
                  : "border-muted-foreground/30 bg-muted/40 text-muted-foreground",
              )}
            >
              {protoBadge?.label ?? port.protocol}
            </span>
          )}
        </CardTitle>
        <CardAction>
          <span className="text-[11px] text-muted-foreground">
            {products.length === 0 ? "无产品" : `${products.length} 个产品`}
          </span>
        </CardAction>
      </CardHeader>
      <CardContent className="pt-3">
        {products.length === 0 ? (
          <span className="text-xs text-muted-foreground/50">—</span>
        ) : (
          <ul className="flex flex-col gap-2">
            {products.map((pr, i) => (
              <li key={i} className="flex flex-wrap items-center gap-2 text-xs">
                <span className="size-1.5 shrink-0 rounded-full bg-foreground/40" aria-hidden />
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="min-w-0 max-w-[280px] truncate font-medium">{pr.product || "—"}</span>
                  </TooltipTrigger>
                  <TooltipContent side="top">{pr.product}</TooltipContent>
                </Tooltip>
                {pr.category && (
                  <Badge variant="outline" className="text-[10px] text-muted-foreground">
                    {pr.category}
                  </Badge>
                )}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span
                      className={cn(
                        "rounded border px-1.5 py-0.5 text-[10px] font-semibold leading-none",
                        LEVEL_TONE[level] ?? LEVEL_TONE[0],
                      )}
                    >
                      {LEVEL_LABEL[level] ?? "无"}层
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    产品分层：5 应用 / 4 支持 / 3 服务 / 2 系统 / 1 硬件 / 0 无
                  </TooltipContent>
                </Tooltip>
                {pr.sort_hard_code === 1 && (
                  <Badge variant="outline" className="text-[10px] text-rose-500 border-rose-500/30 bg-rose-500/10">
                    硬件
                  </Badge>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}

export function HostPortsCards({ result, loading }: { result: model.HostResult | null; loading: boolean }) {
  if (loading) {
    return (
      <div className="grid gap-2.5 sm:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} size="sm" className="border border-border ring-0">
            <CardHeader className="border-b">
              <Skeleton className="h-5 w-24" />
            </CardHeader>
            <CardContent className="pt-3">
              <Skeleton className="h-4 w-full max-w-[220px]" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (!result || !result.ports || result.ports.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
        没有端口详情数据
      </div>
    )
  }

  return (
    <TooltipProvider>
      <div className="grid gap-2.5 sm:grid-cols-2">
        {result.ports.map((p, i) => (
          <PortCard key={`${p.port}-${i}`} port={p} />
        ))}
      </div>
    </TooltipProvider>
  )
}
