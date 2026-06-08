# Surfaces Brief — Canonical Spec for the Fresh Build

**Derives from:** [`product-model.md`](./product-model.md) §4.
The four surfaces are spec'd as a **fresh canonical build**. Existing code only
*seeds* the spec — see "Seeds" per surface. This brief tells the landing
("Four surfaces" §7) and the Run docs what to represent.

---

## Shared: the shadcn shell, themed by the client DS

- The app is one **shadcn shell** hosting all four surfaces.
- It pulls a **primary color + font** from the client's design-system instance, so
  the shell — and prototypes — match the client look & feel.
- **Theming contract (mechanics, open question #3):** read the client tokens from
  the instance's token bridge / `globals.css` and map them onto the shell's
  shadcn theme variables (`--primary`, font family, radius). The Atlas prototype
  renderer reads the **same** theme so prototypes render in the real DS, not a
  generic viewer.
- Source of token truth: `globals.css` (oklch vars) + `.systemix/tokens.bridge.json`.

## 0 · Config
- **Shows:** `systemix.config.yaml` — surfaces, signals (posthog/figma/vercel/
  social), Hermes (model/autonomy/thresholds), self-improvement, trust tiers — as
  a readable, editable file.
- **Data source:** `systemix.config.yaml`.
- **Seeds:** `src/lib/state/instance-config.ts` (hand-rolled YAML parser) + the
  `/instance` config sidebar (`src/app/instance/InstanceView.tsx`).

## 1 · Graph (the force graph)
- **Shows:** the **3D force-directed** topology of the instance — sources → skills
  → agents → contracts → Hermes → tools — with the 7-type taxonomy (Data source /
  Skill / Agent-runtime / Artifact / Infrastructure / Concept-UI / AI tool). Plus
  the live **runtime feed** and **role-routed HITL** cards, and the instance
  **overview** (goals, last updated, hypothesis, runtime status).
- **Interactions:** orbit · pan · scroll, search nodes, zoom-to-fit, click a node
  for an info panel ("CONNECTED · N" + related chips).
- **Data source:** `systemix.config.yaml` (what's enabled → node set), `contract/`
  (artifacts), runtime state (`.systemix/systemix.json`: `activeRuns`, `hitlQueue`).
- **Seeds:**
  - **Canonical look** = the 3D prototype
    `docs/feature/systemix-v2/prototypes/systemix-graph-standalone.html`
    (lib `3d-force-graph` / three.js — 25 nodes / 28 edges in the demo).
  - **Secondary 2D seed** = `src/components/graph/SystemGraph.tsx` + `/graph`
    (static) + `/instance` (config-dimmed), `@xyflow/react`. Ships today with
    node-inspect + config-dimming only.
- **Fresh-build additions:** the runtime feed and role-routed HITL are *new* (the
  "Decision Queue" exists only as a concept node today).

## 2 · System (living styleguide)
- **Shows:** the design system — tokens + components, exact match from the repo,
  Figma-synced if needed; status badges (clean / drifted / missing-in-figma),
  quality score, prototypes. Where designers/builders extend & control agentic UI
  systems and keep workflows + UI prototypes consistent. Hermes-maintained.
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
- **Data source:** `contract/workflows/*` (per the spec), persona config.
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

## Open questions (carried from the plan)
1. **Canonical home** of the four surfaces — fold into this Next.js app vs. a
   separate shadcn shell repo. Gates how Run docs + landing §7 get built.
2. **Demo mechanic** — screenshots (recommended) vs. embed vs. live link.
3. **Theming mechanic** — read DS tokens at build vs. runtime.
