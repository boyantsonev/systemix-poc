---
title: "Strategy history — pivots, ADR status, thrash"
wave: DISCOVER (desk research)
feature: ai-native-ds-kit-beta
date: 2026-10-11
status: evidence brief (complete) · G1 interview gate still OPEN
sources: README.md, CLAUDE.md, docs/**, decisions/ADR.md, docs/product/jobs.yaml, experiments/, git log (332 commits on main, last 2026-07-12), GitHub / npm / Actions metadata
---

# Strategy history — what Systemix has already tried

> Desk research for the beta rethink. The v5 plan file and memory notes referenced by `CLAUDE.md`
> live on the founder's laptop and were not available; v5/v6/v7 were reconstructed from
> ADR-019, the commit bodies of `d486a15`, `a211d35`, `037fe66`, `da0ef88`, and
> `packages/cli/src/lib/layout.js`.

## TL;DR

- **The one-liner changed 15+ times in 15 weeks** (one contributor, 2026-03-28 → 07-12). It flipped
  between *design-system-first* and *loop-first* at least seven times. Four different one-liners
  ship side by side today (README, docs index, CLAUDE.md, the latest commit message).
- **Traction evidence is near zero:** 1 GitHub star, 0 forks, 0 customer interviews (the nWave G1
  gate was never passed), €0 revenue (every checkout is a `mailto:`), 0 published LinkedIn posts,
  ~100 unique visitors and 1 install-copy in the 30 days to 2026-10-10.
- **"Systemix builds itself" is not true yet.** The weekly propose engine "succeeded" 13 times but
  skipped generation every time (no `ANTHROPIC_API_KEY`). The build stage is designed, not built.
  No new loop decision since 07-10. The dogfood experiment is two months past its review-by date.
- **The rethink lines up with the only grounded evidence.** The only externally grounded jobs
  (JOB-002/003/004/007, from a real client build) and the client feedback quoted in PR #95 are all
  *design-system kit* jobs, not *loop* jobs.

## 1. Pivot timeline (2026)

| Date | Framing | Trigger | What changed |
|---|---|---|---|
| 03-28→04-06 | Interactive DS workspace; SSOT between Figma and code; DTCG contract + GIGO score + MCP | Figma↔code drift in an early kit | ADR-001 (canvas + collapsible sidebar), ADR-002 (OKLCH ΔE), ADR-005 (CLI-first) |
| 04-23→27 | "Quality Score" → "memory layer" → MDX contracts | Spikes 1–3 | PostHog write-back spike "full loop verified" |
| 04-28 | **Evidence layer** for design systems | DESIGN.md / Knapsack / Fragments commoditising DS-as-context and drift | ICP = AI-forward design engineers; adopt DESIGN.md (`docs/discover/systemix-beta-brief.md`) |
| 05-05→07 | Agentic-loop thesis | ICP decided by founder with 0 interviews | ICP → pre-PMF founder; HITL queue chosen over Score + git notes |
| 06-02 | "Software-in-a-service": embedded instance per client | A client needed to own its data | ADR-006..009 · JOB-002..007 |
| 06-08 | Embeddable engine running a living DS (Config / System / Atlas) | Unify framings | ADR-010..012 (Fumadocs; template shadcn-native) |
| 06-10 | "An engine you give goals to"; DS demoted to "a record" | Zero-base research | Goal/hypothesis hierarchy |
| 06-13 | Cowork cockpit; repo-as-product; `/systemix next` | nWave analysis | ADR-013..018 |
| 06-17 | **v5**: "self-training layer"; `design/` is the spine | Leaving alpha | write-policy rail; Claude-only engine (ADR-019) |
| 06-17/18 | **v6** (same day): "the loop is the core, DS optional" | Correction | `experiments/` folder; `init` asks scaffold / existing / none |
| 06-18→20 | **v7** clean slate | First UI slice rejected | ADR-020..022 (signal setup, 3D Home, unified shadcn shell) |
| 07-04 | Ralph runner + daily crons | Get experiments to decision-ready | `systemix loop` |
| 07-05/06 | "AI-native DS + consultancy ladder"; `/for/<persona>` pages | Experiment #2 | five personas |
| 07-07/08 | Three framings at once: productization ladder (`/audit`, `/kit`); "runs little experiments… the loop is the whole product"; "keeps your DS from rotting" | ~6 visitors / 30 days | audit + kit pages, readiness/jtbd audit skills, propose stage |
| 07-09 | "DS context engine", €99 / €249 | "Reads as two products" | meta-loop diagram removed the same day |
| 07-10→12 | Honest-claims fix, first npm publish; "AI-native design-system ENGINE" | Growth audit | `@getsystemix/cli@0.2.0`; per-instance app verified on a real instance |
| 07-13→10-11 | No commits on `main`; crons keep running | — | — |

## 2. ADR status (all ADRs are still marked DECIDED)

| Bucket | ADRs |
|---|---|
| **Keep** (the rethink depends on them) | 002 OKLCH/ΔE · 007 files as state · 009 the loop binds to the consuming app (DS package carries no analytics) · 014 no agent personas · 017 repo-as-product · 018 buddy concierge · 019 engine = Claude Code · 020 honest "not configured" states · the write-policy rail (self-modification always HITL) |
| **Superseded in practice, never marked** | 001 (→022) · 004 (Figma deferred) · 008 (init questions changed) · 010 (Atlas deleted) · 012 (client template dormant) · 013/015 (amended by 019) · 016 (Cowork cockpit never built) |
| **The rethink supersedes or must amend** | 010, 016, 021 (presentation = Design Hub + App Shell) · 008 (kit `init`) · the v6 "loop core, DS optional" decision (lives only in `layout.js`) · 011 (`packages/app` is a Vite SPA, not Fumadocs) · 006 (if audit / usage / credits run hosted) · 012 (Tamagui vs shadcn reference) · the € ladder in `src/lib/landing/content.ts` |

## 3. The current canonical model (code as of 07-12)

- **Objects** (three doors — skills, CLI, MCP — read and write the same files):
  `experiments/<id>.mdx`, `experiments/LEARNINGS.md`, `experiments/goals/*.mdx`,
  `.systemix/queue.json` (HITL cards), `systemix.config.yaml` (thresholds 0.85 / 0.55),
  optional `design/` (DESIGN.md, guardrails.mdx, tokens.css). 45 skills in 3 pipelines
  (6 duplicated), 22 CLI command modules, ~27 MCP tools.
- **Autonomy dial**: ghost / assisted / autonomous; every instance starts at ghost. Approving a
  hypothesis, merging a PR and closing an experiment are always human. Self-modification of
  skills / guardrails / workflows is always HITL (`src/lib/contract/write-policy.ts`).
- **Packaging**: CLAUDE.md says *free kit → paid scheduled loop → team*. The live site shows
  €0 / Learning Kit €99 / Readiness Audit €249 / Consultancy custom — all fulfilled by `mailto:`.
  The decided principle "sell convenience and service, not code-DRM" (merchant of record:
  LemonSqueezy) is not built.
- **Pricing changed five times in three days** (07-07 → 07-09): $149–249 report / $249–299 kit /
  €3–6.5k sprint → $149 / $299 / $2,500+ → $249 kit + free audit → €99 / €249 / custom.
- **ICPs**: design-engineer platform team (secondary) · pre-PMF vibe-coding founder
  ("primary-candidate-unvalidated", 0 interviews) · ops director · later "agent-shipping founder"
  and five personas.
- **JTBD** (`docs/product/jobs.yaml` v1.2.0): JOB-001 evidence permanence has the top ODI score but
  only secondary validation. **JOB-002 (install into a repo not built for Systemix), JOB-003
  (versioned DS package), JOB-004 (reskin via layered tokens), JOB-007 (owned, self-updating docs)
  are the only jobs grounded in a real build — all four are kit jobs.**

## 4. GTM: proposed vs executed

| Proposed | Executed |
|---|---|
| Beta brief (04-28): 5-buyer copy test; blog post + DESIGN.md evidence spec; no paid distribution until validated | Not done; blog drafted, archived, deleted 07-09 |
| Agentic thesis: 5 founder interviews (G1) | 0 interviews ("NOT PASSED") |
| ADR-017: public MIT repo, stars as signal | Public; LICENSE + README added 07-10; 1 star |
| LinkedIn: 7 posts | 7 drafts, none published |
| Productization: `/audit` + `/kit`, ladder, first paid pilot | Pages + skills shipped; checkout `mailto:`; no pilot |
| Simplify GTM: free `systemix audit` wedge; npm; Claude Code communities | npm published once (07-10); no Show HN |
| SEO brief: OSS funnel, dogfood badge, 4–6 posts | Sitemap / robots / OG shipped; no posts |

**Real evidence, complete list:** PostHog `/` 6 unique visitors (30 days to 07-05) → 100 unique
visitors, 109 pageviews, 1 install-copy, 2 hero CTA clicks (30 days to 10-10); 1 `book_a_call`;
GitHub 1 star / 0 forks / 1 contributor; npm `@getsystemix/cli@0.2.0` + `systemix-mcp-server@0.1.0`
published once (download counts not checked); `@getsystemix/app` never published. Revenue,
interviews, signups: **0**.

> At ~100 visitors a month, no landing A/B test can resolve. **The binding constraint is traffic and
> customer conversations, not features.**

## 5. Thrash analysis

What keeps getting re-decided: the category/one-liner (15+ versions) · DS-first vs loop-first
(7 flips) · ICP (never tested with a real person) · pricing (5 schemes in 3 days) · the app
surface (7 shapes — the proposed "App Shell with side nav + canvas" is ADR-001 again) · the
engine (local Hermes "moat" → selectable → Claude-only) · storage ("contract" now means three
different things) · the landing (17% of all commit subjects mention landing/hero).

Questions that never resolve: which ICP · what exactly is paid when everything is MIT · does
anything run hosted (ADR-006 review trigger open; the plugin-vs-skills ADR never written) ·
unifying the two HITL queues (deferred 4×) · traffic.

**Implication: the beta needs a decision protocol more than another decision.** Freeze the
one-liner, ICP and offer for ~10 weeks in one ADR with *external* review triggers; stop reading
A/B results on <100 visitors; ship distribution before any new surface.

## 6. Docs hygiene for an open-source beta

- **Fix or archive (contradictory/stale):** `CLAUDE.md` (describes v5 while `layout.js` is v6;
  status dated 07-09; points to plan files not in the repo); `docs/PLAN.md` (self-declared
  superseded); the five `docs/systemix-*-2026-07.md` (all PROPOSED, conflicting prices); feature
  folders `site-rebuild`, `systemix-rework`, `contract-rework`, `atlas-surface`, `atlas-phase-2`,
  `config-ux-runtime`, `simplify-2026-07`, `context-engine-reframe-2026-07`, `rebrand-hifi`
  (first lift still-valid decisions into ADRs: "sell convenience not DRM", merchant of record,
  runner covenants); `docs/product/architecture/*` (Ollama era; ADR numbers collide).
- **Remove from a public repo:** `research/` (client details, third-party brand forensics),
  `content/linkedin/` (private content strategy), `sessions/`, `spikes/spike-1-hermes`,
  `supabase/` (retired schema), vestigial `.systemix/{agent-state,atlas.catalog,proxy-config}.json`,
  `packages/mcp-proxy`.
- **Bugs, not polish:** ~190 unscoped `npx systemix …` references (the bare `systemix` npm
  package belongs to an unrelated publisher — users following shipped hints run a stranger's
  code); `@getsystemix/app` referenced but unpublished; the "engine" cron never generates.
- **Missing for OSS:** CONTRIBUTING, CODE_OF_CONDUCT, SECURITY (incl. the write-policy rail),
  CHANGELOG + semver + release CI with npm provenance, PR CI running Jest + Vitest (today only
  crons run), public BACKLOG/ROADMAP, a license boundary between MIT kit and paid parts, a
  Diátaxis docs IA, and `examples/`.

## 7. Verdict — what the history says

1. Don't reposition again without external evidence.
2. Don't treat A/B reads on ~100 visitors/month as proof.
3. Don't market "Systemix builds itself" until one real feedback → proposal → merged-PR cycle is public.
4. Don't build another surface before distribution — consolidate instead.
5. One pricing ladder, in one file, behind one ADR, with a real checkout.
6. Keep: files as state, code-first tokens with DESIGN.md as the carrier, Claude Code as engine, the three doors.
7. Keep: autonomy dial (ghost at init) and "self-modification is always human" — it is the trust story an audit buyer pays for.
8. Keep: repo-as-product, "sell convenience and service, not DRM", analytics-free DS package.
9. Keep: the honesty guardrail (marketing may claim the vision; product UI must not fabricate it) and buddy as onboarding.
10. Run the rethink as a gated nWave feature; settle Tamagui vs shadcn and hosted vs local in DESIGN, not in landing copy.
