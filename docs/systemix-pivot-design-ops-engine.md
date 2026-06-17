---
title: "Systemix — Cowork Operating Layer (reconciled to canon)"
status: PROPOSED — subordinate to ADR-006…015 and what-is-systemix.md
type: pivot-analysis
date: 2026-06-13
reconciled: true
supersedes_self: "v1 of this doc, which invented an Operator/Scribe stack, a single design.md memory, and ADR-001…005 numbers that collide with the real ADR log"
canon:
  - decisions/ADR.md (ADR-006…015)
  - docs/feature/systemix-rework/what-is-systemix.md
  - docs/feature/systemix-rework/app-three-layers.md
---

# Systemix — the Cowork operating layer

> **Read this as a reconciliation, not a new direction.** The pivot it describes was already
> decided in the repo (ADR-005, 006, 007: CLI-first, embedded per-client, local-first; the central
> app demoted to an optional control plane). This doc only adds what *this planning thread* settled:
> how Systemix is **operated from Claude Cowork**, the **Hermes engine choice (ADR-013)**, the
> **removal of agent personas (ADR-014)**, and the **multi-format memory model (ADR-015)**. Where
> this doc and the canon ever disagree, the canon wins.

---

## 0. Last agreed state (this thread) + where it already lived in canon

| Decision (this thread) | Already in canon? |
|---|---|
| Kill the *hosted* app; product = the loop + operations knowledge | ✓ ADR-005, ADR-006 (central app → optional read-only control plane) |
| Local-first, runs from your machine | ✓ ADR-007 (local-first, file-based) |
| Goal = personal tool + Bastion proof + lead-gen (build for one) | new framing; consistent with canon |
| Shared surface = `publish` snapshot, else screenshots/docs | new; thin, no backend |
| Spine = **setup the design system + living memory**, not drift | consistent with what-is-systemix.md (the loop is the hero) |
| Hermes = engine-selectable (Claude default / Ollama air-gapped) | **new — ADR-013** |
| No agent personas | **new — ADR-014** |
| Memory = PLAN.md + PROJECT_SUMMARY.md + contracts (no mega design.md) | **new — ADR-015** |

**Important nuance the v1 of this doc got wrong:** "kill the app" means kill the **central
multi-tenant hosted app** (ADR-006). It does **not** kill the **per-instance, local-first app** —
that three-layer app *is* the deliverable (ADR-010). See §7 for how that local app and the Cowork
live-artifacts split the work.

---

## 1. What Systemix is (canon one-liner)

> **Systemix is an embeddable engine that stands up and runs a living design system for a team.**
> `npx systemix init` it into a repo, point it at Figma / code / a desired UI plus a hypothesis, and
> it scaffolds a **per-instance, local-first app** with three layers — **Config, System, Atlas** —
> wrapped in an agentic **learning loop** that keeps the design system, workflows, and landing in
> sync with **evidence, not memory**. *(what-is-systemix.md)*

The loop (the hero, unchanged):

> **ship → signals → Hermes synthesizes → decision (HITL) → written back to the contract → next ship
> starts from evidence.**

This thread's contribution is the **operating layer**: how a solo operator drives that loop from
Claude Cowork, and what runs where.

---

## 2. nWave — what it actually is, and what Systemix borrows

nWave **is a real product** (`docs/nwave-vs-systemix.md`): an MIT, Claude-Code-native agent framework
(CLI-installed) that splits feature delivery into **seven human-gated waves** — discover · diverge ·
discuss · design · devops · distill · deliver — with a `/nw-buddy` concierge, `/nw-rigor` cost/quality
profiles, and DES hooks enforcing TDD. It is **not** a node-graph orchestrator with an LLM planner;
earlier drafts of this doc wrongly described it that way. **That node/edge/planner picture is
Systemix's own design target, not nWave.**

**What Systemix actually borrows from nWave:**

| Borrow from nWave | Becomes in Systemix |
|---|---|
| `/nw-buddy` — zero-config "what next?" concierge | **`/systemix next`** — reads config + contracts + queue, returns the next step (ADR-018; first build) |
| `/nw-rigor` — profiles scaling model/review/cost | **`/systemix rigor`** — folds autonomy + engine + Trust Tier into lean/standard/thorough (ADR-018) |
| repo-as-product; stars/forks as signal | public MIT repo + `npx systemix` + thin landing (ADR-017) |
| the seven waves | already your *dev process* (`docs/feature/*/`) — keep using it, don't rebuild it |

**Systemix's own design target** (the node-graph picture — *not* nWave) already exists decomposed in
canon: the **skills** are the nodes, the **3D force graph** (Config, ADR-008/010) is the visual,
**Atlas** is the workflow graph (ADR-010/012), and the **loop + Hermes** is the autonomous planner that
picks the next decision from the MDX contracts. So that target is "finish wiring the loop + render the
graph off real state," not a new system.

Full comparison — what to take, what we already have, what to skip — is in `docs/nwave-vs-systemix.md`.

---

## 3. Substrate map — where it lives

| Surface | Role |
|---|---|
| **Claude Code** (dev machine) | Heavy routines: scaffold repo, `npm run dev`, token extraction, git/Vercel, run the localhost per-instance app (incl. 3D graph), `systemix watch` with Ollama |
| **Claude Cowork** (cockpit) | The `init` interview, scheduled tasks, live-artifact operating views (HITL queue, impact glance, docs snapshot), Hermes-as-Claude synthesis |
| **Skills** (`.claude/skills/*`, CLI pipelines) | The nodes — **the IP**, named by function (ADR-014) |
| **Plugins** (`npx systemix`, MCP server) | Distribution — how the engine installs into a repo |
| **MCP servers** | Figma (read + Console write), GitHub, Vercel, PostHog, a Drive/sheet source for manual signals |
| **Memory** (see §4) | YAML config · MDX contracts · DESIGN.md · JSON state · PLAN/PROJECT_SUMMARY |

The per-instance **app** itself is the three layers (ADR-010), a **shadcn-native, Fumadocs-rendered
local-first app** (ADR-011, ADR-012):

- **Config** — editable view of `systemix.config.yaml` (skills, signals, autonomy, trust) **+ the 3D
  graph + runtime feed + role-routed HITL**. The operating/control layer.
- **System** — the design system as a living styleguide (Fumadocs over `contract/*` + docs).
- **Atlas** — the workflow catalog, **gated** until `init` is done and a DS is synced. Organized by
  the client's **end-user personas** (note: that's product user-personas — unrelated to the *agent*
  personas removed in ADR-014).

---

## 4. Memory model — multi-format, by concern (ADR-015)

There is **no single `design.md`**. Each format has a job:

| File / format | Job | Why |
|---|---|---|
| `systemix.config.yaml` | Instance topology — surfaces, signals, hermes, trust (committed, no secrets) | YAML: hand-editable config, machine-read; written by `init` (ADR-008) |
| `~/.systemix/config.json` / env | Secrets (Figma/PostHog keys) | Never committed |
| `contract/**/*.mdx` | **The loop's living memory** — frontmatter state + prose evidence/Hermes history, per unit. Source-of-record. | MDX: structured state Hermes/MCP read + durable narrative; renders in System (ADR-007, ADR-011) |
| `DESIGN.md` (Google design.md) | Visual-identity artifact + `x-systemix:` extensions | Interop with Stitch/any design.md tool; lint + WCAG built in (RESULTS.md) |
| `.systemix/queue.json` | HITL decision queue | JSON state the app/artifact reads |
| `.systemix/*.json` | Machine caches (`tokens.bridge`, `systemix.json`, agent-state) | Fast read/write |
| `content/docs/**/*.mdx` | Marketing docs + System styleguide source | Fumadocs (ADR-011) |
| `PLAN.md`, `PROJECT_SUMMARY.md` | Narrative/strategic memory + fast-load index | Markdown; `PLAN.md` exists, `PROJECT_SUMMARY.md` created when first needed |
| `decisions/ADR.md`, `sessions/*.md` | Decision integrity + handoffs | Markdown |

Principle: **the per-hypothesis MDX contracts are the brain of the loop**; PLAN/PROJECT_SUMMARY hold
the human thread. A single mega-file would break per-hypothesis granularity, the Hermes/MCP
frontmatter reads, and the Google design.md interop.

---

## 5. The skills (nodes), named by function (ADR-014)

No personas. Two generations to **consolidate**, not rebuild — they already exist:

**The loop** (group `the-loop`; synthesis node = Hermes):

| Command | Does | Writes |
|---|---|---|
| `/hypothesis` | Define what's tested | `contract/hypotheses/*.mdx` |
| `/measure` | Add PostHog instrumentation | component + contract frontmatter |
| `/experiment` | Wire the A/B feature flag | component + contract |
| `/evidence` | Pull results into the contract, queue a card | contract + `queue.json` |
| `/hermes` | Synthesize the decision (engine = Claude/Ollama, ADR-013) | contract + `queue.json` |
| `/init-experiment`, `/growth-audit`, `/write-variants`, `/close-experiment` | Installable workflow variants | contracts + queue |

**Design-system hands** (groups `design-system`, `deploy`):

| Command | Does |
|---|---|
| `/figma` | Extract design context/tokens (Official Figma MCP, read) |
| `/tokens` | Sync Figma variables → `globals.css` (+ `npm run tokens`) |
| `/component` | Generate a React+TS component + story |
| `/apply-theme` | Apply a client brand via token overrides |
| `/drift-report` | Audit design-code drift |
| `/storybook` | Verify/fix stories vs Figma |
| `/deploy` | Build + deploy preview (Vercel MCP) |
| `/sync-docs` | Refresh the living styleguide (System) |

**Missing nodes this thread identified (the actual new build):**

- **`/systemix next`** — the zero-config concierge/planner (cf. `/nw-buddy`): reads config + contracts
  + queue, returns the concrete next step. **First node to build** (ADR-018).
- **`/systemix rigor`** — profiles (lean/standard/thorough) folding autonomy + engine (Claude/Ollama)
  + Trust Tier + model into one command (cf. `/nw-rigor`, ADR-018).
- A real **project-init interview** beyond `/init-experiment` — the `npx systemix init` 4-question
  wizard exists (ADR-008); extend it to seed project name/goal + the first hypothesis.
- **Landing setup** as a node (scaffold + deploy a validation surface).
- **Signal connectors beyond PostHog** — a **manual sheet** source (Drive/Box MCP, or a scheduled
  task that asks you the numbers) for LinkedIn/Threads; pluggable others.
- **Visualization off real state** — the 3D graph (Config) and Atlas workflows reading
  `stack`/`config`/contract data instead of mock `lib/data/*`.

What gets **demoted**, not deleted: the v1 central dashboard React surfaces and mock data
(`src/app`, `lib/data/*` seeds) — optional read-only control plane only (ADR-006). The `AGENT_DISPLAY_MAP`
personas are removed (ADR-014).

---

## 6. The setup journey (aligned to `init`)

| Stage | Command | Output | Tools / MCP |
|---|---|---|---|
| 0 · Init + interview | `npx systemix init` (extend the 4-Q wizard, ADR-008) | `systemix.config.yaml`, seeded `contract/`, first hypothesis, Trust Tier 0 | AskUserQuestion, Write |
| 1 · Stand up DS | `/figma`/`/tokens`/`/component` or claude.ai/design → scaffold | running localhost DS (shadcn) + repo + Figma in sync | Figma Official (read) + Console (write), GitHub MCP, bash |
| 2 · Landing + validate | new `landing` node | deployed landing + hypothesis/KPIs in a contract | Vercel MCP, Linear MCP (optional) |
| 3 · Connect signals | `/measure` + `connect-signals` | `signals` → contracts; manual/PostHog/MCP | PostHog, Drive/Box MCP, scheduled-tasks |
| 4 · Weekly loop | `/evidence` → `/hermes` (+ `systemix watch`) | scorecard, decision cards, evidence written back | scheduled-tasks, Hermes (engine per ADR-013), queue artifact |
| 5 · Visualize | Config 3D graph + Atlas | graph of the stack; workflow catalog | localhost app (ADR-010) |

Dogfood: the DS you stand up in Stage 1 **is** Systemix's own UI — setup and "apply to Systemix" are
one act.

---

## 7. Surface split — localhost app vs Cowork live-artifacts

**Resolved — ADR-016: Cowork-first.** The Cowork live-artifacts are the day-to-day cockpit; the
localhost app is reserved for the heavy/visual surfaces. Driver seat: Cowork primary, Claude Code for
scaffolding + unattended `watch`. Both surfaces read **the same local files**:

| Surface | What it's for | Why |
|---|---|---|
| **Localhost per-instance app** (Config/System/Atlas; shadcn + Fumadocs) | The rich/visual surfaces: **3D graph**, living styleguide, **Atlas workflows**, editable config | Heavy rendering (three.js, Fumadocs) needs a real app; this is the canonical deliverable (ADR-010/011) |
| **Cowork live-artifacts** | The lightweight operating cockpit when you don't want to spin up the app: **HITL queue cards**, impact glance, docs snapshot, 2D graph | Persists, pulls connectors on open, no dev server; CDN-limited (Chart.js/Grid.js/Mermaid), 2D, single-user |
| **`/systemix publish`** | A static snapshot for sharing + marketing screenshots | One static HTML, baked data, no backend |

**Decision rule:** three.js / drag-edit / Fumadocs → **localhost app**. Persistent read-mostly
dashboard or a quick HITL approve → **Cowork live-artifact**. Same `.systemix/*` + `contract/*`
underneath, so they never diverge.

(The 3D force graph you like is already canon — it lives in the **Config layer on localhost**, ADR-008/010.
Cowork gets the 2D inline-canvas version for the no-server glance.)

---

## 8. Workflows — System view vs Product view

Two graphs over the same system; the Atlas layer holds the Product view:

| View | Answers | Source | Renderer |
|---|---|---|---|
| **System (process automated)** | "How does the operator run?" | `systemix.config.yaml` + agent defs → the stack graph | Config 3D graph (localhost) / 2D (Cowork) |
| **Product (experience designed)** | "How does a user move through the product?" | Atlas catalog (generated, ADR-012), seeded from Figma flows | Atlas (localhost) / Mermaid (Cowork) |

The thesis that ties them: **the operator automates the process in order to improve the experience,
and the loop measures whether that worked.** That triad — Config (automation) → Atlas (experience) →
contracts/impact (evidence) — is the demoable core and the clearest content narrative.

*Open research:* the Product view needs a journey source. Start hand-authored from Figma frames;
automate flow extraction later.

---

## 9. Phasing

| Phase | Goal | Build | Status |
|---|---|---|---|
| 0 · Repo-as-product | The repo is the surface | public-repo readiness: README, MIT, clean `npx systemix` first-run, docs as depth (ADR-017) | partial |
| 1 · Foundation | Engine can start a project | **`/systemix next` (buddy) first**, then extend `init` interview + memory + DS setup + landing | buddy = first build (ADR-018) |
| 2 · Validate | Loop runs | signals (incl. manual) + weekly `/evidence`→`/hermes` + Cowork HITL artifact | loop skills exist; wire Cowork + non-PostHog signals |
| 3 · Visualize | Stack legible | 3D graph (Config) + Atlas off real state + 2D Cowork glance | graph/Atlas specced (ADR-010); de-mock |
| 4 · Package | Reusable | finalize plugin / `npx systemix`, `/systemix publish`, generalize interview | partial |

Build order within Phases 1–2: **`/systemix next` → Cowork HITL card → manual signals → `/systemix rigor`.**
Don't build Phase 3 visuals before 1–2 produce real state.

---

## 10. Decisions — pointers, not re-derivations

This doc records **no ADR-001…005** (those are real and unrelated: canvas, OKLCH, Figma naming,
build-time fetch, workspace-over-marketing). It defers to:

- **ADR-006/007** — embedded per-client, local-first, file-based.
- **ADR-008** — `init` 4-question wizard → `systemix.config.yaml`, Trust Tier 0, local force-graph.
- **ADR-009** — hypothesis loop binds to the consuming app.
- **ADR-010** — three-layer app: **Config (absorbs graph) / System / Atlas**.
- **ADR-011** — Fumadocs renders System + marketing docs.
- **ADR-012** — shadcn-native template; Atlas catalog generated from config + agent defs.

New, recorded this thread:

- **ADR-013** — Hermes engine-selectable (Claude default in Cowork, Ollama air-gapped).
- **ADR-014** — no agent personas; nodes named by function.
- **ADR-015** — memory = config.yaml + MDX contracts + DESIGN.md + JSON + PLAN/PROJECT_SUMMARY; no mega design.md.
- **ADR-016** — Cowork-first cockpit; localhost app reserved for 3D graph / styleguide / Atlas. Driver seat: Cowork primary, Claude Code for scaffolding + unattended `watch`.
- **ADR-017** — repo-as-product; public MIT repo + `npx systemix` + thin landing; stars/forks a *product* signal (separate from the LinkedIn human-reply signal).
- **ADR-018** — `/systemix next` concierge (the planner, first build) + `/systemix rigor` profiles, borrowed from nWave.

All surface questions are now settled. Build order (§9) starts with **`/systemix next`** (the buddy,
ADR-018), then the Cowork HITL card on the existing Systemix DS.

---

## 11. Agnostic vs. instance #1

| Layer | Agnostic (the engine) | Instance #1 (dogfood) |
|---|---|---|
| Init interview | name, goal, validate, signals | Systemix; "prove design-ops + acquire presence" |
| DS setup | any shadcn/Tailwind base | Systemix's own UI |
| Landing | any validation surface | the Systemix landing tracking signups |
| Signals | manual / PostHog / MCP | your LinkedIn/Threads sheet (manual, scheduled) |
| Loop | the loop skills + Hermes | you as the single human-in-the-loop |

The engine is what you package (Phase 4). Instance #1 is how you prove it and generate the content
that markets it.

---

## 12. One-paragraph summary

Systemix is the already-decided embeddable, local-first engine (ADR-006/007) that stands up and runs
a living design system through a three-layer per-instance app — **Config / System / Atlas** (ADR-010)
— wrapped in the **ship → signals → Hermes → HITL → evidence** loop. This thread adds the **operating
layer**: drive the loop from **Claude Cowork** (scheduled tasks + live-artifact HITL cockpit) while
the **localhost app** carries the rich surfaces (3D graph in Config, styleguide in System, workflows
in Atlas); **Hermes is engine-selectable** — Claude by default in Cowork, Ollama for air-gapped
(ADR-013); **no agent personas** (ADR-014); and **memory is multi-format** — config YAML, per-unit
MDX contracts as the loop's source-of-record, DESIGN.md for visual-identity interop, JSON state, and
PLAN/PROJECT_SUMMARY for the narrative thread (ADR-015). It ships **repo-as-product** — a public MIT
repo + `npx systemix` + thin landing, stars/forks as a signal (ADR-017) — and borrows nWave's two best
patterns: **`/systemix next`** (the concierge/planner, the first thing to build) and **`/systemix
rigor`** (ADR-018). The first thing it operates is itself.
