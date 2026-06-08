# Marketing Docs IA — Tree & Migration Map

**Derives from:** [`product-model.md`](./product-model.md). Scope = the **marketing
docs site** (`getsystemix.vercel.app/docs`), **not** the in-app System surface.

**Engine (kept):** MDX in `content/docs/*.mdx` → `gray-matter` →
`next-mdx-remote/rsc`; manifest-driven nav via `src/lib/docs-manifest.ts` +
`src/components/systemix/DocsSidebar.tsx`; kept **sync-docs-compatible**
(`.claude/skills/sync-docs.md`).

Structure = **journey** top-level (Install → Configure → Run → Extend) with
**role accents** (Operator / Designer / Engineer) as tags + an index chooser.

Source legend: **MIGRATE** = existing MDX moves with light edit · **MERGE** =
combine existing pages · **FRESH** = write new.

---

## The tree

### Get started
| Page | Scope | Source |
|---|---|---|
| `introduction` | What Systemix is — the loop spine + four surfaces, in one screen. | MIGRATE `concepts`/`introduction` (rewrite to lead with the loop + local app) |
| `quick-install` | Install + Ollama in <5 min. | MIGRATE `quick-install` |
| `first-run` | From `init` to a live loop — the happy path. | FRESH (was `guides/setup`, reframed) |

### Configure
| Page | Scope | Source |
|---|---|---|
| `init` | The init flow end to end. | FRESH (merge of `guides/setup` + CLI reality) |
| `feed-inputs` | Connect Figma / an existing repo / a desired UI. | FRESH |
| `define-hypothesis` | Define the first hypothesis at setup time. | FRESH (pulls from `concepts/hypothesis-validation`) |
| `config-reference` | `systemix.config.yaml` field-by-field. | FRESH (ground in `src/lib/state/instance-config.ts`) |
| `signals-secrets` | Signals + where secrets live (`~/.systemix`). | MIGRATE `reference/posthog` (broadened) |
| `autonomy` | Conservative / balanced / progressive. | FRESH |
| `self-improvement` | off / audit / tuning / auto. | FRESH |

### Run
| Page | Scope | Source |
|---|---|---|
| `surfaces/config` | The Config surface. | FRESH → links `surfaces-brief.md` |
| `surfaces/graph` | The Graph surface (3D force graph + runtime + role-routed HITL). | FRESH (was `concepts/instance-model`, reframed) |
| `surfaces/system` | The System surface — living styleguide (tokens/components/prototypes). | FRESH |
| `surfaces/atlas` | The Atlas surface — workflow catalog + inline prototype. | MIGRATE `concepts/workflow-atlas` |
| `the-loop` | The hypothesis loop, in depth. | MIGRATE `concepts/hypothesis-validation` |
| `theming` | Theme the shadcn shell from your DS (primary color + font). | FRESH |
| `concepts/contract` | MDX contracts. | MIGRATE |
| `concepts/evidence-layer` | How evidence is recorded + used. | MIGRATE |
| `concepts/hermes` | Local LLM synthesis. | MIGRATE |
| `concepts/hitl` | HITL & decision queue. | MIGRATE |
| `concepts/drift` | Drift detection & reconciliation. | MIGRATE |
| `concepts/quality-score` | Contract health 0–100. | MIGRATE |

### Extend
| Page | Scope | Source |
|---|---|---|
| `skills` | Skills & skill-packs library. | MIGRATE `skills` (keep the interactive TSX bits) |
| `cli` | CLI command reference. | FRESH (ground in `packages/cli`) |
| `mcp-server` | The Systemix MCP server. | MIGRATE `reference/mcp-server` |
| `figma-mcps` | The three Figma MCPs + decision rules. | MIGRATE `concepts/figma-mcps` (+ `docs/figma-mcp-guide.md`) |
| `tokenguard` | Token-budget layer. | FRESH (from `docs/tokenguard/*`, marked deferred) |
| `architecture` | System architecture. | MIGRATE `architecture` |

## Role accents
- Docs index gets a **"Start here for…"** chooser: Operator / Designer / Engineer,
  each linking the right journey entry points (e.g. Engineer → Configure/`init`;
  Designer → Run/`surfaces/system`; Operator → Run/`the-loop` + `surfaces/graph`).
- Add an optional **`audience`** field to MDX frontmatter (additive; values:
  `operator` | `designer` | `engineer` | `all`). Rendered as a tag chip.

## Manifest changes (`src/lib/docs-manifest.ts`)
- Keep the working `status` model (`published`/`review`/`draft`/`missing`/`stale`)
  and section grouping via `getNavSections()`.
- Replace the four current sections (Getting Started / The loop / The stack /
  Reference) with **Get started / Configure / Run / Extend**.
- Add optional `audience` to the `DocEntry` type.
- Keep every entry resolvable to a file or marked `external` — so `sync-docs`
  coverage stays green.

## Per-page source mapping
Every page above carries a MIGRATE / MERGE / FRESH verdict. The full keep/rewrite/
archive accounting for the *current* 17 docs + loose markdown is in
[`migration-cleanup.md`](./migration-cleanup.md).
