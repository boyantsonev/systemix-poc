---
title: "Atlas + Config (3D graph) packaging — skills vs. plugin, pros/cons for a decision"
status: PROPOSED — decision input, not yet an ADR
type: pivot-analysis
date: 2026-07-07
canon:
  - decisions/ADR.md (ADR-006, ADR-007, ADR-008, ADR-010, ADR-012, ADR-016, ADR-017)
  - docs/feature/systemix-rework/app-three-layers.md
  - docs/systemix-productization-benchmark-2026-07.md (the tiering this packaging decision feeds)
---

# Atlas + Config (3D graph) — skills vs. plugin

## 0. TL;DR

Neither Atlas nor Config's 3D graph is shipped to clients today — `npx @getsystemix/cli init` (v6, per
`packages/cli/src/lib/layout.js`) only scaffolds `experiments/` (the loop) and the optional
`design/` substrate (`DESIGN.md`, `guardrails.mdx`, `tokens.css`). Atlas and the 3D graph exist
**only inside Systemix's own dogfood app** and are demoed to prospects via screenshots
(`app-three-layers.md`: "the marketing site demos the layers via curated screenshots... not a live
embed"). So this isn't "reorganize an existing distribution" — it's the first real decision about
*how these two surfaces leave the building at all.* There's one hard technical fact that should
anchor the whole decision: **Config's 3D graph is WebGL (`three.js`) — it cannot run inside a
markdown skill or a Cowork live-artifact** (Cowork artifacts are limited to Chart.js/Grid.js/Mermaid
from CDN; no three.js). Atlas is lighter (ReactFlow/SVG) and degrades to a Mermaid diagram
reasonably well. That asymmetry should probably split the decision rather than force one answer
for both.

## 1. What each surface actually is, on disk today

| | Config's 3D graph | Atlas |
|---|---|---|
| Renderer | `src/components/graph/SystemGraph3D.tsx` — `three.js` ^0.184.0, orbit/pan/zoom, force-directed layout, camera-fly (ADR-022) | `src/components/atlas/*` (`GroupLabel`, `PatternLegend`, `StepNode`, `node-types.ts`) — `@xyflow/react` (SVG/Canvas 2D) |
| Data source | `src/lib/state/instance-topology.ts` — reads `systemix.config.yaml` (sources/agents), pipeline manifests, `experiments/*.mdx`, `.systemix/queue.json`; emits the 7-type node/edge taxonomy (ADR-021 §6) | `contract/workflows/*` + persona config; **generated** from `systemix.config.yaml` + agent defs, not hardcoded (ADR-012) — the same generation-not-hardcoding pattern already ported "verbatim" from Connecta's `catalog.ts`/`flow-layout.ts` |
| MCP-server-side logic | `packages/mcp-server/src/node-map.ts` (Figma node tracking, adjacent), general contract/state tools | `packages/mcp-server/src/tools/workflow.ts` — `list_workflows`/`get_workflow`, already reads from a JSON snapshot or the compiled source; **this part is already MCP-shaped**, i.e. already speaks the protocol a plugin would use |
| Gating | Always visible in Config (ADR-010) | Gated — renders only after `init` is complete **and** a DS is synced (ADR-010 Layer 3) |
| Current distribution | Internal only; screenshots on marketing | Internal only; screenshots on marketing |

Read together: the **data/logic layer for both is already close to plugin-shaped** (an MCP server
with typed tools). The thing that isn't yet portable is the **rendering layer** — and only Config's
is hard-blocked from running inside the skill/Cowork-artifact model; Atlas's plausibly isn't.

## 2. Option A — Skills-only (extend the existing `npx @getsystemix/cli init` v6 model)

**Mechanics:** Either (a) vendor the Atlas/Config app code into `packages/cli/templates/` the way
`design/` is vendored today (`DESIGN.md`, `guardrails.mdx`, `tokens.css` — three flat files, no
framework deps), scaled up to real app code with real dependencies; or (b) keep only the
*data-generation* logic as CLI commands/MCP tools and skills, and accept a degraded 2D/Mermaid
render inside a Cowork live-artifact instead of shipping the app at all.

**Pros**

- Matches the v6 philosophy stated in `layout.js` itself: "the LOOP is the core... design/ is an
  OPTIONAL substrate" — skills-only keeps that principle intact instead of quietly growing the
  vendored footprint.
- No new distribution mechanism to build — `npx @getsystemix/cli init` already exists (ADR-008), already
  copies templates into a client repo, already versions with the client's own git history.
- Fully local-first and air-gap-compatible (ADR-007) — nothing to install beyond the CLI, no
  external service dependency, no auth.
- Every line is plain text in the client's own repo — inherently HITL-reviewable the same way every
  other skill/guardrail already is (the `write-policy` safety rail from `CLAUDE.md` applies
  uniformly; nothing special-cased).
- Consistent with ADR-017 (repo-as-product, public MIT, stars/forks as a traction signal) — if
  Atlas/Config ship as skills in the same public repo, they compound the same virality loop
  getdesign.md's free tier runs on.

**Cons**

- If (a) vendoring the real app: every client repo now carries `three.js`, `fumadocs-core/mdx/ui`,
  `@xyflow/react` as direct dependencies — multiplied across every instance you stand up, not paid
  once. Upgrading three.js or fixing a graph bug means re-pushing into every client repo
  individually; ADR-012 already names this exact pain for Connecta ("Connecta's DS path is
  `systemix update`," i.e. a manual re-sync, not a push).
- If (b) data-only + Mermaid/2D fallback: you ship a materially worse experience than your own
  dogfood app for the two surfaces that are your best demo material — `experiments/goals/consultancy-leads.mdx`'s
  entire north star is "founders who see the live, dogfooded loop book a call." A flattened 2D
  fallback undercuts the actual lead magnet.
- Once it's plain files in a public MIT repo, it's free and trivially copyable — the same structural
  weakness getdesign.md's *own* free tier has (per the getdesign.md benchmark doc, §1). That's fine
  for the loop (intentionally the magnet), but Atlas + Config are the more differentiated, harder-to-
  reproduce assets — giving them away for free forecloses exactly the paid-tier lever the
  productization doc identified as missing (self-serve $149–249 band, §4 of that doc).
- No update channel — a security fix, a UX improvement, or a new node type in the taxonomy has no
  way to reach an already-`init`'d client except them re-running `systemix update` and accepting a
  diff (works, but is pull-based and easy to skip).

## 3. Option B — Plugin (Claude Code / Cowork plugin bundle)

**Mechanics:** Package `packages/mcp-server` (already an MCP server) + a skill set + a
`.claude-plugin/plugin.json` manifest, distributed via a marketplace — the same shape as the
`data`/`marketing`/`design`/`product-management` plugins already installed in *this* environment
(versioned, namespaced, skills + an MCP connector bundled together). The plugin's MCP server reads
the client's **local** files (`systemix.config.yaml`, `contract/*`, `.systemix/*` — still ADR-007-
compatible, nothing centralized by default) and either (b1) launches a bundled companion app on the
client's own machine for the actual 3D/ReactFlow rendering (still fully local — just centrally
versioned instead of vendored per-repo), or (b2) points at a thin, Boyan-hosted, read-only viewer
(this reopens the ADR-006 "optional control plane" allowance, scoped to visualization only).

**Pros**

- One update channel for everyone. Fix the 3D graph once, every installed client gets it on next
  plugin update — this is the actual trigger ADR-016 itself names for revisiting the current model:
  *"a team of more than 1–3 needs a shared, always-on cockpit → revisit."* Client count > 1–3 is
  exactly the point this decision is being made at.
- Keeps client repos thin — no `three.js`/`fumadocs`/`@xyflow/react` vendored into every instance;
  better alignment with the v6 "loop is core, everything else optional" principle than the
  full-vendoring variant of Option A.
- The natural packaging for the paid tier. A marketplace-gated plugin is licensable/meterable in a
  way public MIT files structurally aren't — this is the missing monetization lever the
  productization doc flagged (§4: nothing sits between the free loop and a bespoke sprint). Atlas +
  Config become the concrete answer to "what's actually inside the paid tier" ("as part of the full
  skillset," per your framing).
- Not speculative — this environment is a live example of the exact packaging shape (skills + MCP
  connector, versioned, namespaced) working end to end, so the ecosystem/tooling risk is lower than
  it looks on paper.
- Bundles version-pinned heavy deps once, centrally, instead of N times across N client repos.

**Cons**

- Real new engineering surface: a plugin manifest, marketplace hosting/listing, versioning
  discipline, and (for b2) auth — none of this exists today; it's a genuine build, not a repackage.
- (b2) specifically **reopens ADR-006** — the decision that deliberately demoted the central,
  multi-tenant hosted app to an *optional*, opt-in, read-only control plane for GDPR/data-ownership
  reasons, driven by Connecta. A hosted viewer must stay strictly opt-in and read-only to not regress
  that decision — and that constraint is *more* important, not less, for an ESG/regtech design
  partner, where "your visualization data touches our servers" is a harder sell than for Connecta.
- A plugin + MCP server + (maybe) a bundled app is a bigger trust surface than plain-text skills in a
  client's own repo. Skills are inherently reviewable the way every other guardrail already is
  (`CLAUDE.md`'s `write-policy` rail); installing software is a heavier ask — ironically hardest to
  clear with exactly the compliance-sensitive audience (regtech/ESG) this whole packaging question is
  partly aimed at winning.
- Couples release cadence to two moving parts: the plugin version and the client's
  `systemix.config.yaml` schema. If a client's local files drift from what the currently-installed
  plugin expects, that's a new failure class skills-in-repo don't have today (skill and data always
  ship and version together under Option A).
- Claude Code/Cowork's plugin format is young — real but still moving; building on it is a bet on API
  stability that a plain-files skill model doesn't have to make.

## 4. The decision probably splits by asset, not one answer for both

Given §1's asymmetry (Atlas is Mermaid-fallback-viable; Config's 3D graph structurally is not), a
defensible split:

- **Atlas → skill-shaped**, generated by the existing MCP tool (`workflow.ts` is already there) and
  rendered as a Mermaid diagram inside a Cowork live-artifact or the client's own docs. Cheap to
  ship, no heavy deps to vendor, fits inside the free/self-serve tiers without undercutting anything
  premium — a workflow catalog as a diagram is useful even flattened to 2D.
- **Config's 3D graph → the plugin-gated (or sprint-tier-bespoke) premium surface.** It mechanically
  becomes the concrete answer to "part of the full skillset" — the thing that's materially better
  with a paid plugin/sprint engagement than with the free `npx @getsystemix/cli init` loop, instead of
  something every free user already gets for nothing. This also sidesteps most of Option A's
  vendoring cost, since only the harder-to-reproduce surface goes through the heavier packaging path.

## 5. The actual axis this decision sits on

Both options are internally consistent — the real choice is which prior decision you want to extend
vs. deliberately reopen:

- **Skills-only** extends ADR-006/007/017 as already written: local-first, embedded, repo-as-product,
  nothing centralized. Path of least resistance — no new ADR needed, just a template addition.
- **Plugin** is a scoped, deliberate reopening of ADR-006's "central hosting is demoted to optional"
  boundary — fine to do, but it should be named as a decision (an ADR amendment), not something that
  drifts in quietly through a template change. ADR-006's own review trigger ("a team of more than 1–3
  needs a shared, always-on cockpit") is arguably already firing if the goal is multiple paying
  clients, which argues for treating this as a real decision point now rather than deferring it again.

No recommendation forced here — flagging that whichever way you lean, it's worth writing as an ADR
(ADR-023?) either way, since it either extends or amends existing canon that other docs already cite.
