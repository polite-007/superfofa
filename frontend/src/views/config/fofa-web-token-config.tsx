import { useEffect, useMemo, useRef, useState } from "react"
import { ExternalLink, Eye, EyeOff, Save, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { BrowserOpenURL } from "../../../wailsjs/runtime/runtime"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { setFofaWebToken, type KeyConfig } from "./use-config-data"

type TokenStatus = {
  label: string
  variant: "outline" | "secondary" | "destructive"
  help: string
}

type TokenExpiry = {
  text: string
  expired: boolean
}

function isJwtLike(token: string): boolean {
  if (!token) return true
  const parts = token.split(".")
  return parts.length === 3 && parts.every((part) => part.trim().length > 0)
}

function decodeBase64Url(input: string): string {
  const normalized = input.replace(/-/g, "+").replace(/_/g, "/")
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=")
  const binary = atob(padded)
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0))
  return new TextDecoder().decode(bytes)
}

function formatDateTime(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, "0")
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function tokenExpiry(token: string): TokenExpiry | null {
  const parts = token.split(".")
  if (parts.length !== 3) return null

  try {
    const payload = JSON.parse(decodeBase64Url(parts[1])) as { exp?: unknown }
    if (typeof payload.exp !== "number" || !Number.isFinite(payload.exp)) return null

    const expiresAt = new Date(payload.exp * 1000)
    if (Number.isNaN(expiresAt.getTime())) return null

    return {
      text: formatDateTime(expiresAt),
      expired: expiresAt.getTime() <= Date.now(),
    }
  } catch {
    return null
  }
}

function tokenTail(token: string): string {
  return token ? `****${token.slice(-4)}` : ""
}

function errorDescription(error: unknown, sensitiveValues: string[] = []): string {
  let message = String(error)
  for (const value of sensitiveValues) {
    if (value) message = message.replaceAll(value, "[redacted]")
  }
  return message
}

function tokenStatus(configured: boolean, expiry: TokenExpiry | null): TokenStatus {
  if (!configured) {
    return {
      label: "未配置",
      variant: "outline",
      help: "请按下方步骤复制 fofa_token，粘贴后保存。",
    }
  }

  if (expiry?.expired) {
    return {
      label: "可能已过期",
      variant: "destructive",
      help: "Token 已超过 JWT exp 时间，请重新复制并手动更新。",
    }
  }

  if (expiry) {
    return {
      label: "已配置",
      variant: "secondary",
      help: `预计过期：${expiry.text}`,
    }
  }

  return {
    label: "已配置",
    variant: "secondary",
    help: "无法解析过期时间，使用时如失败请重新复制。",
  }
}

export function FofaWebTokenConfig({
  config,
  setConfig,
}: {
  config: KeyConfig
  setConfig: React.Dispatch<React.SetStateAction<KeyConfig | null>>
}) {
  const [token, setToken] = useState(config.fofa_web_token || "")
  const [show, setShow] = useState(false)
  const [saving, setSaving] = useState(false)
  const lastSyncedConfiguredTokenRef = useRef(config.fofa_web_token || "")

  useEffect(() => {
    const nextConfiguredToken = config.fofa_web_token || ""
    setToken((currentToken) => {
      const lastSyncedConfiguredToken = lastSyncedConfiguredTokenRef.current
      lastSyncedConfiguredTokenRef.current = nextConfiguredToken
      return currentToken.trim() === lastSyncedConfiguredToken ? nextConfiguredToken : currentToken
    })
  }, [config.fofa_web_token])

  const configuredToken = config.fofa_web_token || ""
  const configured = Boolean(configuredToken)
  const trimmed = token.trim()
  const expiry = useMemo(() => tokenExpiry(configuredToken), [configuredToken])
  const status = useMemo(() => tokenStatus(configured, expiry), [configured, expiry])
  const changed = trimmed !== configuredToken

  const handleSave = async () => {
    if (!isJwtLike(trimmed)) {
      toast.error("Token 格式不正确", { description: "请粘贴 fofa_token 的完整 JWT 值" })
      return
    }

    setSaving(true)
    try {
      const saved = await setFofaWebToken(trimmed)
      setConfig(saved)
      setToken(saved.fofa_web_token || "")
      lastSyncedConfiguredTokenRef.current = saved.fofa_web_token || ""
      toast.success(trimmed ? "FOFA 用户 Token 已保存" : "FOFA 用户 Token 已清空")
    } catch (e) {
      toast.error("保存失败", { description: errorDescription(e, [trimmed, configuredToken]) })
    } finally {
      setSaving(false)
    }
  }

  const handleClear = async () => {
    setSaving(true)
    try {
      const saved = await setFofaWebToken("")
      setConfig(saved)
      setToken("")
      lastSyncedConfiguredTokenRef.current = saved.fofa_web_token || ""
      toast.success("FOFA 用户 Token 已清空")
    } catch (e) {
      toast.error("清空失败", { description: errorDescription(e, [configuredToken]) })
    } finally {
      setSaving(false)
    }
  }

  const handleOpenFofa = () => {
    BrowserOpenURL("https://fofa.info")
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border bg-card p-4 ring-1 ring-foreground/10">
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <Label htmlFor="cfg-fofa-web-token">FOFA 用户 Token</Label>
          <Badge variant={status.variant}>{status.label}</Badge>
        </div>
        {configured && <span className="shrink-0 text-xs text-muted-foreground">{tokenTail(configuredToken)}</span>}
      </div>

      <div className="relative min-w-0">
        <Input
          id="cfg-fofa-web-token"
          type={show ? "text" : "password"}
          placeholder="粘贴 fofa_token"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          disabled={saving}
          className="pr-9"
        />
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="absolute right-0.5 top-0.5"
          onClick={() => setShow((value) => !value)}
          disabled={saving}
          aria-label={show ? "隐藏 Token" : "显示 Token"}
        >
          {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">{status.help}</p>

      <ol className="list-decimal space-y-1 pl-4 text-xs text-muted-foreground">
        <li>在浏览器登录 fofa.info。</li>
        <li>按 F12 打开开发者工具。</li>
        <li>进入 Application / 应用 → Cookies → https://fofa.info。</li>
        <li>找到 fofa_token，复制 Value 后粘贴到这里保存。</li>
      </ol>

      <div className="flex flex-wrap justify-end gap-2">
        <Button type="button" variant="outline" size="sm" onClick={handleOpenFofa} disabled={saving}>
          <ExternalLink className="size-4" />
          打开 FOFA
        </Button>
        <Button type="button" size="sm" onClick={handleSave} disabled={saving || !changed}>
          <Save className="size-4" />
          {saving ? "保存中..." : "保存"}
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={handleClear} disabled={saving || (!configured && !trimmed)}>
          <Trash2 className="size-4" />
          清空
        </Button>
      </div>
    </div>
  )
}
