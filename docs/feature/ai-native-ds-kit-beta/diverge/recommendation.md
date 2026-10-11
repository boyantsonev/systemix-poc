---
title: "Recommendation — Systemix beta: the design system agent"
wave: DIVERGE (output → handoff to DISCUSS)
feature: ai-native-ds-kit-beta
date: 2026-10-11
status: DRAFT RECOMMENDATION · desk research only · re-score after G1 (5+ interviews, ≥1 commitment)
scoring: diverge/options-raw.md
---

# Recommendation: Systemix beta is the design system agent

## The call

Ship Systemix Beta as **the design system agent for AI-native products**:

1. **An open-source (MIT), agent-ready design system kit** as the on-ramp. Its structure is Vero's
   proven method; its stack is Next + Tailwind v4 + shadcn; it is presented two ways (Design Hub +
   App Shell).
2. **A free, deterministic scorecard** (`systemix audit`) as the lead magnet.
3. **A paid, customized audit report**, automated and then human-reviewed, as the wedge and first
   revenue.
4. **Implementation sprints**, run by the agent through the same loops, with human gates, for cash
   and case studies.

**The evidence loop** ("the design system that remembers why") is the differentiator at every rung,
and it becomes the subscription later. **AI-native SaaS blocks** (billing, usage, credits) ship as
MIT UI. The *wired + instrumented* pack is first built inside a paid implementation, then
productized. **UI code is never the paid product.**

Selected options: **P3 now → P5 later**, with P2 only as a wired pack · **S1** · **K1** ·
**L1+L2**.

## What is free and what is paid (one ladder, one file, one ADR)

| Rung | What | Launch price (to validate) | Delivery |
|---|---|---|---|
| 0 | **Kit**: `design/` spine, token compiler, checkable guardrails, components + AI-native blocks (registry), App Shell + Design Hub, loop skills, CLI | Free (MIT) | npm · shadcn registry · Claude Code plugin |
| 1 | **Scorecard**: `systemix audit`, local and deterministic, with a shareable badge and a baseline to re-scan against | Free | CLI |
| 2 | **Audit Report**: scorecard + agent review of the live product (Playwright) + benchmark percentile + prioritized PR plan + AI-native UX and monetization review, human-reviewed before delivery | **€490**; the first 5 design partners pay €0–290 in exchange for case-study rights | 3 business days, as a private Design Hub page |
| 3 | **Implementation sprint**: fixed scope taken from the report; the agent runs the bounded score loop + design sprints in the client repo; every merge and decision is human-gated | **from €4,500 per 2 weeks** (partner rate for the first 2) | merged PRs · score delta · decision log |
| 4 | **AI SaaS pack**: billing/usage/credits wiring (Stripe meters/credits by default; Polar or Autumn adapters), entitlement middleware, webhooks, fixtures, pre-instrumented events + experiment templates | Bundled into rung 3 during the beta; priced after G3 | private registry |
| 5 | **Scheduled evidence loop + benchmark data**, on a hosted or bring-your-own runner | Post-beta (reopens ADR-006) | subscription |

**Benchmarks behind the numbers** (`discover/market-landscape.md` §4):
- Automated custom reports have no clear comparable; the estimate is $149–499.
- UX and heuristic audits cost $1.5k–18k; Baymard ranges from $7k to $17.5k.
- Agency sprints cost $8k–25k per 2 weeks.
- July's internal ladder had €3–6.5k sprints.

The beta prices sit deliberately low ("agent-leveraged") to buy evidence and case studies. **Raise
them after 3 delivered reports.**

## ICP: frozen for 10 weeks, then validated

**AI-native product teams of 2–20 people** building on Next.js + shadcn with Claude Code or Cursor,
monetized (or about to be) through a subscription plus usage or credits.
- **Buyer:** founder, CTO or design engineer.
- **Secondary:** DS leads and design engineers at Series A–C companies (audit + implementation
  buyers).
- **Channel test:** agencies for white-label reports.

This is a *hypothesis*; G1 interviews (`discover/interview-log.md`) confirm or kill it.

## The product shape

- **Kit, from Vero's method rather than its code** (`discover/reference-instances.md`):
  - DESIGN.md (google-labs spec + evidence extensions, ≤15 KB);
  - the `tokens.css` → `tokens.json` (contrast evidence) → DTCG → DESIGN.md compiler with `--check`;
  - checkable guardrails with a ledger, compiled into **@shadcn/lint** and DESIGN.md lint (no third
    linter);
  - the component doc contract → manifest → `llms.txt`;
  - SCORE.md + `score` with pluggable counters + the bounded score loop with a reviewer gate;
  - loops as data (product · build · score), each with exactly one human `decide` step;
  - context packs and briefs;
  - VERSION and CHANGELOG with rotation;
  - size budgets enforced in CI;
  - a ~1 s pre-commit checker set.
- **AI-native blocks (MIT, all states as artifacts):**
  - **trust:** approval card, tool steps, citations, confidence, provenance, AI rationale,
    dangerous-action confirm;
  - **monetization UI:** usage meter, credit balance, top-up, plan picker, paywall, invoices, usage
    chart, spend limits, API keys, seats;
  - **lifecycle:** onboarding checklist, empty states, changelog, HITL inbox.
- **Two presentations, one source** (`design/presentation-ia.md`):
  - **Design Hub:** floating navbar, static export; it is also how audit reports are delivered.
  - **App Shell:** icon rail → scoped tree → typed canvas; System Overview = Instructions · Toolkit ·
    Where it's used · **Evidence**; a prototype is a bet with About · Screens · States · Discovery ·
    Handoff · Hypothesis · Measure · Decision.
- **The agent = skills + CLI** that run the product loop, the build loop and the score loop on any
  repo. The CLI is cut to its working core: `init` (non-destructive), `audit`,
  `queue list|approve|reject` (the **one** approval path), `experiment`, `loop`, `propose`, `docs`,
  `app`/`hub`, `skills sync`. Figma goes behind `add figma`.
- **Interop instead of competition:**
  - spec-compliant DESIGN.md;
  - importable by Claude Design `/design-sync`, v0 DS import and Design Studio;
  - export as a shadcn `registry:base`;
  - prototypes live **in the product** (behind a flag, instrumented), not in a sandbox.

## "Systemix builds itself": make it true, then say it

The loop on this repo:
1. **feedback:** GitHub issues/discussions, the in-app widget and PostHog;
2. **propose:** `/propose-experiment` writes a HITL card;
3. **approve:** a human, through `systemix queue approve`;
4. **implement:** a Claude Code GitHub Action opens a PR;
5. **measure:** PostHog;
6. **decide:** a human closes the experiment;
7. **write back:** the decision lands in `design/` and `experiments/LEARNINGS.md`;
8. **publish:** an entry in the public loop log.

**Preconditions:**
- set the engine secret;
- build the single approval path and the build stage;
- one real cycle merged in public.

**Until then, marketing must not claim it** (honesty guardrail). After that, every cycle is a
build-in-public post: the content engine and the proof at once.

## Why not the alternatives

- **P2 as proposed (sell the blocks):**
  - Tailwind Labs lost ~80% of its revenue to AI and was sold in September 2026.
  - Chat, billing and pricing UI is already free (shadcn, AI Elements, Autumn).
  - Only the wiring + instrumentation + experiment templates are defensible, and implementation
    already pays for building them.
- **P1:** the free DESIGN.md/kit category has 100k★ projects, so stars alone won't fund the build.
- **P4:** cash without a compounding asset or distribution.
- **P5 now:** no demand signal yet, and it needs a hosted decision. Revisit at G3.
- **S2:** the cheapest UI, but it couples us to a weeks-old project. Keep the file layout compatible
  and revisit if Design Studio takes off.
- **K2:** licence entanglement and build-time drift. Keep Tamagui as a token emitter only.

## Review triggers (what would change this)

| Trigger | Response |
|---|---|
| G1: ≤1 of 5 interviewees can name a recent agent-UI drift incident | Revisit the ICP (try DS leads at Series B–C) before building more |
| No paid report by **week 8** | Revisit offer and price, not the product; consider expert-audit pricing ($3k+) |
| ≥3 unprompted asks for the billing/usage pack | Promote the wired pack to a standalone paid product |
| Claude Design or Fragments ships measurement write-back | Double down on audit + implementation; position the kit as the source they import |
| Founder capacity: >30% of time on surfaces before week 6 | Cut the App Shell to the first slice; ship the Hub + audit first |

## Risks

- **Solo capacity:** kit + app + audit + service is four things. Mitigations: strict sequencing, a
  manual-first (concierge) audit before automating it, and deleting about half the CLI.
- **Thrash:** freeze the line, ICP and ladder in ADR-023 with external review triggers.
- **Credibility:**
  - don't claim "builds itself" before a public cycle;
  - publish the audit method;
  - report precision against a hand-labelled sample.
- **Case-study permissions:** Vero is a healthcare product; the second instance is a confidential
  client deliverable. Ask before naming either.
- **Licence provenance:** move patterns, not files, out of private repos.

## Handoff to DISCUSS (user stories to write)

1. *Init into an existing Next/shadcn repo* without losing anything, and see the System Overview in
   under 10 minutes.
2. *Run the scorecard*, get a shareable badge, and re-scan against a baseline.
3. *Buy a report*: checkout, report delivered as a private Hub page, a call booked.
4. *Approve or reject a card* in the Inbox. The effect is applied through the one approval path.
5. *Run an implementation sprint*: backlog from the report, the bounded loop, a reviewer gate,
   merged PRs, the score delta.
6. *Turn a prototype into a bet*: hypothesis, measure, decision, write-back.
7. *Install the AI-native blocks* via `shadcn add`, already themed, with all states.
