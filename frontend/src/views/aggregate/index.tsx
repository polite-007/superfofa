import { useCallback, useEffect, useRef, useState } from "react"
import { toast } from "sonner"
import { AlertCircle, Plus, RotateCw, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { StatsFofa } from "../../../wailsjs/go/app/App"
import { model } from "../../../wailsjs/go/models"
import { HistoryList } from "../query/history-list"
import { SearchBox } from "../query/search-box"
import { useStatsHistory } from "./use-stats-history"
import {
  DEFAULT_STATS_FIELDS,
  statsFieldsToParam,
  type StatsFieldKey,
  type StatsSize,
} from "./stats-fields"
import { StatsResultGrid } from "./stats-result-grid"
import { StatsToolbar } from "./stats-toolbar"

export type StatsTab = { id: string; title: string }

type StatsRequestParams = {
  query: string
  fields: StatsFieldKey[]
  size: StatsSize
}

export type StatsTabState = {
  query: string
  fields: StatsFieldKey[]
  size: StatsSize
  result: model.StatsFofaResult | null
  resultParams: StatsRequestParams | null
  inflightParams: StatsRequestParams | null
  loading: boolean
  error: string | null
  submitted: boolean
  requestSeq: number
}

export const MAX_TABS = 5

let seq = 0

export function createTab(): StatsTab {
  seq += 1
  return { id: `stats-tab-${seq}-${Date.now()}`, title: `统计 ${seq}` }
}

export function initialTabState(): StatsTabState {
  return {
    query: "",
    fields: [...DEFAULT_STATS_FIELDS],
    size: 10,
    result: null,
    resultParams: null,
    inflightParams: null,
    loading: false,
    error: null,
    submitted: false,
    requestSeq: 0,
  }
}

type OpenStatsQueryDetail = {
  query?: string
  autoRun?: boolean
}

function sameStatsParams(a: StatsRequestParams, b: StatsRequestParams | null): boolean {
  return (
    b !== null &&
    a.query === b.query &&
    a.size === b.size &&
    a.fields.length === b.fields.length &&
    a.fields.every((field, index) => field === b.fields[index])
  )
}

export function AggregateView() {
  const [tabs, setTabs] = useState<StatsTab[]>(() => [createTab()])
  const [activeId, setActiveIdState] = useState(() => tabs[0]?.id ?? "")
  const [states, setStates] = useState<Record<string, StatsTabState>>(() => ({
    [tabs[0].id]: initialTabState(),
  }))

  const tabsRef = useRef(tabs)
  const statesRef = useRef(states)
  const activeIdRef = useRef(activeId)
  const requestSeqRef = useRef<Record<string, number>>({})

  const { history, add, remove, clear } = useStatsHistory()

  useEffect(() => {
    tabsRef.current = tabs
  }, [tabs])

  useEffect(() => {
    statesRef.current = states
  }, [states])

  useEffect(() => {
    activeIdRef.current = activeId
  }, [activeId])

  const activateTab = useCallback((id: string) => {
    activeIdRef.current = id
    setActiveIdState(id)
  }, [])

  const patch = useCallback((id: string, p: Partial<StatsTabState>) => {
    setStates((prev) => {
      const cur = prev[id]
      if (!cur) return prev
      const next = { ...prev, [id]: { ...cur, ...p } }
      statesRef.current = next
      return next
    })
  }, [])

  const appendTab = useCallback(
    (initial?: Partial<StatsTabState>) => {
      if (tabsRef.current.length >= MAX_TABS) {
        toast.warning(`最多同时存在 ${MAX_TABS} 个统计标签`)
        return null
      }

      const tab = createTab()
      const tabState: StatsTabState = { ...initialTabState(), ...initial }
      const nextTabs = [...tabsRef.current, tab]
      const nextStates = { ...statesRef.current, [tab.id]: tabState }

      tabsRef.current = nextTabs
      statesRef.current = nextStates
      requestSeqRef.current[tab.id] = tabState.requestSeq
      setTabs(nextTabs)
      setStates(nextStates)
      activateTab(tab.id)

      return tab
    },
    [activateTab],
  )

  function addTab() {
    appendTab()
  }

  function closeTab(id: string) {
    const currentTabs = tabsRef.current
    if (currentTabs.length <= 1) return

    const idx = currentTabs.findIndex((tab) => tab.id === id)
    if (idx === -1) return

    const nextTabs = currentTabs.filter((tab) => tab.id !== id)
    const nextStates = { ...statesRef.current }
    delete nextStates[id]

    tabsRef.current = nextTabs
    statesRef.current = nextStates
    delete requestSeqRef.current[id]
    setTabs(nextTabs)
    setStates(nextStates)

    if (activeIdRef.current === id) {
      const fallback = nextTabs[Math.min(idx, nextTabs.length - 1)]
      if (fallback) activateTab(fallback.id)
    }
  }

  const runStats = useCallback(
    async (tabId: string, overrides?: Partial<StatsTabState>) => {
      const cur = statesRef.current[tabId]
      if (!cur) return

      const next: StatsTabState = { ...cur, ...overrides }
      const query = next.query.trim()
      if (!query) {
        toast.warning("请输入查询语句")
        return
      }
      if (next.fields.length === 0) {
        toast.warning("请选择统计字段")
        return
      }

      const requestParams: StatsRequestParams = {
        query,
        fields: [...next.fields],
        size: next.size,
      }
      const paramsChanged = !sameStatsParams(requestParams, cur.resultParams)
      const nextResult = paramsChanged ? null : cur.result

      const requestSeq = (requestSeqRef.current[tabId] ?? cur.requestSeq) + 1
      requestSeqRef.current[tabId] = requestSeq
      statesRef.current = {
        ...statesRef.current,
        [tabId]: {
          ...cur,
          ...overrides,
          query,
          loading: true,
          error: null,
          result: nextResult,
          inflightParams: requestParams,
          submitted: true,
          requestSeq,
        },
      }
      patch(tabId, {
        ...overrides,
        query,
        loading: true,
        error: null,
        result: nextResult,
        inflightParams: requestParams,
        submitted: true,
        requestSeq,
      })

      try {
        const result = await StatsFofa(
          new model.StatsFofaReq({
            query,
            fields: statsFieldsToParam(next.fields),
            size: next.size,
          }),
        )
        const latest = statesRef.current[tabId]
        if (!latest || latest.requestSeq !== requestSeq) return

        patch(tabId, {
          loading: false,
          result,
          resultParams: requestParams,
          inflightParams: null,
          error: null,
          submitted: true,
        })
      } catch (e) {
        const latest = statesRef.current[tabId]
        if (!latest || latest.requestSeq !== requestSeq) return

        const msg = e instanceof Error ? e.message : String(e)
        patch(tabId, { loading: false, error: msg, inflightParams: null })
        toast.error("统计聚合失败", { description: msg })
      }
    },
    [patch],
  )

  function handleQueryChange(id: string, value: string) {
    const cur = statesRef.current[id]
    if (!cur) return

    const inflightQuery = cur.inflightParams?.query
    const shouldInvalidate = Boolean(inflightQuery && value.trim() !== inflightQuery)
    const requestSeq = shouldInvalidate
      ? (requestSeqRef.current[id] ?? cur.requestSeq) + 1
      : cur.requestSeq

    if (shouldInvalidate) requestSeqRef.current[id] = requestSeq

    const nextState = {
      ...cur,
      query: value,
      loading: shouldInvalidate ? false : cur.loading,
      inflightParams: shouldInvalidate ? null : cur.inflightParams,
      requestSeq,
    }
    statesRef.current = { ...statesRef.current, [id]: nextState }
    patch(id, {
      query: value,
      loading: nextState.loading,
      inflightParams: nextState.inflightParams,
      requestSeq,
    })
  }

  function handleSearch(id: string) {
    const cur = statesRef.current[id]
    if (!cur) return

    const query = cur.query.trim()
    if (!query) {
      toast.warning("请输入查询语句")
      return
    }

    add(query)
    void runStats(id, { query, submitted: true })
  }

  function handleFieldsChange(id: string, fields: StatsFieldKey[]) {
    const cur = statesRef.current[id]
    if (!cur) return

    if (cur.submitted) {
      void runStats(id, { fields })
      return
    }
    patch(id, { fields })
  }

  function handleSizeChange(id: string, size: StatsSize) {
    const cur = statesRef.current[id]
    if (!cur) return

    if (cur.submitted) {
      void runStats(id, { size })
      return
    }
    patch(id, { size })
  }

  useEffect(() => {
    function handleOpenStatsQuery(event: Event) {
      const detail = (event as CustomEvent<OpenStatsQueryDetail>).detail
      const query = detail?.query?.trim() ?? ""
      if (!query) return

      const shouldRun = detail?.autoRun !== false
      const existing = tabsRef.current.find((tab) => statesRef.current[tab.id]?.query.trim() === query)

      if (existing) {
        activateTab(existing.id)
        if (shouldRun) {
          add(query)
          void runStats(existing.id, { query, submitted: true })
        } else {
          patch(existing.id, { query })
        }
        return
      }

      const tab = appendTab({
        query,
        fields: [...DEFAULT_STATS_FIELDS],
        size: 10,
        submitted: shouldRun,
      })
      if (!tab || !shouldRun) return

      add(query)
      void runStats(tab.id, { query, submitted: true })
    }

    window.addEventListener("superfofa:open-stats-query", handleOpenStatsQuery)
    return () => window.removeEventListener("superfofa:open-stats-query", handleOpenStatsQuery)
  }, [activateTab, add, appendTab, patch, runStats])

  return (
    <Tabs
      value={activeId}
      onValueChange={activateTab}
      className="flex h-full min-w-0 flex-col gap-0"
    >
      <div className="flex shrink-0 items-center gap-1 border-b border-border px-2 py-1.5">
        <TabsList variant="line" className="h-7 w-fit bg-transparent p-0">
          {tabs.map((tab) => (
            <TabsTrigger
              key={tab.id}
              value={tab.id}
              className="group relative h-7 gap-1.5 rounded-md px-2.5 pr-6"
            >
              <span className="max-w-28 truncate">{tab.title}</span>
              {tabs.length > 1 && (
                <span
                  role="button"
                  tabIndex={0}
                  aria-label="关闭标签"
                  onClick={(e) => {
                    e.stopPropagation()
                    closeTab(tab.id)
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault()
                      e.stopPropagation()
                      closeTab(tab.id)
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
          aria-label="新建统计"
          title="新建统计标签"
          onClick={addTab}
          className="h-7 w-7"
        >
          <Plus />
        </Button>
      </div>

      {tabs.map((tab) => {
        const state = states[tab.id] ?? initialTabState()

        return (
          <TabsContent
            key={tab.id}
            value={tab.id}
            className="flex min-w-0 flex-1 flex-col overflow-hidden"
          >
            {state.submitted ? (
              <div className="flex min-w-0 flex-1 flex-col overflow-hidden p-3">
                <SearchBox
                  size="sm"
                  value={state.query}
                  onChange={(value) => handleQueryChange(tab.id, value)}
                  onSearch={() => handleSearch(tab.id)}
                  searching={state.loading}
                />

                <div className="mt-3 shrink-0">
                  <StatsToolbar
                    fields={state.fields}
                    size={state.size}
                    total={state.result?.total ?? 0}
                    elapsedMs={state.result?.elapsed_ms ?? 0}
                    lastUpdateTime={state.result?.lastupdatetime ?? ""}
                    loading={state.loading}
                    onFieldsChange={(fields) => handleFieldsChange(tab.id, fields)}
                    onSizeChange={(size) => handleSizeChange(tab.id, size)}
                    onRefresh={() => void runStats(tab.id)}
                  />
                </div>

                <div className="mt-3 min-h-0 flex-1 overflow-auto rounded-lg">
                  {state.error && (
                    <div className="mb-3 flex shrink-0 items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                      <AlertCircle className="size-4 shrink-0" />
                      <span className="min-w-0 flex-1 break-words">{state.error}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-xs text-destructive hover:bg-destructive/20"
                        onClick={() => void runStats(tab.id)}
                        disabled={state.loading}
                      >
                        <RotateCw className={state.loading ? "size-3 animate-spin" : "size-3"} />
                        重试
                      </Button>
                    </div>
                  )}

                  <StatsResultGrid fields={state.fields} result={state.result} loading={state.loading} />
                </div>
              </div>
            ) : (
              <div className="flex min-h-0 flex-1 flex-col overflow-hidden p-6">
                <div className="flex w-full shrink-0 flex-col items-center gap-3 pt-[min(26vh,140px)]">
                  <div className="flex w-full max-w-5xl flex-col items-center gap-3">
                    <h2 className="text-lg font-semibold">FOFA 统计聚合</h2>
                    <p className="text-sm text-muted-foreground">
                      输入查询语句，按字段查看资产分布
                    </p>
                    <div className="w-full max-w-2xl">
                      <SearchBox
                        value={state.query}
                        onChange={(value) => handleQueryChange(tab.id, value)}
                        onSearch={() => handleSearch(tab.id)}
                        searching={state.loading}
                        autoFocus
                      />
                    </div>
                  </div>
                </div>

                <div className="flex min-h-0 flex-1 justify-center overflow-y-auto pt-6">
                  <HistoryList
                    history={history}
                    onPick={(query) => {
                      const trimmed = query.trim()
                      if (!trimmed) return
                      add(trimmed)
                      void runStats(tab.id, { query: trimmed, submitted: true })
                    }}
                    onRemove={remove}
                    onClear={clear}
                  />
                </div>
              </div>
            )}
          </TabsContent>
        )
      })}
    </Tabs>
  )
}
