#!/usr/bin/env node
/**
 * verify-submission.mjs — cross-verify a third-party delegated-authority runner submission.
 *
 * A conforming runner independently implements the ERDL rule-evaluation contract
 * (per DESIGN.md §8a): evaluate each vector's ERDL rule over its attack context, and
 * emit per vector:
 *   - decision + matched_invariant        (engine-derived; verified against the answer oracle)
 *   - first_invalid_boundary + requested_action + effective_authority + reason
 *                                          (attribution; verified against the vector's public
 *                                           attribution declaration)
 *
 * Comparison rules:
 *   decision / matched_invariant          — equal (vs answer oracle, gitignored)
 *   first_invalid_boundary                — equal (vs vector attribution.violation_hop)
 *   requested_action / effective_authority— equal (vs vector attribution)
 *   reason                                — NOT compared (non-normative, per Annam follow-up)
 *
 * Usage:
 *   node reference/verify-submission.mjs --submission <path> --answers <path>
 */

import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const VECTORS_ROOT = resolve(__dirname, '..', 'vectors')
const VECTOR_PROFILES = ['stateless', 'snapshot']

export function loadVectors() {
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
  return vectors.sort((a, b) => String(a.id).localeCompare(String(b.id)))
}

/**
 * Cross-verify one submission against the vectors + answer oracle.
 * Returns { pass, total, mismatches } — mismatches non-empty ⇒ the submission does NOT conform.
 * Reusable by update-registry.mjs (auto-record) so the registry and the CLI share one
 * cross-verification definition.
 */
export function crossVerify(submission, vectors, answers) {
  const byId = Object.fromEntries(vectors.map((v) => [v.id, v]))

  const results = submission.results || {}
  const mismatches = []
  let pass = 0
  let total = 0

  for (const vec of vectors) {
    total++
    const id = vec.id
    const got = results[id]
    const exp = answers[id]
    if (!got) {
      mismatches.push(`${id}: missing from submission`)
      continue
    }

    // 1. engine-derived fields (vs answer oracle)
    if (got.decision !== exp.decision) {
      mismatches.push(`${id}: decision expected ${exp.decision}, got ${got.decision}`)
      continue
    }
    if (got.matched_invariant !== exp.matched_invariant) {
      mismatches.push(`${id}: matched_invariant expected ${exp.matched_invariant}, got ${got.matched_invariant}`)
      continue
    }

    // 2. attribution fields (vs the vector's public attribution declaration)
    const att = vec.attribution || {}
    if (att.violation_hop && got.first_invalid_boundary !== att.violation_hop) {
      mismatches.push(`${id}: first_invalid_boundary expected ${att.violation_hop}, got ${got.first_invalid_boundary}`)
      continue
    }
    if (att.requested_action && got.requested_action !== att.requested_action) {
      mismatches.push(`${id}: requested_action expected ${att.requested_action}, got ${got.requested_action}`)
      continue
    }
    if (att.effective_authority && got.effective_authority !== att.effective_authority) {
      mismatches.push(`${id}: effective_authority expected ${att.effective_authority}, got ${got.effective_authority}`)
      continue
    }

    pass++
  }

  // Reject extra ids the oracle does not know.
  for (const id of Object.keys(results)) {
    if (!byId[id]) mismatches.push(`${id}: unknown vector id in submission`)
  }

  return { pass, total, mismatches }
}

function main() {
  const args = process.argv.slice(2)
  const get = (flag) => {
    const i = args.indexOf(flag)
    return i === -1 ? null : args[i + 1]
  }
  const submissionPath = get('--submission')
  const answersPath = get('--answers')
  if (!submissionPath || !answersPath) {
    console.error('Usage: node reference/verify-submission.mjs --submission <path> --answers <path>')
    process.exit(2)
  }

  const submission = JSON.parse(readFileSync(submissionPath, 'utf8'))
  const answers = JSON.parse(readFileSync(answersPath, 'utf8'))
  const vectors = loadVectors()

  const { pass, total, mismatches } = crossVerify(submission, vectors, answers)

  console.log(`runner: ${submission.runner || '(unnamed)'}`)
  console.log(`method: ${submission.method || '(unspecified)'}`)
  if (mismatches.length === 0) {
    console.log(`PASS: ${pass}/${total} vectors conform`)
    process.exit(0)
  }
  console.log(`FAIL: ${pass}/${total} vectors conform; ${mismatches.length} mismatch(es):`)
  for (const m of mismatches) console.log(`  - ${m}`)
  process.exit(1)
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main()
}
