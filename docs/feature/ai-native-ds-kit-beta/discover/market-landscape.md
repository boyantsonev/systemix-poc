---
title: "Market landscape — reference tool, AI-native DS tooling, monetization infra, GTM patterns"
wave: DISCOVER (desk research)
feature: ai-native-ds-kit-beta
date: 2026-10-11
status: evidence brief
method: >
  Web search worked; direct page fetches were mostly blocked by egress policy (only github.com,
  anthropic.com, claude.com and support.claude.com could be opened). Third-party claims are marked 3P;
  anything dated before 2026-04-11 is marked [>6mo] and may be stale. Treat 3P prices as ranges.
---

# Market landscape (as of 2026-10-11)

## 1. The reference tool: Patrick Morgan's *Design Studio*

The App Shell screenshots are **Design Studio**
([`itspatmorgan/design-studio-starter`](https://github.com/itspatmorgan/design-studio-starter)).
It is an MIT, early-beta, "open-source, local prototype sandbox for designers and product managers
who build with coding agents" (Vite + React + TS; runs with Codex, Claude Code or Cursor). The system
ID in the screenshot URLs matches the bundled `src/systems/product/system.ts`, and the *Feedback
Inbox* sample lives in `src/prototypes/samples/feedback-inbox/` (created 2026-09-30). Background:
[Build a Design OS](https://www.unknownarts.co/p/build-a-design-os) and
[Inside My AI Prototyping Environment](https://www.unknownarts.co/p/inside-my-ai-prototyping-environment) (2026).

**Object model**

| Object | On disk | In the UI |
|---|---|---|
| Studio | the repo: `studio.config.json`, a generated `AGENTS.md`, modules (canvas, diagrams, document, documentation, onboarding, prototypes, systems, text, view, contributors) | icon rail: search · Prototypes · Systems · Manual · settings · theme |
| System | `src/systems/<name>/`: `system.ts` (label, status, themeClass, `styling:'tailwind'`, `origin:'shadcn'`, colour modes, libraries), `AGENTS.md`, `context/`, `skills/`, `components/`, `styles/` | Overview with three cards: **Instructions · Toolkit · Where it's used** |
| Instructions | `context/*.md` + `skills/<name>/SKILL.md`, scoped to one system | counts plus the empty state "bring in your product's terminology, workflows, and requirements" |
| Toolkit | shadcn source components, CSS tokens, fonts and icons via libraries | theme pages (token · role · oklch); component pages (purpose · upstream docs · when to use · live examples) |
| Prototype | `src/prototypes/<key>/<id>/` + `meta.json` (`title`, `created`, `order[]`, **`systemId`**, owner) | "System · Product ↗" header plus an Artifacts tree |
| Artifact | typed by file: `app/*.tsx` views, `states/<screen>/*.tsx`, `*.md` docs, `*.excalidraw` canvases (eng handoff, breadboard), `*.mermaid` flows, lo-fi `.tsx` | rendered by type: live React, a doc with an "On this page" TOC, a canvas, a diagram |

Skills come in three layers: platform (check-design-system, configure-studio, maintain-context,
maintain-documentation, manage-modules, setup-contributor), system (setup-design-system,
document-component) and prototype (build-prototype, organize-prototype). Rules worth copying:
"explicit `systemId: null` means no system; missing assignments are invalid"; a system skill applies
only to that system's prototypes.

**What makes it AI-native**
1. **Instructions are part of the design system.** The overview puts context and skills next to,
   and ahead of, components.
2. **Agent contracts are scoped.** Each system has its own `AGENTS.md`, so context doesn't bleed.
3. **States are artifacts.** Empty, No matches, Validation error, Row menu, Delete confirmation and
   so on are exactly the states agents skip and engineers need.
4. **Discovery lives next to the code.** Project context, a Shape Up breadboard, a flow diagram and
   a lo-fi view sit in git, where the agent reads them.
5. **Handoff is an artifact.** It is a canvas of live views.

**What it lacks:** hypotheses, metrics, results and decisions. Assumptions and open questions are
status-less prose, and nothing flows back into the system. That is exactly Systemix's lane.

## 2. AI-native design-system tooling

Columns: **(a)** the DS works as context for agents · **(b)** prototypes are bound to the DS ·
**(c)** there is an evidence / measurement loop · **(d)** it audits or lints.
● yes · ◐ partial · ○ no.

| Tool | Notes (dated) | OSS? | a | b | c | d |
|---|---|---|---|---|---|---|
| Google DESIGN.md / Stitch | Spec open-sourced 2026-04-21; CLI `lint` (11 rules incl. WCAG contrast), `diff`, `export` (Tailwind, DTCG); ~28k★ ([repo](https://github.com/google-labs-code/design.md)) | Spec Apache-2.0 | ● | ● | ○ | ◐ |
| shadcn | CLI v4 (`--preset`, `registry:base` = a whole DS in one payload, skills) [>6mo]; MCP; chat components (2026-06-26); HITL helpers (2026-08-12); **@shadcn/lint**, an agent-first DS linter with per-component contracts (~2026-09) ([lint](https://github.com/shadcn-ui/lint)) | MIT | ● | ◐ | ○ | ● |
| Storybook | MCP addon + manifests (10.3) [>6mo]; skills + agent CLI bindings (10.6, Sep 2026) | MIT | ● | ○ | ○ | ◐ |
| Figma | MCP (`search_design_system`, Code Connect); Make as context; Config 2026 Figma Agent (3P) | Closed | ● | ● | ○ | ○ |
| **Claude Design** (Anthropic) | Launched 2026-04-17 ([Anthropic](https://www.anthropic.com/news/claude-design-anthropic-labs)). The June update added DS import (GitHub, files, local codebase), checks against the DS, an org standard DS, and `/design-sync` + `/design` in Claude Code. Since September it works in any conversation, including Claude Code ([blog](https://claude.com/blog/claude-design-stays-on-brand-for-daily-work)). Standalone claude.ai/design closes 2026-12-14 | Closed | ● | ● | ○ | ◐ |
| v0 | Design Systems 2.0 (2026-06-30): import from GitHub, npm, Storybook or Figma | Closed | ● | ● | ○ | ○ |
| Lovable / Bolt / Magic Patterns / Subframe / Polymet / Builder Fusion | All import or index a DS for generation | Closed | ◐–● | ● | ○ | ○ |
| Onlook | Visual editor for Next + Tailwind (~27k★) | Apache-2.0 | ◐ | ● | ○ | ○ |
| Knapsack | "Intelligent Product Engine", MCP (beta); enterprise only | Closed | ● | ◐ | ○ | ○ |
| Fragments | Mac app: design and review React with your components; **checks code for drift** (also via MCP); paid plans "coming soon" ([site](https://www.usefragments.com/)) | Lib MIT | ● | ◐ | ○ | ● |
| Supernova / zeroheight / Luro / Tokens Studio / Specify | DS docs and data; adoption analytics at most; Specify possibly inactive | Closed | ◐ | ◐ | ◐ (adoption) | ○–◐ |
| OSS agent kits | OpenDesign (~100k★, 151 DESIGN.md packages, 100+ skills); awesome-design-md (~120k★); onsystem/design-system-mcp (lint hook); roast-my-design-system (0–100 score vs 34 public repos); Vercel web-design-guidelines skill | Mostly OSS | ● | ◐ | ○ | ● |

**What the landscape says**
1. **DS-as-context is table stakes, and the format is files:** DESIGN.md, shadcn `registry:base` +
   skills, Storybook manifests, Figma MCP, and Claude Design's `/design-sync` inside Claude Code
   itself.
2. **Free DESIGN.md packs are a mass category** (100k+ stars), far bigger than any commercial DS
   tool. **An OSS kit is the on-ramp, not the moat.**
3. **Linting and drift detection became a commodity in 2026** (@shadcn/lint, DESIGN.md lint,
   onsystem, Fragments). Even audit *scoring* is open source. **Don't build a linter;** compile
   Systemix guardrails *into* these tools.
4. **Nobody closes the loop.** No tool binds a prototype to a falsifiable hypothesis, measures it in
   product analytics, and writes the decision back into the DS with its reason. Column (c) is empty.
   **Systemix's credible lane is decision memory, "the design system that remembers why",** plus an
   audit that scores *evidence coverage*, not only consistency.
5. **Watch:** Claude Design (DS governance inside Claude Code), Fragments (drift; paid plans coming),
   Supernova (adoption analytics).

## 3. AI-native product building blocks and monetization infrastructure

**Table stakes for an AI-native product in 2026:** auth, orgs/teams and RBAC; hybrid billing
(subscription + credits/usage); a live usage meter and credit balance with real-time enforcement
(quotas, rate limits, spend alerts); API keys; a model picker (BYO key); streaming chat showing
reasoning and tool steps; tool-call approval (HITL); citations; feedback tied to traces; onboarding
with empty states; a changelog.

**Already commoditized and free:** shadcn chat components and HITL helpers;
[Vercel AI Elements](https://github.com/vercel/ai-elements) (AI components via a shadcn registry);
Autumn's shadcn pricing-table and checkout components; [nextjs/saas-starter](https://github.com/nextjs/saas-starter)
(auth, teams, Stripe Checkout and Portal, with **no usage/credits**).

| Billing provider | Status | License | Notes |
|---|---|---|---|
| Stripe Billing (+ Metronome, acquired ~2026-01) | LLM-token billing with markup in preview [>6mo] | Closed | meters, credit burndown, top-ups |
| Polar | active | Apache-2.0 | merchant of record; meters tokens, agent runs; seats, credits, trials |
| Autumn | active | Apache-2.0 | `attach` / `check` / `track`; credits, top-ups, limits; ships shadcn UI |
| Flowglad | active | OSS | "zero webhooks"; usage meters, feature gates, credit grants |
| Lago | active | AGPLv3 core | wallets, credit grants, entitlements |
| OpenMeter (→ Kong), Orb (→ Adyen), Stigg | consolidating | mixed | metering engines now owned by incumbents |

**Gap:** there is no popular MIT set of AI-monetization blocks that is themed by *your* DS, wired to
a billing backend, and **instrumented for analytics and experiments**.

**Blocks a kit should ship, each with all of its states:**
- **Monetization:** usage meter, credit balance with low-balance banner, top-up dialog, plan picker /
  pricing table, upgrade paywall (soft, hard, quota-exceeded), invoice list, usage chart by
  model/feature/day, spend limits and alerts, API-key and seat managers.
- **Agent UX:** model picker, tool-step timeline, approval card, citations, feedback (thumbs plus a
  reason), run status, error and retry.
- **Lifecycle:** onboarding checklist, empty states, changelog feed, HITL inbox.

**Licensing call: the UI is MIT.** It is a commodity, and agents regenerate UI anyway. The value is
in the wiring (adapters, entitlement middleware, webhooks, fixtures), the states, and the
**pre-instrumented events and experiment templates** for paywall, plan picker, top-up and
onboarding. Monetization flows are the most valuable prototypes to measure, so this is where the
evidence loop earns its keep.

## 4. GTM patterns: open-source kit + paid audit + implementation

**OSS → paid in 2026**
- **Tailwind is the cautionary tale.** Tailwind Plus sold for $299 (Catalyst $149). In January 2026
  Tailwind Labs laid off 3 of 4 engineers: docs traffic was down ~40% and revenue ~80%, because AI
  bypassed the docs that sold the kits [>6mo]. On 2026-09-09 **Shopify acquired Tailwind Labs**, and
  Tailwind Plus stopped new sales. **Selling copy-paste UI to people whose agents write UI for them
  has stopped working.**
- **shadcn → Vercel/v0:** a free kit as distribution; revenue from v0 and hosting.
- **Supabase / PostHog:** OSS core, revenue from hosting and usage.
- **Cal.com** pulled production code private in April 2026, citing AI-amplified security risk.
- **Makerkit / ShipFast / Supastarter:** one-time licences at $199–649.

**Pattern: open source wins as distribution. Revenue comes from hosting and usage, data, and
services, not from code an agent can regenerate.**

**Audit and service price benchmarks (3P ranges)**

| Offer | Price |
|---|---|
| Automated UX/a11y scanners | $0–500/mo (they catch ~30–40% of WCAG issues) |
| Baymard expert audit (benchmark ceiling) | $7,000–17,500 |
| UX audit / heuristic review with prioritized fixes | $1,500–18,000 |
| Manual WCAG audit | $1,250–2,750 small site · $5k–25k mid-market |
| Design-system audit | rarely priced publicly; fixing the findings costs "several times" the audit |
| DS build (agency) | $15,000–50,000 |
| Fixed-scope project / retainer | $10k–50k project · $3k–20k/mo retainer |
| Productized design subscription | $350–5,000/mo |

**What makes an automated audit credible and shareable**
1. Deterministic measurements, kept separate from the AI-written narrative.
2. A published accuracy rate against human experts.
3. A benchmark against a named public cohort, with medians (e.g. 30–50 public shadcn/Next repos).
4. Evidence per finding: file and line, screenshot, rule cited.
5. Fixes prioritized by impact × effort, with a one-click PR (where free readers convert).
6. A shareable score card, plus re-scans that diff against a saved baseline.
7. Honesty about what automation can't detect.

Lead-magnet precedent: HubSpot Website Grader (10M+ leads, 3P). Teams running free audits report the
bottleneck is moving readers from report to call, not traffic.

## 5. Implications (carried into `diverge/`)

- Make `design/DESIGN.md` **spec-compliant** (Google's DESIGN.md). Put evidence and decisions in
  extension sections, which consumers must preserve, and use its lint, diff and export.
- **Compile guardrails into @shadcn/lint contracts and DESIGN.md lint**, instead of maintaining a
  third linter.
- Be **importable by Claude Design `/design-sync`, v0 DS 2.0 and Design Studio**: be the source of
  truth they consume.
- Ship AI-native blocks as a **free MIT shadcn registry**. Charge for the **wired, instrumented
  integrations, the custom audit report, implementation, and (later) the scheduled loop and its
  benchmark data**.
- **Never make UI code the paid product.**
