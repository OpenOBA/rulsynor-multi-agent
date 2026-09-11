# ERDL Delegated-Authority Vectors — Independent Implementations

This registry records only what independent implementors have measured.
Inclusion implies no endorsement — only "who passed how many vectors on what date."

---

## Current vector set

- **Standard**: ERDL delegated-authority invariants (INV-01..INV-05), anchored on the ERDL expression engine (DESIGN.md §8a)
- **Vector files**: `vectors/stateless/*.json` + `vectors/snapshot/*.json` (8 vectors: AV-01..AV-08, aligned to Annam's conformance matrix)
- **Verifier**: `reference/runner.mjs` (reference implementation, evaluates via erdl-landing) + `reference/verify-submission.mjs`
- **Answer file**: `answers.json` (`.gitignore`; never exposed to submitters)

## Registry

<!-- registry:auto-begin -->
| Implementor | Method | Result | Date | Artifact |
|------------|--------|:-------:|------|---------|
| **OpenOBA (reference)** | Node.js, @openoba/erdl engine | 8/8 | 2026-09-11 | [runner.mjs](reference/runner.mjs) |
<!-- registry:auto-end -->

> Third-party runner submission guide: [submissions/README.md](submissions/README.md). After CI cross-verification passes, merges auto-record into the table above.

## Principles

- **Measurements, not endorsements**: the registry records facts only.
- **No answers file**: the answer oracle is `.gitignore`d and never exposed to submitters.
- **The legal baseline is the honesty sentinel**: a deny-all implementation passes the negative canaries but fails the legal scenarios.
