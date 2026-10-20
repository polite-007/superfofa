import { useEffect, useState } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

// 有总数分页：用 total + pageSize 算总页数，精确控制上下页可用性
export function Pagination({
  page,
  pageSize,
  total,
  onPage,
  disabled,
}: {
  page: number
  pageSize: number
  total: number
  onPage: (p: number) => void
  disabled?: boolean
}) {
  const totalPages = total > 0 ? Math.max(1, Math.ceil(total / pageSize)) : 1
  const canPrev = page > 1 && !disabled
  const canNext = page < totalPages && !disabled

  // 本地字符串状态：避免清空时 NaN 抖动；外部 page 变化时同步
  const [text, setText] = useState(String(page))
  useEffect(() => {
    setText(String(page))
  }, [page])

  function commit() {
    let n = parseInt(text, 10)
    if (Number.isNaN(n) || n < 1) {
      setText(String(page))
      return
    }
    if (n > totalPages) n = totalPages
    if (n === page) {
      setText(String(page))
      return
    }
    onPage(n)
  }

  return (
    <div className="flex shrink-0 items-center justify-center gap-2 border-t border-border px-3 py-2 text-xs text-muted-foreground">
      <Button
        variant="outline"
        size="sm"
        onClick={() => onPage(page - 1)}
        disabled={!canPrev}
      >
        <ChevronLeft className="size-3.5" />
        上一页
      </Button>
      <div className="flex items-center gap-1.5">
        <span>第</span>
        <Input
          className="h-7 w-14 text-center text-xs tabular-nums"
          inputMode="numeric"
          value={text}
          disabled={disabled}
          onChange={(e) => setText(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              ;(e.target as HTMLInputElement).blur()
            }
          }}
        />
        <span>页 / 共 {totalPages} 页</span>
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={() => onPage(page + 1)}
        disabled={!canNext}
      >
        下一页
        <ChevronRight className="size-3.5" />
      </Button>
    </div>
  )
}
