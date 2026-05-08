export type Provider = "gemini" | "groq" | "openai" | "anthropic"

export interface ModelInfo {
  id: string // provider::model
  provider: Provider
  model: string
  label: string
}

export interface EvalCase {
  id: string
  category: string
  prompt: string
  reference: string
  keywords?: string[]
}

export interface LLMResponse {
  provider: Provider
  model: string
  prompt: string
  response: string
  latencyMs: number
  promptTokens: number
  completionTokens: number
  totalTokens: number
  error?: string
}

export interface RunResult {
  caseId: string
  category: string
  modelId: string
  provider: Provider
  model: string
  prompt: string
  reference: string
  response: string
  runIndex: number
  latencyMs: number
  totalTokens: number
  error?: string
  // metrics
  quality: number
  rougeL: number
  hallucination: number
  keywordCoverage: number
}

export interface AggregatedRow {
  modelId: string
  provider: Provider
  model: string
  runs: number
  errors: number
  avgLatencyMs: number
  avgTokens: number
  avgQuality: number
  avgRougeL: number
  avgHallucination: number
  avgConsistency: number
  avgKeywordCoverage: number
  compositeScore: number
}
