import * as React from "react"
import { AlertCircle, CheckCircle2, Download, RefreshCw } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { BrowserOpenURL, EventsOn } from "../../../wailsjs/runtime/runtime"
import {
  CancelUpdate,
  CheckUpdate,
  GetUpdateState,
  InstallAndRestart,
  StartUpdate,
} from "../../../wailsjs/go/app/App"
import { app } from "../../../wailsjs/go/models"

type Phase = app.UpdateState["phase"]

const idleState = new app.UpdateState({ phase: "idle" })

function isBusy(phase: Phase) {
  return ["checking", "downloading", "verifying", "extracting", "installing"].includes(phase)
}

function hasUpdateBadge(phase: Phase) {
  return ["available", "ready"].includes(phase)
}

function formatBytes(bytes?: number) {
  const value = bytes ?? 0
  if (value < 1024) return `${value} B`
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`
  return `${(value / 1024 / 1024).toFixed(1)} MB`
}

function progressText(state: app.UpdateState) {
  if (state.total && state.total > 0 && state.percent != null) {
    return `${state.percent.toFixed(1)}%（${formatBytes(state.downloaded)} / ${formatBytes(state.total)}）`
  }
  return `已下载 ${formatBytes(state.downloaded)}`
}

export function CheckUpdateButton() {
  const [state, setState] = React.useState<app.UpdateState>(idleState)
  const [open, setOpen] = React.useState(false)
  const toastVersions = React.useRef(new Set<string>())

  const applyState = React.useCallback((next: app.UpdateState) => {
    const normalized = app.UpdateState.createFrom(next)
    setState(normalized)
    if (normalized.auto_toast && normalized.info?.latest_version && !toastVersions.current.has(normalized.info.latest_version)) {
      toastVersions.current.add(normalized.info.latest_version)
      toast.info("发现新版本", {
        description: `最新版本 ${normalized.info.latest_version}，点击右上角更新图标查看`,
      })
    }
    if (normalized.phase === "ready" || normalized.phase === "installing") {
      setOpen(true)
    }
  }, [])

  React.useEffect(() => {
    const off = EventsOn("update:state", (payload: app.UpdateState) => {
      applyState(payload)
    })
    GetUpdateState().then(applyState).catch(() => {})
    return () => {
      off?.()
    }
  }, [applyState])

  const handleCheck = async () => {
    if (isBusy(state.phase)) {
      setOpen(true)
      return
    }
    if (["available", "ready", "error"].includes(state.phase)) {
      setOpen(true)
      return
    }
    setState(app.UpdateState.createFrom({ phase: "checking" }))
    try {
      const res = await CheckUpdate()
      if (!res.has_update) {
        setState(app.UpdateState.createFrom({ phase: "idle", info: res }))
        toast.success("当前已是最新版本", {
          description: `版本 ${res.current_version}`,
        })
      } else {
        const next = app.UpdateState.createFrom({
          phase: "available",
          info: res,
          manual_only_reason: res.manual_only_reason,
        })
        setState(next)
        setOpen(true)
      }
    } catch (e) {
      const message = String(e)
      setState(app.UpdateState.createFrom({ phase: "error", message }))
      toast.error("检查更新失败", { description: message })
    }
  }

  const handleStartUpdate = async () => {
    try {
      const next = await StartUpdate()
      applyState(next)
    } catch (e) {
      toast.error("启动更新失败", { description: String(e) })
      try {
        const next = await GetUpdateState()
        applyState(next)
      } catch {
        setState(app.UpdateState.createFrom({ phase: "error", message: String(e), info: state.info }))
      }
    }
  }

  const handleCancel = async () => {
    try {
      await CancelUpdate()
    } catch (e) {
      toast.error("取消更新失败", { description: String(e) })
    }
  }

  const handleInstall = async () => {
    try {
      await InstallAndRestart()
    } catch (e) {
      toast.error("安装更新失败", { description: String(e) })
    }
  }

  const handleManualDownload = () => {
    const url = state.info?.download_url || state.info?.release_url
    if (url) BrowserOpenURL(url)
  }

  const preventClose = state.phase === "ready" || state.phase === "installing"
  const loading = isBusy(state.phase)
  const title = state.phase === "available"
    ? "发现新版本"
    : state.phase === "ready"
      ? "更新准备就绪"
      : state.phase === "downloading"
        ? "正在下载更新"
        : "检查更新"

  return (
    <>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={title}
        title={title}
        onClick={handleCheck}
        disabled={state.phase === "checking"}
        className={`wails-drag-none relative ${hasUpdateBadge(state.phase) ? "text-primary" : ""}`}
      >
        <RefreshCw className={loading ? "animate-spin" : undefined} />
        {hasUpdateBadge(state.phase) && (
          <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-destructive" />
        )}
      </Button>

      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (preventClose && !next) return
          setOpen(next)
        }}
      >
        <DialogContent className="sm:max-w-md" showCloseButton={!preventClose}>
          <DialogHeader>
            <div className="flex items-center gap-2">
              <DialogTitle>{dialogTitle(state)}</DialogTitle>
              {state.info?.latest_version && (
                <Badge variant="secondary" className="text-[10px]">
                  {state.info.latest_version}
                </Badge>
              )}
            </div>
            <DialogDescription>{dialogDescription(state)}</DialogDescription>
          </DialogHeader>

          {state.info?.release_notes && ["available", "error"].includes(state.phase) && (
            <div className="max-h-40 overflow-y-auto rounded-lg border border-border bg-muted/30 p-3 text-[13px] leading-6 text-foreground/80">
              <pre className="whitespace-pre-wrap font-sans">{state.info.release_notes}</pre>
            </div>
          )}

          {state.phase === "available" && state.info?.manual_only_reason && (
            <div className="flex gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-300">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{state.info.manual_only_reason}</span>
            </div>
          )}

          {state.phase === "downloading" && (
            <div className="space-y-2">
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                {state.percent != null ? (
                  <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${Math.min(100, state.percent)}%` }} />
                ) : (
                  <div className="h-full w-1/3 animate-pulse rounded-full bg-primary" />
                )}
              </div>
              <p className="text-xs text-muted-foreground">{progressText(state)}</p>
            </div>
          )}

          {["verifying", "extracting"].includes(state.phase) && (
            <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
              <RefreshCw className="h-4 w-4 animate-spin" />
              <span>{state.message || "正在准备更新"}</span>
            </div>
          )}

          {state.phase === "ready" && (
            <div className="flex gap-2 rounded-lg border border-primary/30 bg-primary/10 p-3 text-xs text-primary">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
              <span>更新已准备就绪，应用需要重启以完成安装。</span>
            </div>
          )}

          {state.phase === "error" && state.message && (
            <div className="flex gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{state.message}</span>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-2">
            {state.phase === "downloading" && (
              <Button variant="outline" onClick={handleCancel}>取消下载</Button>
            )}
            {state.phase === "available" && (
              <>
                <Button variant="outline" onClick={() => setOpen(false)}>关闭</Button>
                {state.info?.auto_install_available ? (
                  <Button onClick={handleStartUpdate}>
                    <Download className="h-4 w-4" />
                    立即更新
                  </Button>
                ) : (
                  <Button onClick={handleManualDownload}>前往下载</Button>
                )}
              </>
            )}
            {state.phase === "ready" && (
              <Button onClick={handleInstall}>重启并安装</Button>
            )}
            {state.phase === "installing" && (
              <Button disabled>正在重启...</Button>
            )}
            {state.phase === "error" && (
              <>
                <Button variant="outline" onClick={() => setOpen(false)}>关闭</Button>
                {state.info?.release_url && <Button variant="outline" onClick={handleManualDownload}>前往下载</Button>}
                <Button onClick={handleStartUpdate}>重试</Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

function dialogTitle(state: app.UpdateState) {
  switch (state.phase) {
    case "downloading": return "正在下载更新"
    case "verifying": return "正在校验更新"
    case "extracting": return "正在解压更新"
    case "ready": return "更新准备就绪"
    case "installing": return "正在安装更新"
    case "error": return "更新失败"
    default: return state.info?.has_update ? "发现新版本" : "检查更新"
  }
}

function dialogDescription(state: app.UpdateState) {
  const info = state.info
  if (!info) return state.message || "检查 super-fofa 是否有新版本。"
  if (state.phase === "ready") return `当前 ${info.current_version}，最新 ${info.latest_version}`
  if (state.phase === "installing") return "应用即将关闭并重启。"
  if (state.phase === "error") return "更新过程中出现问题，可以重试或手动下载。"
  return `当前 ${info.current_version}，最新 ${info.latest_version}`
}
