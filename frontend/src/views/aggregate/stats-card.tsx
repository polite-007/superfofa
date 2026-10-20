import { useState } from "react"
import { ChevronDown, CopyIcon } from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { displayAggName, formatInteger, formatPercent, percentWidth } from "./stats-format"
import type { StatsFieldDef } from "./stats-fields"
import type { model } from "../../../wailsjs/go/models"

export type StatsCardProps = {
  field: StatsFieldDef
  rows?: model.StatsAggItem[]
  returned?: number
  distinct?: number
  total?: number
  loading?: boolean
}

async function copyValue(value: string) {
  await navigator.clipboard.writeText(value)
  toast.success("已复制")
}

const ROW_H = "h-8"

export function StatsCard({
  field,
  rows = [],
  returned,
  distinct,
  total = 0,
  loading = false,
}: StatsCardProps) {
  const hasRows = rows.length > 0
  const [expanded, setExpanded] = useState<Set<number>>(new Set())

  function toggleRow(index: number) {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(index)) next.delete(index)
      else next.add(index)
      return next
    })
  }

  return (
    <div className="flex h-[336px] w-full min-w-0 flex-col overflow-hidden rounded-xl border bg-background shadow-sm">
      <div className="flex shrink-0 items-center gap-2 border-b px-3 py-2">
        <span className="truncate text-sm font-semibold">{field.label}</span>
        <Badge variant="outline" className="shrink-0 px-1.5 font-mono text-[10px]">
          {field.key}
        </Badge>
        <span className="ml-auto shrink-0 text-[11px] text-muted-foreground">
          {formatInteger(returned ?? rows.length)}
          {typeof distinct === "number" && (
            <span className="ml-1 text-muted-foreground/70">/ 唯一 {formatInteger(distinct)}</span>
          )}
        </span>
      </div>

      {loading ? (
        <div className="flex-1 space-y-1.5 overflow-hidden p-2">
          {Array.from({ length: 8 }).map((_, index) => (
            <Skeleton key={index} className="h-7 w-full" />
          ))}
        </div>
      ) : !hasRows ? (
        <div className="flex flex-1 items-center justify-center text-xs text-muted-foreground">
          暂无聚合数据
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto">
          <TooltipProvider>
            {rows.map((row, index) => {
              const name = row.name ?? ""
              const displayName = displayAggName(name)
              const percent = formatPercent(row.count, total)
              const width = percentWidth(row.count, total)
              const canCopy = name !== ""
              const isLast = index === rows.length - 1
              const regions = row.regions ?? []
              const hasRegions = regions.length > 0
              const isOpen = expanded.has(index)

              return (
                <div key={`${name}-${index}`} className="relative">
                  <div
                    className={cn(
                      "group/row relative flex items-center gap-1.5 px-3",
                      ROW_H,
                      !isLast && "border-b border-border/60",
                    )}
                  >
                    {total > 0 && row.count > 0 && (
                      <div
                        className="absolute inset-y-0 left-0 bg-primary/10 group-hover/row:bg-primary/15"
                        style={{ width: `${width}%` }}
                      />
                    )}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span
                          className={cn(
                            "relative min-w-0 flex-1 truncate text-xs font-medium",
                            name === "" && "text-muted-foreground",
                          )}
                          title={displayName}
                        >
                          {displayName}
                        </span>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-[420px] break-all">
                        {displayName}
                      </TooltipContent>
                    </Tooltip>
                    {canCopy && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-xs"
                        className="relative size-5 shrink-0 opacity-0 group-hover/row:opacity-100"
                        onClick={() => void copyValue(name)}
                        aria-label={`复制${displayName}`}
                      >
                        <CopyIcon className="size-3" />
                      </Button>
                    )}
                    <span className="relative shrink-0 text-[11px] tabular-nums text-muted-foreground">
                      {formatInteger(row.count)}
                    </span>
                    {percent && (
                      <span className="relative w-10 shrink-0 text-right text-[11px] tabular-nums text-muted-foreground">
                        {percent}
                      </span>
                    )}
                    {hasRegions && (
                      <button
                        type="button"
                        onClick={() => toggleRow(index)}
                        className="relative flex size-5 shrink-0 items-center justify-center rounded text-muted-foreground hover:bg-muted"
                        aria-label={isOpen ? "收起下钻" : "展开下钻"}
                      >
                        <ChevronDown className={cn("size-3.5 transition-transform", isOpen && "rotate-180")} />
                      </button>
                    )}
                  </div>
                  {hasRegions && isOpen && (
                    <div className="border-b border-border/60 bg-muted/30 py-1">
                      {regions.map((r, ri) => (
                        <div
                          key={`${r.name}-${ri}`}
                          className="flex items-center gap-2 px-6 text-[11px] leading-6"
                        >
                          <span className="min-w-0 flex-1 truncate text-muted-foreground">
                            {r.name || "-"}
                          </span>
                          <span className="shrink-0 tabular-nums text-muted-foreground">
                            {formatInteger(r.count)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </TooltipProvider>
        </div>
      )}
    </div>
  )
}