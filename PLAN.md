# Systemix — Strategic Plan & Context Tracker

> Living document. Tracks the venture-level architecture and the per-client engagement state.
> Iteration 2 — updated 2026-06-02. Scope of this iteration: **plan only** (no code).

---

## 1. Vision (client-agnostic) — grounded in what Systemix already is

Systemix is **software-in-a-service**: it implements and automates a design system for a team or company, then keeps it alive. This framing is **not aspirational — it is already in the architecture**. The client-agnostic substrate exists today (analysis below); productizing it for a second tenant (Connecta) is the work, not building it from scratch.

**Evidence the SaaS model is already structural (not bolted on):**
- **Multi-tenant data model** — `supabase/schema.sql` is built around `projects` (one per workspace/repo, carrying `figma_file_key` + `repo_url` + `settings`), `project_members` (owner/admin/member/viewer RBAC), full **row-level security**, and realtime on `events` / `hitl_tasks` / `agent_states` / `sync_log`. A client is a `projects` row, isolated by RLS.
- **Multi-brand theming** — `src/lib/data/brands.ts` defines a `Brand` (slug, layered `tokenOverrides` at primitive/semantic/component levels, `tokenCoverage`, `componentCoverage`, `themeFile`, `figmaFileKey`), written by a `component-themer` agent and applied via the `apply-theme` / `style-match` skills. A client is a `Brand` entry. This is the mechanic that makes the system client-agnostic.
- **Three productized pipelines** (`packages/cli/pipelines/*/manifest.json`): `design-system`, `figma-to-code`, `hypothesis-validation` — these are the loops, packaged.
- **Distribution surface already exists** — `packages/cli` (`npx systemix`), `mcp-server` (Systemix's own MCP), `mcp-proxy` (TokenGuard budget proxy), `github-action` (`verolab/systemix-action@v1`, dry-run token-budget enforcement in CI), `figma-plugin`.

The three loops, mapped to the pipelines:
1. **Agent improvement loop** — Systemix reads what worked across its workflows and updates its own skills/prompts. (cross-cutting; `agent_states` + `sync_log`.)
2. **Hypothesis validation loop** — `hypothesis-validation` pipeline: measures experiments against real signals, writes evidence back to `contract/`, progressively automates the funnel.
3. **Documentation loop** — `design-system` + `figma-to-code` pipelines: keeps a living component/token library in sync. The output is the **self-updating docs page** (see §2) — the most legible SaaS surface, what a client *sees* they're paying for.

---

## 2. Architecture — the docs loop is Systemix-native; southleft is only the Figma bridge

### The self-updating docs page (how it actually works — already prototyped)
This is a **Systemix-native mechanic**, not a wrapper around an external library:
- The **`sync-docs` skill** reads `lib/data/components.ts`, `tokens.ts`, and `brands.ts`, then for each component reads the source file to extract props/token-usage/variants.
- It diffs against `src/lib/data/docs.ts` (exists, ~20KB) and assigns a status: **stale / drifted / missing / current**, plus a `coverageScore`, behind a **HITL gate** before writing (`writtenBy: "doc-sync"`).
- The rendered surface is the existing **`src/app/docs`** route. Health/drift signals reuse `/drift-report` and `design:accessibility-review`.
- **Client-agnostic by construction:** the loop is generated from `components.ts` + `tokens.ts` + a brand config. Under the **embedded-per-client** model (below + `docs/feature/systemix-v2/meta-plan.md`), the instance *is* the tenant: `npx systemix init` installs the loop inside the client's design-system repo, which renders its own `/docs`. Connecta's design-system repo is the first such instance.

### Where southleft fits (scoped correctly)
[`southleft/figma-console-mcp-skills`](https://github.com/southleft/figma-console-mcp-skills) is **only the Figma-integration layer**. Systemix's `figma`, `sync-to-figma`, `tokens`, `check-parity`, and `connect` skills already call `mcp__claude_ai_Figma__*` / Figma Console MCP — southleft's skills *extend and harden that bridge* (variable export to DTCG/CSS/Tailwind, design-to-code parity, Code Connect). They do **not** drive the docs loop, the multi-tenant substrate, or the SaaS framing. Adopt southleft updates where (and only where) a skill touches Figma.

### Distribution model — embedded per-client (v-next direction)
Systemix is evolving from a *central, multi-tenant, Supabase-backed dashboard* into a **distributable instance**: `npx systemix init` installs Systemix into a client's design-system repo, where it runs its loops locally and the client owns their instance + data. This shift is the subject of the **Systemix v-next** planning track — `docs/feature/systemix-v2/meta-plan.md`. The central multi-tenant model (`supabase/schema.sql`, the `brands.ts` array) is the **v1 baseline being re-shaped**, not the v-next target.

### Project map (the engagement)
| Repo | Role | Consumes |
|---|---|---|
| `systemix` (this repo) | The engine. Evolves to v2; becomes the `npx systemix init` distributable. | — |
| `connecta-design-system` *(new, separate)* | **Embedded Systemix instance** + Tamagui base theme + components + self-updating docs (`sync-docs` → `/docs`). Published as `@connecta/design-system`. | `systemix` (as a dev tool) |
| `connecta` *(fork of `denitsa9006/connecta` → Turborepo app monorepo)* | `apps/landing` (Wisprflow-inspired marketing; first user of the hypothesis-validation pipeline) + `apps/platform` (cross-platform via Tamagui/Expo; agents, flows, educational AI). | `@connecta/design-system` |
| southleft skills + Figma MCPs | Figma read/write bridge for the design-system loop. | — |

---

## 3. Connecta engagement — three workstreams (Design Partner #1)

> **Superseded (iteration 2):** the single forked `connecta-app` with an in-app `/styleguide` route is retired. The engagement is now **split** — a separate **design-system repo** (holding the embedded Systemix instance + the docs) and an **app monorepo** (landing + platform) that consumes it. Decision log: `docs/feature/systemix-v2/wave-decisions.md`.

### Decisions locked
| Decision | Resolution |
|---|---|
| Native mobile on roadmap? | **Yes** → Tamagui (cross-platform, RN-capable). |
| Framework | **Next.js 15 (App Router)** + Tamagui; migrate off Astro. (A2) |
| Systemix instance model | **Embedded per-client** — `npx systemix init` into the DS repo. |
| Repo topology | **Split**: `connecta-design-system` (separate, publishable) + Connecta app monorepo (`apps/landing` + `apps/platform`). The existing `denitsa9006/connecta` fork becomes the app monorepo. |
| This iteration's output | **Plan only** — meta-plan + project map. |

### Workstream A — Design System (`connecta-design-system`)
The shared foundation: holds the **embedded Systemix instance**, the **Tamagui base theme**, the components, and the **self-updating docs** (`sync-docs` → `/docs`) that replace the old in-app `/styleguide`. Published as `@connecta/design-system`, consumed by both apps.
- **Base theme** (detail: `research/connecta-tamagui-theme.md`) — merge **Wisprflow × Connecta**: adopt cream ground + EB Garamond display + Figtree body + soft 16px radius; **coral `#F35F49` stays primary**, **lavender → secondary/links/focus**, **lime `#DEFB50` → fill-only highlight**, forest green → banner-only. Light + dark; concrete `tamagui.config.ts` drafted.
- **Component library** (detail: `research/connecta-component-inventory.md`) — 9-section IA (Foundations · AI Conversation · Agentic Workflow · Learning · Administration · Trust & Safety · Navigation & Shell · Forms & Inputs · Feedback & States). Reuse **Vercel AI Elements** + **Shape of AI**. **Trust & Safety is the K-12 differentiator** (11-surface set). **Persona switcher (Student/Parent/Teacher)** gates UI. MVP = 12 components.
- **Interaction & microinteraction layer (decision F)** — a first-class, cross-cutting concern: the DS ships components **and documented design rationale** for **human↔AI, AI↔human, and agent↔agent** interactions and their microinteractions — streaming, thinking, loading, tool-calling, hand-off/turn-taking states. This is broader than the "AI Conversation" category and sets the **requirement the motion system must satisfy** → **Tamagui + Moti** (animated AI-state primitives that work across web + native). The deferred educational-AI research (Workstream C) must scope these patterns explicitly.
- **Gating dependency:** the DS repo can't be scaffolded correctly until the **`npx systemix init` contract** is locked in the v-next DESIGN wave (`meta-plan.md` §8).

### Workstream B — Landing (`apps/landing`)
Wisprflow-inspired marketing site; **first external user of the `hypothesis-validation` pipeline** (experiments → PostHog EU + Vercel signals → Hermes decision cards → evidence write-back). Consumes `@connecta/design-system`. Replaces the live Astro landing at cutover.
- **Compliance:** the live Astro site ships Microsoft Clarity (prohibits under-18 users) → move to **PostHog EU** (§4).
- **Open:** where the hypothesis loop *binds* — DS-repo instance vs landing app (v-next question, `meta-plan.md` §4.4).

### Workstream C — Platform (`apps/platform`)
The cross-platform product (web + native via Tamagui/Expo): agents, flows, educational AI. Consumes `@connecta/design-system`.
- **Before build:** spawn a deeper **educational-AI components & patterns research** (seeded by `research/connecta-component-inventory.md`) to define platform component usage/patterns — explicitly including the **human↔AI / AI↔human / agent↔agent interaction + microinteraction** patterns and their rationale (decision F). *Not spawned this turn* — per plan, immediately before platform build.

---

## 4. Analytics & signals (affects Connecta directly)

- **Compliance fix surfaced:** Connecta's live Astro repo currently ships **Microsoft Clarity** (`@microsoft/clarity` in `package.json`, `PUBLIC_CLARITY_ID`). B1 found Clarity's ToS **prohibits under-18 users** — disqualifying for a K-12 product. **Action: remove Clarity, adopt PostHog EU (Frankfurt)** — free tier covers pre-launch, true EU residency, official MCP, already integrated in Systemix (`spikes/spike-3-posthog/`). (Detail: `research/analytics-options.md`.)
- **Social signals:** UTM + Vercel Analytics already cover referrer attribution. Add **Syften** (~$40/mo) for brand keyword monitoring *only once there's organic volume*. Skip ClearCue/Apify for now (ToS/GDPR exposure). (Detail: `research/social-signals-options.md`.)

---

## 5. Roadmap (build phase — not this session)

**Phase 0 — Systemix v-next planning** ✅ **DESIGN locked (ADR-006..009)**: the `npx systemix init` contract is decided — a 4-question topology wizard (Surfaces · Signals · Autonomy · Self-improvement) → `systemix.config.yaml`, embodied in `docs/feature/systemix-v2/prototypes/`. ✅ **CLI re-shaped to project-scoped instance**: install path (`init.js`, `add.js`) writes skills to `.claude/skills/` + `init` writes `systemix.config.yaml` + `contract/meta/`; read path (`list.js`, `doctor.js`, `update.js`, `commands/sync.js`) prefers project skills, falls back to global. Verified end-to-end in isolated temp dirs (global `~/.claude/skills` untouched).

**Phase 1 — Connecta Design System** *(after the `init.js` re-shape)*:
1. Confirm Wisprflow hex values via one DevTools session → locks the theme palette.
2. Scaffold `connecta-design-system`; run `npx systemix init` to install the embedded instance.
3. Implement the Tamagui base theme from `research/connecta-tamagui-theme.md` (light/dark).
4. Stand up the `sync-docs` loop → `/docs` as the living styleguide; publish `@connecta/design-system`.

**Phase 2 — Landing** *(consumes the DS)*:
5. Fork `denitsa9006/connecta` → Turborepo app monorepo; build `apps/landing` on the DS.
6. Wire the `hypothesis-validation` pipeline (PostHog EU + Vercel); cut over from the Astro site.

**Phase 3 — Platform** *(consumes the DS)*:
7. Spawn the educational-AI components/patterns research; then build `apps/platform`.

**Parallel (not blocked by v-next):** Wisprflow DevTools hex capture · Clarity → PostHog-EU compliance fix on the live Astro site.

---

## 6. Decisions — resolved 2026-06-02

| # | Decision | Resolution | Record |
|---|---|---|---|
| A | Control plane | **Demote** to optional; the client repo is source of truth | ADR-006 |
| B | Local data store | **Files** — MDX contracts + `queue.json` + `systemix.config.yaml` + `.systemix/` | ADR-007 |
| C | `init` contract | **4-question topology wizard** → `systemix.config.yaml` (prototype) | ADR-008 |
| D | Hypothesis binding | **Consuming app** runs its own instance; DS package stays pure | ADR-009 |
| E | Coral primary | **Darken to `#C9442F`** for full WCAG AA | `research/connecta-tamagui-theme.md` |
| F | Interaction layer | DS ships components **+ design rationale** for **human↔AI / AI↔human / agent↔agent** interactions & microinteractions (streaming, thinking, loading) | §3 Workstream A |
| G | DS package name | **Confirmed `@connecta/design-system`** | — |
| H | Clarity removal | **Patch the live Astro site now** (compliance) | §4 |

**Remaining (non-blocking):** ✅ CLI fully re-shaped to project-scoped (`init`/`add`/`list`/`doctor`/`update`/`sync` — done) · `jobs.yaml` reconciliation pass for embedded-distribution jobs · prototype's React display copy still shows `~/.claude/skills/` (cosmetic, update to `.claude/skills/`).

---

## 7. Systemix v-next (planning track) — DESIGN locked

The engine's evolution from central multi-tenant SaaS to **embedded-per-client** ran as an nWave feature: `docs/feature/systemix-v2/`. The plan-to-plan is `meta-plan.md`; the wave log + founder decisions are in `wave-decisions.md`; the DESIGN is embodied by the prototypes in `prototypes/` and locked as **ADR-006..009**. The gating output — the **`npx systemix init` contract** — is decided. The one engine task before the Connecta build is the `init.js` re-shape (§5 Phase 0).

---

## Research index
| File | Track |
|---|---|
| `research/wisprflow-brand.md` | A1 — Wisprflow brand forensics |
| `research/connecta-current-state.md` | A2 — Connecta codebase audit |
| `research/analytics-options.md` | B1 — Analytics evaluation |
| `research/social-signals-options.md` | B2 — Social signals |
| `research/connecta-component-inventory.md` | C1 — Educational/agentic component inventory |
| `research/connecta-tamagui-theme.md` | C2 — Connecta base theme (Tamagui) |
| `research/SYNTHESIS.md` | Cross-track briefing |
