# Wave Decisions — Agentic Loop Thesis (Master)
**Feature ID:** agentic-loop-thesis
**Purpose:** Master log of key decisions across all waves. Append-only; earlier decisions are not modified.

---

## DISCOVER wave decisions

See full DISCOVER wave decisions in:
`docs/feature/agentic-loop-thesis/discover/wave-decisions.md`

**DISCOVER summary (carried forward):**

| Decision | Confidence | Status |
|---|---|---|
| D1: Agentic loop thesis is the right zoom level | MEDIUM (50%) | Test with blog post |
| D2: Beta positioning + agentic loop are zoom levels, not tension | HIGH (75%) | Confirmed architecturally |
| D3: Which ICP is primary? | HIGH (confirmed) | **RESOLVED 2026-05-07 — pre-PMF founder is primary ICP** |
| D4: Meta-loop is operational | LOW (25%) | Aspirational — loop not closed |
| D5: Adopt DESIGN.md as contract carrier | HIGH (70%) | Confirmed — implement Move 2 |
| D6: Macro thesis (AI commoditises "how") timely now? | LOW-MEDIUM (35%) | Speculative — do not lead with |

**Validated (do not re-test):** V1 (drift is paid), V2 (axis c is uncontested), V3 ("evidence" not "memory"), V4 (local LLM 12–18 month moat), V5 (DESIGN.md is right base format)

**Critical open question from DISCOVER:** D3 (which ICP is primary) remains unresolved and is the single most important assumption to test before distribution. The DIVERGE recommendation accounts for this uncertainty in its dissenting case.

---

## DIVERGE wave decisions

**DIVERGE run date:** 2026-05-05
**Phases completed:** Phase 1 (JTBD), Phase 2 (Competitive Research), Phase 3 (Brainstorming), Phase 4 (Taste Evaluation)

---

### DIV-1 — Job elevation decision

**Decision:** Elevate the DISCOVER JTBD from operational to physical/strategic level.

**DISCOVER JTBD (operational):** "When I make a product decision informed by evidence, help me ensure that evidence stays permanently attached to the artifact it justified — so the next decision, by me, my team, or an agent, starts from known ground."

**Elevated JTBD (physical):** "Convert ephemeral production signal into a durable, actor-readable claim, permanently co-located with the artifact it describes, at the moment a decision is made."

**Rationale:** The DISCOVER JTBD describes the desired state ("evidence stays attached"). The elevated JTBD describes the irreducible function ("convert signal into claim"). The elevated form is domain-independent — it applies to design tokens, GTM hypotheses, and ML models equally. Brainstorming against the elevated form produced structurally more diverse options.

**Confidence:** HIGH — the elevation is a logical consequence of the 5-Why chain and is consistent with the W&B/LangSmith/Braintrust structural analogies found in competitive research.

---

### DIV-2 — Tension resolution: evidence permanence vs. decision quality vs. agentic trust

**Decision:** These are the same job at three zoom levels (mechanism → outcome → system), not three competing job framings.

**Rationale:** Any product direction that serves the mechanism (evidence co-located with artifact) automatically produces decision quality (next decision has prior context) and agentic trust (agents read verified ground truth). The tension named in the DIVERGE brief is a framing question, not a product question.

**Implication:** The brainstorming HMW question was framed at the mechanism level ("make every product decision start from accumulated evidence"). Options that serve the mechanism serve all three framings.

**Confidence:** HIGH — confirmed by the job map (8/8 job steps have a Systemix mechanism mapped, per DISCOVER opportunity tree).

---

### DIV-3 — Competitive research confirms axis (c) is uncontested

**Decision:** No product in any zoom level (design systems, experiment management, agentic/AI-native) closes all five dimensions of the evidence loop for product/design decisions: (1) generates evidence, (2) attaches to artifact, (3) co-located with artifact, (4) agent-readable, (5) closes loop automatically.

**Key finding:** W&B, LangSmith, and Braintrust close all five dimensions — but for ML/LLM artifacts, not product/design artifacts. This is the strongest validation of the whitespace: the pattern is commercially proven in adjacent domains but unimplemented in the product/design domain.

**Non-obvious alternative found:** Clinical trials (CDISC standards) enforce evidence co-location as a regulatory requirement. This proves the "artifact must carry its evidence chain" requirement is not theoretical — in high-stakes decision environments, it is mandatory. The implication: as AI-generated code becomes the default, design decisions may face analogous regulatory pressure.

**Confidence:** HIGH — confirmed by direct review of 12 competing products across three zoom levels.

---

### DIV-4 — Option recommendation: Score + Git Notes synthesis

**Decision:** Proceed with a synthesis of Option 2 (Score as Primary UX) and Option 3 (Git Notes Evidence Layer) as the execution direction.

**Evidence:** Weighted scoring matrix (taste-evaluation.md). Options 2 and 3 scored 4.517 and 4.533 respectively (effectively tied). Options 4 (Evidence-First Design, 2.050) and 6 (Open Standard Play, 1.767) scored significantly below threshold.

**Synthesis rationale:** Option 3's architecture (git notes as storage, zero new file format) + Option 2's interface (evidence score as the primary surface, PR gate as the forcing function) = the minimum viable product for the validated job. They are complementary, not competing: git notes are the write mechanism; the score is the read mechanism.

**Dissenting case:** Option 5 (HITL Queue, 3.767) deserves re-evaluation if ICP resolution (DISCOVER D3) confirms the pre-PMF founder as the primary ICP. The HITL queue serves that ICP more directly than a PR-gate score. The recommendation is right for the design-engineer ICP; it may be wrong for the pre-PMF founder ICP.

**⚠️ D3 RESOLVED 2026-05-07:** Pre-PMF founder confirmed as primary ICP. This activates the dissenting case. **Direction shifts from Score + Git Notes synthesis to Option 5 (HITL Queue as Primary UX).** See DIV-4b below.

**Confidence:** MEDIUM — the scoring matrix is estimated (DVF scores are based on secondary research, not customer interviews). The synthesis recommendation is directionally strong but requires ICP resolution to confirm.

---

### DIV-4b — Direction revision: HITL Queue as Primary UX (D3 resolution)

**Decision:** With D3 resolved (pre-PMF founder = primary ICP), the active direction is **Option 5 (HITL Queue as Primary UX)**, not the Score + Git Notes synthesis.

**What changes:**
- Primary UX surface: the HITL decision queue (what's pending, what needs a call, what's evidence-ready) — not the PR-gate evidence score
- The pre-PMF founder's job is "make the next product decision from known ground" — the queue surfaces what's ready to decide, Hermes has synthesized the evidence, one click writes back
- Git notes remain the storage mechanism (the two options are compatible at the architecture level)
- The score becomes a secondary signal on each queue card, not the primary navigation metaphor

**What stays the same:**
- JTBD (physical level): "Convert ephemeral production signal into a durable, actor-readable claim, permanently co-located with the artifact it describes, at the moment a decision is made."
- Git notes / DESIGN.md as the evidence carrier
- Hermes (local LLM) as the synthesizer
- PostHog as the evidence source

**Why HITL Queue fits the pre-PMF founder better:**
The pre-PMF founder does not have a design system team or a PR workflow. They have a landing page, a hypothesis, and a PostHog dashboard. The queue is how they process decisions — "what do I need to decide today?" — not "what is the evidence score on my button component?" The queue maps to their actual workflow cadence (weekly or faster). The PR gate does not.

**Confidence:** HIGH (D3 resolved by product owner, no ambiguity)

---

### DIV-5 — Options eliminated by DVF or scoring

| Option | Elimination reason | Score |
|--------|-------------------|-------|
| Option 4: Evidence-First Design | Scored 2.050 — failed on T1 (2/5), T2 (2/5), T3 (1/5), T4 (2/5). The "declare requirements before building" workflow front-loads too much complexity. | 2.050 |
| Option 6: Open Standard Play | Scored 1.767 — failed on viability (2/5) and T4 speed (1/5). Standards plays are correct long-term strategy but cannot validate the thesis within 60 days. | 1.767 |
| Option S (Agent memory graph) | Eliminated during brainstorming — the "evidence in a graph DB separate from the artifact" mechanism directly contradicts the validated whitespace. This is the disconnected-systems problem Systemix exists to solve, recreated. | N/A |
| Option C (Component IS the experiment) | Merged into Option 4 (weaker formulation of the same conceptual model). | N/A |

---

### DIV-6 — SSOT bootstrap

**Decision:** Created `docs/product/jobs.yaml` as the first entry in the product SSOT.

**Content:** Validated job (JOB-001) at physical level, 6 ODI outcome statements, 3 ICP candidates with status flags, job step map (8/8 steps), tension resolution documentation, and changelog.

**Purpose:** This file is the canonical reference for all subsequent product decisions. Any wave that modifies the job statement must append a changelog entry to this file.

---

## Recommended actions before DISCUSS wave handoff

| Action | Owner | Method | Gate |
|---|---|---|---|
| Resolve ICP (DISCOVER D3) | PM + cross-functional | 5 interviews per ICP candidate | Must complete before committing to Score + Git Notes synthesis vs. HITL Queue |
| Validate git notes portability | Engineer | 1-hour check against actual GitHub Actions config | Must confirm before committing to Option 3 architecture |
| Complete SPIKE 3 (PostHog write-back) | Engineer | Smallest end-to-end: 1 component, 1 event, 1 note | Must confirm feasibility before any distribution work |
| Peer review of DIVERGE artifacts | nw-diverger-reviewer | Automated review invocation | Gate before DISCUSS handoff |

---

## Artifact index

| Artifact | Path | Status |
|---|---|---|
| Job analysis | docs/feature/agentic-loop-thesis/diverge/job-analysis.md | Complete |
| Competitive research | docs/feature/agentic-loop-thesis/diverge/competitive-research.md | Complete |
| Options raw | docs/feature/agentic-loop-thesis/diverge/options-raw.md | Complete |
| Taste evaluation | docs/feature/agentic-loop-thesis/diverge/taste-evaluation.md | Complete |
| Recommendation | docs/feature/agentic-loop-thesis/recommendation.md | Complete |
| Review | docs/feature/agentic-loop-thesis/diverge/review.yaml | Pending peer review |
| SSOT jobs | docs/product/jobs.yaml | Complete |
