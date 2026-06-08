# What Systemix Is — The Decided Definition

**Derives from / supersedes:** [`../site-rebuild/product-model.md`](../site-rebuild/product-model.md)
§1–§3, `PLAN.md` §1, and ADR-006…009. This is the single canonical answer to "what is Systemix."

---

## The one-liner

> **Systemix is an embeddable engine that stands up and runs a living design system for a team.**

You `npx systemix init` it into your repo, point it at your **Figma / existing code / desired UI**
plus a **hypothesis**, and it scaffolds a **per-instance, local-first app** with three layers —
**Config, System, Atlas** — wrapped in an agentic **learning loop** that keeps your design system,
workflows, and landing in sync with **evidence, not memory**.

## Why this wording (it unifies three older framings)

Until now "what Systemix is" was said three different ways across the repo. They are not in
conflict — they are three altitudes of the same thing, and this definition stacks them:

| Older framing | Where | What it captures |
|---|---|---|
| "A learning loop around your design system." | `product-model.md` §1 | The **spine** — the reason it exists. |
| "Software-in-a-service that implements + keeps a design system alive." | `PLAN.md` §1 | The **deliverable** — it builds and maintains the DS. |
| "Embedded per-client instance via `npx systemix init`, local-first." | ADR-006…009 | The **shape** — how it ships and runs. |

The decided definition says all three at once: an **engine** (deliverable) you **init into your
repo** (shape) that runs a **learning loop** (spine).

## The loop (unchanged — still the hero)

> **ship → signals → Hermes synthesizes → decision (HITL) → written back to the contract → next
> ship starts from evidence.**

A hypothesis can be about **three kinds of value**, each living closest to one layer:

| Domain | Example hypothesis | Lives closest to |
|---|---|---|
| **UI** | "A coral primary CTA converts better than the neutral one." | **System** |
| **Workflows** | "Routing risky messages to *rewrite* before *send* lowers escalations." | **Atlas** |
| **Landing value-props** | "Leading with founder-pain framing lifts hero CTR." | the live landing the loop measures |

All three wrap one design system. The loop is the product's reason for being; the three layers are
how you operate it.

## It wears your brand

The app is a **shadcn shell themed by the client's design system** — it pulls a **primary color +
font** from the client DS instance, so the chrome *and every prototype it renders* match that
client's look & feel. Systemix wears your brand; it does not impose one. (The Connecta cream/coral
reference screenshots are this shell themed for Connecta.)

## What Systemix is **not**

- **Not** a hosted multi-tenant SaaS dashboard. The v1 central app is demoted to an optional,
  read-only control plane (ADR-006); the **client repo is the source of truth**, local-first
  (ADR-007).
- **Not** a generic component library or a Figma plugin. Those are *inputs/outputs*; Systemix is the
  engine that keeps them in sync via the loop.
- **Not** the marketing docs. The in-app **System** layer is a living styleguide; `getsystemix/docs`
  is how you install and use Systemix. See naming discipline in the
  [README](./README.md#naming-discipline-unchanged-still-load-bearing).
