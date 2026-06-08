# Positioning — Message Architecture

**Derives from:** [`product-model.md`](./product-model.md). Read that first.

This doc fixes *what the site says and in what order*. It governs `landing-ia.md`
(section order/copy) and the docs index framing in `docs-ia.md`.

---

## Hero (kept, unchanged)

> **You shipped a hypothesis. Now close the loop.**

The hypothesis-loop hero is validated and stays. The local-app / three-layer
story is layered **beneath** it, not in place of it.

## The story stack (order beneath the hero)

1. **Hook — the loop.** The current promise: every experiment records its own
   result, permanently, in your repo. The next decision starts from evidence.
2. **It's a local app you install.** `npx systemix init`. Runs in your repo.
   Hermes on Ollama — no API key, no cloud, no data leaving your machine.
3. **It configures the loop to your inputs.** Feed Figma files / an existing repo
   / a desired UI setup; define your hypothesis; the agentic pipeline asks the
   rest.
4. **It wears your brand.** A shadcn shell themed by *your* design system (primary
   color + font pulled from your DS); prototypes render in your look & feel.
5. **Three layers.** Config (editable settings + the 3D force graph + runtime feed +
   role-routed HITL) · System (Fumadocs living design docs) · Atlas (workflows +
   inline prototype, gated behind init + DS sync).
6. **The loop, in depth.** The existing loop diagram + HITL preview card (reuse).
7. **The stack it connects.** PostHog / Ollama / Vercel / MCP / Figma (reuse).
8. **Who it's for.** The role lens — Operator (loops + HITL), Designer (System,
   tokens, drift, prototypes), Engineer (init, skills, MCP, CI).
9. **Quality gate + CTA.** Evidence-score tiers, then the install/run CTA (reuse).

## One-liners per layer (canonical — reuse verbatim in landing + docs nav)

- **Config** — "Your instance as one editable file, seen live as a force graph — topology, runtime, and the HITL queue."
- **System** — "Your design system, kept current by the loop — tokens, components, prototypes."
- **Atlas** — "Every workflow, by persona, with its prototype one click away."

## Copy principles

- Keep the existing **terse, mono, founder voice** already on the landing.
- **Lead with verbs.** "Install", "Feed", "Define", "Ship", "Close".
- **Gloss every new term in one line** the first time it appears (HITL, Hermes,
  drift, contract, surface).
- **Never mix "System" with "docs."** System = in-app living styleguide; Docs =
  the site you're reading. See `product-model.md` §5.
- Don't oversell the fresh surfaces as shipped — represent them honestly (the site
  *demos* them; see `surfaces-brief.md`).

## What this changes vs. today

- Today the landing tells **only** story-step 1 (the loop). Steps 2–5 (local app,
  setup-to-your-inputs, wears-your-brand, three layers) are **new** and are the
  point of the rebuild.
- The hero, loop diagram, HITL card, stack table, quality gate, and CTA are
  **kept/reused**; "Who it's for" is **recast** with the role lens.
