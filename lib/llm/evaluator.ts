import "server-only"
import { callModel } from "./clients"
import { getModel } from "./models"
import {
  consistencyScore,
  hallucinationScore,
  keywordCoverage,
  qualityScore,
  rougeL,
} from "./metrics"
import type { AggregatedRow, EvalCase, RunResult } from "./types"
import type { ClientKeySet } from "./clients"

export interface BenchmarkOptions {
  models: string[]
  cases: EvalCase[]
  runsPerCase: number
  temperature: number
  clientKeys?: ClientKeySet
}

export interface BenchmarkResult {
  rows: RunResult[]
  perModel: AggregatedRow[]
  perCategory: Array<{ modelId: string; category: string; quality: number; latencyMs: number; hallucination: number }>
  startedAt: number
  finishedAt: number
}

/**
 * Run every (case x model x runIndex) combination concurrently and produce
 * tidy rows plus aggregated leaderboard data.
 */
export async function runBenchmark(opts: BenchmarkOptions): Promise<BenchmarkResult> {
  const { models, cases, runsPerCase, temperature, clientKeys } = opts
  const startedAt = Date.now()

  // Build the full task list
  type Task = { caseObj: EvalCase; modelId: string; runIndex: number }
  const tasks: Task[] = []
  for (const c of cases) {
    for (const modelId of models) {
      for (let r = 0; r < runsPerCase; r++) {
        tasks.push({ caseObj: c, modelId, runIndex: r })
      }
    }
  }

  // Limit concurrency so we don't blow rate limits.
  const concurrency = 6
  const rows: RunResult[] = []
  let cursor = 0

  async function worker() {
    while (cursor < tasks.length) {
      const i = cursor++
      const task = tasks[i]
      const info = getModel(task.modelId)
      if (!info) continue

      const resp = await callModel(task.modelId, task.caseObj.prompt, temperature, clientKeys)
      const quality = qualityScore(task.caseObj.reference, resp.response, task.caseObj.keywords)
      const rl = rougeL(task.caseObj.reference, resp.response)
      const halluc = hallucinationScore(task.caseObj.reference, resp.response, task.caseObj.keywords)
      const cov = keywordCoverage(resp.response, task.caseObj.keywords)

      rows.push({
        caseId: task.caseObj.id,
        category: task.caseObj.category,
        modelId: task.modelId,
        provider: info.provider,
        model: info.model,
        prompt: task.caseObj.prompt,
        reference: task.caseObj.reference,
        response: resp.response,
        runIndex: task.runIndex,
        latencyMs: resp.latencyMs,
        totalTokens: resp.totalTokens,
        error: resp.error,
        quality,
        rougeL: rl,
        hallucination: halluc,
        keywordCoverage: cov,
      })
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, tasks.length) }, worker))

  const perModel = aggregateByModel(rows)
  const perCategory = aggregateByCategory(rows)

  return { rows, perModel, perCategory, startedAt, finishedAt: Date.now() }
}

function avg(nums: number[]): number {
  if (!nums.length) return 0
  return nums.reduce((a, b) => a + b, 0) / nums.length
}

export function aggregateByModel(rows: RunResult[]): AggregatedRow[] {
  const byModel = new Map<string, RunResult[]>()
  for (const r of rows) {
    if (!byModel.has(r.modelId)) byModel.set(r.modelId, [])
    byModel.get(r.modelId)!.push(r)
  }
  const out: AggregatedRow[] = []
  for (const [modelId, group] of byModel) {
    // consistency: per case, gather responses across runs
    const byCase = new Map<string, string[]>()
    for (const r of group) {
      if (!byCase.has(r.caseId)) byCase.set(r.caseId, [])
      byCase.get(r.caseId)!.push(r.response)
    }
    const consistencies: number[] = []
    for (const [, responses] of byCase) consistencies.push(consistencyScore(responses))

    const errors = group.filter((r) => r.error).length
    const provider = group[0].provider
    const model = group[0].model
    const avgQuality = avg(group.map((r) => r.quality))
    const avgLatency = avg(group.map((r) => r.latencyMs))
    const avgHall = avg(group.map((r) => r.hallucination))
    const avgRouge = avg(group.map((r) => r.rougeL))
    const avgCov = avg(group.map((r) => r.keywordCoverage))
    const avgCons = avg(consistencies)
    const avgTokens = avg(group.map((r) => r.totalTokens))

    // Composite: high quality, high consistency, low hallucination
    const composite = 0.5 * avgQuality + 0.3 * avgCons + 0.2 * (1 - avgHall)

    out.push({
      modelId,
      provider,
      model,
      runs: group.length,
      errors,
      avgLatencyMs: avgLatency,
      avgTokens,
      avgQuality,
      avgRougeL: avgRouge,
      avgHallucination: avgHall,
      avgConsistency: avgCons,
      avgKeywordCoverage: avgCov,
      compositeScore: composite,
    })
  }
  return out.sort((a, b) => b.compositeScore - a.compositeScore)
}

export function aggregateByCategory(rows: RunResult[]) {
  // modelId itself contains "::" (e.g. "groq::llama-3.1-8b-instant"),
  // so use a non-colliding separator for the composite key.
  const SEP = "|||"
  const map = new Map<string, { modelId: string; category: string; rows: RunResult[] }>()
  for (const r of rows) {
    const k = `${r.modelId}${SEP}${r.category}`
    if (!map.has(k)) map.set(k, { modelId: r.modelId, category: r.category, rows: [] })
    map.get(k)!.rows.push(r)
  }
  const out: Array<{
    modelId: string
    category: string
    quality: number
    latencyMs: number
    hallucination: number
  }> = []
  for (const { modelId, category, rows: group } of map.values()) {
    out.push({
      modelId,
      category,
      quality: avg(group.map((r) => r.quality)),
      latencyMs: avg(group.map((r) => r.latencyMs)),
      hallucination: avg(group.map((r) => r.hallucination)),
    })
  }
  return out
}
