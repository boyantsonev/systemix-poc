---
name: jtbd-atlas
description: Turn a Job-to-be-Done into an eagle-eye node/edge canvas of the workflow that gets that job done — every step (input, agent, tool, human, router, output) drawn on one React Flow board, with the terminal nodes being the actual prototypes the flow leads to. Interview or infer the JTBD, map it to a portable Workflow graph, and drop in a token-agnostic @xyflow/react component set that inherits the host project's design-system tokens (no hardcoded colours). Self-contained: copy this folder into any React project's .claude/skills/ and run it.
argument-hint: "[product / feature / JTBD]"
version: "0.2.0"
last_updated: "2026-07-13"
---

# /jtbd-atlas — the job, drawn as a workflow you can see at a glance

Produce a **canvas-based node/edge map** for: **$ARGUMENTS**

You give it a job ("when I'm onboarding a new hire, I want to…"); it gives back an
**eagle-eye view** — the whole workflow that gets that job done as nodes and edges
on one `@xyflow/react` (React Flow) board, ending in the **prototypes** (screens)
the flow leads to.

It ships a small, **token-agnostic** component set: the nodes reference
`--atlas-*` CSS variables that map to the host project's design-system tokens
(shadcn names by default). **No colours are hardcoded** — the board inherits your
DS. Retheme by editing one file (`atlas.css`).

## When to use

- You have a JTBD (or a product/feature) and want the whole flow on one board.
- You want to see how steps chain/branch/fan-out **into the prototypes** that end them.
- You're evaluating this skill in another (React) project — this is the thing to run.

## The model (`atlas.types.ts`)

```
Workflow { id, title, problem?, pattern?, surface?, steps[], edges[] }
  Step   { id, label, kind, note?, owner?, screen? }
  Edge   { from, to, label? }
```

- **kind** — the step's role. Drives glyph + shape, never colour:
  `input` ▷ (job trigger) · `agent` ✦ (an actor/model reasons) · `router` ⋔
  (classifies + branches) · `parallel` ≣ (fan-out/fan-in) · `tool` ⌗
  (deterministic call) · `human` ⊙ (HITL checkpoint) · `output` ✓ (terminal result).
- **screen** — set it on the nodes that ARE prototypes: a route (`/onboarding`),
  a path, or a URL. Those nodes get an ↗, the accent border, and open on click.
  **This is the "leads to the actual prototypes" part** — a workflow should
  terminate in one or more `screen` nodes.
- **owner** — free text: who runs the step (a role, an agent, a service).
- **pattern** — `chain | routing | parallelization | orchestration`. Edges animate
  (marching ants) on `parallelization`/`orchestration`.
- **surface** — `phone | tablet | desktop`. Optional band badge.

One `Workflow` = one job (or one persona's path through it). Emit several to see a
whole product's jobs stacked as bands on the same board.

## Files in `template/atlas/` (copied into the host project)

| File | Role |
|---|---|
| `atlas.types.ts` | the portable Step/Edge/Workflow model |
| `flow-layout.ts` | `toFlow()` — layered-DAG layout → React Flow nodes/edges |
| `StepNode.tsx` | the node — shape/glyph by kind, colour from `--atlas-*` |
| `GroupLabel.tsx` | the per-workflow band title + badges |
| `node-types.ts` | wires kinds → components |
| `AtlasFlow.tsx` | drop-in board: `<AtlasFlow workflows={…} />`, fits to view |
| `atlas.css` | **the theming seam** — maps `--atlas-*` → your DS tokens |
| `example.ts` | placeholder `WORKFLOWS` (replaced by the skill) |

## Steps

### 1. Frame the job (interview only if not obvious)

If `$ARGUMENTS` already names a concrete job/product, infer a first draft and
confirm — don't over-interview. Otherwise ask (AskUserQuestion where enumerable):

- **Job executor** — who's getting the job done?
- **Functional job**, job-first and solution-agnostic:
  *"When ⟨situation⟩, I want to ⟨goal⟩, so I can ⟨outcome⟩."* → `Workflow.problem`.
- **Job steps** — the sequence they move through (define → locate → prepare →
  confirm → execute → monitor → conclude). Each becomes a node.
- **Prototypes** — which screens/routes the job lands on. If the host repo has an
  app, scan it (`src/app/**/page.*`, `app/**`, `pages/**`, or a router config) and
  propose terminal `screen` nodes from real routes. No app yet? Use intended route
  names — the map is still the point.

Keep it tight: a good first workflow is **5–9 steps**. Map job stages to `kind`:
the trigger is `input`; a decision is a `router`; a reason/generate step is
`agent`; a lookup/API/build is a `tool`; an approval is `human`; each landing
screen is an `output` with a `screen`.

### 2. Install React Flow (if missing)

Check `package.json` for `@xyflow/react`. If absent, tell the user to add it
(`npm i @xyflow/react` / `pnpm add @xyflow/react`) — it's the one dependency. React
18/19 projects only.

### 3. Drop in the component set

Copy `template/atlas/` into the host project (e.g. `src/components/atlas/` or
`components/atlas/`). Then:

- **Author the graph** — replace `WORKFLOWS` in `example.ts` (or a new
  `workflows.ts`) with the workflow(s) from step 1. Rules that keep the eagle-eye
  view readable: every step reachable from an `input`; every branch resolves into
  an `output`; ≥1 `output` carries a `screen`; `label` ≤ ~24 chars, `note` ≤ ~90.
- **Do NOT touch** the layout/render files — per-instance change lives in the data
  and in `atlas.css`, so the next project gets the same board.

### 4. Confirm the tokens map (the agnostic seam)

Open `atlas.css`. It maps `--atlas-*` → your DS tokens; the defaults assume
shadcn/Tailwind-v4 variables that hold colour values (`--card`, `--foreground`,
`--border`, `--primary`, `--muted`, `--muted-foreground`, `--background`).

- If those exist → **nothing to do**, it already themes itself.
- If your tokens are **HSL channel triplets** (older shadcn, used as
  `hsl(var(--foreground))`) → wrap them: `--atlas-fg: hsl(var(--foreground));`.
- If your DS uses **different names** → repoint, e.g.
  `--atlas-node-bg: var(--surface-raised);`.

This is the only place colour is named. Verify the six-or-so mappings resolve in
the host DS; don't invent token names.

### 5. Render it on a route

Mount the board in a **sized** container (React Flow measures its parent):

```tsx
import { AtlasFlow } from "@/components/atlas/AtlasFlow";
import { WORKFLOWS } from "@/components/atlas/example";

export default function AtlasPage() {
  return (
    <div style={{ height: "100dvh" }}>
      <AtlasFlow workflows={WORKFLOWS} />
    </div>
  );
}
```

It loads **fit-to-view** — the eagle-eye default — with pan, wheel-zoom, Controls,
and a MiniMap. Prototype nodes (↗) open their `screen`.

### 6. Verify + report

Run the app and confirm the board renders and themes from the DS (not a stray
palette). One line back: the job in one sentence, the step count, and which nodes
are the prototypes it lands on. Offer to add another band (another job/persona) or
wire the `screen` routes if the host app doesn't have them yet.

## Portability / testing in another project

This folder is the whole skill. To try it elsewhere: copy
`.claude/skills/jtbd-atlas/` into that project's `.claude/skills/`, then run
`/jtbd-atlas <the job>`. The only runtime dependency is `@xyflow/react`; colour
comes from the host's own tokens via `atlas.css`.

## Status & provenance

Built 2026-07-13 as the portable, token-agnostic realization of Systemix's atlas
seam (the POC's `src/components/atlas` + `src/lib/ports/atlas.ts` renderer, itself
ported from the Connecta Workflow Atlas). **Deliberately repo-local — NOT vendored
by `systemix init`** (absent from the hypothesis-validation manifest). Decision:
keep it local and only promote it into the vendored pipeline **when the job
repeats** — a builder actually reaching for "show the job as a flow to the
prototypes" inside an instance, more than once.

When promoted, two things happen together: (1) **end the `atlas` name overload** —
`/atlas` already means the loop-workflow generator, not a diagram; rename one. (2)
**Unify to one renderer** — fold the POC's token-bound `atlas` renderer (the
`Agent`-enum'd copy `WorkflowDiagram` uses at `/experiments`) onto this portable
version so the two don't drift.

## Guardrails

- **Token-agnostic, always.** No colour literals in components — only `--atlas-*`.
  If a host token doesn't exist, map it in `atlas.css`; never hardcode a hex.
- **Visualize, don't decide.** The map is a lens on the job, not a plan of record.
  It reads the repo (routes) but the only files it authors are the atlas component
  set + your `WORKFLOWS` data.
- **Prototypes are the terminus.** If a workflow has no `screen` node, it doesn't
  yet "lead to a prototype" — say so rather than drawing a dangling flow.
- **Keep the render code generic.** Per-instance change goes in the `WORKFLOWS`
  data and `atlas.css`, not the layout/node files.
- **Solution-agnostic `problem`.** The job statement names an outcome, never a
  feature. (Pairs with `/jtbd-audit` for ODI opportunity scoring first.)
