import type { ModelInfo } from "./types"

export const AVAILABLE_MODELS: ModelInfo[] = [
  // Gemini
  { id: "gemini::gemini-2.5-flash", provider: "gemini", model: "gemini-2.5-flash", label: "Gemini 2.5 Flash" },
  {
    id: "gemini::gemini-2.5-flash-lite",
    provider: "gemini",
    model: "gemini-2.5-flash-lite",
    label: "Gemini 2.5 Flash Lite",
  },
  // Groq
  {
    id: "groq::llama-3.3-70b-versatile",
    provider: "groq",
    model: "llama-3.3-70b-versatile",
    label: "Llama 3.3 70B Versatile",
  },
  { id: "groq::llama-3.1-8b-instant", provider: "groq", model: "llama-3.1-8b-instant", label: "Llama 3.1 8B Instant" },
  {
    id: "groq::meta-llama/llama-4-scout-17b-16e-instruct",
    provider: "groq",
    model: "meta-llama/llama-4-scout-17b-16e-instruct",
    label: "Llama 4 Scout 17B",
  },
  { id: "groq::openai/gpt-oss-20b", provider: "groq", model: "openai/gpt-oss-20b", label: "GPT-OSS 20B" },
  { id: "groq::qwen/qwen3-32b", provider: "groq", model: "qwen/qwen3-32b", label: "Qwen3 32B" },
  // OpenAI
  { id: "openai::gpt-4.1-mini", provider: "openai", model: "gpt-4.1-mini", label: "GPT-4.1 Mini" },
  { id: "openai::gpt-4.1-nano", provider: "openai", model: "gpt-4.1-nano", label: "GPT-4.1 Nano" },
  // Anthropic
  { id: "anthropic::claude-sonnet-4-20250514", provider: "anthropic", model: "claude-sonnet-4-20250514", label: "Claude Sonnet 4" },
  { id: "anthropic::claude-haiku-4-20250514", provider: "anthropic", model: "claude-haiku-4-20250514", label: "Claude Haiku 4" },
]

export function getModel(id: string): ModelInfo | undefined {
  return AVAILABLE_MODELS.find((m) => m.id === id)
}
