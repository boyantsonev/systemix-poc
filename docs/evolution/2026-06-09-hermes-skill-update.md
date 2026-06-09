# Evolution — hermes-skill-update

> Finalized 2026-06-09 · QUALITY_GATE closure of an already-delivered feature
> Wave trail: DISCUSS → SPIKE → DESIGN → DISTILL (formal) · DELIVER done directly (no nWave roadmap) · QUALITY_GATE (this session)

## Summary
When a hypothesis decision is committed (promote/kill), Hermes appends a record of that
decision to the relevant `SKILL.md`'s "## Past Decisions" section — closing the loop so the
skill that proposed an experiment learns from its outcome. Implemented as an isolated module
invoked fire-and-forget after the contract write succeeds, with an Ollama availability probe,
bounded retries, atomic writes, and HITL escalation for structural changes.

## Business context
This is the "agent writes the map, human approves, map stays live" loop applied to skills
themselves. Hypotheses already drive UI/workflow/value-prop experiments; this feature makes a
closed experiment feed back into the skill's institutional memory automatically, instead of a
human remembering to hand-edit a SKILL.md.

## What shipped
| Artifact | Path |
|---|---|
| Implementation (the driving port `update()`) | `packages/cli/src/commands/skill-update.js` |
| Acceptance + mutation-hardened tests (22 scenarios) | `packages/cli/tests/acceptance/hermes-skill-update/skill-update.test.js` |
| Trigger point — dashboard queue resolution | `src/app/api/queue/route.ts` |
| Trigger point — CLI evidence close | `packages/cli/src/commands/evidence.js` |
| Mutation-testing harness | `packages/cli/stryker.conf.json` |
| Mutation report (55.49% → 87.28%) | `docs/feature/hermes-skill-update/deliver/mutation/mutation-report.md` |

## Key decisions (from DESIGN wave-decisions)
- **[D1] Isolated module**, not in-place extension of `applyHypothesisDecision` (preserves SRP)
  nor an event bus (no bus exists; one consumer doesn't justify it).
- **[D2] Trigger on `ok: true`** after the contract write — never on a failed write (no stale
  skill updates); fire-and-forget so the dashboard response isn't blocked.
- **[D3] Skill resolution** from `skill-tags` frontmatter, defaulting to the `hermes` skill;
  never creates a skill file, only patches existing ones.
- **[D4] Change classification by regex diff**, not model judgment — `structural` (a `## `
  heading added/removed/renamed) vs `bullet-level`. Structural ⇒ HITL review card.
- **[D5] Ollama probe `/api/tags` before generate**; silent skip (not error) when absent —
  Ollama is an optional local dependency, missing in CI/most machines.
- **[D6] Atomic write** `SKILL.md.tmp` → `renameSync` — the established codebase pattern.
- **[D7] Retry cap of 2 (500ms flat delay)**; on second failure push a `skill-update-failed`
  HITL card. No exponential backoff (would hold the event loop for a best-effort action).

## Design → implementation drift (recorded)
- The DESIGN wave placed the module at `src/lib/skill-update.js` called only from
  `src/app/api/queue/route.ts`. It actually landed at **`packages/cli/src/commands/skill-update.js`**
  and is wired into **two** trigger points (the dashboard queue route *and* the CLI
  `evidence` close command). Relocating to `packages/cli` let both the app and the CLI share
  one implementation. Behavior matches the design; the location and second trigger point are
  the deltas.

## QUALITY_GATE — the reason this session exists
The feature was already implemented and its suite was green (11/11), but memory still framed it
as "9 `@skip` tests, DELIVER never run." Re-verification showed **19/19 green** — DELIVER had
happened directly, outside nWave. The methodologically-correct closure was therefore not to
re-run DELIVER but to **prove the green suite actually catches bugs**:

- Stryker mutation testing scored the suite at **55.49%** — nearly half of injected bugs slipped
  through (unasserted HITL-card fields, the untested bullet-level branch, unasserted log payloads).
- Hardened with **+11 scenarios / stronger assertions** (no source change) → **87.28%**, clearing
  the 80% gate. 22 surviving mutants documented as equivalent (default `utf8` encoding,
  rename-onto-self, retry timing, non-deterministic timestamps, unreachable parse branches).

**Lesson:** "green suite" ≠ "good suite." A passing acceptance suite written before mutation
testing left ~45% of the implementation's behavior unpinned. Mutation testing is the gate that
turns acceptance coverage into bug-catching coverage — worth running on every feature that
matters, not just new ones.

## Lessons learned
- **Memory drifts from reality.** The stale `@skip`/DELIVER note would have sent a whole session
  re-delivering finished work. Re-verify state (`npm test`) before acting on a memory claim.
- **Features delivered outside nWave still deserve closure.** No `roadmap.json` / `execution-log.json`
  existed, so the formal finalize gates didn't apply; this evolution doc + the mutation gate are
  the graceful-degradation substitute.

## Workspace
`docs/feature/hermes-skill-update/` is **preserved** (the wave matrix derives status from it).
No architecture/ADR/scenario/UX artifacts existed to migrate — only `spike/`, `design/`,
`distill/` wave-decisions (summarized above) and the new `deliver/mutation/` report.
