---
title: "Opportunity tree — AI-native DS kit beta"
wave: DISCOVER
phase: 2 — Opportunity mapping
feature: ai-native-ds-kit-beta
date: 2026-10-11
status: "DRAFT — scores are desk estimates, not interview data. G2 NOT PASSED (G1 is open)."
---

# Opportunity Solution Tree (Phase 2)

**Read this first.** nWave says to gather importance and satisfaction ratings **from 5+ interviews**
before scoring. There are no interviews yet, so every score below is a **desk estimate** I made from
the public evidence (`evidence/R1` to `R3`): *importance* is how loudly and how often the pain
appears; *satisfaction* is how well free or do-it-yourself remedies already serve it. They exist to
choose what to **ask about**. They must not be cited as G2 evidence, and they should be thrown away
and recomputed once interviewees rate each outcome.

## 1. Desired outcome (draft, in the customer's terms)

> Our agents' UI stays on-system, and when it does not, we find out before review, we know which
> decision is missing, and we can say afterwards why the rule exists.

## 2. Opportunities (9 distinct; formula: Score = Importance + max(0, Importance − Satisfaction), max 20)

| # | Opportunity (need, not solution) | Evidence (row ids) | I | S | Score | Read |
|---|---|---|---|---|---|---|
| O2 | Make the agent actually follow the rules and components it was given | R1-01, -02, -06, -14, -20, -29 | 9 | 4 | **14** | Underserved; cheap partial fixes exist (always-on rules, typed theme interfaces: R1-29, -30) |
| O1 | Know that agent-written UI has drifted before a human reviews it | R1-03, -15, -17, -18 | 8 | 4 | **12** | Underserved; lint and CI help where teams built them (R1-27) |
| O4 | Settle the open decisions the rules depend on, with a named decider | R2-04, R2-19 | 7 | 3 | **11** | Surprising: the blocker of the best in-house audit was five undecided questions, not detection |
| O7 | Get credits and usage accounting correct (idempotency, concurrency, pooled budgets) | R3-03, -04, -05, -12, -13, -26 | 8 | 5 | **11** | High pain but **not our lane**: Autumn, Polar and Stripe are absorbing it |
| O3 | Remember why a rule, token or component exists, and what worked | R2-04 (indirect); nothing direct | 6 | 2 | **10** | Importance unevidenced. It is the product's bet (DSC-3), so it is the item interviews must test hardest |
| O5 | Run the design-to-code sync on a schedule or in CI instead of a manual session | R1-05 (four users on one issue) | 6 | 3 | **9** | Real demand signal; Anthropic is the incumbent (`/design-sync`) |
| O6 | Give end customers a usage, balance and credits view they can understand | R3-01, -06, -09, -18, -20 | 7 | 5 | **9** | Pain is the **unit** (what is a credit), more than the component; free blocks exist (R3-22, -23) |
| O8 | Get a trusted, prioritized list of what to fix, with a rough cost | R2-01 to -04, -29 | 6 | 5 | **7** | Served by freelancers and free skills (R2-07, -27); value is in prioritisation and the decider |
| O9 | Get the fixes implemented | R2-12 to -17, -19 to -22 | 5 | 6 | **5** | Well-served: DIY with agents in days; freelancers from $100 |

**Provisional ranking:** O2 (14) · O1 (12) · O4 (11) · O7 (11, out of lane) · O3 (10).
**Tension to carry into G2:** the thing the beta says is unique (O3, decision memory) ranks fifth on the
desk estimate because nobody asked for it in public. Either interviews raise its importance, or the
beta's differentiator is an assumption to drop.

## 3. Job map — "keep agent-built UI on-system" (universal job steps)

| Step | Outcome statement (direction + metric + object) | Desk evidence | Covered |
|---|---|---|---|
| Define | Minimize the time it takes to decide what "on-system" means for palette, opacity, brand colours and font sizes | R2-04 | yes |
| Locate | Minimize the time it takes for the agent to find the rules and components that apply | R1-02 (skills folder had to be found), R1-19 (design doc re-read 8 times) | yes |
| Prepare | Minimize the likelihood that the rules are missing or in a format the agent does not load | R1-03, -29 | yes |
| Confirm | Minimize the likelihood that a violation reaches review unnoticed | R1-15 (about 20 token violations on review) | yes |
| Execute | Minimize the time from brief to a PR that uses the existing components | R1-09, -10 | yes |
| Monitor | Minimize uncertainty about how far the product has drifted this week | R1-05, -17 | yes |
| Modify | Minimize the effort to correct drift with a value-identical change | R2-19 | yes |
| Conclude | Minimize the time from "fixed" to a recorded reason a future agent can read | none found | **no** |

Desk coverage 7 of 8 steps (88%), against a target of 80%. The one uncovered step, **Conclude**, is
exactly where the beta's differentiator lives.

## 4. Solution ideas for the top opportunities (diverse, not variants of one idea)

**O2 — agents follow the rules**
- a. A rule pack generated from `design/` in the formats agents actually load (`AGENTS.md`/`CLAUDE.md`, Cursor `.cursor/rules/*.mdc` with `alwaysApply`, `SKILL.md`): one source, several outputs.
- b. A typed token module so a hard-coded value fails to compile (R1-30).
- c. A deterministic check that fails CI on raw hex and px (R2-05: "we'd prefer deterministic checks over probabilistic results").
- d. An MCP server that serves tokens and component usage on demand instead of a long doc in context (R1-19, R2-10).

**O1 — know it drifted**
- a. The `systemix audit` scorecard (deterministic, no model call). It exists today.
- b. A PR-time drift comment.
- c. Screenshot diffing on every PR (R1-30).
- d. A weekly drift digest in the Design Hub.

**O4 — settle the decisions**
- a. A conventions-doc template that lists the usual open questions up front (R2-04's five).
- b. HITL decision cards that put one question at a time to a named decider (the queue exists).
- c. A 30-minute decision session inside the paid audit.

## 5. Gate G2 — evaluation

| Criterion (nWave) | Target | Status |
|---|---|---|
| Opportunities identified | 5+ distinct | 9 (desk) |
| Top scores | >8 of 20, from 5+ interviews | desk estimates 14 / 12 / 11 — **not valid** |
| Job-step coverage | 80%+ | 88% on desk evidence, **not from interviews** |
| Strategic alignment | stakeholder confirmed | **not confirmed.** nWave principle 7 asks for PM + designer + engineer; this is a solo founder plus agents. A named second reviewer is an open question for the founder. |

**Decision: NOT PASSED.** Blocked by G1. Next action: collect importance and satisfaction for O1 to O6
in each interview (a 1–10 pair per outcome, asked after the past-behaviour questions) and recompute.
