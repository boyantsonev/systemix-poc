# Taste Evaluation — Agentic Loop Thesis
**DIVERGE phase:** Phase 4 — Taste Evaluation
**Feature ID:** agentic-loop-thesis
**Date:** 2026-05-05
**Options evaluated:** 6 curated options from options-raw.md

**IMPORTANT: Weights locked before scoring. No retroactive weight adjustment permitted.**

---

## Weight selection and rationale

This product serves a technical ICP (design engineers using Claude Code/Cursor, pre-PMF founders with engineering backgrounds). It is developer-tooling. The default "Developer Tool" weight column from the taste evaluation skill applies with one adjustment:

**Adjustment:** Speed-as-Trust (T4) elevated from default 25% to 30% for this specific evaluation.

**Rationale for adjustment:** This is a pivot-level strategic direction decision, not a feature decision. The time-to-value question is critical: the DISCOVER wave found G1 formally unvalidated (no customer interviews). An option that takes 12+ months to show value cannot validate the thesis — we need options that close a loop within 60 days. Speed-as-Trust therefore captures both technical speed (latency) and evidence loop velocity (how fast the product proves its own thesis). Raising it from 25% to 30% reflects this doubled meaning.

**Compensating reduction:** DVF (avg) reduced from 25% to 20% to keep total at 100%.

**Locked weights:**

| Criterion | Weight | Rationale |
|-----------|--------|-----------|
| DVF (avg) | 20% | Primary filter already applied; surviving options all cleared minimum threshold |
| Subtraction (T1) | 15% | Developer tools reward simplicity but this is a complex integration play |
| Concept Count (T2) | 20% | Cognitive load is critical — the ICP already juggles multiple tools |
| Progressive Disclosure (T3) | 15% | Onboarding must be frictionless for PLG distribution |
| Speed-as-Trust (T4) | 30% | Captures both technical responsiveness and thesis-validation velocity |
| **Total** | **100%** | |

---

## Phase 1: DVF Filter

Apply IDEO's DVF filter. Any option scoring < 6 total is eliminated.

| Option | D (Desirability) | V (Viability) | F (Feasibility) | Total | Decision |
|--------|-----------------|---------------|-----------------|-------|----------|
| 1 Developer-First Run Architecture | 4 | 4 | 4 | 12 | Survives |
| 2 Score as Primary UX | 4 | 4 | 5 | 13 | Survives |
| 3 Git Notes Evidence Layer | 3 | 3 | 5 | 11 | Survives |
| 4 Evidence-First Design | 3 | 3 | 3 | 9 | Survives |
| 5 HITL Queue as Primary UX | 4 | 3 | 3 | 10 | Survives |
| 6 Open Standard Play | 3 | 2 | 2 | 7 | Survives |

All 6 options survive DVF (all > 6). No elimination at this stage.

**DVF score rationale (brief):**

**Option 1:** D=4 (strong signal from W&B adoption that developers want run-based experiment tracking; ICP is already CLI-native); V=4 (clear PLG path via `npx systemix init`; monetize hosted runs history); F=4 (MCP + CLI architecture is already partially built per DISCOVER feasibility notes)

**Option 2:** D=4 (single number is universally understood; PR gate is a forcing function that creates immediate value); V=4 (the score is a natural freemium gate — open source score computation, hosted score history is the paid tier); F=5 (score computation is deterministic math; the hardest part — evidence collection — is shared with all other options)

**Option 3:** D=3 (git notes are technically accessible but unknown to most users; low discoverability); V=3 (hard to monetize a git CLI wrapper; no natural paid tier above open source); F=5 (git notes are a standard feature of git; implementation is a thin CLI wrapper)

**Option 4:** D=3 (evidence-first is intellectually appealing but requires a workflow change that pre-PMF founders may not adopt; the "declare requirements first" habit doesn't exist yet); V=3 (uncertain — the evidence requirement as a product creates new friction before value is delivered); F=3 (the pull mechanism requires Hermes to continuously monitor PostHog against declared requirements — more complex than push)

**Option 5:** D=4 (review queue is intuitively accessible; non-engineer ICPs can participate without knowing DESIGN.md); V=3 (the queue requires a web application — higher infrastructure cost; monetization is natural but requires user acquisition beyond CLI install); F=3 (the Hermes monitoring pipeline + queue UI is the most complex build of all options; HITL queue UI is non-trivial)

**Option 6:** D=3 (community standards are desirable long-term but not to the individual buyer today — no immediate personal value); V=2 (standards bodies have no direct revenue model; the revenue case depends on registry and tooling adoption that is years away); F=2 (requires community organizing, ecosystem partnerships, RFC process — not a product build, an organization build)

---

## Phase 2: Taste scoring — all surviving options

**Note:** Scores were set per criterion for all options before any option's final total was computed.

### T1 — Subtraction (could this achieve its goal with one fewer concept?)

| Option | Score | Rationale |
|--------|-------|-----------|
| 1 Developer-First Run | 3 | Run/artifact abstraction adds two new concepts (run, artifact) on top of the existing evidence/contract model. The W&B analogy is helpful but requires learning a new mental framework. Core value is intact but could be simpler. |
| 2 Score as Primary UX | 5 | Nothing can be removed. The score IS the product. The contract is implementation. The PR gate is the forcing function. Three elements that are mutually dependent — removing any one breaks the value. |
| 3 Git Notes Layer | 5 | Radically minimal. Git + a CLI wrapper + structured JSON. Every element is load-bearing. No UI layer, no schema to learn, no new file format. |
| 4 Evidence-First Design | 2 | The "declare evidence requirements" workflow adds a new mandatory step before any other step. Requirements declaration, Hermes monitoring, threshold evaluation, and write-back are four sequential concepts. Several could be removed (e.g., threshold declaration could be optional, Hermes monitoring could be manual). Currently bloated relative to core value. |
| 5 HITL Queue | 4 | The queue concept is clean. Card → review → approve/reject. Three concepts, all necessary. The Hermes pipeline behind the card is invisible to the user. Minor: the routing logic (who sees which cards) could be simplified but is not essential at first use. |
| 6 Open Standard Play | 2 | The standard + registry + reference runtime + RFC process + community + toolchain is 5+ concepts. Each depends on the others. The value case requires all of them to work. Multiple elements are not load-bearing for the individual user's first use. |

### T2 — Concept Count (how many new mental concepts for a first-time user?)

| Option | Score | Rationale |
|--------|-------|-----------|
| 1 Developer-First Run | 3 | New concepts: "run" (analogous to W&B, must be explained), "run/artifact link" (new), "evidence write-back at run close" (new). Three new concepts, each requiring a sentence of explanation. The W&B analogy helps the ML-adjacent ICP but adds a concept for those unfamiliar. |
| 2 Score as Primary UX | 4 | One new concept: "the evidence score." It maps onto familiar mental models — a credit score, a test coverage percentage, a quality gate. The formula is public but doesn't need to be understood for first use. Score above 80 = good. Score below 60 = do not ship. One concept, well-anchored. |
| 3 Git Notes Layer | 4 | One new concept: "git notes carry evidence." Users who know git already know that commits can have metadata. The structured JSON schema is a secondary concept revealed only when reading notes. First interaction: `systemix evidence attach`. One action, one concept. |
| 4 Evidence-First Design | 2 | Three new concepts at first use: "evidence requirement" (new concept type), "evidence threshold" (new metric), "decision pending state" (new component status). These are interdependent and must all be understood before the first value is delivered. Steep initial learning curve. |
| 5 HITL Queue | 5 | Zero new concepts for first-time use. A card queue is already understood by anyone who uses email, Linear, or Slack. The user sees: "Hermes found evidence. Approve?" This maps entirely onto existing mental models. The underlying DESIGN.md contract is invisible at first use. |
| 6 Open Standard Play | 2 | The "standard" concept requires understanding: what makes something a standard, what adoption means, who implements it, how the registry works, what the RFC process is. Even for the technical ICP, this requires significant new vocabulary before any personal value is delivered. |

### T3 — Progressive Disclosure (does first interaction expose only what's needed for first use?)

| Option | Score | Rationale |
|--------|-------|-----------|
| 1 Developer-First Run | 3 | First interaction: `npx systemix init` → `systemix run start`. Two commands, but the second requires understanding the run/artifact model before executing. The full power (MCP server, agent integration, HITL) is hidden until the user is ready, but the first run setup is mildly complex. |
| 2 Score as Primary UX | 4 | First interaction: `npx systemix init` → see score on existing components. The score requires no prior action — it computes from the existing repo state. Depth (score improvement, experiment integration, evidence accumulation) is revealed only when the user is curious. |
| 3 Git Notes Layer | 5 | First interaction: `systemix evidence attach --commit HEAD --experiment hero-cta`. One command. Depth (reading notes, MCP server integration, agent access) is entirely hidden until needed. The first use is a single git-like command with immediate, visible result. |
| 4 Evidence-First Design | 1 | First interaction requires: understanding what an evidence requirement is, writing one before creating the component, understanding what "decision pending" means, and knowing what PostHog event to connect. All complexity is front-loaded. The value (evidence-ready component) is deferred until the requirement is met. |
| 5 HITL Queue | 4 | First interaction: open the queue → review a card → approve. Three actions, all obvious. The underlying complexity (Hermes pipeline, contract format, PostHog integration) is fully hidden. Depth is revealed only when the user asks "what happened to this component?" |
| 6 Open Standard Play | 2 | First interaction for the spec author: write a draft RFC. First interaction for the tool builder: implement the spec. First interaction for the user: install a conformant tool. Three different first interactions for three different actors. No single first interaction that works for all. |

### T4 — Speed-as-Trust (does this introduce latency, friction, or wait time?)

| Option | Score | Rationale |
|--------|-------|-----------|
| 1 Developer-First Run | 3 | CLI commands are immediate. The run architecture produces instant feedback on run start/close. However, like Option 5, the user must wait for PostHog to reach statistical significance before `systemix run close` delivers value — the experiment duration is a real wait point, not a masked background job. The MCP server response is synchronous. Revised to 3 from initial 4 for consistency with Option 5's T4 scoring (same wait-point problem, same score). [Revised per peer review.] |
| 2 Score as Primary UX | 5 | The score is computed deterministically from local file state + PostHog API. It is a fast computation with a clear result. The PR gate is immediate. The Figma plugin badge updates on sync. Every action produces an instant visible number. No blocking wait states. |
| 3 Git Notes Layer | 5 | `git notes add` is instant — it is a local git operation. The evidence attach command is synchronous. Reading notes is instant. No network dependency for the core action. The PostHog pull is the only latency point, and it can be cached. Speed is native to the git protocol. |
| 4 Evidence-First Design | 2 | The evidence requirement declaration creates a perpetual "decision pending" state that users must wait to resolve. Resolving the requirement depends on PostHog reaching statistical significance — which could take days or weeks. The first value is deferred until the requirement is met. This is architecturally slow for the initial use case. |
| 5 HITL Queue | 3 | The queue requires Hermes to run continuously, PostHog to reach significance, and a card to be generated — all before the user sees value. The pipeline has multiple wait points. Once the card is in the queue, the review action is instant. But the path to the queue involves real latency (experiment duration + Hermes processing time). |
| 6 Open Standard Play | 1 | Speed-as-Trust is inverted for a standards play. The value is not immediate — it requires: writing the RFC (weeks), community review (months), tool adoption (months to years), registry population (years). The first user action produces no immediate value. Standards bodies are inherently slow. |

---

## Phase 3: Weighted scoring matrix

**DVF averages:**

| Option | D | V | F | DVF avg |
|--------|---|---|---|---------|
| 1 Developer-First Run | 4 | 4 | 4 | 4.00 |
| 2 Score as Primary UX | 4 | 4 | 5 | 4.33 |
| 3 Git Notes Layer | 3 | 3 | 5 | 3.67 |
| 4 Evidence-First Design | 3 | 3 | 3 | 3.00 |
| 5 HITL Queue | 4 | 3 | 3 | 3.33 |
| 6 Open Standard Play | 3 | 2 | 2 | 2.33 |

**Full weighted matrix:**

Formula: (DVF_avg × 0.20) + (T1 × 0.15) + (T2 × 0.20) + (T3 × 0.15) + (T4 × 0.30)

| Option | DVF avg (×0.20) | T1 Sub (×0.15) | T2 Concept (×0.20) | T3 Prog (×0.15) | T4 Speed (×0.30) | Weighted Total |
|--------|----------------|----------------|---------------------|-----------------|------------------|----------------|
| 1 Developer-First Run | 4.00 × 0.20 = 0.800 | 3 × 0.15 = 0.450 | 3 × 0.20 = 0.600 | 3 × 0.15 = 0.450 | 3 × 0.30 = 0.900 | **3.200** |
| 2 Score as Primary UX | 4.33 × 0.20 = 0.867 | 5 × 0.15 = 0.750 | 4 × 0.20 = 0.800 | 4 × 0.15 = 0.600 | 5 × 0.30 = 1.500 | **4.517** |
| 3 Git Notes Layer | 3.67 × 0.20 = 0.733 | 5 × 0.15 = 0.750 | 4 × 0.20 = 0.800 | 5 × 0.15 = 0.750 | 5 × 0.30 = 1.500 | **4.533** |
| 4 Evidence-First Design | 3.00 × 0.20 = 0.600 | 2 × 0.15 = 0.300 | 2 × 0.20 = 0.400 | 1 × 0.15 = 0.150 | 2 × 0.30 = 0.600 | **2.050** |
| 5 HITL Queue | 3.33 × 0.20 = 0.667 | 4 × 0.15 = 0.600 | 5 × 0.20 = 1.000 | 4 × 0.15 = 0.600 | 3 × 0.30 = 0.900 | **3.767** |
| 6 Open Standard Play | 2.33 × 0.20 = 0.467 | 2 × 0.15 = 0.300 | 2 × 0.20 = 0.400 | 2 × 0.15 = 0.300 | 1 × 0.30 = 0.300 | **1.767** |

**Ranked:**

| Rank | Option | Weighted Total |
|------|--------|---------------|
| 1 | 3 Git Notes Evidence Layer | 4.533 |
| 2 | 2 Score as Primary UX | 4.517 |
| 3 | 5 HITL Queue as Primary UX | 3.767 |
| 4 | 1 Developer-First Run Architecture | 3.200 |
| 5 | 4 Evidence-First Design | 2.050 |
| 6 | 6 Open Standard Play | 1.767 |

---

## Gate G4 evaluation

| Criterion | Status | Notes |
|-----------|--------|-------|
| DVF filter applied | PASS | All 6 options scored on D/V/F; all survive (all > 6) |
| All criteria scored for all surviving options | PASS | DVF + T1 + T2 + T3 + T4 scored for all 6 |
| Weights documented and locked before scoring | PASS | Weights locked in Phase 1 of this document, before any criterion score was assigned |
| Weighted ranking complete | PASS | Full matrix computed; ranked table produced |
| Recommendation with dissenting case | PASS (in recommendation.md) | |
| Decision statement for DISCUSS wave explicit | PASS (in recommendation.md) | |

**G4 status: PASS**
