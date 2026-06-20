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

## ADR-010: Three-layer per-instance app (Config absorbs Graph)
**Date:** 2026-06-08
**Status:** DECIDED
**Feature:** systemix-rework · Spec: `docs/feature/systemix-rework/app-three-layers.md`

**Decision:** The per-instance app is **three layers**, not four: **Config** (an editable settings view of `systemix.config.yaml` — skills, agents, signals, autonomy, self-improvement, trust tiers, infra — **plus** the 3D force-directed graph, runtime feed, and role-routed HITL), **System** (the design system, rendered via Fumadocs — see ADR-011), and **Atlas** (the per-persona workflow catalog with inline prototype, **gated** to render only after `init` is complete and a DS is created/synced). This supersedes the informal **four-surface** framing (`docs/feature/site-rebuild/`) and the earlier **five-surface** framing (Iteration 3); Config and Graph are merged.

**Rationale:** Config and Graph are the same job from two angles — *understand and control your instance*. The graph **is** the configuration visualized; the settings page is the configuration edited. Merging gives one coherent control layer and matches how the instance is operated. The Atlas gate reflects that prototypes render *in the client theme*, so without a synced DS there is no meaningful Atlas (`init-flow.md` §Gates). Onboarding is agent-driven via `init` (not an in-app surface); the prototype viewer is an inline pane inside Atlas (not a surface).

**Alternatives considered:** Keep four surfaces (rejected — Config and Graph are artificially split); five surfaces with separate Onboarding + Prototypes (rejected — onboarding happens in Claude Code/Cursor at `init`; prototypes are an Atlas detail pane).

**Consequences:** `app-three-layers.md` is canonical. Editable config writes, the runtime feed, role-routed HITL, and 3D-graph integration are fresh-build. Existing seeds (`/instance`, `/graph`, `src/app/(app)/design-system/*`) seed but do not constrain. The marketing landing's "Four surfaces" section is recast to three layers.

**Review trigger:** A layer proves to need splitting at scale (e.g. Config settings and the graph become independently navigated).

---

## ADR-011: Fumadocs as the shared documentation renderer — both mounts, one theme
**Date:** 2026-06-08
**Status:** DECIDED
**Feature:** systemix-rework · Spec: `docs/feature/systemix-rework/fumadocs-integration.md`

**Decision:** Adopt **Fumadocs** to render **both** the public marketing `/docs` **and** the in-app **System** layer, driven by **one** Tailwind v4 token source. Fumadocs is namespaced via `createPreset({ cssPrefix: 'fuma-' })` to avoid shadcn CSS-var collisions; import order `tailwindcss → fumadocs-ui/css/shadcn.css → preset.css`. This **replaces** the hand-rolled `next-mdx-remote/rsc` + `gray-matter` loader. Per-client theming for the in-app styleguide stays **build-time** CSS custom properties (light/dark mode remains runtime via `.dark`).

**Rationale:** Fumadocs is App-Router-native, Tailwind v4 + shadcn compatible, MIT, low lock-in (modular core/ui/mdx, ejectable). MDX renders arbitrary React (token tables, live component previews, prototype frames), and a custom Source adapter feeds it programmatically from `contract/*` + `lib/data/docs.ts`. One renderer + one theme keeps the marketing docs and the in-app living styleguide visually consistent — the founder's "consistent design system/theme for Systemix and Fuma docs."

**Alternatives considered:** Keep the hand-rolled MDX engine (rejected — reinvents nav/search/theming, no shared renderer); Storybook for the in-app styleguide (rejected — separate tool + theme, not MDX-native, weak marketing-docs story); Fumadocs for marketing docs only (rejected — the decision is explicitly one shared DS/theme across both mounts).

**Consequences:** `src/lib/docs-manifest.ts` + `lib/data/docs.ts` stay the data SoT feeding Fumadocs (kept sync-docs-compatible). A custom Source adapter is needed for the System layer over `contract/*`. Migration is staged; the hand-rolled loader is deleted after parity. Build-time theming is required for the per-client embedded styleguide (the one research-flagged risk; defused by build-time, not runtime, injection).

**Implementation note (2026-06-08, Phase 1):** mount (a) marketing `/docs` shipped and is build-verified. The theme bridge is **`fumadocs-ui/css/shadcn.css`** (maps `--color-fd-*` → the shadcn vars) — the v16-native mechanism, cleaner than the `cssPrefix` plugin this ADR originally described; no manual prefix needed. Required bumping `tailwindcss` 4.1.18 → 4.3.0 (Fumadocs 16 uses the `inset-s-*` logical utility added in Tailwind 4.2). Stack: fumadocs-ui/core 16.9.3, fumadocs-mdx 15.0.11. Mount (b) in-app System layer remains Phase 2.

**Review trigger:** Fumadocs drops Tailwind v4 / shadcn compatibility, or build-time per-client theming proves insufficient for the embedded styleguide.

---

## ADR-012: Connecta retained as design partner #1; the per-instance template is shadcn-native
**Date:** 2026-06-08
**Status:** DECIDED
**Feature:** systemix-rework · Retro: `docs/feature/systemix-rework/connecta-retro.md`

**Decision:** **Connecta stays design partner #1.** The Systemix per-instance template is **shadcn-native**; Connecta's Tamagui code is a **worked example, not a copy source**. Pure logic (the Atlas hexagonal `catalog.ts` + `flow-layout.ts`) ports verbatim; shells/components are **re-implemented** in shadcn. The Atlas catalog is **generated** from `systemix.config.yaml` + agent defs, not hardcoded. The open question "what is Connecta / is it an SLM" becomes a **separate research track that does not gate** the Systemix engine or template.

**Rationale:** Connecta validated the embedded per-instance model, the token bridge, the hexagonal catalog seam, the sync-docs pattern, and the DS-as-object — but its **Tamagui stack diverges** from Systemix's shadcn standard (`project_systemix_stack_shadcn`) with `--legacy-peer-deps`/ESM friction, and its **own product definition is unsettled**. Keep the engine generic; push Connecta specifics into the Connecta instance.

**Alternatives considered:** Drop Connecta / pick a cleaner reference (rejected — Connecta is a real GDPR design partner and the worked example that proved the seams); Port Connecta's Tamagui UI into Systemix (rejected — Tamagui is Connecta-only; contradicts the shadcn standard); Pause Connecta until its definition settles (rejected — stalls the engagement; quarantine the definition question instead).

**Consequences:** `connecta-retro.md` is the retro of record. Template work is shadcn; the Atlas port is logic-only. Connecta's DS path is `systemix update` (existing repo), not provision. The "what is Connecta" research is tracked separately ([[project_connecta_definition]]).

**Review trigger:** Connecta's product definition lands and materially changes the loop's requirements, or a second design partner supplants Connecta as the primary reference.

---

## ADR-013: Hermes is engine-selectable (Claude default in Cowork, Ollama for air-gapped)
**Date:** 2026-06-13
**Status:** DECIDED
**Feature:** systemix-rework / cowork-operating-layer

**Decision:** Hermes is a **role (the synthesis/decision node), not a model**. Its engine is selectable via a new `hermes.engine` key in `systemix.config.yaml`: **`claude`** (default when the instance is operated inside Claude Cowork / Claude Code) or **`ollama`** (local `hermes3` for air-gapped use and unattended `systemix watch` runs). The interface is unchanged regardless of engine: read the hypothesis MDX contract + signals → write a decision card to `.systemix/queue.json` → write evidence back to the contract. Confidence routing and the Trust Tier (ADR-008) are engine-independent.

**Rationale:** The system is already structured around the contract→card→evidence interface, and the docs already state "any Ollama-compatible model works" — so the model was never load-bearing. Claude gives the best synthesis quality and is already present when operating in Cowork (no install, no extra token spend on a separate local model setup). Ollama stays as the genuine air-gapped differentiator (nothing leaves the machine — the local-first/Fortress privacy story) and as the unattended-daemon engine that doesn't consume Claude session tokens.

**Alternatives considered:** Keep Ollama-only (rejected — forces an install and caps quality for users already in Cowork); Replace Hermes with Claude entirely (rejected — loses the air-gapped mode, which is a real differentiator and a compliance story for partners like Connecta); Auto-detect engine without a config key (rejected — engine choice has privacy implications and must be explicit).

**Consequences:** `systemix.config.yaml` gains `hermes.engine`. The `/hermes` skill and `systemix watch` branch on the engine: `claude` runs the synthesis as a Cowork scheduled task / Claude Code routine; `ollama` keeps the existing `localhost:11434` path. `model`/`endpoint` keys remain but apply only when `engine: ollama`.

**Review trigger:** A local model reaches parity with Claude for synthesis, or a partner requires air-gapped operation by default.

---

## ADR-014: No agent personas — skills and agents are named by function
**Date:** 2026-06-13
**Status:** DECIDED
**Feature:** systemix-rework

**Decision:** Drop the agent personas (Ada, Flux, Scout, Prism, Echo, Sage, Ship and any others). Agents and skills are referred to by their **descriptive function or command** — e.g. "the token-sync skill (`/tokens`)", "the drift detector (`/drift-report`)", "the synthesis node (Hermes/`/hermes`)". `AGENT_DISPLAY_MAP` and persona labels are removed from the UI/data layer. Hermes is retained as a name because it denotes a *role* (the synthesis node), not a persona mascot.

**Rationale:** The personas add a memorization tax and are misleading — "Scout" or "Prism" carry no information about what the agent does, so every reader must learn a second naming layer on top of the commands that already name the work. Function-named skills are self-documenting and match how the commands are actually invoked.

**Alternatives considered:** Keep personas for branding/marketing color (rejected — the cost is borne by every operator daily; marketing can name the *product*, not each internal node); Rename personas to clearer mascots (rejected — still a second naming layer over self-evident command names).

**Consequences:** `AGENT_DISPLAY_MAP` and persona color tokens (`--agent-*`) are removed or repurposed. Docs, the graph view, and the runtime feed label nodes by command/function. `pipeline.ts` `triggersAgent` persona strings are migrated to function names (Hermes excepted as a role).

**Review trigger:** A clear product-level reason to brand individual nodes emerges (unlikely).

---

## ADR-015: Narrative memory lives in PLAN.md + PROJECT_SUMMARY.md; contracts remain the loop's source-of-record
**Date:** 2026-06-13
**Status:** DECIDED
**Feature:** systemix-rework

**Decision:** There is **no single mega `design.md` memory file**. Memory is distributed by concern: **`systemix.config.yaml`** (instance topology, YAML), **`contract/**/*.mdx`** (the per-unit living memory of the loop — frontmatter state + prose evidence/history, the source-of-record), **`DESIGN.md`** (Google design.md visual-identity interop only), **`.systemix/*.json`** (queue + machine caches), and **narrative/strategic memory in `PLAN.md` + `PROJECT_SUMMARY.md`** (with an optional top-level `design.md` as a human fast-load index *if* one is ever needed — it points at the contracts, it does not replace them).

**Rationale:** The `experiments/design-md/RESULTS.md` probe confirmed "the file is the contract" at the *per-artifact* level, and the loop needs per-hypothesis contracts that accrete evidence independently and are read as structured frontmatter by Hermes/MCP. Collapsing everything into one file would break that granularity, the tool interop (Google design.md `export`), and the committed-config-vs-secrets separation. `PLAN.md` already serves as the living strategic tracker; `PROJECT_SUMMARY.md` is the 500-word fast-load (project-intelligence pattern).

**Alternatives considered:** One `design.md` as the single memory (rejected — collides with the existing `DESIGN.md` visual-identity format by name, and breaks per-hypothesis granularity and MCP frontmatter reads); No narrative file at all, contracts only (rejected — loses the human strategic thread and fast-load index).

**Consequences:** Keep maintaining `PLAN.md`; create `PROJECT_SUMMARY.md` when a fast-load index is first needed. Any prior framing that proposed a single `design.md` memory is superseded by this ADR.

**Review trigger:** Contract sprawl makes a generated top-level index necessary → introduce a generated `design.md` (not hand-maintained).

---

## ADR-016: Cowork-first operating cockpit; localhost app reserved for heavy/visual surfaces
**Date:** 2026-06-13
**Status:** DECIDED
**Feature:** cowork-operating-layer

**Decision:** The **day-to-day operating cockpit is Claude Cowork live-artifacts** — the HITL queue cards, impact glance, docs snapshot, and a 2D graph — driven by scheduled tasks. The **localhost three-layer app (ADR-010) is reserved for the heavy/visual surfaces**: the 3D force graph (Config), the Fumadocs living styleguide (System), and the Atlas workflow catalog. Both read the **same local files** (`systemix.config.yaml`, `contract/*`, `.systemix/*`). **Driver seat:** Cowork is primary; **Claude Code** is used for scaffolding, token extraction, and unattended `systemix watch` runs. The localhost app's own Config-layer HITL/feed remains available when the app is open, but is not the daily driver.

**Rationale:** Instance #1 is build-for-one with a content/lead-gen goal; the lightest daily friction wins — approving a decision card should not require running a dev server. Heavy rendering (three.js, Fumadocs) still justifies the local app, but that is an occasional surface, not the cockpit. This resolves the one tension the canon left open between this thread's "operate from Cowork" instinct and the local-first three-layer app.

**Alternatives considered:** Localhost-app-first (rejected — running `npm run dev` to approve a card is friction for a solo operator); Co-equal both surfaces (rejected — two cockpits to build and keep in parity for one user).

**Consequences:** The **Cowork HITL artifact + a scheduled task become first-class build targets** (the first node — see build order). The localhost app stays the home of the 3D graph, styleguide, and Atlas. `/systemix publish` serves sharing/marketing. If the loop is operated via Cowork, Hermes runs with `engine: claude` (ADR-013) inside the scheduled task.

**Review trigger:** A team of more than 1–3 needs a shared, always-on cockpit → revisit the localhost/hosted control plane (ADR-006).

---

## ADR-017: Repo-as-product; GitHub stars/forks as a product traction signal
**Date:** 2026-06-13
**Status:** DECIDED
**Feature:** distribution / cowork-operating-layer · Analysis: `docs/nwave-vs-systemix.md`

**Decision:** Systemix's primary surface is a **public, MIT-licensed GitHub repo + `npx systemix` CLI + deep in-repo docs**, fronted by a **thin marketing landing**. **GitHub stars / forks / issues** are tracked as a **product-level** traction signal alongside PostHog. The hosted app stays demoted to the optional control plane (ADR-006). Model borrowed from nWave (the repo is product + magnet + dogfood, run by ~2 people at 499★).

**Rationale:** Lowest-surface distribution for a 1–3 person team; the repo is simultaneously the deliverable, the proof, and the lead magnet, and it matches Cowork-first + local-first (ADR-007, ADR-016). nWave empirically validates the model.

**Boundary:** This product-traction signal is **distinct from the LinkedIn public-research practice** (`content/linkedin/PLAN.md` §0/§8), which deliberately tracks **only human replies/DMs** and runs no metrics. Do **not** convert that practice into star-chasing — stars are a product signal, replies are the practice's signal.

**Alternatives considered:** Lead with the hosted app (rejected — ADR-005/006 already demoted it); private repo + sales-led (rejected — forecloses the magnet/social-proof that makes the model work for a tiny team).

**Consequences:** Prioritize public-repo readiness (README, MIT, `npx systemix` clean first-run, docs as depth). A `social-signal`/stars connector becomes a signal source for the loop. Landing stays thin.

**Review trigger:** A hosted product becomes the primary distribution channel.

---

## ADR-018: `/systemix next` concierge + `/systemix rigor` profiles (nWave borrows)
**Date:** 2026-06-13
**Status:** DECIDED
**Feature:** cowork-operating-layer · Analysis: `docs/nwave-vs-systemix.md`

**Decision:** Adopt two commands modeled on nWave's highest-leverage UX:
- **`/systemix next`** — a **zero-config concierge** (cf. `/nw-buddy`) that reads the instance (`systemix.config.yaml` + `contract/*` + `.systemix/queue.json`) and returns the concrete next step. This is the planner/"operator" node we kept circling, productized as a question. **It is the first node to build.**
- **`/systemix rigor`** — **profiles** (lean / standard / thorough) that fold autonomy + Hermes engine (Claude/Ollama, ADR-013) + Trust Tier (ADR-008) + model choice into one command, to scale cost/quality to stakes (cf. `/nw-rigor`).

**Rationale:** `/nw-buddy` and `/nw-rigor` are the two patterns that make nWave usable day-one; both map cleanly onto Systemix's existing loop, config, and trust model. The buddy gives the loop an orienting front door with a proven shape; rigor-as-a-command beats hand-editing YAML.

**Alternatives considered:** Build the Cowork HITL card first (rejected as *first* — the buddy orients the whole loop and is the higher-leverage borrow; the HITL card is the next step after it); keep static autonomy config only (rejected — `/systemix rigor` is clearer and discoverable).

**Consequences:** Revised build order: **`/systemix next` → Cowork HITL card → manual signals connector**. `/systemix next` reads state and proposes (writes nothing but a suggestion); `/systemix rigor` writes the relevant `systemix.config.yaml` keys.

**Review trigger:** The buddy's next-step suggestions are routinely overridden → revisit the planner heuristics.

---

## ADR-019: v5 release reconciliation — Claude-default engine (Ollama deferred) + DESIGN.md as the single contract carrier
**Date:** 2026-06-17
**Status:** DECIDED
**Feature:** systemix-public-release (v5)
**Amends:** ADR-013 (Hermes engine), ADR-015 (memory architecture)

**Decision:** The merged v5 public-release work (Phases 0–2) resolves two points left open by ADR-013/015:

1. **Engine — Claude is the default and the only engine shipped in v1; Ollama is deferred, not dropped.**
Hermes stays a *role* (synthesis/propose node), engine-selectable via `hermes.engine`. v1 ships `claude` only
and carries no Ollama dependency: the decision-logging path (`close-experiment` / `skill-update`) is now
deterministic and needs no LLM, and the reasoning path runs as a Claude skill. ADR-013's `hermes.engine:
ollama` air-gapped mode is preserved as a **roadmap item** (privacy/enterprise tier + unattended `systemix
watch` token economics), to revisit at **Phase 3** / Team tier — intentionally out of the v1 critical path.

2. **Memory — `design/DESIGN.md` is the single contract carrier (Google design.md-compatible); contracts
remain the structure.** v5 unifies what ADR-015 separated: the contract root *is* `design/DESIGN.md` — the
one file an agent reads first (brief · autonomy · goals · a capped Memory ledger · decision log · records
index) — with `design/decisions/*.mdx` as the per-unit contract leaves. This keeps ADR-015's core principle
(contracts/decisions are the source-of-record; no mega memory dump — the ledger is capped, old entries
archive out) while removing the **dual-source-of-truth hazard** of a separate interop file (the v5
context-architecture review's #1 risk). Google design.md interop is satisfied *by* DESIGN.md's frontmatter,
not a second file. Narrative/strategic memory stays in `PLAN.md` + `PROJECT_SUMMARY.md` (repo-level).

**Rationale:** v5 is the later, reviewed, merged direction (engineer / AI-context-architect / Claude-Code
panel). Both reconciliations keep the valuable intent of 013/015 (the air-gapped differentiator;
contracts-as-source, no mega-file) while choosing the simpler shipping path (Claude-only v1; one carrier).

**Alternatives considered:** Re-admit Ollama in v1 (rejected — setup tax fights the easy-setup moat; defer
with the seam preserved). Keep DESIGN.md interop-only + a separate `contract/index.mdx` root (rejected —
dual source of truth, the review's top context risk). Drop Ollama permanently (rejected — air-gapped is a
real Connecta/enterprise differentiator).

**Consequences:** `hermes.engine` remains a config key (v1: `claude`). Ollama air-gapped mode is a tracked
roadmap item, not deleted. `design/DESIGN.md` is the documented source of truth; ADR-015's "DESIGN.md =
interop only" is amended. ADR-014 and ADR-016/017/018 stand (compatible; they feed Phase 3/4).

**Review trigger:** A partner requires air-gapped operation by default (→ promote Ollama mode), or a local
model reaches Claude-parity for synthesis.

## ADR-020: Data setup is a first-class "connect a signal" step + an honest unconfigured state
**Date:** 2026-06-18
**Status:** DECIDED
**Feature:** systemix-v7 (data-setup research thread)

**Context:** An experiment authors and runs fine with no data source — but it can't *measure* until a signal
(PostHog today) is wired. That wiring was underthought. `PostHogProvider` called
`posthog.init(NEXT_PUBLIC_POSTHOG_KEY!, …)` unconditionally, so with no key it console-warned and silently
no-op'd; `/config` showed a green "posthog enabled" toggle with no hint nothing was being captured; and
`/systemix-init` Step 4 hand-waved to "a separate setup step" that did not exist. The real wiring knowledge
(an EU project, the `phc_` capture key vs the `phx_` server key, GitHub secrets for the evidence cron, the
same-origin reverse proxy that defeats ad-blockers) was scattered across memory and a stale reference doc
(`content/docs/reference/posthog.mdx`, which still shows the wrong `signals: - posthog-eu` array form and
mislabels the server key as `phc_`).

**Decision:** Make data setup first-class, in three parts.

1. **Honest unconfigured state.** Capture initialises only when a key is present — a missing key is a clean
no-op, not a dishonest `init(undefined!)`. `signalStatus(cfg)` in `instance-config.ts` is the single source
of truth for whether each signal is `enabled` and `wired`; both `/api/instance` and `/config` read it.
`/config` shows a banner when a signal is enabled-but-unwired: experiments still author + run, they just
gather no live evidence. **An experiment is never blocked on signal wiring.**

2. **A `/connect-signal` slash-command skill** — the first-class step. Guided: pick a source (PostHog now)
→ walk the wiring (the `phc_` capture key for the browser, the `phx_` server creds for evidence queries,
GitHub secrets for the daily cron) → **verify with the existing `systemix evidence check`** (it already
pings PostHog and counts pageviews) → flip `signals.<source>.enabled` on. Invokable standalone, and
referenced from `/systemix-init` Step 4 so onboarding has a real target instead of a hand-wave. Lives in the
`hypothesis-validation` pipeline (the loop) and is registered in its manifest.

3. **A named pluggable seam (not built).** `signals.<source>` in `systemix.config.yaml` plus the source-pick
in the skill *is* the seam; PostHog is the only adapter in v1. GA / a GA-MCP adapter slot in behind the same
shape later. No multi-source abstraction is built now (PostHog-now, pluggable-later, per the v7 plan).

**Rationale:** Slash-commands are the v7 interface, so a skill (not an in-app wizard) is the natural home,
and it reuses the existing `evidence check` verify primitive rather than reinventing it. Honesty-first
matches the contract's "degraded states are reported, not hidden" posture (already true in `/api/instance`).
Deferring the multi-source abstraction follows simplicity — one real adapter, a named seam, no speculative
ports.

**Alternatives considered:** (a) An in-app "connect" wizard on `/config` — rejected; the operator's seat is
Claude Code, and an app form would duplicate the slash-command interface. (b) A full `signal-source` port
with PostHog/GA adapters now — rejected as premature; the config block + the skill's source-pick already
give the seam. (c) Fold setup only into `/systemix-init` — rejected; connecting a signal happens when you're
ready to measure, not only at init, so it must stand alone (init merely references it).

**Consequences:** `PostHogProvider` is guarded (a missing key is a clean no-op). `/config` carries a wiring
banner driven by `signalStatus`. The `hypothesis-validation` manifest gains `connect-signal`. The stale
`content/docs/reference/posthog.mdx` is superseded by the skill as the canonical setup path and should be
reconciled in the Phase-4 `/docs` rebuild. The multi-source abstraction (GA, custom) stays a tracked seam,
not code.

**Review trigger:** A second signal source (GA, a custom MCP) is actually requested → promote the seam to a
real `signal-source` port/adapter pair.

## ADR-021: Node-centric Home — the instance loop as live topology, with the source/evidence taxonomy as node state
**Date:** 2026-06-18
**Status:** DECIDED
**Feature:** config-ux-runtime (v7)
**Amends:** ADR-020 (data setup / "connect a signal"); folds in the v7 plan's Phase 5 (force-graph → runtime topology)

**Context:** `/config` (Home) was the original force-graph surface but its topology went blank in the v7 wipe (`systemNodes = []`). Today it reads: search (top-left) · empty graph (center) · a floating amber "no signal connected" banner (top-center, from ADR-020) · `RuntimePanel` with the Hermes HITL queue on the **right**. The founder wants to rethink the UX + runtime for clarity: keep Hermes visible; put runtime + HITL on a side panel; show the 3D graph with **real data**, dimming inactive nodes but keeping them visible (for onboarding); move runtime to the **left** so the **right** is free for a card shown when a node is **selected**; and fold "no signal connected" into that card's state rather than a floating banner. Separately, ADR-020 left the data-source *abstraction* unsettled (is PostHog "the signal", a source, a connector?) and did not model **manual entry** (e.g. LinkedIn engagement via screenshots + hand-entered values) as a first-class source. This ADR resolves both — the abstraction and the surface — together, because "no signal" becoming node state *is* the abstraction made visible.

**Decision:**

1. **The canonical noun is `source`** — an experiment draws evidence from a **source**. PostHog is not "the signal"; it is one **adapter** of a source. "signal" (the `signals:` config key) is retained for back-compat but redefined: a *source* is the thing you connect; a *signal/reading* is a value it yields. Three source **kinds**, declared by a `type:` field on `signals.<source>`:
   - **wired** — credential/API-backed (PostHog, GA). Setup = `/connect-signal` → `systemix evidence check`. Ongoing = automated pull.
   - **mcp** — anything-with-MCP (the "or else"). Same automated-pull shape, MCP adapter.
   - **manual** — no integration, no setup. The operator logs values + screenshot + explanation directly into the experiment (e.g. LinkedIn). A first-class peer, **not** a degraded fallback.

2. **`/config` Home becomes node-centric, three columns:**
   - **Left rail** — Runtime (overview + active runs) + the **Hermes HITL queue** (`RuntimePanel` relocated; was right).
   - **Center** — the 3D graph = the **live instance loop**: nodes are the real entities (sources · skills/slash-commands · agents incl. Hermes · experiments · infra), edges are the loop (source → experiment → measure → Hermes → decide → learn). Reuses the existing 7-type taxonomy + colors.
   - **Right** — a **polymorphic node card**, empty until a node is selected; its content is by node type (see #4).

3. **Active vs inactive = live activity/data.** A node renders at full color when its live state says it's alive (a source that is wired **and** receiving; an experiment with evidence; a recently-run skill; an agent with queue activity). Everything else is **dimmed but still shown** (the existing `dimNodeIds` → 0.1-alpha mechanism), so the full topology is always legible for onboarding — the dim *is* the "no data flowing yet" signal.

4. **The node card is where state + action live (per type):** source(unwired) → "No signal connected — wire it" + `/connect-signal` (this is where ADR-020's floating banner goes); source(manual) → "Log evidence" (values/screenshot/explanation); source(wired) → last sync + event volume + `evidence check`; experiment → verdict/evidence/decision; skill → what it does + run it; agent(Hermes) → its queue/recent activity; infra/concept → description.

5. **Selection lifts from `SystemGraph3D` to `ConfigView`.** The graph today owns `selectedId` internally and renders `NodeInfoPanel` as a top-right overlay. Selection becomes controlled (`selectedId` + `onSelectNode` props); the right-column card (`NodeCardPanel`) renders in `ConfigView`. The graph keeps camera-fly + neighbour-highlight, driven by the controlled selection — an EXTEND, not a rewrite.

6. **A topology builder** (server, file-backed) reads real instance state — `systemix.config.yaml` (sources/agents) · the pipeline manifests (installed skills) · `experiments/*.mdx` · `loadRuntimeState` (recent runs) · `/api/queue` (Hermes activity) — and emits `{ nodes, edges, activeIds }`. This is the Phase-5 core, now specified here.

7. **Staged build (decision: design fully, build staged).** Slice 1: layout flip (runtime → left) + lift selection + `NodeCardPanel` + "no signal" as source-card state, **keeping the floating banner as a fallback while the graph is empty**. Slice 2: the topology builder populates the live loop; the banner retires once nodes exist. Slice 3 (follow-on): decouple `social-signal` from PostHog (manual evidence writes to the experiment directly, not through PostHog) + fix its stale `contract/hypotheses` path.

**Rationale:** The instance-loop topology is the "demo of itself" (a founder sees Systemix's own loop, live), reuses the 7-type taxonomy already built, and makes node state meaningful — every node has an honest live/dim state. Folding "no signal" and "log manual evidence" into node cards makes the source taxonomy *visible and actionable* exactly where the operator is looking, instead of a global banner divorced from the entity it describes. Live-activity dimming is the most honest answer to "is the loop alive". Staging keeps momentum (ship the layout + card model first) while capturing the whole model now, and the banner-fallback removes the only blind spot (an empty graph can't show node state).

**Alternatives considered:** (a) Experiment-centric graph (nodes = experiments only) — rejected; narrower, loses the instance-loop "demo of itself". (b) Keep the floating "no signal" banner permanently — rejected; node-state is clearer, but kept as a *staged fallback* until topology exists. (c) Config-enabled (not live-activity) dimming — rejected; doesn't reflect whether data is actually flowing. (d) A full multi-source `signal-source` port/adapter abstraction now — rejected as premature (ADR-020); `type:` on `signals.<source>` is the seam; wired/mcp share an adapter shape, manual needs none. (e) An in-app "connect" wizard — rejected (ADR-020); the operator's seat is Claude Code, the card just *routes* to `/connect-signal`.

**Consequences:** `SystemGraph3D` gains controlled-selection props; `NodeInfoPanel` becomes a polymorphic right-column `NodeCardPanel`; `RuntimePanel` flips to a left rail (border-r); a new topology-builder module is added; `signals.<source>` gains a `type:` field (serializer must round-trip it — same footgun class as ADR-020's region/host); `social-signal` is slated to decouple from PostHog. The v7 plan's standalone **Phase 5 is absorbed** into this feature. The ADR-020 banner becomes a transitional fallback. `/measure` + the experiment schema's `evidence-posthog`/`evidence-social` split aligns with the wired/manual source kinds.

**Review trigger:** the graph topology grows past ~legibility (dozens of nodes) → revisit grouping/level-of-detail; or a real second instance (a client, not the dogfood) needs the Home → validate the topology builder against a non-self instance.

## ADR-022: Unified shadcn app shell — one sidebar + header across all surfaces, fumadocs Option B, file-tree nav, the `/config` dashboard
**Date:** 2026-06-19
**Status:** DECIDED (shipped via PR #65 → `main` `ac53466`; live on getsystemix.vercel.app)
**Feature:** shell-redesign (v7)
**Completes:** ADR-021 (the node-centric Home now lives inside the shell; absorbs the v7 plan's Phase 5)
**Realizes:** ADR-011 (fumadocs as the shared renderer, "both mounts, one theme") — now literally one shell

**Context:** The three product surfaces had grown up apart. `/config` carried a bespoke header and a
`w-screen` layout; `/contract` and `/experiments` were standalone fumadocs `DocsLayout`s, each with its own
sidebar, nav, and theme-switch. The result was three disconnected chromes: cross-surface nav was broken,
responsiveness was poor, contrast failed in ~307 spots (opacity-on-text + sub-12px labels), `font-mono` was
over-used as a UI face, and pre-v7 legacy components still cluttered `src/`. The founder rejected the
slice-1 UI and approved a full rebuild on a modern shadcn app-shell (plan
`~/.claude/plans/i-dont-like-the-fuzzy-tide.md`). Two cross-cutting calls were locked up front: **theme =
refined modern-shadcn-neutral** (keep the oklch base — the palette wasn't the problem); **cleanup =
remove orphaned legacy now, defer the /docs-coupled tier** (pipeline.ts, the 2D graph, docs+components data)
to the Phase-4 `/docs` rebuild.

**Decision:**

1. **One route group, one shell.** `src/app/(app)/` hosts a single `layout.tsx` = `SidebarProvider` +
`AppSidebar` + `SiteHeader` + `SidebarInset`. The three surfaces (config/contract/experiments) were
`git mv`'d under it; **URLs are unchanged**. The root layout stays Providers-only; `/` (landing) and
`/docs` (public docs) stay OUTSIDE the group.

2. **Fumadocs Option B (chrome-disabled).** Contract + Experiments keep their fumadocs `DocsLayout` but with
`sidebar`/`nav`/`themeSwitch` `{{ enabled: false }}` (and `RootProvider theme={{ enabled: false }}`), so each
contributes only its MDX body + TOC. Their page trees are converted (`pageTreeToElements`) and fed into the
ONE shell sidebar; theme defers to the app root (next-themes); search is scoped per surface
(`/api/system-search`). This is the realization of ADR-011's "both mounts, one theme".

3. **Central nav config.** `src/lib/nav.config.ts` is the SSOT — `PRIMARY_NAV` (Home/Contract/Experiments) +
`SECONDARY_NAV` (Docs/GitHub), `isActive`/`surfaceLabel`, and the `pageTreeToElements`/`collectFolderIds`
page-tree→file-tree adapters. It replaces the dead `src/lib/nav.ts` and the hardcoded `APP_NAV` that was
scattered across the old `AppTopBar` and the `/config` header.

4. **Sidebar = magicui file-tree; header = toggle + breadcrumb + command + theme.** `AppSidebar` shows Home
as a top button, then Contract + Experiments as persistent, expandable magicui Folders
(`src/components/ui/file-tree.tsx`): folders expand, files navigate, the current route highlights, and the
active surface's folder starts expanded. `SiteHeader` = sidebar toggle + breadcrumb (`surfaceLabel`) +
command palette + theme toggle. New shell modules: `src/components/shell/{AppSidebar,SiteHeader,CommandMenu}.tsx`.

5. **The `/config` dashboard.** Reflowed responsive: a shadcn `ResizablePanelGroup` (react-resizable-panels
v4 — `orientation` not `direction`, `%`-string sizes) with **runtime | graph** panels (drag handles,
min/max, runtime collapsible); the **node inspector is a floating card** (`absolute right-4 top-4`, overlays
the canvas so the graph keeps full width — reversed from an earlier docked-panel build); below `md` the
panels collapse to Sheets. The center is a **dotted canvas** — transparent WebGL (`alpha:true`,
`backgroundColor: rgba(0,0,0,0)`) over a CSS-var-driven radial-gradient dot grid
(`--canvas-bg`/`--canvas-dot` in `:root` + `.dark`, so it follows the theme class instantly, not a lagging
JS `resolvedTheme`).

6. **The graph is the live instance topology** (completes ADR-021 #6). `src/lib/state/instance-topology.ts`
reads real instance state — signals/sources, the pipeline manifests (installed skills), the atlas agents,
`experiments/*.mdx`, the surfaces, plus fixed infra + tools — and emits all 7 node types + the loop edges;
available nodes render full-color, unwired sources dim.

7. **Theme = de-mono + WCAG contrast, not a re-palette.** The live surfaces were globally de-mono'd (Manrope
sans for labels/prose); `<code>/kbd/samp/pre` keep mono via a `globals.css` base rule; mono is reserved for
commands and IDs. A contrast sweep removed opacity-on-text (`text-…/NN` → solid) and bumped sub-12px text to
a 12px AA floor. The neutral oklch palette is unchanged — the de-mono **is** the refinement.

**Rationale:** One shell across all surfaces is the only way to get coherent cross-surface nav,
responsiveness, and theming — the duplicated chrome was the actual failure. Option B keeps fumadocs's MDX
rendering + TOC (cheap, well-tested) while ceding the chrome (the duplicated part) to the shell. A file-tree
sidebar renders the contract/experiments corpora as what they are — browsable folders of MDX. The floating
inspector keeps the graph full-width. Topology-as-Home is the "demo of itself" from ADR-021. Keeping the
palette and fixing mono-overuse + opacity-on-text targets the real contrast failures and avoids a clash with
the parallel landing branch (`claude/upbeat-ardinghelli`), which also touches `globals.css`.

**Alternatives considered:** (a) Keep three standalone fumadocs layouts (status quo) — rejected; that *was*
the broken UX. (b) Fumadocs Option A (fumadocs is the outer shell, `/config` mounts inside it) — rejected;
`/config` is a bespoke React dashboard, not MDX, so the shadcn shell must be the outer frame and fumadocs the
guest. (c) Re-palette to a new neutral ramp — rejected; the palette was fine, mono-overuse + opacity-on-text
were the contrast failures. (d) Docked inspector panel — built, then reversed (round 4) to a floating card so
the graph keeps full width. (e) Delete ALL legacy incl. the /docs-coupled tier now — rejected; pipeline.ts /
the 2D `SystemGraph` / docs+components data are reachable only via the docs embeds
(`ArchitectureGraph`/`SkillsBrowser`) and are bundled with the Phase-4 `/docs` rebuild.

**Consequences:** A new `(app)` route group + `(app)/layout.tsx`; `src/components/shell/*`,
`src/lib/nav.config.ts`, `src/lib/state/instance-topology.ts`, `src/components/ui/{file-tree,resizable}.tsx`,
and shadcn primitives (sidebar/sheet/dropdown-menu/breadcrumb/dialog/input/label/select/skeleton + use-mobile)
are added. `SystemGraph3D` gains controlled selection + a transparent renderer; `NodeCardPanel` / `RuntimePanel`
are reshaped. **`SidebarInset` requires `min-w-0`** — a reusable shadcn gotcha: flexbox `min-width:auto`
otherwise lets the inset overflow the viewport and push the header's search/theme off-screen. **Phase 5
(this cleanup):** the orphaned pre-v7 modules are removed in two waves. The landing + /docs rebuild (PR #67,
`51a5e8d`) deleted `components/{dashboard,drift,components-page,canvas,pipeline}`, `library/IntegrationStatus`,
and the whole /docs-coupled tier (`lib/data/{pipeline,docs,components}`, the 2D `SystemGraph`), and rebuilt
`content/docs/*` Ollama-free (engine = Claude Code, ADR-019 — `architecture.mdx` retired with the embed). This
commit removes the orphans #67 left behind — `lib/data/{github,workflows}`, the dead `lib/nav.ts`, and the
unmounted `systemix/{AppShell,LeftSidebar,MobileHeader,AppTopBar,RightAnchorNav}`. No /docs-coupled tier or
stale Ollama copy remains deferred. A pre-existing dev-only `SystemGraph3D` `Legend` hydration warning is
untouched.

**Review trigger:** a fourth product surface is added → validate the `(app)` group + `nav.config` scale; or a
fumadocs major upgrade changes the `DocsLayout` chrome-disable API (Option B depends on
`sidebar`/`nav`/`themeSwitch` `{{ enabled: false }}`).
