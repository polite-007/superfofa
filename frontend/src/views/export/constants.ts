export const EXPORT_PAGE_TABS = {
  create: "create",
  records: "records",
} as const

export const EXPORT_STATUS_OPTIONS = [
  { value: "all", label: "全部" },
  { value: "running", label: "执行中" },
  { value: "paused", label: "已暂停" },
  { value: "failed", label: "失败" },
  { value: "completed", label: "已完成" },
] as const
