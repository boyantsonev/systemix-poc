---
title: "Systemix Beta — the design system agent (plan)"
feature: ai-native-ds-kit-beta
date: 2026-10-11
status: >
  DRAFT PLAN. DISCOVER desk research is complete; the G1 interview gate is OPEN (0/5).
  DIVERGE has a draft recommendation. DISCUSS / DESIGN / DELIVER come next.
  Nothing here supersedes an ADR until ADR-023 is accepted.
owner: Boyan Tsonev
---

# Systemix Beta: the design system agent

> **One line (proposed, to freeze for 10 weeks):** *Systemix is the design system agent for
> AI-native products. It sets up an open-source design system your agents build with, audits what
> they ship, and improves it in loops that remember why.*

This plan comes from a parallel analysis of six inputs:
- this repo's surfaces;
- its engine;
- its strategy history;
- Vero (the most developed design system built with the Systemix method);
- a shadcn client prototype and Vero's desktop consumer app;
- the market, including the reference tool behind the App Shell idea, Patrick Morgan's
  [Design Studio](https://github.com/itspatmorgan/design-studio-starter).

| Read next | What's in it |
|---|---|
| [`discover/current-state.md`](discover/current-state.md) | What Systemix is, does, does well; what to improve; the trim list |
| [`discover/strategy-history.md`](discover/strategy-history.md) | 15+ repositionings, ADR status, thrash, docs hygiene |
| [`discover/reference-instances.md`](discover/reference-instances.md) | What Vero and the other builds teach the kit (public-safe summary) |
| [`discover/market-landscape.md`](discover/market-landscape.md) | Design Studio teardown, AI-native DS tooling, billing infra, GTM patterns |
| [`discover/interview-log.md`](discover/interview-log.md) | The G1 gate: who to talk to, the guide, the hypotheses |
| [`diverge/options-raw.md`](diverge/options-raw.md) · [`diverge/recommendation.md`](diverge/recommendation.md) | Options scored; the recommended direction |
| [`design/presentation-ia.md`](design/presentation-ia.md) | Design Hub + App Shell: one source, two layouts (IA draft) |
| [`wave-decisions.md`](wave-decisions.md) | The decision log for this feature |

---

## 0. TL;DR

1. **Where Systemix stands.** It has a real, tested core: a file-based experiment/loop library
   with 237 Jest tests and 90 Vitest tests passing. Around it sit:
   - about 50% CLI cruft;
   - a broken human-approval layer (two queues, five close paths, "approve" does nothing outside
     the deferred Next app);
   - a few dangerous bugs: re-running `init` wipes data, and `npx systemix` runs an **unrelated
     third-party npm package**.

   Traction is ~zero: 1 star, €0, 0 interviews, ~100 visitors a month. "Builds itself" isn't true
   yet; the engine cron has never generated anything.
2. **The method already works, in Vero, without the tooling.**
   - A computed DS score went from 77 to 88 under a bounded, reviewer-gated loop.
   - Dozens of DS releases in two months.
   - Loops modelled as data, with one human `decide` step each.
   - Checkable guardrails with a ledger.
   - A registry-driven Design Hub with the floating navbar.

   Vero uses Systemix *conventions*, not the Systemix CLI. **Package the method that worked.**
3. **The market says:**
   - DS-as-context is table stakes (DESIGN.md, shadcn registry/skills, Claude Design
     `/design-sync`).
   - Linting and drift checks became free in 2026 (@shadcn/lint, DESIGN.md lint).
   - Free DESIGN.md kits have 100k★.
   - **Nobody closes the loop** from prototype → measurement → decision written back into the DS.
     That is the lane: **decision memory**.
4. **Tailwind Labs' 2026 collapse and sale** settles the paid question: **never sell UI code.** Sell
   the audit, the implementation, the wiring and instrumentation, and later the scheduled loop.
5. **The beta:**
   - an **MIT AI-native DS kit** (on-ramp);
   - a free **scorecard** (lead magnet);
   - a paid, **customized audit report** (wedge, about €490);
   - **implementation sprints** run by the agent with human gates (from about €4.5k per 2 weeks);
   - later, the **scheduled evidence loop** (subscription).
6. **Two presentations, one source:**
   - the **Design Hub** (floating navbar; static; also how audit reports are delivered);
   - the **App Shell** (rail → scoped tree → canvas, borrowed from Design Studio, plus an
     **Evidence** card and prototypes-as-bets).

   It is one app (`packages/app`) with two layouts: consolidation, not a new surface.
7. **Stack:** Next.js + Tailwind v4 + shadcn registry for the reference kit. Tamagui stays a token
   emitter only.
8. **AI-native blocks:**
   - **trust:** approval, tool steps, citations, confidence, provenance;
   - **monetization:** usage meter, credits, top-up, plan picker, paywall, invoices, API keys;
   - all states included;
   - the UI is MIT; the wired + instrumented pack is first built inside a paid implementation.
9. **Sequencing beats scope.** In order:
   - week 1: safety fixes + a freeze ADR;
   - weeks 1–3: interviews + concierge audits (sell before you build);
   - weeks 2–6: kit core + scorecard;
   - weeks 4–8: Hub + App Shell first slice;
   - week 9: OSS public beta;
   - weeks 6–12: report automation + the first sprint;
   - January: Show HN with case studies.
10. **Next concrete step** (nWave / `/nw-buddy`): finish DISCOVER. Run 5+ real interviews and get 1
    commitment, ideally a pre-paid audit. Run the Phase 0 fixes in parallel; they are no-regret.

---

## 1. Where Systemix is today

**What it is.** Four one-liners ship at once:
- README: "keeps your design system from rotting".
- Docs index: "runs little experiments on your website".
- CLAUDE.md: "evidence / self-training layer".
- Latest commit: "AI-native design-system ENGINE".

In practice it is a Claude Code toolkit made of:
- a CLI (`@getsystemix/cli`) that vendors a thin `design/` template, an `experiments/` loop, skills
  and a CLAUDE.md block;
- a file-backed MCP server;
- a local viewer app (`systemix app`, unpublished);
- the marketing/docs site on Next.js.

**What works (keep):**
- the file-based loop core (`experiment`, `goal`, `loop`, `propose`) with 237 + 90 passing tests;
- `docs` (manifest); `skills sync`; the app as a read-only viewer;
- the autonomy concept (ghost at init) and the write-policy rail;
- the honesty guardrail (marketing may claim the vision; the product UI must not fabricate it);
- ADRs as a habit; repo-as-product.

**What's theater:**
- the autonomy setting (never enforced);
- "Hermes self-training" (no implementation);
- `sync`, `watch`, `token-profile` and `doctor` (Figma-only checks);
- the MCP "score 100, clean" over zero tokens;
- the weekly engine (never generated: no secret);
- the PostHog loop (no conclusive learning in 3 months; ~100 visitors a month can't resolve an A/B).

**The biggest surface problem: there is no single product surface.** The design system is spread
across `/design`, `/contract/*`, `/docs/components` and `/skills` (three chrome treatments), plus an
unpublished local app that re-implements the same readers with diverging semantics. A new user
running `npx` reaches none of it. About 5.5k LOC (29% of `src/`) and 19 of 29 API routes are dead.

**What's broken or dangerous (fix first):**
- `npx systemix` / `npm i -g systemix` point at an unrelated publisher's package (~190 references,
  incl. shipped CLI/app/skill/docs strings).
- Local API routes need origin/CSRF hardening before anyone else runs the dev site (tracked
  privately).
- `init --reconfigure` wipes LEARNINGS and `design/`.
- Experiment ids are not path-safe.
- There are two queue files and five close paths, with no status or decision validation.
- `@getsystemix/app` is referenced but never published, and the published CLI lags its source.
- CLAUDE.md (v5) contradicts the code (v6). Its `.systemix → design/.state` TODO would undo the
  current architecture.
- No CI runs the tests.

**Trim.** About half the CLI, 19 of 27 MCP tools (plus 947 dead lines), `packages/mcp-proxy`, the
Figma bundle from the default install, ~30 of 39 skills to optional or archive, and stale or private
docs. See [`discover/current-state.md`](discover/current-state.md) §5 for the full list, including
site routes and dependencies.

## 2. What the reference builds teach

From [`discover/reference-instances.md`](discover/reference-instances.md):

- **Vero proves the method:**
  - the score loop (frozen burn-downs, human caps, calibrated weights, bounded iterations, a
    fresh-context reviewer that corrected 9 of 12 iterations);
  - loops as data (product · build · market · score), each with exactly one human `decide`;
  - checkable guardrails with a ratchet ledger;
  - token/doc contracts (contrast evidence, DTCG, generated DESIGN.md block, manifest, `llms.txt`);
  - the registry-driven Design Hub (floating navbar, Archive, Human ↔ Agent DESIGN.md);
  - frames with a parity eval.

  **Its warnings:**
  - files without size budgets (142 KB CHANGELOG, 81 KB guardrails);
  - hand-typed counts that drift;
  - branches reserving versions;
  - a process that outran the people who gate it;
  - code that sits on a commercially licensed starter, so **move patterns, not files**.
- **The shadcn client prototype** has the best AI-trust components (rationale with a typed override,
  provenance, confidence interval, dangerous-action confirm) and runtime theme axes with a live
  contrast readout. Its contract and code drifted within 48 hours: the audit has real work on day
  one.
- **Vero's desktop consumer app** shows how drift hides: type holes, an ambiguous public surface,
  dangling radius tokens, version skew. It contains working prototypes of the paid audit
  (parity + vocabulary ratchets) and the only serious AI-native **usage/credits/entitlements model**
  (seed for the paid pack).
- **AI-Native Path** (the free 15-lesson course) teaches the Systemix loop word for word and never
  mentions Systemix: a ready top-of-funnel.

## 3. What the market says

From [`discover/market-landscape.md`](discover/market-landscape.md):

- **The App Shell reference** is Patrick Morgan's MIT *Design Studio*:
  - a System is Instructions (context + skills) + Toolkit + Where it's used;
  - a Prototype is typed file artifacts: App, States, Discovery (breadboard, flow, lo-fi, context),
    Handoff;
  - it has **no evidence layer**.
- **Commoditized:** DS-as-context (DESIGN.md, shadcn registry/skills, Storybook MCP, Figma MCP,
  **Claude Design `/design-sync` inside Claude Code**), linting and drift (@shadcn/lint, DESIGN.md
  lint, Fragments), chat and HITL UI (shadcn, AI Elements), billing UI (Autumn shadcn), SaaS
  skeletons (nextjs/saas-starter).
- **Empty:** binding a prototype to a falsifiable hypothesis, measuring it, and writing the decision
  back into the DS with its reason. Also missing: an MIT AI-monetization block set themed by your DS
  *and instrumented for experiments*.
- **GTM:**
  - open source wins as distribution;
  - revenue comes from hosting, usage, data and services;
  - audits are a proven paid and lead-magnet format: $1.5k–18k expert UX audits; a credible
    automated report needs deterministic scores, a public benchmark cohort, per-finding evidence and
    prioritized PRs.

## 4. The beta product

### 4.1 Who it's for (frozen for 10 weeks, validated by G1)

**AI-native product teams of 2–20 people** building on Next.js + shadcn with Claude Code or Cursor,
monetized (or about to be) through a subscription plus usage or credits. The buyer is the founder,
CTO or design engineer. Secondary: DS leads and design engineers at Series A–C companies.

### 4.2 The kit (MIT): Vero's method on an MIT-clean stack

`npx @getsystemix/cli init` in an existing Next/shadcn repo is **non-destructive**, and the System
Overview appears in under 10 minutes. It creates:

```
design/            DESIGN.md (google-labs spec + evidence extensions, ≤15 KB) · tokens.css (canonical oklch)
                   → tokens.json (+contrast evidence) · tokens.dtcg.json · guardrails.mdx (checkable, ≤25 KB)
                   + guardrails/evidence/ · context/ (packs ≤90 lines) · components/ (doc contract + a11y)
                   → manifest.json + llms.txt · SCORE.md · VERSION · CHANGELOG.md (rotated) · decisions/
                   · loops/ (product · build · score: ITERATION/BACKLOG/LOG) · hub.json
prototypes/<slug>/ prototype.yaml (systemId · owner · status · routes · artifacts · hypothesis · metric)
                   about.md · handoff.md · discovery/ (context · breadboard · flow · lo-fi)
experiments/       evidence: <id>.mdx · LEARNINGS.md · goals/
.systemix/         queue.json, the ONE human-in-the-loop queue
.claude/skills/    the loop skills (also shipped as a Claude Code plugin)
```

**What it ships with:**
- **Checks:** a ~1 s pre-commit checker set and size budgets that fail CI.
- **Guardrails compiled into @shadcn/lint and DESIGN.md lint**, so we don't maintain a third linter.
- **AI-native blocks (shadcn registry, all states as artifacts):**
  - **trust:** approval card, tool steps, citations, confidence, provenance, AI rationale,
    dangerous-action confirm;
  - **monetization UI:** usage meter, credit balance, top-up, plan picker, paywall, invoices, usage
    chart, spend limits, API keys, seats;
  - **lifecycle:** onboarding checklist, empty states, changelog, HITL inbox.
- **Interop:**
  - spec-compliant DESIGN.md;
  - importable by Claude Design `/design-sync`, v0 DS import and Design Studio;
  - exportable as a shadcn `registry:base`;
  - prototypes live **in your product** (behind a flag, instrumented), not in a sandbox.

### 4.3 Two presentations, one source

See [`design/presentation-ia.md`](design/presentation-ia.md).

- **Design Hub** (`systemix hub build` → static): a floating navbar (Vero's) and a registry-driven
  front door → DESIGN.md (Human ↔ Agent) → tokens → generated component gallery → prototypes →
  Archive → public evidence. It is also the **delivery format for paid audit reports**.
- **App Shell** (`systemix app`, local):
  - **rail:** Inbox · Systems · Prototypes · Evidence · Docs;
  - **System Overview cards:** Instructions · Toolkit · Where it's used · **Evidence**;
  - **component pages** carry the decisions and guardrails that touched them;
  - **prototype tree:** About · Hypothesis · App · States · Discovery · Handoff · **Measure** ·
    **Decision**;
  - **canvas:** live routes, docs, canvases, flows, compare mode, a state matrix.

### 4.4 The agent: skills + a slim CLI that run three loops

- **Product loop:** goal → evals → design → shape → test → score → validate → learn. The unit is the
  prototype-as-bet.
- **Build loop:** plan → hub → system → code → test → review → ship → measure (design sprints: Frame
  → Build → Systematize).
- **Score loop:** measure → take the first open backlog item → act → checks → fresh-context reviewer
  → log. Bounded, and it never edits weights, baselines or guardrails.
- **Every loop has exactly one human `decide` step.** Autonomy starts at ghost. Self-modification of
  skills and guardrails is always HITL.
- **The CLI core (9 commands):**
  - `init` (non-destructive) · `audit` (score; replaces drift/doctor/design);
  - `queue list|approve|reject` (**the one approval path**, which applies effects and enforces the
    autonomy policy);
  - `experiment` · `loop` · `propose` · `docs` · `app`/`hub` · `skills sync`;
  - Figma behind `add figma`.

## 5. Business model and GTM

### 5.1 The ladder (one file, one ADR; prices are launch hypotheses)

| Rung | Offer | Price | Why it exists |
|---|---|---|---|
| 0 | Kit + CLI + App Shell + Hub + skills | Free (MIT) | Distribution; the on-ramp |
| 1 | `systemix audit` scorecard: deterministic, a badge, a baseline | Free | Lead magnet; shareable |
| 2 | **Audit Report**: custom, benchmarked, human-reviewed, with a prioritized PR plan and an AI-native UX + monetization review | **€490** (first 5: €0–290 for case-study rights) | The wedge; automated + customized = scalable revenue |
| 3 | **Implementation sprint**: fixed scope from the report; agent-run; human-gated | **from €4,500 per 2 weeks** | Cash, case studies, and where the paid pack gets built |
| 4 | AI SaaS pack: wired billing/usage/credits + entitlements + instrumentation + experiment templates | Bundled into rung 3 in the beta | Productize after G3 if ≥3 ask |
| 5 | Scheduled evidence loop + benchmark data | Post-beta subscription | The long-term moat (reopens ADR-006) |

Checkout must be real, not `mailto:`: use the merchant-of-record decision already taken
(LemonSqueezy) or Polar. **Never sell UI code.**

### 5.2 The audit report: what's in it and why it's credible

- **Deterministic score**, in the style of Vero's `score` with pluggable counters for Next/shadcn:
  - tokens (hard-coded values, dangling `var()`s, contrast pairs);
  - components (variant sprawl vs docs, duplicates, a declared public surface);
  - architecture (import tiers);
  - enforcement (checkable guardrails, ratchets);
  - a11y (contrast, targets, focus);
  - governance (DESIGN.md validity, decisions, versioning).
- **What only Systemix scores:**
  - **agent-readiness:** context packs, skills, manifest, `llms.txt`, DESIGN.md lint;
  - **AI-native UX:** trust primitives present; streaming, empty, error and approval states;
  - **monetization UX:** usage visibility, paywall and top-up states;
  - **evidence coverage:** the share of DS rules and recent UI changes linked to a measured
    decision; decision freshness; analytics events per state.
- **Agent review of the live product:** Playwright walk-throughs, state-matrix gaps, parity checks.
  The narrative is kept separate from the deterministic numbers.
- **Credibility:**
  - a published method;
  - a **benchmark cohort of 30–50 public shadcn/Next repos** (percentiles);
  - precision reported against a hand-labelled sample;
  - per-finding evidence (file:line, screenshot, rule);
  - fixes prioritized by impact × effort with one-click PRs;
  - an honest "what automation can't see".
- **Delivered as** a private Design Hub page plus a 30-minute walkthrough call, which converts to
  rung 3.

### 5.3 Funnel and channels

- **OSS release** on GitHub, npm, the shadcn registry and the Claude Code plugin.
- **The free scorecard** with a shareable badge (the HubSpot Grader pattern).
- **AI-Native Path → Systemix:** add the missing CTA to the course.
- **Build in public:** the public loop log, one post per real self-building cycle.
- **Case studies:** Systemix auditing itself; Vero, with permission.
- **Founder-led outreach:** design partners first; then communities (Claude Code, shadcn, Design
  Systems Slack); then Show HN and Product Hunt in January with case studies.

### 5.4 "Systemix builds itself": make it true, then say it

The loop:
1. Feedback (issues, discussions, in-app widget, PostHog).
2. `/propose-experiment` writes a card.
3. `systemix queue approve`.
4. A Claude Code GitHub Action opens a PR.
5. Measure.
6. A human closes.
7. Write-back into `design/` + LEARNINGS.
8. Public loop log entry.

Preconditions: the engine secret is set, the single approval path and build stage exist, and **one
real public cycle is merged**. Marketing does not claim it before that.

## 6. Roadmap: 12 weeks, gated (starts Mon 2026-10-12)

| Phase | Weeks | Dates | Deliverables | Exit |
|---|---|---|---|---|
| **0 · Safety + focus** | 1 | Oct 12–18 | See the list below | Fixes merged; ADR-023 accepted |
| **1 · Sell before build** | 1–3 | Oct 12–Nov 1 | 8 interviews booked → 5 held; **3 concierge audits** (Vero's score method by hand + agent) on systemix-poc, a public shadcn repo and one partner; offer 1–3 pre-paid reports | **G1** (Nov 1): ≥5 interviews, ≥1 commitment |
| **2 · Kit core + scorecard** | 2–6 | Oct 19–Nov 22 | See the list below | `init` → scorecard → badge on 3 repos in <10 min |
| **3 · Hub + App Shell slice** | 4–8 | Nov 2–Dec 6 | `systemix hub build` (floating navbar, Archive, Human ↔ Agent); App Shell first slice (Overview with 4 cards, a component page, one prototype-as-bet); Systemix's site becomes its own Design Hub | Report deliverable as a Hub page |
| **4 · Report v1 + checkout** | 5–8 | Nov 9–Dec 6 | Report generator (benchmarks, PR plan, AI-native + monetization review); real checkout; method page; 30-repo benchmark cohort | **G2** (Dec 6): ≥3 paid reports delivered; ≥1 public self-building cycle merged |
| **5 · OSS public beta** | 9 | Dec 7–13 | Release 0.3 beta; docs (Diátaxis); `examples/`; announce to partners and communities (soft launch) | Install → scorecard works for strangers |
| **6 · Implementation + AI SaaS pack** | 6–12 | Nov 16–Jan 3 | First 1–2 implementation sprints; build the wired billing/usage/credits pack *inside* them (Vero's entitlement model, ported); MIT UI blocks to the registry | **G3** (Jan 3): ≥1 sprint sold; a case study written |
| **7 · Launch** | 13+ | Jan 2027 | Show HN, Product Hunt, case studies (self-audit, Vero if allowed), public loop log | Review the freeze ADR with evidence |

**Phase 0 (safety + focus):**
- `npx systemix` → `npx @getsystemix/cli` everywhere (security).
- `init` made non-destructive; path-safe experiment ids.
- Harden local API routes (origin/CSRF, narrow write scopes; details tracked privately).
- Publish `@getsystemix/app`, or remove the references.
- PR CI running Jest + Vitest.
- Set the engine secret, or rename the cron.
- **ADR-023** (freeze the line, ICP and ladder for 10 weeks).
- Rewrite CLAUDE.md to the truth.
- Archive stale docs; remove private material (`research/`, `content/linkedin/`, `sessions/`).
- Add a `BACKLOG.md`.

**Phase 2 (kit core + scorecard):**
- `design/` spine v2 (from Vero's method, with size budgets).
- The token compiler (`--check`).
- Guardrails → @shadcn/lint + DESIGN.md lint.
- Doc contract → manifest + `llms.txt`.
- `systemix audit` (score with pluggable counters, badge, baseline).
- **`systemix queue`** (the one approval path).
- The CLI trimmed to its 9-command core.
- The Figma bundle moved behind `add figma`.

**Metrics:**
- **Business:** paid reports (G2 ≥3), sprints sold (G3 ≥1), revenue.
- **Funnel:** scorecards run (opt-in, anonymous count only; the DS package stays analytics-free
  under ADR-009), stars, npm downloads, `init`s.
- **Product:** time-to-first-Overview (<10 min), score delta per engagement, public self-building
  cycles per month.
- **Honesty:** zero claims on the site that the product can't show.

## 7. Decisions needed from Boyan (blocking)

1. **Freeze** the one-liner, ICP and ladder for 10 weeks in ADR-023, with external review triggers?
2. **Kit-first layout:** make `design/` required again. This reverses v6's "DS optional", which was
   only ever recorded in `layout.js`. It also means dropping CLAUDE.md's `.systemix → design/.state`
   migration TODO.
3. **Reference stack:** Next + Tailwind v4 + shadcn, with Tamagui as a token emitter only?
4. **Licence boundary:** an MIT monorepo, plus a private repo (or `ee/`) for the report generator
   internals and the wired pack?
5. **Launch prices and checkout:** Report €490 / Sprint from €4.5k; LemonSqueezy (decided earlier)
   or Polar?
6. **Case studies:** these docs name Vero as the reference instance, using method-level facts only
   (no private code, numbers from private evals, or people). Is that OK to keep public, and may
   Vero become a published case study? The client prototype stays unnamed (patterns only).
7. **Hosted:** keep ADR-006 (nothing hosted in the beta except static report pages and checkout)?
8. **App Shell:** evolve `packages/app` (recommended), or build on Design Studio?

## 8. Risks

- **Solo capacity:** four workstreams. Mitigations:
  - strict phases;
  - a manual-first audit before automating it;
  - deleting about half the CLI;
  - if more than 30% of time goes to surfaces before week 6, cut the App Shell to its first slice.
- **Thrash:** ADR-023, plus only *external* triggers can reopen it.
- **Credibility:**
  - no "builds itself" claim before a public cycle;
  - a published audit method;
  - benchmarks and precision reported.
- **Platform overlap:** Claude Design is moving DS governance into Claude Code. Be the *source* it
  imports, and own measurement and decision memory, which it doesn't do.
- **Provenance:** move patterns, not files, out of private repos.

## 9. Where this lives in nWave

`docs/feature/ai-native-ds-kit-beta/` uses the multi-file wave layout. Status by wave:

| Wave | Status | Artifacts |
|---|---|---|
| DISCOVER | **in progress** (desk research done, G1 open) | `discover/*` |
| DIVERGE | **draft** | `diverge/options-raw.md`, `diverge/recommendation.md` |
| DISCUSS | next, after G1 | user stories, journeys, outcome KPIs |
| DESIGN | early IA draft only | `design/presentation-ia.md`; ADR-023/024 and `design/wave-decisions.md` pending |

A local `/nw-buddy` will report DISCOVER as in progress and point to
**`/nw-discover ai-native-ds-kit-beta`**: run the interviews and fill
[`discover/interview-log.md`](discover/interview-log.md). That is the right next step. Phase 0
fixes can run in parallel because they are no-regret.
