import { Card } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Globe, Network, Clock, Server } from "lucide-react"
import { model } from "../../../wailsjs/go/models"

function Field({
  icon: Icon,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>
  children: React.ReactNode
}) {
  return (
    <span className="inline-flex min-w-0 items-center gap-1.5">
      <Icon className="size-3.5 shrink-0 text-muted-foreground" />
      <span className="truncate">{children}</span>
    </span>
  )
}

export function HostSummary({ result }: { result: model.HostResult }) {
  const code = result.country_code?.trim().toUpperCase()
  const asnText = result.asn ? `AS${result.asn}` : ""
  const orgText = [asnText, result.org].filter(Boolean).join(" · ")
  const hasLocation = Boolean(code || result.country_name)

  return (
    <Card className="relative overflow-hidden ring-foreground/10">
      {/* 左侧强调色条 */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 px-6 py-3.5 pl-6">
        <div className="flex items-center gap-2.5">
          <Server className="size-3 shrink-0 text-primary" />
          <span className="font-mono tabular-nums tracking-tight">
            {result.ip || result.host}
          </span>
        </div>

        {hasLocation && (
          <Field icon={Globe}>
            {code && (
              <span className="shrink-0 rounded border border-border bg-muted px-1 py-0.5 text-[10px] font-semibold leading-none text-muted-foreground">
                {code}
              </span>
            )}
            <span className="ml-1">{result.country_name}</span>
          </Field>
        )}

        {orgText && <Field icon={Network}>{orgText}</Field>}

        <div className="ml-auto flex items-center gap-3 text-[11px] text-muted-foreground">
          {result.update_time && (
            <Field icon={Clock}>
              <span>更新 {result.update_time}</span>
            </Field>
          )}
          <Separator orientation="vertical" className="h-4" />
          <span>用时 {result.elapsed_ms}ms</span>
        </div>
      </div>
    </Card>
  )
}
