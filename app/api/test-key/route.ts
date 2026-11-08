import { NextResponse } from "next/server"
import { testProviderKey } from "@/lib/llm/clients"
import type { Provider } from "@/lib/llm/types"

export const runtime = "nodejs"

export async function POST(req: Request) {
  // Modified (Agent Release Lab): no provider calls from the public deployment.
  if (process.env.LAB_PUBLIC_MODE === "1" && process.env.LAB_LIVE_ENABLED !== "1") {
    return NextResponse.json({ ok: false, error: "Disabled on the public demo." }, { status: 403 })
  }
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
