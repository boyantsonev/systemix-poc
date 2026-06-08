# Product Model — SSOT for the Site Rebuild

**Feature:** site-rebuild · **Type:** strategy/IA blueprint · **Status:** authoritative model
**Read first.** Every other doc in this folder (`positioning.md`, `landing-ia.md`,
`docs-ia.md`, `surfaces-brief.md`, `migration-cleanup.md`) derives from this one.

> This file fixes *what Systemix is* so the landing and the marketing docs stop
> mixing meanings. It is the product model the site must communicate — not a
> roadmap and not an implementation spec.

> **Superseded in part (2026-06-08):** the product model now lives in
> [`../systemix-rework/`](../systemix-rework/). Two things below were updated there:
> the four surfaces are now **three layers** (Config absorbs Graph — §4), and the
> docs/System render via **Fumadocs** under one shared theme (§3). The loop spine,
> install/setup, the shadcn-shell principle, and naming discipline are unchanged.

---

## 1. The spine — the learning loop

Systemix exists to give a team a **learning loop around their design system**:
create and measure hypotheses, then keep the result permanently next to the
artifact it describes, so the next decision (human or agent) starts from evidence,
not memory.

A hypothesis can be about **three kinds of value**:

| Domain | Example hypothesis | Surface it lives closest to |
|---|---|---|
| **UI** | "A coral primary CTA converts better than the neutral one." | System |
| **Workflows** | "Routing risky messages to *rewrite* before *send* lowers escalations." | Atlas |
| **Landing value propositions** | "Leading with the founder-pain framing lifts hero CTR." | (the live landing the loop measures) |

All three wrap around one design system. The loop is the product's reason for
being; the three layers below are how you operate it.

The loop itself (already the landing hero, kept): **ship → signals → Hermes
synthesizes → decision (HITL) → written back to the contract → next ship starts
from evidence.**

## 2. Install & setup — configuring the loop

1. `npx systemix init`.
2. Setup questions **feed the loop**: connect **Figma files**, **existing repos**,
   and/or a **desired UI setup**.
3. You **define the hypothesis** (e.g. a pre-seed MVP landing-tracking experiment).
4. The **agentic pipeline workflow** surfaces any further questions it needs to
   wire the loop.
5. The app is initiated for that instance.

> The current CLI (`packages/cli`) implements a four-question wizard — Surfaces /
> Signals / Autonomy / Self-improvement — writing `systemix.config.yaml` +
> `~/.systemix/config.json`. The setup above is the **intended, forward** shape
> (feed inputs → define hypothesis → pipeline-driven follow-ups); the existing
> wizard is the seed, not the ceiling. See `surfaces-brief.md` and
> `src/lib/state/instance-config.ts`.

## 3. The app — a shadcn shell, themed by the client's design system

The Systemix app is a **shadcn shell**. It pulls a **primary color and font from
the client's design-system instance**, so the entire app chrome — and every
prototype it renders — match that client's look & feel. (The Connecta cream/coral
example in the reference screenshots is this shell themed for Connecta.)

This is a product principle, not chrome: Systemix *wears your brand*. The Atlas
prototype renderer inherits the same theme, so prototypes are shown in the real
design system rather than a generic viewer.

The in-app **System** layer and the marketing **docs** both render through
**Fumadocs**, driven by one Tailwind v4 token source (Fumadocs namespaced via
`cssPrefix` to avoid shadcn collisions). See
[`../systemix-rework/fumadocs-integration.md`](../systemix-rework/fumadocs-integration.md).

## 4. The three layers

**Updated 2026-06-08:** the app is **three layers, not four** — Config absorbs Graph.
Full spec: [`../systemix-rework/app-three-layers.md`](../systemix-rework/app-three-layers.md).

| # | Layer | What it is |
|---|---|---|
| 1 | **Config** | **Configure your instance and see it.** An **editable** settings page (skills, agents, signals, autonomy, self-improvement, trust tiers, infra → reads/writes `systemix.config.yaml`) **+ the 3D force-directed graph** of the instance (`3d-force-graph`/three.js: sources → skills → agents → contracts → Hermes → tools; 7-type taxonomy; orbit·pan·scroll, search, zoom-to-fit, node-info panel) **+ runtime feed + role-routed HITL + instance overview**. The force graph is the centerpiece — **not** a card dashboard. |
| 2 | **System** | The **design system** — tokens + components, an exact match from the repo, Figma-synced when needed; **rendered via Fumadocs**, themed by the client DS, sharing one theme with the marketing docs. Where designers/builders extend & control agentic UI systems and keep workflows + UI prototypes consistent. **Hermes-maintained living docs.** |
| 3 | **Atlas** | The **workflow catalog**, per persona. ReactFlow view + persona tabs + step-type legend (Input / Agent reasoning / Router / Parallel coordinator / Tool call / HITL / Output) + workflow rows. Clicking a step opens the **prototype as an inline detail pane**, rendered in the client design system. **Gated:** renders only after `init` is complete **and** a DS is created/synced. |

## 5. Naming discipline (the trap to avoid)

- **System** (surface 2) = the in-app, self-updating **design documentation /
  living styleguide**. It was internally called "docs" — it is **not** the
  marketing docs.
- **Docs** = the **marketing documentation site** at `getsystemix.vercel.app/docs`
  — how to install and use Systemix. This is what "the docs" means in the rebuild
  scope.

These are different artifacts with different audiences. Never conflate them in any
blueprint doc, nav label, or copy line.

## 6. Audiences (role lens)

Three roles recur across landing + docs (used as accents, not hard silos):

- **Operator** — runs the loops, works the HITL queue, reads decisions.
- **Designer** — lives in System (tokens, components, drift, prototypes).
- **Engineer** — runs `init`, wires skills/MCP, owns CI and config.

## 7. Scope reminder

This round is **blueprint / IA only — no code**. The three layers are spec'd as a
**fresh canonical build** (current `/graph`, `/instance`, `/design-system`, the
two graph prototypes, and the Atlas prototype only *seed* the spec). The surfaces
live in the per-instance app that `init` distributes (a separate shadcn shell);
getsystemix stays marketing + docs and demos them via screenshots. Full layer spec:
[`../systemix-rework/app-three-layers.md`](../systemix-rework/app-three-layers.md).
