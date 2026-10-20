import { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"
import {
  AddHostHistory,
  ClearHostHistory,
  ListHostHistory,
  RemoveHostHistory,
} from "../../../wailsjs/go/app/App"
import { model } from "../../../wailsjs/go/models"

export type HostHistoryItem = model.HostHistoryItem

function reportHistoryError(action: string, error: unknown) {
  const description = error instanceof Error ? error.message : String(error)
  toast.error(`历史记录${action}失败`, { description })
}

export function useHostHistory() {
  const [history, setHistory] = useState<HostHistoryItem[]>([])

  const reload = useCallback(async () => {
    try {
      const items = await ListHostHistory()
      setHistory(items ?? [])
    } catch (e) {
      reportHistoryError("读取", e)
      setHistory([])
    }
  }, [])

  useEffect(() => {
    void reload()
  }, [reload])

  const add = useCallback(async (host: string) => {
    const h = host.trim()
    if (!h) return
    try {
      const items = await AddHostHistory(h)
      setHistory(items ?? [])
    } catch (e) {
      reportHistoryError("保存", e)
    }
  }, [])

  const remove = useCallback(async (id: string) => {
    try {
      const items = await RemoveHostHistory(id)
      setHistory(items ?? [])
    } catch (e) {
      reportHistoryError("删除", e)
    }
  }, [])

  const clear = useCallback(async () => {
    try {
      const items = await ClearHostHistory()
      setHistory(items ?? [])
    } catch (e) {
      reportHistoryError("清空", e)
    }
  }, [])

  return { history, add, remove, clear, reload }
}
