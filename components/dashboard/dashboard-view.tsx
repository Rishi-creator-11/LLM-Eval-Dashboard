"use client"

import { useEffect, useState } from "react"
import { ControlPanel, type RunConfig } from "./control-panel"
import { Leaderboard } from "./leaderboard"
import {
  CategoryRadarChart,
  HallucinationHeatmap,
  LatencyChart,
  MetricComparisonChart,
  QualityVsLatencyChart,
  RunLatencyChart,
} from "./charts"
import { ResponseViewer } from "./response-viewer"
import { SummaryCards } from "./summary-cards"
import { EmptyState } from "./empty-state"
import { SiteHeader } from "./site-header"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Loader2, Download, AlertCircle, Save, Trash2, History, ChevronRight } from "lucide-react"
import type { AggregatedRow, ModelInfo, RunResult } from "@/lib/llm/types"
import { loadApiKeys, type StoredApiKeys } from "@/lib/storage"
import { loadSavedRuns, saveRun, deleteRun, type SavedRun } from "@/lib/storage"

interface ApiMeta {
  models: ModelInfo[]
  categories: { name: string; count: number }[]
  keys: { gemini: number; groq: number; openai: number; anthropic: number }
}

interface BenchmarkResult {
  rows: RunResult[]
  perModel: AggregatedRow[]
  perCategory: Array<{ modelId: string; category: string; quality: number; latencyMs: number; hallucination: number }>
  startedAt: number
  finishedAt: number
}

export function DashboardView() {
  const [meta, setMeta] = useState<ApiMeta | null>(null)
  const [metaError, setMetaError] = useState<string | null>(null)
  const [running, setRunning] = useState(false)
  const [result, setResult] = useState<BenchmarkResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [savedRuns, setSavedRuns] = useState<SavedRun[]>([])
  const [compareRunId, setCompareRunId] = useState<string | null>(null)
  const [apiKeys, setApiKeys] = useState<StoredApiKeys | null>(null)

  useEffect(() => {
    setSavedRuns(loadSavedRuns())
    loadApiKeys().then(setApiKeys)
    let cancelled = false
    fetch("/api/models")
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) setMeta(data)
      })
      .catch((e) => {
        if (!cancelled) setMetaError(e?.message || "Failed to load models")
      })
    return () => {
      cancelled = true
    }
  }, [])

  const handleRun = async (config: RunConfig) => {
    setRunning(true)
    setError(null)
    try {
      const payload = { ...config, clientKeys: apiKeys ?? undefined }
      const res = await fetch("/api/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || `Request failed (${res.status})`)
      } else {
        setResult(data)
      }
    } catch (e: any) {
      setError(e?.message || "Request failed")
    } finally {
      setRunning(false)
    }
  }

  const handleSaveRun = () => {
    if (!result) return
    const id = crypto.randomUUID()
    const name = `Run ${new Date().toLocaleString()}`
    const run: SavedRun = {
      id,
      name,
      timestamp: Date.now(),
      models: result.perModel.map((r) => r.modelId),
      categories: Array.from(new Set(result.rows.map((r) => r.category))),
      runsPerCase: 1,
      temperature: 0.4,
      aggregated: result.perModel,
      rawRuns: result.rows,
    }
    saveRun(run)
    setSavedRuns(loadSavedRuns())
  }

  const handleDeleteRun = (id: string) => {
    deleteRun(id)
    setSavedRuns(loadSavedRuns())
    if (compareRunId === id) setCompareRunId(null)
  }

  const compareRun = savedRuns.find((r) => r.id === compareRunId) ?? null

  const activeResult: BenchmarkResult | null = compareRun
    ? {
        rows: compareRun.rawRuns,
        perModel: compareRun.aggregated,
        perCategory: [],
        startedAt: compareRun.timestamp,
        finishedAt: compareRun.timestamp,
      }
    : result

  const handleExport = () => {
    const data = activeResult ?? result
    if (!data) return
    const headers = [
      "case_id","category","model_id","provider","model","run_index","latency_ms",
      "total_tokens","quality","rouge_l","hallucination","keyword_coverage","error","prompt","response",
    ]
    const escape = (v: any) => {
      const s = String(v ?? "")
      if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`
      return s
    }
    const lines = [headers.join(",")]
    for (const r of data.rows) {
      lines.push(
        [
          r.caseId, r.category, r.modelId, r.provider, r.model, r.runIndex, Math.round(r.latencyMs),
          r.totalTokens, r.quality.toFixed(4), r.rougeL.toFixed(4), r.hallucination.toFixed(4),
          r.keywordCoverage.toFixed(4), r.error ?? "", r.prompt, r.response,
        ]
          .map(escape)
          .join(","),
      )
    }
    const blob = new Blob([lines.join("\n")], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `llm-eval-${new Date().toISOString().slice(0, 19).replace(/:/g, "-")}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="min-h-screen">
      <SiteHeader
        modelCount={meta?.models.length ?? 0}
        keys={meta?.keys ?? { gemini: 0, groq: 0, openai: 0, anthropic: 0 }}
      />

      <main className="mx-auto grid max-w-[1500px] grid-cols-1 gap-6 px-4 py-6 lg:grid-cols-[380px_1fr] lg:px-6">
        <aside className="space-y-4 lg:max-w-sm">
          {meta ? (
            <ControlPanel
              models={meta.models}
              categories={meta.categories}
              isRunning={running}
              onRun={handleRun}
            />
          ) : metaError ? (
            <Card>
              <CardContent className="flex items-start gap-2 p-4 text-sm text-destructive">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{metaError}</span>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="flex items-center gap-2 p-6 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading config...
              </CardContent>
            </Card>
          )}

          {savedRuns.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <History className="h-4 w-4 text-muted-foreground" />
                  <CardTitle className="text-sm font-medium">Saved Runs</CardTitle>
                </div>
                <CardDescription className="text-xs">
                  Click to view a previous run
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-1 p-3 pt-0">
                <ScrollArea className="h-48">
                  {savedRuns.map((run) => (
                    <div
                      key={run.id}
                      className={`group flex items-center justify-between rounded-md px-2 py-1.5 text-sm cursor-pointer ${
                        compareRunId === run.id ? "bg-muted font-medium" : "hover:bg-muted/50"
                      }`}
                      onClick={() => setCompareRunId(run.id === compareRunId ? null : run.id)}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <ChevronRight className={`h-3 w-3 shrink-0 transition-transform ${compareRunId === run.id ? "rotate-90" : ""}`} />
                        <span className="truncate">{run.name}</span>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100">
                        <Badge variant="outline" className="text-[10px] shrink-0">
                          {run.models.length} models
                        </Badge>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDeleteRun(run.id)
                          }}
                        >
                          <Trash2 className="h-3 w-3 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </ScrollArea>
                {compareRunId && (
                  <Button variant="ghost" size="sm" className="w-full text-xs" onClick={() => setCompareRunId(null)}>
                    Return to current run
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </aside>

        <section className="min-w-0 space-y-6">
          {error && (
            <Card className="border-destructive/40 bg-destructive/5">
              <CardContent className="flex items-start gap-2 p-4 text-sm text-destructive">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <div>
                  <p className="font-medium">Benchmark failed</p>
                  <p className="text-destructive/80">{error}</p>
                </div>
              </CardContent>
            </Card>
          )}

          {running && !activeResult && (
            <Card>
              <CardContent className="flex items-center gap-3 p-8 text-sm">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                <div>
                  <p className="font-medium">Running benchmark…</p>
                  <p className="text-muted-foreground">
                    Calling models in parallel. Larger runs may take up to a minute.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {activeResult ? (
            <>
              <SummaryCards
                rows={activeResult.perModel}
                runs={activeResult.rows}
                durationMs={activeResult.finishedAt - activeResult.startedAt}
              />

              <Tabs defaultValue="leaderboard" className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <TabsList className="flex-wrap">
                    <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
                    <TabsTrigger value="performance">Performance</TabsTrigger>
                    <TabsTrigger value="quality">Quality</TabsTrigger>
                    <TabsTrigger value="hallucination">Hallucination</TabsTrigger>
                    <TabsTrigger value="responses">Responses</TabsTrigger>
                  </TabsList>
                  <div className="flex items-center gap-2">
                    {!compareRunId && (
                      <Button variant="outline" size="sm" onClick={handleSaveRun} className="gap-2">
                        <Save className="h-3.5 w-3.5" />
                        Save Run
                      </Button>
                    )}
                    <Button variant="outline" size="sm" onClick={handleExport} className="gap-2">
                      <Download className="h-3.5 w-3.5" />
                      Export CSV
                    </Button>
                  </div>
                </div>

                <TabsContent value="leaderboard" className="space-y-4">
                  <Leaderboard rows={activeResult.perModel} />
                  <MetricComparisonChart rows={activeResult.perModel} />
                </TabsContent>

                <TabsContent value="performance" className="space-y-4">
                  <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                    <QualityVsLatencyChart rows={activeResult.perModel} />
                    <LatencyChart rows={activeResult.perModel} />
                  </div>
                  <RunLatencyChart runs={activeResult.rows} />
                </TabsContent>

                <TabsContent value="quality" className="space-y-4">
                  <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                    <CategoryRadarChart perCategory={activeResult.perCategory} rows={activeResult.perModel} />
                    <MetricComparisonChart rows={activeResult.perModel} />
                  </div>
                </TabsContent>

                <TabsContent value="hallucination" className="space-y-4">
                  <HallucinationHeatmap perCategory={activeResult.perCategory} rows={activeResult.perModel} />
                </TabsContent>

                <TabsContent value="responses">
                  <ResponseViewer runs={activeResult.rows} />
                </TabsContent>
              </Tabs>
            </>
          ) : (
            !running && <EmptyState />
          )}
        </section>
      </main>
    </div>
  )
}
