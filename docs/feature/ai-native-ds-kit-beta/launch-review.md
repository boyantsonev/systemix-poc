# Launch review: the pitch, the product, the site

**Date:** 2026-10-31 · **Status:** DRAFT for the founder · **Branch:** `claude/gifted-goodall-3iib00`

> *"Systemix is an AI-native design system agent which deploys AI-native product design systems,
> keeps them from rotting and orchestrates design sprints."* (founder, DSC-19)

The pitch makes three promises. This review checks each one against what ships, then plans the
landing page and its motion around them.

## 1. Each pillar against what ships

| Pillar | What ships today (plugin 0.1.0) | Grade | Gap that matters for launch |
|---|---|---|---|
| **Deploy** a design system | `/systemix:design-interview` drafts DESIGN.md, tokens and guardrails from an interview. `/systemix:design-audit` proposes a `design/` starter for a repo that has UI. `/systemix:claude-design-sync` brings a Claude Design output into tokens. All propose and wait for a yes. | Partial | No one-step "deploy". The scaffold (`design/` template + the CLAUDE.md block) exists in the CLI (`init`) but not in the plugin, and `init` on npm is still the unsafe 0.2.0. |
| **Keep it from rotting** | `/systemix:score` (free score, paid report), `/systemix:readiness-audit`, `/systemix:design-audit`, `/systemix:drift-report`. Deterministic: 18 blind runs gave the same score. | Strong, on demand | "Keeps" means continuous, and today it is a command you remember to run. The plugin has no hook or CI check that catches drift while the agent writes UI. |
| **Orchestrate design sprints** | Nothing in Systemix. The method exists and works in a private reference build: Frame (brief, stop for approval) → Build (hi-fi in real code) → Systematize (extract into the system, docs, guardrails, version bump), with state in `design/sprints/NNN-slug/` and a checker. | Missing | The pitch's most distinctive promise has no product behind it. Until it ships, the site may offer sprints only as a service. |

**Verdict.** The launch is strong on "keep from rotting", and that is what the free score sells. The pitch
promises two more things: the site should be honest about them now, and the plugin should close the
gaps in this order, because each one makes the next demo better.

1. **Drift guard hook** (keep from rotting, continuous): a plugin hook that runs the bundled drift scan on
   the UI files Claude just edited and reports new raw colours, sizes and spacing before the turn ends.
   The agent checks its own work against the guardrails. About 1–2 days, all local, no network.
2. **`/systemix:init`** (deploy): scaffold `design/` from the existing template plus the CLAUDE.md block,
   proposed file by file, ghost mode. About 1 day; reuses `packages/cli/templates/design`.
3. **`/systemix:sprint`** (orchestrate): the reference method, generalized: Frame → Build → Systematize,
   state in `design/sprints/`, a `sprint check` in the bundled scan, a human gate at the end of Frame.
   About 3–4 days. Port the pattern, not the private build's content.

## 2. The launch plan, re-checked

- **Price ladder still fits**, and the pitch sharpens it: the free score detects rot (magnet),
  the €9.99 report says what to fix, the €499 audit plans it, and the paid sprint runs `/systemix:sprint`
  with you. The sprint price is the weak rung. €4.5k for two weeks sits far above the budgets seen so
  far ($100–$720, DSC-11). **Hypothesis to test: a fixed 3-day sprint at €990–€1,490**, the same shape
  as the skill.
- **Funnel.** The AARRR events cover the web and the report service. Deploy and sprint activity happen
  on the client's machine and are invisible by design. If you want them, the only honest way is an
  opt-in, anonymous "sprint finished" ping, and the privacy text must say so first. Not recommended
  before launch.
- **Naming.** "systemix-agent" as the GitHub home matches "design system agent". The install line
  becomes `/plugin marketplace add systemix-agent/<repo>` once Claude can see that repo.
- **Blockers are unchanged:** repo access, `SYSTEMIX_REPORT_ACCESS`, npm 0.3.0, the Lemon Squeezy
  product. See the launch board.

## 3. Landing page plan, built on the three pillars

Learning `landing-ai-native-ds-2026-07` applies: the hero copy is still a running experiment
(`landing-rebrand-hifi-2026-07`). Close it, then ship the new hero as the next bet in the same PR.
Learning `landing-live-loop-2026-06` applies too: at this traffic, treat the redesign as a craft
decision, not an A/B test.

| # | Section | Change |
|---|---|---|
| 1 | **Hero** | H1 "The design system agent for AI-native products." Subline: "Systemix sets up your design system, keeps it from rotting, and runs your design sprints, inside Claude Code." Plugin install + "Get your free score". Keeps "design system" in the H1 for SEO. |
| 2 | **Three pillars** (replaces the three deep-dives) | Deploy · Keep · Sprint. Each card: the promise, the command you run, a small live mockup, and an honest tag: *in the plugin* / *with us, plugin soon*. |
| 3 | **Live proof** | This repo's own score as a donut (six areas) and the overall number, from the committed results file. Already rendered on `/report`; move a compact version up. |
| 4 | **How it works** | Install → `/systemix:score` → fix list, with the privacy line. |
| 5 | **Pricing** | Free plugin + score → €9.99 report → €499 audit → design sprint (fixed 3-day, price to test). |
| 6 | **Credibility + FAQ** | Keep; trim Audiences and the persona table to one line each. |
| 7 | **Bottom CTA** | Plugin install, unchanged. |

Out: the "Three ways to run it" and autopilot deep-dives (they describe the old loop product), the
Learning Kit tier (decision pending on `/kit`).

## 4. Motion plan with transitions.dev

**Source:** [Jakubantalik/transitions.dev](https://github.com/Jakubantalik/transitions.dev): 35 CSS
transitions plus a "UI generation" runtime that draws a component as if an agent were building it.

**License, read in full:** free to use on our own site, commercially, modified. Not allowed: redistributing
the collection. The Systemix kit and plugin are a starter kit, so **the snippets stay on the website and
out of `plugin/` and `templates/`** unless we buy a Business plan, and even then only the ones a
template uses, with the transitions.dev comment kept.

**Rules for our use:**
- **Visible without JavaScript.** Content is hidden for a reveal only after a script has added
  `html.motion-ready`, so crawlers, screenshots and no-JS readers see everything (SEO, link previews).
- **Tokens first** (our guardrails): add the motion tokens (durations, easings, distances, blur) to
  `src/app/globals.css` once, then use them. No raw durations in components.
- **`prefers-reduced-motion`** turns every one of them off. Every snippet already ships that guard.
- **One generation moment per page.** The rest are quiet reveals.
- **Performance:** the generation runtime is about 36 KB. Load it lazily, only on the hero and `/report`.
  Watch LCP and CLS in Vercel before and after.

| Where | Transition | Why it fits the pitch |
|---|---|---|
| Hero, right column | **UI generation, `ui` variant, `skeleton-texts` mode**, once per visit: the "What you get" card is drawn as a dotted wireframe with an agent log, then revealed | Shows "an agent deploys your design system" without a word |
| Hero headline + subline | **Texts reveal** (staggered blurred rise) on load | Calm entrance that doesn't compete with the generation moment |
| Section headings on scroll | **Texts reveal**, driven by the existing `SectionTrack` observer (already used for `section_viewed`) | No second observer; reveals and analytics stay in step |
| Live proof score | **Donut chart** for the six areas + **number pop-in** for the overall score | The score is the product's first output; make it land |
| `/report` "what happens" | **Thinking states** ("Scanning 197 files" → "Scoring" → "Ready") + **reasoning stream** for the plugin run | Shows the local scan honestly, step by step |
| Copy buttons | **Text morph** (Copy → Copied) | Small, frequent, satisfying |
| FAQ | **Accordion** | Replaces native `<details>` jumps |
| Pillar cards | **Skeleton reveal** when they enter | Quiet; reserve the dotted generation for the hero |

**How to bring it in:** install the skills for development only (`npx skills add Jakubantalik/transitions.dev`,
kept out of the vendored kit), copy the chosen snippets into `src/styles/motion.css` with the
transitions.dev comment, and map their literal values to our new motion tokens.

**Measuring:** no A/B (learning `landing-live-loop-2026-06`). Guard metrics only: LCP, CLS, and the
`install_command_copied` rate before and after, read as a sanity check rather than a result.

## 5. Order of work

1. Founder: close the hero experiment, approve the hero copy and the pillar tags, and pick the sprint
   price hypothesis.
2. Landing rework (sections 1–5) with the motion layer: about 2–3 days.
3. Drift guard hook → `/systemix:init` → `/systemix:sprint`, each a small plugin release, with the
   pillar tags on the site switched to *in the plugin* as each ships.
