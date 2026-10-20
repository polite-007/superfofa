import { useCallback, useRef, useState } from "react"
import { toast } from "sonner"
import { Plus, X, AlertCircle, RotateCw } from "lucide-react"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { SearchFofa, StatsFofa } from "../../../wailsjs/go/app/App"
import { model } from "../../../wailsjs/go/models"
import { BrowserOpenURL } from "../../../wailsjs/runtime/runtime"
import { SearchBox } from "./search-box"
import { HistoryList } from "./history-list"
import { HotSearchPanel } from "./hot-search-panel"
import { useQueryHistory } from "./use-query-history"
import { ResultTable } from "./result-table"
import { ResultToolbar } from "./result-toolbar"
import { CardView } from "./card-view"
import { CardSettingsDialog } from "./card-settings-dialog"
import {
  FACET_STATS_FIELDS,
  FACET_STATS_SIZE,
  FacetPanel,
  type FacetResult,
} from "./facet-panel"
import {
  CARD_IDENTITY_FIELDS,
  cardFieldsToFOFAFields,
  loadCardSettings,
  loadViewMode,
  saveCardSettings,
  saveViewMode,
  unionFields,
  type CardSettings,
  type QueryViewMode,
} from "./card-fields"
import { saveExportQueryDraft } from "../export/open-from-query"
import { Pagination } from "./pagination"
import { cn } from "@/lib/utils"

// 查询框宽度随内容长度等比放大：内容越长，最大宽度上限越宽
function searchBoxWidth(len: number): string {
  if (len > 240) return "max-w-5xl"
  if (len > 120) return "max-w-4xl"
  return "max-w-3xl"
}
import {
  DEFAULT_PRESET_KEY,
  getPreset,
  fieldsOf,
  type ColumnDef,
} from "./columns"

type Tab = { id: string; title: string }

let seq = 0
function createTab(): Tab {
  seq += 1
  return { id: `tab-${seq}-${Date.now()}`, title: `查询 ${seq}` }
}

const MAX_TABS = 5

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

function hasPortCondition(query: string, port: string): boolean {
  const escaped = escapeRegExp(port.trim())
  if (!escaped) return false
  return new RegExp(`\\bport\\s*!=\\s*["']?${escaped}["']?\\b`).test(query)
}

function appendPortCondition(query: string, port: string): string {
  const trimmedQuery = query.trim()
  const nextCondition = `port!="${port.trim()}"`
  return trimmedQuery ? `${trimmedQuery} && ${nextCondition}` : nextCondition
}

function inferHostUrl(host: string, row: Record<string, string>): string {
  const trimmedHost = host.trim()
  if (/^https?:\/\//i.test(trimmedHost)) return trimmedHost
  const scheme = row.protocol?.trim().toLowerCase() === "https" ? "https" : "http"
  return `${scheme}://${trimmedHost}`
}

// 每个 tab 独立的搜索状态（切换 tab 不丢失）
type TabFacetState = FacetResult & { query: string }

type TabSearchState = {
  query: string // 搜索框当前语句
  columns: ColumnDef[] // 当前选中的列（决定表格列 + FOFA Fields 并集）
  size: number // 10/20/30/50
  page: number
  result: model.SearchFofaResult | null
  loading: boolean
  error: string | null
  submitted: boolean // 是否进入结果态
  facets: TabFacetState // 左侧聚合面板
}

function initialTabState(): TabSearchState {
  const preset = getPreset(DEFAULT_PRESET_KEY)!
  return {
    query: "",
    columns: preset.columns,
    size: 10,
    page: 1,
    result: null,
    loading: false,
    error: null,
    submitted: false,
    facets: { result: null, loading: false, error: null, query: "" },
  }
}

export function QueryView({
  onOpenStats,
  onOpenExport,
}: {
  onOpenStats: (query: string) => void
  onOpenExport: (tab?: "create" | "records") => void
}) {
  const [tabs, setTabs] = useState<Tab[]>(() => [createTab()])
  const [activeId, setActiveId] = useState(() => tabs[0]?.id ?? "")
  const [states, setStates] = useState<Record<string, TabSearchState>>(() => ({
    [tabs[0].id]: initialTabState(),
  }))

  const { history, add, remove, clear } = useQueryHistory()

  const [viewMode, setViewMode] = useState<QueryViewMode>(() => loadViewMode())
  const [cardSettings, setCardSettings] = useState<CardSettings>(() => loadCardSettings())
  const [cardSettingsOpen, setCardSettingsOpen] = useState(false)

  const viewModeRef = useRef(viewMode)
  const cardSettingsRef = useRef(cardSettings)
  const statesRef = useRef(states)
  const facetSeq = useRef<Record<string, number>>({})
  const searchSeq = useRef<Record<string, number>>({})
  viewModeRef.current = viewMode
  cardSettingsRef.current = cardSettings
  statesRef.current = states

  const patch = useCallback(
    (id: string, p: Partial<TabSearchState>) => {
      setStates((prev) => ({ ...prev, [id]: { ...prev[id], ...p } }))
    },
    [],
  )

  const loadFacets = useCallback(async (id: string, query: string) => {
    const q = query.trim()
    if (!q) return
    const seq = (facetSeq.current[id] ?? 0) + 1
    facetSeq.current[id] = seq

    setStates((prev) => {
      const cur = prev[id]
      if (!cur) return prev
      return {
        ...prev,
        [id]: {
          ...cur,
          facets: { ...cur.facets, loading: true, error: null, query: q },
        },
      }
    })

    try {
      const res = await StatsFofa({
        query: q,
        fields: FACET_STATS_FIELDS,
        size: FACET_STATS_SIZE,
      })
      if (facetSeq.current[id] !== seq) return
      setStates((prev) => {
        const cur = prev[id]
        if (!cur) return prev
        return {
          ...prev,
          [id]: {
            ...cur,
            facets: { result: res, loading: false, error: null, query: q },
          },
        }
      })
    } catch (e) {
      if (facetSeq.current[id] !== seq) return
      const msg = e instanceof Error ? e.message : String(e)
      setStates((prev) => {
        const cur = prev[id]
        if (!cur) return prev
        return {
          ...prev,
          [id]: {
            ...cur,
            facets: { ...cur.facets, loading: false, error: msg, query: q },
          },
        }
      })
    }
  }, [])

  const ensureFacets = useCallback(
    (id: string) => {
      const cur = statesRef.current[id]
      if (!cur || !cur.result) return
      const q = cur.query.trim()
      if (!q) return
      if (cur.facets.loading) return
      if (cur.facets.query === q && cur.facets.result) return
      void loadFacets(id, q)
    },
    [loadFacets],
  )

  function addTab() {
    if (tabs.length >= MAX_TABS) {
      toast.warning(`最多同时存在 ${MAX_TABS} 个查询标签`)
      return
    }
    const t = createTab()
    setTabs((prev) => [...prev, t])
    setStates((prev) => ({ ...prev, [t.id]: initialTabState() }))
    setActiveId(t.id)
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

  // 真正执行搜索（统一入口）
  const runSearch = useCallback(
    async (
      id: string,
      over?: Partial<TabSearchState>,
      opts?: { refreshFacets?: boolean; cardSettings?: CardSettings },
    ) => {
      const cur = states[id]
      if (!cur) return
      const next = { ...cur, ...over }
      const q = next.query.trim()
      if (!q) {
        toast.warning("请输入查询语句")
        return
      }

      const seq = (searchSeq.current[id] ?? 0) + 1
      searchSeq.current[id] = seq

      const settings = opts?.cardSettings ?? cardSettingsRef.current
      const fields = unionFields(
        fieldsOf(next.columns).split(","),
        CARD_IDENTITY_FIELDS,
        cardFieldsToFOFAFields(settings.fields, settings.tier),
      )

      patch(id, { ...over, loading: true, error: null })
      if (opts?.refreshFacets && viewModeRef.current === "card") {
        void loadFacets(id, q)
      }

      try {
        const res = await SearchFofa({
          query: q,
          fields,
          size: next.size,
          page: next.page,
        })
        if (searchSeq.current[id] !== seq) return
        patch(id, {
          loading: false,
          result: res,
          error: null,
          submitted: true,
        })
        // 列表模式下发起、加载中切到卡片模式时，补拉一次聚合
        if (viewModeRef.current === "card" && !opts?.refreshFacets) {
          const facets = states[id]?.facets
          if (!facets?.loading && (!facets || facets.query !== q || !facets.result)) {
            void loadFacets(id, q)
          }
        }
      } catch (e) {
        if (searchSeq.current[id] !== seq) return
        const msg = e instanceof Error ? e.message : String(e)
        const hint = /权限|permission|not authorized|字段/i.test(msg)
          ? "（请检查「卡片设置」中的会员等级或取消该字段）"
          : ""
        patch(id, { loading: false, error: msg + hint })
        if (msg.includes("没有可用的 FOFA 账号")) {
          toast.error("没有可用的 FOFA 账号", {
            description: "已跳转到配置页，请添加并检测账号",
          })
          window.dispatchEvent(new CustomEvent("superfofa:open-config"))
        } else {
          toast.error("搜索失败", { description: msg + hint })
        }
      }
    },
    [states, patch, loadFacets],
  )

  // 搜索框提交：记录历史，page 重置为 1，进入结果态
  function handleSearch(id: string) {
    const cur = states[id]
    if (!cur) return
    const q = cur.query.trim()
    if (!q) {
      toast.warning("请输入查询语句")
      return
    }
    add(q)
    runSearch(id, { page: 1, submitted: true }, { refreshFacets: true })
  }

  function handleColumnsChange(id: string, cols: ColumnDef[]) {
    runSearch(id, { columns: cols, page: 1 })
  }

  function handleSizeChange(id: string, size: number) {
    runSearch(id, { size, page: 1 })
  }

  function handlePage(id: string, page: number) {
    runSearch(id, { page })
  }

  function handleViewModeChange(mode: QueryViewMode) {
    setViewMode(mode)
    saveViewMode(mode)
    if (mode === "card") ensureFacets(activeId)
  }

  function handleFacetFilter(id: string, condition: string) {
    const cur = states[id]
    if (!cur) return
    const currentQuery = cur.query.trim()
    if (currentQuery.includes(condition)) {
      toast.info("当前语法已包含该条件")
      return
    }
    const query = currentQuery ? `${currentQuery} && ${condition}` : condition
    patch(id, { query, page: 1, submitted: true })
    runSearch(id, { query, page: 1, submitted: true }, { refreshFacets: true })
  }

  function handleFacetRetry(id: string) {
    const cur = states[id]
    if (!cur) return
    const q = cur.query.trim()
    if (!q) return
    void loadFacets(id, q)
  }

  function handleCardSettingsApply(next: CardSettings) {
    setCardSettings(next)
    saveCardSettings(next)
    const st = statesRef.current[activeId]
    if (st?.submitted && st.query.trim()) {
      // 卡片字段可能新增了未请求的 FOFA 字段，应用后刷新当前页
      void runSearch(activeId, undefined, { cardSettings: next })
      toast.success("卡片设置已应用，正在刷新结果")
    } else {
      toast.success("卡片设置已保存")
    }
  }

  function handlePortClick(id: string, port: string) {
    const cur = states[id]
    if (!cur) return
    const normalizedPort = port.trim()
    if (!normalizedPort) return

    if (hasPortCondition(cur.query, normalizedPort)) {
      toast.info(`当前语法已包含 port="${normalizedPort}"`)
      return
    }

    const query = appendPortCondition(cur.query, normalizedPort)
    patch(id, { query, page: 1, submitted: true })
    runSearch(id, { query, page: 1, submitted: true }, { refreshFacets: true })
  }

  function getPortHint(id: string, port: string): string {
    const cur = states[id]
    const normalizedPort = port.trim()
    if (cur && hasPortCondition(cur.query, normalizedPort)) {
      return `当前语法已包含 port!="${normalizedPort}"`
    }
    return `点击追加条件：&& port!="${normalizedPort}" 并重新查询`
  }

  function handleHostClick(host: string, row: Record<string, string>) {
    const url = inferHostUrl(host, row)
    BrowserOpenURL(url)
  }

  function getHostHint(host: string, row: Record<string, string>): string {
    return `在默认浏览器打开 ${inferHostUrl(host, row)}`
  }

function handleIpClick(ip: string) {
    const v = ip.trim()
    if (!v) return
    window.dispatchEvent(new CustomEvent("superfofa:open-host", { detail: { ip: v } }))
  }

  function getIpHint(_ip: string): string {
    return "跳转主机画像查询"
  }

  function handleOpenStats(id: string) {
    const cur = states[id]
    if (!cur) return
    const q = cur.query.trim()
    if (!q) {
      toast.warning("请输入查询语句")
      return
    }
    onOpenStats(q)
  }

  function handleExport(id: string) {
    const cur = states[id]
    if (!cur) return
    const q = cur.query.trim()
    if (!q) {
      toast.warning("请输入查询语句")
      return
    }
    saveExportQueryDraft(q, cur.columns, cur.result?.total ?? 0)
    onOpenExport("create")
  }

  return (
    <>
      <Tabs
        value={activeId}
        onValueChange={(id) => {
          setActiveId(id)
          if (viewModeRef.current === "card") ensureFacets(id)
        }}
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
          aria-label="新建查询"
          title="新建查询标签"
          onClick={addTab}
          className="h-7 w-7"
        >
          <Plus />
        </Button>
      </div>

      {tabs.map((t) => {
        const st = states[t.id] ?? initialTabState()
        const rows = (st.result?.results as Record<string, string>[]) ?? []
        const returned = st.result?.returned ?? 0

        return (
          <TabsContent
            key={t.id}
            value={t.id}
            className="flex min-w-0 flex-1 flex-col overflow-hidden"
          >
            {st.submitted ? (
              // 结果态：紧凑搜索框 + 工具条 + 表格 + 分页
              <div className="flex min-w-0 flex-1 flex-col overflow-hidden p-3">
                <SearchBox
                  size="sm"
                  value={st.query}
                  onChange={(v) => patch(t.id, { query: v })}
                  onSearch={() => handleSearch(t.id)}
                  searching={st.loading}
                />

                <div className="mt-3 flex min-w-0 shrink-0 flex-col gap-0">
                  <ResultToolbar
                    columns={st.columns}
                    size={st.size}
                    page={st.page}
                    total={st.result?.total ?? 0}
                    returned={returned}
                    elapsedMs={st.result?.elapsed_ms ?? 0}
                    accountEmail={st.result?.account_email ?? ""}
                    loading={st.loading}
                    viewMode={viewMode}
                    onViewModeChange={handleViewModeChange}
                    onOpenCardSettings={() => setCardSettingsOpen(true)}
                    onColumnsChange={(cols) => handleColumnsChange(t.id, cols)}
                    onSizeChange={(s) => handleSizeChange(t.id, s)}
                    onRefresh={() => runSearch(t.id, undefined, { refreshFacets: true })}
                    onOpenStats={() => handleOpenStats(t.id)}
                    onExport={() => handleExport(t.id)}
                    onOpenExportHistory={() => onOpenExport("records")}
                  />
                </div>

                {st.error && (
                  <div className="mb-2 mt-2 flex shrink-0 items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                    <AlertCircle className="size-4 shrink-0" />
                    <span className="flex-1">{st.error}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-xs text-destructive hover:bg-destructive/20"
                      onClick={() => runSearch(t.id, undefined, { refreshFacets: true })}
                      disabled={st.loading}
                    >
                      <RotateCw className={st.loading ? "size-3 animate-spin" : "size-3"} />
                      重试
                    </Button>
                  </div>
                )}

                {viewMode === "list" ? (
                  <>
                    <div className="mt-2 flex min-w-0 flex-1 flex-col overflow-hidden rounded-lg">
                      <ResultTable
                        columns={st.columns}
                        rows={rows}
                        page={st.page}
                        pageSize={st.size}
                        loading={st.loading}
                        empty={!st.loading && !st.error && returned === 0}
                        onPortClick={(port) => handlePortClick(t.id, port)}
                        getPortHint={(port) => getPortHint(t.id, port)}
                        onHostClick={handleHostClick}
                        getHostHint={getHostHint}
                        onIpClick={handleIpClick}
                        getIpHint={getIpHint}
                      />
                    </div>
                    <Pagination
                      page={st.page}
                      pageSize={st.size}
                      total={st.result?.total ?? 0}
                      onPage={(p) => handlePage(t.id, p)}
                      disabled={st.loading}
                    />
                  </>
                ) : (
                  <div className="mt-2 flex min-w-0 flex-1 gap-3 overflow-hidden">
                    <FacetPanel
                      facets={st.facets}
                      onFilter={(condition) => handleFacetFilter(t.id, condition)}
                      onRetry={() => handleFacetRetry(t.id)}
                    />
                    <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
                      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto pr-0.5">
                        <CardView
                          rows={rows}
                          settings={cardSettings}
                          loading={st.loading}
                          empty={!st.loading && !st.error && returned === 0}
                          onOpenUrl={BrowserOpenURL}
                          onOpenHost={handleIpClick}
                        />
                      </div>
                      <Pagination
                        page={st.page}
                        pageSize={st.size}
                        total={st.result?.total ?? 0}
                        onPage={(p) => handlePage(t.id, p)}
                        disabled={st.loading}
                      />
                    </div>
                  </div>
                )}
              </div>
            ) : (
              // 空态：偏上的大搜索框 + 历史记录
              <div className="flex min-h-0 flex-1 flex-col items-center overflow-hidden p-6">
                <div className={cn(
                  "flex w-full shrink-0 flex-col items-center gap-3 pt-[min(26vh,140px)] transition-[max-width] duration-200",
                  searchBoxWidth(st.query.length),
                )}>
                  <h2 className="text-lg font-semibold">FOFA 资产搜索</h2>
                  <p className="text-sm text-muted-foreground">
                    输入查询语句开始搜索，点击右侧问号查看语法
                  </p>
                  <div className="w-full max-w-2xl">
                    <SearchBox
                      value={st.query}
                      onChange={(v) => patch(t.id, { query: v })}
                      onSearch={() => handleSearch(t.id)}
                      searching={st.loading}
                      autoFocus
                    />
                  </div>
                </div>

                <div className="flex min-h-0 w-full flex-1 justify-center overflow-y-auto pt-6">
                  <div className="flex w-full max-w-2xl flex-col gap-3">
                    <Tabs defaultValue="hot">
                      <TabsList className="h-8">
                        <TabsTrigger value="history" className="px-4 text-xs">记录</TabsTrigger>
                        <TabsTrigger value="hot" className="px-4 text-xs">热搜</TabsTrigger>
                      </TabsList>
                      <TabsContent value="history" className="mt-3">
                        <HistoryList
                          history={history}
                          onPick={(hq) => {
                            add(hq)
                            runSearch(
                              t.id,
                              { query: hq, page: 1, submitted: true },
                              { refreshFacets: true },
                            )
                          }}
                          onRemove={remove}
                          onClear={clear}
                        />
                      </TabsContent>
                      <TabsContent value="hot" className="mt-3">
                        <HotSearchPanel
                          onPick={(q) => {
                            add(q)
                            runSearch(
                              t.id,
                              { query: q, page: 1, submitted: true },
                              { refreshFacets: true },
                            )
                          }}
                        />
                      </TabsContent>
                    </Tabs>
                  </div>
                </div>
              </div>
            )}
          </TabsContent>
        )
      })}
      </Tabs>

      <CardSettingsDialog
        open={cardSettingsOpen}
        onOpenChange={setCardSettingsOpen}
        settings={cardSettings}
        onApply={handleCardSettingsApply}
      />
    </>
  )
}
