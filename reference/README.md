# Delegated-Authority Property Vectors — ERDL-Anchored Reference

The reference implementation for the **delegated-authority property vector set**.

Status: **14-vector set** (AV-01…AV-14): 9 stateless (pure current-state facts) + 5 snapshot
(revocation/temporal timestamps materialized into the fact, single-evaluate — no event history).

| Profile | Vectors |
|---|---|
| `stateless` | AV-01/02/03/04/06/07/09/11/12 |
| `snapshot` | AV-05 (revocation) / AV-08 (sequence replay) / AV-10 (freshness) / AV-13 (completed-action no-reversal) / AV-14 (unavailable state) |

## The load-bearing principle (DESIGN.md §8a)

The verdict for each vector is **produced by the ERDL expression engine** (`erdl-landing`), not by
a hand-written authority state machine. Each vector carries an ERDL rule (its `when` condition is
the constraint comparison, its `then` action is the conforming decision) plus an attack context
and a legal context; `Evaluator.evaluate(rule, context)` emits the decision, and the matched rule
id encodes the invariant. A vector that does not exercise ERDL rule evaluation proves nothing
about ERDL.

## The fourteen vectors — one per adversarial scenario

The full table lives in the root [README](../README.md#the-fourteen-adversarial-conformance-vectors).
Each vector carries an **attack** context (violating → DENY + a matched invariant) and a **legal**
context (non-violating → ALLOW), so the rule is proven to be a detector, not an indiscriminate
DENY. The AV-13 dual (completed-action no-reversal) additionally blocks over-revocation.

## Conformance: what an independent runner must agree on

A runner conforms to a vector **iff** its output matches all three of:

```
decision               ∈ { DENY, ALLOW }
matched_invariant      ∈ { INV-01, INV-02, INV-03, INV-04, INV-05 }
first_invalid_boundary   (the first hop where the authority transition became invalid)
```

Plus the attribution fields `requested_action` / `effective_authority` (scenario declarations).
`reason` (free text) is **non-normative** — it is not compared.

## Reference scripts in this directory

| Script | Purpose |
|---|---|
| `runner.mjs` | Reference verification: attack → DENY + matched invariant, legal → ALLOW. `--write-answers F` writes the answer oracle (engine-derived fields only). |
| `full-test.mjs` | Full positive/negative suite (consistency + discriminability). |
| `submission-e2e.test.mjs` | Cross-verify pipeline e2e: field corruption discrimination (missing/divergent fields). |
| `verify-submission.mjs` | Cross-verify one third-party submission against the answer oracle + vector attribution. Exports `loadVectors()` / `crossVerify()` for reuse. |
| `update-registry.mjs` | **Auto-record**: regenerate `IMPLEMENTATIONS.md` registry from `submissions/*.json` (cross-verify each, record only PASS). Re-runs the reference verification; exits non-zero if the reference itself fails. |
| `generate-conformance.mjs` | **Auto-record**: regenerate `conformance/CONFORMANCE.md` from the verification run. |
| `boundary-drift-check.mjs` | Boundary-attribution drift regression. |
| `decision-table-check.mjs` | Decision-table expansion + priority regression. |
| `evidence-check.mjs` | Evidence-chain (canonicalTrees hash + asOf + errored + evalWarnings) regression. |
| `failclose-metadata-check.mjs` | Fail-close / fallbackDecision override regression. |
| `fn-delegation-check.mjs` | Function-delegation (s-expression roundtrip + fn node) regression. |
| `gloss-check.mjs` / `gloss-lint-check.mjs` | Gloss (B5-c `not(exists)` phrasing / B5-e every-rule-must-carry-gloss) regression. |

## Auto-record pipeline (mirrors erdl-vectors)

- **PR stage** (`.github/workflows/vectors.yml`): cross-verifies a runner submission against the
  answer oracle before merge; fails the PR if it does not conform.
- **Post-merge** (`.github/workflows/record-runners.yml`): on push to `submissions/**`,
  `update-registry.mjs` regenerates the `IMPLEMENTATIONS.md` registry and auto-commits it. Only
  submissions that PASS cross-verification are recorded; a failing one is never recorded.

## How to run an independent runner against this set

1. Read `vectors/scenario-schema.json` for the vector shape.
2. Read each `vectors/stateless/*.json` + `vectors/snapshot/*.json` vector (rule + attack + legal
   + `attribution`).
3. Independently implement the **ERDL rule-evaluation contract** (as norviq-go / concordia-python
   independently implement the Decision Object contract): evaluate the rule over the contexts and
   emit `{ decision, matched_invariant, first_invalid_boundary, requested_action, effective_authority }`.
4. Submit `submissions/<your-runner-name>-output.json` — see [submissions/README.md](../submissions/README.md).

A runner that reimplements EA folding from scratch without evaluating ERDL rules is a parallel
system, not an ERDL-conforming one.

## Run the reference locally

```bash
node reference/runner.mjs                    # ERDL-engine verdict over the 14 vectors (expect 14 passed)
node reference/full-test.mjs                 # full positive/negative suite (consistency + discriminability)
node reference/submission-e2e.test.mjs       # cross-verify pipeline e2e (field corruption discrimination)
node reference/generate-conformance.mjs      # regenerate conformance/CONFORMANCE.md
node reference/update-registry.mjs           # regenerate IMPLEMENTATIONS.md registry (auto-record)
```

`runner.mjs` / `full-test.mjs` / `submission-e2e.test.mjs` / `generate-conformance.mjs` run in CI on
every push (`.github/workflows/vectors.yml`); `update-registry.mjs` runs post-merge on
`submissions/**` (`.github/workflows/record-runners.yml`).

## Level encoding (AV-01)

`request.level` / `authorized.level` are **numeric** (L0→0 … L5→5), because ERDL's `gt` does exact
rational comparison on numbers but lexicographic on strings (where `"L10" > "L9"` would fail). The
numeric encoding keeps the comparison precise and cross-implementation consistent.
