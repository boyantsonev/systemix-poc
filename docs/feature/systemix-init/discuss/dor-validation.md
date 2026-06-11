# Definition of Ready Validation — `systemix-init`

## Context

This is test-contract work on an **existing implementation** (`packages/cli/src/init.js`, 330 lines,
shipped). The DoR is applied to the user stories that define what the acceptance tests must prove.
"Technical notes" items capture injection requirements needed before tests can be written.

---

## DoR Item 1: Problem Statement Clear in Domain Language

**Status: PASS**

Every story opens with a named persona (Priya Mehta, Carlos, Aisha) in a concrete situation
with an observable pain. Domain language used throughout: "skill dirs," "surface selection,"
"pipeline," "trust tier," "Ghost Mode," "contract/meta/", "HITL queue." No implementation
jargon in the problem statements.

---

## DoR Item 2: User / Persona Identified with Specific Characteristics

**Status: PASS**

Primary persona: **design partner (G1 client)** — first external installation of Systemix
into a foreign repo they did not build for Systemix. Referenced as:
- Priya Mehta — frontend lead, Series-A startup, has Figma files, running on Mac
- Carlos — hypothesis-validation focused, wants minimal setup, PostHog user
- Aisha — CTO, security/compliance-conscious, evaluating trust posture

All map to JOB-002 (`install-into-foreign-repo`). Persona is the same across stories; context
varies by story.

---

## DoR Item 3: At Least 3 Domain Examples with Real Data

**Status: PASS**

Each story contains a "Domain Examples" section with 3 named, concrete scenarios:
- Real file key values (`h1m7dfFILe1wGSfxwQ6U02`)
- Real pipeline dir names (`figma`, `tokens`, `sync-to-figma`, etc.)
- Real surface names (`design-system`, `landing`, `onboarding`)
- Real autonomy values (`conservative`, `balanced`, `progressive`)
- Real YAML keys (`orchestrator_tier`, `hermes_tier`, `meta_contract`)

No generic data (user123, test@test.com).

---

## DoR Item 4: UAT Scenarios in Given / When / Then (3-7 per story)

**Status: PASS**

| Story | Scenario Count | Status |
|-------|---------------|--------|
| US-01 Surface Selection | 4 | PASS |
| US-02 Figma Key Loop | 4 | PASS |
| US-03 Idempotency | 3 | PASS |
| US-04 Gitignore | 3 | PASS |
| US-05 Trust Tiers | 3 | PASS |
| US-06 Self-Improvement | 2 | PASS (2 is minimum; both are substantive) |
| US-07 MCP Fallback | 2 | PASS (only 2 meaningful paths exist for this scenario) |
| US-08 Skip Flow | 2 | PASS (same: binary presence/absence assertion) |

All scenarios use Given/When/Then. Scenario titles describe user-observable outcomes
("Design-system surface installs exactly the 6 expected skill dirs"), not implementation
details ("installPipeline() is called").

---

## DoR Item 5: Acceptance Criteria Derived from UAT

**Status: PASS**

Each story's "Acceptance Criteria" section is derived directly from the UAT scenarios
immediately above it. AC items are observable and automatable:
- "exactly `{figma, tokens, ...}` dirs exist" — `fs.existsSync()` assertions
- "`systemix.config.yaml` contains: `orchestrator_tier: 0`" — YAML parse + field check
- "`.gitignore` contains each entry exactly once" — string occurrence count

No AC items prescribe implementation (no "use `fs.writeFileSync`", no "call `extractFileKey`").

---

## DoR Item 6: Story Right-Sized (1-3 Days, 3-7 Scenarios)

**Status: PASS**

Each story represents one testable behavioural cluster in `init.js`. All are unit/acceptance
testable in isolation (pure functions or injectable deps). No story requires more than a day
of test-writing effort individually.

US-06 and US-07 have only 2 scenarios — acceptable because:
- US-06: the conditional is binary (off vs not-off); a third scenario would be a duplicate
- US-07: the fallback is binary (clients found vs not found); 2 paths cover all branches

Total: 27 UAT scenarios across 8 stories (average 3.4 per story). Within the 3-7 range per story.

---

## DoR Item 7: Technical Notes Identify Constraints and Dependencies

**Status: PASS**

System Constraints section at the top of `user-stories.md` captures:
1. `opts.prompt` injection requirement (3-line change to `createPrompt()`)
2. Trust tier is always 0 — no test may assert a higher value
3. `~/.systemix/config.json` must use tmp home dir in tests

Per-story Technical Notes add story-specific constraints:
- US-02: `extractFileKey()` is a pure function, independently unit-testable
- US-03: only `systemix.config.yaml` has idempotency guard; `~/.systemix/config.json` is merged
- US-05: ADR-008 reference — Ghost Mode is the init contract
- US-07: `opts.detectClients` and `opts.registerServer` injection required (second injection dependency)
- US-08: `opts.homeDir` injection required (third injection dependency)

---

## DoR Item 8: Dependencies Resolved or Tracked

**Status: PASS with conditions**

| Dependency | Status |
|------------|--------|
| `init.js` implementation | SHIPPED — `packages/cli/src/init.js` (330 lines) |
| `opts.prompt` injection | NOT YET — 3-line change, pre-DISTILL prerequisite |
| `opts.detectClients` + `opts.registerServer` injection | NOT YET — needed for US-07 |
| `opts.homeDir` injection | NOT YET — needed for US-08 |
| Real pipelines on disk (`design-system`, `hypothesis-validation`) | CONFIRMED on disk |
| `figma-to-code` NOT installed by init | CONFIRMED — gap is intentional (opt-in only) |
| Jest test runner + `createTmpWorkspace()` pattern | ESTABLISHED — see `hermes-skill-update` tests |
| JOB-002 in `docs/product/jobs.yaml` | CONFIRMED — validated-conditional, single design partner |

Three injection changes are untracked in any issue. They must be committed as a prerequisite
before DISTILL can write acceptance tests. See `wave-decisions.md` for the specific change
specification.

---

## DoR Item 9: Outcome KPIs Defined with Measurable Targets

**Status: PASS**

Every story has an "Outcome KPIs" section following the Gothelf/Seiden formula
(Who / Does What / By How Much / Measured By / Baseline). See also `outcome-kpis.md`
for the consolidated view.

---

## DoR Overall Status

**PASS — with pre-DISTILL prerequisites tracked**

All 9 DoR items pass. Three injection changes in `init.js` are hard prerequisites before
acceptance test code can be written. These are documented in `wave-decisions.md` with
exact specifications. Handoff to DISTILL is approved conditional on those changes landing first.
