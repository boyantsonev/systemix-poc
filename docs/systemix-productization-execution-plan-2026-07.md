---
title: "Productization execution plan — Atlas-as-artifact, the offer ladder, two landing pages"
status: PROPOSED — resolves open questions from the two prior analysis docs into a build plan
type: execution-plan
date: 2026-07-07
canon:
  - docs/systemix-productization-benchmark-2026-07.md (the getdesign.md/LaunchKit benchmark)
  - docs/systemix-atlas-config-packaging-2026-07.md (skills-vs-plugin pros/cons)
  - decisions/ADR.md (ADR-016, ADR-017, ADR-022)
supersedes: "§4 (offer ladder) of the productization-benchmark doc — refined below, not contradicted"
---

# Productization execution plan

## 0. TL;DR

Two things got resolved this round:

1. **Atlas doesn't need to choose between "cheap Mermaid" and "vendor the whole app."** A Cowork
   live-artifact can run its own inline JS (no CDN restriction on hand-rolled SVG/DOM, only on which
   *libraries* it may pull from a CDN) and fetch data from **the client's own running localhost app**
   — `/api/workflows` already exists (`src/app/api/workflows/route.ts` → `src/lib/workflow/persistence`).
   That gives close-to-real Atlas fidelity (click a step → detail pane) inside a persisted artifact,
   with zero new backend. Falls back to the existing MCP tool (`packages/mcp-server/src/tools/workflow.ts`)
   when the dev server isn't running. Config's 3D graph is unaffected by this — `three.js` still can't
   run in an artifact, so it stays the localhost-app / premium surface, as concluded in the prior doc.
2. **The offer ladder needs a fifth, cheaper rung** — and it turns out the free one already half-exists:
   `npx @getsystemix/cli audit` (`packages/cli/src/commands/audit.js`) already vendors a **free, local,
   zero-setup** `design-audit` skill, and the landing copy (`src/lib/landing/content.ts`) is already
   written around "**two doors: audit · interview**." The new **paid** self-serve tier from the
   benchmark doc sits naturally *after* that free entry point, not instead of it.

This plan turns both into concrete, buildable phases, with a Claude Code entry prompt for each.

## 1. Atlas as a live artifact — the resolved design

**Data path (two-tier, in priority order):**

1. **Primary — local dev server.** The artifact's inline JS does `fetch('http://localhost:3001/api/workflows')`
   (already returns real workflow data via `listWorkflows()`). If the user has `npm run dev` running,
   the artifact renders the live catalog, no new plumbing required.
2. **Fallback — MCP tool call.** `window.cowork.callMcpTool('list_workflows', {})` /
   `get_workflow` against `packages/mcp-server` (already implemented, already reads
   `.systemix/workflows.json` or parses `src/lib/data/workflows.ts` directly) when no dev server is
   running. This is the path that works for a client who only ran `npx @getsystemix/cli init` and never
   started the app.

**Rendering:** hand-rolled inline SVG/DOM (step nodes, group labels, a legend — the same visual
vocabulary as `src/components/atlas/*`, reimplemented lightly, not ported via `@xyflow/react` which
can't be npm-imported into an artifact) with click-to-detail-pane behavior, matching
`app-three-layers.md`'s "clicking a step opens the prototype as an inline detail pane." Mermaid stays
the *cheap* fallback specifically for a flattened, non-interactive view (e.g. embedding a workflow
diagram in a delivered report/doc, not the live cockpit).

**⚠️ One assumption needs a spike before this is committed:** whether a Cowork live-artifact's sandbox
permits `fetch()` to `http://localhost:*` at all. This determines whether tier 1 is real or whether
every Atlas artifact falls straight to the MCP path. **First build item, not an afterthought** — cheap
to test (one artifact, one `fetch`, one console log) and it changes the rest of the design if it fails.

## 2. The offer ladder, refined

Supersedes the productization-benchmark doc's §4 table with a fifth rung the codebase already half-built:

| Rung | What | Price | Status |
|---|---|---|---|
| 0 · Free skill | `npx @getsystemix/cli audit` → `/design-audit` — zero-setup, local, read-only, infers the de-facto DS and flags drift | $0 | **Already built** (`packages/cli/src/commands/audit.js`) |
| 1 · Paid self-serve report | **Readiness Audit request** — the "interview" door's cheap alternative: submit a repo/site URL, get back a scored report (drift history, JTBD gap map, an AI-native readiness score) + a delivered artifact | **$149–249 one-time** | New — build target of Phase 2 below |
| 2 · Paid self-serve kit | **AI Kit** — full `npx @getsystemix/cli init` (loop + design substrate) + the Atlas live-artifact (§1) + the JTBD methodology as a reusable skill + guardrails. Everything needed to *run* the loop, not just get audited | **$249–299 one-time** (LaunchKit-anchored) | New — build target of Phase 3 below |
| 3 · Sprint | Bespoke 1-week build; **this is where Config's 3D graph lives** (per the packaging doc's conclusion) + custom-tuned skills | No public price today → recommend **€3,000–6,500** | Existing, unpriced |
| 4 · Design partner | Free setup + workflow mapping, 1–2 seats | $0 | Existing |

Rungs 0→1→2 are the same escalating-commitment shape as getdesign.md free-tier → `/request` → LaunchKit;
rungs 3→4 are unchanged from today.

## 3. Two landing pages — GTM structure

**Recommendation: two routes in the existing app, not two deployed sites.** getdesign.md/LaunchKit
uses a subdomain split (`getdesign.md` vs `launchkit.getdesign.md`) because LaunchKit is a distinct
product line for that team. Systemix already committed to **one shell across all surfaces**
(ADR-022) and a **thin marketing landing** (ADR-017) — a second deployed app would fragment that
shell and double the maintenance surface for no real GTM benefit at this stage. If there's a specific
reason to want the subdomain split later (e.g. selling the Kit under different SEO terms, or
eventually spinning it out as its own micro-brand the way LaunchKit is its own brand under
VoltAgent), that's a cheap migration *from* two routes — not vice versa. Flagging this as the one
open call in this plan; the rest doesn't depend on which way it goes.

**Proposed routes:**

- **`/audit`** — the Readiness Audit request flow (rung 1). Form: repo/site URL, email, "how are you
  building right now" (mirrors getdesign.md/request's own qualifying question — useful signal, keep
  it). Delivers the report + artifact link.
- **`/kit`** — the AI Kit page (rung 2). Feature list mirrored on LaunchKit's structure: what's
  included, a build-vs-buy table (LaunchKit's own "$25k–$65k of dev hours for $249" framing — Systemix's
  version: cite the freelance UX-audit/design-system market figures already researched for the Savin
  quote, §pricing in the earlier chat thread), FAQ.
- **Reciprocal cross-promo**, exactly mirroring what was observed on both fetched pages: a banner on
  `/audit` — *"Want the full loop, not just the report? → The AI Kit"* — and a footer credit on `/kit`
  pointing back to `/audit` for anyone not ready to buy. This pattern is directly responsible for a
  meaningful share of getdesign.md's own conversion path (the request page **leads** with the
  LaunchKit banner above its own pricing card).
- **Funnel tracking** — one `contract/engagement/audit.mdx` and one `contract/engagement/kit.mdx`,
  same shape as the existing `contract/engagement/landing.mdx` (PostHog-synced snapshot, evidence
  log, HITL-acknowledged). Both roll up into the existing `experiments/goals/consultancy-leads.mdx`
  goal — they're new funnel steps toward the same north star, not a new goal.

## 4. Build phases

**Phase 0 — Validate the artifact/localhost assumption (§1's spike).** One throwaway Cowork artifact,
one `fetch('http://localhost:3001/api/workflows')` call, confirm pass/fail. Blocks nothing else, but
resolve first since it decides Atlas's whole data-path design.

**Phase 1 — Atlas live-artifact.** Build the inline SVG/DOM renderer + the two-tier fetch (§1). Ship as
a new skill (e.g. `/atlas` or folded into `design-audit`'s output) that calls `mcp__cowork__create_artifact`.
Reuses: `/api/workflows`, `packages/mcp-server/src/tools/workflow.ts`, the visual vocabulary in
`src/components/atlas/*` (reimplemented, not imported).

**Phase 2 — `/audit` page + the Readiness Audit report generator.** Combine what already exists
(`generate-design-md.ts`, `/drift-report`, `jobs.yaml`'s ODI-scoring method applied to a client repo)
into one report pipeline + the request form + delivery mechanism (email or a Cowork live-artifact
link, per the productization doc's §3). This is also the natural moment to price and pilot it — the
Savin/ESG-regtech engagement (from the first doc, §5) can be the first paid delivery through this
exact pipeline instead of a bespoke one-off.

**Phase 3 — `/kit` page + packaging.** Bundle `npx @getsystemix/cli init` + the Atlas artifact skill (Phase 1)
+ a JTBD-methodology skill (new — package the `jobs.yaml` ODI-scoring approach as a reusable
`/jtbd-audit` skill, generalized from the Systemix-specific version) + guardrails into one downloadable
kit, price it, build the page.

**Phase 4 — Cross-link + funnel contracts.** Wire the reciprocal banners (§3), stand up
`contract/engagement/{audit,kit}.mdx`, roll into `consultancy-leads.mdx`.

**Deferred, not in this plan:** Config's 3D graph packaging (plugin vs. continued localhost-only) —
per the packaging doc, that's a bigger, separate decision (possibly its own ADR) and isn't blocking
any of the four phases above, since Config stays sprint-tier-exclusive either way for now.

## 5. Claude Code handoff prompts

Ready to paste into a Claude Code session in this repo, one per phase:

- **Phase 0:** *"Spike: build a minimal Cowork live-artifact that does `fetch('http://localhost:3001/api/workflows')`
  on load and renders the raw JSON. I need to confirm whether the artifact sandbox allows localhost
  fetches before designing the Atlas artifact around it. Report pass/fail plus any CSP/console errors."*
- **Phase 1:** *"Read `docs/systemix-atlas-config-packaging-2026-07.md` §1 and
  `docs/systemix-productization-execution-plan-2026-07.md` §1/§4 Phase 1. Build the Atlas live-artifact:
  inline SVG/DOM renderer for the step-node/group-label/legend vocabulary in `src/components/atlas/*`,
  two-tier data fetch (`localhost:3001/api/workflows` → MCP `list_workflows` fallback), click-to-detail-pane
  for prototype previews. Ship as a new skill."*
- **Phase 2:** *"Read `docs/systemix-productization-benchmark-2026-07.md` §3 and
  `docs/systemix-productization-execution-plan-2026-07.md` §4 Phase 2. Build the Readiness Audit report
  pipeline combining `scripts/generate-design-md.ts`, `/drift-report`, and a client-repo-scoped version
  of the JTBD ODI-scoring method in `docs/product/jobs.yaml`. Then scaffold the `/audit` request-form
  page under `src/app`, following the copy/structure conventions in `src/lib/landing/content.ts`."*
- **Phase 3:** *"Package `npx @getsystemix/cli init` + the Atlas artifact skill (Phase 1) + a new generalized
  `/jtbd-audit` skill + guardrails into one kit. Scaffold the `/kit` page mirroring LaunchKit's
  structure (feature list, build-vs-buy table, FAQ) — see
  `docs/systemix-productization-execution-plan-2026-07.md` §3."*
- **Phase 4:** *"Add reciprocal cross-promo banners between `/audit` and `/kit` (see §3). Create
  `contract/engagement/audit.mdx` and `contract/engagement/kit.mdx` following the shape of
  `contract/engagement/landing.mdx`. Wire both into `experiments/goals/consultancy-leads.mdx` as new
  funnel steps."*
