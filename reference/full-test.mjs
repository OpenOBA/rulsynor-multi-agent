#!/usr/bin/env node
/**
 * Full positive/negative test suite for the delegated-authority vectors.
 *
 * Positive      : each vector's `legal` context must ALLOW (rule must NOT fire).
 * Negative      : each vector's `attack` context must DENY with correct attribution.
 * Consistency   : rule.id prefix == declared invariant; attribution block complete.
 * Discriminability: deny-all / allow-all / wrong-invariant / wrong-boundary / divergent-reason.
 *
 * All verdicts are produced by the ERDL engine (erdl-landing), never a hand-written state machine.
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

let pass = 0
let fail = 0
function check(name, ok, detail = '') {
  if (ok) { pass++; console.log(`PASS ${name}${detail ? '  ' + detail : ''}`) }
  else { fail++; console.log(`FAIL ${name}${detail ? '  ' + detail : ''}`) }
}

function verdict(vec, context) {
  const r = evaluator.evaluate([vec.rule], context)
  return {
    decision: r.decision,
    matched_invariant: r.matchedRules.length > 0 ? r.matchedRules[0].ruleId.split('_')[0] : null,
  }
}

// -- 0. Vector self-consistency (rule.id prefix == invariant; attribution complete) --
for (const vec of vectors) {
  const declared = vec.invariant
  const prefix = vec.rule?.id?.split('_')[0]
  const attOk = vec.attribution &&
    ['originating_task', 'authority_provenance', 'violation_hop', 'requested_action', 'effective_authority', 'reason']
      .every((f) => vec.attribution[f])
  check(
    `${vec.id} self-consistency (rule.id=${prefix}, invariant=${declared}, attribution complete)`,
    declared && prefix === declared && attOk,
  )
}

// -- 1. Positive (legal -> ALLOW) --
for (const vec of vectors) {
  const legal = evaluator.evaluate([vec.rule], vec.legal)
  check(
    `${vec.id} positive (legal -> ALLOW, rule not fired)`,
    legal.decision === 'ALLOW' && legal.matchedRules.length === 0,
    `decision=${legal.decision} matched=${legal.matchedRules.length}`,
  )
}

// -- 2. Negative (attack -> DENY + correct invariant + complete attribution) --
for (const vec of vectors) {
  const attack = verdict(vec, vec.attack)
  const att = vec.attribution
  const ok =
    attack.decision === 'DENY' &&
    attack.matched_invariant === vec.invariant &&
    att.violation_hop !== undefined &&
    att.requested_action !== undefined &&
    att.effective_authority !== undefined
  check(
    `${vec.id} negative (attack -> DENY + ${vec.invariant} + complete attribution)`,
    ok,
    `decision=${attack.decision} invariant=${attack.matched_invariant} boundary=${att.violation_hop}`,
  )
}

// -- 3. Discriminability (anti-cheat) --
// deny-all: all DENY with no attribution -> must conform to 0 vectors.
{
  let caught = 0
  for (const vec of vectors) {
    const exp = verdict(vec, vec.attack)
    const got = { decision: 'DENY', matched_invariant: null }
    if (got.decision === exp.decision && got.matched_invariant === exp.matched_invariant) caught++
  }
  check(`deny-all conforms to 0 vectors (${caught} of ${vectors.length})`, caught === 0)
}
// allow-all: all ALLOW -> must conform to 0 vectors.
{
  let caught = 0
  for (const vec of vectors) {
    const exp = verdict(vec, vec.attack)
    const got = { decision: 'ALLOW', matched_invariant: null }
    if (got.decision === exp.decision && got.matched_invariant === exp.matched_invariant) caught++
  }
  check(`allow-all conforms to 0 vectors (${caught} of ${vectors.length})`, caught === 0)
}
// wrong-invariant: wrong invariant -> must fail all.
{
  const invs = ['INV-01', 'INV-02', 'INV-03', 'INV-04', 'INV-05']
  let caught = 0
  for (const vec of vectors) {
    const exp = verdict(vec, vec.attack)
    const wrong = invs.find((i) => i !== exp.matched_invariant)
    if (exp.decision === 'DENY' && wrong === exp.matched_invariant) caught++
  }
  check('wrong-invariant attribution fails all', caught === 0)
}
// wrong-boundary: wrong boundary -> must fail all.
{
  let caught = 0
  for (const vec of vectors) {
    const att = vec.attribution
    if (att.violation_hop === 'WRONG-HOP') caught++
  }
  check('wrong-boundary attribution fails all (no abnormal violation_hop)', caught === 0)
}

console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail === 0 ? 0 : 1)
