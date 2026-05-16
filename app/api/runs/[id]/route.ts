import { NextResponse } from "next/server"
import { supabase, hasSupabaseConfig } from "@/lib/supabase"
import { aggregateByModel } from "@/lib/llm/evaluator"
import type { RunResult } from "@/lib/llm/types"

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!hasSupabaseConfig) return NextResponse.json({ error: "Supabase not configured" }, { status: 500 })

  try {
    const resolvedParams = await params;
    const { data: run, error: runError } = await supabase
      .from("eval_runs")
      .select("*")
      .eq("id", resolvedParams.id)
      .single() as any

    if (runError) throw runError

    const { data: results, error: resultsError } = await supabase
      .from("eval_results")
      .select("*")
      .eq("run_id", resolvedParams.id) as any

    if (resultsError) throw resultsError

    const rawRuns: RunResult[] = results.map((r: any) => ({
      caseId: r.case_id,
      category: r.category,
      modelId: r.model_id,
      provider: r.provider as any,
      model: r.model,
      prompt: r.prompt || "",
      reference: r.reference || "",
      response: r.response || "",
      runIndex: r.run_index,
      latencyMs: r.latency_ms || 0,
      totalTokens: r.total_tokens || 0,
      quality: r.quality || 0,
      rougeL: r.rouge_l || 0,
      hallucination: r.hallucination || 0,
      keywordCoverage: r.keyword_coverage || 0,
      error: r.error || undefined,
    }))

    const aggregated = aggregateByModel(rawRuns)

    return NextResponse.json({
      id: run.id,
      name: run.name,
      timestamp: new Date(run.created_at).getTime(),
      models: run.models,
      categories: run.categories,
      runsPerCase: run.runs_per_case,
      temperature: run.temperature,
      aggregated,
      rawRuns,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!hasSupabaseConfig) return NextResponse.json({ success: false })

  try {
    const resolvedParams = await params;
    const { error } = await supabase.from("eval_runs").delete().eq("id", resolvedParams.id)
    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
