# How `npx systemix init` Works

**Derives from:** [`what-is-systemix.md`](./what-is-systemix.md) · reconciles ADR-008 (the
4-question wizard) with `product-model.md` §2's "forward shape." Scope = the **setup contract** that
turns a client repo into a running Systemix instance.

---

## The forward shape (what we communicate)

1. **`npx systemix init`** in the client repo.
2. **Feed inputs** — connect **Figma files**, **existing repos**, and/or a **desired UI setup**.
   These are what the loop will keep in sync.
3. **Define a hypothesis** — one of the three domains (UI / workflow / landing value-prop),
   e.g. a pre-seed MVP landing-tracking experiment.
4. **The agentic pipeline asks the rest** — it surfaces follow-up questions to wire the loop:
   signals (PostHog / Vercel / Figma / Social), autonomy / Hermes thresholds, self-improvement
   mode, trust tiers.
5. **Scaffold** — `init` writes the instance and stands up the app (see "What init writes" below).
6. **The app is initiated for that instance** — gated by what exists yet (see "Gates").

## Seed vs ceiling

The current `packages/cli` implements a **static four-question wizard** — *Surfaces / Signals /
Autonomy / Self-improvement* → writes `systemix.config.yaml` + `~/.systemix/config.json`. That is
**the seed, locked as ADR-008** and still the contract for *what config gets written*. The
**pipeline-driven flow above is the forward UX** — feed inputs → define hypothesis → pipeline asks
follow-ups. The wizard is how it works today; the pipeline is where it goes. One does not invalidate
the other: the pipeline ultimately produces the same `systemix.config.yaml` the wizard does.

## Init vs update (verified model)

- **New DS repo** → `init` **provisions** the instance (incl. naming the client DS GitHub repo) and
  writes `systemix.config.yaml` *before* the app can render — this solves the bootstrap.
- **Existing DS repo** → use **`systemix update`** (`packages/cli/src/commands/update.js`):
  re-installs skills, **preserves** `systemix.config.yaml`. `init`/provision is for **new** repos.
- Connecta's DS already exists as a standalone repo → its path is **update, not provision**
  (ADR-011/014).

## What `init` writes

| Artifact | Purpose |
|---|---|
| `systemix.config.yaml` | The instance topology — surfaces/layers, signals, Hermes (model/autonomy/thresholds), self-improvement, trust tiers. The **Config** layer reads/edits this. |
| `~/.systemix/config.json` | User secrets (Figma / PostHog keys) — **never** in the repo. |
| `.systemix/` | Run artifacts, `systemix.json` (runtime state: `activeRuns`, `hitlQueue`), `tokens.bridge.json`. |
| `.claude/skills/*` | The skills for the chosen surfaces (project-scoped, not `~/.claude`). |
| The **three-layer shadcn shell** | The per-instance app, themed by the client DS (build-time CSS vars). |

Agents start at **Trust Tier 0 (Ghost Mode)** — never autonomous until config grants it (ADR-008).

## Gates (the visibility rule)

The three layers light up in sequence as their prerequisites exist — this is the founder's
"Atlas only after a DS is created/synced" rule made precise:

| Layer | Renders when | Why |
|---|---|---|
| **Config** | **Immediately** after `init`. | `systemix.config.yaml` exists the moment init runs. |
| **System** | Once **DS tokens/components exist or are synced**. | A living styleguide needs a design system to show. |
| **Atlas** | Only after **init is complete AND a DS is created/synced**. | Prototypes render *in the client theme*; with no theme there is no meaningful Atlas. |

## The Connecta two-instance note (ADR-009)

A real engagement can run **two** instances, each with its own `systemix.config.yaml`:
the **design-system repo** (design-system loops) and the **consuming app** (landing/gtm surfaces +
PostHog signal). The hypothesis-validation loop binds to the **consuming app**, not the DS package.
This is the worked example, not a requirement for every client.

## Open follow-ups (not gating this round)

- Exact pipeline question set beyond the four wizard questions (forward UX detail).
- Whether anything stays central (cross-instance evidence registry, license, TokenGuard aggregate) —
  deferred per ADR-006; does not block the per-instance template.
