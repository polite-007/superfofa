import { useLayoutEffect, useRef, useState } from "react"
import { HelpCircle, Search, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { SyntaxHelpDialog } from "./syntax-help-dialog"

export function SearchBox({
  value,
  onChange,
  onSearch,
  searching,
  size = "lg",
  autoFocus,
}: {
  value: string
  onChange: (v: string) => void
  onSearch: () => void
  searching?: boolean
  size?: "lg" | "sm"
  autoFocus?: boolean
}) {
  const [helpOpen, setHelpOpen] = useState(false)
  const taRef = useRef<HTMLTextAreaElement>(null)

  const large = size === "lg"
  const minH = large ? 56 : 44
  const maxH = large ? 208 : 168

  useLayoutEffect(() => {
    const el = taRef.current
    if (!el) return
    el.style.height = "auto"
    const sh = el.scrollHeight
    // 元素隐藏（display:none）时 scrollHeight=0，此时不要把高度写成 0，
    // 否则切回可见时占位文字被压没；保留默认 rows 高度等可见后再算。
    if (sh > 0) {
      el.style.height = `${Math.min(sh, maxH)}px`
    }
  }, [value, maxH])

  return (
    <>
      <div
        className={cn(
          "group relative flex items-stretch rounded-xl bg-card ring-1 ring-foreground/15 transition-all focus-within:ring-2 focus-within:ring-ring",
          large ? "px-4" : "px-3",
        )}
        style={{ minHeight: minH }}
      >
        <textarea
          ref={taRef}
          rows={1}
          spellCheck={false}
          placeholder="Search..."
          value={value}
          autoFocus={autoFocus}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault()
              onSearch()
            }
          }}
          className={cn(
            "min-w-0 flex-1 self-center resize-none bg-transparent py-2 outline-none placeholder:text-muted-foreground",
            large ? "min-h-[2.75rem] text-base leading-7" : "min-h-[2.5rem] text-sm leading-6",
          )}
        />

        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={() => setHelpOpen(true)}
            title="查询语法"
            className={cn(
              "inline-flex items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
              large ? "size-8" : "size-7",
            )}
          >
            <HelpCircle className={large ? "size-5" : "size-4"} />
          </button>
          <button
            type="button"
            onClick={onSearch}
            disabled={searching}
            title="搜索"
            className={cn(
              "inline-flex items-center justify-center rounded-md text-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50",
              large ? "size-8" : "size-7",
            )}
          >
            {searching ? (
              <Loader2 className={large ? "size-5 animate-spin" : "size-4 animate-spin"} />
            ) : (
              <Search className={large ? "size-5" : "size-4"} />
            )}
          </button>
        </div>
      </div>

      <SyntaxHelpDialog open={helpOpen} onOpenChange={setHelpOpen} />
    </>
  )
}