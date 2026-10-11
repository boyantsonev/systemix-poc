# SEO · GTM · Conversion brief — Systemix rebrand

> **Partially superseded.** Per-page titles/meta in §3 and the positioning
> line in §1 are still broadly accurate — verify against the live pages
> before citing. Pricing references ($299/$249 Kit, free `/audit`) are
> stale: Kit is €99, `/audit` is a paid €249 AI-Readiness Audit. §5's GTM
> channel plan and §6's conversion levers are still the current strategy —
> see the 2026-07-10 growth/SEO audit for a gap analysis of what's actually
> shipped against this brief.

Keep it simple. One clear head term per page, plain language everywhere, and let the dogfood ("the site runs on Systemix") do the persuading.

---

## 1. The positioning line (use everywhere)
**Systemix keeps your design system from rotting.** It watches what you ship, catches drift, proposes AI fixes you approve, and remembers why. Say this before any jargon.

The reader has to get it in one read. "Contracts / self-training layer / evidence engine" are *mechanisms* — put them below the fold, never in the H1 or title tag.

---

## 2. Keyword targets

**Primary (own these):**
- design system drift
- keep design system in sync with code
- design system maintenance / automation
- AI-native design system

**Secondary / long-tail (blog + docs):**
- how to stop design system drift
- design tokens out of sync figma code
- design system decay / rot
- automate design system updates
- design system + Claude Code / Cursor

**Intent split:** landing targets *AI-native design system* + *drift*. `/audit` targets *fix / find design system drift* (high-intent). Blog targets the "how to" long-tail that feeds both.

---

## 3. Title tags + meta (per page)

**`/` landing**
- Title (<60): `Systemix — Stop your design system from rotting`
- Meta (<155): `Systemix watches what you ship, catches design-system drift, and proposes AI fixes your team approves. Open source. Free to start.`

**`/kit`**
- Title: `Systemix AI Kit — Run the loop, pay once ($249)`
- Meta: `The full design-system validation loop, pre-wired for your AI coding tool. Pay once, own the files, no subscription.`

**`/audit`**
- Title: `Free design system audit — find your drift | Systemix`
- Meta: `Send your repo. We run the loop once and show you exactly where your design system is drifting. Free, 10 minutes.`

**`/docs`** — keep descriptive per-page titles; target the "how to" long-tail here.

---

## 4. On-page structure (SEO hygiene, low effort, high return)
- One `<h1>` per page, keyword in it (see decks).
- Deep-dive headlines as real `<h2>`s — they double as keyword surface.
- FAQ marked up with FAQPage schema (JSON-LD) → eligible for rich results.
- Kit price marked up with Product/Offer schema.
- Descriptive alt text on every product mockup (e.g. "Systemix drift report showing token diff").
- Internal links: landing → `/kit`, `/audit`, `/docs`; `/audit` ↔ `/kit` cross-promo; blog posts → landing.
- `llms.txt` at root (noted as a gap in your memory) — ship a plain-text product summary for AI tools. Cheap, on-brand, and a differentiator.

---

## 5. GTM — where the first users come from
Ordered by fit, not reach. Do one well before adding the next.

1. **Open source as the funnel.** Free `npx @getsystemix/cli init` is the top of funnel. GitHub README = a second landing page; mirror the hero line there. A star is a lead.
2. **Show, don't tell — dogfood proof.** "This site runs on Systemix and picks its own headlines" is your single strongest asset. Put a live "the loop chose this" badge/section on the landing. It's the demo.
3. **Design-engineering communities.** Where design-eng and AI-native teams already are: relevant Discords/Slacks, r/DesignSystems, Hacker News (Show HN: "I built a tool that keeps design systems from rotting — and it runs its own site"). Lead with the dogfood story, not features.
4. **Long-tail content.** 4–6 short posts on the "how to" keywords (§2). Each ends in `npx @getsystemix/cli init`. Low volume, high intent, compounds.
5. **The free audit as a wedge.** `/audit` turns a cold repo into a warm conversation and a proof-generating case study. Feed outcomes back into the proof wall.

**Channel priority for a two-person studio:** 1 + 2 first (near-zero cost, plays to your strength), then 3, then 4/5.

---

## 6. Conversion levers (what actually moves the number)
- **One primary action per page.** Landing = `npx @getsystemix/cli init`. `/kit` = buy. `/audit` = submit form. Don't split attention.
- **Copy the install command, don't gate it.** Friction-free `install_command_copied` is your cleanest activation signal.
- **Anchor the price.** ~~$299~~ $249, "pay once, no subscription" — the anchor and the no-meter promise do the work.
- **Reduce risk out loud.** Ghost mode ("never touches your code"), "you own the files," "no sales call" — permission-granting beats hype for this audience.
- **Build-vs-buy table = the money section.** ~68 hrs vs $249 is the rational close. Keep it honest; verify the hours.
- **Measure what matters:** `install_command_copied` (activation), `kit_requested` (revenue intent), `audit_requested` (pipeline), `book_a_call` (team). Everything else is secondary.

---

## 7. Open inputs needed from you
1. **Real metrics** for the strip (decisions/experiments recorded) — or approve deriving from `LEARNINGS.md` at build.
2. **Verify build-vs-buy hours** against real effort.
3. **Refund policy** for `/kit`.
4. **Proof/quotes** for `/audit` wall (or ship with the dogfood line until you have them).
