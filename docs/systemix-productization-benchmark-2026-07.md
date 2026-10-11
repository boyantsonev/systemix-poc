---
title: "Systemix productization — getdesign.md/LaunchKit benchmark → tiered live-artifact offer"
status: PROPOSED — analysis feeding a pricing/packaging decision, not an ADR yet
type: pivot-analysis
date: 2026-07-07
canon:
  - decisions/ADR.md (ADR-016, ADR-017, ADR-019)
  - docs/product/jobs.yaml (JOB-002…007)
  - docs/systemix-pivot-design-ops-engine.md
---

# Systemix productization — getdesign.md/LaunchKit benchmark

## 0. TL;DR

getdesign.md and LaunchKit (same team, VoltAgent) sell **one-time-payment, AI-context-attachable
artifacts** at three price points: a cheap single-file artifact ($39–59), a mid-tier "kit" bundle
($249–299), and nothing above that — no consulting tier, pure product. Systemix already has the
harder, real version of their cheap artifact (`scripts/generate-design-md.ts`, DESIGN.md +
`x-systemix:` evidence extension — spike confirmed lint-clean, `spikes/design-md/RESULTS.md`) and
already has a three-tier model on getsystemix.vercel.app (free kit / paid sprint / design partner).
What's missing is **the middle**: a self-serve, paid, attachable artifact between "free CLI" and
"book a call for a week-long sprint." That gap is exactly what the Savin/ESG-regtech engagement
should become the first paid instance of — not a one-off UX audit, but the pilot for a productized
**"AI-Native Design System Readiness Audit"** artifact, sold the way getdesign.md sells DESIGN.md.

## 1. The benchmark: what getdesign.md + LaunchKit actually sell

Both are built by the VoltAgent team and share infrastructure. Pattern, observed directly:

| Tier | Product | Price | Mechanic |
|---|---|---|---|
| Free / awareness | 70+ public DESIGN.md files for famous brands (Stripe, Vercel, Notion…) | $0 | Drop the file in your repo, tell your coding agent "build like this." Pure top-of-funnel; the virality (35K GitHub stars on the underlying spec, 71K skill installs quoted in testimonials) *is* the marketing. |
| Paid artifact #1 | **Private DESIGN.md** for *your* site | $39–59 one-time | Fill a form (site URL, email, current stack), get a custom DESIGN.md emailed same-ish day. Includes light+dark theme previews and a Discord channel. No call, no human sync meeting required. |
| Paid artifact #2 | **LaunchKit** (DESIGN.md + full app starter: auth, billing, AI chat, blog/SEO, 20+ agent skills) | $249–299 lifetime | Same self-serve form → download → open in Claude Code/Cursor and prompt features. Framed as "$25k–$65k of dev hours for $249," explicit build-vs-buy table. |
| Recurring add-on | Catalog Pass (20+ DESIGN.md files, 5 new/month) | $99/mo | The only subscription; optional, stacks on top of a one-time purchase. |
| Nothing above this | — | — | No agency tier, no "book a call," no bespoke sprint. It's a product company, not a studio. |

Mechanically, every tier is **the same asset (a markdown/context file an AI coding tool reads)**
sold at increasing bundle size. There is no service layer — that's the gap Systemix can fill,
because Systemix's version of the artifact isn't static (scraped once) — it carries **evidence and
drift status that updates**, and Systemix *does* have a service layer (the sprint + design-partner
tiers) sitting right above it.

## 2. What Systemix already has that maps onto this

Cross-referencing the fetched getsystemix.vercel.app copy against what's actually on disk:

| getdesign.md/LaunchKit mechanic | Systemix equivalent, already built | Where |
|---|---|---|
| Static DESIGN.md scrape of a live site | `npx @getsystemix/cli init` → generated `DESIGN.md` **with evidence** (`x-systemix:` block: drift counts, PostHog production evidence, not just colors) | `scripts/generate-design-md.ts`, confirmed lint-clean + WCAG-checked by the canonical `@google/design.md` reader (`spikes/design-md/RESULTS.md`) |
| "Drop it in your project, agent builds matching UI" | Same mechanic, but the file is regenerated from `contract/tokens/*.mdx` + `contract/components/*.mdx`, so it isn't a one-time scrape — it's live to the repo (ADR-019: DESIGN.md is the single contract carrier) | ADR-019 |
| Free tier | `npx @getsystemix/cli init` — free forever, MIT | getsystemix.vercel.app "Pick your path" |
| Paid tier | "Design system build" — 1-week sprint, bespoke | getsystemix.vercel.app; **no price shown publicly today** |
| Design-partner / pilot tier | Free setup + workflow mapping, 1–2 slots | getsystemix.vercel.app; Connecta is partner #1 (validated JOB-002/003/004/007) |
| Content/SEO virality loop | getdesign.md's 70+ testimonial tweets, YouTube coverage | Systemix has no equivalent yet — `content/linkedin/PLAN.md` tracks a different, quieter practice (human replies, not stars) |
| JTBD as a hidden internal artifact | Systemix has this **already, more rigorously** than anything getdesign.md ships publicly: `docs/product/jobs.yaml` — functional/emotional/social jobs, ODI outcome scoring, ICP candidates, validated-conditional status per job | `docs/product/jobs.yaml` |
| Drift detection | `/drift-report` skill, OKLCH-based perceptual diff (ADR-002), already proven on the Connecta engagement (`research/connecta-current-state.md` — hardcoded 62px hero override flagged as drift against `--t-display`) | ADR-002, `research/connecta-*.md` |

**The asymmetry: Systemix's raw artifact-generation tech is already ahead of getdesign.md's paid
tier — it's just never been sold as a self-serve product.** Today it's either free (`npx @getsystemix/cli
init`) or bundled into a week-long bespoke sprint with no public price. Nothing sits in the $39–299
band getdesign.md proved the market will pay for a single markdown file.

## 3. The gap — three new artifacts, sold the way getdesign.md sells DESIGN.md

Your message names the enhancement set directly: JTBD, AI analysis, drift report, an AI-native
design-system readiness audit — "like live artifacts available from the kit, ready to attach to
your context." That maps to three sellable, attachable deliverables, all generatable from work
Systemix already does:

1. **AI-Native Design System Readiness Audit** (new, the headline product)
   A single generated report + attachable context pack: current DESIGN.md/token state, drift score
   (OKLCH deltaE per ADR-002), a JTBD gap map scored against the client's actual product (using the
   same ODI-outcome method as `jobs.yaml`, applied to *their* product instead of Systemix's), and a
   0–100 "AI-native readiness" score — is this repo in a state where an agent can safely extend the
   design system, or will it drift by the second sprint (the exact failure mode getsystemix.vercel.app's
   own landing page names: "AI can generate a design system in an afternoon — and by week two it's
   slop"). Delivered as a folder: `DESIGN.md` + `readiness-audit.mdx` + `jtbd-gap.mdx` — drop-in
   attachable to Claude Code/Cursor context, same mechanic as getdesign.md's file-drop.

2. **Drift Report as a live artifact** — already built (`/drift-report`), already proven on Connecta.
   Today it's a skill you run once for yourself. Packaged as a deliverable, it's the same
   "attach-to-context" artifact getdesign.md never offers (their diff only compares token values
   across two static files, per `spikes/design-md/RESULTS.md` Test 2 — no evidence, no history).

3. **JTBD-as-artifact** — nobody else in this space sells this. getdesign.md sells *what a design
   looks like*; Systemix's own internal practice (`jobs.yaml`) shows *why a product decision was
   made and whether it's validated*. That's a defensible artifact type competitors don't have,
   because it requires the evidence-loop infrastructure (ADR-015/019) to generate honestly instead
   of as a consulting deck.

All three should render as **Cowork live-artifacts** (ADR-016 — already the decided mechanism: a
persisted, reload-on-open HTML view backed by local files) so "ready to attach to your context"
is literal: the client opens a link, sees the current readiness score/drift/JTBD gaps, and can pull
the underlying MDX/DESIGN.md straight into their own coding agent's context window.

## 4. Proposed tier structure with pricing anchors

Anchored against the researched market (freelance UX audits $1,000–8,000; design systems
$5,000–25,000; getdesign.md's own $39/$249 self-serve band) and what Systemix can credibly automate
vs. what still needs a human (you) in the loop:

| Tier | What | Price anchor | Mechanic |
|---|---|---|---|
| Free | `npx @getsystemix/cli init` — the loop scaffolded, MIT | $0 | Unchanged — the magnet (`experiments/goals/consultancy-leads.mdx`) |
| **New — self-serve artifact** | AI-Native Design System Readiness Audit (auto-generated: DESIGN.md + drift score + JTBD gap map) for *their* repo/URL | **$149–249 one-time** | Fill a form (repo/site URL, email) → same mechanic as getdesign.md's request flow → delivered as attachable files + a Cowork live-artifact link. No call required. This is the missing middle tier. |
| Existing — sprint | "Design system build" — 1-week bespoke sprint, custom skills tuned to the client's workflow | **No public price today — recommend anchoring at €3,000–6,500** (matches the freelance UX-audit + design-system market range already priced for the Savin engagement) | Book a call, scoped per client |
| Existing — design partner | Free setup + workflow mapping across marketing/eng/business/design, 1–2 seats | $0 (equity is the proving ground, not cash) | Application-based |

The self-serve $149–249 tier is deliberately priced *below* LaunchKit's $249 lifetime kit, because
it's a single-repo audit, not unlimited-project source code — and *above* getdesign.md's plain
$39 DESIGN.md, because it includes drift + JTBD scoring getdesign.md structurally cannot offer
(they have no evidence layer, no contract, no loop — confirmed by their own DESIGN.md diff only
comparing token values, `spikes/design-md/RESULTS.md`).

## 5. ESG/regtech as design partner #2 — why the Savin engagement is the right pilot

`docs/product/jobs.yaml` already has an **unvalidated** job sitting exactly where a regtech/ESG
client would validate it:

> **JOB-005 — bind-evidence-loop-compliantly** (`status: candidate-unvalidated`, confidence: low)
> "Bind the evidence/hypothesis loop to a per-client, region-appropriate data source... so
> experiments are measured without violating compliance." Emotional job: "Feel safe running growth
> experiments on a regulated (K-12 / EU) product."

Connecta validated the *design-system* jobs (002/003/004/007) but never triggered JOB-005 — it
never got the PostHog-EU compliance wiring far enough to test it (per the job's own validation
note: "PostHog EU + platform build not yet started"). An ESG/regtech client is a stronger candidate
to validate JOB-005 than Connecta was, because compliance *is the product* for them, not an
adjacent constraint — regulators want exactly what Systemix's contract model produces natively:
a decision log with rationale, timestamped, evidence-linked, non-repudiable (`contract/**/*.mdx`,
ADR-015). That's not a stretch fit; it's closer to the design center of the loop than Connecta's
K-12 case was.

Recommended framing for that engagement, concretely: sell it as the **first paid instance of the
readiness-audit tier (§4)**, not as a flat UX-audit-plus-design-system freelance quote. Two
consequences if you do:

- It becomes case-study material for the productized artifact (the thing getdesign.md has 70+
  testimonials for and Systemix has zero).
- It's the natural second design partner slot (`experiments/goals/consultancy-leads.mdx`'s north
  star is "founders who see the live, dogfooded loop book a call" — an ESG/regtech client watching
  their *own* readiness score and drift report update live is a stronger conversion story than a
  static deck).

## 6. Concrete next steps, in build order

1. **Package `generate-design-md.ts` + `/drift-report` + a JTBD-gap generator into one CLI command**
   (`systemix audit <repo-or-url>`) that emits the three-file artifact described in §3. This is the
   productization unlock — everything it needs already exists as separate scripts/skills.
2. **Add a `/for/regtech` or `/for/compliance` landing variant** alongside the existing
   `/for/business`, `/for/engineers`, `/for/designers`, `/for/marketers`, `/for/agents` pages —
   pitching JOB-005 directly ("your evidence trail is audit-ready by construction").
3. **Price and ship the self-serve tier** (§4) before or alongside the Savin engagement, so that
   engagement can literally be delivered *through* the new product surface instead of as bespoke
   freelance work — validates the packaging and gives you a live case study in one motion.
4. **Add JOB-008 to `jobs.yaml`** once the Savin/ESG-regtech engagement starts, mirroring how
   Connecta's learnings became JOB-002…007 (`connecta-learnings.md` pattern) — this is the same
   evidence-loop discipline Systemix already applies to itself; apply it to this engagement too.
5. Track the artifact's own funnel the way `experiments/goals/consultancy-leads.mdx` already tracks
   the free kit — book-a-call rate from readiness-audit deliveries becomes a new experiment under
   the same goal.
