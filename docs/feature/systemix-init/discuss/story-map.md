# Story Map: `npx systemix init`

## User: Design partner (G1 client) — Priya Mehta, frontend lead installing Systemix into a foreign repo
## Goal: Install a working, self-contained Systemix instance in one command — skills, config, and contracts — so the loops run locally and in CI from day one (JOB-002)

---

## Backbone

Activities in chronological order as the user moves through `npx systemix init`:

| (1) Choose Surfaces | (2) Provide Credentials | (3) Set Autonomy | (4) Set Self-Improvement | (5) Verify Artifacts |
|---------------------|-------------------------|------------------|--------------------------|----------------------|
| Answer surfaces prompt (1/2/3) | Enter Figma URL or key (or skip) | Answer autonomy prompt | Answer self-improvement prompt | Check files on disk |
| Understand surface ↔ pipeline mapping | Enter Figma PAT (or skip) | Understand conservative/balanced/progressive | Understand off/audit/tuning/auto | Verify .gitignore updated |
| Understand surfaces ↔ YAML field mapping | Enter PostHog key (or skip) | — | — | Verify MCP registered (or read snippet) |
| — | Handle invalid Figma URL input | — | — | — |

---

## Walking Skeleton

The thinnest end-to-end slice that proves the full init flow works:

- **(1)** Answer "3" (both surfaces, default) — covers the `doDesign && doHypo` branch
- **(2)** Skip all credentials (press Enter) — covers the `!fileKey` guard and skip paths
- **(3)** Press Enter (default: balanced)
- **(4)** Press Enter (default: audit)
- **(5)** Assert all 15 skill dirs exist, all 4 contract dirs exist, `systemix.config.yaml` written with correct trust tiers, `.gitignore` updated with 3 entries, MCP fallback snippet printed (no real Claude config in tmp)

This one test exercises every major branch in `init()` at least once. It is the walking skeleton for US-01 AC-3 (both surfaces) combined with US-05 AC-1 (trust tiers) and US-04 AC-1 (gitignore) and US-07 AC-1 (MCP fallback).

---

## Test Scenario Slices

Since the implementation exists, story map slices correspond to **test clusters**, not feature releases. Each cluster is independently testable.

### Cluster 1: Surface Selection and Skill Install (US-01)
Target outcome: a partner can predict exactly which dirs exist on disk from their surface choice.

- Design-system only → 6 skill dirs, no hypothesis dirs
- Hypothesis-validation only → 9 skill dirs, no design-system dirs
- Both → 15 skill dirs, 3 contract dirs
- YAML surfaces field uses surface names (design-system / landing, onboarding), not pipeline dir names

Dependencies: real `packages/cli/pipelines/` on disk. No prompt injection needed for the skill-install branch (no interactive prompt after surface choice for this assertion).

### Cluster 2: Figma Key Input Loop (US-02)
Target outcome: a partner can connect any valid Figma URL format or skip without init crashing.

- Full design URL → correct key extracted
- Bare key → accepted
- Invalid URL → loops (no exit)
- Empty Enter → skip, no `project-context.json`

Dependencies: `opts.prompt` injection (critical path). `extractFileKey()` is independently unit-testable.

### Cluster 3: Idempotency and Reconfigure (US-03)
Target outcome: re-running init is always safe; `--reconfigure` is the explicit opt-in to overwrite.

- Re-run without flag → config untouched
- Re-run with `opts.reconfigure = true` → config overwritten
- First run → always writes

Dependencies: real tmp filesystem. No prompt injection needed (only file assertion).

### Cluster 4: Gitignore Augmentation (US-04)
Target outcome: `.gitignore` is always clean after init, even after multiple runs.

- No existing `.gitignore` → created with 3 entries
- Existing `.gitignore` with no systemix entries → 3 entries appended
- Re-run → no duplicates
- Partial entries → only missing ones appended

Dependencies: `ensureGitignore()` is independently unit-testable (pure function on real fs).

### Cluster 5: Trust Tiers and YAML Structure (US-05 + US-06)
Target outcome: generated YAML matches choices exactly, trust is always 0, SI controls `contract/meta/`.

- All autonomy choices → `orchestrator_tier: 0` and `hermes_tier: 0`
- `siMode = "off"` → no `contract/meta/`, no `meta_contract` line in YAML
- `siMode != "off"` → `contract/meta/` exists, `meta_contract` line in YAML

Dependencies: `buildConfigYaml()` is a pure function, fully unit-testable without prompt injection.

### Cluster 6: MCP Fallback (US-07)
Target outcome: init never crashes when no Claude config exists; manual snippet is always printed.

- `detectClients` returns empty → snippet printed, all file writes still complete
- `detectClients` returns real clients → `registerServer()` called, no snippet

Dependencies: `opts.detectClients` and `opts.registerServer` injection.

### Cluster 7: Skip Flow File Guards (US-08)
Target outcome: skipping Figma/PostHog leaves no artifact that would mislead downstream skills.

- Skip Figma key → no `project-context.json`, no `systemix.json` `figma` block
- Skip Figma PAT → no `figmaToken` in `~/.systemix/config.json`
- Skip PostHog key → no `posthogKey` in `~/.systemix/config.json`

Dependencies: `opts.homeDir` injection for `~/.systemix/config.json` path in tests.

---

## Priority Rationale

| Priority | Cluster | Rationale |
|----------|---------|-----------|
| 1 | Walking Skeleton | Validates end-to-end flow. Required before any other cluster. |
| 2 | Cluster 1 — Surface Selection | Highest JOB-002 value: partners need to know what was installed. Core install correctness. |
| 3 | Cluster 2 — Figma Key Loop | Riskiest branch: the invalid-input loop is the only interactive cycle in init. Most likely to be broken by prompt injection work. |
| 4 | Cluster 5 — Trust Tiers + SI | Business risk: incorrect trust tier or SI dir would be a security/compliance failure. Pure-function tests, low effort. |
| 5 | Cluster 3 — Idempotency | High partner value: re-runs are common in onboarding. Medium effort. |
| 6 | Cluster 4 — Gitignore | Correctness: duplicates are annoying but not blocking. Pure function, low effort. |
| 7 | Cluster 7 — Skip Flow Guards | Error prevention: null-key downstream errors. Medium value, low effort. |
| 8 | Cluster 6 — MCP Fallback | Graceful degradation: important but affects only fresh-machine installs. Requires extra injection work. |

## Scope Assessment: PASS — 8 test clusters, 8 user stories, all within `packages/cli/src/init.js`. Estimated 3-5 days for DISTILL (test authoring). Single bounded context. No feature release slicing needed — this is a test-contract definition for existing code.
