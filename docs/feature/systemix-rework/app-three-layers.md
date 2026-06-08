# The Three-Layer Per-Instance App

**Derives from / supersedes:** [`../site-rebuild/surfaces-brief.md`](../site-rebuild/surfaces-brief.md)
and `product-model.md` §4. The app is **three layers, not four** — Config absorbs Graph.
**Status:** 🔒 LOCKED as ADR-010.

---

## Why three, not four

The old model split **Config** (view/edit `systemix.config.yaml`) and **Graph** (the 3D
force-directed topology) into two surfaces. But they are the same job from two angles: *understand
and control your instance.* The graph **is** the configuration, visualized; the settings page is the
configuration, edited. Merging them gives one coherent "configure your instance and see it" layer
and matches how the instance is actually operated.

## Shared: the shadcn shell, themed by the client DS

- One **shadcn shell** hosts all three layers.
- It pulls a **primary color + font** from the client DS instance — shell *and* prototypes match the
  client look & feel.
- **Theming = build-time** CSS custom properties compiled from the instance DS at `init`/build;
  light/dark **mode** stays runtime via `.dark`. (Runtime token injection rejected — contradicts the
  single-tenant embedded model.)
- Token truth: `globals.css` (oklch vars) + `.systemix/tokens.bridge.json`.

---

## Layer 1 · Config (was Config + Graph)

**One surface: configure your instance and see it.**

- **Editable settings page** — adjust **skills, agents, signals, autonomy, self-improvement, trust
  tiers, infra**; reads/writes `systemix.config.yaml`. (Today's `/instance` shows this **read-only**
  in a sidebar — the new spec makes it **editable**, with validation, and is the founder's
  "config/settings page where we can adjust Systemix skills, agents, etc.")
- **3D force-directed graph** — the instance topology: sources → skills → agents → contracts →
  Hermes → tools, with the **7-type taxonomy** (Data source / Skill / Agent-runtime / Artifact /
  Infrastructure / Concept-UI / AI tool). Orbit · pan · scroll, search, zoom-to-fit, node-info panel.
  The force graph is the centerpiece — **not** a card dashboard.
- **Runtime feed + role-routed HITL** decision cards + the instance **overview** (goals, last
  updated, hypothesis, runtime status).
- **Data:** `systemix.config.yaml` (node set), `contract/` (artifacts), `.systemix/systemix.json`
  (`activeRuns`, `hitlQueue`).
- **Seeds:** `src/lib/state/instance-config.ts`, `/instance` sidebar (`InstanceView.tsx`), the 3D
  prototype `docs/feature/systemix-v2/prototypes/systemix-graph-standalone.html`
  (`3d-force-graph`/three.js), the 2D `src/components/graph/SystemGraph.tsx` (`@xyflow/react`).
- **Fresh-build additions:** editable config writes, the runtime feed, and role-routed HITL are new.

## Layer 2 · System (Fumadocs living styleguide)

- **Shows:** the design system — tokens + components + prototypes, exact match from the repo,
  Figma-synced when needed; status badges (clean / drifted / missing-in-figma), quality score.
  Where designers/builders extend & control the agentic UI system. **Hermes-maintained.**
- **Rendered via Fumadocs**, sharing **one theme** with the marketing `/docs`, themed by the client
  DS. MDX + React embeds (token tables, live component previews, prototype frames), sourced
  **programmatically** from `contract/*` + `lib/data/docs.ts`. See
  [`fumadocs-integration.md`](./fumadocs-integration.md).
- **Data:** `contract/tokens/*`, `contract/components/*`, `globals.css`, `.systemix/tokens.bridge.json`.
- **Seeds:** `src/app/(app)/design-system/*`, the Connecta `lib/data/docs.ts` registry pattern.

## Layer 3 · Atlas (workflows → prototypes)

- **Shows:** the **workflow catalog**, per persona — ReactFlow view + persona tabs + a **step-type
  legend** (Input / Agent reasoning / Router / Parallel coordinator / Tool call / HITL / Output) +
  workflow rows. Clicking a step opens the **prototype as an inline detail pane** (phone-frame),
  rendered in the client DS — **not** a standalone surface.
- **Gated:** renders **only after init is complete AND a DS is created/synced** (see
  [`init-flow.md`](./init-flow.md#gates)) — prototypes need the client theme to be meaningful.
- **Data:** `contract/workflows/*`, persona config. Ideally the catalog is **generated** from
  `systemix.config.yaml` + agent defs (see the Connecta retro learning), not hardcoded.
- **Seeds:** Connecta `apps/platform` AtlasShell (the hexagonal `catalog.ts` port + `flow-layout.ts`
  port **verbatim**; the shell/UI **re-implemented in shadcn**, not ported — Tamagui is
  Connecta-only), `content/docs/concepts/workflow-atlas.mdx`, the `:5173` prototype reference.

---

## Layer-to-domain map

| Layer | Hypothesis domain it serves | Operating role |
|---|---|---|
| Config | (all — it's the control plane) | Engineer / Operator |
| System | **UI** | Designer |
| Atlas | **Workflows** | Operator / Designer |

(The third domain, **landing value-props**, is measured on the live landing the loop watches — not a
layer.)

## How the marketing site represents the layers

Unchanged from the prior decision: the marketing site **demos** the layers via curated
**screenshots** (cheap, always-on, controllable), not a live embed. Recast the landing's old
"Four surfaces" section to **three layers** — see
[`../site-rebuild/landing-ia.md`](../site-rebuild/landing-ia.md) §7.
