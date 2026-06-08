# Surfaces Brief — Canonical Spec for the Fresh Build

**Derives from:** [`product-model.md`](./product-model.md) §4.
The layers are spec'd as a **fresh canonical build**. Existing code only
*seeds* the spec — see "Seeds" per surface. This brief tells the landing
(§7) and the Run docs what to represent.

> **Updated 2026-06-08:** now **three layers, not four** — Config 0 and Graph 1
> are merged into one **Config** layer below. System renders via **Fumadocs**;
> Atlas is **gated** behind `init` + DS sync. Canonical spec:
> [`../systemix-rework/app-three-layers.md`](../systemix-rework/app-three-layers.md).

---

## Shared: the shadcn shell, themed by the client DS

- The app is one **shadcn shell** hosting all three layers.
- It pulls a **primary color + font** from the client's design-system instance, so
  the shell — and prototypes — match the client look & feel.
- **Theming contract (mechanics, open question #3):** read the client tokens from
  the instance's token bridge / `globals.css` and map them onto the shell's
  shadcn theme variables (`--primary`, font family, radius). The Atlas prototype
  renderer reads the **same** theme so prototypes render in the real DS, not a
  generic viewer.
- Source of token truth: `globals.css` (oklch vars) + `.systemix/tokens.bridge.json`.

## 1 · Config (settings + the force graph) — *was Config 0 + Graph 1*
- **Shows:** **configure your instance and see it.** An **editable** settings view of
  `systemix.config.yaml` — surfaces/layers, signals (posthog/figma/vercel/social),
  Hermes (model/autonomy/thresholds), self-improvement, trust tiers — **plus** the
  **3D force-directed** topology — sources → skills → agents → contracts → Hermes →
  tools — with the 7-type taxonomy (Data source / Skill / Agent-runtime / Artifact /
  Infrastructure / Concept-UI / AI tool), the live **runtime feed**, **role-routed
  HITL** cards, and the instance **overview** (goals, last updated, hypothesis,
  runtime status).
- **Interactions:** orbit · pan · scroll, search nodes, zoom-to-fit, click a node
  for an info panel ("CONNECTED · N" + related chips); edit + validate config fields.
- **Data source:** `systemix.config.yaml` (what's enabled → node set), `contract/`
  (artifacts), runtime state (`.systemix/systemix.json`: `activeRuns`, `hitlQueue`).
- **Seeds:**
  - **Settings/config seed** = `src/lib/state/instance-config.ts` (hand-rolled YAML
    parser) + the `/instance` config sidebar (`src/app/instance/InstanceView.tsx`),
    today **read-only** → make editable.
  - **Canonical graph look** = the 3D prototype
    `docs/feature/systemix-v2/prototypes/systemix-graph-standalone.html`
    (lib `3d-force-graph` / three.js — 25 nodes / 28 edges in the demo).
  - **Secondary 2D seed** = `src/components/graph/SystemGraph.tsx` + `/graph`
    (static) + `/instance` (config-dimmed), `@xyflow/react`.
- **Fresh-build additions:** **editable config writes**, the runtime feed, and
  role-routed HITL are *new*.

## 2 · System (Fumadocs living styleguide)
- **Shows:** the design system — tokens + components, exact match from the repo,
  Figma-synced if needed; status badges (clean / drifted / missing-in-figma),
  quality score, prototypes. Where designers/builders extend & control agentic UI
  systems and keep workflows + UI prototypes consistent. Hermes-maintained.
- **Renderer:** **Fumadocs**, themed by the client DS, sharing **one theme** with the
  marketing `/docs`; MDX + React embeds (token tables, component previews, prototype
  frames) over a custom Source adapter. See
  [`../systemix-rework/fumadocs-integration.md`](../systemix-rework/fumadocs-integration.md).
- **Data source:** `contract/tokens/*`, `contract/components/*`, `globals.css`,
  `.systemix/tokens.bridge.json`.
- **Seeds:** `src/app/(app)/design-system/*` (overview, tokens, components,
  hypotheses, decisions) and the Connecta `lib/data/docs.ts` registry pattern
  (sync-docs-compatible).

## 3 · Atlas (workflow catalog)
- **Shows:** workflows by **persona** (e.g. Student / Teacher / Parent /
  Administration in the Connecta example), as a ReactFlow view; a **step-type
  legend** (Input / Agent reasoning / Router / Parallel coordinator / Tool call /
  HITL / Output); workflow rows. Clicking a step opens the **prototype as an
  inline detail pane** (the phone-frame view in the screenshots), rendered in the
  client DS — not a standalone surface.
- **Gated:** renders only after `init` is complete **and** a DS is created/synced —
  prototypes render *in the client theme*, so with no theme there is no meaningful
  Atlas. See [`../systemix-rework/init-flow.md`](../systemix-rework/init-flow.md#gates).
- **Data source:** `contract/workflows/*` (per the spec), persona config. Ideally the
  catalog is **generated** from `systemix.config.yaml` + agent defs, not hardcoded.
- **Seeds:** `content/docs/concepts/workflow-atlas.mdx` (spec) + the **reference
  screenshots** (the canonical built look: persona tabs, legend, inline prototype
  phone view). Note the Atlas UI is built in a prototype outside this repo
  (the `:5173` dev server).

---

## How the marketing site represents the surfaces

Because the surfaces are a fresh build (home TBD), the marketing site should
**demo** them, not host them:

- **Recommended:** curated **screenshots** (Graph 3D, System, Atlas + prototype) —
  cheapest, always-on, controllable. Use them in landing §6/§7 and the Run docs.
- *Later option:* embedded live demo or a link to a hosted instance, once a
  canonical home exists.

## Resolved (2026-06-08)
1. **Canonical home** — the layers live in the **separate per-instance shadcn shell**
   that `init` distributes; getsystemix stays marketing + docs.
2. **Demo mechanic** — **screenshots**.
3. **Theming mechanic** — **build-time** CSS vars compiled from the instance DS;
   light/dark mode stays runtime via `.dark`.
