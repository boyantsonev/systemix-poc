# Atlas — a Systemix per-client surface

> Status: DESIGN draft · 2026-06-05 · grounds the landing "Atlas" pillar
> Prototype reviewed: `connecta/apps/platform` (Workflow Atlas, running on :5173)

## 1. Context

**What Atlas is.** A persona-filtered map of the *agentic workflows a product runs* — each workflow typed by one of the four "Building Effective Agents" patterns (chain / routing / parallelization / orchestration), each step shaped by its role (input / agent / router / parallel / tool / human / output), each step click-through to its prototype screen. Built first in the Connecta platform repo with a clean hexagonal split:

| Layer | Connecta file | Reusable? |
|---|---|---|
| Port (domain contract) | `src/ports/catalog.ts` | **Yes — lift as-is** |
| Layout transform | `src/adapters/flow-layout.ts` | **Yes — pure, client-agnostic** |
| Shell (ReactFlow + persona tabs) | `src/shells/AtlasShell.tsx` | Yes — **rewrite in shadcn/Tailwind** (see §9) |
| Catalog **data** | `src/adapters/workflow-catalog.ts` | **No — this is the client-specific seam** |

**Why this is the whole job.** The renderer is free. Persona / Agent / Surface are just string unions; "Student / Socrat / phone" is *data*, not *code*. To make Atlas a Systemix feature, we replace one hand-authored TypeScript file with a **catalog generated from the client's instance**.

**Critical distinction — do not conflate with `src/lib/data/workflows.ts`.** Systemix already has a `workflows.ts`, but it models *Systemix's own build pipeline* (`trigger → skill → hitl → output` — the design-code sync loop). Atlas models the **client product's runtime agent flows**. Different domain, different node vocabulary, different audience. Atlas is not a view over `workflows.ts`.

## 2. The gap in the instance

`systemix.config.yaml` (today) declares `surfaces`, `signals`, `hermes`, `self_improvement`, `trust`. It declares **nothing about the client's product agents or workflows**. So Atlas has no instance-native source to render. That source is the new artifact this spec introduces.

## 3. Design — catalog as instance contracts

Author product workflows as **declarative contracts in the instance**, consistent with how hypotheses already live in `contract/hypotheses/*.mdx`. One file per workflow:

```
contract/workflows/
  student-socrat-homework.mdx
  student-chat-guardrail.mdx
  ...
```

Frontmatter mirrors the `Workflow` port, but **generalised** — the hardcoded Connecta unions become instance-defined vocab:

```yaml
---
id: student-socrat-homework
persona: student            # open string; vocab declared in config (§4)
title: Socratic homework help
pattern: chain              # chain | routing | parallelization | orchestration (fixed — the 4 patterns)
surface: phone              # open string; vocab declared in config
problem: A student is stuck and wants the answer. Socrat builds understanding instead.
agents: [socrat]            # open strings; vocab declared in config
steps:
  - { id: ask,        label: "Student asks", kind: input,  note: "“What's the answer?”" }
  - { id: understand, label: Understand,     kind: agent,  agent: socrat, note: Reframe as a guiding question, screen: student-socrat-homework }
  - { id: conclude,   label: Conclude,       kind: output, note: Understanding reached }
edges:
  - { from: ask, to: understand }
  - { from: understand, to: conclude }
---
```

`kind` and `pattern` stay closed enums (they drive shape/animation and are domain-universal). `persona`, `surface`, `agent` become **open, config-declared** — that is the single change that de-Connecta-fies the port.

## 4. Config — declare the instance's vocabulary

Add an optional `atlas:` block to `systemix.config.yaml`:

```yaml
atlas:
  personas: [student, teacher, parent, admin]   # tab order; labels optional via map
  agents:
    socrat:    { label: Socrat }
    goodtalk:  { label: GoodTalk }
  surfaces:  [phone, tablet, desktop]
```

Absent `atlas:` → `/atlas` renders the empty state (like `/instance` without a config). Personas/agents are **validated** against this vocab at generate time; an unknown value is a HITL-surfaced authoring error, not a silent break.

## 5. The generator (the one new piece)

`packages/cli` command — `npx systemix atlas build` (and a watch mode):

1. Read `contract/workflows/*.mdx` → parse frontmatter.
2. Validate against `atlas:` vocab + the closed `kind`/`pattern` enums.
3. Emit a catalog module implementing the **lifted `WorkflowCatalog` port** (`all()`, `byPersona()`, `byId()`) — e.g. `.systemix/atlas.catalog.json` consumed by the Systemix-side renderer.
4. Renderer = the lifted `flow-layout.ts` + a de-Tamagui'd `AtlasShell` at a new **`/atlas`** route in the Systemix app (post-onboarding surface, gated like `/instance`).

The transform is pure and already tested in Connecta (`flow-layout.test.ts`, `workflow-catalog.test.ts`) — port those tests too.

## 6. Could the generator author the workflows itself?

Yes — the higher-value version. A skill (`/atlas-scan`) reads the client's agent/skill definitions + route map and **drafts** `contract/workflows/*.mdx`, which a human approves via HITL. That makes Atlas reflect what the app *actually runs*, not a hand-drawn diagram — and closes the Systemix loop (agent writes the map, human approves, map stays live). Treat this as Phase 3; do not block the renderer on it.

## 7. Phased build

- **Phase 1 — Renderer (probe).** Lift port + `flow-layout` + shell into the Systemix app behind `/atlas`. Feed it a hardcoded sample catalog. Proves the surface renders here. *(½ day — code already exists.)*
- **Phase 2 — Generator (MVP).** `contract/workflows/*.mdx` + `atlas:` config + `npx systemix atlas build` → catalog → `/atlas`. Hand-authored contracts. Port the Connecta tests. *(This is the real work.)*
- **Phase 3 — Authoring loop.** `/atlas-scan` drafts workflow contracts from the client codebase, HITL-gated. Makes Atlas self-maintaining.

## 8. Landing impact

The Atlas pillar in `src/app/page.tsx` stays badged `preview` until Phase 2 lands a Systemix-native `/atlas`. At Phase 1 it can link to `/atlas` and drop the badge. The CSS mock preview stays (theme-neutral) — do **not** bake a Connecta-branded screenshot into the neutral landing ahead of the TVA reskin.

## 9. Open questions

- **Catalog source format:** MDX (matches hypotheses, allows prose) vs plain YAML (simpler to generate/validate). Leaning MDX for consistency.
- **Where Atlas binds:** Systemix app route `/atlas` vs shipped inside each client's own app (like Connecta has it). Probably both — same renderer, two mounts — but Systemix owns the generator.
- **Renderer stack (decided):** the Systemix Atlas renderer is built in **shadcn/ui** (Radix + Tailwind + CSS-variable tokens) — Systemix's stack — **not** Tamagui (that is Connecta-only). `@xyflow/react` composes cleanly with shadcn. So "lift the shell" = re-implement `AtlasShell` + node components in shadcn/Tailwind; only `flow-layout.ts` (pure) ports verbatim. The port already forbids colour-from-`kind` (shape only), so an instance theme can't break the legend.
- **Relationship to `/instance`:** `/instance` shows topology (surfaces/signals/autonomy); `/atlas` shows product agent flows. Sibling surfaces — consider a shared shell/nav.
