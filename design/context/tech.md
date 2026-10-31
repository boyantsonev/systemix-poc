---
domain: tech
owner: engineering-lead
updated: 2026-10-31
---
# Tech — what the engineering-lead knows

How Systemix is built, tested and shipped. A change is judged by whether it lands as a
reviewable PR, is covered by tests, stays deterministic and can be rolled back.

## What we know
- The site is Next.js 16 (Turbopack) on Vercel, project `systemix` (team pivotool); production is `main` → getsystemix.vercel.app `CLAUDE.md § Names & environments`
- Previews are per-branch Vercel deployments `CLAUDE.md § Names & environments`
- The CLI is `packages/cli` (Node ≥ 18, Jest); the app tests run on Vitest `CLAUDE.md § Dev`
- The plugin is generated into `plugin/` by `packages/cli/scripts/build-plugin.js`; a test refuses a stale copy `packages/cli/tests/acceptance/plugin/plugin.test.js`
- The scan the plugin runs has no dependencies and is deterministic `packages/cli/src/lib/counters/README.md`
- CI runs "Tests (Node 22)" on every PR `.github/workflows/ci.yml`
- Crons: the experiment runner (daily), the engine (weekly), evidence pulls `.github/workflows/`
- The report service is closed until `SYSTEMIX_REPORT_ACCESS` is set `src/lib/report-access.ts`
## Numbers
- CLI tests: about 2,000 (Jest); app tests: 218 (Vitest), on branch claude/gifted-goodall-3iib00
- npm `latest` for @getsystemix/cli: 0.3.0 (published by the founder 2026-10-31; its 151 files match commit a6eb48e0); 0.2.0 deprecated as unsafe `npm view @getsystemix/cli`
## Open bets
- Shipping the local hub inside the plugin needs its two dependencies installed from a lockfile at the plugin root (Claude Code installs them) `docs/feature/ai-native-ds-kit-beta/self-improving-agent.md`
## Sources
- `CLAUDE.md`, `packages/cli/README.md`, `.github/workflows/ci.yml`
## Questions the expert would ask
- Does it land as one reviewable PR, a few hundred lines, with its reason in the message?
- Which test proves the eval, and does it run in CI?
- What breaks for someone already using the CLI or the plugin?
- Does anything touch secrets, production or the network without saying so?
- Is it deterministic, and how do we roll it back?
