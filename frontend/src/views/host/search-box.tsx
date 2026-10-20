import { Loader2, Search } from "lucide-react"
import { cn } from "@/lib/utils"

const IPV4_RE = /^(\d{1,3}\.){3}\d{1,3}$/

export function isIPv4String(s: string): boolean {
  const v = s.trim()
  if (!IPV4_RE.test(v)) return false
  return v.split(".").every((p) => {
    const n = Number(p)
    return Number.isInteger(n) && n >= 0 && n <= 255
  })
}

export function HostSearchBox({
  value,
  onChange,
  onSearch,
  searching,
  size = "lg",
  autoFocus,
  rightSlot,
}: {
  value: string
  onChange: (v: string) => void
  onSearch: () => void
  searching?: boolean
  size?: "lg" | "sm"
  autoFocus?: boolean
  rightSlot?: React.ReactNode
}) {
  const large = size === "lg"
  const invalid = value.trim().length > 0 && !isIPv4String(value)

  return (
    <div
      className={cn(
        "group relative flex items-center rounded-xl bg-card ring-1 transition-all focus-within:ring-2 focus-within:ring-ring",
        invalid ? "ring-rose-500/60 focus-within:ring-rose-500" : "ring-foreground/15",
        large ? "h-12 px-4" : "h-11 px-3",
      )}
    >
      <input
        className={cn(
          "min-w-0 flex-1 bg-transparent font-mono tabular-nums outline-none placeholder:font-sans placeholder:text-muted-foreground",
          large ? "text-base" : "text-sm",
        )}
        placeholder="Search..."
        value={value}
        autoFocus={autoFocus}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault()
            onSearch()
          }
        }}
        spellCheck={false}
        autoComplete="off"
      />

      {rightSlot && <div className="mr-1 shrink-0">{rightSlot}</div>}

      <div className="flex shrink-0 items-center gap-1">
        <button
          type="button"
          onClick={onSearch}
          disabled={searching}
          title="查询"
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
  )
}
