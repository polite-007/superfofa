import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

const STATUS_META: Record<string, { label: string; variant: "default" | "destructive" | "secondary" | "outline"; className?: string }> = {
  valid: { label: "有效", variant: "default", className: "bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/30" },
  invalid: { label: "key 无效", variant: "destructive" },
  error: { label: "检测失败", variant: "secondary", className: "bg-amber-500/15 text-amber-400 ring-1 ring-amber-500/30" },
  unchecked: { label: "未检测", variant: "outline" },
}

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const meta = STATUS_META[status] || STATUS_META.unchecked
  return (
    <Badge variant={meta.variant} className={cn(meta.className, className)}>
      {meta.label}
    </Badge>
  )
}
