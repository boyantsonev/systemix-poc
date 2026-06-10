# The Contract Model — hierarchy, schemas, write access

**Status:** decided 2026-06-10 (founder Q&A). Schemas below are the build target for Phase B/D in
[`ia-and-migration.md`](./ia-and-migration.md).

---

## Hierarchy (decided: compose all three)

```
The Contract                contract/index.mdx          brief · goals index · memory
├── Goals                   contract/goals/*.mdx        one per task given to the engine
│   └── Hypotheses          contract/hypotheses/*.mdx   gain a goal: parent link
│       └── evidence + decisions (frontmatter fields + queue write-backs)
└── Records (appendix)      contract/{tokens,components,workflows}/*.mdx   schemas unchanged
```

Navigation reads the loop: **Contract → Goals → Hypotheses → Records.** Records are reached by
links from goals/hypotheses (and a flat appendix index), never as the headline.

## Root contract — `contract/index.mdx` (new file)

```yaml
---
type: contract
instance: systemix-demo
icp: pre-pmf-founder
autonomy: ghost          # mirror of systemix.config.yaml hermes.autonomy + trust tier, surfaced
created: 2026-06-10
updated: 2026-06-10      # touched on every write-back
---
```

Body sections (order fixed). The page opens with a generated **Now strip** (autonomy tier · last
action + timestamp · signals health · pending-decisions count) — prospects must catch the engine
mid-stride:

1. `## Brief` — what this instance exists to do, for whom. Human-authored; Hermes proposes edits only.
2. `## Autonomy` — the dial rendered as a **contract clause with a track record**: current tier, the
   write-access matrix (below), and the receipts from the queue archive — proposals approved /
   edited / rejected / overridden, auto-actions later reversed, and promotion criteria (e.g.
   balanced → high after 30 days under a 5% override rate). Changing the tier is itself a decision
   in the ledger.
3. `## Goals` — generated index of `contract/goals/*` with live status badges. Never hand-edited.
4. `## Memory` — append-only earned learnings (format below). Entry anchors are permalinks; split
   into its own page when entries pass ~10.
5. `## Decision log` — recent resolved cards; the full ledger lives at `/contract/decisions` (see
   [`ia-and-migration.md`](./ia-and-migration.md)).

### Memory entry format

Append-only, provenance required — one bullet per learning:

```markdown
- **2026-06-19 · velocity-gap framing wins** — confidence 0.82 · from [landing-velocity-gap-2026-06],
  decision: promote. Pre-PMF founders respond to "your system should learn every day" over generic
  sync value-props. Applies to: hero copy, deck positioning. Review by: 2026-09-19.
  Used by: — (renders from later hypotheses' `informed-by:` backlinks)
```

Written by `/close-experiment` (and later Hermes directly, per the matrix). An entry without a
source experiment is invalid — *memory is written from evidence, every entry cites the experiment
that earned it* (see the naming-collision note in [`narrative.md`](./narrative.md)). Entries are
**forward-looking instructions with expiry**, not changelog: each carries a confidence, a review-by
date (stale claims get flagged for re-validation), and *used-by* backlinks. Memory nobody visibly
consumes is a graveyard; backlinks render the loop eating its own learning.

## Goal contract — `contract/goals/<id>.mdx` (new type)

```yaml
---
type: goal
id: landing-validation
title: Build & validate the landing
given: "Build a landing page based on the velocity-gap thesis and prove it converts pre-PMF founders."
goal-type: surface       # surface | design-system | agentic-experience | brand | self-improvement
icp: pre-pmf-founder
status: active           # active | validated | killed | parked
success-criteria: "install_command_copied uplift ≥ 20% over control at ≥ 0.8 confidence"  # "Done means"
kill-if: "no uplift ≥ 5% after 4,000 sessions → escalate with a repositioning proposal"    # pre-registered failure
autonomy: propose        # observe | propose | write — may LOWER the instance default, never raise it
records:                 # linked records this goal touches
  - workflows/founder-landing
created: 2026-06-10
updated: 2026-06-10
---
```

Body: why this goal, constraints, and prose the engine may extend. Pages render *"criteria
registered <created> · unchanged since"* from git history — pre-registration is the strongest
rhetorical device on the surface: the reader sees the goalposts never moved. **Children are derived, not
listed:** a goal's hypotheses are found via the `goal:` backlink on hypothesis files — single
source, no double-entry to drift.

## Hypothesis contract — one-field delta

Existing schema (`type, id, section, hypothesis, icp, status, variants, result, decision,
confidence, evidence-posthog`) is untouched except:

```yaml
goal: landing-validation   # NEW — parent goal id, required
informed-by: []            # NEW, optional — memory entry anchors consulted when this bet was authored
```

**Migration fact:** all 6 existing hypotheses (`hero-vp-icp-match-2026-04`, the 5 `landing-*`) are
landing experiments → all get `goal: landing-validation`. The flagship goal is born with six
hypotheses of real history — that *is* the demo.

## Records — unchanged

`contract/tokens/*`, `contract/components/*`, `contract/workflows/*` keep their schemas and their
writers (sync skills, `npx systemix atlas build`). Only their *place* changes: appendix, linked
from goals. The Atlas catalog generator is unaffected.

## Hermes write-access matrix (the autonomy dial, made mechanical)

Instance default from `systemix.config.yaml` (`hermes.autonomy`, `trust:`); a goal's `autonomy:`
may only lower it. Every contract page renders an autonomy badge — who may write this document.

| Artifact | **ghost** (trust 0 — today) | **balanced** | **high** |
|---|---|---|---|
| Evidence fields (`result`, `confidence`, `evidence-posthog`) | propose via HITL | auto-write | auto-write |
| Hypothesis contracts (create / edit) | propose | draft + propose run | auto-create, auto-run within budget |
| Memory entries | propose | propose | auto-append (provenance still required) |
| Brief | propose | propose | propose |
| **Goals** | **human-only** (Hermes may propose) | propose | propose — **goals stay human-approved at every tier in the MVP**; relaxing this IS the 1–2yr arc |
| Record status fields (drift, parity) | auto via skills (already true today) | auto | auto + auto-resolve low-risk drift |

Two invariants:

1. **The covenant:** humans give goals. At no MVP tier does Hermes self-assign a goal.
2. **Provenance, clickable:** no memory or evidence write without a machine-checkable source
   (experiment id, signal snapshot) — and every claim on the surface must click through the full
   chain: **claim → decision → Hermes synthesis (quoted, dated) → raw signal query**. A dead end in
   the chain is a bug; it is where a skeptical buyer stops believing. Enforced in the skills
   (`/close-experiment`, `/hermes`) and CLI, not just prose.

Config alignment: confidence-band routing already exists (`hermes.thresholds: high 0.85 / medium
0.55`) — thresholds + the matrix together are **per-decision-type rules, not one global switch**,
which is the HITL-governance pattern the market scan recommends
([research §1.5](./research-zero-base.md)).
