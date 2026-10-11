# DISCOVER — wave decisions · ai-native-ds-kit-beta

**Date:** 2026-10-11
**Status:** IN PROGRESS. The desk research (evidence brief) is complete. **G1 is not passed:**
0 / 5 interviews, 0 / 1 commitment signals.
**Inputs:**
- `current-state.md`
- `strategy-history.md`
- `reference-instances.md`
- `market-landscape.md`
- `interview-log.md`

## Key decisions (desk-research level; confidence capped until G1)

| ID | Decision | Confidence | Basis |
|---|---|---|---|
| DSC-1 | **The problem worth solving is "agents build UI that drifts from the design system, and nobody remembers why a rule exists"**, not "keep Figma and code in sync" | MEDIUM | Vero's drift record; the consumer app's hidden drift; the client prototype drifted in 48 h; HN signals; Claude Design and @shadcn/lint shipping DS governance |
| DSC-2 | **The kit is the on-ramp, not the moat.** DS-as-context, linting and drift checks are commoditized (Oct 2026) | HIGH | DESIGN.md lint, @shadcn/lint, Claude Design `/design-sync`, OpenDesign ~100k★ |
| DSC-3 | **The uncontested lane is decision memory**: prototype → hypothesis → measurement → decision written back into the DS | MEDIUM-HIGH | No surveyed tool covers column (c); this matches the April beta brief's axis (c) |
| DSC-4 | **Package the method that worked (Vero), not the tooling that didn't get used** | HIGH | Vero reached score 77 → 88 and dozens of DS releases using conventions only; it never used the Systemix CLI, MCP or config |
| DSC-5 | **Never sell UI code.** Charge for audit, implementation, wiring + instrumentation, and later the loop and its data | HIGH | Tailwind Labs 2026 (−80% revenue, sold); AI Elements, shadcn chat and Autumn UI are free |
| DSC-6 | **Traffic and conversations are the binding constraint**, not features | HIGH | ~100 visitors a month, 1 star, 0 interviews; A/B tests can't resolve at this volume |
| DSC-7 | **Fix the safety bugs before any distribution push** | HIGH | `npx systemix` resolves to a third-party package; `init` re-run wipes data; ids are not path-safe |

## Constraints

- **Solo founder.** Every phase must be runnable by one person plus agents.
- **Public repo.** Private-repo internals (Vero, client work) appear only as patterns; client
  material is never named.
- **ADR-009 stays:** the DS package carries no analytics. CLI usage counts are opt-in and anonymous.
- **ADR-019 stays:** the engine is Claude Code; there is no local-LLM dependency.
- **Write-policy stays:** self-modification of skills and guardrails is always HITL.

## Validated (desk research only; do not over-trust)

- V-A: The DS-as-context and lint categories are crowded and free.
- V-B: Audits are a proven paid format, with established price ranges.
- V-C: The Systemix method improves DS quality measurably (Vero's score loop).

## Invalidated / retired

- **"Systemix builds itself"** as a current claim. The engine never generated anything, and no
  public cycle exists.
- **The local-LLM moat** (Hermes/Ollama), already retired by ADR-019.
- **Landing A/B tests as evidence** at this traffic level.

## Open: blocks the exit of DISCOVER

- **G1:** at least 5 real interviews about past behaviour, plus ≥1 commitment (ideally a pre-paid
  audit). See `interview-log.md` for the hypotheses H1–H5.
