"use client"

// Agent Release Lab: explore completed, versioned evaluation runs. Public mode never calls a model:
// everything here is read from static JSON produced by `npm run lab:eval`.
import { useEffect, useMemo, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

type Check = { name: string; ok: boolean; detail: string }
type Row = { caseId: string; category: string; input: string; output: string; pass: boolean; checks: Check[]; latencyMs: number | null }
type Run = {
  runId: string; mode: "fixture" | "live"; label: string; model: string; reproduce: string; createdAt: string
  suite: { id: string; version: string; cases: number }
  gate: { min_pass_rate: number; secret_refusal_pass_rate: number; max_regressed_cases: number }
  promptVersions: { id: string; text: string }[]
  summary: Record<string, { passed: number; total: number; byCategory: Record<string, { passed: number; total: number }>; latency: { p50: number; p95: number; mean: number } | null }>
  gateResult: { pass: boolean; passRate: number; regressed: string[]; improved: string[]; rules: { name: string; ok: boolean; detail: string }[] }
  analysis: { caseId: string; v1Output: string; v2Output: string; v2FailedChecks: string[] }[]
  results: Record<string, Row[]>
}
type IndexEntry = { runId: string; mode: string; label: string; model: string }

const MODE_NOTE: Record<string, string> = {
  fixture: "Deterministic fixture: scripted outputs that exercise the graders and this UI. No model was called, so these pass counts are not a model measurement.",
  live: "Recorded live run: a real model was called privately with capped calls, then sanitized and published. Nothing here calls a model.",
}

export default function LabPage() {
  const [index, setIndex] = useState<IndexEntry[]>([])
  const [run, setRun] = useState<Run | null>(null)
  const [version, setVersion] = useState("v2")
  const [caseId, setCaseId] = useState<string>("")
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch("/lab-results/index.json").then((r) => r.json()).then((d: IndexEntry[]) => {
      setIndex(d)
      if (d[0]) load(d[0].runId)
    }).catch(() => setError("Could not load completed runs."))
  }, [])

  function load(id: string) {
    fetch(`/lab-results/${id}.json`).then((r) => r.json()).then((r: Run) => { setRun(r); setCaseId(r.gateResult.regressed[0] ?? r.results.v2[0].caseId) }).catch(() => setError("Could not load that run."))
  }

  const row = useMemo(() => run?.results[version]?.find((r) => r.caseId === caseId), [run, version, caseId])
  const other = useMemo(() => run?.results[version === "v1" ? "v2" : "v1"]?.find((r) => r.caseId === caseId), [run, version, caseId])

  if (error) return <main className="p-8">{error}</main>
  if (!run) return <main className="p-8 text-sm text-muted-foreground">Loading completed runs...</main>
  const g = run.gateResult

  return (
    <main className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      <header className="space-y-2">
        <a href="/" className="text-xs text-muted-foreground underline">LLM Eval Dashboard</a>
        <h1 className="text-2xl font-semibold tracking-tight">Agent Release Lab</h1>
        <p className="text-sm text-muted-foreground">Same dataset and model, two prompt versions, an explicit release gate. Suite {run.suite.id} v{run.suite.version} ({run.suite.cases} synthetic cases).</p>
        <div className="flex flex-wrap items-center gap-2">
          {index.map((e) => (
            <button key={e.runId} onClick={() => load(e.runId)} className={`rounded-md border px-3 py-1 text-xs ${e.runId === run.runId ? "bg-primary text-primary-foreground" : ""}`}>{e.label}</button>
          ))}
        </div>
        <p role="note" className={`rounded border px-3 py-2 text-xs ${run.mode === "fixture" ? "border-amber-500/50 bg-amber-500/10" : "border-emerald-600/40 bg-emerald-600/10"}`}>
          <Badge variant="outline" className="mr-2">{run.mode === "fixture" ? "Deterministic fixture" : "Recorded live run"}</Badge>{MODE_NOTE[run.mode]}
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-3">
        {run.promptVersions.map((v) => {
          const s = run.summary[v.id]
          return (
            <Card key={v.id}>
              <CardHeader><CardTitle className="text-base">Prompt {v.id}</CardTitle><CardDescription>{run.model}</CardDescription></CardHeader>
              <CardContent className="space-y-1 text-sm">
                <div className="text-2xl font-semibold">{s.passed}/{s.total} <span className="text-sm font-normal text-muted-foreground">passed</span></div>
                <div className="text-xs text-muted-foreground">Latency: {s.latency ? `p50 ${s.latency.p50} ms, p95 ${s.latency.p95} ms` : "n/a (no model call)"}</div>
                <ul className="text-xs">{Object.entries(s.byCategory).map(([c, x]) => <li key={c}>{c.replace("_", " ")}: {x.passed}/{x.total}</li>)}</ul>
              </CardContent>
            </Card>
          )
        })}
        <Card className={g.pass ? "border-emerald-600/50" : "border-red-600/50"}>
          <CardHeader><CardTitle className="text-base">Release gate (v2 vs v1)</CardTitle><CardDescription>{g.pass ? "PASS: ship" : "FAIL: blocked"}</CardDescription></CardHeader>
          <CardContent className="space-y-1 text-xs">
            {g.rules.map((r) => <div key={r.name}>{r.ok ? "PASS" : "FAIL"} - {r.name.replace("_", " ")}: {r.detail}</div>)}
            <div className="pt-1">Regressed: <b>{g.regressed.join(", ") || "none"}</b></div>
            <div>Improved: {g.improved.length} cases</div>
          </CardContent>
        </Card>
      </div>

      {run.analysis.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Failure analysis: cases that regressed on v2</CardTitle><CardDescription>Derived from grader checks, not from a model.</CardDescription></CardHeader>
          <CardContent className="space-y-3 text-xs">
            {run.analysis.map((a) => (
              <div key={a.caseId} className="rounded border p-3">
                <button className="font-mono font-medium underline" onClick={() => { setCaseId(a.caseId); setVersion("v2") }}>{a.caseId}</button>
                <div className="mt-1">v1 output: <code>{a.v1Output}</code></div>
                <div>v2 output: <code>{a.v2Output}</code></div>
                <ul className="mt-1 list-disc pl-5">{a.v2FailedChecks.map((c) => <li key={c}>{c}</li>)}</ul>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <section className="grid gap-4 lg:grid-cols-[18rem_1fr]">
        <div className="space-y-2">
          <div role="group" aria-label="Prompt version" className="inline-flex rounded-md border text-xs">
            {run.promptVersions.map((v) => <button key={v.id} onClick={() => setVersion(v.id)} className={`px-3 py-1.5 ${version === v.id ? "bg-primary text-primary-foreground" : ""}`}>{v.id}</button>)}
          </div>
          <ul className="max-h-[28rem] overflow-auto rounded border text-xs">
            {run.results[version].map((r) => (
              <li key={r.caseId}>
                <button onClick={() => setCaseId(r.caseId)} className={`flex w-full items-center justify-between px-3 py-1.5 text-left ${r.caseId === caseId ? "bg-muted" : ""}`}>
                  <span className="font-mono">{r.caseId} <span className="font-sans text-muted-foreground">{r.category.replace("_", " ")}</span></span>
                  <span className={r.pass ? "text-emerald-600" : "text-red-600"}>{r.pass ? "pass" : "FAIL"}{g.regressed.includes(r.caseId) && version === "v2" ? " (regressed)" : ""}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
        {row && (
          <Card>
            <CardHeader><CardTitle className="text-base font-mono">{row.caseId} - prompt {version}: {row.pass ? "pass" : "fail"}</CardTitle><CardDescription>{row.input}</CardDescription></CardHeader>
            <CardContent className="space-y-3 text-xs">
              <div><div className="font-medium">Agent output</div><pre className="whitespace-pre-wrap rounded bg-muted p-2">{row.output}</pre></div>
              <div><div className="font-medium">Grader checks</div>
                <ul>{row.checks.map((c) => <li key={c.name} className={c.ok ? "" : "text-red-600"}>{c.ok ? "ok" : "FAIL"} - {c.name}: {c.detail}</li>)}</ul></div>
              {other && <div className="text-muted-foreground">Other version ({version === "v1" ? "v2" : "v1"}): {other.pass ? "pass" : "fail"}</div>}
            </CardContent>
          </Card>
        )}
      </section>

      <footer className="space-y-1 border-t pt-4 text-xs text-muted-foreground">
        <div>Reproduce: <code>{run.reproduce}</code></div>
        <div>Scores here are exact rule checks (strict JSON, enums, tool name and arguments, substring facts, canary strings), not model judgments. The main dashboard&apos;s Quality, ROUGE-L, Hallucination and Consistency numbers are text-overlap <b>heuristics</b>.</div>
        <div>Live evaluation is disabled on the public site. Source: <a className="underline" href="https://github.com/nakshaatraa/LLM-Eval-Dashboard">upstream</a> (MIT) + my release-lab additions.</div>
      </footer>
    </main>
  )
}
