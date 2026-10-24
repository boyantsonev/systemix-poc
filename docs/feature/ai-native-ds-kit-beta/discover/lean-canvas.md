---
title: "Lean canvas — AI-native DS kit beta"
wave: DISCOVER
phase: 4 — Market viability
feature: ai-native-ds-kit-beta
date: 2026-10-11
status: "CANDIDATE canvas, built from desk evidence. Value risk RED, viability RED. G4 NOT STARTED."
---

# Lean canvas (Phase 4)

**Status.** nWave fills this from *validated* evidence. Nothing is validated yet, so every cell is
labelled **candidate**, with the evidence behind it and the test that would confirm it. It is here so
the model is written down before the data arrives and the kill criteria are fixed in advance. It is
not a go decision.

## 1. The canvas

| Block | Candidate content | Evidence status |
|---|---|---|
| **Problem** (top 3) | 1. Agent-built UI drifts from the design system and is noticed only at review. 2. Rules exist (`CLAUDE.md`, rules files, lint) and are ignored, or depend on decisions nobody has made. 3. Nobody can say afterwards why a rule exists or whether a change worked | 1–2 desk-supported (R1, R2-04); 3 **no demand evidence** |
| **Existing alternatives** | DIY rules files, lint and CI; `/design-sync` and Claude Design (Anthropic); Impeccable (79.7k★); the DESIGN.md spec (28.3k★); MIT audit skills; Buoy; freelancers from $100; vibe-code audit sellers | desk (R1-23 to -30, R2-05 to -08, -27) |
| **Customer segments** (by job) | A. AI-native product teams of 2–20 on Next.js + shadcn with Claude Code or Cursor. B. Design-system leads and design engineers (Series A–C). C. Agencies shipping client UI. Early adopter to find: someone who named a specific miss in the last 30 days | segments are hypotheses (DIV-5, LOW–MEDIUM); the loudest public voices are **B-type maintainers**, not A |
| **Unique value proposition** | "The design system agent for AI-native products: your agents follow your system, and it remembers why." Single sentence still to be tested in customers' words | untested; positioning not frozen (ADR-023 pending) |
| **Solution** (top 3) | 1. Free MIT kit and a free scorecard (**not built yet**: `systemix audit` only installs a skill; the first audits are concierge and model-judged). 2. A paid, scored audit report with a named-decider decision session. 3. Implementation sprints and, later, a scheduled loop with decision memory | the kit and scorecard exist; report and sprint are concierge only |
| **Channels** | Existing partners and introductions; personal LinkedIn sequences; Claude and Cursor communities by moderator permission; design-systems communities; the open-source repo | **0 validated.** Ranked and costed in `evidence/R4`; repo has 1★ and about 100 visits a month |
| **Revenue streams** | **Superseded 2026-10-24 by DSC-16:** quick report €19.99 or lower (automatic, runs on the client's side through the agent, DSC-17); full audit €499 in 24 h (AI-drafted, human-reviewed); fix sprints quoted per job; later a loop subscription. **Never UI code** (DSC-5). (Was: report €490, first five €0–290; sprint from €4.5k per two weeks) | price points are founder hypotheses; R2 puts €499 inside the freelance band; €19.99 sits at the marketplace floor ($25) |
| **Cost structure** | Founder/reviewer time on the €499 audit (the binding cost: target 3+ audits a day); model usage (paid by the client on the quick report, DSC-17; ours on the full audit); hosting of a report service if the quick report is gated that way; payment fees (about €1 to €1.50 on €19.99) and VAT | review time untimed; model cost per audit to be measured on the public-repo test |
| **Key metrics** | Interviews held · highest commitment rung · scorecards run · review calls booked · pre-pays · audit → fix-pack conversion · hours per audit | defined in `interview-log.md` and `solution-testing.md` |
| **Unfair advantage** | A worked method (a scored loop that raised a real design system's quality score with conventions only; DSC-4) and a public repo that runs on its own contract. **Not** the tooling: its commodity share is high (DSC-2). Decision memory becomes an advantage only after cycles exist | partly real, partly unproven; no public cycle exists yet |

## 2. The four big risks (nWave)

| Risk | Question | Status | Why |
|---|---|---|---|
| **Value** | Will customers want this? | **RED** | No interview. The one product-unique idea (decision memory) has no demand evidence. Free substitutes at scale exist and Anthropic is the incumbent for the scheduled sync |
| **Usability** | Can customers use this? | **GREY (untested)** | Scorecard and App Shell mock not in front of anyone (E1, E3) |
| **Feasibility** | Can we build this? | **AMBER** | The loop core and `init` are tested and the method worked once; the scorecard is **not built** (a concierge audit is the first deliverable). Open: CLI safety bugs (DSC-7), a solo builder, and a 12-week roadmap that assumes G1 to G3 pass on time |
| **Viability** | Does the business model work? | **RED** | No buyer for any price point. Visible buyer budgets sit well below the sprint price. The funnel is unmeasured. LTV/CAC cannot be estimated |

nWave's G4 needs **all four green or yellow**. Two are red and one is untested.

## 3. Unit economics: what has to be measured before they can be estimated

- **CAC:** from `evidence/R4`, about 4.3% of LinkedIn invites become interviews (one outside datapoint,
  undated, automated). Eight bookings need about 186 invites. The conversion from *interview* to
  *pre-pay* is unknown, so CAC per paying customer is unknowable today.
- **LTV:** zero buyers. Only E2 (a price accepted) and E6 (a second purchase) produce a number.
- **Cost to serve:** hours per audit from E4. The €499 audit needs about 2.5 h or less of human time to reach
  3 a day; the quick report must be fully automatic (DSC-17), so only payment fees and any hosting remain.
- nWave bar: **LTV > 3× CAC (estimated)**. Recompute after E2, E4 and E6.

## 4. Pre-registered pivot and kill options

Written now so they are not argued after seeing results.

| If after G1 and E1–E2 | Then |
|---|---|
| ≤1 of 5 names a specific recent drift incident (H1 false) | Stop selling drift control. Re-read the interviews for the real job; consider the maintainers' segment only if they raise it unprompted |
| 0 pre-pay after 5 scorecards delivered (H2 false) | Drop paid-audit-first. Keep the free kit and scorecard as the lead; test a sprint-credited audit and a lower-priced fix pack (E6) |
| Teams want only the free kit and agents do the fixing (H3 false) | Open-source kit plus sponsorship and a paid loop later; no services |
| Nobody keeps or would read decision records (S5 false) | Retire the decision-memory claim from positioning; the differentiator was an assumption |
| Interviewees say Claude Design or `/design-sync` already covers it | Position as the complement: evidence and decisions on top of what Anthropic ships, or stop |

## 5. Gate G4 — status

| Criterion (nWave) | Target | Status |
|---|---|---|
| Lean canvas complete | yes | candidate only |
| Four big risks | all green or yellow | 2 red, 1 amber, 1 untested |
| Channel validated | 1+ viable | 0 |
| Unit economics | LTV > 3× CAC | not estimable |
| Stakeholder sign-off | legal, finance, ops | not requested (solo founder) |

**Decision: NOT STARTED.** No peer review was requested: the nWave rule requires G1–G4 to pass
first, and the reviewer step (`nw-product-discoverer-reviewer`) is for a complete package.
