import { useEffect, useMemo, useState } from "react"
import { Check, Lock } from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { TIER_LABEL, TIER_TONE } from "./columns"
import { AssetCard } from "./card-view"
import {
  CARD_FIELD_GROUPS,
  CARD_FIELD_MAP,
  CARD_TIER_AVAILABLE,
  CARD_TIER_OPTIONS,
  DEFAULT_CARD_FIELDS,
  DEFAULT_CARD_TIER,
  MAX_CARD_FIELDS,
  cardFieldsByGroup,
  isCardFieldSupported,
  normalizeCardSettings,
  type CardSettings,
  type CardTier,
} from "./card-fields"

const PREVIEW_ROW: Record<string, string> = {
  ip: "123.124.158.32",
  port: "443",
  protocol: "https",
  host: "www.gwbn.net.cn",
  title: "长城宽带 - 官方门户",
  domain: "gwbn.net.cn",
  link: "https://www.gwbn.net.cn",
  status_code: "200",
  country_name: "中国",
  region: "北京",
  city: "北京",
  os: "Linux",
  server: "nginx",
  asn: "4808",
  org: "中国联通",
  "cert.subject.cn": "*.gwbn.net.cn",
  "cert.issuer.cn": "DigiCert TLS RSA SHA256 2020 CA1",
  "cert.not_before": "2026-03-01",
  "cert.not_after": "2027-02-28",
  jarm: "29d29d00029d29d21c29d29d29d29d2e0f1b4c8a7d3e6b9f0a2c5d8e1f4a7b0c3d6e9f2a5b8c1d4e7f0a3b6c9d2e5f",
  header:
    "HTTP/1.1 200 OK\nServer: nginx/1.24.0\nContent-Type: text/html; charset=utf-8\nX-Frame-Options: SAMEORIGIN\nStrict-Transport-Security: max-age=31536000",
  banner:
    "HTTP/1.1 200 OK\nServer: nginx/1.24.0\nContent-Type: text/html; charset=utf-8\nContent-Length: 18234",
  body: '<!DOCTYPE html>\n<html lang="zh-CN">\n<head>\n<meta charset="utf-8">\n<title>长城宽带 - 官方门户</title>\n</head>\n<body>\n<div class="header">长城宽带</div>\n<div class="banner">高速宽带 · 稳定网络 · 贴心服务</div>\n</body>\n</html>',
  product: "nginx",
  product_category: "Web 服务器",
  "product.version": "1.24.0",
  lastupdatetime: "2026-08-21",
  cname: "cdn.gwbn.net.cn",
  "tls.version": "TLS 1.3",
  "tls.ja3s": "ec74a5c51106f0419184d0dd08fb05bc",
  header_hash: "4f2a9c1e7b3d",
  banner_hash: "e91b7c24a0f6",
}

export function CardSettingsDialog({
  open,
  onOpenChange,
  settings,
  onApply,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  settings: CardSettings
  onApply: (settings: CardSettings) => void
}) {
  const [draft, setDraft] = useState<CardSettings>(() => normalizeCardSettings(settings))

  useEffect(() => {
    if (open) setDraft(normalizeCardSettings(settings))
  }, [open, settings])

  const previewRow = PREVIEW_ROW

  const selectedSet = useMemo(() => new Set(draft.fields), [draft.fields])

  function setTier(tier: CardTier) {
    if (tier === draft.tier) return
    const removed = draft.fields.filter((key) => {
      const field = CARD_FIELD_MAP[key]
      return field ? !isCardFieldSupported(field, tier) : true
    })
    setDraft((prev) => ({
      tier,
      fields: prev.fields.filter((key) => !removed.includes(key)),
    }))
    if (removed.length > 0) {
      toast.info(`已移除超出${TIER_LABEL[tier]}权限的字段`, {
        description: removed.map((key) => CARD_FIELD_MAP[key]?.label ?? key).join("、"),
      })
    }
  }

  function toggleField(key: string) {
    const field = CARD_FIELD_MAP[key]
    if (!field || !isCardFieldSupported(field, draft.tier)) return

    if (draft.fields.includes(key)) {
      setDraft((prev) => ({
        ...prev,
        fields: prev.fields.filter((item) => item !== key),
      }))
      return
    }

    if (draft.fields.length >= MAX_CARD_FIELDS) {
      toast.warning(`最多选择 ${MAX_CARD_FIELDS} 项卡片字段`)
      return
    }

    setDraft((prev) => ({ ...prev, fields: [...prev.fields, key] }))
  }

  function reset() {
    setDraft({
      tier: DEFAULT_CARD_TIER,
      fields: [...DEFAULT_CARD_FIELDS],
    })
    toast.info("已恢复默认卡片设置")
  }

  function apply() {
    onApply(normalizeCardSettings(draft))
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[88vh] flex-col overflow-hidden sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>卡片设置</DialogTitle>
          <DialogDescription>
            选择你使用的 FOFA 会员等级与卡片信息区字段。等级决定哪些字段可勾选；当前等级支持的字段带勾，超出等级的字段带锁置灰。个人版不显示站点图标占位。Header 与 Banner 按资产类型互斥展示。
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto pr-1">
        <div className="rounded-lg border bg-muted/30 p-3">
          <div className="mb-2 flex items-center gap-2">
            <span className="text-[10.5px] font-semibold uppercase tracking-wide text-muted-foreground">
              我的会员等级
            </span>
            <span className="ml-auto text-[10px] text-muted-foreground">
              当前可用：{CARD_TIER_AVAILABLE[draft.tier]}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
            {CARD_TIER_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                aria-pressed={draft.tier === option.value}
                onClick={() => setTier(option.value)}
                className={cn(
                  "rounded-md border bg-background px-2.5 py-2 text-left transition-colors hover:bg-muted",
                  draft.tier === option.value &&
                    "border-foreground/35 shadow-[0_0_0_1px] shadow-foreground/25",
                )}
              >
                <span className="flex items-center gap-1 text-[11.5px] font-semibold">
                  {option.label}
                  <Check
                    className={cn(
                      "ml-auto size-3 transition-opacity",
                      draft.tier === option.value ? "opacity-100" : "opacity-0",
                    )}
                  />
                </span>
                <span className="mt-0.5 block text-[9px] leading-snug text-muted-foreground">
                  {option.desc}
                </span>
              </button>
            ))}
          </div>
          <p className="mt-2 text-[9.5px] leading-relaxed text-muted-foreground">
            卡片身份区（图标 / 标题 / 主机 / URL / 协议 / 状态码）固定展示，不占用信息区名额。网站资产与协议资产共用同一套字段配置，字段为空时自动隐藏。
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_320px]">
          <div className="flex flex-col gap-4">
            {CARD_FIELD_GROUPS.map((group) => (
              <div key={group} className="flex flex-col gap-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-[10.5px] font-semibold uppercase tracking-wide text-muted-foreground">
                    {group}
                  </span>
                  <span className="h-px flex-1 bg-border/70" />
                </div>
                <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
                  {cardFieldsByGroup(group).map((field) => {
                    const supported = isCardFieldSupported(field, draft.tier)
                    const checked = selectedSet.has(field.key)
                    return (
                      <label
                        key={field.key}
                        title={
                          supported
                            ? "当前等级支持，可勾选"
                            : `需要${TIER_LABEL[field.tier]}，升级等级后可勾选`
                        }
                        className={cn(
                          "flex min-h-8 min-w-0 cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-[11.5px] transition-colors hover:bg-muted/60",
                          !supported && "pointer-events-none opacity-45",
                        )}
                      >
                        <Checkbox
                          checked={checked}
                          disabled={!supported}
                          onCheckedChange={() => toggleField(field.key)}
                        />
                        <span className="min-w-0 flex-1 truncate">{field.label}</span>
                        <Badge
                          variant="outline"
                          className={cn(
                            "h-4 shrink-0 border-transparent px-1 py-0 text-[9px]",
                            TIER_TONE[field.tier],
                          )}
                        >
                          {TIER_LABEL[field.tier]}
                        </Badge>
                        {supported ? (
                          <Check className="size-3 shrink-0 text-emerald-500" />
                        ) : (
                          <Lock className="size-3 shrink-0 text-muted-foreground" />
                        )}
                      </label>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>

          <aside className="self-start md:sticky md:top-0">
            <div className="mb-2 flex items-center gap-2">
              <span className="text-[10px] text-muted-foreground">实时预览</span>
              <span className="h-px flex-1 bg-border/70" />
            </div>
            <div className="w-full">
              <AssetCard
                row={previewRow}
                settings={{ tier: draft.tier, fields: draft.fields }}
                preview
              />
            </div>
            <p className="mt-2 text-[10px] leading-relaxed text-muted-foreground">
              勾选当前等级支持的字段即可；超出等级的字段带锁。网站资产优先看 Header / 证书 / JARM，协议资产优先看 Banner / 产品。信息区最多{" "}
              <b className="font-semibold text-foreground">{MAX_CARD_FIELDS}</b> 项。
            </p>
          </aside>
        </div>
        </div>

        <DialogFooter className="gap-2">
          <span className="mr-auto text-xs text-muted-foreground">
            已选 <span className="font-medium text-foreground">{draft.fields.length}</span> /{" "}
            {MAX_CARD_FIELDS} 项
          </span>
          <Button variant="ghost" size="sm" onClick={reset}>
            恢复默认
          </Button>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button size="sm" onClick={apply}>
            <Check className="size-3.5" />
            应用
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
