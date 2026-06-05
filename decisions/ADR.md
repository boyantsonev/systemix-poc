# Architecture Decision Records — Systemix

---

## ADR-001: Workspace Canvas Pattern
**Date:** 2026-04-06
**Status:** DECIDED

**Decision:** Each workspace page is a full-screen canvas with a collapsible left sidebar (w-12 collapsed / w-48 expanded). No right anchor nav. Each component/token group gets its own route under `/workspace/*`.

**Rationale:** Mirrors the mental model of Storybook (one component per page) but with the canvas as primary real estate. Collapsible sidebar keeps focus on the component. Right panel is component-specific (token audit, hardcoded values) rather than global nav.

**Alternatives considered:** Single page with tab switching (rejected — can't link directly to a component); Traditional docs layout with right TOC (rejected — nav chrome competes with canvas content).

**Consequences:** Each new component requires a new route + page file. Token audit panel is part of the page, not a shared widget.

**Review trigger:** If workspace grows beyond ~30 components and nav becomes unwieldy → consider search/command palette as primary navigation.

---

## ADR-002: OKLCH as the Internal Color Standard
**Date:** 2026-04-06
**Status:** DECIDED

**Decision:** All CSS color variables use oklch. Figma hex values are converted to oklch for comparison using the full mathematical pipeline: hex → sRGB → sRGB linear → XYZ D65 → OKLab → OKLCH (Björn Ottosson matrices). `deltaE` measures perceptual distance.

**Rationale:** Tailwind v4 uses oklch natively. Perceptual uniformity means deltaE thresholds (< 0.02 = nearly identical, > 0.1 = clearly different) are meaningful. Hex comparison would produce false positives for perceptually identical colors.

**Alternatives considered:** Compare in hex (rejected — different hex = different oklch may still be perceptually identical); Compare in HSL (rejected — not perceptually uniform).

**Consequences:** `src/lib/utils/color.ts` is a required dependency for any drift detection. Figma values must be fetched as hex and converted at runtime. Display shows both the original hex and the computed oklch equivalent.

**Review trigger:** CSS Color Level 5 browser support changes, or Figma natively exports oklch.

---

## ADR-003: Figma Variable Naming Convention
**Date:** 2026-04-06
**Status:** DECIDED

**Decision:** verolab shadcn kit uses `base/*` prefix for Figma variables (e.g., `base/background`, `base/accent`). These map 1:1 to CSS custom properties by stripping the prefix: `base/accent` → `--accent`. This matches the `/tokens` SKILL.md convention.

**Rationale:** The verolab kit follows shadcn/ui naming faithfully. The `/tokens` skill documents `color/background` → `--background` as the general pattern — verolab uses `base/` instead of `color/` but the mapping logic is identical.

**Alternatives considered:** Maintain a manual mapping table (rejected — brittle); Use Figma's full path including slashes in the CSS var name (rejected — would break shadcn compatibility).

**Consequences:** When new collections are added to the Figma file, the stripping logic handles them automatically as long as they follow the `prefix/token-name` convention.

**Review trigger:** verolab kit changes its variable naming structure.

---

## ADR-004: Figma Data Fetched at Build Time (Not Runtime)
**Date:** 2026-04-06
**Status:** DECIDED

**Decision:** Figma variable values in `src/lib/data/variables.ts` are fetched once via MCP and hardcoded with a fetch timestamp comment. Runtime fetching via a "Paste Figma URL" input is a planned feature (BAST-110) but not the default.

**Rationale:** Avoids API rate limits and authentication complexity for the initial canvas. The drift data is a snapshot — it tells you the state at a point in time, which is useful for audit purposes. Real-time sync is a Phase 2 feature.

**Alternatives considered:** Live API fetch on page load (rejected — requires auth token in browser, rate limit risk, slower UX); Server component with fetch (rejected — adds complexity without clear benefit at this stage).

**Consequences:** Figma values go stale. Each re-sync requires re-running the MCP fetch and updating `variables.ts`. The fetch timestamp (`// fetched YYYY-MM-DD`) in the file makes staleness visible.

**Review trigger:** BAST-110 ships — then this ADR is superseded by dynamic fetching.

---

## ADR-005: Pivot — Workspace Canvas Over Marketing Site
**Date:** 2026-04-06
**Status:** DECIDED

**Decision:** The Vercel deployment at systemix-alpha.vercel.app is the interactive documentation layer and design system canvas, not a marketing site. The hero landing page pivoted to `npx systemix init` — a CLI-first concept. Fake dashboard metrics pages are to be removed (BAST-106).

**Rationale:** The real value is the workspace — token audit, component isolation, drift detection. These are interactive and built from actual design tokens. The marketing wrapper added noise without adding value for the target audience (designers and developers using the tool themselves).

**Alternatives considered:** Keep marketing site separate from workspace (deferred — reasonable but out of scope now); Build Figma plugin as primary entry point (planned as Phase 2, BAST-111).

**Consequences:** `/workspace/*` is the primary product. Landing page (`/`) is minimal. All nav effort goes into the workspace sidebar. Old pipeline/workflow builder pages stay for reference but are deprioritized.

**Review trigger:** External user testing shows users need more context before entering the workspace.

---

## ADR-006: Embedded per-client distribution; central layer demoted to optional control plane
**Date:** 2026-06-02
**Status:** DECIDED
**Feature:** systemix-v2 (Decision A)

**Decision:** Systemix v-next ships as an **embedded, single-tenant instance** installed per client repo via `npx systemix init`. The v1 central, multi-tenant, Supabase-backed app is **demoted to an OPTIONAL control plane** (read-only dashboard view + opt-in cross-instance HITL/evidence aggregation). The client repo is the source of truth; the hosted layer is a view that is never required to run the loops.

**Rationale:** Design Partner #1 (Connecta, EU K-12) must own its instance and data for GDPR. The onboarding prototype confirms contracts are MDX files in-repo ("no database, no hosted UI"). Local-first honors data ownership; an opt-in control plane preserves the SaaS business without making clients depend on our uptime.

**Alternatives considered:** Fully decentralized, delete central (rejected — forecloses cross-instance review and the hosted-product business); Keep central as source of truth (rejected — multi-tenant GDPR liability for every client; contradicts "embedded / client owns data").

**Consequences:** Four v1 dashboard components (Pipeline UI, Workspace/Variables UI, Drift UI, Supabase multi-tenancy) become optional control-plane, not shipped into client repos (`docs/feature/systemix-v2/discover/gap-analysis-v2.md`). A sync protocol is needed for the opt-in plane.

**Review trigger:** A client requires a hosted, always-on dashboard as the source of truth (reopens central-vs-local).

---

## ADR-007: Local-first, file-based instance store
**Date:** 2026-06-02
**Status:** DECIDED
**Feature:** systemix-v2 (Decision B)

**Decision:** An embedded instance's source of truth is **local files in the repo** — MDX contracts (`contract/hypotheses/*.mdx`, `contract/meta/*.mdx`), `queue.json`, `systemix.config.yaml`, and `.systemix/` run artifacts. No per-instance database. The optional control plane (ADR-006) may use Postgres centrally for aggregation only.

**Rationale:** Files are gitable, diffable, reviewable in PRs, CI-friendly, and human-editable — fitting a design-system repo. The reconciler already persists to `.systemix/runs/`; the prototype models every artifact as a file. This reverses v1's "move `.systemix/*.json` into Supabase."

**Alternatives considered:** Per-repo SQLite (deferred — queryable but a binary blob, not git-friendly; revisit only at high event volume); Required Supabase (rejected by ADR-006).

**Consequences:** The MCP server and Hermes read/write local files by default, not a central DB. Concurrent-write handling needed. Artifact schemas live in-repo.

**Review trigger:** An instance generates event volume that makes flat files slow → SQLite.

---

## ADR-008: The `init` contract — a 4-question onboarding wizard that writes `systemix.config.yaml`
**Date:** 2026-06-02
**Status:** DECIDED
**Feature:** systemix-v2 (Decision C) · Prototype: `docs/feature/systemix-v2/prototypes/`

**Decision:** `npx systemix init` runs a **4-question topology wizard** and scaffolds a self-contained instance, writing `systemix.config.yaml`. The questions: (1) **Surfaces** validated (landing / onboarding / features / design-system / gtm) → determines installed skills; (2) **Signals** Hermes may read (PostHog / Vercel / Social / Figma); (3) **Autonomy** mode (conservative / balanced / progressive) → Hermes confidence thresholds; (4) **Self-improvement** mode (off / audit / tuning / auto) → the meta-audit loop. The MCP server exposes contracts to Claude Code / Cursor; `systemix watch` runs Hermes on local Ollama. Agents start at **Trust Tier 0 (Ghost Mode)** — never autonomous without config. The instance ships a **local force-graph viewer** of its own topology (the design-partner's first localhost surface).

**Rationale:** This is the gating artifact for every client build (`meta-plan.md` §8). The prototype `systemix-onboarding-v2.jsx` defines the exact wizard UX and the `systemix.config.yaml` schema; the graph is "what Connecta sees on localhost." Core loops run framework-agnostically (Connecta learning L1).

**Alternatives considered:** Install skills globally to `~/.claude/skills/` (today's `init.js` behavior — rejected for embed; the instance must be self-contained and CI-reproducible. **Refinement flagged:** the prototype's copy still shows `~/.claude/skills/` and must be updated to project-scoped install); Config via CLI flags only, no wizard (rejected — the topology questions are the design-partner's first experience of the product).

**Consequences:** `connecta-design-system` can be scaffolded once this lands. `init.js` (288 LOC) is re-shaped from global-install to instance-scaffold. The graph viewer is the local replacement for the demoted central dashboard (ADR-006).

**Review trigger:** A new surface or signal type doesn't fit the 4-question model.

---

## ADR-009: The hypothesis-validation loop binds to the consuming app, not the design-system package
**Date:** 2026-06-02
**Status:** DECIDED
**Feature:** systemix-v2 (Decision D)

**Decision:** The hypothesis-validation loop binds to the **consuming app** (e.g. Connecta `apps/landing`), not to the design-system package. The DS-repo instance runs design-system loops (tokens, docs, drift, parity); the app that owns the conversions runs **its own instance** configured with the `landing`/`gtm` surfaces and the PostHog-EU signal.

**Rationale:** A published design-system package must not carry analytics credentials or experiment state. Separation keeps `@connecta/design-system` pure and puts PostHog-EU keys with the app that measures conversions — also a compliance boundary (Connecta learnings L4/L7). The prototype's per-instance `surfaces` config supports an app instance scoped to landing/gtm.

**Alternatives considered:** DS-repo instance owns hypothesis too (rejected — couples the DS package to PostHog); Hypothesis as a fully separate repo (deferred — viable later, unneeded now).

**Consequences:** Two Systemix instances in the Connecta engagement — one in `connecta-design-system` (design-system surfaces), one in `apps/landing` (landing/gtm surfaces) — each with its own `systemix.config.yaml`.

**Review trigger:** Running two instances per engagement proves redundant in practice.

---

## ADR-010: The embedded instance ships a five-surface local app (engine-built, generic)
**Date:** 2026-06-05
**Status:** DECIDED
**Feature:** instance-app

**Decision:** `npx systemix init` scaffolds a **generic, engine-built local app** that the instance runs locally (`systemix dev`). The app has **five surfaces**:
- **(0) Onboarding** — captures the instance's intent (ADR-011).
- **(1) System Graph + Runtime Feed** — the force `/graph` of the instance topology, doubled with a live activity feed and role-routed HITL cards (ADR-013).
- **(2) Docs** — a Hermes-maintained living knowledge base / editor (ADR-012).
- **(3) Workflow Atlas** — flows, user types, and design rationale rendered in the design-system's own style.
- **(4) Prototypes** — the prototypes themselves, framed by the medium chosen in onboarding (ADR-011).

This **supersedes the "ships a local force-graph viewer" clause of ADR-008**: the force-graph is no longer the whole local surface — it is surface #1 of a larger app. The app is **client-agnostic by construction** (engine code); the client supplies the *content* (its components, tokens, workflows, prototypes), not the shell.

**Rationale:** A force-graph alone cannot carry onboarding intent, living docs, workflow rationale, or prototypes — yet those are precisely what the design partner *sees* they're paying for (the legible SaaS surface, PLAN §2). The five surfaces map almost 1:1 onto assets that already exist (graph prototype, onboarding-v2 prototype, the `/docs` route + `sync-docs` loop, and Connecta's `apps/platform` React-Flow Atlas as the reference implementation) — so this is an *extension and consolidation*, not a new build. Engine-built (not per-client) keeps it a product and honors the embedded-generic model (ADR-006): every instance gets the same shell.

**Alternatives considered:** Build the surfaces per-client into the consuming app (rejected — couples the engine UI to one tenant, contradicts ADR-006's embedded-generic model, and makes Connecta-specific work non-reusable for client #2); keep only the force-graph viewer (rejected — too thin to be the surface a paying design partner interacts with daily).

**Consequences:** The engine takes on an **app-shell deliverable** and a new `systemix dev` command. Surfaces are themed by the instance brand config (single-brand, ADR-007-adjacent). Connecta's existing `apps/platform` Atlas becomes the **reference implementation** for surface #3, then is re-homed/abstracted into the generic shell. `gap-analysis-v2`'s "Docs UI → per-instance deliverable" is widened to "instance *app* → per-instance deliverable."

**Review trigger:** A client requires a hosted (non-local) version of these surfaces as the source of truth → reopens local-first (ADR-006/007).

---

## ADR-011: Initial onboarding runs inside the coding agent (Claude Code / Cursor), not as an in-app wizard
**Date:** 2026-06-05 (revised same day)
**Status:** DECIDED
**Feature:** instance-app · extends ADR-008 · resolves the bootstrap order

**Decision:** The **initial** onboarding is a **conversational flow inside the coding agent** (Claude Code / Cursor, driven by a `systemix init` skill), **not** an in-app wizard. The agent asks the questions, **provisions the design-system instance** (including **naming/creating the client's design-system GitHub repo** — see ADR-014), and writes the result to `systemix.config.yaml` + `contract/meta/*`. Only *after* config exists does the five-surface app render. The questions extend ADR-008's topology four (Surfaces · Signals · Autonomy · Self-improvement) with:
- the desired **skills** to install (derived from answers, not hand-listed),
- the instance **goals**,
- the **hypotheses to validate** (seed the hypothesis-validation loop),
- the **team perspective(s)** served — **marketing / design / product / engineering** (the audiences of the learning/validation loop),
- the **prototype medium** — **iOS native / Android native / cross-browser / responsive web / landing page / all of them** — which decides what the Prototypes surface (#4) renders (device frames) and what the Workflow Atlas (#3) assumes,
- the **design-system instance provisioning** — repo name, package name, host stack (ADR-014).

The in-app **Onboarding surface (#0) becomes a *view / edit / re-run*** of that captured config — not the primary capture path.

**Rationale:** This resolves the bootstrap (chicken-and-egg): the five-surface app needs config to display anything, so capture must precede render. The coding agent is already where the founder works and already has the context (the repo, the components, the brand); it can *provision* (create the DS repo, install skills, scaffold) in ways an in-app form cannot. This also collapses the latent tension between ADR-008 (CLI `npx systemix init`) and the onboarding-v2 prototype (an in-app JSX wizard) — the prototype is demoted to the view/edit surface. The system must be able to *answer* "what are my skills, goals, hypotheses" — today **nothing can** (Hermes is one-shot; the MCP server has no skill/intent enumeration); agent-driven onboarding seeds exactly that.

**Alternatives considered:** In-app wizard as the primary capture (rejected — can't render before config exists, and can't provision a GitHub repo / install skills / scaffold from a browser form); keep topology-only and infer intent later (rejected — leaves Docs/Graph empty at first run); a free-text brief (rejected — not machine-actionable for skill install, repo provisioning, or medium-driven rendering).

**Consequences:** A `systemix init` **skill/CLI** drives the conversation and the provisioning. `systemix.config.yaml` gains an `intent` block (`goals`, `hypotheses`, `audiences`), a `prototype.medium` field, and a `design_system` block (repo, package, host — ADR-014). The onboarding-v2 prototype is re-homed as surface #0's view/edit. A new query path (ADR-012) reads this block.

**Init vs update (two paths).** `init` is for a **fresh** client repo — it runs the agent conversation, provisions the design-system repo, and writes config. An **already-initialised** instance does **not** re-run `init`; it runs **`systemix update`**, which re-installs skills (and, once built, the app shell) from the new engine version while **preserving `systemix.config.yaml`** (`packages/cli/src/commands/update.js`). Re-run `init --reconfigure` only to change topology/intent answers. Today `update` refreshes skills only; the five-surface app reaches an instance after the engine builds the shell + makes `init`/`update` scaffold it (`TASKS.md` E0–E1). **Connecta is an existing instance** (`connecta-design-system`), so its path is **update**, not provision (see ADR-014, `TASKS-connecta-instance.md`).

**Review trigger:** Founders ask to onboard without a coding agent (would reopen the in-app-wizard-as-capture option).

---

## ADR-012: The Docs surface is a Hermes-maintained living knowledge base on a daily/weekly cadence
**Date:** 2026-06-05
**Status:** DECIDED
**Feature:** instance-app · evolves the Hermes role

**Decision:** Surface #2 (Docs) is an **editable, Notion/Obsidian-like local MD/MDX editor** over the instance's `contract/` + `docs/` — covering the **design system, `design.md`, design rationale, hypotheses, and the Hermes + Systemix setup itself** (the setup is part of the documentation). Hermes **maintains** it on a cadence: a **daily** incremental sync and a **weekly** (or on bigger planned changes) deeper pass. Hermes therefore **evolves from a one-shot `/hermes` synthesis function into a scheduled maintainer + a queryable assistant** — it can answer "what skills / goals / hypotheses does this instance have" by reading the intent block (ADR-011) and the contracts. All Hermes writes remain **HITL-gated** per the instance autonomy mode (ADR-008 question 3).

**Rationale:** This is the direct answer to the founding question of this iteration — *"can Hermes answer about the skills included?"* Today: no. The Docs surface + scheduled, queryable Hermes is where that capability lives. It builds on the existing `/docs` route + `sync-docs` skill (which already diffs components/tokens and assigns stale/drifted/missing/current behind a HITL gate); this ADR adds **editability**, a **cadence**, and a **query/answer path**. Daily/weekly matches the real change-rate of design docs — continuous real-time sync would be noisy and token-costly.

**Alternatives considered:** Read-only generated docs (rejected — the user wants an editor; humans co-author rationale); continuous real-time sync (rejected — noise + token cost, no benefit over daily for design docs); keep Hermes one-shot only (rejected — cannot keep a knowledge base alive or answer queries).

**Consequences:** A scheduler (`systemix watch` / cron) drives the daily + weekly Hermes runs; the editor writes back to files (local-first, ADR-007); a new MCP capability is added to enumerate/describe the instance (e.g. `describe_instance` / `list_skills`) so Claude Code *and* Hermes can answer intent queries; larger weekly diffs route through HITL.

**Review trigger:** The daily/weekly cadence proves wrong in practice (docs go stale, or the queue gets noisy).

---

## ADR-013: The runtime feed routes HITL cards by role (DRI / IC)
**Date:** 2026-06-05
**Status:** DECIDED
**Feature:** instance-app · extends the HITL model

**Decision:** Surface #1 pairs the topology graph with a **live runtime activity feed** (rendered from `emit_event` / `list_events`), and HITL cards are **routed by role**: **DRI** (directly responsible individual) vs **IC** (internal contributor / builder). Each person sees the decisions they own; roles are defined in the instance config. This extends the flat `hitl_tasks` queue with an assignee/role dimension.

**Rationale:** An instance serves four audiences (marketing / design / product / engineering, ADR-011). A flat queue sends every card to everyone and doesn't scale across roles — a DRI approving a direction is a different act from an IC picking up build work. The graph + event tools already exist; the feed and routing make them operational for a real team.

**Alternatives considered:** A single flat HITL queue (rejected — no ownership, every card to everyone); route through an external task tracker (deferred — local-first first, ADR-007; revisit if teams want it in their existing tools).

**Consequences:** The HITL task schema gains a `role` / `assignee` field; the instance config defines the DRI/IC mapping; the feed view filters by role; `hitl.ts` (`push_hitl_task` / `list_hitl_tasks` / `resolve_hitl_task`) gains the routing dimension.

**Review trigger:** Teams need roles beyond DRI/IC (e.g. a separate approver vs reviewer split).

---

## ADR-014: "Design system" is a first-class object; Systemix's own DS and each client DS are instances
**Date:** 2026-06-05
**Status:** DECIDED
**Feature:** instance-app · the type/instance model

**Decision:** Adopt an explicit **three-level model**, all from the **Systemix-poc perspective** (this repo owns all of it; nothing lives in a client's main repo):

1. **Systemix's own design system + UI** — a *concrete, dogfooded* design system that powers Systemix's **marketing** surface and product UI. Systemix is its own first customer.
2. **The "design system" as an object/type** — a first-class abstraction the engine operates on: a design-system instance has a repo, a package name, a host stack, tokens, components, docs, a brand config, and an embedded Systemix loop. The five-surface app (ADR-010) renders *any* instance of this type.
3. **The Connecta design system** — an **example instance** of that object/type (Design Partner #1). It is documented and planned **inside systemix-poc** as a worked example, not as work owned by the Connecta repo.

Provisioning a client instance (ADR-011) **creates and names** the design-system repo/package as part of onboarding — it is not assumed to pre-exist. This resolves the prior open question ("reuse `packages/design-system` vs spin a separate repo"): each client instance gets its **own** provisioned design-system repo, named during setup.

**Rationale:** The three levels were collapsing into one another (Systemix's UI, the generic concept, and Connecta's DS were being reasoned about interchangeably). Separating them makes the engine's job legible: build the *type* and the app that renders it; dogfood it as *Systemix's own* DS (which doubles as marketing proof); treat *Connecta* as the first external instance — an example, not a special case. It also fixes the C1 gate cleanly: provisioning, not reuse.

**Alternatives considered:** Keep Connecta's DS in the Connecta repo and plan it there (rejected per founder — everything is reasoned from the systemix-poc perspective; the client instance is an *example* the engine owns the narrative for); treat Systemix's own UI as separate from the DS object (rejected — dogfooding the same type is the proof the type is real).

**Consequences:** `systemix.config.yaml` gains a `design_system` block (`repo`, `package`, `host`). Systemix maintains its **own** DS instance (marketing UI = the first rendered example). The Connecta instance plan moves into systemix-poc (`TASKS-connecta-instance.md`) as a worked example. The generic five-surface app must never hardcode Connecta specifics — those are *instance content*.

**Provision-new vs update-existing.** Provisioning (naming/creating the DS repo) applies to a **new** client only. Some instances **already exist** and are not re-provisioned — they take the **`systemix update`** path (ADR-011). **Connecta is one of these:** `connecta-design-system` already exists (`github.com/boyantsonev/connecta-design-system`, publishable `@connecta/design-system`, embedded instance present). So for Connecta, "provision" in earlier framing means **update the existing instance**, not create a repo. (Separately, the canonical DS is this standalone repo; the near-duplicate `connecta/packages/design-system` becomes a consumer of the published package — see the workflow plan.)

**Review trigger:** A client needs a design system that doesn't fit the object shape (e.g. no repo, or a non-package distribution).
