# Wave Decisions — AI-native DS kit beta (Master)

**Feature ID:** ai-native-ds-kit-beta
**Purpose:** The master log of key decisions across all waves. It is append-only; earlier entries
are not modified.
**Started:** 2026-10-11

---

## DISCOVER (in progress)

Full log: `discover/wave-decisions.md`.

| Decision | Confidence | Status |
|---|---|---|
| DSC-1: The problem is agent-built UI drift plus lost reasons, not Figma ↔ code sync | MEDIUM | Test in G1 (H1) |
| DSC-2: The kit is the on-ramp, not the moat | HIGH | Desk-validated |
| DSC-3: The lane is decision memory (prototype → measure → decision → write-back) | MEDIUM-HIGH | Desk-validated; test in G1 (H5) |
| DSC-4: Package Vero's method, not the unused tooling | HIGH | Desk-validated |
| DSC-5: Never sell UI code | HIGH | Desk-validated |
| DSC-6: Traffic and conversations are the binding constraint | HIGH | Measured |
| DSC-7: Safety fixes come before distribution | HIGH | Measured (bugs reproduced) |

**Gate G1: OPEN** (0/5 interviews · 0/1 commitments).

Added 2026-10-11 (second DISCOVER pass: Phase 1–4 documents drafted; still desk-level):

| Decision | Confidence | Status |
|---|---|---|
| DSC-8: H1 restated: drift is recurring and survives teams' own remedies ("weekly" and "no system" dropped) | MEDIUM | Test in G1 (H1) |
| DSC-9: The loudest public drift voices are DS maintainers, not 2–20-person product teams; ICP stays a hypothesis | LOW-MEDIUM | Test both segments in G1 |
| DSC-10: Audit value rests on prioritisation, a named decider and the decision record, not detection | MEDIUM | Test in G1 (H2) |
| DSC-11: Sprint price is far above visible buyer budgets; test a smaller fix pack | LOW | Test (E6) |
| DSC-12: Billing value is wiring and unit design, not a UI; respect BillingSDK's GPL-3.0 | MEDIUM | Desk-validated |
| DSC-13: Decision memory has no demand evidence, for or against; test it first | HIGH (that none exists) | Test (A7, S5) |
| DSC-14: Anthropic is the incumbent for scheduled/CI sync; position as the complement | MEDIUM | Watch; ask in G1 |
| DSC-15: The G1 recruiting plan is fixed in advance (6 booked floor; hard check Fri 23 Oct; extend, do not lower) | HIGH (as a plan) | Plan only; nothing sent |

Gates: **G1 OPEN · G2 not passed (blocked) · G3 not started · G4 not started.** No peer review requested.

## DIVERGE (draft)

Full recommendation: `diverge/recommendation.md` · options: `diverge/options-raw.md`.

| Decision | Choice | Confidence | Status |
|---|---|---|---|
| DIV-1: Packaging | **P3 now** (MIT kit + free scorecard + paid audit report + implementation) → **P5 later** (scheduled loop subscription); P2 only as a wired + instrumented pack | MEDIUM | Draft; re-score after G1 |
| DIV-2: Presentation | **S1**: evolve `packages/app` into one app with two layouts (Design Hub static export + App Shell), with a Design Studio-compatible layout | MEDIUM | Draft |
| DIV-3: Reference stack | **K1**: Next.js + Tailwind v4 + shadcn registry; Tamagui as a token emitter only | HIGH | Draft |
| DIV-4: Positioning | **L1+L2**: "the design system agent for AI-native products … loops that remember why" | MEDIUM | Draft; freeze via ADR-023 |
| DIV-5: ICP | AI-native product teams of 2–20 on Next/shadcn with Claude Code/Cursor, monetized via subscription + usage | LOW-MEDIUM | Hypothesis; G1 decides |
| DIV-6: Ladder | Free kit · free scorecard · Report €490 · Sprint from €4.5k / 2 wk · pack bundled · loop later | LOW-MEDIUM | Launch hypotheses; one file, one ADR |

## DISCUSS: not started (after G1)

## DESIGN: early draft only

- `design/presentation-ia.md`: Design Hub + App Shell IA (DRAFT, not a decision).
- Pending ADRs:
  - **ADR-023**: beta direction freeze (line, ICP, ladder; external review triggers).
  - **ADR-024**: kit-first layout (`design/` required again; `prototypes/` manifests; one queue),
    which supersedes the v6 "DS optional" choice recorded only in `layout.js`.
  - **ADR-025**: licence boundary (MIT kit vs private pack and report internals).
  - Amend ADR-010/016/021 (presentation) and ADR-012 (reference stack).
