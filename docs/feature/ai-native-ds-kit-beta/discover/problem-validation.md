---
title: "Problem validation — AI-native DS kit beta"
wave: DISCOVER
phase: 1 — Problem validation
feature: ai-native-ds-kit-beta
date: 2026-10-11
status: "G1 NOT PASSED — 0 / 5 interviews · 0 / 1 commitment signals. Public secondary evidence only."
---

# Problem validation (Phase 1)

**What this file is.** The Phase 1 working document: the problem as the evidence currently
supports it, the assumption register with risk scores, and the G1 gate check.

**What it is not.** It is not validated. The nWave rule for this phase is *5+ real interviews about
past behaviour, >60% confirming the pain, 3+ concrete examples in customer words*. None of those
conversations has happened. Everything below comes from **public posts read on 2026-10-11** (90
evidence rows across four research passes: `evidence/R1` to `R3`, plus `R4` for recruiting).
Public posts are secondary evidence: they show that people said these things, not that the people
Systemix wants to sell to feel them. **None of it counts toward G1.** Nobody was contacted.

## 1. The problem, as the evidence supports it today

**Working statement (to be replaced with interviewees' own words):**

> Agents (Claude Code, Cursor, v0…) write UI faster than a team can review it, and the UI drifts
> from the design system: hard-coded values, rebuilt components, off-system patterns. Teams write
> rules down, and the rules are ignored or nobody decided the questions the rules depend on. Nobody
> can say afterwards why a rule exists or whether a change worked.

What the public record shows, in the builders' own words (each is a quote or a close paraphrase from
the evidence files; quote status codes are explained there):

| Phrase | Who said it (role as stated) | Row |
|---|---|---|
| "Claude hardcoded Tailwind lime-400/lime-500 classes across 15+ files", despite a CLAUDE.md rule "NEVER hardcode colors" | an app author, Claude Code tracker, Feb 2026 | R1-01 |
| "the agent did not use OUDS except to inject theme" … "hard-coded values for tokens of spacings and colors" | design-system maintainer (Orange iOS), Apr–Aug 2026 | R1-02 |
| "three of four have drifted on tokens, hex values, or WCAG level" | contributor, B.C. Design System, Jul 2026 | R1-03 |
| "this 'visual debt' is introduced faster than teams can detect and correct it" | design-system team (Digdir), Jun 2026 | R1-17 |
| "a ~75-minute manual session someone sits through weekly, rather than a scheduled job" | design-system user, Claude Code tracker, Aug 2026 | R1-05 |
| "Even with detailed .cursorrules, I spend significant time correcting the AI" | design lead, Cursor forum | R1-20 |
| "The rules are what belong in the repo" (an in-house audit that became a conventions doc, blocked by five undecided questions) | engineering team, zesty-io, Aug 2026 | R2-04 |
| "raw token balances aren't meaningful to end users" | LibreChat issue, Aug 2026 | R3-01 |

Two corrections to the plan's wording come out of the desk round (see §3): **"weekly" is not
evidenced** (the only cadence seen is one manual weekly sync and a stale mirror), and **"no system"
is contradicted** (most authors already run a do-it-yourself stack: rules files, lint, CI gates,
`/design-sync`).

## 2. Evidence base (what was read, not interviews)

| Pass | Hypotheses | Rows | Past behaviour | Present pain | Future intent / opinion | Disconfirming | Strength S3 / S2 / S1 |
|---|---|---|---|---|---|---|---|
| R1 — agent UI drift, DS as agent instructions | H1, H5 | 30 | 15 | 5 | 2 | 8 (27%) | 9 / 15 / 6 |
| R2 — paying for audits and implementation | H2, H3 | 30 | 9 | 4 | 3 | 14 (47%) | 1 / 16 / 13 |
| R3 — AI billing, usage and credits UI | H4 | 30 | 9 | 11 | 1 | 9 (30%) | 1 / 13 / 16 |
| R4 — recruiting channels | (method) | — | — | — | — | — | map only |

Grades: PAST_BEHAVIOR = lived, with specifics; PRESENT_PAIN = ongoing, no specifics;
FUTURE_INTENT_OR_OPINION = discounted; DISCONFIRMING = problem small, already solved, or not worth
paying for. Strength S1 weak, S2 medium, S3 strong. R2's 47% disconfirming share is partly a bias of
the reachable corpus: paid audits are private, so absence is weak data.

**Bias and coverage notes (read before trusting any verdict):**

- The sample skews to **GitHub-active developers and design-system maintainers**. The voices on drift
  are mostly maintainers at public-sector and enterprise systems (Digdir, Equinor, B.C. government,
  Orange, Workday), not 2–20-person product teams.
- WebFetch reached only `github.com`, `anthropic.com` and `claude.com`. Hacker News, Indie Hackers,
  dev.to, vendor pages and the Cursor forum were seen only as search extracts; Reddit not at all.
  Many dates are not shown.
- The shared WebSearch budget ran out in all four passes (25 to about 70 queries each). Not run:
  X, Product Hunt, Clerk Billing, T3, Lago, OpenMeter, Cursor and Lovable billing queries.
- Fetched quotes pass through a summarising model; the strongest were re-fetched. R3's GitHub text
  was not re-checked against raw HTML.
- No design-system lead or design-engineer voice on billing UI appeared. No first-person account
  of paying about €490 for a design-system audit was found.

## 3. Hypothesis verdicts after the desk round

| ID | Hypothesis (from `interview-log.md`) | Desk verdict | What changes |
|---|---|---|---|
| H1 | Agent-built UI drift is felt weekly and teams have no system for it | **Holds in substance, two corrections.** Drift is real and costly (R1-01, -02, -03, -17). "Weekly" unevidenced. "No system" contradicted: authors run rules files, lint, CI and `/design-sync` (R1-27, -29, -30). | Reword: drift is *recurring* and **residual after DIY remedies**. Ask what they already do and what still leaks. |
| H2 | A scored, prioritized audit is worth paying for (€500–€1,000) | **Unproven, not killed.** Support is supply-side only (Fiverr UX audits from $195 to $500, one at $490; Clutch bands $10k–$49,999; vibe-code audits $199–$1,500 credited to the fix). No buyer account found. Free substitutes exist: MIT audit skills (206★), Claude Design builds a system from your codebase. | Value must rest on **decision memory, prioritisation and a named decider**, not detection. Ask what they did with the last report. |
| H3 | Teams prefer done-for-you implementation over DIY with the kit | **Weak at the target segment.** AI-native teams publicly do the work themselves with agents, in days (R2-19 to -22). Visible buyer budgets for UI polish: $100–$250 fixed, $35–$60/h for 6–12 h (about $210–$720). R2 puts €4.5k per two weeks about 6x to 45x above those. | Test a smaller productised fix pack, or aim sprints at DS teams and agencies. |
| H4 | Billing / usage / credits UI is a felt, repeated pain | **Plumbing pain supported (S2); UI pain mostly from end users; "teams rebuild the UI and would rather not" weak (S1–S2).** Credits correctness bugs recur (R3-05, -12, -26). Free UI supply exists (BillingSDK, shadcn blocks, AI Elements `Context`). Stripe is absorbing the plumbing. | The flagship paid feature is **not** a billing UI. Keep it a recipe plus wiring plus unit design. Respect the BillingSDK GPL-3.0 licence: do not copy. |
| H5 | "Instructions + toolkit + evidence" matches how teams want to see their DS | **Instructions half strongly supported** (R1-03, -17, -18, -06, -14). **Evidence half: nothing found.** Design Studio's own README promises "components, theme, product context, and instructions" (R1-22). | The differentiator (decision memory) has **no demand evidence at all yet**. It is the top item to test live. |

Free substitutes at scale (R1-23 to -25): Impeccable (79.7k★), the DESIGN.md spec (28.3k★) and
Anthropic's own Claude Design plus `/design-sync`. Drift-specific tools have little traction
(Buoy 20★, UIZZE 49★). One demand signal stands out: **four users on one issue want `/design-sync`
as a scheduled or CI job** (R1-05), with Anthropic as incumbent.

## 4. Assumption register (risk-scored, nWave formula)

**Risk score = (Impact × 3) + (Uncertainty × 2) + (Ease-of-testing × 1)**, each 1–3. Ease: 1 = days
and cheap, 3 = months and costly (the nWave table's own direction). **>12 test first · 8–12 test
soon · <8 backlog.** Scores are the founder-plus-agent's judgement on 2026-10-11 and should be
re-scored after each batch of interviews.

| # | Assumption | Cat. | Impact | Uncert. | Ease | **Score** | Priority | How it is tested |
|---|---|---|---|---|---|---|---|---|
| A15 | An open-source MIT kit creates the top of the funnel for audits (kit → scorecard → report) | Viability | 3 | 3 | 3 | **18** | Test first | Ask where they found tools last time (guide Q8); count scorecards run; ~100 visits/month and 1★ today |
| A3 | A scored audit report is worth ≥€490 to a buyer in the ICP | Value | 3 | 3 | 2 | **17** | Test first | Pre-pay ask after the scorecard walkthrough (rungs 3–4) |
| A7 | "Evidence of what worked" (decision memory) is a wanted part of a design system | Value | 3 | 3 | 2 | **17** | Test first | Guide Q4; App Shell overview task test (solution-testing E3) |
| A13 | Buyer budgets support €490 audits and €4.5k sprints | Viability | 3 | 3 | 2 | **17** | Test first | Guide Q6–Q7; price ladder reactions; R2 shows a 6x–45x gap |
| A2 | DIY stacks (rules, lint, CI) leave a residual gap worth paying to close | Value | 3 | 3 | 1 | **16** | Test first | Guide Q2–Q3: show me the last miss and what you already run |
| A8 | Free substitutes (Claude Design, MIT audit skills, Buoy) do not already satisfy the ICP | Value | 3 | 3 | 1 | **16** | Test first | "What have you tried?" in every call |
| A10 | A scheduled/CI loop is wanted and Anthropic will not simply ship it | Usability | 2 | 3 | 3 | **15** | Test first | Ask about `/design-sync` use; watch the tracker (R1-05) |
| A1 | 2–20-person AI-native teams feel agent UI drift at least monthly | Value | 3 | 2 | 1 | **14** | Test first | Guide Q1–Q2; H1 threshold ≥3 of 5 name a recent incident |
| A4 | Buyers want implementation done for them at about €4.5k per two weeks | Value | 2 | 3 | 2 | **14** | Test first | Guide Q7; H3 threshold: a sprint quote asked for unprompted |
| A6 | Teams would use a DS overview of Instructions · Toolkit · Where used · Evidence | Value | 2 | 3 | 2 | **14** | Test first | Prototype task test on the App Shell (E3) |
| A14 | Interview recruiting can reach 5 in-segment people by 1 Nov with no budget | Viability | 3 | 2 | 1 | **14** | Test first | R4 plan; checkpoint Tue 20 Oct |
| A12 | The CLI safety bugs can be fixed before distribution | Feasibility | 3 | 1 | 1 | **12** | Test soon | Task cards queued; verify by re-running the repros |
| A5 | Billing/usage/credits UI is a repeated pain, not only plumbing | Value | 2 | 2 | 1 | **11** | Test soon | Guide Q5; H4 threshold ≥3 of 5 built it recently and would not again |
| A9 | A non-designer founder can run the scorecard and read the result in under 10 minutes | Usability | 2 | 2 | 1 | **11** | Test soon | Unaided scorecard run, 5 users (E1) |
| A11 | One person plus agents can deliver 3 concierge audits and the report in 3 weeks | Feasibility | 2 | 2 | 1 | **11** | Test soon | Run them (E4); time each |

## 5. Gate G1 — evaluation

| Criterion (nWave) | Target | Status |
|---|---|---|
| Interviews completed | 5+ | **0** |
| Problem confirmed | >60% (3+ of 5) | not measurable |
| Frequency | weekly or more | not measurable (desk: "recurring", cadence unevidenced) |
| Current spending on workarounds | >$0 | desk: tokens, CI minutes, about 75 min/week manual sync; **no cash on a drift product found** |
| Emotional intensity | frustration evident | desk: yes in several threads |
| Examples in customer words | 3+ | 8 public phrases above, none from an interview |
| Commitment signal (this repo's added bar) | ≥1, ideally a pre-paid audit | **0** |

**Decision: HOLD.** Not proceed, not pivot, not kill. The desk round narrowed the hypotheses; it
cannot pass the gate. The recruiting plan (`interview-log.md`, from `evidence/R4`) targets 6 booked
for 5 held by **Sun 1 Nov**, with a hard check on **Fri 23 Oct** (fewer than 3 booked: ask to move G1
by a week, do not lower the bar).

## 6. What this file does not claim

- That anyone will pay for an audit, a sprint or a billing pack.
- That agent-built drift is a weekly pain for 2–20-person teams.
- That decision memory is wanted. No evidence for it was found, for or against.
- That the evidence files are interviews. They are 90 public rows; the interview log is still empty.
