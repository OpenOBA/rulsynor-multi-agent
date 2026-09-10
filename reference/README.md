# Delegated-Authority Property Vectors — ERDL-Anchored Reference

The reference implementation for the **delegated-authority property vector set**.

Status: **3-pilot vector set** (AV-01 / AV-04 / AV-06), one per structural invariant.
Profile: `stateless` (no revocation/freshness state — those are AV-05/AV-10, a later stateful profile).

## The load-bearing principle (DESIGN.md §8a)

The verdict for each vector is **produced by the ERDL expression engine** (`erdl-landing`), not by
a hand-written authority state machine. Each vector carries an ERDL rule (its `when` condition is
the constraint comparison, its `then` action is the conforming decision) plus an attack context
and a legal context; `Evaluator.evaluate(rule, context)` emits the decision, and the matched rule
id encodes the invariant. A vector that does not exercise ERDL rule evaluation proves nothing
about ERDL.

## The three vectors — one per structural invariant

| Vector | Invariant | ERDL rule (`when → then`) | First invalid boundary |
|---|---|---|---|
| **AV-01** Direct Amplification | INV-01 | `gt(request.level, authorized.level) → DENY` | `A→B` |
| **AV-04** Downstream Constraint Removal | INV-03 | `gt(downstream.amount, inherited.amount) → DENY` | `B→C` |
| **AV-06** Capability-Boundary Laundering | INV-05 | `ne(request.action, authorized.action) → DENY` | `T→R` |

Each vector also carries a **legal** context (a non-violating baseline) so the rule is proven to be
a detector, not an indiscriminate DENY.

## Conformance: what an independent runner must agree on

A runner conforms to a vector **iff** its output matches all three of:

```
decision               ∈ { DENY, ALLOW }
matched_invariant      ∈ { INV-01, INV-02, INV-03, INV-04, INV-05 }
first_invalid_boundary   (the first hop where the authority transition became invalid)
```

`reason` (free text) is **non-normative** — it is not compared.

## How to run an independent runner against this set

1. Read `vectors/scenario-schema.json` for the vector shape.
2. Read each `vectors/stateless/*.json` vector (rule + attack + legal + expected).
3. Independently implement the **ERDL rule-evaluation contract** (as norviq-go / concordia-python
   independently implement the Decision Object contract): evaluate the rule over the contexts and
   emit `{ decision, matched_invariant, first_invalid_boundary }`.
4. Compare against `expected` — only the three conformance fields, never `reason`.

A runner that reimplements EA folding from scratch without evaluating ERDL rules is a parallel
system, not an ERDL-conforming one.

## Run the reference locally

```bash
node reference/runner.mjs                    # ERDL-engine verdict over the 3 vectors (expect 3 passed)
node reference/discriminability.test.mjs      # deny-all / allow-all / wrong-attribution (expect 5 passed)
```

Both run in CI on every push (`.github/workflows/vectors.yml`).

## Level encoding (AV-01)

`request.level` / `authorized.level` are **numeric** (L0→0 … L5→5), because ERDL's `gt` does exact
rational comparison on numbers but lexicographic on strings (where `"L10" > "L9"` would fail). The
numeric encoding keeps the comparison precise and cross-implementation consistent.

## Out of scope here

INV-04 revocation/freshness — the two stateful vectors (AV-05 / AV-10), landed as a separate
`stateful` profile second. The organization layer (EA folding across multiple hops,
`authorization_basis` resolution, revocation propagation) prepares the context for those later
multi-hop vectors; the expression layer remains the sole decision authority.
