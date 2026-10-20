import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { model } from "../../../wailsjs/go/models"

type Stat = {
  value: number
  label: string
  tone?: string // 数字颜色
}

function StatCard({ value, label, tone }: Stat) {
  return (
    <Card size="sm" className="flex flex-col items-center justify-center gap-0.5 py-3 text-center ring-foreground/10">
      <span className={cn("font-mono text-2xl font-semibold leading-none tabular-nums", tone ?? "text-foreground")}>
        {value}
      </span>
      <span className="text-[11px] text-muted-foreground">{label}</span>
    </Card>
  )
}

export function HostStats({ stats }: { stats: Stat[] }) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {stats.map((s) => (
        <StatCard key={s.label} {...s} />
      ))}
    </div>
  )
}

// 由结果计算 KPI（普通模式）
export function normalStats(result: model.HostResult): Stat[] {
  return [
    { value: result.port?.length ?? 0, label: "开放端口", tone: "text-primary" },
    { value: result.protocol?.length ?? 0, label: "协议数" },
    { value: result.product?.length ?? 0, label: "产品数", tone: "text-violet-500" },
    { value: result.category?.length ?? 0, label: "分类数", tone: "text-amber-500" },
  ]
}

// 由结果计算 KPI（详情模式）
export function detailStats(result: model.HostResult): Stat[] {
  const ports = result.ports ?? []
  const allProducts = ports.flatMap((p) => p.products ?? [])
  const portsWithProducts = ports.filter((p) => (p.products?.length ?? 0) > 0).length
  const hardwareCount = allProducts.filter((p) => p.sort_hard_code === 1).length
  return [
    { value: ports.length, label: "开放端口", tone: "text-primary" },
    { value: allProducts.length, label: "产品数", tone: "text-violet-500" },
    { value: portsWithProducts, label: "有产品端口" },
    { value: hardwareCount, label: "硬件产品", tone: "text-rose-500" },
  ]
}
