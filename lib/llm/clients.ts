import "server-only"
import { GoogleGenerativeAI } from "@google/generative-ai"
import Groq from "groq-sdk"
import type { LLMResponse, Provider } from "./types"
import { getModel } from "./models"

/* ------------------------------------------------------------------ */
/*  Key rotation                                                       */
/* ------------------------------------------------------------------ */

function parseKeys(raw: string | undefined): string[] {
  if (!raw) return []
  return raw
    .split(/[,\s]+/)
    .map((k) => k.trim())
    .filter(Boolean)
}

const ENV_GEMINI_KEYS = parseKeys(process.env.GEMINI_API_KEYS)
const ENV_GROQ_KEYS = parseKeys(process.env.GROQ_API_KEYS)

class KeyRotator {
  private idx = 0
  constructor(private keys: string[]) {}
  next(): string | undefined {
    if (this.keys.length === 0) return undefined
    const key = this.keys[this.idx % this.keys.length]
    this.idx++
    return key
  }
  size() {
    return this.keys.length
  }
}

const envGeminiRotator = new KeyRotator(ENV_GEMINI_KEYS)
const envGroqRotator = new KeyRotator(ENV_GROQ_KEYS)

export interface ClientKeySet {
  gemini?: string
  groq?: string
  openai?: string
  anthropic?: string
}

function makeRotator(keys: string | undefined): KeyRotator {
  return new KeyRotator(parseKeys(keys))
}

export function getKeyStats(clientKeys?: ClientKeySet) {
  return {
    gemini: (clientKeys?.gemini ? parseKeys(clientKeys.gemini) : ENV_GEMINI_KEYS).length,
    groq: (clientKeys?.groq ? parseKeys(clientKeys.groq) : ENV_GROQ_KEYS).length,
    openai: (clientKeys?.openai ? parseKeys(clientKeys.openai) : []).length,
    anthropic: (clientKeys?.anthropic ? parseKeys(clientKeys.anthropic) : []).length,
  }
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const PERMANENT_ERROR_PATTERNS = [
  /not found/i,
  /api key not valid/i,
  /permission denied/i,
  /unauthenticated/i,
  /invalid argument/i,
  /is not supported/i,
  /no such model/i,
]

function isPermanentError(err: string): boolean {
  return PERMANENT_ERROR_PATTERNS.some((re) => re.test(err))
}

const THINK_RE = /<think>[\s\S]*?<\/think>\s*/gi

function cleanResponse(text: string): string {
  if (!text) return ""
  return text.replace(THINK_RE, "").trim()
}

function approxTokens(text: string): number {
  if (!text) return 0
  return Math.ceil(text.length / 4)
}

/* ------------------------------------------------------------------ */
/*  Gemini                                                             */
/* ------------------------------------------------------------------ */

async function callGemini(
  model: string,
  prompt: string,
  temperature: number,
  clientKeys?: string
): Promise<LLMResponse> {
  const keys = clientKeys ? parseKeys(clientKeys) : ENV_GEMINI_KEYS
  const rotator = clientKeys ? makeRotator(clientKeys) : envGeminiRotator
  const attempts = Math.max(3, keys.length)
  let lastErr = ""

  for (let i = 0; i < attempts; i++) {
    const apiKey = rotator.next()
    if (!apiKey) {
      lastErr = "No Gemini API key configured"
      break
    }
    try {
      const genAI = new GoogleGenerativeAI(apiKey)
      const client = genAI.getGenerativeModel({
        model,
        generationConfig: { temperature },
      })
      const t0 = Date.now()
      const result = await client.generateContent(prompt)
      const latencyMs = Date.now() - t0
      const text = cleanResponse(result.response.text() || "")
      const usage = result.response.usageMetadata
      const promptTokens = usage?.promptTokenCount ?? approxTokens(prompt)
      const completionTokens = usage?.candidatesTokenCount ?? approxTokens(text)
      return {
        provider: "gemini",
        model,
        prompt,
        response: text,
        latencyMs,
        promptTokens,
        completionTokens,
        totalTokens: promptTokens + completionTokens,
      }
    } catch (e: any) {
      lastErr = e?.message || String(e)
      if (isPermanentError(lastErr)) break
      await new Promise((r) => setTimeout(r, 250 * (i + 1)))
    }
  }

  return {
    provider: "gemini",
    model,
    prompt,
    response: "",
    latencyMs: 0,
    promptTokens: 0,
    completionTokens: 0,
    totalTokens: 0,
    error: lastErr || "unknown error",
  }
}

/* ------------------------------------------------------------------ */
/*  Groq                                                               */
/* ------------------------------------------------------------------ */

async function callGroq(
  model: string,
  prompt: string,
  temperature: number,
  clientKeys?: string
): Promise<LLMResponse> {
  const keys = clientKeys ? parseKeys(clientKeys) : ENV_GROQ_KEYS
  const rotator = clientKeys ? makeRotator(clientKeys) : envGroqRotator
  const attempts = Math.max(3, keys.length)
  let lastErr = ""

  for (let i = 0; i < attempts; i++) {
    const apiKey = rotator.next()
    if (!apiKey) {
      lastErr = "No Groq API key configured"
      break
    }
    try {
      const client = new Groq({ apiKey })
      const t0 = Date.now()
      const completion = await client.chat.completions.create({
        model,
        temperature,
        messages: [{ role: "user", content: prompt }],
      })
      const latencyMs = Date.now() - t0
      const text = cleanResponse(completion.choices[0]?.message?.content || "")
      const usage = completion.usage
      return {
        provider: "groq",
        model,
        prompt,
        response: text,
        latencyMs,
        promptTokens: usage?.prompt_tokens ?? 0,
        completionTokens: usage?.completion_tokens ?? 0,
        totalTokens: usage?.total_tokens ?? 0,
      }
    } catch (e: any) {
      lastErr = e?.message || String(e)
      if (isPermanentError(lastErr)) break
      await new Promise((r) => setTimeout(r, 250 * (i + 1)))
    }
  }

  return {
    provider: "groq",
    model,
    prompt,
    response: "",
    latencyMs: 0,
    promptTokens: 0,
    completionTokens: 0,
    totalTokens: 0,
    error: lastErr || "unknown error",
  }
}

/* ------------------------------------------------------------------ */
/*  OpenAI                                                             */
/* ------------------------------------------------------------------ */

async function callOpenAI(
  model: string,
  prompt: string,
  temperature: number,
  clientKeys?: string
): Promise<LLMResponse> {
  const keys = parseKeys(clientKeys)
  const rotator = makeRotator(clientKeys)
  const attempts = Math.max(3, keys.length)
  let lastErr = ""

  for (let i = 0; i < attempts; i++) {
    const apiKey = rotator.next()
    if (!apiKey) {
      lastErr = "No OpenAI API key configured"
      break
    }
    try {
      const t0 = Date.now()
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          temperature,
          messages: [{ role: "user", content: prompt }],
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error?.message || `OpenAI error ${res.status}`)
      const latencyMs = Date.now() - t0
      const text = cleanResponse(data.choices?.[0]?.message?.content || "")
      const usage = data.usage
      return {
        provider: "openai",
        model,
        prompt,
        response: text,
        latencyMs,
        promptTokens: usage?.prompt_tokens ?? 0,
        completionTokens: usage?.completion_tokens ?? 0,
        totalTokens: usage?.total_tokens ?? 0,
      }
    } catch (e: any) {
      lastErr = e?.message || String(e)
      if (isPermanentError(lastErr)) break
      await new Promise((r) => setTimeout(r, 250 * (i + 1)))
    }
  }

  return {
    provider: "openai",
    model,
    prompt,
    response: "",
    latencyMs: 0,
    promptTokens: 0,
    completionTokens: 0,
    totalTokens: 0,
    error: lastErr || "unknown error",
  }
}

/* ------------------------------------------------------------------ */
/*  Anthropic                                                          */
/* ------------------------------------------------------------------ */

async function callAnthropic(
  model: string,
  prompt: string,
  temperature: number,
  clientKeys?: string
): Promise<LLMResponse> {
  const keys = parseKeys(clientKeys)
  const rotator = makeRotator(clientKeys)
  const attempts = Math.max(3, keys.length)
  let lastErr = ""

  for (let i = 0; i < attempts; i++) {
    const apiKey = rotator.next()
    if (!apiKey) {
      lastErr = "No Anthropic API key configured"
      break
    }
    try {
      const t0 = Date.now()
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          max_tokens: 4096,
          temperature,
          messages: [{ role: "user", content: prompt }],
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error?.message || `Anthropic error ${res.status}`)
      const latencyMs = Date.now() - t0
      const content = data.content ?? []
      const text = cleanResponse(content.map((c: any) => c.text).join(""))
      const usage = data.usage
      return {
        provider: "anthropic",
        model,
        prompt,
        response: text,
        latencyMs,
        promptTokens: usage?.input_tokens ?? 0,
        completionTokens: usage?.output_tokens ?? 0,
        totalTokens: (usage?.input_tokens ?? 0) + (usage?.output_tokens ?? 0),
      }
    } catch (e: any) {
      lastErr = e?.message || String(e)
      if (isPermanentError(lastErr)) break
      await new Promise((r) => setTimeout(r, 250 * (i + 1)))
    }
  }

  return {
    provider: "anthropic",
    model,
    prompt,
    response: "",
    latencyMs: 0,
    promptTokens: 0,
    completionTokens: 0,
    totalTokens: 0,
    error: lastErr || "unknown error",
  }
}

/* ------------------------------------------------------------------ */
/*  Public API                                                         */
/* ------------------------------------------------------------------ */

export async function callModel(
  modelId: string,
  prompt: string,
  temperature = 0.4,
  clientKeys?: ClientKeySet
): Promise<LLMResponse> {
  const info = getModel(modelId)
  if (!info) {
    return {
      provider: "groq" as Provider,
      model: modelId,
      prompt,
      response: "",
      latencyMs: 0,
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
      error: `Unknown model: ${modelId}`,
    }
  }
  if (info.provider === "gemini") return callGemini(info.model, prompt, temperature, clientKeys?.gemini)
  if (info.provider === "openai") return callOpenAI(info.model, prompt, temperature, clientKeys?.openai)
  if (info.provider === "anthropic") return callAnthropic(info.model, prompt, temperature, clientKeys?.anthropic)
  return callGroq(info.model, prompt, temperature, clientKeys?.groq)
}

/* ------------------------------------------------------------------ */
/*  Test Connection                                                    */
/* ------------------------------------------------------------------ */

export async function testProviderKey(provider: Provider, key: string): Promise<{ ok: boolean; error?: string }> {
  const prompt = "Say hello in exactly one word."
  try {
    let res: LLMResponse
    switch (provider) {
      case "gemini":
        res = await callGemini("gemini-2.5-flash-lite", prompt, 0, key)
        break
      case "groq":
        res = await callGroq("llama-3.1-8b-instant", prompt, 0, key)
        break
      case "openai":
        res = await callOpenAI("gpt-4.1-nano", prompt, 0, key)
        break
      case "anthropic":
        res = await callAnthropic("claude-haiku-4-20250514", prompt, 0, key)
        break
    }
    if (res.error) return { ok: false, error: res.error }
    return { ok: true }
  } catch (e: any) {
    return { ok: false, error: e?.message || String(e) }
  }
}
