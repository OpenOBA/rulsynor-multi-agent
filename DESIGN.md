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

**Scope boundary.** This document covers one slice of the RAAI runtime-security model — the
*Authorize* pillar's delegated-authority problem across multi-agent delegation and capability
boundaries. Adjacent threats belong to other pillars or layers and are out of scope here, each
with its own owning mechanism:

- **Prompt injection / context & memory poisoning** → ERDL's SafeExpr closed kernel (no eval, no
  injection surface) and Rulsynor memory governance — the *Reason/Assess* pillars.
- **Data exfiltration / sensitive-prompt leakage** → output inspection / DLP — the *Inspect* pillar.
- **Agent impersonation / credential theft** → agent identity (A2A authentication + workload
  identity) — partially in scope here as *identity binding* (see §2 refinement 8); the
  cryptographic issuance itself is an identity-layer concern.

We state this boundary to avoid over-claiming: what follows secures *delegated authority*, not the
entire agentic runtime.

**Two standing assumptions (stated, not hidden).** Two security properties are assumed as
infrastructure, not proven here, and every mechanism below depends on them:

1. **Boundary mediation** — every security-sensitive side effect passes through the enforcement
   boundary (Action Guard / tool-call guard). If a downstream component bypasses the boundary and
   acts on its own standing credential, the authority model cannot see or stop it.
2. **Root-anchor integrity** — the Agent Registry (the boundary's local trust anchor for root
   grants) is itself tamper-evident and correctly configured. If the anchor is corrupted, every
   authority lineage rooted in it is unsound.

---

## 1. Source document — structure and scope (faithful reading)

The source note has eleven sections. This design document responds to all of them:

| § | Source section | Our response |
|---|---|---|
| 1 | Problem statement (standing vs. effective authority) | §3 mapping |
| 2 | Authority model (`SA`, `EA`, `C`, `D`) | §3 mapping |
| 3 | Five invariants (INV-01…05) | §2 adoption |
| 4 | Enforcement boundary | §3 + §6 |
| 5 | Fourteen vectors (AV-01…14) | §2 adoption |
| 6 | Candidate conformance assertions (C-01…08) | §4 |
| 7 | Relationship to A2A | §4 |
| 8 | Eight co-review questions (Q1…Q8) | §7 |
| 9 | Conformance matrix | §5 |
| 10 | Verification method + attributable rejection | §8 |
| 11 | Conclusion (core principle) | §0 + §9 |

---

## 2. Adoption — invariants and vectors (faithful)

We adopt the five invariants and the fourteen vectors (AV-01…14) — the eight originals **as proposed by Ravindra Annam**, plus six additions from our own co-review (AV-09…12 + the AV-13 completed-action dual + AV-14 unavailable state), with
his names and definitions (faithfully summarized; full text in the source).

| Invariant | Definition (verbatim from source) |
|---|---|
| **INV-01** Authority Non-Amplification | `EA(B,T) ⊆ EA(A,T)`; standing privileges MUST NOT silently become task authority |
| **INV-02** Provenance & Temporal Continuity | reconstructible lineage; `DELEGATE < TASK_ACCEPT < AUTHORITY_EXERCISE` |
| **INV-03** Constraint Inheritance / Narrow-Only | inherit-by-default, narrow-only; no silent removal/broadening |
| **INV-04** Enforcement-Boundary Revocation | `Revoke(P→A) ⇒ Invalidate(unexercised A→B→C)`; boundary checks revocation state |
| **INV-05** Capability-Boundary Non-Amplification | `EA(Resource,T) ⊆ EA(Tool,T) ⊆ EA(Skill,T) ⊆ EA(Agent,T)` |

**Refinements adopted after co-review round 2.** Your round-2 co-review surfaced two corrections,
and our own audit of the corrected model surfaced several more. We adopt all of them here:

1. **Authorization basis vs. constraints (INV-01).** Constraints narrow authority; they never
   *create* it — constraints alone must never manufacture authority. `EA(A,T)` is derived as
   `Auth(A,T) ∩ C1 ∩ … ∩ Cn`; a constraints block that appears in a valid DO does not by itself
   grant the authority it names (see §3).
2. **Freshness is normative, not implementation-defined (INV-04).** A boundary MUST NOT treat the
   absence of a visible revocation as proof that authority remains valid; if it cannot establish
   a required freshness condition, it MUST fail closed (see §7 Q7).
3. **No new authorization root at a capability boundary (INV-05).** Selecting a more privileged
   downstream skill/tool/resource MUST NOT create a new authorization root; broader authority
   must originate from an independently verified authorization event in the provenance (your
   INV-05 wording, which our first mapping had flattened).
4. **Aggregation non-amplification (INV-01, numeric dimension).** A numeric constraint (`amount`)
   is a *shared cumulative budget* bound to the origin authorization, not a per-delegation
   allowance; multiple narrow delegations must not sum past the origin's limit (see §6).
5. **Fail-closed execution atomicity (INV-04).** The authority check and the gated side effect
   occur in the same synchronous boundary, so no revocation can land between check and act (see §6).
6. **Task-scoped credential, not standing credential (INV-05).** At a tool/resource boundary, the
   side effect executes under the task envelope's authority, never the component's standing
   credential (see §7 Q5 and §6).
7. **Delegation authority is itself authorized (INV-01, delegation-depth control).** A DELEGATE
   action is a privilege, not a default. The authorization basis carries a `delegatable` flag (or
   a delegation-depth bound); an agent may issue a DELEGATE only if its own basis grants it. This
   closes the "rogue-agent creation" path — a compromised agent cannot mint a new delegate unless
   its own authority was delegatable.
8. **Identity binding, not name binding (INV-02, provenance).** The authorization basis binds the
   delegatee's *cryptographic identity* (public key / workload identity), not an agent-ID string.
   Enforcement verifies the executing agent's identity against the bound identity before honoring
   the authority. This closes the "agent impersonation" path — a rogue agent cannot receive
   authority by claiming a trusted agent's name.

Vectors: **AV-01** direct amplification, **AV-02** transitive amplification, **AV-03** privileged
laundering, **AV-04** downstream constraint removal, **AV-05** revoked ancestor, **AV-06**
capability-boundary laundering, **AV-07** depth/loop violation, **AV-08** sequence replay
(re-scoped from wall-clock replay, see §10 Finding 1), **AV-09** aggregation amplification,
**AV-10** stale-negative revocation (freshness), **AV-11** rogue-agent creation, **AV-12** identity
impersonation, **AV-13** completed-action no-reversal (AV-05's dual), **AV-14** unavailable
authority state (Q6, fail-closed on absent state).

**The four authority-state failure modes (closed loop).** The source's revocation semantics
(INV-04) and provenance semantics (INV-02), read together, name four failure modes an authority
state can take — each MUST fail closed and never become an authorization path through evaluation
fallback. All four are now exercised as negative vectors:

| Failure mode | Vector | Rule |
|---|---|---|
| **invalid** (authority already revoked) | AV-05 | `request_t > revocation_t → DENY` |
| **stale** (state present but behind) | AV-10 | `boundary.epoch < revocation.epoch → DENY` |
| **non-verifiable** (identity not bound) | AV-12 | `executor.identity ≠ bound.identity → DENY` |
| **unavailable** (state absent) | AV-14 | `not_exists(revocation.epoch) → DENY` |

This closes the loop: a boundary that cannot establish, or is behind, or cannot verify, or no
longer holds the authority state it needs, fails closed to DENY — never ALLOW.

Note on INV-01 scope: the source note places *Delegation Depth and Loop Safety* as a sub-property
of INV-01 (validated alongside effective-authority containment). We adopt that placement — depth
and loop safety are part of INV-01, not a sixth invariant.

---

## 3. Mapping your authority model onto Rulsynor primitives

| Your symbol | Meaning | Our primitive (in `rulsynor-spec-v2.0` §10) |
|---|---|---|
| `SA(A)` | standing authority | `trust_radius` (role-scoped permission: level L0–L5, `amount_limit`) in Agent Registry |
| `Auth(A,T)` | **authorization basis** — where the task's authority *comes from* | a root grant (an Agent Registry `trust_radius` anchor the boundary trusts locally) or an independently verified re-authorization DELEGATE/ASSIGN DO; binds the principal's *cryptographic identity* and carries a `delegatable` flag |
| `C(T)` | task constraints — how authority is *narrowed* | the `constraints` block on a DELEGATE action (`deadline`, `max_autonomy`, `escalation_to`, …) |
| `EA(A,T)` | effective task authority — the *derived result* | **derived, never stored**: `Auth(A,T) ∩ C1 ∩ … ∩ Cn` folded over the delegation chain |
| `D(T)` | delegation lineage | `delegation_chain_seq` + `genesis` + `parent_audit_id` + `execution_trace_id` |
| enforcement boundary | where a side effect is gated | the deterministic layer (Action Guard / tool-call guard) |

**Three distinct concepts (correction of our earlier mapping).** Effective authority is not a
stored field, and it is not equal to the constraints payload. It is the *result* of folding a
set of constraints over an authorization basis. The three concepts must stay distinct:

- **Authorization basis (`Auth`)** — where authority comes from: a root grant or an independently
  verified re-authorization event. Constraints cannot *create* authority; they can only narrow it.
  A downstream delegation carrying `{action: delete, resource: *}` does not grant delete authority
  — it can only narrow whatever basis already authorized.
- **Constraints (`C`)** — how authority is narrowed at each delegation hop.
- **Effective authority (`EA`)** — the derived meet: `EA(A,T) = Auth(A,T) ∩ C1 ∩ … ∩ Cn`.

This corrects our earlier §3, which mapped `EA(A,T)` onto "the constraints payload" — flattening
the narrowing mechanism into the source of authority, so a downstream `constraints` block could
manufacture authority merely by appearing in a valid DO. The recursive form
`EA(child,T) = EA(parent,T) ∩ delegated_constraints` is the correct one, with `Auth(A,T)` as its
base case.

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
| INV-01 | AV-01, AV-02, AV-03, AV-07, AV-09, AV-11 | DENY | Effective-authority ceiling, delegation chain, depth/loop state, cumulative budget |
| INV-02 | AV-02, AV-08, AV-12 | DENY / RE-AUTHORIZE | Authority lineage, event ordering, authorization state, identity binding |
| INV-03 | AV-04 | DENY | Inherited constraints + attempted downstream constraints |
| INV-04 | AV-05, AV-10, AV-13 | DENY | Revoked ancestor, derived authority lineage, boundary decision, freshness epoch, completed-action no-reversal |
| INV-05 | AV-06 (primary; supporting INV-01/02/03) | DENY | Task authority, downstream capability, requested effect, boundary decision |

---

## 6. Gap analysis — what §10 already has vs. what is missing

| Requirement | Status in §10 | Gap + engineering feasibility |
|---|---|---|
| Authorization basis (`Auth`) | ❌ absent — §3 had flattened EA onto constraints | **largest conceptual gap** — add an `authorization_basis` reference (root grant or re-authorization DO id) as the base of the EA derivation; all other gaps hang off this one |
| INV-01 containment check | ⚠️ structural separation exists, containment check absent | **feasible** — add a delegation-time check that `constraints ⊆ delegator's EA`; the primitives exist |
| INV-01 aggregation (numeric) | ❌ not defined | **feasible** — bind `amount` to a shared cumulative budget on the origin authorization; reuse the `within`/`rate` state operator |
| INV-02 provenance | ✅ strong (`parent_audit_id`, `execution_trace_id`, cross-agent audit chain) | formalize as invariant |
| INV-02 temporal continuity | ⚠️ Phase-4 time-bias is *heuristic WARN*, not a MUST | **feasible** — elevate to attributable DENY on positive replay detection |
| INV-02 renew = re-authorization | ❌ renew unaddressed | **feasible** — a renewal widens the temporal window; it must pass the same basis verification as re-authorization |
| INV-03 narrow-only | ⚠️ `constraints` exist, no narrowing check | **feasible** — compare inherited vs. downstream constraints |
| INV-04 enforcement-boundary revocation | ❌ H10 `Revoke` is single-hop; no propagation to unexercised derived authority | **largest gap** — needs revocation state + boundary check (shared, eventually-consistent state; same track as `within`/`rate` state) |
| INV-04 freshness (normative) | ❌ freshness was implementation-defined | **feasible** — promote to normative: absence ≠ proof; monotonic authority epoch; fail closed (see §7 Q7) |
| INV-04 check/act atomicity (TOCTOU) | ⚠️ implicit in synchronous boundary, unstated | **feasible** — state that the authority check and the gated side effect share one synchronous boundary |
| INV-04 tombstone ↔ re-grant | ❌ re-grant semantics undefined | **feasible** — tombstone matches the exact `revokes` DO id; a re-grant is a new id/new basis, not a resurrection |
| INV-05 capability boundary | ❌ explicit TODO; Action Guard "block on breach" only | **feasible, medium** — formalize the axis; tool-call guard already gates |
| INV-05 task-scoped credential | ❌ not stated | **feasible** — boundary enforces that the side effect runs under the task envelope, not the tool's standing credential (boundary-mediation caveat) |
| Purpose constraint (audit vs enforcement) | ❌ purpose treated as enforceable | **layering** — purpose is semantic and non-decidable; keep it audit-layer (DO provenance), and require an explicit structural mapping (action/resource) if it must be enforced |
| Delegation authority (who may DELEGATE) | ❌ not stated | **feasible** — add a `delegatable` flag on the basis; DELEGATE validates the issuer's delegatability |
| Identity binding (impersonation) | ❌ not stated | **feasible** — bind the basis to a cryptographic identity (key), not an agent-ID string; enforcement verifies identity binding |
| AV-07 depth/loop | ✅ `max_delegation_depth` + loop rejection exist | fold into INV-01 sub-property |
| AV-08 sequence replay | ✅ landed (re-scoped from wall-clock) | `chain_seq` continuity check |
| Attributable rejection | ✅ Decision Object carries decision + reason; missing `matched_invariant`/`boundary` | **feasible** — two new DO fields |

**Engineering feasibility summary.** Of the full gap set, the *only* new data structure is the
`authorization_basis` reference — everything else reuses primitives that already exist
(`within`/`rate` state for the cumulative budget, `parent_audit_id`/`execution_trace_id` for
lineage, `CANCEL`/`REVOKE` for the tombstone, the Action Guard for the boundary). The substantive
engineering item remains **INV-04 revocation + freshness** — a distributed, eventually-consistent
revocation state with a monotonic epoch, consulted at the enforcement boundary — which is the same
problem as the stateful-operator (`within`/`rate`) shared-state work already in progress, so it
lands on that track rather than a new one.

---

## 7. Answers to your co-review questions (Q1–Q8)

**Q1 — Effective Authority Representation.**
Minimum state = the **authorization basis** + the constraint chain + lineage, hash-anchored.
`EA(A,T)` is *derived*, not stored: `Auth(A,T) ∩ C1 ∩ … ∩ Cn`. What must travel with the task is
the basis reference (`Auth(A,T)`, pointing at a root grant or an independently verified
re-authorization DO), plus the constraints accumulated so far, plus the lineage (`D(T)` =
`delegation_chain_seq` + `genesis` + `parent_audit_id`). The DO hash makes the envelope
tamper-evident.

**Q2 — Standing Privilege vs. Delegated Authority.**
Standing authority (`trust_radius`) never becomes available to a delegated task implicitly. The
only way to widen effective authority is an *independent, explicit* re-authorization event — and
that event must itself be recognized and verified as an **authorization basis**: it must identify
an authorizing principal/issuer, the granted scope, its validity/revocation state, and evidence
that the issuer is permitted to grant that scope. A new DELEGATE/ASSIGN DO by itself does *not*
widen authority; it widens only when independently verified as a legitimate basis. Otherwise a
downstream actor could treat "a new DO exists" as an authority-expansion primitive. Anything less
is AV-01/AV-03 → DENY.

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
4. **Fail closed on unverifiable freshness.** The boundary does NOT treat the *absence* of a
   revocation tombstone as proof that authority remains valid. Absence proves only that no
   revocation is visible in the current view. A security-sensitive side effect is permitted only
   if the boundary can establish that its revocation state is *fresh enough* for the decision
   (see Q7). If that freshness cannot be established, the boundary MUST fail closed (DENY), even
   when no tombstone is visible. This is where eventual consistency lives: the tombstone is
   recorded at the source and reaches boundaries eventually; a boundary whose view is stale is
   not entitled to authorize on the strength of that staleness.

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
be established, DENY. Consistent with the deterministic-layer posture. Exercised by AV-14
(`not_exists(revocation.epoch) → DENY`).

**Q7 — Revocation Freshness.**
We correct our earlier "implementation-defined" framing. The *mechanism* (how fresh revocation
state reaches the boundary) stays implementation-defined — bounded leases, monotonic authority
epochs, signed checkpoints, or versioned state are all acceptable, and the invariant does not
mandate one. But the *security property* is normative, not implementation-defined:

> An enforcement boundary MUST NOT treat the absence of a visible revocation as proof that
> authority remains valid, unless the boundary can establish that its revocation state satisfies
> a required freshness condition. If that freshness cannot be established, security-sensitive
> effects MUST fail closed.

Concretely: `ALLOW` only if `authority_valid ∧ lineage_valid ∧ revocation_state_fresh_enough`.
The canonical adversarial case is the stale-negative — authorize, delegate, a boundary caches
state at epoch N, revocation happens at N+1, and the boundary then receives a protected action
while still at N. Expected: DENY / AUTHORITY_STATE_UNVERIFIED, not ALLOW. We adopt your
*fresh-enough* threshold rather than *freshest-available*: the boundary does not need the newest
revocation state, only one fresh enough to authorize safely. Concretely, with a monotonic
authority epoch (no trusted wall clock — E9 forbids reading one), "fresh enough" means "the
boundary's observed revocation epoch ≥ the epoch at which the authority-bearing evidence was last
confirmed valid".

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

## 8a. The ERDL anchor — conformance is produced by the ERDL engine

**This is the load-bearing decision of this document, not an implementation detail.**

Delegated-authority conformance is not a "scenario → expected decision" table handed to a bespoke
authority state machine. The verdict for each vector MUST be produced by the **ERDL expression
engine** (`erdl-landing`): the same deterministic `Evaluator.evaluate(rules, context)` that
governs production agents, emitting the same Decision Object. A vector that does not exercise
ERDL rule evaluation proves nothing about ERDL.

**The enforcement boundary is a set of ERDL rules.** Each invariant is expressed as one (or a
small group of) ERDL rule whose `when` condition is the constraint comparison and whose `then`
action is the conforming decision. The fourteen vectors (AV-01..AV-14, aligned to the source conformance matrix) map directly onto the expression
layer's native condition operators (`gt` / `ne`, from `OP_COMPARE`) — no new evaluation machinery:

| Vector | ERDL rule (`when → then`) | Context fields the rule reads |
|---|---|---|
| AV-01 (INV-01) | `request.level > authorized.level → DENY` | `request.level`, `authorized.level` |
| AV-02 (INV-01) | `request.level > hop_2_level → DENY` | `request.level`, `hop_2_level` |
| AV-03 (INV-01) | `request.action ≠ effective.action → DENY` | `request.action`, `effective.action` |
| AV-04 (INV-03) | `downstream.amount > inherited.amount → DENY` | `downstream.amount`, `inherited.amount` |
| AV-05 (INV-04) | `request_t > revocation_t → DENY` | `request_t`, `revocation_t` (snapshot) |
| AV-06 (INV-05) | `request.action ≠ authorized.action → DENY` | `request.action`, `authorized.action` |
| AV-07 (INV-01) | `chain_depth > max_depth → DENY` | `chain_depth`, `max_depth` |
| AV-08 (INV-02) | `replayed.seq ≤ chain.last_consumed_seq → DENY` | `replayed.seq`, `chain.last_consumed_seq` (snapshot) |
| AV-09 (INV-01) | `aggregate.amount > origin.budget → DENY` | `aggregate.amount`, `origin.budget` |
| AV-10 (INV-04) | `boundary.epoch < revocation.epoch → DENY` | `boundary.epoch`, `revocation.epoch` (snapshot) |
| AV-11 (INV-01) | `action=delegate ∧ basis.delegatable=false → DENY` | `action`, `basis.delegatable` |
| AV-12 (INV-02) | `executor.identity ≠ bound.identity → DENY` | `executor.identity`, `bound.identity` |
| AV-13 (INV-04) | `completion_t ≥ revocation_t → DENY` | `completion_t`, `revocation_t` (snapshot) |
| AV-14 (INV-04) | `not_exists(revocation.epoch) → DENY` | `revocation.epoch` absent (snapshot) |

Attribution is carried by the rule, not by a side channel: the matched rule's identity encodes
`matched_invariant`; the injected-violation hop encodes `first_invalid_boundary`. `Evaluator`
returns the `EvaluationResult` (decision + matched rules); the Decision Object built on it is the
hash-anchored, replayable proof that the invariant held. This is the ERDL value: the same artifact
that governs production agents also *proves* the security property — not a parallel implementation
that happens to agree.

**What "independently runnable" means (correcting §9 item 5).** The vectors are independently
runnable in the sense that a third party independently implements the *ERDL rule-evaluation
contract* — as norviq-go and concordia-python independently implement the Decision Object contract
— and must converge on the same `decision + matched_invariant + first_invalid_boundary`. It does
**not** mean a bespoke authority state machine written outside ERDL. A runner that reimplements EA
folding from scratch without evaluating ERDL rules is a parallel system, not an ERDL-conforming
one.

**Where the organization layer enters — and why the pilot does not need it yet.** The fourteen
vectors are snapshot-evaluated: the "authorized" side of each comparison is statically given in
the scenario (AV-01's `authorized.level = L2` is fixed by the origin grant),
so the expression layer alone produces the verdict; no authority state machine is required. The
organization layer — EA folding across multiple hops, `authorization_basis` resolution, revocation
propagation — is what *prepares the context* for the later multi-hop vectors (AV-02/AV-09
aggregation, AV-05/AV-10 revocation): it computes the effective `authorized.*` values that the
expression layer then compares. The expression layer remains the sole decision authority; the
organization layer derives its inputs, never the other way around.

**Snapshot vs stateful boundary.** The fourteen vectors are snapshot-evaluated: for AV-05/AV-13 (revocation), AV-08 (sequence replay), AV-10 (freshness) and AV-14 (unavailable state), the suite proves the engine reaches the correct decision **given materialized state** — it does not prove cross-request revocation propagation or event-history retention. The progression — snapshot decision conformance → explicit authority/revocation state → controlled transitions → boundary-time lineage evaluation — is a change in what the suite *establishes*, not in the underlying invariants (INV-01..INV-05).

---

## 9. Integration plan + engineering feasibility

This plan is not a from-scratch design. Every item below reuses machinery we already run — the
deterministic expression engine, the cross-implementation vector suite, and the SMT verifier — so
the integration is an extension of an operating system, not a new build.

1. Land the invariants + vectors + conformance assertions as a normative section in
   `rulsynor-spec-v2.0` §10 (cross-cutting the existing H1–H10 / V1–V12 action structure).
2. Add the `authorization_basis` reference as the base case of the EA derivation (the one new
   data structure — see §6).
3. Add `matched_invariant` + `boundary` to the Decision Object (attributable rejection).
4. Close the remaining gaps, ordered by dependency:
   - **INV-04 revocation + freshness** — tombstone + lineage walk + monotonic authority epoch +
     fail-closed freshness (mechanism designed in §7 Q4/Q7; the freshness/state substrate lands on
     the shared-state track with `within`/`rate`).
   - **INV-01 aggregation** — cumulative-budget state for numeric constraints (same track as above).
   - **INV-01/INV-03 containment + narrowing checks** — delegation-time and boundary-time checks.
   - **INV-05 capability-boundary + task-scoped credential** — formalize the axis; enforce the
     task envelope at the tool/resource boundary (boundary-mediation caveat stated).
   - **INV-02 renew = re-authorization** and **INV-04 tombstone ↔ re-grant** semantics.
   - **Purpose layering** — keep purpose audit-layer; document the structural-mapping requirement.
5. Emit AV-01…AV-14 (plus positive baselines) as a named conformance vector family — a *new vector
   format* (property vectors, distinct from the existing byte-identity Decision Object vectors).
   Each vector's verdict is produced by the ERDL expression engine per §8a (ERDL rules over a
   scenario context, `decision + matched_invariant + first_invalid_boundary` attribution); a
   third-party runner independently implements that ERDL rule-evaluation contract and converges on
   the same attribution — the way the Decision Object vectors were independently implemented
   (e.g. Erik Newton's checks), not a separate authority state machine.

**Open design questions for your read.** Four points we would rather settle together than decide
unilaterally:

1. **Vector format.** The property vectors are a *new* format — a scenario (authorization chain +
   one controlled violation + expected decision + expected attribution), distinct from the
   byte-identity Decision Object vectors. We have no precedent to copy; what shape should the
   scenario carry?
2. **Conformance standard.** Two independent implementations will agree on the *decision*, but
   should they also agree on the *attribution* (`matched_invariant` / `boundary` / `reason`)? This
   determines what "passing" means for an independent runner.
3. **Stateless vs. snapshot split.** Of the 14 vectors, 9 are stateless (pure current-state facts:
   AV-01..04, AV-06..09, AV-11, AV-12) and 5 are snapshot-evaluated for revocation/temporal state
   (AV-05 revocation, AV-08 sequence replay, AV-10 freshness, AV-13 completed-action no-reversal,
   AV-14 unavailable state).
   Every vector carries a `legal` baseline (→ ALLOW), so a deny-all implementation fails on the
   legal side; the AV-13 dual additionally blocks over-revocation. We propose landing the 9
   stateless vectors first, then the 5 snapshot ones; do you agree with that ordering?
4. **Revocation freshness mechanism.** For the stateful vectors we lean on a monotonic authority
   epoch + fail-closed (DENY when freshness cannot be established). Is that an acceptable
   mechanism, or do you have a stronger preference?

---

## 10. Our audit of the vector suite (co-review findings)

The fourteen vectors are a strong adversarial set, but a rigorous review surfaces one scientific
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

All vectors carry a `legal` baseline (→ ALLOW) alongside their negative `attack` context, so a
deny-all implementation fails on the legal side. The AV-13 dual (completed-action no-reversal)
additionally blocks over-revocation. (The earlier "all eight are negative" framing predates the
per-vector `legal` field, which already closes the deny-all gap.)

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

### Finding 5 — new vectors surfaced by our own corrected-model audit

Correcting `EA(A,T)` from "constraints payload" to "derived meet over a basis" and promoting
freshness to normative exposed two attack patterns that AV-01…AV-08 do not cover, plus the
positive baselines Finding 3 calls for. We propose them as additions:

**AV-09 — Aggregation amplification (numeric).**
Setup: origin authorizes `amount <= $500`; A delegates two narrow tasks to B, each
`amount <= $500`, under the same origin budget. Attack: B consumes both, for a total of $1,000.
Expected: DENY on the second exercise (cumulative budget exceeded). Invariant: INV-01
(aggregation). This vector fails any implementation that treats `amount` as a per-delegation
allowance rather than a shared cumulative budget.

**AV-10 — Stale-negative revocation (freshness).**
Setup: `P → A → B → C`; a boundary caches revocation state at epoch N; P revokes P→A at epoch
N+1; the boundary, still at N, receives C's protected action. Attack: the boundary sees no
tombstone (it is stale) and authorizes. Expected: DENY / AUTHORITY_STATE_UNVERIFIED, not ALLOW.
Invariant: INV-04 (freshness). This vector fails any implementation that treats "no visible
revocation" as proof of continued validity — the canonical stale-negative case.

**AV-11 — Rogue-agent creation (delegation authority).**
Setup: origin authorizes A with a non-delegatable basis; A, having been compromised, attempts to
DELEGATE the task to a new agent B. Attack: the DELEGATE succeeds because delegation is treated as
a default rather than a privilege. Expected: DENY (A's basis is not delegatable). Invariant: INV-01
(delegation-depth control). This vector fails any implementation that lets any agent mint a
delegate regardless of whether its own authority was delegatable.

**AV-12 — Agent impersonation (identity binding).**
Setup: origin authorizes a task to agent B, bound to B's cryptographic identity; a rogue agent C
claims B's agent-ID string. Attack: C receives the authority because the basis binds a name, not a
key. Expected: DENY (identity mismatch). Invariant: INV-02 (provenance / identity binding). This
vector fails any implementation that binds authority to an agent-ID string rather than a
cryptographic identity.

**Positive baselines (per Finding 3).**
- a valid delegation within authority → ALLOW;
- a valid narrowing (e.g. amount $500 → $250) → ALLOW;
- a valid re-authorization (explicit new authorization) → ALLOW.
