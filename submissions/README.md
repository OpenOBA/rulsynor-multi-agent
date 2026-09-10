# Third-Party Runner Submission Guide — Delegated-Authority Vectors

> Cross-implementation verification for ERDL delegated-authority conformance.

## What This Is

This directory is the public verification pipeline for the delegated-authority property vectors.
Any developer — in any language — can independently implement the ERDL rule-evaluation contract
and submit their output here to prove cross-implementation consistency.

**It does not matter what language or framework you use.** If your engine evaluates each vector's
ERDL rule and converges on the same attribution, it is ERDL-conforming.

## The load-bearing contract (DESIGN.md §8a)

The verdict for each vector is produced by the **ERDL expression engine**: each vector carries an
ERDL rule (its `when` condition is the constraint comparison, its `then` action is the conforming
decision) plus an `attack` context (violating) and a `legal` context (non-violating). A conforming
runner independently implements that ERDL rule-evaluation contract — it does **not** reimplement a
parallel authority state machine.

## Prerequisites

1. Read `vectors/scenario-schema.json` for the vector shape.
2. Read each `vectors/stateless/*.json` vector (rule + attack + legal + violation_hop).
3. Independently implement the ERDL rule-evaluation contract — the expression-tree comparison
   operators (`gt`/`ne` over fields), not by importing `@openoba/erdl`.

## Submission Format

Place a single JSON file in this directory:

```
submissions/<your-runner-name>-output.json
```

It records your verdict per vector id — the conformance fields:

```json
{
  "runner": "my-runner",
  "method": "Python, spec-only, self-built expression-tree evaluator",
  "date": "2026-09-10",
  "artifact": "https://github.com/<you>/<runner-repo>",
  "results": {
    "AV-06": {
      "decision": "DENY",
      "matched_invariant": "INV-05",
      "first_invalid_boundary": "T→R",
      "requested_action": "write(Resource-R)",
      "effective_authority": "read(Resource-R)",
      "reason": "CAPABILITY_BOUNDARY_AUTHORITY_AMPLIFICATION"
    }
  }
}
```

## What Gets Verified

| Field | Origin | Verified against |
|-------|--------|------------------|
| `decision` | engine-derived | answer oracle (gitignored) |
| `matched_invariant` | engine-derived | answer oracle (gitignored) |
| `first_invalid_boundary` | attribution | vector `attribution.violation_hop` |
| `requested_action` | attribution | vector `attribution.requested_action` |
| `effective_authority` | attribution | vector `attribution.effective_authority` |
| `reason` | attribution | **not compared** (non-normative free text) |

## How to Submit

1. **Fork** `https://github.com/OpenOBA/rulsynor-multi-agent`.
2. **Independently implement** the ERDL rule-evaluation contract (expression-tree `gt`/`ne`
   over fields) from the spec + schema — no SDK.
3. **Evaluate** your engine over each vector's `attack` context.
4. **Record** the result as `submissions/<your-runner-name>-output.json`.
5. **Open a Pull Request** — CI cross-verifies against the answer oracle (gitignored, never
   exposed); on merge, `IMPLEMENTATIONS.md` is auto-updated.

## Principles

- **Measurements, not endorsements**: the registry records "who passed how many on what date".
- **No answers file**: the answer oracle (`answers.json`) is `.gitignore`d and never exposed.
  Conformance is defined by the ERDL rule-evaluation contract, not by matching a leaked answer.
- **The legal baseline is the honesty sentinel**: a runner that always returns DENY passes every
  negative canary but fails the `legal` contexts — the reference verifier checks both.

> *"Neutrality is not declared — it is measured."*
