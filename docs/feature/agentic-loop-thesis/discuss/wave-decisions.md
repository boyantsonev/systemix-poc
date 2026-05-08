# Wave Decisions — DISCUSS Wave
**Feature ID:** agentic-loop-thesis
**Wave:** DISCUSS
**Date:** 2026-05-05
**Appends to:** docs/feature/agentic-loop-thesis/wave-decisions.md (master)

---

## DISCUSS-1 — HITL Queue as primary UX surface confirmed

**Decision:** The HITL Queue (`systemix queue`) is the primary UX surface for the pre-PMF founder ICP. No other surface (evidence score, PR gate, web dashboard) is in scope for this wave.

**Rationale:** DIV-4b resolved this at the DIVERGE wave level. DISCUSS confirms by grounding it in the founder's actual workflow: the queue maps to "what do I decide today?" — a natural daily check-in cadence. The PR gate (Score + Git Notes synthesis) maps to a code review workflow the pre-PMF founder does not have.

**What this means for design:** The DESIGN wave must design a terminal-native HITL queue experience. The score exists as a secondary field on each queue card, not as a navigation metaphor or primary screen.

**Confidence:** HIGH — grounded in ICP-2 workflow analysis and the pre-PMF founder's confirmed absence of a PR review culture.

---

## DISCUSS-2 — User stories scoped to the evidence loop only

**Decision:** The five user stories (US-001 through US-005) cover the evidence loop exclusively: init experiment → Hermes synthesis → HITL queue → close loop → agent reads evidence. Features outside this loop (design-engineer workflow, token sync, PR gate, web dashboard) are out of scope for this wave.

**Rationale:** Elephant Carpaccio principle — the walking skeleton (US-001 → US-002 → US-003) is the minimum end-to-end slice that validates the thesis. US-004 (agent reads evidence) is the payoff that justifies the loop. US-005 (status dashboard) is the retention mechanism. Adding more scope risks delivering a fragmented product that does not validate the primary bet.

**Scope assessment:** 5 stories, 2 bounded contexts (CLI tool + MCP server), estimated 8–10 days total, 3 integration points (PostHog API, Hermes/Ollama, git). PASS — right-sized.

**What is explicitly deferred:** Design-engineer ICP stories, web dashboard, evidence score as primary UX, PR gate, open standard play. These are valid future scopes but not in this DISCUSS wave.

---

## DISCUSS-3 — Contract format: DESIGN.md as the carrier

**Decision:** Hypothesis contracts use DESIGN.md frontmatter extension as the carrier format, not a custom JSON format or separate database. This aligns with beta brief Move 2 (adopt Google DESIGN.md as contract format to de-risk R1).

**Rationale:** The Systemix contract is a typed view of a DESIGN.md file. This decision ensures interoperability, avoids inventing a parallel format that competes with a Google-shaped standard, and keeps the contract readable by any agent that understands DESIGN.md.

**Implementation note for DESIGN wave:** The DESIGN.md frontmatter must be extended with Systemix-specific fields (`hypothesis`, `variants`, `evidence_source`, `confidence_threshold`, `decision`, `decided_at`, `winning_variant`, `rationale`, `rationale_source`). These are additive extensions — they do not break DESIGN.md readers that do not know about them.

---

## DISCUSS-4 — Landing page tension documented, redesign deferred

**Decision:** The current landing page copy is written for the design-engineer ICP (ICP-1). The primary ICP is now the pre-PMF founder (ICP-2). The landing page must be rewritten before any distribution work begins. This rewrite is out of scope for the DISCUSS wave — it is a separate piece of work requiring its own story and design.

**What DISCUSS has documented:** The specific changes required are captured in `icp-definition.md` (section "Tension with the current landing page"). This document is the brief for the landing page rewrite.

**Gate:** No distribution work (Show HN, DM outreach, paid acquisition) until the landing page is rewritten for ICP-2. This is a hard gate, not a recommendation.

**Risk:** If distribution begins before the landing page is rewritten, traffic arrives and the message mismatches the ICP. Early signals (install rate, engagement) will be false negatives. This has already happened in some form — the current copy is attracting design-engineer attention while the product is being built for pre-PMF founders.

---

## DISCUSS-5 — SPIKE 3 is a hard gate for US-004

**Decision:** US-004 (Agent Reads Evidence Contract) cannot enter the DESIGN wave until SPIKE 3 (PostHog → contract write-back, from beta brief) is confirmed feasible. If SPIKE 3 fails, US-004 is removed from scope and the MCP server's `get_experiment_evidence` tool is trivially simplified (returns static contract data only, no live PostHog enrichment).

**Rationale:** US-004's value depends on the contract being reliably written (US-003, the HITL close) AND readable by the agent in a structured form. The MCP server is straightforward. The contract-as-structured-evidence is the question. SPIKE 3 is the only way to confirm the loop closes reliably.

**Owner:** Engineer. Target: complete SPIKE 3 before DESIGN wave begins on US-004.

---

## DISCUSS-6 — Kill condition operationalised

**Decision:** The kill condition from goal-hierarchy.md is formalised as a measurable gate:

> If 5 external users install Systemix and run it for 30 days and zero of them have a `decision` field written to any contract, the HITL Queue as primary UX surface is falsified.

**What happens at the kill condition:** Return to DIVERGE-wave direction (Score + Git Notes synthesis, ICP-1 as primary). This does not kill the product — it resets the ICP and UX surface selection.

**Measurement:** `decision` field presence in `contract/hypotheses/*.md` files across external user repos. This requires either opt-in telemetry or a design-partner check-in at 30 days.

**Note:** The kill condition cannot be measured without at least one external user install. Distribution (even minimal — 5 DMs to pre-PMF founders) is required to validate or falsify the thesis. The loop is not closed until external evidence exists.

---

## Open questions carried into DESIGN wave

| Question | Risk | Owner | Gate |
|---|---|---|---|
| What does the Hermes background daemon look like on macOS? launchd? cron? | MEDIUM — affects onboarding friction | Engineer | Before US-002 DESIGN starts |
| Is `systemix queue` the right command or should it be `systemix review`? | LOW — terminology only | PM | Before US-003 DESIGN starts |
| How does the MCP server handle repos with hundreds of contracts? (index performance) | MEDIUM — scalability | Engineer | Before US-004 DESIGN starts |
| Should the HITL queue have a web UI fallback for founders who prefer browser over terminal? | MEDIUM — ICP alignment | PM | Post-walking skeleton, before Release 2 |

---

## Handoff package summary

**To solution-architect (DESIGN wave):**

| Artifact | Path | Status |
|---|---|---|
| User journeys (emotional arc + TUI mockups) | docs/feature/agentic-loop-thesis/discuss/user-journeys.md | Complete |
| User stories (5 stories, BDD AC, DoR passed) | docs/feature/agentic-loop-thesis/discuss/user-stories.md | Complete |
| Goal hierarchy (ordered priorities, kill condition) | docs/feature/agentic-loop-thesis/discuss/goal-hierarchy.md | Complete |
| ICP definition + landing page tension | docs/feature/agentic-loop-thesis/discuss/icp-definition.md | Complete |
| DISCUSS wave decisions | docs/feature/agentic-loop-thesis/discuss/wave-decisions.md | This file |

**Walking skeleton for DESIGN wave:** US-001 → US-002 → US-003 (init → watch → close loop). Start here.

**Hard gates before DESIGN wave begins on US-004:** SPIKE 3 (PostHog write-back feasibility) must complete first.

**Hard gate before any distribution work:** Landing page must be rewritten for ICP-2 (pre-PMF founder).
