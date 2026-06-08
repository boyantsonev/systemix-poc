# Systemix — Gap Analysis v1

_Generated: 2026-04-23. Based on codebase scan of `systemix-alpha.vercel.app` repo._

> **Note:** Linear architecture doc (BAST-381fb58efe4c) requires auth to fetch. This analysis is derived from `CLAUDE.md`, the codebase scan, and `.systemix/` manifest files.

---

## Gap Analysis Table

| Architecture Component | Current State | Files / Location | Gaps |
|---|---|---|---|
| **Token Pipeline** | ✅ Already built | `scripts/token-converter.ts`, `.systemix/tokens.bridge.json`, `src/app/globals.css` | `systemix.json` modeIds/variableIds are null — `/sync-to-figma` not yet run |
| **Skills / Slash Commands** | ✅ Already built | `src/lib/data/pipeline.ts` (1,619 lines) — 15 skills with full prompts, MCP mappings, examples | No `.claude/skills/*/SKILL.md` files on disk; skills live only in `pipeline.ts`. CLI `install` copies them but hasn't been run |
| **MCP Server (systemix-mcp)** | ✅ Already built | `packages/mcp-server/src/` — 8 tool categories, 1,666 LOC. Tools: context, bridge, events, HITL, workflow, cache, token-counter, handoff | Not yet registered in `.claude/settings.json` for this project; supabase client needs env vars |
| **MCP Proxy (token cache layer)** | ✅ Already built | `packages/mcp-proxy/src/` — 482 LOC, deduplication + caching + token tracking | Integration with live Figma MCP calls not yet tested end-to-end |
| **Reconciler / Workflow Engine** | ✅ Already built | `src/lib/workflow/engine.ts`, `branching.ts`, `skill-chain.ts`, `step-io.ts`, `persistence.ts` | Runs persist to `.systemix/runs/` but no UI to browse run history |
| **Adapter Layer** | ✅ Already built | `src/lib/data/bundle-adapter.ts` (130 LOC) — Figma Plugin collections → DesignToken[] | Adapter is used only in CLI path; not wired into live `/sync-to-figma` skill call |
| **Dashboard UI — Pipeline page** | ✅ Already built | `src/app/pipeline/`, `PipelineBeam.tsx`, `WorkflowCanvas.tsx` | — |
| **Dashboard UI — Workspace / Variables** | ✅ Already built | `src/app/workspace/variables/`, `src/lib/data/variables.ts` | Token drift values are hardcoded mock data, not live from Figma diff |
| **Dashboard UI — Components / Docs** | ✅ Already built | `src/app/components/`, `src/app/docs/` | — |
| **Dashboard UI — Brands** | ⚠️ Partially built | `src/app/brands/`, `src/lib/data/brands.ts` | Page is a scaffold; brand theme application not wired up |
| **Dashboard UI — Drift page** | ⚠️ Partially built | `src/app/drift/` | Scaffold only; no live drift computation rendered |
| **Dashboard UI — Queue / Setup** | ⚠️ Partially built | `src/app/queue/`, `src/app/setup/` | Both are wireframe scaffolds |
| **HITL System** | ✅ Already built | `packages/mcp-server/src/tools/hitl.ts`, `src/components/HitlPanel.tsx`, `HitlApprovalCard.tsx`, `HitlBanner.tsx`, Supabase-backed API | Supabase env vars (`SUPABASE_URL`, `SUPABASE_ANON_KEY`) required at runtime |
| **TokenGuard — Core (Phase 8)** | ✅ Already built | `packages/mcp-server/src/token-counter.ts` (308 LOC), `packages/cli/src/commands/token-guard.js`, `src/app/workspace/token-guard/` | Dashboard shows mock run data, not live MCP-instrumented data |
| **TokenGuard — Profiler (Phase 9)** | ⚠️ Partially built | `packages/cli/src/commands/token-profile.js` — exists | File is a scaffold (no scan logic implemented) |
| **TokenGuard — Scheduler (Phase 9)** | ⚠️ Partially built | `packages/cli/src/commands/schedule.js` — exists | Scaffold only; cron/off-peak scheduling not implemented |
| **TokenGuard — Distribution (Phase 10)** | ❌ Not started | Not found | MCP proxy auto-register, `npx systemix add token-guard` via npm publish, GitHub Marketplace listing |
| **CLI — init / add / doctor** | ✅ Already built | `packages/cli/src/init.js` (288 LOC), `add.js` (254 LOC), `doctor.js` (247 LOC) | Written in JS not TS; not yet published to npm |
| **CLI — token-profile / schedule / update** | ⚠️ Partially built | Scaffold files exist in `packages/cli/src/commands/` | No implementation logic |
| **Figma Plugin** | ⚠️ Partially built | `packages/figma-plugin/src/` — 1,594 LOC (UI + code.ts) | Not built or deployed; `manifest.json` targets localhost:3001; needs Figma plugin submission |
| **GitHub Action** | ⚠️ Partially built | `packages/github-action/src/index.ts` (~120 LOC) | Not tested in CI; no `action.yml` manifest found; not published to GitHub Marketplace |
| **API routes** | ✅ Already built | `src/app/api/` — state, workflows, HITL, token-guard routes | — |

---

## Summary by Status

| Status | Count | Components |
|---|---|---|
| ✅ Already built | 12 | Token pipeline, Skills, MCP server, MCP proxy, Reconciler, Adapter, Pipeline UI, Workspace/Variables UI, Components/Docs UI, HITL, TokenGuard core, CLI core |
| ⚠️ Partially built | 7 | Brands UI, Drift UI, Queue/Setup UI, TokenGuard profiler, TokenGuard scheduler, CLI token-profile/schedule/update, Figma plugin, GitHub Action |
| ❌ Not started | 1 | TokenGuard Phase 10 distribution (npm publish, auto-register, Marketplace) |

---

## Critical Path to Playable Demo

1. **Run `/sync-to-figma`** — populates `systemix.json` modeIds/variableIds (unlocks token drift live data)
2. **Wire Supabase env vars** — enables HITL tasks to persist
3. **Register systemix-mcp in `.claude/settings.json`** — makes MCP tools callable from skills
4. **Install skills to `~/.claude/skills/`** — run `npx systemix init` in the project root
5. **Wire drift page to live engine output** — replace mock data in `/workspace/variables` with real bridge.ts diff

---

## Ticket Implications

| Gap | Suggested Ticket | Priority |
|---|---|---|
| `systemix.json` nulls — run `/sync-to-figma` | BAST: Run initial token sync, verify variableIds written | P0 |
| MCP server not registered in settings | BAST: Register systemix-mcp in project `.claude/settings.json` | P0 |
| Live drift data in workspace variables | BAST: Wire `bridge.ts` diff output to `/workspace/variables` page | P1 |
| Figma plugin not built/deployed | BAST: Build plugin, submit to Figma Community | P2 |
| TokenGuard Phase 9 — profiler & scheduler | BAST: Implement `token-profile` scan logic + cron scheduler | P2 |
| CLI not on npm | BAST: Publish `@systemix/cli` to npm, test `npx systemix init` | P2 |
| GitHub Action `action.yml` missing | BAST: Add `action.yml`, test in a real repo CI | P3 |
| TokenGuard Phase 10 distribution | BAST: MCP proxy auto-register, npm publish, Marketplace listings | P3 |
