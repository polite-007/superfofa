import { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"
import { AlertCircle, Plus, RotateCw, X } from "lucide-react"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { QueryHost } from "../../../wailsjs/go/app/App"
import { model } from "../../../wailsjs/go/models"
import { HostSearchBox, isIPv4String } from "./search-box"
import { HostHistoryList } from "./history-list"
import { useHostHistory } from "./use-host-history"
import { HostSummary } from "./host-summary"
import { HostOverview } from "./host-overview"
import { HostStats, normalStats, detailStats } from "./host-stats"
import { HostPortsCards } from "./host-ports-cards"

type Tab = { id: string; title: string }

let seq = 0
function createTab(): Tab {
  seq += 1
  return { id: `host-tab-${seq}-${Date.now()}`, title: `主机 ${seq}` }
}

const MAX_TABS = 5

type TabHostState = {
  host: string
  detail: boolean
  result: model.HostResult | null
  loading: boolean
  error: string | null
  submitted: boolean
}

function initialTabState(): TabHostState {
  return {
    host: "",
    detail: false,
    result: null,
    loading: false,
    error: null,
    submitted: false,
  }
}

export function HostView() {
  const [tabs, setTabs] = useState<Tab[]>(() => [createTab()])
  const [activeId, setActiveId] = useState(() => tabs[0]?.id ?? "")
  const [states, setStates] = useState<Record<string, TabHostState>>(() => ({
    [tabs[0].id]: initialTabState(),
  }))

  const { history, add, remove, clear } = useHostHistory()

  const patch = useCallback((id: string, p: Partial<TabHostState>) => {
    setStates((prev) => ({ ...prev, [id]: { ...prev[id], ...p } }))
  }, [])

  function openNewTab(): Tab | null {
    if (tabs.length >= MAX_TABS) {
      toast.warning(`最多同时存在 ${MAX_TABS} 个主机标签`)
      return null
    }
    const t = createTab()
    setTabs((prev) => [...prev, t])
    setStates((prev) => ({ ...prev, [t.id]: initialTabState() }))
    setActiveId(t.id)
    return t
  }

  function addTab() {
    openNewTab()
  }

  function closeTab(id: string) {
    setTabs((prev) => {
      if (prev.length <= 1) return prev
      const idx = prev.findIndex((t) => t.id === id)
      const next = prev.filter((t) => t.id !== id)
      if (activeId === id) {
        const fallback = next[Math.min(idx, next.length - 1)]
        setActiveId(fallback.id)
      }
      return next
    })
    setStates((prev) => {
      const next = { ...prev }
      delete next[id]
      return next
    })
  }

  const runQuery = useCallback(
    async (id: string, over?: Partial<TabHostState>) => {
      // 新建 tab 首次查询时 states[id] 可能尚未注入，回退到初始状态
      const cur = states[id] ?? initialTabState()
      const next = { ...cur, ...over }
      const host = next.host.trim()
      if (!host) {
        toast.warning("请输入 IPv4 地址")
        return
      }
      if (!isIPv4String(host)) {
        toast.error("请输入合法的 IPv4 地址")
        return
      }
      // 启动新查询：清掉旧 result，让骨架正确显示（切换普通/详情时旧数据结构不兼容）
      patch(id, { ...over, loading: true, error: null, result: null })
      try {
        const res = await QueryHost({ host, detail: next.detail })
        patch(id, { loading: false, result: res, error: null, submitted: true })
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e)
        patch(id, { loading: false, error: msg })
        if (msg.includes("没有可用的 FOFA 账号")) {
          toast.error("没有可用的 FOFA 账号", {
            description: "已跳转到配置页，请添加并检测账号",
          })
          window.dispatchEvent(new CustomEvent("superfofa:open-config"))
        } else {
          toast.error("查询失败", { description: msg })
        }
      }
    },
    [states, patch],
  )

  function handleSearch(id: string) {
    const cur = states[id]
    if (!cur) return
    const host = cur.host.trim()
    if (!host) {
      toast.warning("请输入 IPv4 地址")
      return
    }
    if (!isIPv4String(host)) {
      toast.error("请输入合法的 IPv4 地址")
      return
    }
    add(host)
    runQuery(id, { submitted: true })
  }

  function handleDetailChange(id: string, detail: boolean) {
    const cur = states[id]
    if (!cur || cur.detail === detail) return
    // 只在已提交（有结果或正在请求）时才重新请求；否则只切换标记
    if (cur.submitted) {
      runQuery(id, { detail })
    } else {
      patch(id, { detail })
    }
  }

  // 监听来自 query 页的 ip 跳转事件：新开一个 tab 承接，不占用已有标签
  useEffect(() => {
    const handler = (e: Event) => {
      const ce = e as CustomEvent<{ ip?: string }>
      const ip = ce.detail?.ip?.trim()
      if (!ip || !isIPv4String(ip)) return
      const t = openNewTab()
      if (!t) return
      add(ip)
      runQuery(t.id, { host: ip, submitted: true })
    }
    window.addEventListener("superfofa:open-host", handler)
    return () => window.removeEventListener("superfofa:open-host", handler)
  }, [states, add, patch, runQuery])

  return (
    <Tabs
      value={activeId}
      onValueChange={setActiveId}
      className="flex h-full min-w-0 flex-col gap-0"
    >
      <div className="flex shrink-0 items-center gap-1 border-b border-border px-2 py-1.5">
        <TabsList variant="line" className="h-7 w-fit bg-transparent p-0">
          {tabs.map((t) => (
            <TabsTrigger
              key={t.id}
              value={t.id}
              className="group relative h-7 gap-1.5 rounded-md px-2.5 pr-6"
            >
              <span className="max-w-28 truncate">{t.title}</span>
              {tabs.length > 1 && (
                <span
                  role="button"
                  tabIndex={0}
                  aria-label="关闭标签"
                  onClick={(e) => {
                    e.stopPropagation()
                    closeTab(t.id)
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault()
                      e.stopPropagation()
                      closeTab(t.id)
                    }
                  }}
                  className="absolute right-1 top-1/2 flex size-4 -translate-y-1/2 items-center justify-center rounded-sm text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  <X className="size-3" />
                </span>
              )}
            </TabsTrigger>
          ))}
        </TabsList>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="新建主机查询"
          title="新建主机标签"
          onClick={addTab}
          className="h-7 w-7"
        >
          <Plus />
        </Button>
      </div>

      {tabs.map((t) => {
        const st = states[t.id] ?? initialTabState()
        return (
          <TabsContent
            key={t.id}
            value={t.id}
            className="flex min-w-0 flex-1 flex-col overflow-hidden"
          >
            {st.submitted ? (
              <div className="flex min-w-0 flex-1 flex-col overflow-hidden p-3">
                {/* 紧凑搜索框（撑满，内嵌模式切换） + 刷新（右侧） */}
                <div className="flex shrink-0 items-center gap-2">
                  <div className="min-w-0 flex-1">
                    <HostSearchBox
                      size="sm"
                      value={st.host}
                      onChange={(v) => patch(t.id, { host: v })}
                      onSearch={() => handleSearch(t.id)}
                      searching={st.loading}
                      rightSlot={
                        <TooltipProvider delayDuration={200}>
                        <div className="flex items-center rounded-md ring-1 ring-foreground/15 p-0.5">
                          <button
                            type="button"
                            onClick={() => handleDetailChange(t.id, false)}
                            title="普通画像"
                            className={
                              "h-6 rounded px-2 text-[11px] transition-colors " +
                              (!st.detail
                                ? "bg-foreground text-background"
                                : "text-muted-foreground hover:text-foreground")
                            }
                          >
                            普通
                          </button>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                type="button"
                                onClick={() => handleDetailChange(t.id, true)}
                                className={
                                  "h-6 rounded px-2 text-[11px] transition-colors " +
                                  (st.detail
                                    ? "bg-foreground text-background"
                                    : "text-muted-foreground hover:text-foreground")
                                }
                              >
                                详情
                              </button>
                            </TooltipTrigger>
                            <TooltipContent side="bottom" sideOffset={6} className="max-w-[240px]">
                              <p className="font-medium">端口详情模式</p>
                              <p className="mt-1 text-[11px] text-muted-foreground">
                                该接口 detail=true 响应缓慢，常超时，请耐心等待。
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                        </TooltipProvider>
                      }
                    />
                  </div>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-9 w-9 shrink-0"
                    title="刷新"
                    onClick={() => runQuery(t.id)}
                    disabled={st.loading}
                  >
                    <RotateCw className={st.loading ? "size-4 animate-spin" : "size-4"} />
                  </Button>
                </div>

                {/* Hero 卡 */}
                <div className="mt-3 shrink-0">
                  {st.loading && !st.result ? (
                    <div className="h-16 animate-pulse rounded-xl bg-muted/40" />
                  ) : st.result ? (
                    <HostSummary result={st.result} />
                  ) : null}
                </div>

                {/* 错误条 */}
                {st.error && (
                  <div className="mt-2 flex shrink-0 items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                    <AlertCircle className="size-4 shrink-0" />
                    <span className="flex-1">{st.error}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-xs text-destructive hover:bg-destructive/20"
                      onClick={() => runQuery(t.id)}
                      disabled={st.loading}
                    >
                      <RotateCw className={st.loading ? "size-3 animate-spin" : "size-3"} />
                      重试
                    </Button>
                  </div>
                )}

                {/* KPI 数字卡 */}
                <div className="mt-3 shrink-0">
                  {st.loading && !st.result ? (
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                      {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="h-16 animate-pulse rounded-xl bg-muted/40" />
                      ))}
                    </div>
                  ) : st.result ? (
                    <HostStats
                      stats={st.detail ? detailStats(st.result) : normalStats(st.result)}
                    />
                  ) : null}
                </div>

                {/* 内容区：普通/详情两套布局，由顶部切换控制 */}
                <div className="mt-3 min-h-0 flex-1 overflow-auto">
                  {st.detail ? (
                    <HostPortsCards result={st.result} loading={st.loading && !st.result} />
                  ) : (
                    <HostOverview result={st.result} loading={st.loading && !st.result} />
                  )}
                </div>
              </div>
            ) : (
              // 空态
              <div className="flex flex-1 flex-col items-center justify-start gap-8 overflow-auto p-6 pt-[30vh]">
                <div className="flex w-full max-w-2xl flex-col items-center gap-3">
                  <h2 className="text-lg font-semibold">主机画像查询</h2>
                  <p className="text-sm text-muted-foreground">
                    输入 IPv4 地址查看主机的协议、端口、产品画像
                  </p>
                  <HostSearchBox
                    value={st.host}
                    onChange={(v) => patch(t.id, { host: v })}
                    onSearch={() => handleSearch(t.id)}
                    searching={st.loading}
                    autoFocus
                  />
                </div>
                <HostHistoryList
                  history={history}
                  onPick={(h) => {
                    add(h)
                    patch(t.id, { host: h })
                    runQuery(t.id, { host: h, submitted: true })
                  }}
                  onRemove={remove}
                  onClear={clear}
                />
              </div>
            )}
          </TabsContent>
        )
      })}
    </Tabs>
  )
}
