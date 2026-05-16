"use client"

import { useMemo, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { ChevronDown, ChevronUp, AlertCircle } from "lucide-react"
import { ms, pct, scoreVariant } from "@/lib/format"
import type { RunResult } from "@/lib/llm/types"

interface Props {
  runs: RunResult[]
}

export function ResponseViewer({ runs }: Props) {
  const cases = useMemo(() => {
    const map = new Map<string, RunResult[]>()
    for (const r of runs) {
      if (!map.has(r.caseId)) map.set(r.caseId, [])
      map.get(r.caseId)!.push(r)
    }
    return Array.from(map.entries())
  }, [runs])

  const [openCases, setOpenCases] = useState<Set<string>>(() => new Set(cases.length ? [cases[0][0]] : []))

  const toggle = (id: string) =>
    setOpenCases((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Response Inspector</CardTitle>
        <CardDescription>Drill into each evaluation case and compare raw model outputs.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {cases.map(([caseId, group]) => {
          const first = group[0]
          const isOpen = openCases.has(caseId)
          return (
            <div key={caseId} className="rounded-lg border bg-card">
              <div
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') toggle(caseId) }}
                onClick={() => toggle(caseId)}
                className="flex w-full items-start justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-accent/40 cursor-pointer"
              >
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px]">
                      {first.category}
                    </Badge>
                    <span className="text-xs font-mono text-muted-foreground">{caseId}</span>
                    <span className="text-xs text-muted-foreground">· {group.length} runs</span>
                  </div>
                  <p className="line-clamp-2 text-sm">{first.prompt}</p>
                </div>
                <div className="flex items-center justify-center h-7 w-7 shrink-0 rounded-md hover:bg-accent/50 text-muted-foreground">
                  {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </div>
              </div>

              {isOpen && (
                <div className="space-y-3 border-t bg-muted/20 p-4">
                  {first.reference && (
                    <div className="space-y-1">
                      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Reference answer
                      </div>
                      <div className="rounded-md border bg-background px-3 py-2 text-sm font-mono">
                        {first.reference}
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Model responses
                    </div>
                    <div className="grid grid-cols-1 gap-2">
                      {group.map((r, i) => (
                        <div key={`${r.modelId}-${i}`} className="rounded-md border bg-background">
                          <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-muted/40 px-3 py-2">
                            <div className="flex items-center gap-2">
                              <Badge
                                variant="outline"
                                className={`text-[10px] ${
                                  r.provider === "gemini"
                                    ? "border-chart-1/30 bg-chart-1/10 text-chart-1"
                                    : "border-chart-2/30 bg-chart-2/10 text-chart-2"
                                }`}
                              >
                                {r.provider}
                              </Badge>
                              <span className="text-xs font-medium">{r.model}</span>
                              <span className="text-[10px] text-muted-foreground">run #{r.runIndex + 1}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Badge variant={scoreVariant(r.quality)} className="font-mono text-[10px]">
                                Q {pct(r.quality)}
                              </Badge>
                              <Badge
                                variant={r.hallucination > 0.5 ? "destructive" : "outline"}
                                className="font-mono text-[10px]"
                              >
                                H {pct(r.hallucination)}
                              </Badge>
                              <Badge variant="outline" className="font-mono text-[10px]">
                                {ms(r.latencyMs)}
                              </Badge>
                            </div>
                          </div>
                          <ScrollArea className="max-h-60">
                            <div className="px-3 py-2 text-sm whitespace-pre-wrap font-mono">
                              {r.error ? (
                                <span className="inline-flex items-center gap-1.5 text-destructive">
                                  <AlertCircle className="h-3.5 w-3.5" />
                                  {r.error}
                                </span>
                              ) : (
                                r.response || <span className="text-muted-foreground italic">(empty response)</span>
                              )}
                            </div>
                          </ScrollArea>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
