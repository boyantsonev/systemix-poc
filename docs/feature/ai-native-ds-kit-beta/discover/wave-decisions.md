# DISCOVER — wave decisions · ai-native-ds-kit-beta

**Date:** 2026-10-11
**Status:** IN PROGRESS. Desk research and the four Phase 1–4 documents are drafted. **G1 is not
passed:** 0 / 5 interviews, 0 / 1 commitment signals. G2, G3 and G4 are blocked behind it. No peer
review has been requested (the nWave rule requires G1–G4 to pass first).
**Inputs:**
- `current-state.md`
- `strategy-history.md`
- `reference-instances.md`
- `market-landscape.md`
- `interview-log.md` (guide, hypotheses, recruiting plan, screener, outreach kit, debrief template)
- `evidence/` (90 public evidence rows, R1–R3, plus the recruiting map R4; secondary, not interviews)

**Phase documents:**
- `problem-validation.md` — Phase 1: verdicts, assumption register (15), G1 check
- `opportunity-tree.md` — Phase 2: 9 opportunities, job map, desk-estimated scores (not valid for G2)
- `solution-testing.md` — Phase 3: 7 hypotheses, 6 experiments, decision rules (nothing run)
- `lean-canvas.md` — Phase 4: candidate canvas, four big risks (value RED, viability RED), pivot options

## Key decisions (desk-research level; confidence capped until G1)

| ID | Decision | Confidence | Basis |
|---|---|---|---|
| DSC-1 | **The problem worth solving is "agents build UI that drifts from the design system, and nobody remembers why a rule exists"**, not "keep Figma and code in sync" | MEDIUM | Vero's drift record; the consumer app's hidden drift; the client prototype drifted in 48 h; HN signals; Claude Design and @shadcn/lint shipping DS governance |
| DSC-2 | **The kit is the on-ramp, not the moat.** DS-as-context, linting and drift checks are commoditized (Oct 2026) | HIGH | DESIGN.md lint, @shadcn/lint, Claude Design `/design-sync`, OpenDesign ~100k★ |
| DSC-3 | **The uncontested lane is decision memory**: prototype → hypothesis → measurement → decision written back into the DS | MEDIUM-HIGH | No surveyed tool covers column (c); this matches the April beta brief's axis (c). **See DSC-13: no demand evidence yet** |
| DSC-4 | **Package the method that worked (Vero), not the tooling that didn't get used** | HIGH | Vero reached score 77 → 88 and dozens of DS releases using conventions only; it never used the Systemix CLI, MCP or config |
| DSC-5 | **Never sell UI code.** Charge for audit, implementation, wiring + instrumentation, and later the loop and its data | HIGH | Tailwind Labs 2026 (−80% revenue, sold); AI Elements, shadcn chat and Autumn UI are free |
| DSC-6 | **Traffic and conversations are the binding constraint**, not features | HIGH | ~100 visitors a month, 1 star, 0 interviews; A/B tests can't resolve at this volume |
| DSC-7 | **Fix the safety bugs before any distribution push** | HIGH | `npx systemix` resolves to a third-party package; `init` re-run wipes data; ids are not path-safe. **Fixed on `main` 2026-10-11 (PRs #125–#127, #130) but not published: npm `latest` 0.2.0 is still unsafe** |
| DSC-8 | **Restate H1: drift is recurring and survives the remedies teams already run.** Drop "weekly" and "no system" from the claim | MEDIUM | R1: 15 past-behaviour rows, 6 of them rated strong; DIY stacks seen (R1-27, -29, -30); no weekly cadence found |
| DSC-9 | **The loudest public drift voices are design-system maintainers, not 2–20-person product teams.** The ICP stays a hypothesis; test both | LOW-MEDIUM | R1 sample skew (GitHub-active; Digdir, Equinor, B.C., Orange, Workday); no founder voice on drift in the strong rows |
| DSC-10 | **Audit value cannot rest on detection.** It has to rest on prioritisation, a named decider and the decision record | MEDIUM | R2-04 (blocker was five undecided questions), R2-05 (deterministic checks preferred), R2-07/-08 (free MIT skills, Claude Design) |
| DSC-11 | **The sprint price sits far above visible buyer budgets.** Test a smaller fix pack (E6); aim sprints at DS teams and agencies | LOW | R2-12 to -17: $100–$720 budgets seen; R2 puts €4.5k per two weeks 6x–45x above |
| DSC-12 | **Billing: the paid value is wiring and unit design, not a UI.** The plumbing lane is taken (Autumn, Polar, Stripe); free UI blocks exist; respect BillingSDK's GPL-3.0 | MEDIUM | R3-01, -03, -22 to -26 |
| DSC-13 | **Decision memory has no demand evidence, for or against.** Make it the first thing tested live (A7, S5) | HIGH (that none exists) | Zero rows in R1 and R2 ask for it; the one uncovered job step is "Conclude" |
| DSC-14 | **Anthropic is the incumbent for a scheduled or CI sync.** Position as the complement, not a substitute | MEDIUM | R1-05 (four users on one issue), R1-25 (Claude Design), `/design-sync` |
| DSC-15 | **The G1 recruiting plan is fixed in advance:** 6 booked is the floor, 180 personalised invites front-loaded, checkpoint Tue 20 Oct, hard check Fri 23 Oct, extend G1 by a week rather than lower the bar | HIGH (as a plan) | `evidence/R4` volume arithmetic; `interview-log.md` |

## Phase tracker (nWave state)

```yaml
current_phase: 1
phase_started: 2026-10-11
interviews_completed: { phase1: 0, phase2: 0, phase3: 0, phase4: 0 }
assumptions_tracked: 15            # problem-validation.md §4; 11 score >12 (test first)
opportunities_identified: 9        # opportunity-tree.md; scores are desk estimates, not valid for G2
decision_gates_evaluated:
  G1: OPEN        # 0/5 interviews, 0/1 commitments
  G2: NOT PASSED  # blocked by G1
  G3: NOT STARTED
  G4: NOT STARTED
peer_review: not requested
artifacts_created:
  - discover/problem-validation.md
  - discover/opportunity-tree.md
  - discover/solution-testing.md
  - discover/lean-canvas.md
  - discover/interview-log.md
  - discover/evidence/{README,R1,R2,R3,R4}.md
```

## Constraints

- **Solo founder.** Every phase must be runnable by one person plus agents. nWave principle 7
  (PM + designer + engineer together) cannot be met literally; a named second reviewer is an open
  question for the founder.
- **Public repo.** Private-repo internals (Vero, client work) appear only as patterns; client
  material is never named. The evidence copies here drop contact routes and personal handles.
- **ADR-009 stays:** the DS package carries no analytics. CLI usage counts are opt-in and anonymous.
- **ADR-019 stays:** the engine is Claude Code; there is no local-LLM dependency.
- **Write-policy stays:** self-modification of skills and guardrails is always HITL.

## Validated (desk research only; do not over-trust)

- V-A: The DS-as-context and lint categories are crowded and free.
- V-B: Audits are a proven paid format, with established price ranges. *(Supply side only; no buyer
  account found: H2 stays unproven.)*
- V-C: The Systemix method improves DS quality measurably (Vero's score loop).
- V-D: Agent-built UI drift is real, costly and documented in public (R1, 15 past-behaviour rows).
- V-E: Credits and usage **plumbing** pain is real (R3); the end-user **unit** confusion is real.

## Invalidated / retired

- **"Systemix builds itself"** as a current claim. The engine never generated anything, and no
  public cycle exists.
- **The local-LLM moat** (Hermes/Ollama), already retired by ADR-019.
- **Landing A/B tests as evidence** at this traffic level.
- **H1's "no system for it".** Contradicted by the public record: teams run rules files, lint, CI.
- **A billing UI as the flagship paid feature** (DSC-12).

## Open: blocks the exit of DISCOVER

- **G1:** at least 5 real interviews about past behaviour, plus ≥1 commitment (ideally a pre-paid
  audit). See `interview-log.md` for H1–H5, the screener, the outreach kit and the debrief template.
  Deadline Sun 1 Nov; hard check Fri 23 Oct.
- **Who the founder can reach.** Names, channels and partner access are needed to book anyone. Nothing
  has been sent, posted or joined, and no mailbox, contact list or calendar has been read.
