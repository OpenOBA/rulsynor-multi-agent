# Changelog

All notable changes to this repository are documented here.
This is a co-review repository — the delegated-authority design and conformance vectors are
reviewed against the ERDL language specification (`erdl-language-spec-v2.2.md` / `.en.md`).

## 2026-09-16

### Added
- **SPEC §6b.4 basis-scoped revocation (multi-root composition)** — a subject's effective authority is the union over its currently-valid authorization bases; `revoke(basis-X)` removes exactly basis-X's derivable authority (no less — full transitive closure; no more — other bases' contribution survives); MUST NOT reduce a subject's authority to a global per-subject revoked/authorized bit (forbids over-/under-revocation); a surviving basis MUST NOT preserve authority unique to a revoked lineage; refines INV-04's "downstream subtree" to be basis-relative. Glossary adds `authorization basis`. (Annam finding 4, issue #4.)

### Changed
- **DESIGN.md** — gap table adds `INV-04 basis-scoped revocation (multi-root composition)` (✅ landed — SPEC §6b.4).

## 2026-09-15

### Added
- **SPEC §6a.9 latest-authoritative-head freshness (anti-rollback)** — replay verification proves integrity/provenance, not freshness; the enforcement/recovery boundary MUST establish the latest authoritative head (not superseded) or fail closed. Adversarial V-STATE case: `authorized@N/HN → revoke@N+1/HN+1 → restore historical prefix → replay succeeds → reject effect`. (Annam finding 2, issue #2.)
- **SPEC §6 decision-type design rationale** — 13 decision types exist to maximize LLM value in the AI era, not simply allow/deny; five groups.

### Changed
- **DESIGN.md** — gap table adds `INV-04 anti-rollback freshness (latest authoritative head)` (✅ landed — SPEC §6a.9); Q7 gains an anti-rollback paragraph extending freshness to the state-chain level.

## 2026-09-14

### Added
- **SPEC §6a.8 enforcement-boundary check/act atomicity** — the boundary re-validates `{state_version, transitions_head}` or closes the synchronous boundary before committing a security-sensitive side effect. (Annam finding 1.)
- **DESIGN.md** — gap table marks `INV-04 check/act atomicity (TOCTOU)` ✅ landed — SPEC §6a.8.

### Changed
- **SPEC chapter split** — §5.2/§5.3/§5.4/§5.5/§6a.2/§6a.5/§6a.7/§8.2a/§10.2/§10.3 split into numbered subsections; §7.3 subsections renumbered to letter labels (a)–(g). Synced from the authority source (erdl-landing).
- **Chore** — gitignore pre-research docs.

## 2026-09-13

### Added
- **ERDL language spec v2.2** (state blocks + transitions) added for co-review, bilingual (`erdl-language-spec-v2.2.md` / `.en.md`).

## 2026-09-12

### Added
- **AV-09…AV-13 conformance vectors**; AV-08 re-scoped to sequence replay.
- **Four-state authority loop** closed with AV-14 unavailable state.
- **Registry auto-record** pipeline; conformance report regenerated for 13 vectors.

### Changed
- README vector count and AV-08 rename (8 → 13 vectors).

## 2026-09-11

### Added
- **Conformance vectors AV-01…AV-08** (delegated-authority invariants).
- **Independent runner recorded in the registry**.

## 2026-09-10

### Added
- **Reference runner + verifier + conformance report**.
- **ERDL-anchored 3-pilot vectors + scenario schema**.
- **Independent Python runner for delegated-authority pilot** (PR #1, RavindraAnnam).
- **Submission pipeline + registry + CI**.

### Changed
- Delegated-authority conformance anchored on the ERDL engine.

## 2026-09-09

### Changed
- **Delegated-authority design revised** — authority-basis model, scope boundary, freshness, 12 vectors.

## 2026-09-08

### Added
- Initial delegated-authority design for co-review.
