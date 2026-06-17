---
title: "nWave vs Systemix — what to take, what we have, what to skip"
type: competitive/reference analysis
date: 2026-06-13
sources:
  - https://github.com/nWave-ai/nWave (README, v3.15.1, 499★/51 forks, MIT)
  - https://nwave.ai/ (thin SPA landing; positioning from metadata)
---

# nWave vs Systemix

> The thing you intuited is the headline: **nWave's product *is* its GitHub repo.** A thin marketing
> SPA, deep in-repo docs, an MIT CLI, and **stars/forks as the traction signal**. It is dogfood and
> magnet at once. That model is directly transferable to Systemix — and validates the pivot.

---

## 1. What nWave is

An **agentic software-delivery framework that runs inside Claude Code** (also Codex, OpenCode),
installed via a Python CLI (`uv tool install nwave-ai && nwave-ai install`), MIT-licensed, ~94% Python.
Positioning: *"The deterministic Agentic AI framework for elite engineering teams. Do the work once,
ship it right. No rework from miscommunication, AI drift, or slop."*

It breaks feature delivery into **seven "waves"** — **discover · diverge · discuss · design · devops
· distill · deliver** — each a set of slash commands + specialized agents that emit a reviewable
artifact. A human approves before the next wave. **40 agents** total (10 wave agents, 1 concierge,
8 cross-wave specialists, 14 peer reviewers, 7 business agents).

Traction signals (public, on the repo): **499 stars, 51 forks, 77 releases, 101 commits, v3.15.1
(May 2026), active Discord, 14 issues.** Two-ish contributors. This is a small team using the repo as
both product and growth engine.

## 2. How it works

```
machine → documentation artifact → human review → human decision → machine continues → …
```

Never unsupervised end-to-end. Mechanics worth noting:

- **`/nw-buddy` concierge** — "What should I do next?" reads your project and returns a concrete next
  step. *Works day one, no config.* This is the planner/orchestrator node, productized as a question.
- **DES (the moat)** — a deterministic enforcement layer of **Claude Code pre-tool-use hooks** that
  gate TDD phases (RED→GREEN→COMMIT), validate every Bash/file action, and write an audit log
  (`des-audit.jsonl`). They explicitly say this **cannot ship via the plugin marketplace** (hooks
  aren't populated there) — so the CLI install *is* the product, and the hooks are the defensibility.
- **`/nw-rigor` profiles** — lean / standard / thorough / exhaustive / custom, each mapping a
  model (haiku/sonnet/opus) + reviewer + TDD depth + mutation testing + token cost. One command to
  **scale quality to stakes.**
- **Lean L7 artifacts** — each feature is one `feature-delta.md` with schema-typed headings
  (`## Wave: <WAVE> / [REF|WHY|HOW]`). Downstream agents **grep section headings** instead of reading
  whole directories — token efficiency by file format.
- **Doc density config** (lean vs full per wave) and an **outcomes registry** (design-time dedup of
  rules/operations before code is written).

## 3. What to take

| Borrow | Why it fits Systemix |
|---|---|
| **Repo-as-product + thin SPA + stars/forks as signal** | Validates the pivot. Ship Systemix as an MIT GitHub repo + `npx systemix` + deep in-repo docs; track **stars/forks as a first-class signal** alongside PostHog. The repo is the magnet. |
| **The `/nw-buddy` concierge** | Build **`/systemix next`** — a zero-config planner that reads the instance (config + contracts + queue) and says the next step. This is exactly the "planner picks the next node" idea, productized. Highest-leverage borrow. |
| **`/nw-rigor`-style profiles** | Collapse Systemix's `autonomy` + Hermes thresholds + engine choice (ADR-013) + Trust Tier (ADR-008) into **one `/systemix rigor` command**: lean (Ollama/haiku, no review) → thorough (Claude/opus, HITL on everything). Better UX than a static YAML. |
| **Named phases + reviewable artifact + human gate** | Systemix's loop already is this; adopt nWave's *discipline* of "every phase emits one artifact you approve." |
| **Lean single-file, grep-able section headings** | Apply the L7 idea to MDX contracts: schema-typed headings agents grep, lean/full density. Cheaper loop runs. |
| **Positioning craft** | The one-liner sharpness ("do the work once… no drift, no slop"), dog-tag brand, `/solutions` + `/team` even at 2 people. Systemix needs an equally sharp "design-ops" line. |

## 4. What Systemix already has (often richer)

- A **CLI + MCP server + 3 productized pipelines** (design-system, figma-to-code, hypothesis-validation),
  a GitHub Action, a Figma plugin. Distribution surface already exists.
- **The loop** (ship → signals → Hermes → HITL → evidence) — Systemix's domain equivalent of the
  waves, but tied to **real outcome signals (PostHog), not just code correctness.**
- **Hermes synthesis + HITL queue + Trust Tiers + autonomy config** — the same governance philosophy
  as DES/rigor, already present (and engine-selectable per ADR-013).
- **MDX contracts as the durable evidence layer** — richer than `feature-delta.md`: they carry
  experiment results and decision history, not just spec sections.
- **A real vertical: design systems + hypothesis validation.** nWave is generic SDLC; Systemix owns a
  domain. That's the differentiation.
- **You already use nWave's method to build Systemix.** The repo's `docs/feature/*/` folders
  (`discover/ diverge/ discuss/ design/`, `wave-decisions.md`, `recommendation.md`, `options-raw.md`)
  are nWave's seven-wave structure. So nWave is your **dev process**, not a product dependency — and
  you don't need to rebuild it.

## 5. What's hard to take

- **The DES hook engine** (`src/des`, Python, pre-tool-use hooks, TDD phase gates, audit log). It's a
  substantial deterministic-enforcement system in a different language (Systemix is TS/Next), and the
  enforcement target — TDD phases — isn't Systemix's gate. Systemix's gate is a **human approving a
  HITL card + evidence**, not RED→GREEN. High effort, low fit.
- **40 agents / 14 peer reviewers / mutation testing.** Tuned for code-delivery quality. Systemix's
  quality signal is product evidence, not test coverage. Don't port the army.
- **Multi-platform breadth (Codex, OpenCode) + Python packaging discipline.** nWave invested heavily
  here; for build-for-one, Claude-first is enough.

## 6. What we don't need

- **TDD/DDD/mutation/peer-review machinery** — wrong domain.
- **The 7-wave SDLC *as the product's structure*** — Systemix has its own loop. Take the *pattern*
  (named phases + gates + buddy), not the taxonomy. (Keep using the waves as your *dev* process.)
- **DES TDD phase enforcement** — Systemix enforces via HITL + Trust Tier, not code phases.
- **Outcomes registry / feature-delta validator** — code-delivery concerns.

---

## The relationship (and the real lesson)

nWave and Systemix are **complements, not competitors**: nWave delivers *code* with discipline;
Systemix keeps the *design system* alive and validates the *UI/experience* against evidence. You could
literally run Systemix's loop on a product that nWave built — and you already run nWave's waves to
build Systemix.

The transferable lesson is the **shape of the company**, not the code: a two-person team, an MIT repo
that is the product, thin marketing, deep docs, stars as proof, dogfooded on itself. Three concrete
moves for Systemix:

1. **Make the repo the product.** Public, MIT, `npx systemix`, in-repo docs as the depth. Demote the
   app further; let GitHub be the surface.
2. **Add `/systemix next` (the buddy)** — the zero-config planner. This is the nWave borrow with the
   highest payoff and it *is* the "operator" node we kept circling.
3. **Add `/systemix rigor`** — one command folding autonomy + engine (Claude/Ollama) + trust into
   lean→thorough profiles. Track **GitHub stars/forks as a signal source** next to PostHog.
