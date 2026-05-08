import { NextResponse } from "next/server"
import { testProviderKey } from "@/lib/llm/clients"
import type { Provider } from "@/lib/llm/types"

export const runtime = "nodejs"

export async function POST(req: Request) {
  try {
    const { provider, key } = (await req.json()) as { provider?: string; key?: string }
    if (!provider || !key) {
      return NextResponse.json({ error: "Provider and key are required" }, { status: 400 })
    }
    if (!["gemini", "groq", "openai", "anthropic"].includes(provider)) {
      return NextResponse.json({ error: "Invalid provider" }, { status: 400 })
    }
    const result = await testProviderKey(provider as Provider, key)
    return NextResponse.json(result)
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? "Server error" }, { status: 500 })
  }
}
