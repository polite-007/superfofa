import { useState } from "react"
import { ChevronRight, Copy, ExternalLink, FileText, Globe, Search, Server } from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import {
  CARD_FIELD_MAP,
  cardHostLabel,
  cardJumpUrl,
  cardStatusTone,
  cardTitle,
  isCardFieldSupported,
  isWebAsset,
  renderCardFieldValue,
  type CardFieldDef,
  type CardSettings,
} from "./card-fields"

type Row = Record<string, string>

const CERT_KEYS = ["cert", "jarm", "tls.version"]

const STATUS_TONE: Record<string, string> = {
  ok: "text-emerald-600 dark:text-emerald-400",
  warn: "text-amber-600 dark:text-amber-400",
  err: "text-rose-600 dark:text-rose-400",
}

async function copyText(value: string) {
  try {
    await navigator.clipboard.writeText(value)
    toast.success("已复制")
  } catch {
    toast.error("复制失败")
  }
}

function CopyButton({
  value,
  label,
  className,
}: {
  value: string
  label: string
  className?: string
}) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation()
        void copyText(value)
      }}
      title={`复制${label}`}
      aria-label={`复制${label}`}
      className={cn(
        "inline-flex size-[18px] shrink-0 items-center justify-center rounded text-muted-foreground opacity-0 transition-opacity hover:bg-muted hover:text-foreground group-hover/row:opacity-100 group-hover/block:opacity-100 focus-visible:opacity-100",
        className,
      )}
    >
      <Copy className="size-2.5" />
    </button>
  )
}

function HostAction({
  title,
  icon,
  onClick,
}: {
  title: string
  icon: React.ReactNode
  onClick: () => void
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={onClick}
      className="inline-flex size-[22px] shrink-0 items-center justify-center rounded text-muted-foreground opacity-65 transition-[background-color,color,opacity] hover:bg-muted hover:text-foreground hover:opacity-100"
    >
      {icon}
    </button>
  )
}

function MetaRow({
  label,
  value,
  bold = false,
  mono = false,
  copy = true,
}: {
  label: string
  value: string
  bold?: boolean
  mono?: boolean
  copy?: boolean
}) {
  const empty = value === "-" || value === ""
  return (
    <div className="group/row flex min-w-0 items-center gap-2.5 text-[13px] leading-[1.5]">
      <span className="w-[64px] shrink-0 text-[11.5px] text-muted-foreground">{label}</span>
      <span
        className={cn(
          "min-w-0 flex-1 truncate",
          empty
            ? "text-muted-foreground"
            : bold
              ? "font-semibold text-foreground"
              : "text-foreground/90",
          mono && "font-mono text-[12.5px]",
        )}
        title={value}
      >
        {value}
      </span>
      {copy && !empty ? <CopyButton value={value} label={label} /> : null}
    </div>
  )
}

function ContentSection({ field, value }: { field: CardFieldDef; value: string }) {
  const [expanded, setExpanded] = useState(false)
  const tag = field.blockTag ?? field.label
  const long = value.split("\n").length > 8 || value.length > 800

  return (
    <div className="flex min-h-0 flex-1 flex-col rounded-[10px] border" data-no-card-click>
      <div className="flex min-h-9 shrink-0 items-center gap-2 px-2.5 text-[13px]">
        <span className="text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
          {tag}
        </span>
        <CopyButton
          value={value}
          label={tag}
          className="ml-auto opacity-100 hover:bg-transparent"
        />
      </div>
      <div
        className={cn(
          "relative min-h-0 bg-muted/50 px-2.5 py-2.5 font-mono text-[11.5px] leading-[1.5] break-all whitespace-pre-wrap text-muted-foreground [scrollbar-width:thin]",
          long && !expanded
            ? "max-h-[150px] overflow-hidden"
            : "flex-1 overflow-y-auto",
        )}
      >
        {value}
        {long && !expanded ? (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-muted to-transparent" />
        ) : null}
      </div>
      {long ? (
        <div className="mt-auto flex shrink-0 justify-end border-t px-2.5 py-1.5">
          <button
            type="button"
            onClick={() => setExpanded((prev) => !prev)}
            className="inline-flex items-center gap-0.5 rounded px-1 py-0.5 text-[11px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            {expanded ? "收起" : "展开全部"}
            <ChevronRight
              className={cn("size-3 transition-transform", expanded && "rotate-90")}
            />
          </button>
        </div>
      ) : null}
    </div>
  )
}

export type AssetCardProps = {
  row: Row
  settings: CardSettings
  preview?: boolean
  onOpenUrl?: (url: string) => void
  onOpenHost?: (ip: string) => void
}

export function AssetCard({ row, settings, preview = false, onOpenUrl, onOpenHost }: AssetCardProps) {
  const [certOpen, setCertOpen] = useState(false)
  const [bodyOpen, setBodyOpen] = useState(false)

  const web = isWebAsset(row)
  const title = cardTitle(row)
  const hostLabel = cardHostLabel(row)
  const jumpUrl = cardJumpUrl(row)
  const protocol = (row.protocol ?? "").trim()
  const rawStatus = (row.status_code ?? "").trim()
  const status = /^[1-5]\d{2}$/.test(rawStatus) ? rawStatus : ""
  const statusTone = cardStatusTone(status)
  const ip = (row.ip ?? "").trim()
  const host = (row.host ?? "").trim()
  const bodyText = (row.body ?? "").trim()
  const bodySelected = settings.fields.includes("body")
  const canViewBody =
    web &&
    bodySelected &&
    (settings.tier === "business" || settings.tier === "enterprise")

  const visibleFields = settings.fields
    .map((key) => CARD_FIELD_MAP[key])
    .filter((field): field is CardFieldDef => Boolean(field))
    .filter((field) => isCardFieldSupported(field, settings.tier))
    .map((field) => ({ field, value: renderCardFieldValue(field, row) }))
    .filter(({ value }) => Boolean(value))

  const leftFields = visibleFields.filter(
    ({ field }) => !field.block && !CERT_KEYS.includes(field.key),
  )
  const contentFields = visibleFields.filter(({ field }) => {
    if (!field.block) return false
    // Body 只通过左下角「查看正文」弹窗展示，不在卡片右侧重复渲染
    if (field.key === "body") return false
    if (field.key === "header") return web
    if (field.key === "banner") return !web
    return true
  })
  const certFields = visibleFields.filter(({ field }) => CERT_KEYS.includes(field.key))
  const certValue = certFields.find(({ field }) => field.key === "cert")?.value ?? ""
  const jarmValue = certFields.find(({ field }) => field.key === "jarm")?.value ?? ""
  const tlsValue = certFields.find(({ field }) => field.key === "tls.version")?.value ?? ""
  const certCopyValue = certValue || jarmValue

  function openHostTarget() {
    if (preview) return
    if (web && jumpUrl) {
      onOpenUrl?.(jumpUrl)
      return
    }
    if (ip) onOpenHost?.(ip)
    else if (host) onOpenHost?.(host)
  }

  function openHostProfile() {
    if (preview) return
    if (ip) onOpenHost?.(ip)
    else if (host) onOpenHost?.(host)
  }

  function handleCardClick(e: React.MouseEvent<HTMLElement>) {
    if (preview) return
    const target = e.target as HTMLElement
    if (target.closest("button, a, input, textarea, select, [data-no-card-click]")) return
    openHostTarget()
  }

  return (
    <article
      className={cn(
        "group/card flex cursor-pointer flex-col rounded-[20px] border border-foreground/10 bg-card p-5 text-card-foreground transition-[border-color,box-shadow] hover:border-foreground/20 hover:shadow-sm",
        preview && "pointer-events-none",
      )}
      onClick={handleCardClick}
    >
      <div className="flex min-w-0 items-center gap-2.5">
        {settings.tier !== "personal" ? (
          <div
            className="grid size-[30px] shrink-0 place-items-center rounded-md bg-muted text-muted-foreground"
            title={web ? "网站资产" : "协议资产"}
          >
            {web ? <Globe className="size-4" /> : <Server className="size-4" />}
          </div>
        ) : null}

        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
          <div className={cn("flex min-w-0 items-center gap-1", preview ? "w-full" : "flex-1")}>
            <button
              type="button"
              onClick={openHostTarget}
              title={web ? "打开站点" : "打开主机画像"}
              className={cn(
                "min-w-0 truncate text-left font-mono text-[18px] font-semibold leading-snug hover:underline hover:underline-offset-2",
                preview && "text-[15px]",
              )}
            >
              {hostLabel || "-"}
            </button>
            {hostLabel ? (
              <>
                <HostAction
                  title="复制 host"
                  icon={<Copy className="size-3" />}
                  onClick={() => void copyText(hostLabel)}
                />
                <HostAction
                  title={web ? "跳转 host" : "打开主机画像"}
                  icon={<ExternalLink className="size-3" />}
                  onClick={openHostTarget}
                />
              </>
            ) : null}
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <Badge
              variant="outline"
              className={cn(
                "h-6 px-2 py-0 text-[10.5px] font-semibold",
                web
                  ? "border-emerald-500/40 text-emerald-600 dark:text-emerald-400"
                  : "border-amber-500/50 text-amber-600 dark:text-amber-400",
              )}
            >
              {web ? "网站" : "协议"}
            </Badge>
            {protocol ? (
              <Badge variant="outline" className="h-6 px-2 py-0 text-[11.5px] font-medium">
                {protocol}
              </Badge>
            ) : null}
            {status ? (
              <span
                className={cn(
                  "inline-flex items-center gap-1 text-[12.5px] tabular-nums",
                  STATUS_TONE[statusTone] ?? "text-muted-foreground",
                )}
              >
                <i className="size-2 rounded-full bg-current" />
                {status}
              </span>
            ) : null}
          </div>
        </div>
      </div>

      <div className="mt-4 border-t border-border/70 pt-4">
        <div
          className={cn(
            "grid grid-cols-1 gap-5",
            !preview && "xl:grid-cols-[minmax(250px,0.85fr)_minmax(0,1.35fr)]",
          )}
        >
          <div className="flex min-h-0 min-w-0 flex-col gap-2">
            <MetaRow label="标题" value={title} bold copy={title !== "-"} />
            {leftFields.map(({ field, value }) => (
              <MetaRow
                key={field.key}
                label={field.label}
                value={value}
                mono={field.mono}
              />
            ))}

            <div className="mt-auto flex items-center gap-1 pt-2">
              <button
                type="button"
                onClick={openHostProfile}
                title="打开主机画像"
                aria-label="打开主机画像"
                className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <Server className="size-4" />
              </button>
              {canViewBody ? (
                <button
                  type="button"
                  onClick={() => setBodyOpen(true)}
                  title="查看正文"
                  aria-label="查看正文"
                  className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  <FileText className="size-4" />
                </button>
              ) : null}
            </div>
          </div>

          <div className="flex min-h-0 min-w-0 flex-col gap-3" data-no-card-click>
            {contentFields.map(({ field, value }) => (
              <ContentSection key={field.key} field={field} value={value} />
            ))}
          </div>
        </div>

        {certFields.length > 0 ? (
          <div className="mt-3 rounded-[10px] border px-2.5" data-no-card-click>
            <div className="flex min-h-9 items-center gap-2 text-[13px]">
              <button
                type="button"
                onClick={() => setCertOpen((prev) => !prev)}
                title={certOpen ? "收起证书" : "展开证书"}
                aria-label={certOpen ? "收起证书" : "展开证书"}
                className="inline-flex size-5 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <ChevronRight
                  className={cn("size-3.5 transition-transform", certOpen && "rotate-90")}
                />
              </button>
              <span>Certificate</span>
              <div className="ml-auto flex min-w-0 items-center gap-1.5">
                {tlsValue ? (
                  <Badge variant="outline" className="h-5 px-1.5 py-0 text-[9.5px]">
                    {tlsValue}
                  </Badge>
                ) : null}
                {jarmValue ? (
                  <Badge
                    variant="outline"
                    className="h-5 max-w-[92px] truncate px-1.5 py-0 text-[9.5px]"
                    title={jarmValue}
                  >
                    {jarmValue.slice(0, 8)}...
                  </Badge>
                ) : null}
                {certCopyValue ? (
                  <CopyButton
                    value={certCopyValue}
                    label="证书"
                    className="opacity-100 hover:bg-transparent"
                  />
                ) : null}
              </div>
            </div>
            {certOpen ? (
              <div className="pb-2.5 text-[12px] leading-relaxed break-all text-muted-foreground">
                {certValue ? <div>{certValue}</div> : null}
                {jarmValue ? (
                  <div className="mt-1.5 rounded-md bg-muted/50 p-2 font-mono text-[10.5px] whitespace-pre-wrap">
                    {jarmValue}
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      <Dialog open={bodyOpen} onOpenChange={setBodyOpen}>
        <DialogContent className="flex max-h-[85vh] flex-col sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>正文</DialogTitle>
            <DialogDescription className="truncate">{hostLabel || title}</DialogDescription>
          </DialogHeader>
          <div className="min-h-0 flex-1 overflow-y-auto rounded-md border bg-muted/30 p-3 font-mono text-xs leading-relaxed break-all whitespace-pre-wrap">
            {bodyText || "暂无正文"}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void copyText(bodyText)}
              disabled={!bodyText}
            >
              <Copy className="size-3.5" />
              复制正文
            </Button>
            <Button size="sm" onClick={() => setBodyOpen(false)}>
              关闭
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </article>
  )
}

export function CardView({
  rows,
  settings,
  loading,
  empty,
  onOpenUrl,
  onOpenHost,
}: {
  rows: Row[]
  settings: CardSettings
  loading: boolean
  empty: boolean
  onOpenUrl?: (url: string) => void
  onOpenHost?: (ip: string) => void
}) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-4">
        {Array.from({ length: 2 }).map((_, index) => (
          <CardSkeleton key={index} />
        ))}
      </div>
    )
  }

  if (empty) {
    return (
      <div className="flex min-h-[220px] flex-1 flex-col items-center justify-center gap-2 text-muted-foreground">
        <div className="grid size-11 place-items-center rounded-full bg-muted">
          <Search className="size-5" />
        </div>
        <span className="text-sm font-medium text-foreground">没有匹配结果</span>
        <span className="text-xs">换一个查询语法，或放宽筛选条件后重试</span>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-4">
      {rows.map((row, index) => (
        <AssetCard
          key={`${row.ip ?? ""}-${row.port ?? ""}-${index}`}
          row={row}
          settings={settings}
          onOpenUrl={onOpenUrl}
          onOpenHost={onOpenHost}
        />
      ))}
    </div>
  )
}

function CardSkeleton() {
  return (
    <div className="flex flex-col gap-4 rounded-[20px] border border-foreground/10 bg-card p-5">
      <div className="flex items-center gap-3">
        <Skeleton className="size-[30px] shrink-0 rounded-md" />
        <div className="flex flex-1 flex-col gap-1.5">
          <Skeleton className="h-4 w-2/5" />
          <Skeleton className="h-2.5 w-1/4" />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 border-t border-border/70 pt-4 xl:grid-cols-[minmax(250px,0.85fr)_minmax(0,1.35fr)]">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-4/5" />
          <Skeleton className="h-3 w-3/5" />
          <Skeleton className="h-3 w-4/5" />
        </div>
        <div className="flex flex-col gap-2">
          <Skeleton className="h-3 w-1/6" />
          <Skeleton className="h-[150px] w-full" />
        </div>
      </div>
    </div>
  )
}
