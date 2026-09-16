# ERDL Delegated-Authority Vectors — Independent Implementations

This registry records only what independent implementors have measured.
Inclusion implies no endorsement — only "who passed how many vectors on what date."

---

## Current vector set

- **Standard**: ERDL delegated-authority invariants (INV-01..INV-05), anchored on the ERDL expression engine (DESIGN.md §8a)
- **Vector files**: `vectors/stateless/*.json` + `vectors/snapshot/*.json` (14 vectors: AV-01..AV-14, aligned to the source conformance matrix)
- **Verifier**: `reference/runner.mjs` (reference implementation, evaluates via erdl-landing) + `reference/verify-submission.mjs` + `reference/update-registry.mjs` (auto-record, post-merge)
- **Answer file**: `answers.json` (`.gitignore`; never exposed to submitters)

## Registry

<!-- registry:auto-begin -->
| Implementor | Method | Result | Date | Artifact |
|------------|--------|:-------:|------|---------|
| **OpenOBA (reference)** | Node.js, @openoba/erdl engine | 14/14 | 2026-09-12 | [runner.mjs](reference/runner.mjs) |
| **ravindra-annam-python-independent** | Python 3 stdlib, spec-only independent expression-tree evaluator; no OpenOBA SDK/reference runner | 14/14 | 2026-09-15 | [rulsynor-multi-agent](https://github.com/RavindraAnnam/rulsynor-multi-agent) |
<!-- registry:auto-end -->

> Third-party runner submissions are auto-recorded here by `reference/update-registry.mjs`
> after CI cross-verification passes (post-merge); a failing submission is never recorded.

## Archive

Submissions for a previous vector set — not cross-verified against the current 14 vectors:

- **RavindraAnnam** — Python 3, spec-only (std lib only) — 3/8 (2026-09-10): the three pilot vectors (AV-01/04/06) cross-verified against the 3-pilot set; the set has since expanded (8 → 14). Artifact: [output.json](submissions/archive/ravindra-annam-python-independent-output.json)

## Snapshot vs stateful boundary

For AV-05, AV-08, AV-10, AV-13 and AV-14, the current suite proves that the engine reaches the correct decision **given materialized state** — it should not be described as proving cross-request revocation propagation or event-history retention.

The progression is, and remains:

1. **snapshot decision conformance** → 2. **explicit authority/revocation state** → 3. **controlled transitions** → 4. **boundary-time lineage evaluation**

— a progression in what the suite *establishes*, not a change to the underlying invariants (INV-01..INV-05).

> Third-party runner submission guide: [submissions/README.md](submissions/README.md). After CI cross-verification passes, merges auto-record into the table above.

## Principles

- **Measurements, not endorsements**: the registry records facts only.
- **No answers file**: the answer oracle is `.gitignore`d and never exposed to submitters.
- **The legal baseline is the honesty sentinel**: a deny-all implementation passes the negative canaries but fails the legal scenarios.
