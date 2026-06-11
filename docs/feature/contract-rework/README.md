# Contract Rework — the System layer becomes the Contract

**Status:** 🟡 DEFINED — narrative + model decided with the founder 2026-06-10; build not started.
**Derives from / supersedes:** amends [`../systemix-rework/app-three-layers.md`](../systemix-rework/app-three-layers.md)
§Layer 2 (System) and evolves the one-liner in
[`../systemix-rework/what-is-systemix.md`](../systemix-rework/what-is-systemix.md). Config and Atlas
layers are unchanged. ADR-010's three-layer count stands; the middle layer is renamed and re-scoped.

---

## The pivot in one paragraph

The middle layer stops being a **living styleguide** (tokens + component previews) and becomes the
**Contract** — the documented agreement between the team and the engine: *here is the brief, here are
the goals you must accomplish and validate, here is everything you've learned.* The design system
does not disappear; it demotes from "the product" to "a record the engine maintains while pursuing
goals." The loop — ship → signals → Hermes → decision → written back — was always the hero; the
Contract surface is the loop made readable.

## Decisions (founder Q&A, 2026-06-10)

| # | Question | Decision |
|---|---|---|
| 1 | Unit of the surface | **Composed hierarchy**: one living root Contract (brief + goals + memory) → Goal contracts → Hypothesis contracts (+ evidence + decisions) → Records appendix (tokens, components, workflows) |
| 2 | Primary audience | **Proof + operator** — public read-only demo instance is the sales demo; operator controls layer on top |
| 3 | Legacy agent UI (dashboard, queue, design-system, tokens) | **Per-contract + one ops view** — queue cards/evidence/activity render inside the contract they belong to; one thin global agent view lives with `/config`; `/dashboard` and `/design-system` retire as nav destinations |
| 4 | Vision altitude | **Ladder** — lead with the concrete job today, frame trust tiers as rungs toward the 1–2yr autonomous-engine arc |
| 5 | MVP goal types | All four: **landing (flagship)** · **design system (infra)** · **agentic experience via Atlas** · **brand/theme** — plus one unspecified fifth (open question below) |
| 6 | Naming | Layer = **Contract** (singular): the chosen hierarchy is *one* contract with goals inside; route `/contract` already exists (today a redirect — it flips to real). Plural "Contracts" rejected as label, fine in prose. |

## Files

| File | Contents |
|---|---|
| [`narrative.md`](./narrative.md) | The story we tell — one-liner, ladder, what we stop saying |
| [`contract-model.md`](./contract-model.md) | Hierarchy, file layout, frontmatter schemas, memory definition, Hermes write-access matrix |
| [`ia-and-migration.md`](./ia-and-migration.md) | New nav, route table old→new, agent-UI embedding, phased build plan |
| [`research-zero-base.md`](./research-zero-base.md) | Parallel zero-base track — greenfield IA + competitive scan written with **zero weight on the current /docs**, reconciled after the grounded plan |

## Naming discipline (updated)

- **Contract** — the per-instance layer at `/contract`: the living agreement, rendered from `contract/` MDX. Never "docs."
- **`/docs`** — marketing docs on how to install and operate Systemix. Never the instance contract.
- **"Design system"** — a *record set* inside the Contract (and the Figma/code artifacts it tracks). No longer a top-level surface name.
- **Agent UI** — operational interfaces (queue cards, runtime feed, activity). Lives embedded in contract pages + the `/config` ops view, not as standalone destinations.

## Open questions

1. **Fifth goal type** — founder selected "something else" beyond the four named types without specifying. Proposed: the **self-improvement meta-contract** (`self_improvement:` block already exists in `systemix.config.yaml` — Systemix audits its own loop). Confirm or replace.
2. **Queue schema** — HITL queue items need a `contractId`/`goal` field so cards can render inside their contract page (see [`ia-and-migration.md`](./ia-and-migration.md)).
3. **Public read-only mechanics** — MVP assumption: the demo instance is public as-is and operator actions remain in skills/CLI + local app; no auth work in this rework.

## Reconciliation — zero-base track merged (2026-06-10)

The parallel track ([`research-zero-base.md`](./research-zero-base.md)) was produced with zero
weight on the current implementation, then merged here. Market validation first: **"Contract" is
unoccupied naming territory** — nothing in the scan binds goals + evidence + memory + governance
into one document; the closest loop analog (Coframe) is a black box trusted via case studies.

| # | Zero-base delta | Disposition |
|---|---|---|
| 1 | The converting object is the decision — first-class pages, permalinks, contract diffs | **Adopted** — `/contract/decisions` ledger ([IA](./ia-and-migration.md)) |
| 2 | Status/time are content rendered from loop data, never prose | **Adopted** — Now/Verdict strip embeds, "as of" stamps |
| 3 | Pre-registration ("Done means" / "Kill if" frozen before evidence) | **Adopted** — `kill-if:` in the goal schema + "unchanged since" rendering |
| 4 | One corpus, two lenses — never fork marketing vs app | **Confirms** decision #2 |
| 5 | Proof mode shows live motion from the real dogfood instance, never seeded data | **Adopted** — Now strip; Phase C kills mock data; new risk #4 (label synthetic items until real signal wiring lands) |
| 6 | Persuasion depth = clickable provenance chain (claim → decision → synthesis → raw query) | **Adopted** — provenance invariant extended ([model](./contract-model.md)) |
| 7 | Publish the losers | **Adopted** — house style in [narrative.md](./narrative.md) |
| 8 | Autonomy = contract clause with a track record, not a settings page | **Adopted** — `## Autonomy` clause on the root contract; tier changes are ledger decisions |
| 9 | Memory = forward-looking claims with confidence, expiry, used-by backlinks | **Adopted** — memory format extended + `informed-by:` on hypotheses |
| 10 | The design system is the appendix or Systemix reads as a zeroheight clone | **Confirms** decisions #1/#3 |

Route mapping (the research designed root-level routes blind to the three-layer app): Now → the
root contract's Now strip · `/goals` → `/contract/goals/*` · `/decisions` → `/contract/decisions` ·
`/memory` → root `## Memory` (anchors as permalinks; split at ~10 entries) · `/activity` →
per-goal embeds + the `/config` runtime feed · `/signals` + `/autonomy` *controls* → `/config` (the
clause itself renders in the contract) · `/records` → the Records appendix.

**Deferred:** standalone `/queue` as the operator homepage (research IA idea #3) — conflicts with
decision #3 (`/config` consolidation); revisit if the extra click hurts operators. **Noted for
later:** "Run" as the noun for one loop turn (market-aligned vocabulary, not in MVP schemas).
