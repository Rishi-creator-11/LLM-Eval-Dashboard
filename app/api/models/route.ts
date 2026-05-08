import { NextResponse } from "next/server"
import { AVAILABLE_MODELS } from "@/lib/llm/models"
import { getKeyStats } from "@/lib/llm/clients"
import { listCategories, DATASETS } from "@/lib/llm/datasets"

export const runtime = "nodejs"

export async function GET() {
  const keys = getKeyStats()
  const categories = listCategories().map((c) => ({ name: c, count: DATASETS[c].length }))
  return NextResponse.json({
    models: AVAILABLE_MODELS,
    categories,
    keys: {
      gemini: keys.gemini,
      groq: keys.groq,
      openai: keys.openai,
      anthropic: keys.anthropic,
    },
  })
}
