import * as React from "react"
import {
  Clock,
  Copy,
  ExternalLink,
  FileText,
  Globe,
  Lock,
  MapPin,
  Network,
  Package,
  Plug,
  Server,
  ShieldCheck,
  Tag,
  type LucideIcon,
} from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { cn } from "@/lib/utils"
import { COUNTRY_CODES } from "@/lib/country-codes"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { ColumnDef, renderCell } from "./columns"

type Row = Record<string, string>

// 固定前 3 列（含 # 列）：横滚时保持可见
const PIN_COUNT = 2
const NUM_W = 48 // # 列宽
const COL_W = 160 // 固定的数据列宽
const SCROLL_COL_W = 140 // 非固定数据列最小宽度

// 第 ci 列（0 = #）固定时的左偏移
function pinLeft(ci: number): number {
  if (ci <= 0) return 0
  return NUM_W + COL_W * (ci - 1)
}
function pinWidth(ci: number): number {
  return ci === 0 ? NUM_W : COL_W
}

const LONG_TEXT_CLOSE_DELAY_MS = 120

type LongTextCellProps = {
  value: string
  mono?: boolean
  trigger?: React.ReactNode
}

function statusCodeTone(value: string) {
  const code = Number(value)
  if (!Number.isInteger(code)) return "bg-muted-foreground/40"
  if (code >= 200 && code < 300) return "bg-emerald-500"
  if (code >= 300 && code < 400) return "bg-amber-500"
  if (code >= 400 && code < 600) return "bg-rose-500"
  return "bg-muted-foreground/40"
}

function StatusCodeCell({ value }: { value: string }) {
  const code = value.trim()
  if (!/^[1-5]\d{2}$/.test(code)) {
    return <span className="text-muted-foreground">—</span>
  }
  return (
    <span className="inline-flex items-center gap-1.5 font-mono tabular-nums">
      <span className={cn("size-2 rounded-full", statusCodeTone(code))} aria-hidden />
      <span>{code}</span>
    </span>
  )
}

type IconTextCellProps = {
  value: React.ReactNode
  icon: LucideIcon
  mono?: boolean
}

function IconTextCell({ value, icon: Icon, mono }: IconTextCellProps) {
  return (
    <span className={cn("inline-flex min-w-0 max-w-full items-center gap-1.5", mono && "font-mono tabular-nums")}>
      <Icon className="size-3.5 shrink-0 text-muted-foreground" />
      <span className="min-w-0 truncate">{value}</span>
    </span>
  )
}

const FIXED_FIELD_ICONS: Record<string, LucideIcon> = {
  ip: Server,
  port: Plug,
  host: Globe,
  domain: Globe,
  link: ExternalLink,
  title: FileText,
  cert: ShieldCheck,
  "tls.version": Lock,
  product: Package,
  "product.version": Tag,
  lastupdatetime: Clock,
}

const SERVICE_BADGES = [
  { tokens: ["redis"], label: "R", className: "border-red-500/30 bg-red-500/10 text-red-500" },
  { tokens: ["mysql"], label: "My", className: "border-sky-500/30 bg-sky-500/10 text-sky-500" },
  { tokens: ["postgres", "postgresql"], label: "Pg", className: "border-blue-500/30 bg-blue-500/10 text-blue-500" },
  { tokens: ["mongodb", "mongo"], label: "Mg", className: "border-emerald-500/30 bg-emerald-500/10 text-emerald-500" },
  { tokens: ["elastic", "elasticsearch"], label: "Es", className: "border-amber-500/30 bg-amber-500/10 text-amber-500" },
  { tokens: ["nginx"], label: "Ng", className: "border-green-500/30 bg-green-500/10 text-green-500" },
  { tokens: ["apache"], label: "Ap", className: "border-orange-500/30 bg-orange-500/10 text-orange-500" },
  { tokens: ["https"], label: "HTTPS", className: "border-emerald-500/30 bg-emerald-500/10 text-emerald-500" },
  { tokens: ["http"], label: "HTTP", className: "border-sky-500/30 bg-sky-500/10 text-sky-500" },
  { tokens: ["ssh"], label: "SSH", className: "border-violet-500/30 bg-violet-500/10 text-violet-500" },
  { tokens: ["ftp"], label: "FTP", className: "border-cyan-500/30 bg-cyan-500/10 text-cyan-500" },
]

function serviceBadgeFor(value: string) {
  const lower = value.toLowerCase()
  return SERVICE_BADGES.find((badge) => badge.tokens.some((token) => lower.includes(token)))
}

function ServiceBadgeCell({ value }: { value: string }) {
  const badge = serviceBadgeFor(value)
  if (!badge) return <IconTextCell value={value} icon={Network} />
  return (
    <span className="inline-flex min-w-0 max-w-full items-center gap-1.5">
      <span className={cn("shrink-0 rounded border px-1 py-0.5 text-[10px] font-semibold leading-none", badge.className)}>
        {badge.label}
      </span>
      <span className="min-w-0 truncate">{value}</span>
    </span>
  )
}

function LocationCell({ value }: { value: string }) {
  const match = COUNTRY_CODES.find(([name]) => value.includes(name))
  return (
    <span className="inline-flex min-w-0 max-w-full items-center gap-1.5">
      {match ? (
        <span className="shrink-0 rounded border border-border bg-muted px-1 py-0.5 text-[10px] font-semibold leading-none text-muted-foreground">
          {match[1]}
        </span>
      ) : <MapPin className="size-3.5 shrink-0 text-muted-foreground" />}
      <span className="min-w-0 truncate">{value}</span>
    </span>
  )
}

// FOFA icon 字段返回 base64 编码的图标二进制；按 magic bytes 判定 MIME 后构造 data URI
function toIconDataUri(value: string): string | null {
  const v = value.trim()
  if (!v) return null
  if (v.startsWith("data:")) return v
  try {
    const binary = atob(v)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
    let mime = "image/x-icon"
    if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) mime = "image/png"
    else if (bytes[0] === 0xff && bytes[1] === 0xd8) mime = "image/jpeg"
    else if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46) mime = "image/gif"
    else if (bytes[0] === 0x42 && bytes[1] === 0x4d) mime = "image/bmp"
    else if (bytes[0] === 0x00 && bytes[1] === 0x00 && bytes[2] === 0x01 && bytes[3] === 0x00) mime = "image/x-icon"
    return `data:${mime};base64,${v}`
  } catch {
    return null
  }
}

function IconImageCell({ value }: { value: string }) {
  const src = toIconDataUri(value)
  if (!src) return <span className="text-muted-foreground/50">—</span>
  return (
    <LongTextCell
      value={value}
      trigger={
        <img
          src={src}
          alt="icon"
          loading="lazy"
          className="size-7 rounded ring-1 ring-border object-contain"
        />
      }
    />
  )
}

function LongTextCell({ value, mono, trigger }: LongTextCellProps) { 
  const [open, setOpen] = React.useState(false)
  const [panelStyle, setPanelStyle] = React.useState<React.CSSProperties>({})
  const closeTimer = React.useRef<number | null>(null)
  const triggerRef = React.useRef<HTMLSpanElement | null>(null)

  function clearCloseTimer() {
    if (closeTimer.current !== null) {
      window.clearTimeout(closeTimer.current)
      closeTimer.current = null
    }
  }

  function scheduleClose() {
    clearCloseTimer()
    closeTimer.current = window.setTimeout(() => setOpen(false), LONG_TEXT_CLOSE_DELAY_MS)
  }

  function updatePanelPosition() {
    const trigger = triggerRef.current
    if (!trigger) return
    const rect = trigger.getBoundingClientRect()
    const viewportPadding = 16
    const maxWidth = Math.min(720, window.innerWidth - viewportPadding * 2)
    const left = Math.min(Math.max(rect.left, viewportPadding), window.innerWidth - maxWidth - viewportPadding)
    const top = Math.min(rect.bottom + 8, window.innerHeight - 120)
    setPanelStyle({ left, top, maxWidth })
  }

  function openPanel() {
    clearCloseTimer()
    updatePanelPosition()
    setOpen(true)
  }

  async function copyValue() {
    try {
      await navigator.clipboard.writeText(value)
      toast.success("已复制字段内容")
    } catch (error) {
      toast.error("复制失败", {
        description: error instanceof Error ? error.message : String(error),
      })
    }
  }

  React.useEffect(() => {
    if (!open) return
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false)
    }
    const handleReposition = () => updatePanelPosition()
    window.addEventListener("keydown", handleKeyDown)
    window.addEventListener("resize", handleReposition)
    window.addEventListener("scroll", handleReposition, true)
    return () => {
      window.removeEventListener("keydown", handleKeyDown)
      window.removeEventListener("resize", handleReposition)
      window.removeEventListener("scroll", handleReposition, true)
    }
  }, [open])

  React.useEffect(() => clearCloseTimer, [])

  return (
    <>
      <span
        ref={triggerRef}
        className={cn("block max-w-full", !trigger && "truncate")}
        onMouseEnter={openPanel}
        onMouseLeave={scheduleClose}
        onFocus={openPanel}
        onBlur={scheduleClose}
        tabIndex={0}
      >
        {trigger ?? value}
      </span>
      {open && (
        <div
          className="fixed z-50 w-[min(720px,80vw)] rounded-lg border border-border bg-popover text-popover-foreground shadow-lg outline-none"
          style={panelStyle}
          onMouseEnter={clearCloseTimer}
          onMouseLeave={() => setOpen(false)}
        >
          <div className="flex items-center justify-between gap-3 border-b border-border px-3 py-2">
            <div className="text-xs font-medium text-muted-foreground">字段内容</div>
            <Button type="button" variant="ghost" size="icon-sm" onClick={() => void copyValue()} title="复制字段内容">
              <Copy className="size-3.5" />
            </Button>
          </div>
          <div
            className={cn(
              "max-h-[min(420px,60vh)] overflow-auto whitespace-pre-wrap break-words px-3 py-2 text-xs leading-relaxed select-text",
              mono && "font-mono tabular-nums",
            )}
          >
            {value}
          </div>
        </div>
      )}
    </>
  )
}

export function ResultTable({
  columns,
  rows,
  page,
  pageSize,
  loading,
  empty,
  onPortClick,
  getPortHint,
  onHostClick,
  getHostHint,
  onIpClick,
  getIpHint,
}: {
  columns: ColumnDef[]
  rows: Row[]
  page: number
  pageSize: number
  loading?: boolean
  empty?: boolean
  onPortClick?: (port: string) => void
  getPortHint?: (port: string) => string
  onHostClick?: (host: string, row: Row) => void
  getHostHint?: (host: string, row: Row) => string
  onIpClick?: (ip: string) => void
  getIpHint?: (ip: string) => string
}) {
  const skeletonRows = 8
  const totalCols = columns.length + 1 // 含 # 列
  const pinCount = Math.min(PIN_COUNT, totalCols)

  // 表格最小宽度：# + 固定数据列 + 非固定列(每列至少 140px) + 尾部留白，保证列多时一定溢出可横滚
  const pinnedDataCols = Math.max(0, pinCount - 1)
  const nonPinnedDataCols = Math.max(0, columns.length - pinnedDataCols)
  const trailingPad = 32 // 尾部留白列宽，避免最后一列紧贴右边缘
  const minTableWidth = NUM_W + pinnedDataCols * COL_W + nonPinnedDataCols * SCROLL_COL_W + trailingPad

  // 表头单元格
  function renderHead(ci: number, content: React.ReactNode, extraClass?: string) {
    const pinned = ci < pinCount
    const lastPinned = ci === pinCount - 1
    return (
      <TableHead
        style={
          pinned
            ? { position: "sticky", left: pinLeft(ci), top: 0, width: pinWidth(ci), minWidth: pinWidth(ci), zIndex: 30 }
            : { position: "sticky", top: 0, zIndex: 10 }
        }
        className={cn(
          "border-b border-border bg-card text-xs text-muted-foreground",
          pinned && "shadow-[inset_-1px_0_0_0_var(--border)]",
          lastPinned && "shadow-[inset_-1px_0_0_0_var(--border),2px_0_8px_-2px_var(--border)]",
          extraClass,
        )}
      >
        {content}
      </TableHead>
    )
  }

  // 表体单元格
  function renderCellEl(
    ci: number,
    content: React.ReactNode,
    extraClass?: string,
    title?: string,
  ) {
    const pinned = ci < pinCount
    const lastPinned = ci === pinCount - 1
    return (
      <TableCell
        title={title}
        style={pinned ? { position: "sticky", left: pinLeft(ci), width: pinWidth(ci), minWidth: pinWidth(ci), zIndex: 20 } : undefined}
        className={cn(
          "border-b border-border",
          pinned && "bg-background group-hover/row:bg-muted/50",
          lastPinned && "shadow-[inset_-1px_0_0_0_var(--border)]",
          extraClass,
        )}
      >
        {content}
      </TableCell>
    )
  }

  function renderPortCell(port: string): React.ReactNode {
    if (!onPortClick) return port
    const hint = getPortHint?.(port) ?? `点击追加条件：&& port!="${port}" 并重新查询`
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className="font-mono text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            onClick={() => onPortClick(port)}
          >
            {port}
          </button>
        </TooltipTrigger>
        <TooltipContent sideOffset={4}>{hint}</TooltipContent>
      </Tooltip>
    )
  }

  function renderHostCell(host: string, row: Row): React.ReactNode {
    if (!onHostClick) return host
    const hint = getHostHint?.(host, row) ?? "在默认浏览器打开"
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className="max-w-full truncate text-left text-primary underline-offset-4 hover:underline hover:decoration-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            onClick={() => onHostClick(host, row)}
          >
            {host}
          </button>
        </TooltipTrigger>
        <TooltipContent sideOffset={4}>{hint}</TooltipContent>
      </Tooltip>
    )
  }

  function renderIpCell(ip: string): React.ReactNode {
    if (!onIpClick) return ip
    const hint = getIpHint?.(ip) ?? "跳转主机画像查询"
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className="font-mono tabular-nums text-primary underline-offset-4 hover:underline hover:decoration-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            onClick={() => onIpClick(ip)}
          >
            {ip}
          </button>
        </TooltipTrigger>
        <TooltipContent sideOffset={4}>{hint}</TooltipContent>
      </Tooltip>
    )
  }

  function renderValueContent(c: ColumnDef, value: string, row: Row): React.ReactNode {
    if (c.key === "ip") return renderIpCell(value)
    if (c.key === "port") return renderPortCell(value)
    if (c.key === "host") return renderHostCell(value, row)
    if (c.key === "status_code") return <StatusCodeCell value={value} />
    if (["protocol", "base_protocol", "product", "product.version"].includes(c.key)) return <ServiceBadgeCell value={value} />
    if (c.key === "location") return <LocationCell value={value} />
    if (c.key === "icon") return <IconImageCell value={value} />

    const fixedIcon = FIXED_FIELD_ICONS[c.key]
    const text = c.long ? <LongTextCell value={value} mono={c.mono} /> : value
    if (fixedIcon) return <IconTextCell value={text} icon={fixedIcon} mono={c.mono} />
    if (c.long) return <LongTextCell value={value} mono={c.mono} />
    return value
  }

  return (
    <TooltipProvider>
      <div className="min-w-0 flex-1 overflow-auto rounded-lg ring-1 ring-foreground/10">
      <table
        className="w-full table-fixed border-separate border-spacing-0 text-sm"
        style={{ minWidth: minTableWidth }}
      >
        <colgroup>
          <col style={{ width: NUM_W }} />
          {columns.map((_, i) => (
            <col key={i} style={{ width: i < pinnedDataCols ? COL_W : SCROLL_COL_W }} />
          ))}
          <col style={{ width: trailingPad }} />
        </colgroup>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            {renderHead(0, "#", "text-right")}
            {columns.map((c, i) => renderHead(i + 1, c.label))}
            <TableHead
              style={{ position: "sticky", top: 0, zIndex: 10 }}
              className="w-8 border-b border-border bg-card"
              aria-hidden
            />
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            Array.from({ length: skeletonRows }).map((_, i) => (
              <TableRow key={`sk-${i}`} className="group/row hover:bg-transparent">
                {renderCellEl(
                  0,
                  <Skeleton className="h-3 w-6" />,
                  "text-right text-xs text-muted-foreground",
                )}
                {columns.map((c, i) =>
                  renderCellEl(
                    i + 1,
                    <Skeleton className="h-3 w-full max-w-[160px]" />,
                  ),
                )}
                <TableCell className="w-8" aria-hidden />
              </TableRow>
            ))
          ) : empty ? (
            <TableRow className="hover:bg-transparent">
              <TableCell colSpan={totalCols} className="h-40 border-b border-border text-center text-sm text-muted-foreground">
                没有匹配结果
              </TableCell>
            </TableRow>
          ) : (
            rows.map((row, i) => {
              const no = (page - 1) * pageSize + i + 1
              return (
                <TableRow key={i} className="group/row">
                  {renderCellEl(
                    0,
                    no,
                    "text-right font-mono tabular-nums text-xs text-muted-foreground",
                  )}
                  {columns.map((c, ci) => {
                    const v = renderCell(c, row)
                    const content = v ? renderValueContent(c, v, row) : <span className="text-muted-foreground/50">—</span>

                    return renderCellEl(
                      ci + 1,
                      content,
                      cn(
                        "text-xs",
                        c.mono && c.key !== "port" && "font-mono tabular-nums",
                        c.long && "max-w-[240px] truncate",
                      ),
                      undefined,
                    )
                  })}
                  <TableCell className="w-8" aria-hidden />
                </TableRow>
              )
            })
          )}
        </TableBody>
      </table>
      </div>
    </TooltipProvider>
  )
}
