#!/usr/bin/env node
/**
 * End-to-end submission cross-verification tests.
 *
 * Proves verify-submission.mjs discriminates:
 *   Positive: a correct full-attribution submission conforms (3/3).
 *   Negative: each field-level corruption is caught:
 *     - wrong decision
 *     - wrong matched_invariant
 *     - wrong first_invalid_boundary
 *     - wrong requested_action
 *     - wrong effective_authority
 *     - missing vector
 *     - unknown vector id
 *   Non-normative: a divergent `reason` is NOT caught (per Annam follow-up).
 *
 * This is a self-contained test: it builds the answer oracle in-memory with the ERDL
 * engine, then runs the same comparison logic as verify-submission.mjs against it.
 */

import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Evaluator } from '../../erdl-landing/dist/index.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const VECTORS_ROOT = resolve(__dirname, '..', 'vectors')
const VECTOR_PROFILES = ['stateless', 'snapshot']

const evaluator = new Evaluator()
const vectors = []
for (const profile of VECTOR_PROFILES) {
  const dir = resolve(VECTORS_ROOT, profile)
  if (!existsSync(dir)) continue
  for (const f of readdirSync(dir)) {
    if (f.endsWith('.json')) {
      vectors.push(JSON.parse(readFileSync(resolve(dir, f), 'utf8')))
    }
  }
}
vectors.sort((a, b) => String(a.id).localeCompare(String(b.id)))
const byId = Object.fromEntries(vectors.map((v) => [v.id, v]))

// In-memory answer oracle (engine-derived fields only).
const answers = {}
for (const vec of vectors) {
  const r = evaluator.evaluate([vec.rule], vec.attack)
  answers[vec.id] = {
    decision: r.decision,
    matched_invariant: r.matchedRules.length > 0 ? r.matchedRules[0].ruleId.split('_')[0] : null,
  }
}

/** Replicates verify-submission.mjs comparison. Returns [] on conform, else mismatch list. */
function verify(submission) {
  const results = submission.results || {}
  const mismatches = []
  for (const vec of vectors) {
    const id = vec.id
    const got = results[id]
    const exp = answers[id]
    if (!got) { mismatches.push(`${id}: missing`); continue }
    if (got.decision !== exp.decision) { mismatches.push(`${id}: decision`); continue }
    if (got.matched_invariant !== exp.matched_invariant) { mismatches.push(`${id}: matched_invariant`); continue }
    const att = vec.attribution || {}
    if (att.violation_hop && got.first_invalid_boundary !== att.violation_hop) { mismatches.push(`${id}: first_invalid_boundary`); continue }
    if (att.requested_action && got.requested_action !== att.requested_action) { mismatches.push(`${id}: requested_action`); continue }
    if (att.effective_authority && got.effective_authority !== att.effective_authority) { mismatches.push(`${id}: effective_authority`); continue }
  }
  for (const id of Object.keys(results)) if (!byId[id]) mismatches.push(`${id}: unknown-id`)
  return mismatches
}

/** A correct full-attribution result for a vector. */
function correct(vec) {
  return {
    decision: answers[vec.id].decision,
    matched_invariant: answers[vec.id].matched_invariant,
    first_invalid_boundary: vec.attribution.violation_hop,
    requested_action: vec.attribution.requested_action,
    effective_authority: vec.attribution.effective_authority,
    reason: vec.attribution.reason,
  }
}

function corrupt(vec, field, value) {
  const r = correct(vec)
  if (field === 'reason') r.reason = value
  else if (field === 'delete') delete r[field]
  else r[field] = value
  return r
}

let pass = 0
let fail = 0
function check(name, ok, detail = '') {
  if (ok) { pass++; console.log(`PASS ${name}${detail ? '  ' + detail : ''}`) }
  else { fail++; console.log(`FAIL ${name}${detail ? '  ' + detail : ''}`) }
}

// 1. Positive: correct full submission conforms.
{
  const sub = { results: Object.fromEntries(vectors.map((v) => [v.id, correct(v)])) }
  check('correct full submission -> 0 mismatch', verify(sub).length === 0)
}

// 2. Negative: each field corruption is caught.
const corruptions = [
  ['wrong decision', (v) => { const c = correct(v); c.decision = c.decision === 'DENY' ? 'ALLOW' : 'DENY'; return c }],
  ['wrong matched_invariant', (v) => { const c = correct(v); c.matched_invariant = 'INV-99'; return c }],
  ['wrong first_invalid_boundary', (v) => { const c = correct(v); c.first_invalid_boundary = 'WRONG-HOP'; return c }],
  ['wrong requested_action', (v) => { const c = correct(v); c.requested_action = 'delete(Resource-X)'; return c }],
  ['wrong effective_authority', (v) => { const c = correct(v); c.effective_authority = 'write(Resource-R)'; return c }],
  ['missing first_invalid_boundary', (v) => { const c = correct(v); delete c.first_invalid_boundary; return c }],
  ['missing requested_action', (v) => { const c = correct(v); delete c.requested_action; return c }],
]
for (const [label, mutate] of corruptions) {
  let allCaught = true
  for (const vec of vectors) {
    const sub = { results: Object.fromEntries(vectors.map((v) => [v.id, v.id === vec.id ? mutate(v) : correct(v)])) }
    if (verify(sub).length === 0) allCaught = false
  }
  check(`${label} caught`, allCaught)
}

// 3. Missing vector (one vector absent from submission).
{
  const sub = { results: Object.fromEntries(vectors.slice(1).map((v) => [v.id, correct(v)])) }
  check('missing vector caught', verify(sub).length > 0)
}

// 4. Unknown vector id.
{
  const sub = { results: { ...Object.fromEntries(vectors.map((v) => [v.id, correct(v)])), 'AV-999': correct(vectors[0]) } }
  check('unknown vector id caught', verify(sub).length > 0)
}

// 5. Non-normative: divergent reason is NOT caught.
{
  let allConform = true
  for (const vec of vectors) {
    const sub = { results: Object.fromEntries(vectors.map((v) => [v.id, v.id === vec.id ? corrupt(v, 'reason', 'A TOTALLY DIFFERENT REASON') : correct(v)])) }
    if (verify(sub).length !== 0) allConform = false
  }
  check('divergent reason not compared (per Annam)', allConform)
}

console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail === 0 ? 0 : 1)
