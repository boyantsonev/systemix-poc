---
feature: hermes-skill-update
wave: DISTILL
created: 2026-05-07
author: Quinn (acceptance-designer)
status: accepted
---

# Wave Decisions — Hermes Skill Update (DISTILL)

Decisions made during the DISTILL wave acceptance test design for `hermes-skill-update`.

---

## [DWD-01] Walking Skeleton Strategy: B — Real Local + Fake Costly

**Decision:** The walking skeleton uses a real temporary filesystem for all local I/O
(SKILL.md, queue.json, hypothesis contracts) and a fake (injected fetch stub) for Ollama
HTTP calls.

**Strategy classification:** Strategy B — the local resource (filesystem) is always
available and cheap; the external resource (Ollama at localhost:11434) is optional,
locally-operated, and not guaranteed to be running in CI or on any developer machine
other than the one that ran the spike.

**Rationale:**

The DESIGN wave identified two driven adapters:
1. Filesystem (SKILL.md, queue.json, hypothesis MDX) — local, synchronous, always available.
2. Ollama HTTP adapter (probe + generate) — local but optional; must not be assumed present.

Strategy B is the correct classification because:
- The filesystem adapter is real in the walking skeleton: the test writes a real SKILL.md
  to a real tmpdir and asserts the file content changed. This catches path resolution bugs,
  atomic write failures, and frontmatter parse errors — the class of bugs InMemory doubles
  cannot detect.
- The Ollama adapter is faked via an injected fetch function. Faking is justified because:
  (a) Ollama is explicitly documented as an optional dependency (DESIGN wave D5),
  (b) the SPIKE confirmed Hermes behaviour on the real model — the acceptance test does
      not need to re-confirm model quality, only module wiring,
  (c) a live Ollama dependency would make CI non-deterministic and block developers
      without the model installed.
- The fake Ollama is deterministic and covers: available, unavailable (ECONNREFUSED),
  model-absent, and fail-generate paths — all documented failure modes from architecture
  brief and DESIGN wave D5/D7.

**Adapter coverage table:**

| Adapter | Strategy B tier | Test type | Notes |
|---------|----------------|-----------|-------|
| Filesystem (SKILL.md write) | Real I/O | Walking skeleton + AC-6 | Uses os.tmpdir() tmp workspace |
| Filesystem (queue.json write) | Real I/O | AC-3, AC-7 | Same tmp workspace |
| Filesystem (hypothesis MDX read) | Real I/O | All scenarios | Written in beforeEach via writeContract() helper |
| Ollama probe (GET /api/tags) | Fake (fetch stub) | All scenarios | Injected via opts.fetch |
| Ollama generate (POST /api/generate) | Fake (fetch stub) | AC-1, AC-3, AC-7, error paths | Injected via opts.fetch |

**No container needed.** All local resources are on the same POSIX filesystem as the test
runner. renameSync atomicity is guaranteed by the platform (macOS/Linux — same filesystem).

---

## [DWD-02] Test Framework: Jest (CommonJS)

**Decision:** Jest is established as the test framework for `packages/cli/`. The test file
uses CommonJS `require()` to match the existing CLI module style (all existing commands are
`"use strict"` CommonJS — see `evidence.js`, `schedule.js`, etc.).

**Rationale:**

- No test framework existed in `packages/cli/` before this wave (`package.json` had no
  `scripts` or `devDependencies`).
- Jest is the most widely used Node.js test framework, has zero config for CommonJS modules,
  and does not require a build step.
- The project's existing CLI style is CommonJS (`"use strict"`, `module.exports`, `require`).
  Using Jest with CommonJS means no transpilation, no ESM interop configuration, and no
  additional toolchain surface area — consistent with the project's stated principle of
  zero new npm dependencies for production code (tests are devDependencies only).
- Cucumber/Gherkin was considered and rejected: the project has no Gherkin toolchain, no
  `.feature` file infrastructure, and no stakeholder workflow that depends on Gherkin reports.
  Jest describe/it blocks with Given-When-Then naming in comments satisfy the BDD intent
  without the overhead.

**Version pinned:** `jest@^29.0.0` — Node 18+ compatible, no peer dependency conflicts
with an otherwise empty devDependencies section.

---

## [DWD-03] Driving Port: `skillUpdate.update()` Direct Function Call

**Decision:** Tests invoke `skillUpdate.update(hypothesisId, decision, card, opts)` as the
driving port. This is the module's public surface and the only entry point the PATCH handler
and CLI close command will call.

**Why this is the correct driving port:**

The architecture SSOT (brief.md) identifies two trigger points for skill update:
1. `PATCH /api/queue` — the Next.js route handler
2. `systemix evidence close` — the CLI command

Both will call `skillUpdate.update()` after `applyHypothesisDecision` returns `ok: true`.
The acceptance tests invoke `skillUpdate.update()` directly — not the HTTP handler and not
the CLI command — because the feature boundary is the skill-update module itself. The trigger
points are pre-existing code that the DELIVER wave will instrument; the skill-update module
is the new production code being specified.

Testing through the PATCH handler would require a full Next.js test environment and would
conflate two features (queue resolution + skill update). Testing through the CLI `close`
command would require the full evidence.js wiring. Neither is needed to specify the
skill-update behaviour.

The `opts` parameter (workspaceRoot, fetch, onLog) provides the injection points for
test doubles without exposing them in the production call site (where defaults apply).

---

## Scenario Count and Coverage

| Category | Count | % of total |
|----------|-------|-----------|
| Walking skeleton (AC-1) | 1 | 9% |
| Happy path / AC coverage (AC-4, AC-5, AC-6, AC-7) | 4 | 36% |
| Error / failure paths (AC-2, AC-3 + 3 error scenarios) | 5 | 46% |
| **Total** | **10** | **100%** |

Error path ratio: 46% — exceeds the 40% minimum.

AC traceability:

| AC | Scenario |
|----|----------|
| AC-1 | Walking skeleton — approved hypothesis results in Past Decisions entry |
| AC-2 | Hermes unavailable — SKILL.md not written, health.startup.refused emitted |
| AC-3 | Hermes fails after 2 retries — skill-update-failed card in queue |
| AC-4 | skill-tags: [hermes] — write targets hermes skill file |
| AC-5 | No skill-tags — write defaults to hermes skill file |
| AC-6 | Atomic write — no .tmp file left after successful update |
| AC-7 | Structural change — skill-update-review card written, write proceeds |
| (error) | Missing hypothesis contract — update skips gracefully |
| (error) | Skill directory absent — update skips without creating directory |
| (error) | Hermes model absent from Ollama — health.startup.refused with model-absent |
| (error) | Hermes output missing heading — write refused, retry, skill-update-failed card |

---

## Reconciliation Log

| Item | Source | Action |
|------|--------|--------|
| Walking skeleton — no existing WS from SPIKE | spike/wave-decisions.md (DISCARD) | Auto-detected Strategy B; declared in DWD-01 |
| Test framework absent | packages/cli/package.json (no scripts/devDependencies) | Jest established; package.json updated |
| No DISCUSS wave for hermes-skill-update | Task description | Used architecture AC-1..AC-7 as scope boundary |
| No devops/ directory | Task description | Default environment (local Node.js 18+, no container) |
| KPI contracts absent | docs/product/kpi-contracts.yaml (not present) | Skipped @kpi scenarios; warning logged — no KPI contract found |
| Trigger point 2 (evidence close CLI) | packages/cli/src/commands/evidence.js | Confirmed close() calls writeDecisionToContract(); skill update will be added after that call. Acceptance tests invoke update() directly — both trigger points exercise the same module. |
| applyHypothesisDecision location | src/app/api/queue/route.ts lines 251-258 | Confirmed pattern; skill update called after ok:true guard. |
| Pure functions (resolveSkillPath, classifyChange, buildPatch) | architecture/brief.md | Exercised indirectly through update() driving port; unit tests for pure functions are DELIVER wave responsibility |
