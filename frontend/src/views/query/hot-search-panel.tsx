import { useCallback, useEffect, useState } from "react"
import { Flame, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { HotSearch } from "../../../wailsjs/go/app/App"
import { model } from "../../../wailsjs/go/models"

function formatCount(n: number): string {
  if (n >= 1_0000_0000) return `${(n / 1_0000_0000).toFixed(1)}亿`
  if (n >= 1_0000) return `${(n / 1_0000).toFixed(1)}万`
  return String(n)
}

function Sparkline({ trend }: { trend: model.HotTrend[] | undefined }) {
  if (!trend || trend.length < 2) return null
  const W = 56
  const H = 16
  const values = trend.map((t) => t.value)
  const max = Math.max(...values, 1)
  const min = Math.min(...values, 0)
  const range = max - min || 1
  const points = trend
    .map((t, i) => {
      const x = (i / (trend.length - 1)) * W
      const y = H - ((t.value - min) / range) * (H - 2) - 1
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(" ")
  return (
    <svg width={W} height={H} className="shrink-0 text-primary/70" aria-hidden>
      <polyline
        points={points}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.2}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  )
}

function trendSummary(trend: model.HotTrend[] | undefined): string {
  if (!trend || trend.length === 0) return "暂无趋势数据"
  const last = trend[trend.length - 1]
  const peak = trend.reduce((acc, t) => (t.value > acc.value ? t : acc), trend[0])
  return `近 ${trend.length} 天 · 最新 ${last.date}：${last.value} 次 · 峰值 ${peak.date}：${peak.value} 次`
}

// 点击热搜用 app="名称" 语法跳转，不使用返回的 fid="xxx"
function appQuery(item: model.HotSearchItem): string {
  return `app="${item.app}"`
}

export function HotSearchPanel({ onPick }: { onPick: (query: string) => void }) {
  const [items, setItems] = useState<model.HotSearchItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loaded, setLoaded] = useState(false)

  const fetchHot = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await HotSearch()
      setItems(data ?? [])
      setLoaded(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }, [])

  // 首次进入面板懒加载一次
  useEffect(() => {
    if (!loaded && !loading) void fetchHot()
  }, [loaded, loading, fetchHot])

  return (
    <div className="flex w-full flex-col gap-2">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <Flame className="size-3.5" />
          热搜
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 px-2 text-xs text-muted-foreground"
          onClick={() => void fetchHot()}
          disabled={loading}
          title="刷新热搜"
        >
          <RefreshCw className={loading ? "size-3 animate-spin" : "size-3"} />
          刷新
        </Button>
      </div>

      {loading && !loaded && (
        <div className="grid grid-cols-2 gap-x-6 gap-y-1.5">
          {Array.from({ length: 10 }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-full" />
          ))}
        </div>
      )}

      {!loading && error && (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border py-8 text-center">
          <p className="text-xs text-muted-foreground">热搜获取失败</p>
          <p className="max-w-xs truncate text-[11px] text-muted-foreground/70">{error}</p>
          <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => void fetchHot()}>
            重新加载
          </Button>
        </div>
      )}

      {!loading && !error && items.length === 0 && (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border py-8 text-center">
          <p className="text-xs text-muted-foreground">暂无热搜数据</p>
          <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => void fetchHot()}>
            刷新
          </Button>
        </div>
      )}

      {!loading && !error && items.length > 0 && (
        <TooltipProvider delayDuration={200}>
          <div className="grid grid-cols-2 gap-x-6 gap-y-1">
            {items.map((item, idx) => (
              <Tooltip key={`${item.query_string}-${idx}`}>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={() => onPick(appQuery(item))}
                    className="group flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left transition-colors hover:bg-muted/60"
                  >
                    <span className="w-4 shrink-0 text-[11px] tabular-nums text-muted-foreground">
                      {idx + 1}
                    </span>
                    <span className="min-w-0 flex-1 truncate font-mono text-xs text-foreground/90">
                      {item.app}
                    </span>
                    {item.is_hot && (
                      <Flame className="size-3.5 shrink-0 text-amber-500" />
                    )}
                    <Sparkline trend={item.hot_trend} />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs">
                  <div className="space-y-1 text-xs">
                    <div className="font-mono break-all">{appQuery(item)}</div>
                    <div className="text-muted-foreground">{trendSummary(item.hot_trend)}</div>
                  </div>
                </TooltipContent>
              </Tooltip>
            ))}
          </div>
        </TooltipProvider>
      )}
    </div>
  )
}
