# Gap Analysis v2 — v1 (central) → v-next (embedded per-client)

**Wave:** DISCOVER
**Feature:** systemix-v2
**Date:** 2026-06-02
**Baseline:** `docs/gap-analysis-v1.md` (2026-04-23)

> Purpose: take every component that exists today and assign a **disposition** under the embedded-per-client model — **PORT** (works as-is in an instance), **RE-SHAPE** (exists but assumes central), or **DEPRECATE** (central-only; drop or demote to optional control plane). This is the v-next target delta, not a build plan.

---

## Pivotal Finding — `init` already exists, but installs *globally*

`npx systemix init` is **already built** (`packages/cli/src/init.js`, 288 LOC) and is named in the v1 critical path as *"Install skills to `~/.claude/skills/`."* That is the crux: **today `init` installs skills into the developer's global Claude config — it does not scaffold a self-contained instance inside the client repo.**

The single most important v-next change: **`init` must scaffold a vendored, self-contained Systemix instance into the client's design-system repo** (skills + config + local data store + MCP wiring), with no dependency on a central service to run the design-system and docs loops. Everything below follows from that.

---

## Disposition Table

### Built (12 in v1)
| Component | v1 location | Disposition | Note |
|---|---|---|---|
| Token pipeline | `scripts/token-converter.ts`, `.systemix/tokens.bridge.json`, `globals.css` | **PORT** | Already file-based + local. Lives natively in the client repo. The model citizen for embedded. |
| Skills / 3 pipelines | `packages/cli/pipelines/*` (`design-system`, `figma-to-code`, `hypothesis-validation`) | **PORT** (vendor) | Core asset. Re-shape only the *delivery*: vendor into the repo (`.systemix/skills/` or `.claude/skills/` scoped to the project) rather than the user's global config. |
| MCP server (`systemix-mcp`) | `packages/mcp-server/src/` (8 tool categories) | **RE-SHAPE** | Assumes a central Supabase client. Must run against the **local data store**; Supabase becomes optional sync, not a hard dependency. |
| MCP proxy (token cache) | `packages/mcp-proxy/src/` | **PORT** | Per-instance caching + token tracking fits embedded directly. |
| Reconciler / workflow engine | `src/lib/workflow/engine.ts`, persists to `.systemix/runs/` | **PORT** | Already local-first (`.systemix/runs/`). Confirms the local-first thesis is viable. |
| Adapter layer | `src/lib/data/bundle-adapter.ts` | **PORT** | Pure transform; client-agnostic. |
| Dashboard — Pipeline UI | `src/app/pipeline/`, `PipelineBeam.tsx` | **DEPRECATE → optional** | Central dashboard chrome. Not shipped into every client repo. Candidate for the (deferred) central control plane, or a lightweight local viewer. |
| Dashboard — Workspace/Variables | `src/app/workspace/variables/` | **DEPRECATE → optional** | Same as above. The *data* (token drift) ports; the central UI does not. |
| Dashboard — Components/**Docs** | `src/app/docs/` | **RE-SHAPE → the deliverable** | The docs page must render **inside the client repo** (`connecta-design-system`'s `/docs`). This is the highest-value re-shape: from Systemix's own `/docs` to a per-instance docs surface the client owns and publishes. |
| HITL system | `packages/mcp-server/src/tools/hitl.ts`, `HitlPanel.tsx`, Supabase-backed | **RE-SHAPE** | Central `hitl_tasks` table + UI → **local queue per repo**. Cross-instance human review is an open question (meta-plan §4.3). |
| TokenGuard core | `packages/mcp-server/src/token-counter.ts` | **PORT** | Per-instance budget enforcement already matches the github-action contract. |
| CLI core (`init`/`add`/`doctor`) | `packages/cli/src/{init,add,doctor}.js` | **RE-SHAPE (the v-next thesis)** | `init` must scaffold an embedded instance, not install globally. `doctor` validates the instance. This is the **gating artifact** (the init contract, DESIGN wave). |

### Partially built (7 in v1)
| Component | v1 location | Disposition | Note |
|---|---|---|---|
| Brands UI + `brands.ts` | `src/app/brands/`, `src/lib/data/brands.ts` | **RE-SHAPE → drop the array** | Central `brands[]` array → **single-tenant config**: the instance *is* the brand. Keep the layered `tokenOverrides` (primitive/semantic/component) shape, drop the multi-brand registry. |
| Drift UI | `src/app/drift/` | **DEPRECATE → optional** | Drift *computation* ports (local); the central page does not. |
| Queue / Setup UI | `src/app/queue/`, `src/app/setup/` | **RE-SHAPE** | "Setup" becomes the `init` flow inside the client repo. |
| TokenGuard profiler / scheduler | `packages/cli/src/commands/{token-profile,schedule}.js` | **PORT** | Per-instance; finish the scan/cron logic as embedded features. |
| CLI `token-profile`/`schedule`/`update` | `packages/cli/src/commands/` | **PORT** | Instance-local commands. |
| Figma plugin | `packages/figma-plugin/src/` | **PORT** | Client-agnostic bridge. |
| GitHub Action | `packages/github-action/` (`verolab/systemix-action`) | **PORT + elevate** | Already per-repo CI — this *is* the embedded-CI story. Elevate from P3 to core: every client instance runs the loop in CI. |

### Not started (1 in v1)
| Component | Disposition | Note |
|---|---|---|
| TokenGuard Phase 10 — distribution (npm publish, auto-register, Marketplace) | **PROMOTE P3 → P0** | Publishing `@systemix/cli` so `npx systemix init` works in an arbitrary client repo is no longer a distant nicety — it **is** the embedded distribution path. Critical path for v-next. |

---

## The data-plane reversal

`supabase/schema.sql` comments describe its tables as *"replaces `.systemix/events/*.json`"*, *"replaces `.systemix/hitl-queue.json`"*, *"replaces `.systemix/sync-log.json`"*. v1 moved local files **up** into a central DB. **v-next likely reverses this for the data plane:** the local-first `.systemix/` store becomes the source of truth inside each instance, with the central DB demoted to an *optional* sync/control-plane target. The reconciler already persisting to `.systemix/runs/` proves the local path still exists under the central one.

**Decision this forces (DISCUSS/DESIGN):** local store format — keep `.systemix/*.json` (simple, gitable, CI-friendly) vs per-repo SQLite (queryable). meta-plan §4.1.

---

## Summary by disposition

| Disposition | Count | Components |
|---|---|---|
| **PORT** | 9 | Token pipeline, Skills/pipelines, MCP proxy, Reconciler, Adapter, TokenGuard core, TokenGuard profiler/scheduler, CLI instance commands, Figma plugin, GitHub Action* |
| **RE-SHAPE** | 6 | MCP server (local store), Docs UI (→ per-instance deliverable), HITL (→ local queue), CLI core/`init` (→ embed scaffold), Brands (→ single-brand config), Queue/Setup (→ init flow) |
| **DEPRECATE → optional control plane** | 4 | Pipeline UI, Workspace/Variables UI, Drift UI, central Supabase multi-tenancy |
| **PROMOTE** | 1 | TokenGuard Phase 10 distribution → P0 (the npm/init path) |

\*GitHub Action counted under PORT + elevated.

---

## What DISCOVER concludes (hands to DISCUSS)

1. The embed substrate is **~60% already built** (9 PORT components) — v-next is mostly a *re-shape of delivery + data plane*, not a rewrite. Satisfies meta-plan criterion **C4 (migration-bounded)**.
2. The **`init` contract** is the linchpin (RE-SHAPE of CLI core). It must be specified before any client scaffold. Satisfies/【blocks】 **C1, C2**.
3. The **central dashboard** is the main casualty — 4 components deprecate to an optional control plane. This is the real open product question: *does a hosted control plane survive, and what does it show?* (meta-plan §4.2)
4. **Distribution (npm publish)** moves to the critical path.

These four become the inputs to the DISCUSS wave (job deltas in `docs/product/jobs.yaml`).
