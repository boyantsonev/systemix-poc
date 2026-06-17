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
