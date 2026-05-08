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
    return NextResponse.json(result)
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Server error" }, { status: 500 })
  }
}
