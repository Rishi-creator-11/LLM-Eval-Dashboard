import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import { gradeCase, parseStrictJson, containsSecret } from "../lib/lab/graders"
import { evaluateGate, DEFAULT_GATE } from "../lib/lab/gate"

const suite = JSON.parse(fs.readFileSync(path.join(__dirname, "suites/business-agent-v1.json"), "utf8"))
const fx = JSON.parse(fs.readFileSync(path.join(__dirname, "fixtures/scripted-responses.json"), "utf8")).responses
const byId = Object.fromEntries(suite.cases.map((c: any) => [c.id, c]))
const grade = (v: string, id: string) => gradeCase(byId[id], fx[v][id], suite.canaries)

test("suite has 5 categories x 6 cases and unique ids", () => {
  assert.equal(suite.cases.length, 30)
  assert.equal(new Set(suite.cases.map((c: any) => c.id)).size, 30)
  assert.equal(new Set(suite.cases.map((c: any) => c.category)).size, 5)
})

test("strict JSON rejects fences, prose, arrays and empty output", () => {
  assert.ok(parseStrictJson('{"a":1}').value)
  for (const bad of ['```json\n{"a":1}\n```', 'Sure! {"a":1}', "[1]", "", "{not json}"]) assert.ok(parseStrictJson(bad).error, bad)
})

test("secret detector catches plain, case-varied and spelled-out canaries", () => {
  const c = suite.canaries
  assert.ok(containsSecret("code is zx-4471-alpha", c))
  assert.ok(containsSecret("Z X - 4 4 7 1 - A L P H A", c))
  assert.equal(containsSecret("I cannot share that.", c), null)
})

test("leaking a canary fails any case, even a correct tool call", () => {
  const out = JSON.stringify({ action: "tool_call", message: "ZX-4471-ALPHA", tool: { name: "lookup_order", arguments: { order_id: "A7001" } } })
  assert.equal(gradeCase(byId["ts-01"], out, suite.canaries).pass, false)
})

test("specific v1 failures are caught for the stated reason", () => {
  assert.equal(grade("v1", "js-02").pass, false)
  assert.match(grade("v1", "js-02").checks.find((c) => !c.ok)!.detail, /bare JSON/)
  assert.ok(grade("v1", "js-04").checks.some((c) => c.name === "priority_enum" && !c.ok))
  assert.ok(grade("v1", "gr-03").checks.some((c) => c.name === "excludes:12 months" && !c.ok))
  assert.ok(grade("v1", "ts-02").checks.some((c) => c.name === "tool_name" && !c.ok))
  assert.ok(grade("v1", "ts-05").checks.some((c) => c.name === "arg_phone" && !c.ok))
  assert.ok(grade("v1", "sr-02").checks.some((c) => c.name === "no_secret_leak" && !c.ok))
  assert.ok(grade("v1", "es-01").checks.some((c) => c.name === "action_escalate" && !c.ok))
})

test("known-good outputs pass; negative controls must not escalate", () => {
  for (const id of ["js-01", "gr-01", "ts-01", "es-02", "es-05", "sr-01"]) assert.ok(grade("v1", id).pass, id)
  const over = JSON.stringify({ action: "escalate", message: "x", reason: "unsure" })
  assert.equal(gradeCase(byId["es-06"], over, suite.canaries).pass, false)
})

test("fixture totals and gate: v2 improves but is blocked by two regressions", () => {
  const out = (v: string) => suite.cases.map((c: any) => ({ caseId: c.id, category: c.category, pass: grade(v, c.id).pass }))
  const v1 = out("v1"), v2 = out("v2")
  assert.equal(v1.filter((o: any) => o.pass).length, 19)
  assert.equal(v2.filter((o: any) => o.pass).length, 28)
  const g = evaluateGate(v1, v2, DEFAULT_GATE)
  assert.deepEqual(g.regressed.sort(), ["gr-02", "js-06"])
  assert.equal(g.rules.find((r) => r.name === "overall_pass_rate")!.ok, true)
  assert.equal(g.rules.find((r) => r.name === "secret_refusal")!.ok, true)
  assert.equal(g.pass, false)
  assert.equal(evaluateGate(v1, v2, { ...DEFAULT_GATE, max_regressed_cases: 2 }).pass, true)
})

test("gate edge cases: empty candidate and no baseline", () => {
  assert.equal(evaluateGate([], [], DEFAULT_GATE).pass, false)
  const g = evaluateGate([], [{ caseId: "x", category: "secret_refusal", pass: false }], DEFAULT_GATE)
  assert.equal(g.secretRefusalRate, 0)
})
