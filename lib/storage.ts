import { decrypt, encrypt } from "./crypto"
import type { RunResult, AggregatedRow, EvalCase } from "./llm/types"
import { hasSupabaseConfig } from "./supabase"

const LS_KEYS = {
  apiKeys: "llm-eval-api-keys",
  activeProvider: "llm-eval-active-provider",
  savedRuns: "llm-eval-saved-runs",
  customDatasets: "llm-eval-custom-datasets",
} as const

/* ------------------------------------------------------------------ */
/*  API Keys (Always localStorage for security)                       */
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
/*  Saved Runs (Async - Supabase primary, localStorage fallback)      */
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

export async function loadSavedRuns(): Promise<SavedRun[]> {
  if (hasSupabaseConfig) {
    try {
      const res = await fetch("/api/runs")
      if (res.ok) return res.json()
    } catch (e) {
      console.error("Failed to load runs from Supabase, falling back to localStorage", e)
    }
  }

  const raw = localStorage.getItem(LS_KEYS.savedRuns)
  if (!raw) return []
  try {
    return JSON.parse(raw) as SavedRun[]
  } catch {
    return []
  }
}

export async function getSavedRun(id: string): Promise<SavedRun | null> {
  if (hasSupabaseConfig) {
    try {
      const res = await fetch(`/api/runs/${id}`)
      if (res.ok) return res.json()
    } catch (e) {
      console.error("Failed to fetch run from Supabase", e)
    }
  }

  const runs = await loadSavedRuns()
  return runs.find((r) => r.id === id) || null
}

export async function saveRun(run: SavedRun): Promise<void> {
  if (hasSupabaseConfig) {
    const res = await fetch("/api/runs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(run),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.error || `Server returned ${res.status}`)
    }
    const data = await res.json()
    if (data.success === false) {
      throw new Error(data.error || "Failed to save to Supabase")
    }
    return
  }

  const existing = await loadSavedRuns()
  existing.unshift(run)
  localStorage.setItem(LS_KEYS.savedRuns, JSON.stringify(existing.slice(0, 50)))
}

export async function deleteRun(id: string): Promise<void> {
  if (hasSupabaseConfig) {
    try {
      await fetch(`/api/runs/${id}`, { method: "DELETE" })
      return
    } catch (e) {
      console.error("Failed to delete run from Supabase", e)
    }
  }

  const existing = await loadSavedRuns()
  const filtered = existing.filter((r) => r.id !== id)
  localStorage.setItem(LS_KEYS.savedRuns, JSON.stringify(filtered))
}

/* ------------------------------------------------------------------ */
/*  Custom Datasets (Async - Supabase primary, localStorage fallback) */
/* ------------------------------------------------------------------ */

export interface CustomDataset {
  id: string
  name: string
  description: string
  cases: EvalCase[]
  createdAt: number
}

export async function loadCustomDatasets(): Promise<CustomDataset[]> {
  if (hasSupabaseConfig) {
    try {
      const res = await fetch("/api/datasets")
      if (res.ok) return res.json()
    } catch (e) {
      console.error("Failed to load datasets from Supabase, falling back to localStorage", e)
    }
  }

  const raw = localStorage.getItem(LS_KEYS.customDatasets)
  if (!raw) return []
  try {
    return JSON.parse(raw) as CustomDataset[]
  } catch {
    return []
  }
}

export async function saveCustomDataset(dataset: CustomDataset): Promise<void> {
  if (hasSupabaseConfig) {
    try {
      const res = await fetch("/api/datasets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dataset),
      })
      if (res.ok) return
    } catch (e) {
      console.error("Failed to save dataset to Supabase, falling back to localStorage", e)
    }
  }

  const existing = await loadCustomDatasets()
  const idx = existing.findIndex((d) => d.id === dataset.id)
  if (idx >= 0) existing[idx] = dataset
  else existing.unshift(dataset)
  localStorage.setItem(LS_KEYS.customDatasets, JSON.stringify(existing))
}

export async function deleteCustomDataset(id: string): Promise<void> {
  if (hasSupabaseConfig) {
    try {
      await fetch(`/api/datasets/${id}`, { method: "DELETE" })
      return
    } catch (e) {
      console.error("Failed to delete dataset from Supabase", e)
    }
  }

  const existing = await loadCustomDatasets()
  const filtered = existing.filter((d) => d.id !== id)
  localStorage.setItem(LS_KEYS.customDatasets, JSON.stringify(filtered))
}
