import type { model } from "../../../wailsjs/go/models"
import { getStatsField, type StatsFieldKey } from "./stats-fields"
import { StatsCard } from "./stats-card"

export type StatsResultGridProps = {
  fields: StatsFieldKey[]
  result?: model.StatsFofaResult | null
  loading?: boolean
}

export function StatsResultGrid({ fields, result, loading = false }: StatsResultGridProps) {
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,280px),340px))] gap-3">
      {fields.map((fieldKey) => {
        const field = getStatsField(fieldKey)
        const rows = result?.aggs?.[fieldKey] ?? []

        return (
          <StatsCard
            key={fieldKey}
            field={field}
            rows={rows}
            returned={result?.returned?.[fieldKey]}
            distinct={result?.distinct?.[fieldKey]}
            total={result?.total}
            loading={loading}
          />
        )
      })}
    </div>
  )
}
