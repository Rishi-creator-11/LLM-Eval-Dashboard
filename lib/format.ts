export function pct(n: number): string {
  return `${(n * 100).toFixed(1)}%`
}

export function ms(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(2)}s`
  return `${Math.round(n)}ms`
}

export function shortNum(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`
  return Math.round(n).toString()
}

const PROVIDER_LABELS: Record<string, string> = {
  gemini: "Gemini",
  groq: "Groq",
  openai: "OpenAI",
  anthropic: "Anthropic",
}

export function providerLabel(p: string): string {
  return PROVIDER_LABELS[p] ?? p
}

/** Score grade -> badge variant */
export function scoreVariant(score: number): "success" | "warning" | "destructive" {
  if (score >= 0.7) return "success"
  if (score >= 0.4) return "warning"
  return "destructive"
}
