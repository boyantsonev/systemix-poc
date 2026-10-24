---
title: "Solution testing — AI-native DS kit beta"
wave: DISCOVER
phase: 3 — Solution testing
feature: ai-native-ds-kit-beta
date: 2026-10-11
status: "TEST PLAN, plus one dry run of E4 (own repo, no buyer; §5). No hypothesis is tested. G3 NOT STARTED (blocked by G1 and G2)."
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

## 5. E4 dry run (2026-10-11): what it did and did not show

**Scope.** One concierge audit of `systemix-poc` itself at commit `64ff960`, run three times blind
(three agents, same skills: `readiness-audit`, `design-audit`, `drift-report`), then every claim
checked by two independent refuters against the audited commit. This is a **dry run of E4's
mechanics**, not E4: the repo is the founder's own, there was no reader and no price, and it
cannot move S2 or S7. The two other planned audits (a public shadcn repo, a partner repo) have not
been run.

| Measure | Result |
|---|---|
| Score reproducible? | **No.** Overall readiness 63 / 55 / 60 (range 8, SD about 4). Health 60 / 68 / 66, drift control 77 / 75 / 80. The two refuters anchored the overall score at about 73 and about 60, so the defensible band is roughly 55–73 |
| What does reproduce | The bottom dimension (agent legibility, last in all three) and the top-3 set (captured rationale, component consistency, codified rules), but not their order. "Most underserved dimension" was ruled false: it is a tie within noise |
| Why the scores differ | Definitions the skills leave open (count → satisfaction conversion, health and drift-control formulas, file population, severity threshold N, tie-breaks), not different readings of the repo. Importance weights were identical only because all three copied the skill's example. The skill's own worked example is also inconsistent (satisfactions 2, 3, 4, 5, 5, 5 sum to 40, shown as 48) |
| Claim precision | 176 unique claims: **121 hold (68.8%)**, 34 partly (19.3%), 21 false (11.9%), 16 material errors (9.1%). By kind: counts 63.7% hold, presence checks 87.9%, judgements 75%. Where the runs agreed (134 claims) 81.3% hold; where they disagreed (42) only 12 hold. Seven of the 21 false verdicts are on score composites, not miscounted facts |
| Agent cost of one audit | About 25 minutes wall-clock and about 212k tokens and 68 tool calls **per run** (636,379 tokens and 203 tool calls for the three) |
| Cost of the verification pass | **Not in the figure above and far larger.** The claim check ran 354 agents, about 29.3M subagent tokens and about 3.3 hours, because the cluster step produced 176 unique claims, not the roughly 60 I planned for. This is a cost I mis-sized, not a measure of what one customer audit costs; it does show that "verify every claim" cannot be the delivery model |
| Human review time | **Not measured.** The estimate of about 90 minutes (75–120), falling to about 45 once counters and formulas are pinned, is a task decomposition, not a stopwatch |
| Would a buyer pay? | **Unknown.** One repo, written by the tool's author, no buyer, no price. The repo is unusually rich in contradictions of its own making |

**Verified findings that carry real value** (all re-derived by refuters; these, not the score, are
what a buyer would be paying for):

1. **Documentation contradicts code in four places.** `design/tokens.css`, which `CLAUDE.md`, the
   skills and the `init` template all assume, does not exist (2 of the 6 spine members). `CLAUDE.md`
   and ADR-002 mandate oklch; the token source has 0 oklch declarations and 106 hex literals. Two
   contract token records say `status: clean` while holding values that contradict the code
   (`color-primary` and `radius`). `scripts/generate-design-md.ts` writes a root `DESIGN.md` that does
   not exist, and no ADR mentions the rebrand.
2. **A type scale that is declared and dead.** 9 `--font-size-*` and 10 `--space-*` tokens with 0
   consumers, against 265 arbitrary `text-[Npx]` sizes in 39 files; 176 of them equal an existing
   token. `guardrails.mdx` has no type-size or spacing rule, so no local rule is broken.
3. **Drift is measured three incompatible ways and none is scheduled.** The CLI scanner scores 0
   (it counts the token source as 139 critical hits); the repo's own script scores 68 (colour only,
   exits 0 always, wired to no workflow, last snapshot 95 days old).
4. **Canonical primitives bypassed.** 25 raw `<button>` outside `ui/` in 14 files (none with a
   `focus-visible` class), 3 Badge implementations, and the canonical Badge and Card are used only
   in files nothing imports.
5. **Pre-rebrand residue** only a principle-aware audit finds (cool navy rgba values in
   `SystemGraph3D.tsx` against the "warm, never cold" principle), and **agent-legibility gaps**
   (root `CLAUDE.md` never says to read `guardrails.mdx` before UI work; 1 of the 11 skills it names
   is installed).

**Consequences for the plan** (proposals; none acted on):

- Do not put a single point score in front of a buyer until it reproduces within a stated tolerance
  (for example ±3). Lead with the verified findings and show a band.
- Before audit #2: ship a deterministic counters script that emits JSON; pin importance constants,
  count → satisfaction tables, health and drift-control formulas, severity N=1, tie-breaks and
  setup-class thresholds under a rubric version; fix the CLI (lazy-require commands so `drift` runs
  without unrelated dependencies, take the token source from config, honour or warn on a positional
  path, drop the saturating score); make the skills embed the queue card in the report instead of
  writing to the queue.
- Run audit #2 on a repo the author did not write, with the fixed skills and the same blind-run
  design, and **time one human reviewer**. Record dollars including any verification pass.
- Test willingness to pay separately (E2): show the findings without the score to real prospects
  and ask for a price.
- Success criterion E4 stays "each audit ≤1 working day by the third; ≥1 reader acts within 14
  days". Nothing here satisfies it.

**Status 2026-10-13.** Built on `claude/gifted-goodall-3iib00`: the counters script
(`systemix audit counters`, 354 mechanical counters, byte-identical across runs, about 0.4 s on this
repo, see `packages/cli/src/lib/counters/README.md`) and the `drift` fix (runs without gray-matter,
token source resolved and exempted, positional dirs honoured, clean-file score, `--dry-run`). Against
the dry run's verified values it reproduces every one except the explained differences (HTML entities
no longer counted, the ages move with HEAD, the repo grew). **Not done:** the three skills' SKILL.md files
do not call the report yet, so formulas, importance weights and tie-breaks are still unpinned, and no
second audit has been run. The ~29M-token verification pass is not what a customer audit would cost;
it was the check on the dry run.
