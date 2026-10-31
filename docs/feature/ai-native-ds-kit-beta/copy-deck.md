# Copy deck: a simpler site (G-002 input)

**Date:** 2026-10-31 · **Status:** DRAFT for the design lead · **Asked:** "simplify and streamline the landing page and generally all pages"

The copy approved at G-002's shape gate (hero, pillars, pricing; `design/artifacts/g002-landing.html`)
is the base. This deck cuts around it and fixes the rest of the site to say the same thing.

## 1. What the site says today (measured on localhost, 2026-10-31)

| Page | Words | Screens | Problem |
|---|---|---|---|
| `/` | 1,001 | 7 | 10 sections. Three different taglines ("rots. This one learns", "Stop the rot", "keeps your design system from rotting"). Describes the old experiment loop (autopilot, three doors, `/init-experiment`), not the pitch. |
| `/report` | 478 | 4 | Good. Repeats the landing's FAQ and pricing; "Full quick report" is two names for one thing. |
| `/audit` | 217 | 2 | A third headline for the same promise ("Is your design system AI-ready?"). |
| `/docs` | 467 | 2 | Starts with "the four steps" of the loop, not the plugin. |
| `/experiments`, `/contract`, `/design`, `/skills`, `/config` | 110–826 | 1–5 | Internal surfaces ("The loop", "HERMES QUEUE", "FIGMA → CODE") on the public site. |

**Copy that is false today**
- FAQ "What leaves my machine when I get a score?" says the results file is sent. Since DSC-22 D1 the free score is computed locally and nothing is sent.
- "Every headline you're reading is a live, running bet." The hero experiment is closed.
- Pricing shows "Fix sprint · Custom". The decided price is €990 for 3 days (DSC-20).
- "One Learning Kit, every audience": the Learning Kit is retired.
- "Monthly fee $0": every other price is in euros.

## 2. One vocabulary, every page

| Say | Not |
|---|---|
| design system agent | AI-native design system that learns, the automation, the loop |
| free score | AI-readiness score (keep it once, in the meta description, for search) |
| quick report (€9.99) | full report, full quick report |
| full audit (€499) | audit request, readiness audit (that is a skill name) |
| design sprint (€990, 3 days) | fix sprint, implementation sprint |
| you approve / a person rules | ghost mode, HITL, close the decision |
| Claude Code plugin | doors, three ways in |
| keeps it from rotting | stop the rot, your design system rots |

## 3. The landing: six sections, ~450 words, ~4 screens

| # | Section | Status |
|---|---|---|
| 1 | Hero | approved; the card's wording made plainer |
| 2 | What Systemix does: three pillars | approved; each card shortened, one command each |
| 3 | Proof: our own score | approved, compact |
| 4 | How it works | new, taken from `/report` |
| 5 | Pricing | approved; the sprint line reworded |
| 6 | FAQ + install | cut to four questions |

**Cut:** announcement strip duplicates · logo strips · the statement block · the three deep-dives · "Everyone works from the same notes" · the live experiment feed · "Who's behind it" (one line moves to the footer) · the brand-clone hook.

### 1 · Hero (approved H1 and sub; card reworded)
- **H1:** The design system agent for AI-native products.
- **Sub:** Systemix sets up your design system, keeps it from rotting, and runs your design sprints, inside Claude Code.
- **Install:** the two plugin commands, then "Run `/systemix:score` in your repo. Free, in two minutes."
- **Card "What you get":** Price €0 · Runs in Claude Code · Your code leaves your machine: never · A person approves every step

### 2 · What Systemix does (approved, shortened: "gate" becomes "step", one command per card)
- **H2:** Deploy it. Keep it. Grow it in sprints.
- **Deploy** *(in the plugin · partial)*: A short interview drafts your design system, or the audit proposes one from the code you have. Every file waits for your yes. `/systemix:design-interview`
- **Keep** *(in the plugin)*: A free, repeatable score and audits that find raw colours, one-off sizes and duplicate components. Same code, same numbers. `/systemix:score`
- **Sprint** *(in the plugin · beta)*: One sentence becomes a goal, then pictures, a prototype in your components and a release. You approve every step. `/systemix:goal`

### 3 · Proof
- **H2:** Our own repo scores 53 out of 100.
- **Body:** We run Systemix on this site. The score isn't flattering, and that's the point. *(the six-area donut; link: "See how it's scored →" to /report)*

### 4 · How it works
- **H2:** Three steps, two minutes.
1. **Install the plugin.** Two commands in Claude Code. No account.
2. **Run `/systemix:score`.** It reads your repo on your machine. Nothing is sent.
3. **Fix what costs points.** Do it yourself, or get the €9.99 report that lists each fix, biggest first.

### 5 · Pricing (approved; the sprint line drops "the build loop")
- **H2:** Start free. Pay when it earns it.
- **Free score €0:** The plugin, every skill, and your score per area. → *Get your free score*
- **Quick report €9.99:** Everything that costs points, biggest first, with a fix for each. → *See the quick report*
- **Full audit €499 · 24h:** Drafted by AI, reviewed and rewritten by a person: what to fix, in what order, and why. → *Request the audit*
- **Design sprint €990 · 3 days:** We plan, prototype in your components and update your system with you. → *Book a sprint*

### 6 · FAQ and install
- **Do I own the files?** Yes. Everything is plain files in your repo. Stop anytime and keep them.
- **Does it change my code without asking?** No. It proposes; you approve every file.
- **What leaves my machine?** Nothing, for the free score. The €9.99 report sends only numbers and file names, never code, and only after you say yes.
- **I don't have a design system yet.** Run `/systemix:design-interview` and it drafts one with you.
- **Bottom H2:** Get your free score. *(the install block; fineprint: Open source · MIT · your files, your repo)*
- **Footer line:** Made by Boyan Tsonev. GitHub · LinkedIn · Docs

## 4. Every other page

| Page | Change |
|---|---|
| `/report` | Keep. Rename "Full quick report" to **Quick report**. Remove its FAQ; link to the landing's FAQ instead. Keep the H1 "Can your AI agents follow your design system?" (it is the search question). |
| `/audit` | One screen. **H1:** Full audit, €499, in 24 hours. **Sub:** We run the scan, then a person writes what to fix, in what order, and why. Then the form. |
| `/docs` home | Lead with **Install → score → fix** and the plugin; move "the four steps" of the experiment loop to a "Concepts" page. |
| Nav | How it works · Free score · Pricing · Docs. Drop "Audit" (it is in Pricing) and "Star on GitHub" as the main button. The button is **Get your free score**. |
| `/experiments`, `/contract`, `/design`, `/skills` | Off the public nav. Reachable from one docs page, "See it running on this repo", which says in one line what each shows. |
| `/config` | Already "Home runs on your machine" on production (G-003). |
| Meta | **Title:** Systemix: the design system agent for Claude Code. **Description:** Sets up your design system, keeps it from rotting and runs design sprints. Free AI-readiness score, computed on your machine. |

## 5. For the gate (the design lead rules)

1. Cut the landing to the six sections above?
2. Take `/experiments`, `/contract`, `/design` and `/skills` off the public nav?
3. "Built by a two-person studio": still true? The footer line above names only you.
4. Ship this copy as G-002 PR 1, with the motion in PR 2 (reading A, still open at the gate)?
