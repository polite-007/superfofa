import { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"
import {
  AddStatsHistory,
  ClearStatsHistory,
  ListStatsHistory,
  RemoveStatsHistory,
} from "../../../wailsjs/go/app/App"
import { model } from "../../../wailsjs/go/models"

export type StatsHistoryItem = model.QueryHistoryItem

function reportHistoryError(action: string, error: unknown) {
  const description = error instanceof Error ? error.message : String(error)
  toast.error(`历史记录${action}失败`, { description })
}

export function useStatsHistory() {
  const [history, setHistory] = useState<StatsHistoryItem[]>([])

  const reload = useCallback(async () => {
    try {
      const items = await ListStatsHistory()
      setHistory(items ?? [])
    } catch (e) {
      reportHistoryError("读取", e)
      setHistory([])
    }
  }, [])

  useEffect(() => {
    void reload()
  }, [reload])

  const add = useCallback(async (query: string) => {
    const q = query.trim()
    if (!q) return
    try {
      const items = await AddStatsHistory(q)
      setHistory(items ?? [])
    } catch (e) {
      reportHistoryError("保存", e)
    }
  }, [])

  const remove = useCallback(async (id: string) => {
    try {
      const items = await RemoveStatsHistory(id)
      setHistory(items ?? [])
    } catch (e) {
      reportHistoryError("删除", e)
    }
  }, [])

  const clear = useCallback(async () => {
    try {
      const items = await ClearStatsHistory()
      setHistory(items ?? [])
    } catch (e) {
      reportHistoryError("清空", e)
    }
  }, [])

  return { history, add, remove, clear, reload }
}
