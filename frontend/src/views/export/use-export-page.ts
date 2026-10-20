import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { toast } from "sonner"
import { CloneExportTask, ContinueExportTask, CreateExportTask, DeleteExportTask, ListExportTasks, PrecheckExport } from "../../../wailsjs/go/app/App"
import { model } from "../../../wailsjs/go/models"
import { DEFAULT_PRESET_KEY, PRESETS, keysToColumns, type ColumnDef } from "@/views/query/columns"
import { consumeExportQueryDraft } from "./open-from-query"
import type { ExportDraftForm, ExportField, ExportTask } from "./types"
import { EXPORT_PAGE_TABS } from "./constants"

const EXPORT_TASK_POLL_MS = 3000

type ExportPrecheckPreview = {
  totalLines: number
  validItems: number
  duplicateItems: number
  invalidItems: number
  invalidExamples: string[]
  normalizedItems: string[]
  estimatedTotal: number
}

function defaultColumns(): ColumnDef[] {
  const preset = PRESETS.find((item) => item.key === DEFAULT_PRESET_KEY)
  return preset?.columns.length ? preset.columns : []
}

function columnsFromKeysOrDefault(keys: string[]): ColumnDef[] {
  const columns = keysToColumns(keys)
  return columns.length ? columns : defaultColumns()
}

function columnKeysFromFields(fields: ExportField[]): string[] {
  const keys = fields.flatMap((field) => {
    const [columnKey] = field.key.split(":")
    return columnKey ? [columnKey] : []
  })
  const seen = new Set<string>()
  return keys.filter((key) => {
    if (seen.has(key)) return false
    seen.add(key)
    return keysToColumns([key]).length > 0
  })
}

function columnsToFields(columns: ColumnDef[]): ExportField[] {
  return columns.flatMap((column) =>
    column.fields.map((field) => ({
      key: `${column.key}:${field}`,
      label: column.label,
      fofa_field: field,
    })),
  )
}

export function useExportPage() {
  const initialColumns = useMemo(() => defaultColumns(), [])
  const initialFieldColumnKeys = useMemo(() => initialColumns.map((column) => column.key), [initialColumns])
  const initialFields = useMemo(() => columnsToFields(initialColumns), [initialColumns])

  const precheckRequestIdRef = useRef(0)

  const [activeTab, setActiveTab] = useState<string>(EXPORT_PAGE_TABS.records)
  const [tasks, setTasks] = useState<ExportTask[]>([])
  const [loading, setLoading] = useState(false)
  const [precheckPreview, setPrecheckPreview] = useState<ExportPrecheckPreview | null>(null)
  const [precheckedDraft, setPrecheckedDraft] = useState<ExportDraftForm | null>(null)
  const [precheckDialogOpen, setPrecheckDialogOpenState] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [draft, setDraft] = useState<ExportDraftForm>({
    taskName: "",
    source: "text",
    inputType: "syntax",
    text: "",
    sourceFileName: "",
    fields: initialFields,
    fieldColumnKeys: initialFieldColumnKeys,
    normalizedItems: [],
    timeRange: { preset: "", start: "", end: "" },
    estimatedTotal: 0,
  })

  const refreshTasks = useCallback(async () => {
    setLoading(true)
    try {
      const items = await ListExportTasks()
      setTasks(items as ExportTask[])
    } catch (error) {
      toast.error("加载导出记录失败", {
        description: error instanceof Error ? error.message : String(error),
      })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refreshTasks()
  }, [refreshTasks])

  useEffect(() => {
    const timer = window.setInterval(() => {
      void refreshTasks()
    }, EXPORT_TASK_POLL_MS)
    return () => window.clearInterval(timer)
  }, [refreshTasks])

  useEffect(() => {
    const draftFromQuery = consumeExportQueryDraft()
    if (draftFromQuery) {
      const columns = columnsFromKeysOrDefault(draftFromQuery.columnKeys)
      setDraft({
        taskName: "",
        source: "query",
        inputType: "syntax",
        text: draftFromQuery.query,
        sourceFileName: "",
        fields: columnsToFields(columns),
        fieldColumnKeys: columns.map((column) => column.key),
        normalizedItems: [],
        timeRange: { preset: "", start: "", end: "" },
        estimatedTotal: draftFromQuery.total ?? 0,
      })
      setActiveTab(EXPORT_PAGE_TABS.create)
    }
  }, [])

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<{ tab?: string }>).detail
      setActiveTab(detail?.tab ?? EXPORT_PAGE_TABS.records)
    }
    window.addEventListener("superfofa:open-export-tab", handler)
    return () => window.removeEventListener("superfofa:open-export-tab", handler)
  }, [])

  const setPrecheckDialogOpen = useCallback((open: boolean) => {
    setPrecheckDialogOpenState(open)
    if (!open) {
      setPrecheckPreview(null)
      setPrecheckedDraft(null)
    }
  }, [])

  const precheckDraft = useCallback(async () => {
    const result = await PrecheckExport(new model.ExportPrecheckReq({
      source: draft.source,
      input_type: draft.inputType,
      text: draft.text,
      source_file_name: draft.sourceFileName,
      task_name: draft.taskName,
      fields: draft.fields,
      time_range: draft.timeRange,
    }))

    return {
      totalLines: result.total_lines,
      validItems: result.valid_items,
      duplicateItems: result.duplicate_items,
      invalidItems: result.invalid_items,
      invalidExamples: result.invalid_examples ?? [],
      normalizedItems: result.normalized_items ?? [],
      estimatedTotal: draft.estimatedTotal,
    }
  }, [draft])

  const requestCreateTask = useCallback(async () => {
    const requestId = precheckRequestIdRef.current + 1
    precheckRequestIdRef.current = requestId
    setSubmitting(true)
    try {
      const nextPreview = await precheckDraft()
      if (precheckRequestIdRef.current !== requestId) return
      setPrecheckPreview(nextPreview)
      setPrecheckedDraft({
        ...draft,
        fields: draft.fields.map((field) => ({ ...field })),
        fieldColumnKeys: [...draft.fieldColumnKeys],
        normalizedItems: [...draft.normalizedItems],
        timeRange: { ...draft.timeRange },
      })
      setPrecheckDialogOpenState(true)
    } catch (error) {
      if (precheckRequestIdRef.current !== requestId) return
      setPrecheckDialogOpen(false)
      toast.error("导出预检失败", {
        description: error instanceof Error ? error.message : String(error),
      })
    } finally {
      if (precheckRequestIdRef.current === requestId) {
        setSubmitting(false)
      }
    }
  }, [draft, precheckDraft, setPrecheckDialogOpen])

  const confirmCreateTask = useCallback(async () => {
    if (!precheckPreview || !precheckedDraft) {
      toast.warning("请先完成预检")
      return
    }
    setSubmitting(true)
    try {
      await CreateExportTask(new model.CreateExportTaskReq({
        task_name: precheckedDraft.taskName,
        source: precheckedDraft.source,
        input_type: precheckedDraft.inputType,
        text: precheckedDraft.text,
        source_file_name: precheckedDraft.sourceFileName,
        fields: precheckedDraft.fields,
        time_range: precheckedDraft.timeRange,
        normalized_items: precheckPreview.normalizedItems,
      }))
      toast.success("导出任务已创建")
      setPrecheckDialogOpen(false)
      setPrecheckPreview(null)
      await refreshTasks()
      setActiveTab(EXPORT_PAGE_TABS.records)
    } catch (error) {
      toast.error("创建导出任务失败", {
        description: error instanceof Error ? error.message : String(error),
      })
    } finally {
      setSubmitting(false)
    }
  }, [precheckPreview, precheckedDraft, refreshTasks, setPrecheckDialogOpen])

  const deleteTask = useCallback(async (taskId: string) => {
    await DeleteExportTask(taskId)
    await refreshTasks()
  }, [refreshTasks])

  const continueTask = useCallback(async (taskId: string) => {
    await ContinueExportTask(taskId)
    await refreshTasks()
  }, [refreshTasks])

  const cloneTask = useCallback(async (taskId: string) => {
    const cloned = await CloneExportTask(new model.CloneExportTaskReq({ task_id: taskId }))
    const clonedFieldColumnKeys = columnKeysFromFields(cloned.fields)
    const fallbackColumns = columnsFromKeysOrDefault(clonedFieldColumnKeys)
    setDraft({
      taskName: cloned.task_name,
      source: cloned.source as ExportDraftForm["source"],
      inputType: cloned.input_type as ExportDraftForm["inputType"],
      text: cloned.text,
      sourceFileName: cloned.source_file_name,
      fields: cloned.fields?.length ? cloned.fields : columnsToFields(fallbackColumns),
      fieldColumnKeys: fallbackColumns.map((column) => column.key),
      normalizedItems: cloned.normalized_items,
      timeRange: cloned.time_range,
      estimatedTotal: 0,
    })
    setPrecheckPreview(null)
    setPrecheckDialogOpen(false)
    setActiveTab(EXPORT_PAGE_TABS.create)
  }, [])

  const fieldCount = useMemo(() => draft.fieldColumnKeys.length, [draft.fieldColumnKeys])

  return {
    activeTab,
    setActiveTab,
    tasks,
    loading,
    refreshTasks,
    draft,
    setDraft,
    precheckPreview,
    precheckDialogOpen,
    setPrecheckDialogOpen,
    submitting,
    requestCreateTask,
    confirmCreateTask,
    deleteTask,
    continueTask,
    cloneTask,
    fieldCount,
  }
}
