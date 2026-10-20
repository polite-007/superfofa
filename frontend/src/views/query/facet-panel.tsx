import { useMemo, useState } from "react"
import {
  AlertCircle,
  ChevronDown,
  ChevronsLeft,
  ChevronsRight,
  Loader2,
  RotateCw,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import { countryCode, countryLabel } from "@/lib/country-codes"
import { formatInteger, formatPercent, percentWidth } from "../aggregate/stats-format"
import type { model } from "../../../wailsjs/go/models"

export type FacetResult = {
  result: model.StatsFofaResult | null
  loading: boolean
  error: string | null
}

export const FACET_FIELDS = [
  { key: "protocol", label: "协议", defaultOpen: true },
  { key: "domain", label: "域名", defaultOpen: true },
  { key: "title", label: "标题", defaultOpen: true },
  { key: "country", label: "国家/地区", defaultOpen: false },
  { key: "port", label: "端口", defaultOpen: false },
] as const

export type FacetFieldKey = (typeof FACET_FIELDS)[number]["key"]

export const FACET_STATS_FIELDS = FACET_FIELDS.map((field) => field.key).join(",")
export const FACET_STATS_SIZE = 10

function quoteValue(value: string): string {
  return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`
}

function conditionFor(field: FacetFieldKey, value: string): string {
  return `${field}=${quoteValue(value)}`
}

export function FacetPanel({
  facets,
  onFilter,
  onRetry,
}: {
  facets: FacetResult
  onFilter: (condition: string) => void
  onRetry: () => void
}) {
  const [collapsed, setCollapsed] = useState(false)
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(FACET_FIELDS.map((field) => [field.key, field.defaultOpen])),
  )

  const groups = useMemo(() => {
    const result = facets.result
    if (!result) return []
    return FACET_FIELDS.map((field) => ({
      ...field,
      rows: result.aggs?.[field.key] ?? [],
      distinct: result.distinct?.[field.key] ?? 0,
    }))
  }, [facets.result])

  if (collapsed) {
    return (
      <aside className="flex h-full w-10 shrink-0 flex-col items-center gap-2 overflow-hidden rounded-xl border bg-card py-2">
        <Button
          variant="ghost"
          size="icon-xs"
          title="展开聚合栏"
          onClick={() => setCollapsed(false)}
        >
          <ChevronsRight className="size-3.5" />
        </Button>
        <span className="text-[10.5px] tracking-[0.12em] text-muted-foreground [writing-mode:vertical-rl]">
          聚合
        </span>
      </aside>
    )
  }

  return (
    <aside className="flex h-full w-[248px] shrink-0 flex-col overflow-hidden rounded-xl border bg-card xl:w-[272px]">
      <div className="flex shrink-0 items-start gap-2 border-b px-3 pb-2.5 pt-3">
        <div className="min-w-0">
          <div className="text-[13px] font-semibold leading-tight">聚合分析</div>
          <div className="mt-0.5 flex items-center gap-1 text-[11px] leading-tight text-muted-foreground">
            全量结果 · Top 10
            {facets.loading ? <Loader2 className="size-2.5 animate-spin" /> : null}
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon-xs"
          className="ml-auto mt-0.5"
          title="收起聚合栏"
          onClick={() => setCollapsed(true)}
        >
          <ChevronsLeft className="size-3.5" />
        </Button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {facets.loading && !facets.result ? (
          <FacetSkeleton />
        ) : facets.error ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 px-4 text-center">
            <AlertCircle className="size-5 text-destructive" />
            <span className="text-xs font-medium text-destructive">聚合统计加载失败</span>
            <span className="text-[10px] leading-relaxed text-muted-foreground">
              {facets.error}
            </span>
            <Button variant="outline" size="sm" className="mt-1 h-7 text-xs" onClick={onRetry}>
              <RotateCw className="size-3" />
              重新加载
            </Button>
          </div>
        ) : !facets.result ? (
          <div className="flex h-full items-center justify-center text-[11px] text-muted-foreground">
            暂无聚合数据
          </div>
        ) : (
          <div className="space-y-0.5">
            {groups.map((group) => {
              const open = openGroups[group.key] ?? false
              const total = facets.result?.total ?? 0
              const countLabel =
                group.distinct > 0
                  ? `${formatInteger(group.distinct)} 个`
                  : `${group.rows.length} 项`
              return (
                <div key={group.key} className="border-b border-border/50 last:border-b-0">
                  <button
                    type="button"
                    onClick={() =>
                      setOpenGroups((prev) => ({ ...prev, [group.key]: !open }))
                    }
                    className="flex h-9 w-full items-center gap-1.5 rounded-md px-2 text-left hover:bg-muted"
                  >
                    <span className="text-[13px] font-semibold">{group.label}</span>
                    <span className="ml-auto text-[11.5px] text-muted-foreground">
                      {countLabel}
                    </span>
                    <ChevronDown
                      className={cn(
                        "size-3.5 shrink-0 text-muted-foreground transition-transform",
                        !open && "-rotate-90",
                      )}
                    />
                  </button>

                  {open ? (
                    <div className="pb-1">
                      {group.rows.length === 0 ? (
                        <div className="px-2 py-2 text-[10px] text-muted-foreground">
                          暂无数据
                        </div>
                      ) : (
                        group.rows.map((row) => {
                          const rawName = row.name ?? ""
                          const displayName =
                            group.key === "country" ? countryLabel(rawName) : rawName || "（空）"
                          const filterValue =
                            group.key === "country" ? countryCode(rawName) : rawName
                          const condition = conditionFor(group.key, filterValue)
                          const regions = row.regions ?? []
                          const canExpandRegions =
                            group.key === "country" && regions.length > 0
                          const regionOpen = openGroups[`${group.key}:${rawName}`] ?? true
                          return (
                            <div key={`${group.key}-${rawName}`}>
                              <div className="relative">
                                <button
                                  type="button"
                                  onClick={() => onFilter(condition)}
                                  title={`追加条件：${condition}`}
                                  className={cn(
                                    "group/row relative flex h-8 w-full items-center gap-1.5 overflow-hidden rounded px-2 text-left hover:bg-muted/60",
                                    canExpandRegions && "pr-6",
                                  )}
                                >
                                  {total > 0 && row.count > 0 ? (
                                    <span
                                      className="absolute inset-y-0 left-0 bg-primary/10 group-hover/row:bg-primary/15"
                                      style={{ width: `${percentWidth(row.count, total)}%` }}
                                    />
                                  ) : null}
                                  <span className="relative min-w-0 flex-1 truncate text-[13px] font-medium">
                                    {displayName}
                                  </span>
                                  <span className="relative shrink-0 text-[12px] tabular-nums text-muted-foreground">
                                    {formatInteger(row.count)}
                                  </span>
                                  <span className="relative w-10 shrink-0 text-right text-[12px] tabular-nums text-muted-foreground/80">
                                    {formatPercent(row.count, total)}
                                  </span>
                                </button>
                                {canExpandRegions ? (
                                  <button
                                    type="button"
                                    title={regionOpen ? "收起地区" : "展开地区"}
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      setOpenGroups((prev) => ({
                                        ...prev,
                                        [`${group.key}:${rawName}`]: !regionOpen,
                                      }))
                                    }}
                                    className="absolute right-1 top-1/2 grid size-4 -translate-y-1/2 place-items-center rounded text-muted-foreground hover:bg-muted hover:text-foreground"
                                  >
                                    <ChevronDown
                                      className={cn(
                                        "size-3 transition-transform",
                                        !regionOpen && "-rotate-90",
                                      )}
                                    />
                                  </button>
                                ) : null}
                              </div>

                              {canExpandRegions && regionOpen ? (
                                <div className="pb-0.5 pl-4">
                                  {regions.map((region) => (
                                    <button
                                      key={region.name}
                                      type="button"
                                      onClick={() =>
                                        onFilter(
                                          `${condition} && region=${quoteValue(region.name)}`,
                                        )
                                      }
                                      title={`追加条件：${condition} && region=${quoteValue(region.name)}`}
                                      className="flex h-7 w-full items-center gap-2 border-l border-foreground/15 pl-2 pr-2 text-left text-[12px] text-muted-foreground hover:bg-muted hover:text-foreground"
                                    >
                                      <span className="min-w-0 flex-1 truncate">
                                        {region.name || "（空）"}
                                      </span>
                                      <span className="shrink-0 tabular-nums">
                                        {formatInteger(region.count)}
                                      </span>
                                    </button>
                                  ))}
                                </div>
                              ) : null}
                            </div>
                          )
                        })
                      )}
                    </div>
                  ) : null}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </aside>
  )
}

function FacetSkeleton() {
  return (
    <div className="space-y-3 p-1">
      <Skeleton className="h-3 w-2/5" />
      <div className="space-y-1">
        {Array.from({ length: 8 }).map((_, index) => (
          <Skeleton key={index} className="h-6 w-full" />
        ))}
      </div>
      <Skeleton className="h-3 w-1/3" />
      <div className="space-y-1">
        {Array.from({ length: 5 }).map((_, index) => (
          <Skeleton key={index} className="h-6 w-full" />
        ))}
      </div>
    </div>
  )
}
