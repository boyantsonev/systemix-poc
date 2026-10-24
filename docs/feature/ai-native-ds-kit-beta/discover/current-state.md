---
title: "Current state — what Systemix is, does, does well, needs, and can drop"
wave: DISCOVER (desk research)
feature: ai-native-ds-kit-beta
date: 2026-10-11
baseline: main @ 34ff75b (last commit 2026-07-12); production getsystemix.vercel.app was built from this exact commit
method: >
  Read-only audit: every site route, API route and component (with an import-reachability graph);
  the CLI, MCP server, skills and templates; a sandboxed `init` run (HOME redirected); tests, tsc
  and eslint. Security-sensitive specifics are tracked privately, not in this public file.
---

# Current state of Systemix (alpha, October 2026)

## 1. What it is

Four one-liners ship today (README, docs index, CLAUDE.md, the last commit). In practice, Systemix is
a **Claude Code toolkit** made of:

| Part | What it is | Size / health |
|---|---|---|
| `@getsystemix/cli` (`packages/cli`) | `init` vendors `experiments/`, an optional thin `design/` (3 files), skills, a CLAUDE.md block, a config and a weekly cron; plus 25 more commands | ~7.9k LOC; **Jest 237/237 pass**; published 0.2.0 lags the source (no `app`, `docs`, `drift`) |
| `systemix-mcp-server` | 27 file-backed tools | 8 do useful work in an instance; 947 lines nothing imports; no tests |
| `packages/app` | Local per-instance viewer (`systemix app`): stdlib http server on 127.0.0.1 + prebuilt Vite/React 18 SPA | Works, no tests (`npm test` fails); **never published** |
| Next.js site (`src/app`) | Landing, Fumadocs docs (16 pages), a "Home"/`/config` ops dashboard, `/contract`, `/experiments`, `/design`, `/skills`, `/kit`, `/audit`; 29 API routes | **Vitest 90/90 pass**; tsc 6 errors (4 are codegen); lint clean-ish in `src/` (7 errors); ~5.5k LOC (29% of `src/`) unreachable |
| Skills | 39 unique across 3 bundles (core loop · DS · Figma) | 19 Figma skills install by default; several reference commands that don't exist |
| Dogfood state | `experiments/` (3), LEARNINGS (2 entries, no conclusive one), `.systemix/queue.json`, daily and weekly crons | Evidence PRs auto-refresh daily and never merge; the engine cron has never generated |
| `packages/mcp-proxy` | TokenGuard (deferred) | 611 lines, unbuilt, unpublished |

## 2. What it does: the capability map

| Capability | State | Notes |
|---|---|---|
| Experiment / goal / learning files (`experiment`, `goal`) | ✅ real | The tested core; no id/decision/status validation |
| `systemix loop`: drive running experiments to decision-ready | ✅ real (weak statistics) | Raw event counts, no visitor denominator; n=8 can come out "decision-ready" |
| `propose context` / `propose queue` | ✅ deterministic halves work | Approving a proposal creates an experiment **only** in the Next app, not in an instance |
| Docs manifest (`docs sync/new`), `skills sync` | ✅ real | `init` doesn't scaffold docs |
| Local app (`systemix app`) | ✅ viewer | 9 screens (home checklist, overview, guardrails, tokens, timeline, component docs with live preview, experiments, queue, skills); re-skins from instance tokens; Human/Machine switch |
| Drift (`drift scan/history`) | ◐ crude | Regex counts; three scanners with three definitions of "critical"; scores this repo 0/100 |
| Human-in-the-loop approval | ❌ broken | Two queue files; five close paths; three status vocabularies (`declined` / `rejected|deferred` / `rejected|skipped`); approve has three different effects depending on the door; stale pending cards |
| Autonomy dial | ❌ theater | Never enforced; the write-policy check is only called with `humanApproved: true` |
| "Hermes" self-improvement / skill write-back | ❌ theater | No implementation |
| Weekly engine (`/propose-experiment` cron) | ❌ never ran | No `ANTHROPIC_API_KEY`; 13 green runs, each skipping generation |
| `sync`, `watch`, `schedule`, `token-*`, `tokens`, `social-signal`, `update`, `doctor` | ❌ stub / Figma-era / harmful | `doctor` fails a correct instance; `update` force-reinstalls Figma; `schedule` writes a crontab for a stub |
| Landing evidence loop (PostHog) | ◐ mechanical | ~100 visitors a month; A/B arms mislabelled (hero renders `variant_b`, events default to `control`); mailto clicks counted as requests |

## 3. What it does well (keep)

- **Files as state, three doors.** Skills, CLI and MCP read the same files: no database, git-native
  and agent-readable.
- **The loop core library:** experiment, goal, loop and propose, with 327 passing tests between the
  two suites.
- **Honest by construction (where it's wired):**
  - hero facts and the live card are computed from files at build time;
  - the decision ledger refuses sample data;
  - MDX references render real components.
- **Safety rails in code** where they are wired: `assertWriteAllowed` at write sites, process
  spawning blocked on Vercel, atomic writes; the autonomy concept (ghost at init) and the
  write-policy rail as design intent.
- **The local app's architecture:**
  - file-backed, stateless, one per instance, readable by humans and machines;
  - **re-skins itself from the instance's own tokens**;
  - live component previews; the setup checklist reused as every empty state;
  - only 2 dependencies; binds to 127.0.0.1.

  **It is the right base for the App Shell.**
- **Site craft:**
  - one copy registry with an A/B seam;
  - a same-origin PostHog proxy;
  - SEO hygiene (canonical, OG, JSON-LD, `llms.txt`, deliberate noindex);
  - a data-driven Fumadocs shell;
  - the skill dossiers and the live component reference.
- **Process assets:** ADRs as a habit, nWave wave artifacts, `jobs.yaml` with ODI, repo-as-product.

## 4. What needs improvement

1. **There is no single product surface** (the biggest problem). The design system is spread across
   `/design`, `/contract/*`, `/docs/components` and `/skills` (three chrome treatments) plus an
   unpublished local app that re-implements the same readers with diverging semantics. A new user
   running `npx` can reach none of it.
2. **The human-in-the-loop layer.** It needs one queue, one approval path (applying effects,
   validating ids and decisions, enforcing autonomy) and one status vocabulary. Every door (app,
   web, MCP, skills) must call it.
3. **Safety (blocks any public invite):**
   - `npx systemix` / `npm i -g systemix` resolve to an **unrelated third-party npm package**
     (~190 references, including shipped CLI, app and skill strings);
   - `init --reconfigure` overwrites LEARNINGS and `design/`;
   - experiment ids aren't path-safe;
   - several **local API routes need origin/CSRF hardening and narrower write scopes**;
   - markdown links in the local app need URL sanitizing.

   Specifics are tracked privately.
4. **Positioning and copy.**
   - Six positionings coexist, and none says what the beta is.
   - "Claude Code, Cursor, Codex" is unverified.
   - Internal jargon ("Hermes Queue", "The loop") reaches users.
   - 10 docs links point to deleted `/for/*` routes, and one redirect lands on a 404.
5. **Evidence honesty.**
   - The A/B arm labels are wrong.
   - Funnel events count mailto clicks.
   - The contract's showcase token is drifted but marked "clean".
   - The contract prose says "no entries yet" while LEARNINGS has two.
6. **Statistics.** The loop needs denominators (visitors per arm) and **one** confidence rubric (three
   exist: runner, `/close-experiment`, `/growth-audit`).
7. **Docs ↔ code drift.**
   - CLAUDE.md describes v5 (`design/` is the spine); `layout.js` and the tests implement v6 (loop
     core, DS optional).
   - The README describes an `init` that doesn't exist.
   - The published CLI lags its source.
8. **Code quality.**
   - Three UI stacks and two React majors.
   - Hard-coded hex palettes that bypass tokens.
   - ~7 hand-written frontmatter parsers.
   - Three code paths that write LEARNINGS.
   - The queue path is defined in 28 places.
9. **Accessibility.**
   - Light theme: `--highlight` is 2.9:1 on the background and `--muted-foreground` is 4.1:1.
   - Dark theme: opacity variants of muted text (2.6–4.0:1) are used 62× on 10–12 px labels.
   - The collapsed rail hides every surface except Home.
   - Duplicate ids; clickable `div`s.
10. **Performance.**
    - Three fixed full-viewport blend-mode overlays on every page.
    - three.js loads for a 340 px preview.
    - 30 s polling.
    - A synchronous `git log` on every local-app home request.
    - The build depends on Google Fonts (self-host them for OSS).
11. **CI and distribution.**
    - No workflow runs tests, lint, typecheck or build (only crons).
    - All 5 e2e specs test removed UI.
    - `@getsystemix/app` was never published.
    - The CLI registers its MCP entry in the user-wide `~/.claude.json` instead of the project's
      `.mcp.json`.
12. **PostHog** runs without a consent banner or cookieless mode on an EU-hosted site.

## 5. Trim list (beta)

**CLI** (keep the 9-command core: `init` · `audit` · `queue` · `experiment` · `loop` · `propose` · `docs` · `app`/`hub` · `skills sync`):
- Delete `sync` (stub), `schedule`, `token-profile`, `token-guard`, `tokens`, `watch`,
  `social-signal`, `update`, `evidence` (except `check`), and the internal `skill-update` (reads a
  folder that no longer exists).
- Merge `drift`, `doctor`, `config show` and `design` into `audit`.
- Merge `workflow` and `list`.
- Move the Figma bundle behind `systemix add figma`.

**MCP:** keep the 6 `experiment_*` + 2 `design_*` tools (make them call the CLI library). Delete
the other 19 tools and the 947 dead lines. Register per project in `.mcp.json`.

**Packages:** delete `packages/mcp-proxy` (TokenGuard).

**Skills:** consolidate 39 into about 9 core skills:
- init/setup
- document-component
- design-sprint
- score-loop
- audit-report
- decide (brief + HITL)
- propose-experiment
- measure
- close-experiment

Make the Figma pack optional. Archive systemix-init, contract-query, atlas, build-workflow,
workflow-artifact and jtbd-audit.

**Site (`src/app`):**
- Cut `/kit` and `/audit` (mailto stubs that conflict with OSS; they return as a real report
  checkout later) and `/api/subscribe`.
- Cut `/config`'s 3D topology, skill runner and runtime feed, and `/api/run*`.
- Cut the 19 dead API routes (`ping`, `hero`, `skill-chains`, `state/*`, `events/*`, `hitl*`,
  `workflows*`, `bundle`, `token-guard/runs`, `run/[id]`).
- Cut `supabase/` and the Supabase hooks.
- Cut ~5.5k LOC of unreachable modules, including 15 unused shadcn/magicui components and the
  `lib/data/*` Figma/brand/token-guard leftovers.
- Cut the stale `e2e/*` (rewrite later) and default `public/*.svg`.
- Cut the broken `memory-layer` redirect.
- Merge `/contract/*`, `/design`, `/experiments` and `/skills` into the one product surface.

**Dependencies:**
- Remove `@ai-sdk/react` (+`ai`), `swr`, `framer-motion`, `react-resizable-panels`,
  `@radix-ui/react-icons`, and `react-force-graph-3d` (+three).
- Re-justify `@xyflow/react` and `cmdk`.
- Swap `@remixicon/react` (1 icon) for lucide.
- Move `culori` to devDependencies.
- Declare `@radix-ui/react-accordion` and `zod` explicitly.

**Docs and private material:** see `strategy-history.md` §6. Archive the stale strategy docs and
feature folders. Remove `research/`, `content/linkedin/`, `sessions/`, `spikes/spike-1-hermes`, the
vestigial `.systemix/*.json`, and `docs/product/architecture/*` (its ADR numbers collide).

## 6. What remains: the beta core

- **One product surface:** `packages/app`, published, growing into the App Shell plus a static
  Design Hub export. It ports the best web pieces: skill dossiers, the live component reference,
  the decision ledger, and experiments reframed as prototypes-as-bets.
- **One reader/writer library** in `packages/cli/src/lib` for queue, config, markdown, drift/score
  and experiments. App, MCP, site and skills all call it.
- **The public site** = landing + Fumadocs docs + Systemix's own Design Hub, rewritten to the one
  frozen line.
- **The 9-command CLI, about 9 skills, and 8 MCP tools.**
- **CI** running Jest, Vitest, typecheck and lint on PRs, plus release automation with npm
  provenance.
