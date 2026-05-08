import { decrypt, encrypt } from "./crypto"
import type { RunResult, AggregatedRow, EvalCase } from "./llm/types"

const LS_KEYS = {
  apiKeys: "llm-eval-api-keys",
  activeProvider: "llm-eval-active-provider",
  savedRuns: "llm-eval-saved-runs",
  customDatasets: "llm-eval-custom-datasets",
} as const

/* ------------------------------------------------------------------ */
/*  API Keys                                                          */
/* ------------------------------------------------------------------ */

export interface StoredApiKeys {
  gemini: string
  groq: string
  openai: string
  anthropic: string
}

export async function loadApiKeys(): Promise<StoredApiKeys> {
  const raw = localStorage.getItem(LS_KEYS.apiKeys)
  if (!raw) return { gemini: "", groq: "", openai: "", anthropic: "" }
  try {
    const decrypted = await decrypt(raw)
    return JSON.parse(decrypted) as StoredApiKeys
  } catch {
    return { gemini: "", groq: "", openai: "", anthropic: "" }
  }
}

export async function saveApiKeys(keys: StoredApiKeys) {
  const encrypted = await encrypt(JSON.stringify(keys))
  localStorage.setItem(LS_KEYS.apiKeys, encrypted)
}

/* ------------------------------------------------------------------ */
/*  Active Provider                                                   */
/* ------------------------------------------------------------------ */

export type ProviderPreference = "all" | "gemini" | "groq" | "openai" | "anthropic"

export function loadActiveProvider(): ProviderPreference {
  return (localStorage.getItem(LS_KEYS.activeProvider) as ProviderPreference) || "all"
}

export function saveActiveProvider(provider: ProviderPreference) {
  localStorage.setItem(LS_KEYS.activeProvider, provider)
}

/* ------------------------------------------------------------------ */
/*  Saved Runs                                                        */
/* ------------------------------------------------------------------ */

export interface SavedRun {
  id: string
  name: string
  timestamp: number
  models: string[]
  categories: string[]
  runsPerCase: number
  temperature: number
  aggregated: AggregatedRow[]
  rawRuns: RunResult[]
}

export function loadSavedRuns(): SavedRun[] {
  const raw = localStorage.getItem(LS_KEYS.savedRuns)
  if (!raw) return []
  try {
    return JSON.parse(raw) as SavedRun[]
  } catch {
    return []
  }
}

export function saveRun(run: SavedRun) {
  const existing = loadSavedRuns()
  existing.unshift(run)
  localStorage.setItem(LS_KEYS.savedRuns, JSON.stringify(existing.slice(0, 50)))
}

export function deleteRun(id: string) {
  const existing = loadSavedRuns().filter((r) => r.id !== id)
  localStorage.setItem(LS_KEYS.savedRuns, JSON.stringify(existing))
}

/* ------------------------------------------------------------------ */
/*  Custom Datasets                                                   */
/* ------------------------------------------------------------------ */

export interface CustomDataset {
  id: string
  name: string
  description: string
  cases: EvalCase[]
  createdAt: number
}

export function loadCustomDatasets(): CustomDataset[] {
  const raw = localStorage.getItem(LS_KEYS.customDatasets)
  if (!raw) return []
  try {
    return JSON.parse(raw) as CustomDataset[]
  } catch {
    return []
  }
}

export function saveCustomDataset(dataset: CustomDataset) {
  const existing = loadCustomDatasets()
  const idx = existing.findIndex((d) => d.id === dataset.id)
  if (idx >= 0) existing[idx] = dataset
  else existing.unshift(dataset)
  localStorage.setItem(LS_KEYS.customDatasets, JSON.stringify(existing))
}

export function deleteCustomDataset(id: string) {
  const existing = loadCustomDatasets().filter((d) => d.id !== id)
  localStorage.setItem(LS_KEYS.customDatasets, JSON.stringify(existing))
}
