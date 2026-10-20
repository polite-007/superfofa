export type ExportSource = "query" | "text" | "file"
export type ExportInputType = "syntax" | "ip" | "host" | "domain"
export type ExportTaskStatus = "pending" | "running" | "paused" | "failed" | "completed"

export type ExportField = {
  key: string
  label: string
  fofa_field: string
}

export type ExportTimeRange = {
  preset: string
  start: string
  end: string
}

export type ExportTaskItem = {
  id: string
  task_id: string
  index: number
  raw_input: string
  normalized_input: string
  normalized_query: string
  status: string
  next_page: number
  exported_rows: number
  error_message: string
}

export type ExportTask = {
  id: string
  name: string
  source: ExportSource
  input_type: ExportInputType
  source_file_name: string
  status: ExportTaskStatus
  pause_reason: string
  fail_reason: string
  message: string
  query_text: string
  raw_input: string
  time_range: ExportTimeRange
  fields: ExportField[]
  total_items: number
  completed_items: number
  current_item_index: number
  current_item_page: number
  exported_rows: number
  checkpoint_path: string
  output_path: string
  created_at: string
  updated_at: string
  items?: ExportTaskItem[]
}

export type ExportDraftForm = {
  taskName: string
  source: ExportSource
  inputType: ExportInputType
  text: string
  sourceFileName: string
  fields: ExportField[]
  fieldColumnKeys: string[]
  normalizedItems: string[]
  timeRange: ExportTimeRange
  // 仅来源为 query 时有效：查询页带过来的结果总数，用于预检展示
  estimatedTotal: number
}
