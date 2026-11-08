"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Trophy, AlertTriangle, CheckCircle2 } from "lucide-react"
import { ms, pct, providerLabel, scoreVariant } from "@/lib/format"
import type { AggregatedRow } from "@/lib/llm/types"

interface Props {
  rows: AggregatedRow[]
}

export function Leaderboard({ rows }: Props) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-4 w-4 text-primary" />
              Model Leaderboard
            </CardTitle>
            <CardDescription>Composite = 0.5·Quality + 0.3·Consistency + 0.2·(1−Hallucination). Quality, ROUGE-L, Hallucination and Consistency are text-overlap heuristics, not ground-truth judgments.</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-0 pb-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left font-medium">#</th>
                <th className="px-4 py-3 text-left font-medium">Model</th>
                <th className="px-4 py-3 text-right font-medium">Composite</th>
                <th className="px-4 py-3 text-right font-medium">Quality</th>
                <th className="px-4 py-3 text-right font-medium">ROUGE-L</th>
                <th className="px-4 py-3 text-right font-medium">Consistency</th>
                <th className="px-4 py-3 text-right font-medium">Halluc.</th>
                <th className="px-4 py-3 text-right font-medium">Latency</th>
                <th className="px-4 py-3 text-right font-medium">Tokens</th>
                <th className="px-4 py-3 text-right font-medium">Errors</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.modelId} className="border-b last:border-b-0 transition-colors hover:bg-muted/30">
                  <td className="px-4 py-3 font-mono text-muted-foreground">{i + 1}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-0.5">
                      <span className="font-medium">{r.model}</span>
                      <Badge
                        variant="outline"
                        className={`w-fit text-[10px] ${
                          r.provider === "gemini"
                            ? "border-chart-1/30 bg-chart-1/10 text-chart-1"
                            : "border-chart-2/30 bg-chart-2/10 text-chart-2"
                        }`}
                      >
                        {providerLabel(r.provider)}
                      </Badge>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Badge variant={scoreVariant(r.compositeScore)} className="font-mono">
                      {pct(r.compositeScore)}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right font-mono">{pct(r.avgQuality)}</td>
                  <td className="px-4 py-3 text-right font-mono text-muted-foreground">{pct(r.avgRougeL)}</td>
                  <td className="px-4 py-3 text-right font-mono">{pct(r.avgConsistency)}</td>
                  <td className="px-4 py-3 text-right font-mono">{pct(r.avgHallucination)}</td>
                  <td className="px-4 py-3 text-right font-mono">{ms(r.avgLatencyMs)}</td>
                  <td className="px-4 py-3 text-right font-mono text-muted-foreground">{Math.round(r.avgTokens)}</td>
                  <td className="px-4 py-3 text-right">
                    {r.errors > 0 ? (
                      <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400">
                        <AlertTriangle className="h-3 w-3" />
                        {r.errors}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 className="h-3 w-3" />0
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}
