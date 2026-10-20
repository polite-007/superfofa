import { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"
import {
  AddQueryHistory,
  ClearQueryHistory,
  ListQueryHistory,
  RemoveQueryHistory,
} from "../../../wailsjs/go/app/App"
import { model } from "../../../wailsjs/go/models"

export type HistoryItem = model.QueryHistoryItem

function reportHistoryError(action: string, error: unknown) {
  const description = error instanceof Error ? error.message : String(error)
  toast.error(`历史记录${action}失败`, { description })
}

export function useQueryHistory() {
  const [history, setHistory] = useState<HistoryItem[]>([])

  const reload = useCallback(async () => {
    try {
      const items = await ListQueryHistory()
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
      const items = await AddQueryHistory(q)
      setHistory(items ?? [])
    } catch (e) {
      reportHistoryError("保存", e)
    }
  }, [])

  const remove = useCallback(async (id: string) => {
    try {
      const items = await RemoveQueryHistory(id)
      setHistory(items ?? [])
    } catch (e) {
      reportHistoryError("删除", e)
    }
  }, [])

  const clear = useCallback(async () => {
    try {
      const items = await ClearQueryHistory()
      setHistory(items ?? [])
    } catch (e) {
      reportHistoryError("清空", e)
    }
  }, [])

  return { history, add, remove, clear, reload }
}
