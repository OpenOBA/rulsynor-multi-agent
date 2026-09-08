# Multi-Agent Delegated-Authority — Design Document for Co-Review

> **Author:** OpenOBA (Rulsynor)
> **Status:** design draft for co-review
> **Date:** 2026-09-08
> **Source:** [Ravindra Annam, *Delegated Authority Security Invariants and Adversarial Conformance Vectors for Multi-Agent Systems*, v0.2](https://github.com/RavindraAnnam/agentic-ai-runtime-security-raai/blob/main/a2a/delegated-authority-security-invariants.md)

---

## 0. Positioning (read first)

Two clarifications shape everything below.

**Layering.** Multi-agent governance is a *Rulsynor* concern, not an ERDL concern. ERDL is the
expression/decision layer (deterministic `when→then` evaluation, the `DELEGATE` decision type,
the Decision Object audit format). Multi-agent delegation authority is an *organization layer*
that consumes ERDL primitives and adds a new authority state. They share one audit discipline but
are distinct layers.

**What vs. how.** The source note is deliberately implementation-neutral — it defines *security
properties*, not mechanisms. That maps onto our split: the invariants and vectors are the *what*
(spec level), the authority state machine is the *how* (engine level). This document commits to
the *what*; the *how* is our engine, which we keep separate.

---

## 1. Source document — structure and scope (faithful reading)

The source note has eleven sections. This design document responds to all of them:

| § | Source section | Our response |
|---|---|---|
| 1 | Problem statement (standing vs. effective authority) | §3 mapping |
| 2 | Authority model (`SA`, `EA`, `C`, `D`) | §3 mapping |
| 3 | Five invariants (INV-01…05) | §2 adoption |
| 4 | Enforcement boundary | §3 + §6 |
| 5 | Eight vectors (AV-01…08) | §2 adoption |
| 6 | Candidate conformance assertions (C-01…08) | §4 |
| 7 | Relationship to A2A | §4 |
| 8 | Eight co-review questions (Q1…Q8) | §7 |
| 9 | Conformance matrix | §5 |
| 10 | Verification method + attributable rejection | §8 |
| 11 | Conclusion (core principle) | §0 + §9 |

---

## 2. Adoption — invariants and vectors (faithful)

We adopt the five invariants and all eight vectors **as proposed by Ravindra Annam**, with
his names and definitions (faithfully summarized; full text in the source).

| Invariant | Definition (verbatim from source) |
|---|---|
| **INV-01** Authority Non-Amplification | `EA(B,T) ⊆ EA(A,T)`; standing privileges MUST NOT silently become task authority |
| **INV-02** Provenance & Temporal Continuity | reconstructible lineage; `DELEGATE < TASK_ACCEPT < AUTHORITY_EXERCISE` |
| **INV-03** Constraint Inheritance / Narrow-Only | inherit-by-default, narrow-only; no silent removal/broadening |
| **INV-04** Enforcement-Boundary Revocation | `Revoke(P→A) ⇒ Invalidate(unexercised A→B→C)`; boundary checks revocation state |
| **INV-05** Capability-Boundary Non-Amplification | `EA(Resource,T) ⊆ EA(Tool,T) ⊆ EA(Skill,T) ⊆ EA(Agent,T)` |

Vectors: **AV-01** direct amplification, **AV-02** transitive amplification, **AV-03** privileged
laundering, **AV-04** downstream constraint removal, **AV-05** revoked ancestor, **AV-06**
capability-boundary laundering, **AV-07** depth/loop violation, **AV-08** temporal replay.

Note on INV-01 scope: the source note places *Delegation Depth and Loop Safety* as a sub-property
of INV-01 (validated alongside effective-authority containment). We adopt that placement — depth
and loop safety are part of INV-01, not a sixth invariant.

---

## 3. Mapping your authority model onto Rulsynor primitives

| Your symbol | Meaning | Our primitive (in `rulsynor-spec-v2.0` §10) |
|---|---|---|
| `SA(A)` | standing authority | `trust_radius` (岗位权限: level L0–L5, `amount_limit`) in Agent Registry |
| `EA(A,T)` | effective task authority | the delegation's `constraints` payload (action/resource/purpose/value/temporal/autonomy limits) |
| `C(T)` | task constraints | the `constraints` block on a DELEGATE action (`deadline`, `max_autonomy`, `escalation_to`, …) |
| `D(T)` | delegation lineage | `delegation_chain_seq` + `genesis` + `parent_audit_id` + `execution_trace_id` |
| enforcement boundary | where a side effect is gated | the deterministic layer (Action Guard / tool-call guard) |

**Corrected claim (rigor).** Your core claim — "standing authority is not necessarily effective
task authority" (`SA(A) != EA(A,T)`) — is *structural* in our model: `trust_radius` is a standing
attribute of the agent; `constraints` are carried per-delegation and never merge with
`trust_radius`. **This structural separation is the precondition for INV-01, but it is not yet
INV-01 itself.** The actual non-amplification check — verifying that a delegation's `constraints`
never exceed the delegator's own effective authority (`EA(B,T) ⊆ EA(A,T)`) — is **not yet
enforced at delegation time**; it is a gap (see §6). We state this precisely to avoid
over-claiming: what exists is the *separation*, what is missing is the *containment check*.

---

## 4. Conformance assertions (C-01…C-08) and relationship to A2A

We adopt the source's eight conformance assertions as the normative test surface, verbatim:

- **C-01** A delegatee MUST NOT exercise task authority exceeding the delegator's effective authority for that task.
- **C-02** Effective authority MUST remain bounded across every hop of a delegation chain.
- **C-03** Applicable authorization constraints MUST propagate downstream unless explicitly narrowed.
- **C-04** A downstream component MUST NOT silently remove or weaken inherited authorization constraints.
- **C-05** Revocation MUST be evaluated at the relevant enforcement boundary before unexercised downstream authority derived solely from the revoked authorization is exercised.
- **C-06** Security-sensitive actions SHOULD retain sufficient provenance to reconstruct the originating principal, task/intent, authorization state, delegation path, executing agent, downstream capability, and affected resource.
- **C-07** Security-sensitive side effects MUST be protected by enforcement that evaluates whether the effective authority required for the action remains valid at the relevant enforcement boundary.
- **C-08** Selection of a more privileged agent, skill, tool, or API MUST NOT by itself increase the effective authority of the originating task.

**Relationship to A2A.** We agree with the source §7: these invariants *complement*, not
redefine, the A2A authorization model. A2A provides authentication, authorization, Agent Cards,
and Tasks; the invariants answer the narrower question of what must remain true *after*
authorization, as execution crosses delegation and capability boundaries. The realization sits
above A2A transport, in the Rulsynor organization layer.

---

## 5. Conformance matrix (adopted from source §9)

| Invariant | Primary vectors | Expected decision | Minimum verifiable evidence |
|---|---|---|---|
| INV-01 | AV-01, AV-02, AV-03, AV-07 | DENY | Effective-authority ceiling, delegation chain, depth/loop state |
| INV-02 | AV-02, AV-08 | DENY / RE-AUTHORIZE | Authority lineage, event ordering, authorization state |
| INV-03 | AV-04 | DENY | Inherited constraints + attempted downstream constraints |
| INV-04 | AV-05 | DENY | Revoked ancestor, derived authority lineage, boundary decision |
| INV-05 | AV-06 | DENY | Task authority, downstream capability, requested effect, boundary decision |

---

## 6. Gap analysis — what §10 already has vs. what is missing

| Requirement | Status in §10 | Gap + engineering feasibility |
|---|---|---|
| INV-01 containment check | ⚠️ structural separation exists, containment check absent | **feasible** — add a delegation-time check that `constraints ⊆ delegator's EA`; the primitives exist |
| INV-02 provenance | ✅ strong (`parent_audit_id`, `execution_trace_id`, cross-agent audit chain) | formalize as invariant |
| INV-02 temporal continuity | ⚠️ Phase-4 time-bias is *heuristic WARN*, not a MUST | **feasible** — elevate to attributable DENY on positive replay detection |
| INV-03 narrow-only | ⚠️ `constraints` exist, no narrowing check | **feasible** — compare inherited vs. downstream constraints |
| INV-04 enforcement-boundary revocation | ❌ H10 `Revoke` is single-hop; no propagation to unexercised derived authority | **largest gap** — needs revocation state + boundary check (shared, eventually-consistent state; same track as `within`/`rate` state) |
| INV-05 capability boundary | ❌ explicit TODO; Action Guard "block on breach" only | **feasible, medium** — formalize the axis; tool-call guard already gates |
| AV-07 depth/loop | ✅ `max_delegation_depth` + loop rejection exist | fold into INV-01 sub-property |
| AV-08 temporal replay | ❌ not defined | **feasible** — new vector + attributable rejection |
| Attributable rejection | ✅ Decision Object carries decision + reason; missing `matched_invariant`/`boundary` | **feasible** — two new DO fields |

**Engineering feasibility summary.** Four of the five invariants are *feasible with primitives
that already exist* (containment check, narrowing check, temporal ordering, attributable
rejection). The one substantive engineering item is **INV-04 revocation** — it requires a
distributed, eventually-consistent revocation state consulted at the enforcement boundary, which
is the same problem as the stateful-operator (`within`/`rate`) shared-state work already in
progress, so it lands on that track rather than a new one.

---

## 7. Answers to your co-review questions (Q1–Q8)

**Q1 — Effective Authority Representation.**
Minimum state = the DELEGATE Decision Object's constraint payload + lineage, hash-anchored.
`EA(A,T)` is the `constraints` block; `D(T)` is `delegation_chain_seq` + `genesis` +
`parent_audit_id`. The DO hash makes the envelope tamper-evident.

**Q2 — Standing Privilege vs. Delegated Authority.**
Standing authority (`trust_radius`) never becomes available to a delegated task implicitly. The
only way to widen effective authority is an *independent, explicit* re-authorization event — a new
DELEGATE/ASSIGN Decision Object with its own audit record. Anything less is AV-01/AV-03 → DENY.

**Q3 — Constraint Composition.**
Intersection / narrowing (your conservative default). The delegate's effective permission is the
meet of all inherited constraints. No union, no expansion.

**Q4 — Revocation Semantics (concrete mechanism).**
We adopt your §4 framing and commit to a concrete mechanism, not just the property.

*Mechanism — revocation as a tombstone on the authority lineage:*

1. **Revocation event.** A revocation is a Decision Object with decision type `REVOKE` (reusing
   `CANCEL`), recording `revokes` (the DELEGATE DO id it invalidates), `revoked_agent`, and
   `revoked_at` — hash-chained like any DO.
2. **Lineage walk at the boundary.** The enforcement boundary (Action Guard), before permitting a
   security-sensitive side effect, walks the authority lineage (`execution_trace_id` +
   `parent_audit_id` chain) from the acting agent up to the origin principal, checking each hop
   for a revocation tombstone.
3. **Subtree invalidation.** Because the walk spans the *full* lineage, a tombstone on any
   ancestor invalidates *all* authority derived from it — including unexercised downstream
   authority (A→B→C). This is `Revoke(P→A) ⇒ Invalidate(A→B→C)` achieved structurally, by
   checking the whole chain rather than only the immediate parent.
4. **Fail closed.** If the boundary cannot verify the current revocation state (disconnected or
   stale), it DENIES (Q6). This is where eventual consistency lives: the tombstone is recorded at
   the source and reaches boundaries eventually, but the boundary evaluates the freshest state it
   can access and fails closed.

*Why this is a design, not a deferral.* It reuses primitives we already have — `CANCEL`/`REVOKE`
as a DO type, `parent_audit_id`/`execution_trace_id` for the lineage, the Action Guard as the
boundary. The only genuinely open item is the *freshness policy* (propagation interval, cache
lifetime), which is the operational parameter your Q7 asks about — the mechanism itself is ours,
and it is designed here.

**Q5 — Capability Boundary (concrete mechanism).**
Verification must extend through Skill → Tool/API → Protected Resource, not terminate at the
receiving agent.

*Mechanism — the capability axis is a delegation chain with narrow-only at each boundary:*

1. **The task envelope travels with the call.** When an agent invokes a skill, it passes the
task's `constraints` (the `EA(A,T)` envelope) along; the skill passes the same (or narrower)
envelope to the tool; the tool passes it to the resource.
2. **Narrow-only at each transition.** Each capability boundary (agent→skill, skill→tool,
tool→resource) checks that the requested action ⊆ the inherited envelope — the same narrow-only
rule as INV-03, applied to the capability axis.
3. **Standing capability is not task authority.** A tool's *technical* ability to perform an
action (its credential capability) is NOT automatically available; only what the inherited task
envelope authorizes is. This is the `Credential Capability ≠ Authorized Task Authority`
distinction, enforced by checking the envelope, not the tool's standing permissions.

*Why this is concrete.* Our tool-call guard already gates at the tool boundary; the mechanism
formalizes that gate as a chain of narrow-only checks carrying the task envelope, so
`EA(Resource,T) ⊆ EA(Tool,T) ⊆ EA(Skill,T) ⊆ EA(Agent,T)` holds structurally.

**Q6 — Unavailable Authority State.**
Fail closed for security-sensitive side effects: if current authority or revocation state cannot
be established, DENY. Consistent with the deterministic-layer posture.

**Q7 — Revocation Freshness.**
No strong synchronous guarantee across disconnected agents. The normative property is *evaluation
at the boundary* against the freshest available revocation state; the freshness mechanism stays
implementation-defined (your §4). Same distributed-state problem as Q4.

**Q8 — Capability Boundary Semantics.**
A *distinct capability-boundary relationship* with equivalent non-amplification semantics, not
another delegation axis. INV-05 is its own invariant because the failure mode (credential
capability ≠ authorized task authority) differs in kind from agent→agent amplification.

---

## 8. Verification method + attributable rejection

We adopt the source §10 method: for each vector, (1) construct a valid baseline authorization and
delegation chain, (2) introduce exactly one controlled violation, (3) request the protected
action, (4) require deterministic rejection, (5) record the violated invariant and provenance,
(6) confirm the unauthorized side effect did not occur.

**Attributable rejection.** Rejection alone is insufficient. A conforming decision MUST carry the
matched invariant, the boundary, and a deterministic reason — which our Decision Object already
supports; the only new work is adding `matched_invariant` and `boundary` fields. Indiscriminate
deny-all is not conformance.

---

## 9. Integration plan + engineering feasibility

1. Land the invariants + vectors + conformance assertions as a normative section in
   `rulsynor-spec-v2.0` §10 (cross-cutting the existing H1–H10 / V1–V12 action structure).
2. Add `matched_invariant` + `boundary` to the Decision Object (attributable rejection).
3. Close the two real gaps: INV-04 revocation (mechanism designed in §7 Q4 — tombstone + lineage
   walk + fail closed; the remaining work is the freshness/state substrate, on the shared-state
   track) and INV-05 capability-boundary formalization.
4. Emit AV-01…AV-08 as a named conformance vector family — a *new vector format* (property
   vectors, distinct from the existing byte-identity Decision Object vectors), independently
   runnable — and we would welcome your independent run of them, the way the Decision Object
   vectors were verified by independent implementations (e.g. Erik Newton's byte-identical checks).

**Open items for your read:** (a) whether INV-02's temporal ordering should be a MUST (we lean
yes, with attributable rejection on positive replay detection, keeping Phase-4 WARN for
*unverified* ordering); (b) your comfort with revocation freshness being eventually-consistent +
boundary-check (Q7), given our current single deterministic boundary.

---

## 10. Our audit of the vector suite (co-review findings)

The eight vectors are a strong adversarial set, but a rigorous review surfaces one scientific
issue, one completeness gap, one suite-level gap, and several precision notes. We raise these as
peer-review findings, each with a proposed resolution — co-review goes both ways.

### Finding 1 — AV-08's expected result is non-deterministic (scientific)

AV-08 specifies "Expected Result: DENY / RE-AUTHORIZE", which is non-deterministic and
contradicts the §10 methodology's "require deterministic rejection." The deeper issue: wall-clock
replay detection presumes a trusted clock, which our model deliberately does not have (E9 forbids
reading the wall clock; cross-agent time bias is a heuristic WARN, not a proof).

**Proposed resolution.** Re-scope AV-08 from "wall-clock replay" to "sequence replay": a replayed
delegation DO carries an already-consumed `chain_seq`, which the audit chain's Phase-1 continuity
check detects deterministically — no trusted clock required. This makes AV-08 deterministic and
feasible, and it composes with the lineage walk already used for AV-05.

### Finding 2 — AV-05 is missing its dual (completeness)

AV-05 tests "unexercised authority → revoked → DENY", but INV-04 explicitly states it does "not
imply reversal of actions that have already legitimately completed." The suite never exercises the
*completed* boundary: a conforming implementation must distinguish "completed (allowed)" from
"unexercised (revoked)", and AV-05 alone cannot tell a correct implementation from one that
over-revokes.

**Proposed resolution.** Add a companion case asserting a *completed* action is NOT reversed after
revocation (ALLOW), so the "no reversal" boundary is exercised rather than merely asserted.

### Finding 3 — the suite lacks positive vectors (suite-level gap)

All eight vectors are negative (DENY). An implementation that indiscriminately denies everything
passes all eight. §10's attributable-rejection requirement mitigates but does not close this: the
suite structurally lacks positive baselines.

**Proposed resolution.** Add positive vectors alongside the negative ones:
- a valid delegation within authority → ALLOW;
- a valid narrowing (e.g. amount $500 → $250) → ALLOW;
- a valid re-authorization (explicit new authorization) → ALLOW.

### Finding 4 — precision notes (minor)

- **AV-02** ("transitive amplification") is named for growth the setup does not contain: L2→L2→L2
  has no growth; the vector actually tests standing-authority isolation at depth 3. Suggest
  renaming to "standing-authority isolation across a multi-hop chain."
- **AV-03** (laundering) is structurally a special case of AV-01 (delegatee's standing authority
  vs. the delegated task). It is retained as a named canary for a real attack pattern, but the
  redundancy is worth stating.
- **AV-04** exercises only the amount dimension; narrow-only is multi-dimensional (resource,
  purpose, temporal). It is a representative single-dimension test, not exhaustive.
- **AV-06** is sound but the most expensive to implement (full capability chain); a note, not a
  finding.
