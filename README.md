# Rulsynor Multi-Agent

> Foundation repository for Rulsynor multi-agent (Team / Cluster) governance. All multi-agent
governance work — delegated authority, capability boundary, revocation propagation, cross-agent
audit — lives here.

---

## Current artifact: Delegated Authority — Security Invariants

> Status: **draft for technical co-review** — not a released specification.
> Scope: runtime security properties for delegated authority across
> `Principal → Agent → Agent → Skill → Tool/API → Protected Resource`.

---

## What this is

This repository holds a candidate security model for **delegated authority in multi-agent
systems**: five runtime invariants and fourteen adversarial conformance vectors that bound effective
authority throughout a multi-hop execution chain.

The invariants were **proposed by Ravindra Annam** ("Delegated Authority Security Invariants and
Adversarial Conformance Vectors for Multi-Agent Systems," v0.2) and are developed here in
co-review with OpenOBA, which is mapping them onto the Rulsynor delegation model (ERDL expression
layer + multi-agent organization layer).

The proposal is **implementation-neutral**: it defines security *properties*, not a specific
policy engine, token format, or enforcement mechanism.

## The five invariants

| Invariant | Property |
|---|---|
| **INV-01** | Authority Non-Amplification — `EA(B,T) ⊆ EA(A,T)` |
| **INV-02** | Authority Provenance and Temporal Continuity |
| **INV-03** | Constraint Inheritance / Narrow-Only Delegation |
| **INV-04** | Enforcement-Boundary Revocation |
| **INV-05** | Capability-Boundary Non-Amplification |

## The fourteen adversarial conformance vectors

`AV-01` direct amplification · `AV-02` transitive amplification · `AV-03` privileged delegate
laundering · `AV-04` downstream constraint removal · `AV-05` revoked ancestor · `AV-06`
capability-boundary laundering · `AV-07` delegation depth/loop violation · `AV-08` sequence
replay · `AV-09` aggregation amplification · `AV-10` stale-negative revocation · `AV-11`
rogue-agent creation · `AV-12` identity impersonation · `AV-13` completed-action no-reversal ·
`AV-14` unavailable authority state.

## Documents

- [`erdl-language-spec-v2.2.md`](erdl-language-spec-v2.2.md) / [`.en.md`](erdl-language-spec-v2.2.en.md) — the ERDL language specification; §6a (single-instance state FSM) and §6b (delegated-authority security model: INV-01~05, revocation freshness, basis-scoped revocation) carry the normative semantics of the invariants.
- [`DESIGN.md`](DESIGN.md) — design document mapping the invariants onto Rulsynor primitives,
  answering the co-review questions, and stating where the property is already enforced versus
  where a gap remains.
- [`conformance/CONFORMANCE.md`](conformance/CONFORMANCE.md) — per-vector attribution table (auto-generated).

## Status and process

This is a co-review draft. The invariants and vectors remain open for refinement; conformance
vectors are intended to be independently runnable by any third party.

## License

To be determined (pending alignment between the co-authors).

## Acknowledgments

- **Ravindra Annam** — author of the delegated-authority security invariants and adversarial
  conformance vectors this repository formalizes.
