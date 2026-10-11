# copy-landing.md — Systemix landing (`/`)

> **Superseded.** This deck predates later landing rewrites (2026-07-08/09/10).
> Pricing, hero copy, and section structure below no longer match what's live.
> Treat `src/lib/landing/content.ts` as the source of truth, not this file.

> Voice: plain, short, outcome-first. Say the benefit before the mechanism. No "contracts / drift / self-training layer" as a first word — translate to what it does for the reader. Model the discipline: if a line can lose words and keep its meaning, cut them.
> **Plain-English product definition (north star for every line below):** *Systemix stops your design system from rotting. It watches what you ship, catches where design and code drift apart, proposes a fix with AI, you approve it, and it remembers the reason — so your system gets sharper every release instead of decaying.*

---

## 0. Announcement strip
`Open source · Runs on your AI coding tool · Free to start →` (links to GitHub)

---

## 1. Hero  *(flag: `landing-hero`, keep control / variant_b)*

**Control**
- H1: **Your design system rots. Systemix fixes that.**
- Sub: One line — Systemix watches what you ship, catches drift, and proposes fixes your team approves. Your system learns instead of decaying.
- CTA primary: `npx @getsystemix/cli init`  *(copy command → `install_command_copied`)*
- CTA secondary: **View on GitHub** (outline)

**variant_b**
- H1: **Your design system, but it learns.**
- Sub: Every release, Systemix catches what drifted, proposes the fix, and remembers why — so the system compounds instead of decaying.
- CTAs: same.

> SEO H1 note: keep the words *design system* in the H1. Title tag + meta in the SEO brief.

---

## 2. Metrics strip  *(4 stats — honest, no vanity)*

- **$0/mo** — runs on the AI coding tool you already pay for
- **Day 1** — ghost mode: it suggests, never touches your code
- **3 ways in** — skills, CLI, or MCP
- **[N] decisions recorded** ⚠️ *placeholder — pull live from `LEARNINGS.md` at build (LiveLoopProof), or approve a real number*

---

## 3. Logo rows

- **Works with your AI tool:** Claude Code · Cursor · Codex
- **Plugs into your stack:** GitHub · PostHog · Vercel · shadcn · Tailwind · Figma *(optional)*

---

## 4. Feature deep-dives  *(each: negative→positive headline + 2 short lines + product-mockup slot)*

**1 — Don't let your design system forget why.**
Every ship is a signal. Systemix spots what drifted, proposes a decision, and — once you approve — records the reason. Solved problems stay solved.
`mockup: experiment card (real UI)`

**2 — Decisions with receipts, not vibes.**
Every approved call is saved with its evidence and a confidence score. Your system remembers what worked and why — cited, not guessed.
`mockup: LEARNINGS feed`

**3 — Three doors. Pick yours.**
Run it as slash-command skills, a CLI, or an MCP connector. Same loop, whichever way your team already works.
`mockup: code blocks`

**4 — Measure when you're ready.**
Wire PostHog and every headline, CTA, and flow becomes evidence. No analytics yet? The loop still runs without it.
`mockup: signals card`

**5 — You stay in control.**
Start in ghost mode — suggest only. Dial up to assisted or autonomous when you trust it. A human always closes the decision.
`mockup: HITL close-proposal card`

**6 — Catch drift before it ships.**
Systemix flags where design and code split and shows the diff. Tokens live in code, so there's one source of truth.
`mockup: drift report`

---

## 5. Credibility  *(small-team framing is load-bearing — do NOT imply an agency)*

**Built by a two-person studio that got tired of watching design systems rot.**
Systemix runs its own site. Every headline you're reading was chosen by the loop, measured, and kept because it won. We ship what we sell.
CTA: **See the loop running →** (links to `/experiments` or LEARNINGS)

---

## 6. Pricing ladder

| Tier | Price | Line |
|---|---|---|
| **Start free** | `npx @getsystemix/cli init` · $0 | The full loop in ghost mode. Your files, your repo. |
| **AI Kit** | ~~$299~~ **$249** · pay once | Everything to run the loop for real. Yours to keep, no subscription. → `kit_requested` |
| **Scheduled Loop** | monthly | We run the loop on a schedule so you don't have to remember to. |
| **Team** | custom | Multiple repos, shared decision history, support. → `book_a_call` |

Anchor line under the card: **Pay once. Lifetime access. No seats, no meter.**

---

## 7. Build-vs-buy table

Header: **Build this yourself, or turn it on today.**

| Build the loop yourself | Time | With Systemix |
|---|---|---|
| Experiment scaffolding | ~8 hrs | included |
| PostHog wiring | ~6 hrs | included |
| Learnings ledger | ~12 hrs | included |
| Human-approval rail (HITL) | ~16 hrs | included |
| Drift audit | ~20 hrs | included |
| Scheduled runner | ~6 hrs | included |
| **You save** | **~68+ hrs** | **$249 once** |

⚠️ *Hours are honest estimates — sanity-check against real build effort before publishing.*

---

## 8. FAQ  *(permission-granting; short answers)*

1. **What exactly do I get?** A CLI and framework that runs the ship→signal→decide→record loop on your design system. Free to start; the AI Kit adds the paid pieces.
2. **I don't have a design system yet — can I use this?** Yes. `npx @getsystemix/cli init` scaffolds one and starts the loop from day one.
3. **Why not just prompt my AI tool from scratch each time?** Because it forgets. Systemix keeps the decisions and evidence, so you don't re-solve the same thing every release.
4. **Do I own the files?** Yes. Everything lives in your repo as plain files. Cancel anytime, keep everything.
5. **Which AI tools does it work with?** Claude Code, Cursor, Codex — any of the three doors.
6. **Does it touch my code without asking?** No. It starts in ghost mode (suggest-only). You choose when to give it more.
7. **Do I need PostHog?** No. Wire it when you want evidence; the loop runs without it.
8. **Is it really open source?** Yes — the core is on GitHub. Start free, upgrade if it earns it.
9. **Can I use it for client work?** Yes. Keep the files, hand them off, or run the loop for the client.

---

## 9. Footer
Nav + `npx @getsystemix/cli init` + GitHub · light/dark toggle · links to `/kit`, `/audit`, `/docs`.

---

### PostHog seams to preserve (do not rename)
Events: `hero_cta_click`, `install_command_copied`, `kit_requested`, `book_a_call`, `cross_promo_click`, `section_viewed`. Props: `location / variant / persona / section`. Hero uses `useVariant("landing-hero")` with `experimentId`. Wrap sections in `<SectionTrack>`; CTAs via `TrackedLink` / `InstallCommand`.
