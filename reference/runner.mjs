#!/usr/bin/env node
/**
 * Reference implementation — delegated-authority conformance, produced by the ERDL engine.
 *
 * The verdict is NOT a hand-written authority state machine. It is the ERDL expression
 * engine (erdl-landing) evaluating each vector's ERDL rule over its scenario context
 * (per DESIGN.md §8a).
 *
 * Two modes:
 *   (default)          verify — evaluate attack (expect DENY + matched rule) and legal
 *                      (expect ALLOW); print a pass/fail report.
 *   --write-answers F  oracle — evaluate each vector and write the answer oracle to F.
 *                      The answer carries ONLY the engine-derived fields (decision +
 *                      matched_invariant): these are what a third-party runner must
 *                      independently compute. The attribution fields (originating_task /
 *                      authority_provenance / violation_hop / requested_action /
 *                      effective_authority / reason) are scenario declarations, public in
 *                      the vector's `attribution` block, not the answer oracle.
 *
 * Conformance fields (per Annam §10 attributable rejection + his follow-up):
 *   decision + matched_invariant + first_invalid_boundary  (engine-derived)
 *   requested_action + effective_authority + reason        (scenario attribution)
 * `reason` free-text is non-normative (not compared byte-for-byte).
 */

import { readFileSync, writeFileSync, readdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Evaluator } from '../../erdl-landing/dist/index.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const VECTORS_DIR = resolve(__dirname, '..', 'vectors', 'stateless')

const evaluator = new Evaluator()

function loadVectors() {
  return readdirSync(VECTORS_DIR)
    .filter((f) => f.endsWith('.json'))
    .sort()
    .map((f) => JSON.parse(readFileSync(resolve(VECTORS_DIR, f), 'utf8')))
}

/** Engine-derived verdict for one context. */
function evaluate(vec, context) {
  const result = evaluator.evaluate([vec.rule], context)
  const matchedInvariant = result.matchedRules.length > 0
    ? result.matchedRules[0].ruleId.split('_')[0]
    : null
  return {
    decision: result.decision,
    matched_invariant: matchedInvariant,
  }
}

/**
 * Self-consistency check for a vector:
 *   (a) the rule id's invariant prefix must equal the vector's declared `invariant`;
 *   (b) the vector must declare an `attribution` block (Annam §10 attributable rejection).
 * Returns a list of consistency errors (empty = consistent).
 */
function consistencyErrors(vec) {
  const errors = []
  const declared = vec.invariant
  if (!declared) {
    errors.push('missing `invariant` field')
    return errors
  }
  const prefix = vec.rule?.id?.split('_')[0]
  if (prefix !== declared) {
    errors.push(`rule.id prefix ${prefix} != declared invariant ${declared}`)
  }
  if (!vec.attribution) {
    errors.push('missing `attribution` block')
  } else {
    for (const f of ['originating_task', 'authority_provenance', 'violation_hop', 'requested_action', 'effective_authority', 'reason']) {
      if (!vec.attribution[f]) errors.push(`attribution missing field: ${f}`)
    }
  }
  return errors
}

function writeAnswers(path) {
  const answers = {}
  for (const vec of loadVectors()) {
    answers[vec.id] = evaluate(vec, vec.attack)
  }
  writeFileSync(path, JSON.stringify(answers, null, 2) + '\n')
  console.log(`Answers written to ${path} (${Object.keys(answers).length} vectors, engine-derived fields only)`)
}

function verify() {
  let pass = 0
  let fail = 0
  for (const vec of loadVectors()) {
    // Self-consistency: rule.id prefix == declared invariant; attribution block present.
    const errors = consistencyErrors(vec)
    if (errors.length > 0) {
      fail++
      console.log(`FAIL ${vec.id}  self-consistency: ${errors.join('; ')}`)
      continue
    }

    const attack = evaluate(vec, vec.attack)
    const legal = evaluator.evaluate([vec.rule], vec.legal)

    const attackOk =
      attack.decision === 'DENY' &&
      attack.matched_invariant === vec.invariant
    const legalOk = legal.decision === 'ALLOW' && legal.matchedRules.length === 0

    if (attackOk && legalOk) {
      pass++
      const a = vec.attribution
      console.log(`PASS ${vec.id}  decision=${attack.decision} invariant=${attack.matched_invariant} boundary=${a.violation_hop}  (legal->ALLOW OK)`)
    } else {
      fail++
      console.log(`FAIL ${vec.id}`)
      console.log(`  attack: ${JSON.stringify(attack)} (expected invariant=${vec.invariant})`)
      console.log(`  legal: decision=${legal.decision} matched=${legal.matchedRules.length}`)
    }
  }
  console.log(`\n${pass} passed, ${fail} failed`)
  process.exit(fail === 0 ? 0 : 1)
}

const args = process.argv.slice(2)
const wi = args.indexOf('--write-answers')
if (wi !== -1 && args[wi + 1]) {
  writeAnswers(args[wi + 1])
} else {
  verify()
}
