import { NextResponse } from "next/server"
import { supabase, hasSupabaseConfig } from "@/lib/supabase"
import type { SavedRun } from "@/lib/storage"

export async function GET() {
  if (!hasSupabaseConfig) return NextResponse.json([])

  try {
    const { data: runs, error } = await supabase
      .from("eval_runs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50) as any

    if (error) throw error

    // Map to SavedRun shape, but without rawRuns/aggregated (those are fetched on demand)
    const result = runs.map((r: any) => ({
      id: r.id,
      name: r.name,
      timestamp: new Date(r.created_at).getTime(),
      models: r.models,
      categories: r.categories,
      runsPerCase: r.runs_per_case,
      temperature: r.temperature,
      aggregated: [], // Fetch full data via /api/runs/[id]
      rawRuns: [],
    }))

    return NextResponse.json(result)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(req: Request) {
  if (!hasSupabaseConfig) return NextResponse.json({ success: false })

  try {
    const run: SavedRun = await req.json()

    // 1. Insert run metadata
    const payload: any = {
      id: run.id,
      name: run.name,
      models: run.models,
      categories: run.categories,
      runs_per_case: run.runsPerCase,
      temperature: run.temperature,
      duration_ms: null,
    }

    const { data: insertedRun, error: runError } = await supabase
      .from("eval_runs")
      .insert(payload)
      .select()
      .single() as any

    if (runError) throw runError

    // 2. Insert run results in batches
    if (run.rawRuns && run.rawRuns.length > 0) {
      const resultsToInsert = run.rawRuns.map((r) => ({
        run_id: insertedRun.id,
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

      // Insert in chunks of 100 to avoid limits
      for (let i = 0; i < resultsToInsert.length; i += 100) {
        const chunk: any = resultsToInsert.slice(i, i + 100)
        const { error: resultsError } = await supabase.from("eval_results").insert(chunk)
        if (resultsError) throw resultsError
      }
    }

    return NextResponse.json({ success: true, id: insertedRun.id })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
