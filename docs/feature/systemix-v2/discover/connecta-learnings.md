# Connecta Learnings — what Design Partner #1 taught us

**Wave:** DISCOVER
**Feature:** systemix-v2
**Date:** 2026-06-02
**Sources:** `research/SYNTHESIS.md`, `research/connecta-current-state.md`, `research/connecta-tamagui-theme.md`, `research/connecta-component-inventory.md`, `research/analytics-options.md`, `research/social-signals-options.md`

> Connecta is the first external pull on Systemix. Each learning below is grounded in the research set and carries a concrete implication for the v-next architecture and/or the `npx systemix init` contract. These feed the DISCUSS wave.

---

## L1 — Clients arrive on incompatible stacks
**Evidence:** Connecta is Astro v4 + Cloudflare Workers, **zero React**, no Tailwind, scoped CSS, ports-and-adapters (`research/connecta-current-state.md`). Tamagui needs React → a framework migration to Next.js was required.
**Implication:** An embedded instance cannot assume a host framework. The **`init` contract must declare and detect its host assumptions** (React? Next? bundler?) and either adapt or fail loudly. The design-system + docs loops should run **framework-agnostically** (file/token level), independent of the consuming app's framework. → DISCUSS job candidate: *"install into a repo I didn't build for Systemix."*

## L2 — The design system is a separate, consumable package
**Evidence:** Connecta has *two* consumers — a landing site and a cross-platform platform — both needing the same tokens/components (`PLAN.md` §3; `research/connecta-component-inventory.md`).
**Implication:** Validates the core v-next shape: **the embedded instance lives in the DS repo, not in an app.** Its output is a *published package* (`@connecta/design-system`), and the docs surface is part of that package. This is why the iteration-2 "/styleguide inside the app" model was retired. → confirms gap-analysis-v2's "Docs UI → per-instance deliverable" re-shape.

## L3 — Brand identity is a real *merge*, with layered overrides
**Evidence:** The Wisprflow × Connecta theme is not a swap — coral stays primary, lavender becomes secondary, lime goes fill-only, forest green demotes to banner-only, with WCAG contrast resolved per token, light + dark (`research/connecta-tamagui-theme.md`).
**Implication:** The single-brand config (replacing the `brands.ts` array) must keep the **layered `tokenOverrides`** model (primitive/semantic/component) and **light/dark** as first-class — not a flat palette. The `component-themer` agent's output shape survives; the multi-brand registry does not. → confirms gap-analysis-v2 "Brands → single-brand config."

## L4 — Compliance is a first-class, swappable signal
**Evidence:** Connecta ships Microsoft Clarity, whose ToS **prohibits under-18 users** — disqualifying for K-12. The fix is PostHog EU (Frankfurt, residency) (`research/analytics-options.md`).
**Implication:** The **hypothesis-validation loop's data source must be per-client, region-aware, and swappable.** Systemix cannot hard-wire one analytics backend. The `init` contract should ask for / detect the evidence source. → DISCUSS: where the hypothesis loop *binds* (meta-plan §4.4) is also a *compliance* decision, not just a wiring one.

## L5 — Cross-platform pulls toward a monorepo + shared DS package
**Evidence:** Native mobile is on the roadmap → Tamagui/Expo; the canonical Tamagui setup is a monorepo (`packages/ui` + `apps/next` + `apps/expo`) (`research/SYNTHESIS.md`, theme research setup steps).
**Implication:** The consuming side trends monorepo, but the **DS (with the embedded instance) is deliberately a separate repo** so it can be versioned and consumed by independently-deployed apps. v-next must support an instance whose *job is to publish*, not to run an app. → reinforces the "split: DS repo + app monorepo" topology.

## L6 — The component domain is the *client's*, not the engine's
**Evidence:** Connecta's inventory is deeply domain-specific — educational/agentic + K-12 Trust & Safety (11 safety surfaces), persona-gated (Student/Parent/Teacher) (`research/connecta-component-inventory.md`).
**Implication:** Sharpens the engine/content boundary: **Systemix ships a generic loop (tokens, docs, drift, parity, hypothesis); the components and their domain patterns are the client's.** The embedded instance should *document and keep in sync* whatever components exist — it should not prescribe them. The educational-AI component research is a *Connecta* artifact, not a Systemix feature. → keeps v-next scope honest (criterion C6: pipelines run largely unchanged).

## L7 — The hypothesis loop gets its first real external consumer
**Evidence:** The Connecta *landing* is slated as the first external user of the `hypothesis-validation` pipeline (experiments → PostHog EU + Vercel → Hermes → evidence write-back) (`PLAN.md` §3 Workstream B).
**Implication:** Until now the loop ran on Systemix's own landing. Connecta forces the **binding question**: does the landing app embed its own instance, does the DS-repo instance own experiments, or is hypothesis a separate concern from the design-system loop? This is the sharpest unresolved v-next architecture question. → meta-plan §4.4, escalated to DISCUSS as a job-level decision.

## L8 — Most of the embed substrate already exists
**Evidence:** `init` exists (installs globally today); reconciler persists to `.systemix/runs/`; the github-action enforces per-repo budgets; the 3 pipelines are file-based (`gap-analysis-v2.md`).
**Implication:** v-next is **bounded** — a re-shape of delivery + data plane, not a rewrite (criterion C4). The risk is not "can we build it" but "do we keep a central control plane, and how do humans review across instances" (meta-plan §4.2–4.3).

---

## Cross-cutting takeaways for DISCUSS

| Theme | The job it implies |
|---|---|
| L1, L8 | *Install a working Systemix into a client repo I didn't build for it, in one command.* |
| L2, L5 | *Produce a versioned design-system package two different apps can consume.* |
| L3 | *Re-skin a tenant via layered token overrides with light/dark, without touching components.* |
| L4, L7 | *Bind the evidence/hypothesis loop to a per-client, compliance-appropriate data source.* |
| L6 | *Keep the engine generic — the client owns the components.* |
| L2, L3 | *Render an owned, self-updating docs page inside the client's package.* |

These candidate jobs are the DISCUSS wave's input; DISCUSS reconciles them against `docs/product/jobs.yaml` (which currently centers JOB-001 evidence-permanence) and records deltas with a changelog entry.

---

## Open tension flagged for DESIGN
**Central control plane vs fully decentralized.** L6 + L8 say the *engine* embeds cleanly. But L4/L7 (compliance-bound evidence) and HITL-across-instances (meta-plan §4.3) are the forces that *pull a control plane back in*. DESIGN must decide whether v1's Supabase multi-tenancy is **deleted** or **demoted to an optional, opt-in control plane** that aggregates evidence + HITL across a customer's instances. This is the highest-leverage architecture decision in the feature.
