# Wave Decisions — `systemix-init`

## Wave: DISCUSS
## Date: 2026-06-11
## Feature: `systemix-init` (test contract for `packages/cli/src/init.js`)
## DISTILL handoff: CONDITIONAL — see pre-DISTILL prerequisites below

---

## Pre-resolved Decisions (from prior consultation)

| Decision | Outcome | Rationale |
|----------|---------|-----------|
| Feature type | Backend / CLI | 4-question wizard with filesystem side effects |
| Walking skeleton | Not applicable | Feature is already implemented; DISTILL defines tests, not features |
| UX research depth | Lightweight | Happy path documented in `docs/feature/systemix-rework/init-flow.md`; focus is on testable ACs |
| JTBD grounding | JOB-002 direct | `docs/product/jobs.yaml` JOB-002 `install-into-foreign-repo` is validated-conditional; no re-derivation needed |
| DIVERGE artifacts | Not present | No `docs/feature/systemix-init/diverge/` exists. Risk noted: JOB-002 confidence is `medium`. Mitigated by single confirmed design partner (Connecta, 2026-06-02). |

---

## Key Design Facts (for DISTILL reference)

### What init.js writes (confirmed on disk)

| Artifact | Written when | Idempotency |
|----------|-------------|-------------|
| `systemix.config.yaml` | Always | Preserved on re-run unless `opts.reconfigure = true` |
| `~/.systemix/config.json` | Always (merged, not overwritten) | Credentials merged, not replaced |
| `.systemix/project-context.json` | Only if Figma key provided | Overwrites if key changes |
| `.systemix/systemix.json` | Only if Figma key provided | `figma` block merged; other keys preserved |
| `.claude/skills/{pipeline}/` | Always for chosen surface | `copyDir()` — overwrites existing |
| `contract/tokens/`, `contract/components/`, `contract/hypotheses/` | Always | `fs.mkdirSync` is idempotent |
| `contract/meta/` | Only if `siMode !== "off"` | `fs.mkdirSync` is idempotent |
| `.gitignore` | Always | Appends only missing entries (deduplication by `trim()` compare) |

### Pipeline → Surface → YAML mapping (intentional asymmetry)

```
User choice "1" → installPipeline("design-system") → YAML surfaces: [design-system]
User choice "2" → installPipeline("hypothesis-validation") → YAML surfaces: [landing, onboarding]
User choice "3" → both pipelines → YAML surfaces: [design-system, landing, onboarding]
```

Surface names in YAML are NOT the same as pipeline directory names. This is intentional.
Tests must assert both the installed dir names AND the YAML surface names separately.

### Trust tier contract (ADR-008)

`buildConfigYaml()` always emits:
```yaml
trust:
  orchestrator_tier: 0   # Ghost Mode at init
  hermes_tier: 0
```

This is unconditional. No wizard answer can change it. Tests must assert this for every
autonomy/SI combination.

### figma-to-code pipeline: intentionally absent from init

`packages/cli/pipelines/figma-to-code/` exists on disk with 17 skills. It is NOT installed
by `init.js`. This is an intentional design decision: `figma-to-code` is an opt-in pipeline
not included in the surface wizard. Tests must NOT assert its absence as a failure.

---

## Pre-DISTILL Prerequisites (hard gates before test code can be written)

These are code changes to `packages/cli/src/init.js` that must land before DISTILL can author
acceptance tests. All are testability changes only — no behaviour change.

### Prerequisite 1: `opts.prompt` injection in `createPrompt()`

**File:** `packages/cli/src/init.js`
**Lines affected:** `createPrompt()` function + `init()` call site (~3 lines)

**Current code:**
```js
function createPrompt() {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const ask = (q) => new Promise((res) => rl.question(q, res));
  const close = () => rl.close();
  return { ask, close };
}

async function init(opts = {}) {
  // ...
  const { ask, close } = createPrompt();
```

**Required change:**
```js
async function init(opts = {}) {
  // ...
  const { ask, close } = opts.prompt ?? createPrompt();
```

Tests pass `opts.prompt = { ask: mockAsk, close: () => {} }` where `mockAsk` returns
pre-scripted answers in sequence.

### Prerequisite 2: `opts.detectClients` and `opts.registerServer` injection (US-07)

**File:** `packages/cli/src/init.js`
**Lines affected:** MCP registration block (~4 lines)

**Current code:**
```js
const clients = detectClients().filter((c) => c.exists);
if (clients.length === 0) { /* print snippet */ }
else { for (const client of clients) { registerServer(client.configPath); } }
```

**Required change:**
```js
const _detectClients = opts.detectClients ?? detectClients;
const _registerServer = opts.registerServer ?? registerServer;
const clients = _detectClients().filter((c) => c.exists);
if (clients.length === 0) { /* print snippet */ }
else { for (const client of clients) { _registerServer(client.configPath); } }
```

### Prerequisite 3: `opts.homeDir` injection (US-08)

**File:** `packages/cli/src/init.js`
**Lines affected:** `USER_CONFIG` constant usage in `init()` (~2 lines)

**Current code (module-level constant):**
```js
const USER_CONFIG = path.join(os.homedir(), ".systemix", "config.json");
```

**Required change:** derive the path inside `init()` using `opts.homeDir`:
```js
async function init(opts = {}) {
  const homeDir = opts.homeDir ?? os.homedir();
  const userConfigDir = path.join(homeDir, ".systemix");
  const userConfigPath = path.join(userConfigDir, "config.json");
  // ...
}
```

The module-level `USER_CONFIG` constant is removed or left unused.

---

## Test Authoring Notes for DISTILL

- Follow the `hermes-skill-update` test pattern: real tmp filesystem, injectable deps via `opts`,
  Given-When-Then Jest `it()` names, `@skip` on all but the walking skeleton initially.
- Walking skeleton test: choice "3" (both), skip all credentials, assert skill dirs + contract dirs +
  trust tiers + gitignore + MCP fallback snippet in one test. Enable first. All others start skipped.
- Test file location: `packages/cli/tests/acceptance/init/init.test.js`
- Use `fs.mkdtempSync()` for both the project root and the home dir
- Pure-function tests (`extractFileKey`, `buildConfigYaml`, `ensureGitignore`) do NOT need prompt
  injection — test them directly as exported functions or by extracting into a `helpers.js` module.

---

## Risks

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| `opts.prompt` injection change is larger than 3 lines (readline internals need refactor) | Low | Medium | Spike: read `readline.createInterface` docs; `opts.prompt` bypass is well-established Node.js pattern |
| JOB-002 confidence stays `medium` — only 1 design partner | Medium | Medium | Acceptable at G1. Re-validate after second design partner install. |
| `figma-to-code` being absent from init causes partner confusion | Low | Low | Documented in wave-decisions. Not a test failure. |
| Test isolation: tmp home dir leaks real `os.homedir()` via module-level constant | Low | High | Prerequisite 3 explicitly prevents this. Must be done before US-08 tests. |

---

## Handoff to DESIGN Wave

Not applicable. This feature has no DESIGN wave output — the implementation is already shipped.
Handoff is directly to DISTILL (acceptance-designer) to author the test suite.

**DISTILL handoff package:**
- `docs/feature/systemix-init/discuss/user-stories.md` — 8 stories, 27 UAT scenarios, all ACs
- `docs/feature/systemix-init/discuss/story-map.md` — 8 test clusters, walking skeleton, priority order
- `docs/feature/systemix-init/discuss/dor-validation.md` — DoR: PASS (conditional)
- `docs/feature/systemix-init/discuss/outcome-kpis.md` — KPIs and measurement plan
- `docs/feature/systemix-init/discuss/wave-decisions.md` — this file
- `packages/cli/src/init.js` — implementation under test (330 lines)
- `packages/cli/tests/acceptance/hermes-skill-update/skill-update.test.js` — test pattern reference

**DISTILL start condition:** the 3 prerequisite injection changes must be merged to this branch first.
