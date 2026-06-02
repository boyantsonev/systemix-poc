# Research Synthesis — Systemix × Connecta
_Generated: 2026-06-01 · Iteration-2 addendum: 2026-06-02_

> Strategic plan now lives in repo-root **`PLAN.md`** (multi-repo, client-agnostic). This file is the research-layer briefing.

## Track Summaries

**A1 — Wisprflow Brand:** Typography is confirmed and adoptable — **EB Garamond** (display) + **Figtree** (body), both Google Fonts, zero licensing friction. The hex values for the lavender accent and cream background are unconfirmed; the agent couldn't pierce the Webflow CDN. One DevTools session (~30 min) is required before token mapping can start. Animation stack is Webflow + GSAP; Framer Motion is ruled out. This unblocks the typography decision for Connecta but **blocks the full token spec** until hex values are confirmed.

**A2 — Connecta Codebase:** Hard architectural blocker. Connecta is pure Astro v4 with **zero React** — all `.astro` components, Cloudflare Workers adapter, no islands. Tamagui requires React. Adding Tamagui means a full framework migration to Next.js 15 before a single landing page pixel moves. The simpler path — if there is no React Native mobile app planned — is to stay on Astro and use Framer Motion instead. This is the highest-stakes open decision of the session.

**B1 — Analytics:** Microsoft Clarity is **disqualified** — ToS explicitly bans under-18 users. PostHog EU (Frankfurt) is the clear primary: free tier covers pre-launch, EU-hosted, existing Systemix integration, official MCP at `mcp.posthog.com`. No migration cost. Secondary question is whether to add Umami (cookieless, no consent banner) to reduce friction for K-12 parents.

**B2 — Social Signals:** UTM + Vercel Analytics already solves referrer attribution. The real gap is brand keyword monitoring in Reddit/X threads. Syften ($39.95/mo) covers this cleanly with no GDPR exposure. Apify MCP exists and works for periodic structured pulls but is overkill until there's meaningful mention volume. ClearCue AI is a B2B sales tool — wrong fit, needs a DPA, skip it.

---

## Iteration-2 Tracks (added 2026-06-02)

**C1 — Component Inventory:** A 9-section sidebar IA (Foundations → AI Conversation → Agentic Workflow → Learning → Administration → Trust & Safety → Navigation & Shell → Forms & Inputs → Feedback & States) that collapses to a mobile top tab bar. Reuses Vercel AI Elements + Shape of AI patterns; **K-12 Trust & Safety is the differentiator** (11 dedicated surfaces). A **persona switcher** (Student/Parent/Teacher) gates the UI. Unblocks: the preview page IA and the 12-component MVP set. Detail: `connecta-component-inventory.md`.

**C2 — Connecta Base Theme (Tamagui):** Merge of Wisprflow × Connecta — coral stays primary, lavender → secondary/links/focus, lime → fill-only, cream ground + EB Garamond + Figtree + 16px radius. Full light/dark `tamagui.config.ts` drafted. Unblocks: theme implementation. Two human calls remain (coral small-text contrast; motion lib = Tamagui+Moti recommended). Detail: `connecta-tamagui-theme.md`.

**Southleft skills (Figma bridge only):** [`southleft/figma-console-mcp-skills`](https://github.com/southleft/figma-console-mcp-skills) — 22 self-contained skills, scoped to the **Figma-integration layer**. They extend Systemix's `figma` / `sync-to-figma` / `tokens` / `check-parity` / `connect` skills (DTCG/CSS export, parity, Code Connect). They are **not** the docs loop — that is Systemix-native (`sync-docs` → `docs.ts` → `/docs`). Adopt southleft updates only where a skill touches Figma.

### Decisions resolved since iteration 1
- Native mobile **is** on the roadmap → **Next.js 15 + Tamagui** (resolves the A2 architectural flag).
- Connecta repo → **fork** to your org as `connecta-app`.
- Preview → **`/styleguide` route in the forked app**, Systemix-docs-loop-readable.
- This iteration → **plan only**.

---

## Open Decisions (human input required)

1. **Mobile app on roadmap?** → If yes: migrate Connecta to Next.js 15 + Tamagui now. If no: stay Astro + Framer Motion for launch, revisit later.
2. **Framework migration timing** → If migrating, do it before or after the landing page redesign? Doing it after means designing for a framework you're about to discard.
3. **Confirm Wisprflow hex values** → Schedule a 30-min DevTools session before the design token file is written. Everything downstream depends on it.
4. **PostHog + Umami complement?** → PostHog alone is sufficient technically. Adding Umami is a trust/narrative choice (cookieless = no consent banner for K-12 parents). Worth ~4 hours to set up if that story matters at launch.
5. **Syften: now or later?** → No meaningful mention volume yet. Recommended: set up UTM discipline now, add Syften at first sign of organic traction.

---

## Cross-Track Conflict

**A2 × A1:** The Wisprflow-inspired redesign is CSS/token work — it works on any framework. But if the framework migrates (A2 decision), all component rewrites happen once, not twice. Sequence matters: **resolve the Astro vs Next.js question before writing a single landing page component.**
