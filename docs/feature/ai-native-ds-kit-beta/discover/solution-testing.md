---
title: "Solution testing — AI-native DS kit beta"
wave: DISCOVER
phase: 3 — Solution testing
feature: ai-native-ds-kit-beta
date: 2026-10-11
status: "TEST PLAN ONLY — nothing has been run. G3 NOT STARTED (blocked by G1 and G2)."
---

# Solution testing (Phase 3)

**Status.** This is a plan, written in advance so the tests cannot be tuned to the result. No
prototype has been put in front of anyone. Per nWave, Phase 3 starts only after G1 and G2 pass;
three of these tests (E1, E3, E4) are designed to ride on the G1 conversations, so they cost no
extra recruiting.

**Constraint that shapes every test.** The site gets about 100 visits a month and the repo has 1 star
(DSC-6). Landing-page and fake-door tests cannot resolve at that volume. Every test below is
**one-to-one**: a person, a repo, a prototype, a payment ask.

## 1. Hypotheses (nWave template)

| ID | We believe… | TRUE when we see… | FALSE when we see… | Cat. |
|---|---|---|---|---|
| S1 | …a free scorecard run on a team's own repo, for AI-native founders and DS leads, will start a conversation about fixing drift | ≥3 of 5 share a repo or URL (rung 1) and ≥2 of 5 forward the result to someone else (rung 2) | ≤1 of 5 shares a repo after being offered the scorecard | Value |
| S2 | …a scored, prioritised audit report will be paid for by AI-native teams | ≥1 pre-pays at the quoted price (rung 4) and ≥3 of 5 reach a review call (rung 3) | 0 pre-pay after 5 scorecards are delivered | Value / Viability |
| S3 | …a non-designer founder can run the scorecard and read the result unaided | ≥4 of 5 complete "run it, say what is wrong, name the first thing you would fix" in under 10 minutes | ≤2 of 5 complete it | Usability |
| S4 | …the App Shell's System Overview (Instructions · Toolkit · Where it is used · Evidence) shows teams a gap they recognise | ≥3 of 5 point at a card and say "we have nothing for this" or "this is where it breaks" | ≥3 of 5 say the docs page is enough | Value |
| S5 | …a decision log written back into the design system is something teams would read before building | ≥3 of 5 can say who would read it and when, and ≥1 shows an existing decision record they keep today | nobody keeps decision records and nobody can say who would read one | Value |
| S6 | …a rule pack in the formats agents load reduces hard-coded values in agent-written UI | on a public repo, hard-coded values per agent task drop by ≥50% across 10 matched tasks | no measurable drop | Feasibility / Value |
| S7 | …a done-for-you fix pack at a lower entry price than a €4.5k sprint will be bought | ≥1 asks for a quote unprompted or accepts a quoted scope | everyone wants only the free kit | Viability |

## 2. Experiments

| ID | Tests | Method | Sample | Success criterion | Cost |
|---|---|---|---|---|---|
| E1 | S1, S3 | After the call, offer to run the scorecard on one repo (read-only). Then, in a second short session, watch them read it unaided. Log time-to-first-fix-named | 5 repos | per S1 and S3 | days |
| E2 | S2, S7 | Pre-pay ask at the close of the review call (guide close question 3): the price is stated, the answer is recorded verbatim. Interim payment link or invoice, because real checkout is a later phase | everyone at rung 3 | per S2, S7 | days |
| E3 | S4, S5 | Prototype task test on the App Shell mock (see `../design/presentation-ia.md`). Tasks: (1) find where a token is used, (2) find which rule a screen breaks, (3) find why a past decision was made. Record completion and time-to-understand the Overview | 5 users | **>80% task completion**, Overview understood in **<10 s**, per S4 and S5 | 1–2 days to build the mock |
| E4 | S2, S7, feasibility | **Concierge audits ×3** by hand plus agent: `systemix-poc`, one public shadcn repo, one partner repo. Measure hours per audit, what the report changed within 14 days, and what the reader asked for next | 3 audits | each audit ≤1 working day by the third; ≥1 reader acts within 14 days | 3–4 days |
| E5 | S6 | Rule-pack A/B on a public repo: 10 matched agent tasks without the pack, 10 with it; count raw hex, raw px and rebuilt components per PR | 20 tasks | ≥50% fewer violations | 2 days |
| E6 | S7 | Offer a fixed-scope "fix pack" (one component family, value-identical token swap) at a lower price to the people who read an audit | all audit readers | ≥1 accepts | days |

**Order:** E1 and E3 inside the G1 calls; E4 in parallel during weeks 2–3; E2 at the end of each
review call; E5 any time (no people needed); E6 only after an audit has been read.

## 3. Decision rules (nWave)

| Result | Criteria | Action |
|---|---|---|
| Proven | >80% meet the success criterion | proceed |
| Disproven | <20% meet it | pivot or kill that hypothesis |
| Inconclusive | 20–80% | add sample, change method or segment |

With samples of five, one person is 20 points. Treat 4 of 5 as "proven pending replication" and 1 of 5
as "disproven pending replication"; only a second iteration of five settles the ones in between.

## 4. Gate G3 — criteria and status

| Criterion (nWave) | Target | Status |
|---|---|---|
| Users tested per iteration | 5+ | 0 |
| Task completion | >80% | not run |
| Value perception ("would use/buy") | >70% — **counted only as pre-pay or a commitment, never as a stated "would buy"** | not run |
| Comprehension | <10 s to understand the Overview | not run |
| Key assumptions validated | >80% proven | 0 of 7 hypotheses tested |

**Decision: NOT STARTED.**
