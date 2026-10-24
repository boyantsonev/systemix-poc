---
title: "Options (raw) — packaging, presentation, stack, positioning"
wave: DIVERGE
feature: ai-native-ds-kit-beta
date: 2026-10-11
status: DRAFT — written from desk research; re-score after G1 interviews
---

# Options (raw)

Four independent choices. Each option is scored on six criteria, 1 (poor) to 5 (strong):
- **€-speed:** time to first euro.
- **Lane fit:** how well it uses the uncontested lane (evidence / decision memory).
- **Solo-able:** whether one founder can run it.
- **Tailwind-proof:** whether it avoids selling code that agents regenerate.
- **Distribution:** whether it creates its own reach.
- **Learn-speed:** how fast it produces validation signal.

## A. Packaging (what is free, what is paid)

| | Option | €-speed | Lane fit | Solo-able | Tailwind-proof | Distribution | Learn-speed | Notes |
|---|---|---|---|---|---|---|---|---|
| P1 | **Pure OSS kit**, monetize later | 1 | 2 | 4 | 5 | 4 | 2 | Stars without revenue; the category is already free and 100k★-crowded |
| P2 | **Open-core kit + paid AI SaaS pack** (code licence) | 3 | 2 | 3 | **1** | 3 | 3 | The Tailwind trap: UI code is what agents regenerate. Only the *wired + instrumented* part is defensible |
| P3 | **Kit + productized audit report + implementation** (agent-assisted service) | **5** | 4 | 4 | 5 | 4 | **5** | The report is automated and customized (scalable); implementation is cash and case studies; it uses Vero's proven score loop |
| P4 | **Service-first DS agency** (the kit stays internal) | 4 | 2 | 2 | 5 | 1 | 4 | Fast cash, no compounding asset, no distribution |
| P5 | **Hosted evidence loop SaaS** (scheduled loop + benchmark data) | 1 | **5** | 2 | 5 | 2 | 1 | The long-term moat, but it needs ADR-006 to reopen and has no demand signal yet |

## B. Presentation (App Shell next to the Design Hub)

| | Option | Notes |
|---|---|---|
| S1 | **Evolve `packages/app`** (own build) with a Design Studio-compatible file layout and a static Hub export | Reuses the existing local server; full control over the evidence UI; one app, two layouts |
| S2 | **Build on Design Studio** (fork it, or ship an "evidence" module upstream) | Least UI work and borrowed distribution, but it depends on a 4★, weeks-old project's roadmap; Vite-sandbox prototypes vs our "prototypes live in your product" |
| S3 | **Interop only**: export to Design Studio, Claude Design and v0; no own shell | Cheapest; gives up the surface where evidence is seen; Claude Design overlap |

## C. Reference stack for the kit

| | Option | Notes |
|---|---|---|
| K1 | **Next.js + Tailwind v4 + shadcn registry**; Tamagui only as a token emitter | Tailwind v4 reads `tokens.css` directly (no generated layer); copy-in components; agents are most fluent here; MIT-clean; matches Systemix and Instance B |
| K2 | **Tamagui (Vero's stack)** | Web + native from one tree, but licence entanglement in the reference repo, build-time drift (stale CSS, sub-theme overrides) and less agent fluency |

## D. Positioning (one line, frozen for ~10 weeks)

| | Line | Notes |
|---|---|---|
| L1 | "Systemix — the design system agent" | The founder's framing; names an actor, not a file format; fits audit + implementation |
| L2 | "The design system that remembers why" | Names the uncontested lane (decision memory); weaker on "what do I get today" |
| L3 | "The AI-native design system kit" | A category descriptor; it puts us in the free, crowded category |
| L1+L2 | **"Systemix is the design system agent for AI-native products. It sets up an open-source design system your agents build with, audits what they ship, and improves it in loops that remember why."** | Agent = the product; kit = the on-ramp; audit = the wedge; memory = the moat |
