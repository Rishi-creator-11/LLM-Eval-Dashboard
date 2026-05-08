"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Activity, AlertTriangle, Gauge, Trophy, Zap } from "lucide-react"
import { ms, pct } from "@/lib/format"
import type { AggregatedRow, RunResult } from "@/lib/llm/types"

interface Props {
  rows: AggregatedRow[]
  runs: RunResult[]
  durationMs: number
}

export function SummaryCards({ rows, runs, durationMs }: Props) {
  const totalRuns = runs.length
  const errors = runs.filter((r) => r.error).length
  const avgLatency = totalRuns ? runs.reduce((s, r) => s + r.latencyMs, 0) / totalRuns : 0
  const best = rows[0]
  const avgQuality = rows.length ? rows.reduce((s, r) => s + r.avgQuality, 0) / rows.length : 0

  const cards = [
    {
      label: "Top Model",
      value: best?.model ?? "—",
      sub: best ? `${pct(best.compositeScore)} composite` : "Run benchmark",
      icon: Trophy,
      accent: "text-chart-3",
      bg: "bg-chart-3/10",
    },
    {
      label: "Avg Quality",
      value: pct(avgQuality),
      sub: `${rows.length} models tested`,
      icon: Gauge,
      accent: "text-chart-1",
      bg: "bg-chart-1/10",
    },
    {
      label: "Avg Latency",
      value: ms(avgLatency),
      sub: `${totalRuns} API calls`,
      icon: Zap,
      accent: "text-chart-2",
      bg: "bg-chart-2/10",
    },
    {
      label: "Total Duration",
      value: ms(durationMs),
      sub: errors > 0 ? `${errors} errors` : "Clean run",
      icon: errors > 0 ? AlertTriangle : Activity,
      accent: errors > 0 ? "text-amber-500" : "text-emerald-500",
      bg: errors > 0 ? "bg-amber-500/10" : "bg-emerald-500/10",
    },
  ]

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((c) => {
        const Icon = c.icon
        return (
          <Card key={c.label} className="overflow-hidden">
            <CardContent className="flex items-center gap-3 p-4">
              <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${c.bg}`}>
                <Icon className={`h-5 w-5 ${c.accent}`} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">{c.label}</p>
                <p className="truncate text-lg font-semibold leading-tight">{c.value}</p>
                <p className="truncate text-xs text-muted-foreground">{c.sub}</p>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
