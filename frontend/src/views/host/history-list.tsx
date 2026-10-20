import { useState } from "react"
import { Clock, Trash2, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { HostHistoryItem } from "./use-host-history"

function timeAgo(ts: number): string {
  const diff = Date.now() - ts
  const s = Math.floor(diff / 1000)
  if (s < 60) return "刚刚"
  const m = Math.floor(s / 60)
  if (m < 60) return `${m} 分钟前`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h} 小时前`
  const d = Math.floor(h / 24)
  return `${d} 天前`
}

const VISIBLE_COUNT = 5

export function HostHistoryList({
  history,
  onPick,
  onRemove,
  onClear,
}: {
  history: HostHistoryItem[]
  onPick: (host: string) => void
  onRemove: (id: string) => void
  onClear: () => void
}) {
  const [expanded, setExpanded] = useState(false)

  if (history.length === 0) return null

  const hasMore = history.length > VISIBLE_COUNT
  const visible = expanded ? history : history.slice(0, VISIBLE_COUNT)
  const hiddenCount = Math.max(0, history.length - VISIBLE_COUNT)

  return (
    <div className="flex w-full max-w-2xl flex-col gap-2">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <Clock className="size-3.5" />
          历史记录
        </div>
        <div className="flex items-center gap-1">
          {hasMore && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs text-muted-foreground"
              onClick={() => setExpanded((v) => !v)}
            >
              {expanded ? "收起" : `更多 ${hiddenCount}`}
            </Button>
          )}
          <Button variant="ghost" size="sm" className="h-6 px-2 text-xs text-muted-foreground" onClick={onClear}>
            <Trash2 className="size-3" />
            清空
          </Button>
        </div>
      </div>

      <div className={cn("flex flex-col gap-1", expanded && "max-h-72 overflow-y-auto pr-1")}>
        {visible.map((h) => (
          <div
            key={h.id}
            className="group flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-muted/60"
          >
            <button
              type="button"
              onClick={() => onPick(h.host)}
              className="flex min-w-0 flex-1 items-center gap-2 text-left"
            >
              <span className="truncate font-mono text-xs text-foreground/90">{h.host}</span>
            </button>
            <span className="shrink-0 text-[11px] text-muted-foreground">{timeAgo(h.ts)}</span>
            <button
              type="button"
              onClick={() => onRemove(h.id)}
              title="删除"
              className="shrink-0 rounded-sm text-muted-foreground opacity-0 transition-opacity hover:text-foreground group-hover:opacity-100"
            >
              <X className="size-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
