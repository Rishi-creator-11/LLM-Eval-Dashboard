"use client"

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ms, pct } from "@/lib/format"
import type { AggregatedRow, RunResult } from "@/lib/llm/types"

const CHART_COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
  "hsl(201 96% 50%)",
  "hsl(160 84% 50%)",
]

function colorFor(idx: number) {
  return CHART_COLORS[idx % CHART_COLORS.length]
}

/* ------------------------------------------------------------------ */
/*  Quality vs Latency scatter                                         */
/* ------------------------------------------------------------------ */

export function QualityVsLatencyChart({ rows }: { rows: AggregatedRow[] }) {
  const data = rows.map((r, i) => ({
    name: r.model,
    quality: +(r.avgQuality * 100).toFixed(1),
    latency: Math.round(r.avgLatencyMs),
    consistency: +(r.avgConsistency * 100).toFixed(1),
    color: colorFor(i),
  }))

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Quality vs Latency</CardTitle>
        <CardDescription>Top-left is best: high quality, low latency. Bubble size = consistency.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[340px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 10, right: 20, bottom: 30, left: 0 }}>
              <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" />
              <XAxis
                type="number"
                dataKey="latency"
                name="Latency"
                tickFormatter={(v) => ms(v)}
                stroke="hsl(var(--muted-foreground))"
                fontSize={11}
                label={{
                  value: "Avg latency",
                  position: "insideBottom",
                  offset: -10,
                  fill: "hsl(var(--muted-foreground))",
                  fontSize: 11,
                }}
              />
              <YAxis
                type="number"
                dataKey="quality"
                name="Quality"
                domain={[0, 100]}
                tickFormatter={(v) => `${v}%`}
                stroke="hsl(var(--muted-foreground))"
                fontSize={11}
              />
              <ZAxis type="number" dataKey="consistency" range={[80, 360]} />
              <Tooltip cursor={{ strokeDasharray: "3 3" }} content={<ScatterTooltip />} />
              <Scatter data={data} shape="circle">
                {data.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {data.map((d, i) => (
            <div key={i} className="flex items-center gap-1.5 text-xs">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: d.color }} />
              <span className="text-muted-foreground">{d.name}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

function ScatterTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div className="rounded-md border bg-popover px-3 py-2 text-xs shadow-md">
      <div className="font-medium">{d.name}</div>
      <div className="mt-1 grid grid-cols-2 gap-x-3 text-muted-foreground">
        <span>Quality</span>
        <span className="text-right font-mono text-foreground">{d.quality}%</span>
        <span>Latency</span>
        <span className="text-right font-mono text-foreground">{ms(d.latency)}</span>
        <span>Consistency</span>
        <span className="text-right font-mono text-foreground">{d.consistency}%</span>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Per-category radar                                                 */
/* ------------------------------------------------------------------ */

export function CategoryRadarChart({
  perCategory,
  rows,
}: {
  perCategory: Array<{ modelId: string; category: string; quality: number; latencyMs: number; hallucination: number }>
  rows: AggregatedRow[]
}) {
  const categories = Array.from(new Set(perCategory.map((r) => r.category)))
  const data = categories.map((cat) => {
    const entry: Record<string, number | string> = { category: cat }
    for (const r of rows) {
      const m = perCategory.find((x) => x.modelId === r.modelId && x.category === cat)
      entry[r.model] = m ? +(m.quality * 100).toFixed(1) : 0
    }
    return entry
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Quality by Category</CardTitle>
        <CardDescription>Higher area = stronger across diverse evaluation tasks.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[340px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={data} margin={{ top: 10, right: 20, bottom: 0, left: 20 }}>
              <PolarGrid stroke="hsl(var(--border))" />
              <PolarAngleAxis
                dataKey="category"
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
              />
              <PolarRadiusAxis domain={[0, 100]} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} />
              {rows.map((r, i) => (
                <Radar
                  key={r.modelId}
                  dataKey={r.model}
                  stroke={colorFor(i)}
                  fill={colorFor(i)}
                  fillOpacity={0.18}
                  strokeWidth={2}
                />
              ))}
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Tooltip
                contentStyle={{
                  background: "hsl(var(--popover))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 6,
                  fontSize: 12,
                }}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}

/* ------------------------------------------------------------------ */
/*  Latency bar                                                        */
/* ------------------------------------------------------------------ */

export function LatencyChart({ rows }: { rows: AggregatedRow[] }) {
  const data = rows
    .slice()
    .sort((a, b) => a.avgLatencyMs - b.avgLatencyMs)
    .map((r, i) => ({
      name: r.model,
      latency: Math.round(r.avgLatencyMs),
      color: colorFor(i),
    }))

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Latency Comparison</CardTitle>
        <CardDescription>Average response time per model (lower is better).</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ top: 0, right: 20, bottom: 0, left: 80 }}>
              <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" horizontal={false} />
              <XAxis
                type="number"
                tickFormatter={(v) => ms(v)}
                stroke="hsl(var(--muted-foreground))"
                fontSize={11}
              />
              <YAxis
                type="category"
                dataKey="name"
                stroke="hsl(var(--muted-foreground))"
                fontSize={11}
                width={120}
                interval={0}
              />
              <Tooltip
                cursor={{ fill: "hsl(var(--accent))" }}
                contentStyle={{
                  background: "hsl(var(--popover))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 6,
                  fontSize: 12,
                }}
                formatter={(v: number) => [ms(v), "Latency"]}
              />
              <Bar dataKey="latency" radius={[0, 4, 4, 0]}>
                {data.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}

/* ------------------------------------------------------------------ */
/*  Hallucination heatmap                                              */
/* ------------------------------------------------------------------ */

export function HallucinationHeatmap({
  perCategory,
  rows,
}: {
  perCategory: Array<{ modelId: string; category: string; quality: number; latencyMs: number; hallucination: number }>
  rows: AggregatedRow[]
}) {
  const categories = Array.from(new Set(perCategory.map((r) => r.category)))

  const cellColor = (h: number) => {
    // Green low, amber mid, red high
    if (h < 0.2) return "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300"
    if (h < 0.4) return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
    if (h < 0.6) return "bg-amber-500/20 text-amber-700 dark:text-amber-300"
    if (h < 0.8) return "bg-orange-500/25 text-orange-800 dark:text-orange-300"
    return "bg-red-500/25 text-red-800 dark:text-red-300"
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Hallucination Heatmap</CardTitle>
        <CardDescription>Hallucination score per model × category. Lower (greener) is better.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr>
                <th className="sticky left-0 bg-card px-3 py-2 text-left font-medium text-muted-foreground">Model</th>
                {categories.map((c) => (
                  <th key={c} className="px-3 py-2 text-center font-medium text-muted-foreground">
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.modelId} className="border-t">
                  <td className="sticky left-0 bg-card px-3 py-2 font-medium">{r.model}</td>
                  {categories.map((cat) => {
                    const cell = perCategory.find((x) => x.modelId === r.modelId && x.category === cat)
                    const h = cell?.hallucination ?? 0
                    return (
                      <td key={cat} className="px-1.5 py-1">
                        <div
                          className={`flex h-10 items-center justify-center rounded font-mono text-xs font-medium ${cellColor(h)}`}
                        >
                          {pct(h)}
                        </div>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}

/* ------------------------------------------------------------------ */
/*  Metric comparison stacked bar                                      */
/* ------------------------------------------------------------------ */

export function MetricComparisonChart({ rows }: { rows: AggregatedRow[] }) {
  const data = rows.map((r) => ({
    name: r.model,
    Quality: +(r.avgQuality * 100).toFixed(1),
    Consistency: +(r.avgConsistency * 100).toFixed(1),
    "1 - Hallucination": +((1 - r.avgHallucination) * 100).toFixed(1),
  }))

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Metric Breakdown</CardTitle>
        <CardDescription>Side-by-side quality, consistency and inverse hallucination.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[320px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 10, right: 20, bottom: 50, left: 0 }}>
              <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" />
              <XAxis
                dataKey="name"
                stroke="hsl(var(--muted-foreground))"
                fontSize={10}
                angle={-25}
                textAnchor="end"
                height={70}
                interval={0}
              />
              <YAxis
                domain={[0, 100]}
                tickFormatter={(v) => `${v}%`}
                stroke="hsl(var(--muted-foreground))"
                fontSize={11}
              />
              <Tooltip
                contentStyle={{
                  background: "hsl(var(--popover))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 6,
                  fontSize: 12,
                }}
                formatter={(v: number) => `${v.toFixed(1)}%`}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="Quality" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Consistency" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
              <Bar dataKey="1 - Hallucination" fill="hsl(var(--chart-3))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}

/* ------------------------------------------------------------------ */
/*  Per-run latency distribution                                       */
/* ------------------------------------------------------------------ */

export function RunLatencyChart({ runs }: { runs: RunResult[] }) {
  const byModel = new Map<string, RunResult[]>()
  for (const r of runs) {
    if (!byModel.has(r.modelId)) byModel.set(r.modelId, [])
    byModel.get(r.modelId)!.push(r)
  }

  const data: any[] = []
  let i = 0
  for (const [modelId, list] of byModel) {
    list.forEach((r, idx) => {
      data.push({
        x: idx,
        y: Math.round(r.latencyMs),
        name: r.model,
        modelId,
        color: colorFor(i),
      })
    })
    i++
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Per-Run Latency Distribution</CardTitle>
        <CardDescription>Each dot is a single API call. Tighter clusters = predictable latency.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 10, right: 20, bottom: 10, left: 0 }}>
              <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" />
              <XAxis
                type="number"
                dataKey="x"
                name="Run #"
                stroke="hsl(var(--muted-foreground))"
                fontSize={11}
                allowDecimals={false}
              />
              <YAxis
                type="number"
                dataKey="y"
                name="Latency"
                tickFormatter={(v) => ms(v)}
                stroke="hsl(var(--muted-foreground))"
                fontSize={11}
              />
              <Tooltip
                cursor={{ strokeDasharray: "3 3" }}
                content={({ active, payload }: any) => {
                  if (!active || !payload?.length) return null
                  const d = payload[0].payload
                  return (
                    <div className="rounded-md border bg-popover px-3 py-2 text-xs shadow-md">
                      <div className="font-medium">{d.name}</div>
                      <div className="font-mono text-muted-foreground">{ms(d.y)}</div>
                    </div>
                  )
                }}
              />
              <Scatter data={data}>
                {data.map((entry, idx) => (
                  <Cell key={idx} fill={entry.color} />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
