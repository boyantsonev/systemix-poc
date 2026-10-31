# Repo and architecture review: fixes and missing functionality

**Date:** 2026-10-31 · **Branch:** `claude/gifted-goodall-3iib00` · **Status:** PLAN, nothing changed yet

Four read-only reviews covered: the CLI and plugin; the website app; the local hub and MCP servers;
and repo hygiene, docs and CI. Tests pass (CLI 2,022, app 218, hub `node --test`), the plugin build
check passes, and `loops check` passes. Findings marked ✔ were re-checked by hand in the code.

## 1. What is wrong, by severity

### Must fix before this branch merges

| # | Finding | Where | Fix | Effort |
|---|---|---|---|---|
| 1 ✔ | The docs site renders all of `design/`, so merging would publish the internal context packs (pricing tests), goals and briefs at `/design/...` | `source.config.ts:46` | Limit the `design` collection to DESIGN.md, guardrails.mdx, tokens.mdx, index.mdx | 15 min |
| 2 | `/kit` still sells the retired €99 kit (in the sitemap, with Offer data); docs still say €99 / €249 | `src/app/kit/page.tsx`, `sitemap.ts:12`, `content/docs/audit.mdx:7`, `content/docs/guides/business.mdx:26` | Redirect `/kit` → `/#services`, drop it from the sitemap, update the docs to €9.99 / €499 / €990 | 1 h |
| 3 ✔ | `/api/subscribe` writes visitors' emails to the server log and stores nothing; nothing calls it | `src/app/api/subscribe/route.ts:11` | Delete the route | 5 min |
| 4 | The local-only guard rests on the Host header alone; some GET routes serve `.systemix/*` and an absolute server path on production | `src/lib/local-request.ts:24`, `src/app/api/skills/[name]` | Deny outright when `process.env.VERCEL` is set; drop `path` from the response | 1 h |
| 5 | The €9.99 price, the master decision log and the beta README disagree (€490 / €4.5k still in places) | `docs/feature/ai-native-ds-kit-beta/wave-decisions.md`, `README.md:83,410` | Record €9.99 (founder, 2026-10-24) as DSC-16's price; sync DSC-16..21 into the master log; say which log is canonical | 1 h |
| 6 | CI runs tests only | `.github/workflows/ci.yml` | Add `build-plugin.js --check`, `loops check`, the hub's `node --test` | 30 min |
| 7 | The plugin says 0.2.0, the scan 0.3.0 | `plugin-src/plugin.json` | Take the plugin version from the CLI version in the build | 15 min |

### Safety in the CLI (before npm 0.3.0 is published)

| # | Finding | Where | Fix | Effort |
|---|---|---|---|---|
| 8 ✔ | `init` can wipe `~/.claude.json`: an unparsable file is read as `{}` and written back with one entry; the "atomic" write isn't | `src/installers/mcp-server-registrar.js:94-111` | Abort on a parse error; write to a temp file and rename; register at project scope | 3–4 h |
| 9 ✔ | `update` reinstalls the whole Figma pack whenever the version differs, and writes unpinned third-party skills from GitHub without review | `src/commands/update.js:149`, packs at `@main` | Reinstall only the installed pipelines; pin packs to a commit; show a diff and ask | 1 day |
| 10 | Figma and PostHog keys stored with mode 644 | `src/init.js:470-477` | Mode 0600, or environment variables only | 1 h |
| 11 | `init` asks Figma questions (deferred), turns signals on with no key, installs Figma skills, and writes a CI workflow that runs a model without asking; it never sets up the product and build loops | `src/init.js:308-412` | Drop the Figma questions; signals off until checked; ask before the workflow; run `loops init` | 4 h |
| 12 | `audit` with no subcommand overwrites an edited skill; `drift scan` writes history while the plugin says only `loops init` writes; fixed `/tmp` paths collide | `src/commands/audit.js:333`, `plugin-src/systemix.js:6` | Never overwrite; correct the header; per-run temp paths | 1–2 h |

### The agent never rules (G-001 E3)

| # | Finding | Where | Fix | Effort |
|---|---|---|---|---|
| 13 ✔ | The MCP tool `resolve_hitl_task` lets the agent approve its own cards (`resolvedBy: "auto"`) | `packages/mcp-server/src/tools/hitl.ts:168-195` | Remove it, or allow only "skipped" | 0.5 day |
| 14 | `experiment_close` (MCP) closes directly; "humans close" | `packages/mcp-server/src/tools/experiment.ts:345` | Only from a close card a person approved | 0.5 day |
| 15 | Approvals are clicks over HTTP in the hub and in `/config`; no typed way exists (`systemix experiment ack` is missing) | `packages/app/server/index.js:90-103`, `ui/pages/queue.jsx`, `src/app/(app)/config` | Add `systemix experiment ack`; remove the buttons and the POST route; show the command | 1 day |
| 16 | A decision line is valid if the role exists, not if the person holds it | `packages/cli/src/lib/loopkit.js:369-375` | Check holder or deputy; optionally the git author of the line | 4 h |
| 17 | Plugin skills point to commands and files the plugin doesn't ship (`/init-experiment`, `/hermes`, `systemix init`, `.systemix/queue.json`) | plugin skills | A build-time check that fails on any unshipped reference | 3 h |

### Privacy claim

| # | Finding | Where | Fix | Effort |
|---|---|---|---|---|
| 18 | "The scan runs locally" is true, but even the free score needs the results file to be sent. The rubric already ships in the plugin | `plugin-src/plugin.json`, `src/commands/audit.js:170` | Compute the free score locally; send only for the paid report (decision D1) | 1 day |
| 19 ✔ | The MCP server writes events and approval cards to Supabase when environment variables are set | `packages/mcp-server/src/supabase-client.ts`, `tools/events.ts`, `tools/hitl.ts` | Remove (decision D4) | 2 h |

### Dead weight and two models of the same thing

- **Deferred code still wired in.** TokenGuard (`packages/mcp-proxy`, `token-guard` command, the proxy registrar; the package isn't on npm, so the entry it writes is broken). The Figma pipeline and `sync`/`watch`/`tokens`/`token-profile`/`schedule`/`social-signal` in the help. Five unused MCP files (✔: `cache`, `handoff`, `node-map`, `prefetch`, `token-counter`). About 25 unused Next routes, hooks and components (`api/hero`, `ping`, `skill-chains`, `token-guard/runs`, `state/*`, `events/supabase`, the Supabase/SSE hooks, `brands/*`, …). `@ai-sdk/react` and `swr` unused. `packages/app/dist` committed. `sessions/`, `spikes/`, `research/` and `content/linkedin/` historical.
- **The hosted control plane** (`/config`, `/contract`, `/design`, `/skills`, `/experiments`) is deployed although CLAUDE.md defers it; its buttons always fail on production (decision D2).
- **Two "goals".** `experiments/goals/*.mdx` are north-star objectives; `design/goals/G-NNN/` are units of work. **Two "loops".** `systemix loop` runs experiments; `systemix loops` runs the product and build loops. **Three decision stores.** `.systemix/queue.json`, `.systemix/hitl-queue.json`, `design/goals/*/decisions.md`. And **three decision logs** (the master and discover wave-decisions, `decisions/ADR.md`).
- **Docs drift.** CLAUDE.md's status block is from July. README doesn't mention the plugin or the pitch. `/for/<persona>` links are broken in seven docs. Workflow comments say node_modules is checked in. `systemix.config.yaml` still has Figma enabled.
- **Operations (verified from run history).**
  - The weekly engine skips every run, because `ANTHROPIC_API_KEY` is missing.
  - Bot pull requests never run CI (`action_required`).
  - The loop runner's PR step failed on 10-30.
  - Security fix PR #129 has been unmerged since 10-11.
  - Bot PRs #92 and #109 have been open since July.
  - npm `latest` is still the unsafe 0.2.0.
  - `/api/report` takes 3 MB bodies with no rate limit.

## 2. What is missing (G-001 and G-002)

| Missing | Pillar | Goal | Effort |
|---|---|---|---|
| The hub inside the plugin: `/systemix:hub`, GET-only endpoints (`/api/waiting`, `goals`, `goals/:id`, `loops`, `briefs`, `artifacts`, `evaluations`), the views from A1–A5; `gray-matter` and `yaml` bundled at build time, `loopkit.js` copied in, so nothing is installed | all | G-001 | 4–5 days |
| Read-only loop tools in the plugin's MCP (`loops_status`, `goal_get`); never a ruling tool | sprints | G-001 | 0.5 day |
| The drift guard hook (fixes its own new values, asks about older ones) | keep | G-001 | 1–2 days |
| `/systemix:init` in the plugin (design/ + the loops + the CLAUDE.md block, ghost mode) | deploy | G-001 | 1 day |
| The market loop (experiments) in the plugin | sprints | G-001 | 1–2 days |
| The measure step reading PostHog through PostHog's plugin; never a PostHog key in Systemix | keep | G-001 | 1–2 days |
| Self-improvement as proposed goals; `claude plugin eval` suites in CI | all | G-001 | 3–4 days |
| The landing rework: one motion scale first (two overlap in globals.css), the closed hero flag removed, `audit_requested` counted once, then the hero, pillars, proof and motion | deploy/keep | G-002 | 3–4 days |

## 3. The plan, in reviewable PRs

Each phase is one or two small PRs; the earlier phases unblock the later ones.

1. **Safe to merge** (this branch, about 1 day): fixes 1–7.
2. **Safe to publish** (about 2 days): fixes 8–12. Then you publish CLI 0.3.0 and deprecate 0.2.0.
3. **The agent never rules** (about 2.5 days): fixes 13–17.
4. **Prune** (about 2 days): Deferred code, dead routes and files, Supabase, the hosted control plane, unused dependencies, CI lint and typecheck gates.
5. **One model** (about 2–3 days): one layout file owns every path; `experiments/goals` renamed to objectives; `systemix loop` becomes `systemix experiment run`; one decision store (`queue.json`); one canonical decision log per kind; CLAUDE.md and README rewritten.
6. **G-001 build loop** (2–3 weeks): section 2, in the order hub → loop tools → drift guard → init → measure → market loop → self-improvement and evals.
7. **G-002 build loop** (3–4 days): after its Validate gate.

Phases 1–5 are fixes; under the loops they fit two build-only goals (no pictures needed):

- **G-003 (proposed):** "Make Systemix safe to merge and publish", covering phases 1–3.
- **G-004 (proposed):** "Prune Systemix to one model of goals, loops and decisions", covering phases 4–5.

Only a person opens a goal.

## 4. Decisions for the founder

| # | Question | Recommendation |
|---|---|---|
| D1 | Free score: compute it on the user's machine, or keep sending the results file? | **Compute it locally**; send only for the paid report. The privacy claim becomes simply true. We lose the server-side free-score count; the web funnel keeps install and checkout events |
| D2 | The hosted control plane on production | **Remove it from production**; the local hub is the control plane |
| D3 | Two kinds of "goal" | **Rename the north-star ones to objectives** (`experiments/objectives/`); "goal" means a unit of work in the loops |
| D4 | Supabase dual-write | **Remove it**; nothing leaves the machine unannounced (G-001 E10) |
| D5 | The Figma pipeline and its commands | **Hide them behind `systemix labs`**, out of the help and the plugin |
| D6 | Operations you own | Add `ANTHROPIC_API_KEY` or pause the engine. Give bot PRs a token that runs CI. Merge #129. Close #92 and #109. Add a rate limit on `/api/report`. Publish 0.3.0 |
