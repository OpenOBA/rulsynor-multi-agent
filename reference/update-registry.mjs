#!/usr/bin/env node
/**
 * update-registry.mjs — regenerate the IMPLEMENTATIONS.md Registry table.
 *
 * The registry is auto-derived from machine-readable submissions (the byte-level
 * evidence): every third-party runner submission in `submissions/*.json` is
 * cross-verified against the current vectors (via verify-submission.mjs), and only
 * submissions that PASS are recorded. This mirrors erdl-vectors' scripts/update-registry.cjs
 * — "Measurements, not endorsements": every recorded row is a submission that PASSED
 * cross-verification; a failing submission is SKIPPED (never recorded).
 *
 * The reference row (OpenOBA) is NOT hand-edited either: it re-runs the reference
 * verification and records the actual pass count. If the reference fails, this script
 * exits non-zero (so the CI records the drift, not a fake green).
 *
 * Submissions in `submissions/archive/` are historical (previous vector sets) and are
 * NOT cross-verified here — they stay in the `## Archive` section outside the auto markers.
 *
 * Usage: node reference/update-registry.mjs
 *
 * Requires erdl-landing built at ../../erdl-landing/dist/index.js (same as runner.mjs).
 */

import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Evaluator } from '../../erdl-landing/dist/index.js'
import { loadVectors, crossVerify } from './verify-submission.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')
const SUBMISSIONS_DIR = resolve(ROOT, 'submissions')
const IMPL_FILE = resolve(ROOT, 'IMPLEMENTATIONS.md')

const BEGIN = '<!-- registry:auto-begin -->'
const END = '<!-- registry:auto-end -->'

const HEADER = '| Implementor | Method | Result | Date | Artifact |'
const SEPARATOR = '|------------|--------|:-------:|------|---------|'

// Bumped manually when the vector set changes; the reference is re-verified on that date.
const REFERENCE_DATE = '2026-09-12'

const evaluator = new Evaluator()

/** Engine-derived verdict for one context (mirrors runner.mjs evaluate). */
function evaluate(vec, context) {
  const result = evaluator.evaluate([vec.rule], context)
  const matchedInvariant = result.matchedRules.length > 0
    ? result.matchedRules[0].ruleId.split('_')[0]
    : null
  return { decision: result.decision, matched_invariant: matchedInvariant }
}

/** Re-run the reference verification; returns the number of vectors the reference passes. */
function referencePassCount(vectors) {
  let pass = 0
  for (const vec of vectors) {
    const attack = evaluate(vec, vec.attack)
    const legal = evaluator.evaluate([vec.rule], vec.legal)
    const attackOk = attack.decision === 'DENY' && attack.matched_invariant === vec.invariant
    const legalOk = legal.decision === 'ALLOW' && legal.matchedRules.length === 0
    if (attackOk && legalOk) pass++
  }
  return pass
}

/** Build the answer oracle (decision + matched_invariant) for the current vectors. */
function buildOracle(vectors) {
  const oracle = {}
  for (const vec of vectors) {
    oracle[vec.id] = evaluate(vec, vec.attack)
  }
  return oracle
}

function main() {
  const vectors = loadVectors()
  const oracle = buildOracle(vectors)

  const refPass = referencePassCount(vectors)
  const total = vectors.length
  const referenceRow =
    `| **OpenOBA (reference)** | Node.js, @openoba/erdl engine | ${refPass}/${total} | ${REFERENCE_DATE} | [runner.mjs](reference/runner.mjs) |`

  const rows = []
  const skipped = []
  const submissionFiles = readdirSync(SUBMISSIONS_DIR)
    .filter((f) => f.endsWith('.json'))
    .sort()
  for (const f of submissionFiles) {
    const sub = JSON.parse(readFileSync(resolve(SUBMISSIONS_DIR, f), 'utf8'))
    const { pass, total: subTotal, mismatches } = crossVerify(sub, vectors, oracle)
    if (mismatches.length !== 0) {
      skipped.push(f + ' (' + mismatches.join('; ') + ')')
      continue
    }
    const runner = sub.runner || f.replace(/\.json$/, '')
    const method = sub.method || '—'
    const date = sub.date || '—'
    const artifact = sub.artifact || resolve('submissions', f)
    const artifactLabel = (() => {
      const m = String(artifact).match(/github\.com\/([^/]+)\/([^/]+)/)
      return m ? m[2] : artifact
    })()
    rows.push(`| **${runner}** | ${method} | ${pass}/${subTotal} | ${date} | [${artifactLabel}](${artifact}) |`)
  }

  const content = readFileSync(IMPL_FILE, 'utf8')
  const start = content.indexOf(BEGIN)
  const end = content.indexOf(END)
  if (start === -1 || end === -1) {
    console.error('ERROR: IMPLEMENTATIONS.md missing registry markers (' + BEGIN + ' / ' + END + ')')
    process.exit(1)
  }

  const tableRows = [HEADER, SEPARATOR, referenceRow].concat(rows)
  const body = '\n' + tableRows.join('\n') + '\n'
  const newContent = content.slice(0, start + BEGIN.length) + body + content.slice(end)
  writeFileSync(IMPL_FILE, newContent, 'utf8')

  console.log('Registry regenerated: reference ' + refPass + '/' + total
    + ' · ' + rows.length + ' verified runner(s)'
    + (skipped.length ? ' · skipped ' + skipped.length + ' (unverified)' : ''))
  for (const s of skipped) console.log('  skipped: ' + s)

  if (refPass !== total) {
    console.error('ERROR: reference does not pass the full vector set (' + refPass + '/' + total + ')')
    process.exit(1)
  }
}

main()
