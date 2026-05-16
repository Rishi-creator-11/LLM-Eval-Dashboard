import { NextResponse } from "next/server"
import { runBenchmark } from "@/lib/llm/evaluator"
import { casesForCategories, allCases, DATASETS } from "@/lib/llm/datasets"
import type { EvalCase } from "@/lib/llm/types"
import type { ClientKeySet } from "@/lib/llm/clients"

export const runtime = "nodejs"
export const maxDuration = 300

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const models: string[] = body.models ?? []
    const categories: string[] = body.categories ?? []
    const customPrompts: { prompt: string; reference?: string }[] = body.customPrompts ?? []
    const runsPerCase: number = Math.max(1, Math.min(5, body.runsPerCase ?? 2))
    const temperature: number = Math.max(0, Math.min(1.5, body.temperature ?? 0.4))
    const maxCasesPerCategory: number = Math.max(1, Math.min(10, body.maxCasesPerCategory ?? 3))
    const clientKeys: ClientKeySet | undefined = body.clientKeys

    if (!models.length) {
      return NextResponse.json({ error: "Select at least one model." }, { status: 400 })
    }

    // Build cases from selected categories + custom prompts
    let baseCases: EvalCase[] = []
    if (categories.length) {
      for (const cat of categories) {
        const list = DATASETS[cat] ?? []
        baseCases.push(...list.slice(0, maxCasesPerCategory))
      }
    } else if (customPrompts.length === 0) {
      baseCases = allCases().slice(0, 6)
    }

    const customCases: EvalCase[] = customPrompts
      .filter((p) => p.prompt && p.prompt.trim())
      .map((p, i) => ({
        id: `custom-${i + 1}`,
        category: "Custom",
        prompt: p.prompt.trim(),
        reference: (p.reference ?? "").trim(),
      }))

    const cases = [...baseCases, ...customCases]
    if (!cases.length) {
      return NextResponse.json({ error: "No evaluation cases selected." }, { status: 400 })
    }

    const result = await runBenchmark({ models, cases, runsPerCase, temperature, clientKeys })

    // Auto-save to Supabase if configured
    if (body.saveRun && process.env.NEXT_PUBLIC_SUPABASE_URL) {
      try {
        const { supabase } = await import("@/lib/supabase")
        const runId = crypto.randomUUID()
        const runName = `Run ${new Date().toLocaleString()}`
        
        await supabase.from("eval_runs").insert({
          id: runId,
          name: runName,
          models: result.perModel.map((r) => r.modelId),
          categories: Array.from(new Set(result.rows.map((r) => r.category))),
          runs_per_case: runsPerCase,
          temperature: temperature,
          duration_ms: result.finishedAt - result.startedAt,
        })
        
        if (result.rows.length > 0) {
          const resultsToInsert = result.rows.map((r) => ({
            run_id: runId,
            case_id: r.caseId,
            category: r.category,
            model_id: r.modelId,
            provider: r.provider,
            model: r.model,
            prompt: r.prompt,
            reference: r.reference,
            response: r.response,
            run_index: r.runIndex,
            latency_ms: r.latencyMs,
            total_tokens: r.totalTokens,
            quality: r.quality,
            rouge_l: r.rougeL,
            hallucination: r.hallucination,
            keyword_coverage: r.keywordCoverage,
            error: r.error || null,
          }))
          
          for (let i = 0; i < resultsToInsert.length; i += 100) {
             await supabase.from("eval_results").insert(resultsToInsert.slice(i, i + 100))
          }
        }
        
        return NextResponse.json({ ...result, savedRunId: runId })
      } catch (saveError) {
        console.error("Failed to auto-save run:", saveError)
        // Don't fail the benchmark if auto-save fails
      }
    }

    return NextResponse.json(result)
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Server error" }, { status: 500 })
  }
}
