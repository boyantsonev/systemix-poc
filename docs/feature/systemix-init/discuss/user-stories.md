<!-- markdownlint-disable MD024 -->
# User Stories — `npx systemix init`

**Feature:** `systemix-init`
**Job trace:** JOB-002 `install-into-foreign-repo` (validated-conditional, confidence=medium)
**Platform:** CLI (Node.js, `packages/cli/src/init.js`)
**Status:** Implementation shipped. These stories define the **test contract** for DISTILL wave.

## System Constraints

- `init.js` currently hardwires `readline.createInterface({ input: process.stdin, output: process.stdout })`.
  Before any acceptance test can run, `createPrompt()` must accept an `opts.prompt` injection
  (a `{ ask, close }` object). This is a 3-line change and a hard prerequisite for DISTILL.
- Trust tier is always 0 (Ghost Mode) at init — no test scenario may assert a higher tier.
- `~/.systemix/config.json` holds secrets and must never be committed. Tests must create it
  in a tmp home dir, not the real `os.homedir()`.
- Test pattern follows `hermes-skill-update` acceptance tests: real tmp filesystem,
  injectable deps via `opts`, Given-When-Then naming, `@skip` on all but the walking skeleton.

---

## US-01: Surface Selection Installs Correct Pipeline Skills

### Elevator Pitch
- **Before:** Priya runs `npx systemix init` and answers "1" (design-system only), but
  has no way to verify which skill dirs were actually created. She checks `.claude/skills/`
  manually and is not sure if she got all 6 or some partial set.
- **After:** `npx systemix init` (answer "1" at surface prompt) exits with
  `.claude/skills/figma/`, `.claude/skills/tokens/`, `.claude/skills/sync-to-figma/`,
  `.claude/skills/drift-report/`, `.claude/skills/check-parity/`, `.claude/skills/contract-query/`
  all present. Answer "2" gives the 9 hypothesis-validation skills. Answer "3" gives both sets.
- **Decision enabled:** Priya can confidently commit `.claude/skills/` knowing exactly which
  pipelines are installed for CI reproducibility.

### Problem
Priya Mehta is a frontend lead at a Series-A startup who has never run Systemix before.
She finds it unclear which skill files end up on disk after `npx systemix init`, because the
wizard output uses display names ("Design System Sync") but the actual dirs use pipeline names
("design-system"). She cannot verify correctness without manual inspection.

### Who
- Design partner (G1 client) installing Systemix into a foreign repo for the first time
- Context: CI must reproduce the same skills from `.claude/skills/` in the repo
- Motivation: confidence that the right skill dirs exist before committing

### Solution
After the wizard completes, `init.js` calls `installPipeline(name, skillsDir)` for each
selected pipeline. The pipeline `manifest.json` drives which skill dirs are copied. The
test contract verifies exact dir names exist on disk.

### Domain Examples
1. **design-system only (choice "1")** — Priya answers "1", skips Figma key, skips token.
   Result: exactly `{figma, tokens, sync-to-figma, drift-report, check-parity, contract-query}`
   dirs exist under `.claude/skills/`. No `hypothesis/` or `hermes/` dirs.
2. **hypothesis-validation only (choice "2")** — Carlos answers "2", skips PostHog key.
   Result: exactly `{hypothesis, measure, experiment, evidence, hermes, init-experiment,
   growth-audit, write-variants, close-experiment}` dirs exist. No `figma/` or `tokens/` dirs.
3. **both (choice "3", default)** — Aisha presses Enter (default). Result: all 15 dirs exist
   (6 design-system + 9 hypothesis-validation), `contract/tokens/`, `contract/components/`,
   `contract/hypotheses/` all created.

### UAT Scenarios (BDD)

#### Scenario: Design-system surface installs exactly the 6 expected skill dirs
```gherkin
Given Priya runs npx systemix init in a clean tmp repo
And answers "1" at the surfaces prompt
And presses Enter (skip) at all credential prompts
When init completes
Then .claude/skills/ contains exactly:
  figma, tokens, sync-to-figma, drift-report, check-parity, contract-query
And no hypothesis-validation skill dirs are present
```

#### Scenario: Hypothesis-validation surface installs exactly the 9 expected skill dirs
```gherkin
Given Carlos runs npx systemix init in a clean tmp repo
And answers "2" at the surfaces prompt
And presses Enter (skip) at the PostHog key prompt
When init completes
Then .claude/skills/ contains exactly:
  hypothesis, measure, experiment, evidence, hermes,
  init-experiment, growth-audit, write-variants, close-experiment
And no design-system skill dirs are present
```

#### Scenario: Both surfaces installs all 15 skill dirs and 3 contract dirs
```gherkin
Given Aisha runs npx systemix init in a clean tmp repo
And presses Enter at the surfaces prompt (defaults to "3")
And skips all credential prompts
When init completes
Then .claude/skills/ contains all 15 skill dirs (6 + 9)
And contract/tokens/, contract/components/, contract/hypotheses/ all exist
```

#### Scenario: Surfaces YAML lists surface names, not pipeline dirs
```gherkin
Given Carlos runs npx systemix init with choice "2" (hypothesis-validation)
When init completes and systemix.config.yaml is read
Then the surfaces list contains: [landing, onboarding]
And NOT [hypothesis-validation]
```

### Acceptance Criteria
- [ ] Choice "1" installs exactly `{figma, tokens, sync-to-figma, drift-report, check-parity, contract-query}` and no others
- [ ] Choice "2" installs exactly `{hypothesis, measure, experiment, evidence, hermes, init-experiment, growth-audit, write-variants, close-experiment}` and no others
- [ ] Choice "3" (or Enter) installs all 15 dirs from both pipelines
- [ ] `systemix.config.yaml` surfaces field lists `[design-system]`, `[landing, onboarding]`, or both — never pipeline dir names

### Outcome KPIs
- **Who:** G1 design partner running first install
- **Does what:** Verifies skill dirs on disk match chosen pipeline without manual inspection
- **By how much:** 0 post-install verification failures in CI (current baseline: unknown; target: 100% clean on first run)
- **Measured by:** CI test run `packages/cli/tests/acceptance/init/` green on first commit
- **Baseline:** No acceptance tests exist today

### Technical Notes
- `PIPELINES_DIR = path.join(__dirname, "..", "pipelines")` — tests must point to the real pipelines dir
- Pipeline manifest at `pipelines/{name}/manifest.json` drives `installPipeline()`
- `figma-to-code` pipeline exists on disk but is NOT installed by init — intentional; it is opt-in only
- Depends on `opts.prompt` injection prerequisite (see System Constraints)

---

## US-02: Figma Key Input Loops Until Valid or Skipped

### Elevator Pitch
- **Before:** Priya pastes a Figma branch URL and `init` exits with no file key saved — she
  doesn't know if the URL format was wrong or if init crashed silently.
- **After:** `npx systemix init` (choice "1") prompts for a Figma file URL or key, re-prompts
  on unrecognisable input (prints `"Couldn't read a file key — paste the full Figma URL or bare key"`),
  and accepts all valid Figma URL formats. Pressing Enter skips without error.
- **Decision enabled:** Priya knows the file key was either accepted and saved to
  `.systemix/project-context.json`, or deliberately skipped.

### Problem
Priya pastes a Figma branch URL (`figma.com/design/KEY/branch-name?node-id=...`) but init
silently fails to extract the key and skips credential storage. She discovers the problem
only when `/drift-report` errors with "no file key configured."

### Who
- Design partner running design-system surface for the first time
- Context: has a Figma file URL from the browser address bar (not a bare key)
- Motivation: wire the Figma file into the skill workflow on day 1

### Solution
`extractFileKey()` handles bare keys and full `figma.com/design|file|proto|board/{key}` URLs.
Invalid input loops without exiting; Enter skips with a hint to set later in `project-context.json`.

### Domain Examples
1. **Full design URL** — Priya pastes `https://www.figma.com/design/h1m7dfFILe1wGSfxwQ6U02/MyDS`.
   Result: key `h1m7dfFILe1wGSfxwQ6U02` extracted, saved to `.systemix/project-context.json`.
2. **Bare key** — Priya types `h1m7dfFILe1wGSfxwQ6U02`. Same result.
3. **Invalid URL** — Priya pastes `https://www.notion.so/mypage`. Init prints
   `"Couldn't read a file key"` and re-prompts. She then presses Enter to skip.

### UAT Scenarios (BDD)

#### Scenario: Full Figma design URL yields correct file key
```gherkin
Given Priya is prompted for a Figma file URL or key
When she types "https://www.figma.com/design/h1m7dfFILe1wGSfxwQ6U02/MyDS"
Then init accepts the input without re-prompting
And .systemix/project-context.json contains { "fileKey": "h1m7dfFILe1wGSfxwQ6U02" }
And .systemix/systemix.json contains figma.fileKey = "h1m7dfFILe1wGSfxwQ6U02"
```

#### Scenario: Bare key is accepted without re-prompting
```gherkin
Given Priya is prompted for a Figma file URL or key
When she types "h1m7dfFILe1wGSfxwQ6U02"
Then init accepts the bare key without re-prompting
And .systemix/project-context.json contains { "fileKey": "h1m7dfFILe1wGSfxwQ6U02" }
```

#### Scenario: Invalid input loops without crashing
```gherkin
Given Priya is prompted for a Figma file URL or key
When she types "https://www.notion.so/mypage"
Then init prints "Couldn't read a file key — paste the full Figma URL or bare key."
And init re-prompts without exiting
When she then presses Enter
Then init continues without saving a file key
And .systemix/project-context.json does not exist
```

#### Scenario: Pressing Enter at Figma prompt skips without writing project-context.json
```gherkin
Given Priya is prompted for a Figma file URL or key
When she presses Enter (empty input)
Then init prints "Skipped. Set later in .systemix/project-context.json"
And init continues to the next prompt without error
And .systemix/project-context.json is not created
```

### Acceptance Criteria
- [ ] Full `figma.com/design/{key}/...` URL extracts the key correctly
- [ ] Full `figma.com/file/{key}/...` URL extracts the key correctly
- [ ] Bare key (no `/`) is accepted as-is
- [ ] Unrecognisable input prints the re-prompt message and does NOT exit
- [ ] Empty Enter skips without creating `project-context.json`
- [ ] Valid key is saved to both `project-context.json` and `systemix.json`

### Outcome KPIs
- **Who:** Design partner connecting their first Figma file
- **Does what:** Completes the Figma key entry step without confusion or manual JSON editing
- **By how much:** 0 "no file key" errors on first `/drift-report` run (target: 100% success when key provided)
- **Measured by:** Acceptance test coverage of `extractFileKey()` branches
- **Baseline:** Currently no automated branch coverage of the key extraction loop

### Technical Notes
- `extractFileKey()` in `init.js` is a pure function — unit-testable without prompt injection
- `systemix.json` merges with existing content if file already exists (preserves `modeIds`/`variableIds`)
- Depends on `opts.prompt` injection prerequisite for the loop test (invalid then Enter)

---

## US-03: Config Idempotency and Reconfigure Flag

### Elevator Pitch
- **Before:** Carlos re-runs `npx systemix init` after changing his autonomy preference and
  accidentally wipes the Figma key and PostHog key he set in the first run.
- **After:** `npx systemix init` preserves an existing `systemix.config.yaml` unless
  `--reconfigure` is passed. Re-running with `--reconfigure` overwrites it with fresh answers.
- **Decision enabled:** Carlos can re-run init safely during onboarding without losing credentials
  or config he set earlier.

### Problem
Carlos is iterating on his Systemix setup. He re-runs `npx systemix init` to change
autonomy from "balanced" to "conservative" but the re-run overwrites his existing config,
losing his Figma key reference that he had saved in the first run.

### Who
- Design partner iterating on Systemix config during initial setup (first week)
- Context: has already run init once; wants to change one setting
- Motivation: safe re-runs without side effects

### Solution
`init.js` checks `fs.existsSync(configYamlPath) && !opts.reconfigure`. If true, it prints
a skip message and leaves the file untouched. `--reconfigure` flag (`opts.reconfigure = true`)
forces overwrite.

### Domain Examples
1. **Idempotent re-run** — Carlos ran init on Monday. Re-runs on Tuesday without flags.
   `systemix.config.yaml` is unchanged; stdout says "left as-is (re-run with --reconfigure to overwrite)."
2. **Forced reconfigure** — Carlos runs `npx systemix init --reconfigure`. New answers
   are written; `systemix.config.yaml` gets fresh content.
3. **First run** — No existing `systemix.config.yaml`. Init writes it unconditionally.

### UAT Scenarios (BDD)

#### Scenario: Re-running init without flags preserves existing config
```gherkin
Given Carlos has already run init and systemix.config.yaml exists with autonomy: balanced
When he runs init again with the same answers
Then systemix.config.yaml is unchanged (autonomy: balanced preserved)
And stdout contains "left as-is (re-run with --reconfigure to overwrite)"
```

#### Scenario: Reconfigure flag overwrites existing config
```gherkin
Given Carlos has an existing systemix.config.yaml with autonomy: balanced
When he runs init with opts.reconfigure = true and answers "conservative"
Then systemix.config.yaml is overwritten with autonomy: conservative
And stdout contains "systemix.config.yaml (reconfigured)"
```

#### Scenario: First run always writes the config
```gherkin
Given no systemix.config.yaml exists in the project root
When Carlos completes init
Then systemix.config.yaml is created
And stdout contains "systemix.config.yaml"
```

### Acceptance Criteria
- [ ] Re-run without `--reconfigure` leaves `systemix.config.yaml` content identical to previous run
- [ ] Re-run without `--reconfigure` prints the skip message with `--reconfigure` hint
- [ ] `opts.reconfigure = true` overwrites `systemix.config.yaml` with new content
- [ ] First run (no existing file) always writes `systemix.config.yaml`

### Outcome KPIs
- **Who:** Design partner in first-week onboarding
- **Does what:** Re-runs init to adjust settings without manual YAML editing
- **By how much:** 0 accidental config overwrites reported (target: idempotency passes 100% of time)
- **Measured by:** Acceptance test asserting file content before and after re-run
- **Baseline:** No idempotency test exists; behavior is untested

### Technical Notes
- `opts.reconfigure` maps to `--reconfigure` CLI flag in `bin/systemix.js`
- Only `systemix.config.yaml` has idempotency guard; `~/.systemix/config.json` is always merged (not overwritten)

---

## US-04: Gitignore Augmentation Without Duplication

### Elevator Pitch
- **Before:** Priya runs init, then runs it again two weeks later. Her `.gitignore` now has
  duplicate `# systemix runtime dirs` blocks and duplicate entries, making the file messy.
- **After:** `npx systemix init` appends `.systemix/handoffs/`, `.systemix/cache/`,
  `.systemix/runs/` to `.gitignore` only if absent. Re-running never duplicates.
- **Decision enabled:** Priya can commit `.gitignore` without review — it is always clean.

### Problem
Priya's repo already has a `.gitignore`. After init, `.systemix/handoffs/` is committed
accidentally because the existing `.gitignore` had a trailing space on the matching line
and the deduplication logic missed it.

### Who
- Design partner with an existing `.gitignore` in their repo
- Context: init is idempotent; they may run it multiple times
- Motivation: clean `.gitignore` with no duplicates or accidental commits of runtime dirs

### Solution
`ensureGitignore()` splits on newlines, trims each line before comparison, appends
missing entries only. A blank `.gitignore` or missing file both work. Re-running is safe.

### Domain Examples
1. **Existing .gitignore without systemix entries** — Priya's `.gitignore` has `node_modules/`.
   After init: `# systemix runtime dirs` block appended with 3 entries.
2. **Re-run after first init** — `.gitignore` already has all 3 entries. Re-run: no change.
3. **Partial entries** — `.gitignore` already has `.systemix/handoffs/` but not the others.
   After re-run: only the 2 missing entries are appended, not the existing one.

### UAT Scenarios (BDD)

#### Scenario: Systemix entries are appended to an existing .gitignore
```gherkin
Given Priya's repo has a .gitignore containing "node_modules/"
And no systemix entries are present
When init completes
Then .gitignore contains .systemix/handoffs/, .systemix/cache/, .systemix/runs/
And "node_modules/" is still present
```

#### Scenario: Re-running init does not duplicate gitignore entries
```gherkin
Given init has already been run and .gitignore contains all 3 systemix entries
When init is run again
Then .gitignore contains each systemix entry exactly once
```

#### Scenario: Partial entries are completed without duplicating existing ones
```gherkin
Given .gitignore contains ".systemix/handoffs/" but not the other two entries
When init runs
Then .gitignore adds .systemix/cache/ and .systemix/runs/
And .systemix/handoffs/ appears exactly once
```

### Acceptance Criteria
- [ ] All 3 entries appended when `.gitignore` has none of them
- [ ] No duplicate entries after re-run when all 3 already present
- [ ] Only missing entries appended when `.gitignore` has a subset
- [ ] `.gitignore` created from scratch if it does not exist
- [ ] Existing non-systemix entries are preserved untouched

### Outcome KPIs
- **Who:** Design partner committing their repo after first init
- **Does what:** Commits `.gitignore` without cleaning up duplicates manually
- **By how much:** 0 duplicate-entry `.gitignore` commits (target: 100% idempotent)
- **Measured by:** Acceptance test diff on `.gitignore` content before and after two init runs
- **Baseline:** No automated test; behavior is only manually tested today

### Technical Notes
- `GITIGNORE_ENTRIES = [".systemix/handoffs/", ".systemix/cache/", ".systemix/runs/"]`
- Comparison is `l.trim() === e.trim()` — handles trailing spaces in existing file

---

## US-05: Trust Tier Is Always 0 in Generated Config

### Elevator Pitch
- **Before:** Aisha assumes that choosing "progressive" autonomy (choice "3") also elevates
  the trust tier. She checks `systemix.config.yaml` and sees `orchestrator_tier: 0` — she is
  unsure if that is a bug.
- **After:** `npx systemix init` always writes `orchestrator_tier: 0` and `hermes_tier: 0`
  in `systemix.config.yaml`, regardless of autonomy answer. The file comment explains: "Ghost Mode
  at init — never executes autonomously without config."
- **Decision enabled:** Aisha can share the generated config with her team knowing it is safe
  to commit — no autonomous execution will happen until trust tiers are intentionally elevated.

### Problem
Aisha, CTO of a seed-stage startup, is concerned that choosing "progressive" autonomy means
Systemix will start making changes to her Figma file without human review. She needs assurance
that the generated config is safe at init time regardless of autonomy selection.

### Who
- Design partner / technical decision-maker reviewing config before commit
- Context: evaluating trust posture of the tool for their organisation
- Motivation: compliance assurance that Ghost Mode is enforced at init

### Solution
`buildConfigYaml()` hardcodes `trust.orchestrator_tier: 0` and `trust.hermes_tier: 0`.
The `autonomy` field controls Hermes decision thresholds, not execution trust. These are
separate concerns that the wizard keeps distinct.

### Domain Examples
1. **Conservative autonomy** — Aisha answers "1". YAML: `autonomy: conservative`,
   `orchestrator_tier: 0`, `hermes_tier: 0`.
2. **Progressive autonomy** — Aisha answers "3". YAML: `autonomy: progressive`,
   `orchestrator_tier: 0`, `hermes_tier: 0`. Trust tier is still 0.
3. **Self-improvement = auto** — Aisha answers "4" for self-improvement. YAML still has
   `orchestrator_tier: 0`, `hermes_tier: 0`.

### UAT Scenarios (BDD)

#### Scenario: Conservative autonomy always yields trust tier 0
```gherkin
Given Aisha selects autonomy: conservative (choice "1")
When init completes
Then systemix.config.yaml contains: orchestrator_tier: 0
And systemix.config.yaml contains: hermes_tier: 0
```

#### Scenario: Progressive autonomy still yields trust tier 0
```gherkin
Given Aisha selects autonomy: progressive (choice "3")
When init completes
Then systemix.config.yaml contains: orchestrator_tier: 0
And systemix.config.yaml contains: hermes_tier: 0
And systemix.config.yaml contains: autonomy: progressive
```

#### Scenario: Self-improvement = auto does not elevate trust tier
```gherkin
Given Aisha selects self-improvement: auto (choice "4")
When init completes
Then systemix.config.yaml contains: orchestrator_tier: 0
And systemix.config.yaml contains: hermes_tier: 0
```

### Acceptance Criteria
- [ ] All autonomy choices (1/2/3) produce `orchestrator_tier: 0` and `hermes_tier: 0`
- [ ] All self-improvement choices (1/2/3/4) produce `orchestrator_tier: 0` and `hermes_tier: 0`
- [ ] The trust block is always present in generated YAML (not conditional)
- [ ] `autonomy` field correctly reflects the wizard answer (conservative/balanced/progressive)

### Outcome KPIs
- **Who:** Technical decision-maker at design partner org
- **Does what:** Reviews generated config and confirms safe-to-commit posture without manual audit
- **By how much:** 0 trust-escalation incidents at init (target: trust tier 0 enforced 100% of the time)
- **Measured by:** Acceptance test asserting YAML content for every autonomy/SI combination
- **Baseline:** No automated assertion; currently only a comment in `buildConfigYaml()`

### Technical Notes
- ADR-008: Ghost Mode is the init contract — trust tiers may only be elevated via explicit config edit after init
- `autonomy` and `trust tier` are independent concepts; the test suite must assert both independently

---

## US-06: Self-Improvement Off Skips contract/meta/ Directory

### Elevator Pitch
- **Before:** Carlos answers "off" for self-improvement but still sees a `contract/meta/`
  dir in his repo. He is not sure what it is for or whether to commit it.
- **After:** `npx systemix init` with self-improvement "off" (choice "1") creates
  `contract/tokens/`, `contract/components/`, `contract/hypotheses/` but NOT `contract/meta/`.
  Any other self-improvement choice creates `contract/meta/` too.
- **Decision enabled:** Carlos knows exactly which contract dirs to commit based on his
  self-improvement choice, with no unexpected dirs.

### Problem
Carlos wants a minimal Systemix install. He chooses self-improvement "off" but still gets
`contract/meta/` created, which he finds confusing since he explicitly opted out of
self-improvement.

### Who
- Design partner choosing minimal self-improvement configuration
- Context: wants predictable filesystem side effects from init
- Motivation: clean, understandable repo scaffold with no mystery dirs

### Solution
`scaffoldContracts(projectRoot, doHypo, siMode !== "off")` passes `includeMeta = (siMode !== "off")`.
Only when `siMode !== "off"` is `contract/meta/` created.

### Domain Examples
1. **self-improvement = off** — Carlos answers "1". Dirs created: `contract/tokens/`,
   `contract/components/`, `contract/hypotheses/`. No `contract/meta/`.
2. **self-improvement = audit** — Carlos answers "2" (default). Same 3 dirs plus `contract/meta/`.
3. **hypothesis surface + self-improvement = off** — `contract/hypotheses/example-hypothesis.mdx`
   is created (because `doHypo=true`), but no `contract/meta/`.

### UAT Scenarios (BDD)

#### Scenario: Self-improvement off means no contract/meta dir
```gherkin
Given Carlos selects self-improvement: off (choice "1")
When init completes
Then contract/tokens/, contract/components/, contract/hypotheses/ exist
And contract/meta/ does NOT exist
And systemix.config.yaml contains: mode: off
```

#### Scenario: Any self-improvement mode other than off creates contract/meta
```gherkin
Given Carlos selects self-improvement: audit (choice "2")
When init completes
Then contract/meta/ exists
And systemix.config.yaml contains: meta_contract: contract/meta/hermes-accuracy.mdx
```

### Acceptance Criteria
- [ ] `siMode = "off"` → `contract/meta/` absent, YAML has `mode: off` only (no meta_contract line)
- [ ] `siMode = "audit"` → `contract/meta/` present, YAML has `meta_contract: contract/meta/hermes-accuracy.mdx`
- [ ] `siMode = "tuning"` → same as audit for dir creation
- [ ] `siMode = "auto"` → same as audit for dir creation

### Outcome KPIs
- **Who:** Design partner reviewing post-init filesystem
- **Does what:** Confirms filesystem matches their self-improvement choice without surprise dirs
- **By how much:** 0 unexpected dirs reported (target: exact dir set matches choice 100% of time)
- **Measured by:** Acceptance test asserting dir presence/absence for each `siMode` value
- **Baseline:** No automated assertion for this conditional

### Technical Notes
- `scaffoldContracts(projectRoot, includeHypothesisExample, includeMeta)` — third param drives `contract/meta/`
- `includeMeta` is a boolean derived from `siMode !== "off"` — straightforward boundary

---

## US-07: MCP Registration Fallback Prints Manual Snippet

### Elevator Pitch
- **Before:** Priya runs `npx systemix init` on a fresh machine with no Claude Code config.
  Init crashes with an unhandled error when trying to register the MCP server.
- **After:** When no MCP client config is found, `npx systemix init` prints the manual
  registration snippet to stdout and continues. Init does not crash.
- **Decision enabled:** Priya can manually add the MCP config snippet to her `~/.claude.json`
  and still complete the setup without re-running init.

### Problem
Priya is setting up Systemix on a colleague's machine that has never had Claude Code configured.
The MCP registration step fails because no `~/.claude.json` exists. Init should degrade
gracefully and provide the snippet, not crash.

### Who
- Design partner on a fresh machine or running init outside Claude Code
- Context: `detectClients()` returns zero existing clients
- Motivation: init always completes; missing MCP config is advisory, not fatal

### Solution
`detectClients().filter(c => c.exists)` returns an empty array when no client config exists.
The empty-array branch prints the manual JSON snippet to stdout. The snippet is exact and
copy-pasteable.

### Domain Examples
1. **No Claude config** — Priya's machine has no `~/.claude.json`. Init prints the 5-line
   MCP snippet and continues to `.gitignore` step.
2. **Claude config exists** — Aisha has `~/.claude.json`. Init calls `registerServer()`
   and continues. No snippet printed.
3. **Multiple clients** — Boyan has both `~/.claude.json` and a project-level config.
   Init registers in both. No snippet printed.

### UAT Scenarios (BDD)

#### Scenario: No MCP client config found — manual snippet printed, init continues
```gherkin
Given Priya's tmp workspace has no Claude Code config file
And detectClients() returns zero existing clients
When init completes the MCP registration step
Then stdout contains "No MCP client config found"
And stdout contains '"systemix-mcp":'
And stdout contains '"command": "node"'
And init continues without throwing
And .gitignore and systemix.config.yaml are still written
```

#### Scenario: Missing MCP config does not prevent config file writes
```gherkin
Given no Claude Code config exists
When init completes
Then systemix.config.yaml is written
And .gitignore is updated
And init exits normally (no unhandled exception)
```

### Acceptance Criteria
- [ ] `detectClients()` returning zero clients causes the manual snippet to print (not a crash)
- [ ] The snippet includes `"systemix-mcp"`, `"command": "node"`, and `--project-root .`
- [ ] All subsequent steps (`.gitignore`, config writes) complete even when MCP registration is skipped
- [ ] No `process.exit()` or thrown error when clients array is empty

### Outcome KPIs
- **Who:** Design partner on a fresh or non-standard machine
- **Does what:** Completes init without Systemix support intervention
- **By how much:** 0 init crashes due to missing MCP config (target: 100% graceful fallback)
- **Measured by:** Acceptance test injecting empty `detectClients` mock, asserting stdout + file writes
- **Baseline:** No test; only code review confirms this path today

### Technical Notes
- `detectClients` and `registerServer` from `./installers/mcp-server-registrar` need to be injectable
  via `opts.detectClients` and `opts.registerServer` for testability — this is a second injection
  requirement beyond `opts.prompt`
- The exact snippet format is the AC; any change to the snippet text is a breaking change

---

## US-08: Skip Flow Leaves No Figma Artifacts

### Elevator Pitch
- **Before:** Priya runs init choosing design-system surface but skips the Figma key prompt.
  She later finds a `project-context.json` with a null `fileKey` that confuses `/drift-report`.
- **After:** When Priya skips the Figma key (presses Enter), neither `project-context.json`
  nor `.systemix/systemix.json` `figma` entry are written. These files only appear when a
  valid key is provided.
- **Decision enabled:** Priya can safely commit the repo without wondering if the null key
  will cause downstream skill failures.

### Problem
Carlos runs init, skips the Figma key, and later runs `/drift-report`. The skill reads
`project-context.json`, finds `fileKey: null`, and errors — worse than if the file didn't
exist, because the skill tries to make a Figma API call with a null key.

### Who
- Design partner who is not ready to connect a Figma file during init
- Context: wants to set up skills first, wire Figma later
- Motivation: no artifact created that would confuse downstream skills

### Solution
`init.js` only writes `project-context.json` and `systemix.json` `figma` block when
`fileKey` is truthy. The `if (fileKey)` guard is the contract.

### Domain Examples
1. **Skip Figma key** — Priya presses Enter at the Figma URL/key prompt. No
   `project-context.json`, no `figma` block in `systemix.json`.
2. **Skip Figma token only** — Priya provides a key but skips the PAT.
   `project-context.json` and `systemix.json` are written (key present), but
   `~/.systemix/config.json` has no `figmaToken`.
3. **Skip PostHog** — Carlos on hypothesis-validation surface skips PostHog key.
   No `posthogKey` in `~/.systemix/config.json`.

### UAT Scenarios (BDD)

#### Scenario: Skipping Figma key leaves no project-context.json
```gherkin
Given Priya runs init with design-system surface selected
When she presses Enter at the Figma file URL or key prompt
Then .systemix/project-context.json is NOT created
And .systemix/systemix.json does NOT contain a figma block
```

#### Scenario: Providing a key writes both artifact files
```gherkin
Given Priya enters a valid Figma key "h1m7dfFILe1wGSfxwQ6U02"
When init completes
Then .systemix/project-context.json contains { "fileKey": "h1m7dfFILe1wGSfxwQ6U02" }
And .systemix/systemix.json contains figma.fileKey: "h1m7dfFILe1wGSfxwQ6U02"
```

### Acceptance Criteria
- [ ] Empty Enter at Figma URL prompt → no `project-context.json` created
- [ ] Empty Enter at Figma URL prompt → no `figma` block in `systemix.json`
- [ ] Valid key provided → both `project-context.json` and `systemix.json` `figma` block written
- [ ] Skipping Figma PAT → `~/.systemix/config.json` contains no `figmaToken` key
- [ ] Skipping PostHog key → `~/.systemix/config.json` contains no `posthogKey` key

### Outcome KPIs
- **Who:** Design partner who defers Figma connection past init
- **Does what:** Uses `/drift-report` later without a null-key error
- **By how much:** 0 null-key errors from skipped Figma key (target: 100%)
- **Measured by:** Acceptance test asserting file non-existence after skip
- **Baseline:** No automated test; behavior relies on `if (fileKey)` guard

### Technical Notes
- `~/.systemix/config.json` must be written to a tmp home dir in tests (not real `os.homedir()`)
- `opts.homeDir` injection needed for `USER_CONFIG` path in tests
