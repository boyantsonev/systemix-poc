# Goal Hierarchy — Agentic Loop Thesis
**DISCUSS wave — Agentic Loop Thesis**
**Date:** 2026-05-05
**Status:** Active — supersedes any goal framing from DISCOVER or DIVERGE waves

---

## What Systemix is optimising for

**Primary goal (the claim):**

> Systemix is optimising for loop closure: the number of product decisions that are written back to the artifact they changed, with evidence attached, in a form the next agent can read.

This is not a tagline. It is a decision with rationale.

**Why loop closure, not evidence generation:**
Evidence generation is already solved (PostHog, Statsig). The under-served step is the write-back — the moment where a result that existed in a dashboard becomes a permanent, co-located, agent-readable claim. Every design decision in DIVERGE (ODI-1 through ODI-4, DIV-4b) points at this step as the gap. The loop that does not close is the product's reason to exist.

**Why "agent can read" is load-bearing:**
The pre-PMF founder's primary pain is not that they forget — it is that their agent acts without the knowledge the founder already has. If the evidence is human-readable but not agent-readable, the agent still ships the wrong variant. Both conditions must be true: co-located AND structured.

**Why "next agent" rather than "next human":**
Humans can ask a teammate. Agents cannot. The forcing function for the write-back step is agent behaviour: if the evidence is not in the artifact, the agent acts from zero. This is the ODI-3 driver. The human benefit (ODI-1: retrieval speed) is real but secondary — humans have workarounds. Agents do not.

---

## Ordered priorities

### Priority 1 — Loop closure (the thesis)
The HITL queue surfaces decisions that are evidence-ready. The founder approves. Evidence is written to the contract. This is the only outcome that validates the thesis. Everything else is infrastructure for this moment.

**Measure:** Number of decisions written back to a contract with evidence attached, per week, per external user.

**North star:** 5 external users close 1 loop per week within 90 days of install.

### Priority 2 — Evidence readiness (Hermes synthesis)
Hermes monitors PostHog, reaches significance threshold, drafts the decision card. Without this step, the queue is empty. The HITL card must arrive with Hermes's synthesis already done — the founder is not opening PostHog themselves. The card IS the synthesis.

**Measure:** % of HITL cards accepted without the founder modifying the evidence summary. Target: >80% unmodified acceptance (SPIKE 1 validation criterion from beta brief).

### Priority 3 — Agent-readability (contract as output)
The approved decision is written to DESIGN.md in a structured format that Claude Code and Cursor can read via the MCP server. Without this, the loop closes for the founder but not for the agent. The next agent call still acts from zero.

**Measure:** % of subsequent agent calls on a component that reference the attached evidence without prompting. This requires observational testing — it is a SPIKE 3 validation criterion.

### Priority 4 — Queue discoverability (onboarding)
The first HITL card must arrive within 7 days of install for the founder to believe the product works. If the queue is empty for two weeks, the founder churns. The onboarding flow must close the gap between install and first card arrival.

**Measure:** Time from `npx systemix init` to first HITL card displayed. Target: <7 days for a founder running 2+ PostHog experiments.

---

## Technical bets (what must be true for Priority 1 to pay off)

| Bet | What must be true | Kill condition if false |
|---|---|---|
| **Bet A: Hermes synthesis quality** | Hermes-3 (local Ollama) produces decision card summaries that founders accept >80% of the time unmodified | If acceptance rate <70%: switch to hosted LLM, re-evaluate local-LLM positioning |
| **Bet B: PostHog write-back feasibility** | A PostHog significance event can reliably trigger a contract update via the Systemix MCP within 60 days of build | If infeasible: the loop cannot close automatically — the product degrades to a manual evidence attachment tool |
| **Bet C: DESIGN.md as carrier** | Git notes or DESIGN.md frontmatter survive the founder's git workflow (no shallow clones, no CI stripping) | If stripped: fallback to `.systemix/evidence/` directory structure per DIV-4 contingency |
| **Bet D: Queue as the right metaphor** | The HITL queue maps to the pre-PMF founder's mental model of "what do I decide today?" | If founders ignore the queue and go back to PostHog: the UX metaphor is wrong — investigate alternative surfaces |

---

## The kill condition

**The primary bet is falsified if:**

> Five pre-PMF founders install Systemix, run it for 30 days, and zero of them close a loop — i.e., zero decisions are written back to a contract with evidence attached.

This is not a usability failure or a technical failure. It is a thesis failure. It means the pre-PMF founder either (a) does not feel the pain of evidence loss at the moment PostHog reaches significance, or (b) the queue does not surface the right decision at the right moment to trigger action.

**What to do if the kill condition is triggered:**
Return to the ICP analysis. Test whether the design-engineer ICP (ICP-1) closes loops at higher rates with the Score + Git Notes synthesis (DIV-4 original direction). The kill condition does not end the product — it ends the HITL Queue as the primary UX surface for the pre-PMF founder as the primary ICP.

---

## What Systemix is explicitly NOT optimising for (this quarter)

- **Evidence score as a vanity metric.** The score (0–100) is a secondary signal on each queue card, not the primary goal. Optimising for score inflation without loop closure is a false signal.
- **Number of installs.** Installs without loop closures confirm distribution, not value. The north star is closed loops, not download counts.
- **Design engineer adoption.** ICP-1 is valid but is the secondary ICP. DISCUSS wave is not producing stories for the design engineer workflow. That is a subsequent scope.
- **Enterprise readiness.** No SSO, no SOC 2, no enterprise procurement. This quarter is pre-PMF founder only.
