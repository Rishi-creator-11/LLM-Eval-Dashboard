// Agent Release Lab runner.  Usage:
//   npm run lab:eval -- --mode fixture                       # deterministic, no network, no key
//   GROQ_API_KEYS=... npm run lab:eval -- --mode live --model llama-3.3-70b-versatile --max-calls 70
// Same dataset, same model, two prompt versions; writes public/lab-results/<runId>.json.
import fs from "node:fs"
import path from "node:path"
import { containsSecret, gradeCase, type EvalCaseDef } from "../lib/lab/graders"
import { DEFAULT_GATE, evaluateGate } from "../lib/lab/gate"

const root = path.resolve(__dirname, "..")
const args = new Map<string, string>()
for (let i = 2; i < process.argv.length; i += 2) args.set(process.argv[i].replace(/^--/, ""), process.argv[i + 1])

const mode = (args.get("mode") ?? "fixture") as "fixture" | "live"
const model = args.get("model") ?? "llama-3.3-70b-versatile"
const maxCalls = Number(args.get("max-calls") ?? 70)
const suite = JSON.parse(fs.readFileSync(path.join(root, "lab/suites/business-agent-v1.json"), "utf8"))
const versions = ["v1", "v2"]
const prompts: Record<string, string> = Object.fromEntries(versions.map((v) => [v, fs.readFileSync(path.join(root, `lab/prompts/support-agent.${v}.txt`), "utf8")]))

function systemPrompt(v: string): string {
  return `${prompts[v].trim()}\n\n${suite.kb}`
}

async function callGroq(system: string, user: string): Promise<{ text: string; latencyMs: number; tokens: number }> {
  const keys = (process.env.GROQ_API_KEYS ?? "").split(/[,\s]+/).filter(Boolean)
  if (!keys.length) throw new Error("GROQ_API_KEYS is not set (live mode needs it)")
  const key = keys[Math.floor(Math.random() * keys.length)]
  const t0 = Date.now()
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({ model, temperature: 0, max_tokens: 300, messages: [{ role: "system", content: system }, { role: "user", content: user }] }),
  })
  const latencyMs = Date.now() - t0
  if (!res.ok) throw new Error(`provider error ${res.status}`) // never echo bodies: they can contain account details
  const j: any = await res.json()
  return { text: j.choices?.[0]?.message?.content ?? "", latencyMs, tokens: j.usage?.total_tokens ?? 0 }
}

async function main() {
  const cases: EvalCaseDef[] = suite.cases
  const total = cases.length * versions.length
  if (mode === "live" && total > maxCalls) throw new Error(`cap: ${total} calls needed but --max-calls is ${maxCalls}`)
  const fixture = mode === "fixture" ? JSON.parse(fs.readFileSync(path.join(root, "lab/fixtures/scripted-responses.json"), "utf8")).responses : null

  const out: Record<string, any[]> = { v1: [], v2: [] }
  for (const v of versions) {
    for (const c of cases) {
      let raw: string, latencyMs: number | null = null, tokens: number | null = null, error: string | undefined
      if (mode === "fixture") raw = fixture[v][c.id]
      else {
        try {
          const r = await callGroq(systemPrompt(v), c.input)
          raw = r.text; latencyMs = r.latencyMs; tokens = r.tokens
        } catch (e: any) { raw = ""; error = e.message }
      }
      const grade = gradeCase(c, raw, suite.canaries)
      out[v].push({ caseId: c.id, category: c.category, input: c.input, output: redact(raw, suite.canaries), pass: grade.pass, checks: grade.checks, latencyMs, tokens, error })
    }
  }
  const outcomes = (v: string) => out[v].map((r) => ({ caseId: r.caseId, category: r.category, pass: r.pass }))
  const gate = evaluateGate(outcomes("v1"), outcomes("v2"), DEFAULT_GATE)
  const lat = (v: string) => { const xs = out[v].map((r) => r.latencyMs).filter((x): x is number => x != null).sort((a, b) => a - b); return xs.length ? { p50: xs[Math.floor(xs.length / 2)], p95: xs[Math.floor(xs.length * 0.95)], mean: Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) } : null }
  const runId = mode === "fixture" ? `fixture-${new Date().toISOString().slice(0, 10)}` : `live-${new Date().toISOString().slice(0, 10)}-${model.replace(/[^a-z0-9]+/gi, "-")}`.replace(/-$/, "")
  const result = {
    runId, mode, label: mode === "fixture" ? "Deterministic fixture (scripted outputs, no model)" : "Recorded live run",
    model: mode === "fixture" ? "scripted-fixture" : model, provider: mode === "fixture" ? "none" : "groq",
    suite: { id: suite.suite_id, version: suite.version, cases: cases.length }, gate: DEFAULT_GATE,
    promptVersions: versions.map((v) => ({ id: v, text: prompts[v].trim() })),
    summary: Object.fromEntries(versions.map((v) => [v, { passed: out[v].filter((r) => r.pass).length, total: cases.length, byCategory: byCat(out[v]), latency: lat(v) }])),
    gateResult: gate,
    // Auto-derived from grader checks (facts, not narrative): why each regressed case fails on v2.
    analysis: gate.regressed.map((id) => {
      const a = out.v1.find((r) => r.caseId === id), b = out.v2.find((r) => r.caseId === id)
      return { caseId: id, category: b.category, v1Output: a.output, v2Output: b.output, v2FailedChecks: b.checks.filter((c: any) => !c.ok).map((c: any) => `${c.name}: ${c.detail}`) }
    }),
    results: out, createdAt: new Date().toISOString(),
    reproduce: mode === "fixture" ? "npm run lab:eval -- --mode fixture" : `GROQ_API_KEYS=<your key> npm run lab:eval -- --mode live --model ${model} --max-calls ${maxCalls}`,
  }
  const dir = path.join(root, "public/lab-results"); fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(path.join(dir, `${runId}.json`), JSON.stringify(result, null, 1))
  const idxPath = path.join(dir, "index.json")
  const idx: any[] = fs.existsSync(idxPath) ? JSON.parse(fs.readFileSync(idxPath, "utf8")) : []
  const entry = { runId, mode, label: result.label, model: result.model, createdAt: result.createdAt, v1: result.summary.v1.passed, v2: result.summary.v2.passed, total: cases.length, gatePass: gate.pass }
  fs.writeFileSync(idxPath, JSON.stringify([...idx.filter((e) => e.runId !== runId), entry].sort((a, b) => (a.mode < b.mode ? 1 : -1)), null, 1))
  console.log(`${result.label}\n v1: ${entry.v1}/${entry.total}  v2: ${entry.v2}/${entry.total}\n gate: ${gate.pass ? "PASS" : "FAIL"}  regressed: ${gate.regressed.join(", ") || "none"}\n wrote public/lab-results/${runId}.json`)
}

function byCat(rows: any[]) {
  const m: Record<string, { passed: number; total: number }> = {}
  for (const r of rows) { m[r.category] ??= { passed: 0, total: 0 }; m[r.category].total++; if (r.pass) m[r.category].passed++ }
  return m
}
/** Published results never contain canaries: if the detector (same normalization as grading,
 *  incl. case changes and spelled-out/spaced variants) sees a leak, the whole output is withheld. */
function redact(text: string, canaries: string[]): string {
  return containsSecret(text, canaries) ? "[OUTPUT WITHHELD: contained a canary secret]" : text
}

main().catch((e) => { console.error(e.message); process.exit(1) })
