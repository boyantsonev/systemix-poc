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
