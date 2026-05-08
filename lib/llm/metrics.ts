/**
 * Lightweight evaluation metrics. No external NLP deps so the bundle stays
 * Vercel-friendly. We use bag-of-words with stop-word removal and an LCS-
 * based ROUGE-L for overlap signals.
 */

const STOP_WORDS = new Set([
  "a","an","and","the","is","are","was","were","be","been","being","to","of",
  "in","on","at","for","with","by","as","it","this","that","these","those",
  "i","you","he","she","they","we","or","but","if","than","then","so","such",
  "do","does","did","done","have","has","had","not","no","nor","yes","there",
  "here","its","into","from","about","over","under","up","down","out","off",
])

function tokenize(text: string): string[] {
  if (!text) return []
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s\-_/]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
}

function tokensNoStop(text: string): string[] {
  return tokenize(text).filter((t) => !STOP_WORDS.has(t) && t.length > 1)
}

function asSet(tokens: string[]): Set<string> {
  return new Set(tokens)
}

/** Jaccard similarity of token sets (0..1). */
export function jaccard(a: string, b: string): number {
  const A = asSet(tokensNoStop(a))
  const B = asSet(tokensNoStop(b))
  if (A.size === 0 && B.size === 0) return 1
  if (A.size === 0 || B.size === 0) return 0
  let inter = 0
  for (const t of A) if (B.has(t)) inter++
  const union = A.size + B.size - inter
  return union === 0 ? 0 : inter / union
}

/** Cosine similarity over term frequency vectors (0..1). */
export function cosine(a: string, b: string): number {
  const ta = tokensNoStop(a)
  const tb = tokensNoStop(b)
  if (ta.length === 0 || tb.length === 0) return 0
  const fa = new Map<string, number>()
  const fb = new Map<string, number>()
  for (const t of ta) fa.set(t, (fa.get(t) ?? 0) + 1)
  for (const t of tb) fb.set(t, (fb.get(t) ?? 0) + 1)
  let dot = 0
  for (const [t, v] of fa) {
    const w = fb.get(t)
    if (w) dot += v * w
  }
  const na = Math.sqrt([...fa.values()].reduce((s, v) => s + v * v, 0))
  const nb = Math.sqrt([...fb.values()].reduce((s, v) => s + v * v, 0))
  return na && nb ? dot / (na * nb) : 0
}

/** Longest common subsequence length. */
function lcs(a: string[], b: string[]): number {
  const m = a.length
  const n = b.length
  if (!m || !n) return 0
  const prev = new Array(n + 1).fill(0)
  const curr = new Array(n + 1).fill(0)
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      curr[j] = a[i - 1] === b[j - 1] ? prev[j - 1] + 1 : Math.max(prev[j], curr[j - 1])
    }
    for (let j = 0; j <= n; j++) prev[j] = curr[j]
  }
  return prev[n]
}

/** ROUGE-L F1 score (0..1). */
export function rougeL(reference: string, candidate: string): number {
  const ref = tokensNoStop(reference)
  const cand = tokensNoStop(candidate)
  if (!ref.length || !cand.length) return 0
  const l = lcs(ref, cand)
  if (!l) return 0
  const p = l / cand.length
  const r = l / ref.length
  return (2 * p * r) / (p + r)
}

/** Fraction of expected keywords found in candidate (0..1). */
export function keywordCoverage(candidate: string, keywords: string[] | undefined): number {
  if (!keywords || keywords.length === 0) return 1
  const text = candidate.toLowerCase()
  let hits = 0
  for (const k of keywords) {
    if (text.includes(k.toLowerCase())) hits++
  }
  return hits / keywords.length
}

/** Heuristic hallucination score (0..1, higher = more hallucinated). */
export function hallucinationScore(reference: string, candidate: string, keywords?: string[]): number {
  if (!candidate.trim()) return 1
  const overlap = Math.max(jaccard(reference, candidate), rougeL(reference, candidate))
  const cov = keywordCoverage(candidate, keywords)
  // weight overlap and keyword coverage equally
  const support = 0.6 * overlap + 0.4 * cov
  return Math.max(0, Math.min(1, 1 - support))
}

/**
 * Quality score (0..1). Composite signal blending reference overlap, keyword
 * coverage and a small bonus for non-trivial response length.
 */
export function qualityScore(reference: string, candidate: string, keywords?: string[]): number {
  if (!candidate.trim()) return 0
  const cos = cosine(reference, candidate)
  const rl = rougeL(reference, candidate)
  const cov = keywordCoverage(candidate, keywords)
  const lenBonus = Math.min(1, tokenize(candidate).length / 25)
  const score = 0.4 * rl + 0.3 * cos + 0.2 * cov + 0.1 * lenBonus
  return Math.max(0, Math.min(1, score))
}

/**
 * Consistency across N runs of the same prompt: average pairwise cosine.
 * Returns 1 for a single run.
 */
export function consistencyScore(responses: string[]): number {
  const valid = responses.filter((r) => r && r.trim())
  if (valid.length < 2) return 1
  let total = 0
  let pairs = 0
  for (let i = 0; i < valid.length; i++) {
    for (let j = i + 1; j < valid.length; j++) {
      total += cosine(valid[i], valid[j])
      pairs++
    }
  }
  return pairs ? total / pairs : 1
}
