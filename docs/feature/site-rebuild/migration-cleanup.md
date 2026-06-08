# Migration & Cleanup — Keep / Rewrite / Archive

**Derives from:** [`docs-ia.md`](./docs-ia.md). Accounts for **every** current
docs-site page and every loose markdown file. Rule: **move legacy to
`docs/_archive/`, never delete** (it's prior work — preserve it).

---

## A. Current docs-site MDX (17 pages, `content/docs/`)

All migrate into the new journey tree. Verdicts per page:

| Current file | New home (`docs-ia.md`) | Verdict |
|---|---|---|
| `introduction.mdx` | Get started / `introduction` | MIGRATE (rewrite intro to lead with loop + local app) |
| `quick-install.mdx` | Get started / `quick-install` | MIGRATE |
| `guides/setup.mdx` | Get started / `first-run` + Configure / `init` | MERGE/SPLIT |
| `concepts/hypothesis-validation.mdx` | Run / `the-loop` (+ Configure / `define-hypothesis`) | MIGRATE |
| `concepts/hermes.mdx` | Run / `concepts/hermes` | MIGRATE |
| `concepts/hitl.mdx` | Run / `concepts/hitl` | MIGRATE |
| `concepts/evidence-layer.mdx` | Run / `concepts/evidence-layer` | MIGRATE |
| `concepts/contract.mdx` | Run / `concepts/contract` | MIGRATE |
| `concepts/drift.mdx` | Run / `concepts/drift` | MIGRATE |
| `concepts/quality-score.mdx` | Run / `concepts/quality-score` | MIGRATE |
| `concepts/figma-mcps.mdx` | Extend / `figma-mcps` | MIGRATE (+ pull from `docs/figma-mcp-guide.md`) |
| `concepts/instance-model.mdx` | Run / `surfaces/graph` | MIGRATE (reframe as the Graph surface) |
| `concepts/workflow-atlas.mdx` | Run / `surfaces/atlas` | MIGRATE |
| `reference/mcp-server.mdx` | Extend / `mcp-server` | MIGRATE |
| `reference/posthog.mdx` | Configure / `signals-secrets` | MIGRATE (broaden) |
| `reference/skills.mdx` | Extend / `skills` | MIGRATE (keep interactive TSX) |
| `reference/architecture.mdx` | Extend / `architecture` | MIGRATE |

**New pages with no current source (FRESH):** `surfaces/config`,
`surfaces/system`, `theming`, `feed-inputs`, `config-reference`, `autonomy`,
`self-improvement`, `cli`, `tokenguard`.

## B. Loose markdown — Archive (move to `docs/_archive/`)

| File | Why |
|---|---|
| `docs/blog/evidence-layer-post.md` | Unlinked draft blog post |
| `docs/copy-spec.md` | Superseded copy spec |
| `docs/copy-spec-evidence-layer-draft.md` | Superseded copy spec |
| `docs/copy-spec-evidence-layer-FINAL.md` | Superseded copy spec |
| `docs/design-md-mapping.md` | Exploratory, superseded by MDX migration |
| `docs/design-md-evidence-spec-README.md` | Exploratory, superseded |
| `docs/gap-analysis-v1.md` | Superseded by `docs/feature/systemix-v2/discover/gap-analysis-v2.md` |
| `docs/supabase-setup.md` | v1 central model — not the embedded direction |
| `docs/team-workflow.md` | Stale workflow note |

## C. Loose markdown — Keep as reference (NOT in the docs site)

These stay where they are; they back the build, they aren't end-user docs:

- `PLAN.md`, `PROJECT_SUMMARY.md`
- `research/*`
- `decisions/ADR.md`, `docs/product/architecture/*`
- `docs/product/jobs.yaml`
- `docs/figma-mcp-guide.md` (feeds the `figma-mcps` page)
- `docs/token-intelligence.md` (feeds the `tokenguard` page)
- `docs/tokenguard/*` (6 files — feed the `tokenguard` page; mark **deferred**)
- `docs/feature/*` (including this folder)

## D. Manifest deltas (`src/lib/docs-manifest.ts`)
- Sections: **remove** Getting Started / The loop / The stack / Reference;
  **add** Get started / Configure / Run / Extend.
- Entries: re-slot the 17 MIGRATE pages; add the FRESH entries (status `draft`
  until written).
- Type: add optional `audience` to `DocEntry` (`operator|designer|engineer|all`).
- Keep every entry file-resolvable or `external` so `sync-docs` coverage is green.

## E. Verify after execution
- `docs/_archive/` contains the nine Section-B files; nothing under B remains at
  its old path.
- No file deleted (git shows renames/moves, not deletions).
- `sync-docs` run reports 0 `missing` for published/review entries.
