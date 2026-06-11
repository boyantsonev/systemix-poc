# IA & Migration — routes, agent-UI embedding, phased plan

**Inputs:** decisions in [`README.md`](./README.md), schemas in [`contract-model.md`](./contract-model.md).
Existing seams: `source.config.ts` (two Fumadocs sources), `src/lib/system-source.ts`,
`contract/meta.json`, `src/app/(app)/*`, `.systemix/queue.json`.

---

## New navigation (`contract/meta.json`)

```json
{
  "title": "Contract",
  "pages": [
    "index",
    "---Goals---",
    "goals/landing-validation",
    "goals/design-system",
    "goals/founder-loop-experience",
    "goals/brand-adoption",
    "---Ledger---",
    "decisions",
    "---Records---",
    "tokens",
    "components",
    "workflows"
  ]
}
```

The root index is the front page: Now strip → brief → live goals index → memory → recent decisions.
Goals are the nav spine; the **decisions ledger is the accountability spine**; records are the
appendix.

## Route table (old → new)

| Today | After | Notes |
|---|---|---|
| `/system`, `/system/[...slug]` | `/contract`, `/contract/[...slug]` | same Fumadocs source over `contract/`; re-rooted + new meta |
| `/contract` (redirect → `/design-system`) | **the real surface** | the redirect flips into the destination |
| `/design-system` | redirect → `/contract` | retired from nav |
| `/design-system/tokens`, `/components` (+ details) | `/contract/tokens/*`, `/contract/components/*` | tables become Records index pages in Fumadocs |
| `/design-system/hypotheses` (+ details) | under `/contract/goals/<goal>` | a hypothesis renders inside its goal's context |
| `/design-system/decisions` | `/contract/decisions` ledger (+ recent log on the root) | every decision gets a permalink page: proposal · evidence **frozen at decision time** · the routing rule that fired · the **MDX before/after diff** it caused · rollback annotation if reversed |
| `/dashboard` | retire → redirect `/config` | instance overview is Config's job (ADR-010 already says so) |
| `/queue` | global ops view inside `/config`; cards ALSO embed per-contract | see embedding spec below |
| `/docs` meta links `[System](/system)`, `[Dashboard](/dashboard)` | `[Contract](/contract)`, `[Config](/config)` | marketing alignment |
| `/docs` `concepts/contract.mdx` | rewritten to the new model | plus intro page gets the ladder |

Keep all old routes as redirects (muscle memory + deployed links).

## Agent-UI embedding spec (decided: per-contract + one ops view)

**Inside contract pages** (MDX React embeds, like today's `ContractMeta`):

- `<NowStrip />` — root contract, above the fold: autonomy tier · last action + timestamp · signals
  health dots · pending-decisions count. The engine caught mid-stride.
- `<VerdictStrip />` — top of every hypothesis page: VALIDATED / REFUTED / RUNNING / RETIRED chip ·
  relative lift **with denominator and window** ("+38% (3.1% → 4.3%) · 2,114 sessions · 14 days") ·
  confidence, grey-styled when not significant. Makes each hypothesis a citable **proof card**: the
  unit of marketing equals the unit of work.
- `<PendingDecisions />` — HITL cards filtered to this goal/hypothesis; the four inbox verbs
  **Approve / Edit / Reject / Respond** (operator; read-only when public), plus two mandatory lines
  per card: *"why this needs you"* (the rule that escalated it) and *"what happens next"*.
- `<EvidencePanel />` — evidence fields + cached signal snapshots, each read source-linked down to
  the raw query (the four-layer provenance chain).
- `<GoalActivity />` — recent runs/events scoped to the goal; reasoning excerpts expandable inline.

All status and time on these surfaces render **from loop data** (`contract/*` frontmatter,
`.systemix/*.json`) — never hand-written prose, which goes stale and silently falsifies the
product. And never seeded sample data: the public instance is the dogfood instance (Systemix on
Systemix's own contract), or the proof claim dies.

**Schema prerequisite:** queue items in `.systemix/queue.json` gain `goal` (goal id) and `subject`
(hypothesis/record id). Writers: `/hermes`, `/close-experiment`, `push_hitl_task` MCP tool.

**The one global ops view** lives with `/config` (per ADR-010's "runtime feed + role-routed HITL"):
cross-contract queue, runtime feed, autonomy/trust controls. `/queue`'s current UI migrates there;
no standalone agent-UI destinations remain in nav. Nav after rework: **Config · Contract · Atlas**.

## Phased build plan

Each phase is one PR, independently shippable, e2e-verified (Playwright suite exists).

| Phase | Work | Verify |
|---|---|---|
| **A — Rename & flip** (mechanical) | Re-root `/system` → `/contract` (routes, loader, scoped search); drop the legacy `/contract` → `/design-system` redirects (next.config + page) so `/contract` is real; add `/system/:path*` → `/contract/:path*` redirects; `meta.json` title "Contract" (flat, hypotheses first); update `/docs` nav links + manifest + role chooser + `/config` header link; add Contract to the app top bar (the `/design-system` hub keeps its nav item until C) | `npm run build` exit 0; e2e green incl. new `e2e/contract.spec.ts` (index + record render; `/system` and deep links redirect) |
| **B — Hierarchy** | Write `contract/index.mdx` (brief + memory seeded from closed experiments); 4–5 `goals/*.mdx` authored with pre-registered **Done means / Kill if** blocks (copy templates: [research §3.2](./research-zero-base.md)); add `goal:` to all 6 hypotheses; nav by goal | every hypothesis reachable under exactly one goal (parity script); build green |
| **C — Embedded agent UI + ledger** (as built) | Queue cards gain `goal`/`subject`; `GET /api/queue?goal=` scopes via the hypothesis `goal:` backlink (`src/lib/contract/goal-map.ts`); embeds: `<NowStrip/>` (live from `/api/instance` — autonomy, signals w/ honest no-key states, pending, last action), `<VerdictStrip/>` on hypothesis pages, `<PendingDecisions/>` (scoped HitlQueue) on root + goals + hypotheses — `EvidencePanel`/`GoalActivity` **folded** into VerdictStrip + scoped decision history (the only activity that exists today); **`/contract/decisions` ledger + per-decision permalinks** — real queue only, never demo; frozen-evidence/diff fields render as honest absences until Phase D captures them; deleted `/dashboard`, `/queue`, `/design-system/*`, `/projects/*`, `mock-projects.ts`, and the orphaned `HypothesisCreateButton`/`TokenResolveControl`/`/api/contract/resolve` (creation + drift-resolve stay skill-side); all old routes redirect; AppTopBar (kept — Atlas uses it) reads **Config · Contract · Atlas**; cross-links added to contract + config chrome | Vitest `api/queue/route.test.ts`: approve mutates `queue.json` + goal scoping + demo-fallback-is-empty; e2e: `/queue`→`/config` with queue visible, ledger renders real-only, goal page queue scoped-empty, `/design-system` redirects; the only demo data left is the *labeled* unscoped queue fallback (landing preview + ops view until real cards exist) |
| **D — Memory + write matrix** | `/close-experiment` writes provenance-bearing memory entries (confidence · review-by · used-by); root contract's `## Autonomy` clause renders the matrix + **track record** from the queue archive; matrix enforced in skills/CLI (ghost tier may never write directly — add a test) | dry-run close-experiment produces a valid entry; ghost-tier write attempt is rejected in tests; track-record numbers reconcile with `queue.json` |
| **E — Marketing alignment** | `/docs` intro gets the ladder; `concepts/contract.mdx` rewrite; landing "Surfaces" copy reads Config / Contract / Atlas | build + `e2e/landing.spec.ts` green |

Phase A is safe to ship immediately after this spec merges. B unblocks the demo narrative; C is the
biggest UX change; D makes the autonomy story real; E closes the loop publicly.

## Non-impacts (checked against the codebase)

- **Atlas**: `npx systemix atlas build` reads `contract/workflows/*` — unchanged (workflows stay
  records). `/atlas` routes untouched.
- **Token pipeline**: `globals.css` → `tokens.bridge.json` → Figma flow untouched; only where token
  pages *sit* changes.
- **`lib/data/docs.ts` / `sync-docs`**: keeps feeding the Records pages.
- **Velocity-gap experiment**: keeps running; Phase B just files it under the flagship goal.
- **Landing `/system` link**: the Surfaces card still points at `/system` and rides the redirect —
  deliberately untouched in Phase A because the landing is the live velocity-gap experiment page;
  its copy changes in Phase E (ideally after `/close-experiment`).

## Risks

1. **Fumadocs index-as-front-page** — root `index.mdx` with generated sections (goals index, memory)
   mixes generated + authored content in one file; keep generated blocks as React embeds reading the
   filesystem, not as written-back MDX, to avoid Hermes/human edit collisions on `index.mdx`.
2. **Queue schema change** touches three writers (skills + MCP) — version the field, tolerate
   missing `goal` on old items.
3. **Naming collision** ("memory") — resolved in narrative; enforce in copy review.
4. **"Never seeded data" vs today's partly-synthetic loop** — real Hermes/Ollama + PostHog wiring
   is still landing; until then any synthetic queue/evidence item must be *labeled* synthetic on
   the surface. One unlabeled fake card on the proof surface falsifies the whole claim.
