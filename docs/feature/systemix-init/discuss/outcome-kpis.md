# Outcome KPIs — `npx systemix init`

**Feature:** `systemix-init`
**Job trace:** JOB-002 `install-into-foreign-repo`
**Stage:** G1 (single validated design partner, conditional)
**What "success" means here:** not a product launch metric, but a test engineering metric.
Success is: `init.js` has an acceptance test suite that passes in CI, covers all branching
behaviour, and survives mutation testing at an acceptable kill rate.

---

## Feature Objective

Ship a green, mutation-hardened acceptance test suite for `npx systemix init` so that
any future change to `init.js` that breaks an observed behaviour is caught in CI
before it reaches a design partner install.

---

## Outcome KPIs

| # | Who | Does What | By How Much | Baseline | Measured By | Type |
|---|-----|-----------|-------------|----------|-------------|------|
| 1 | CI pipeline | Runs `init.js` acceptance tests on every PR to `packages/cli` | 100% pass rate (zero flakes) | 0 tests exist today | Jest exit code in CI | Leading |
| 2 | Mutation testing (Stryker/jest-stryker) | Kills mutants in `init.js` branches | ≥ 85% mutation kill rate on `init.js` | 0% (no tests) | Stryker report in CI | Leading |
| 3 | Design partner (Priya) | Completes `npx systemix init` without filing a support issue or needing manual filesystem correction | 0 post-install support issues on first install | 1 design partner (Connecta) — no post-install issues recorded but untested | Manual support log review after next G1 install | Lagging |
| 4 | DISTILL wave test author | Writes acceptance tests from user stories without ambiguity or back-questions | 0 CLARIFICATION_NEEDED returns to DISCUSS wave | N/A — first test run | Count of CLARIFICATION_NEEDED responses from DISTILL agent | Leading |
| 5 | `init.js` branches | Are exercised by at least one named test scenario | 100% branch coverage of `init.js` decision points documented in story map | No coverage today | NYC/Istanbul branch coverage report | Leading |

---

## Metric Hierarchy

- **North Star:** CI green on every PR to `packages/cli` — no regression escapes to a design partner install
- **Leading Indicators:**
  - Test count (growing toward full cluster coverage)
  - Mutation kill rate (≥ 85% = meaningful protection)
  - Branch coverage of `init.js` decision points
- **Guardrail Metrics:**
  - Test suite runtime must stay under 10 seconds (real filesystem is fast; no network calls)
  - No test may write to the real `os.homedir()` or the real project root (isolation guardrail)
  - No test may require Figma/PostHog credentials to pass

---

## Measurement Plan

| KPI | Data Source | Collection Method | Frequency | Owner |
|-----|------------|-------------------|-----------|-------|
| CI pass rate | GitHub Actions | Jest exit code in `packages/cli` test job | Every PR | DISTILL (acceptance-designer) |
| Mutation kill rate | Stryker report | `npx stryker run` on `src/init.js` | Weekly or per milestone | DISTILL |
| Branch coverage | NYC report | `npx jest --coverage` | Every PR | DISTILL |
| G1 support issues | Support log / Slack DM | Manual review after each design partner install | Per install | Product owner |
| CLARIFICATION_NEEDED count | DISTILL agent output | Review before merging test PRs | Per DISTILL run | Product owner |

---

## Hypothesis

We believe that a green acceptance test suite for `init.js` covering all 8 story clusters
for design partner installs will achieve zero escaped regressions to G1 partners.

We will know this is true when the CI pipeline catches ≥ 85% of injected mutants in `init.js`
and the G1 design partner reports 0 post-install filesystem surprises across 3 consecutive installs.

---

## Notes on Test-Engineering KPIs

Standard product KPIs (NPS, activation rate, time-to-value) are premature at G1/conditional
validation. The leading indicator that matters now is: **does the test suite exist and does it
catch regressions?** That unlocks safe iteration on `init.js` as Systemix moves from G1 to G2.

The mutation kill rate target of 85% aligns with the `hermes-skill-update` suite, which
achieved 94.5% kill rate (PR #43). `init.js` has more pure functions (e.g., `extractFileKey`,
`buildConfigYaml`, `ensureGitignore`) that are straightforwardly mutation-testable.
