# DS ↔ Systemix Skills ↔ Figma — Review & Update Path

**Derives from:** [`design-system-setup.md`](./design-system-setup.md). This is the
review of the shadcn DS against the Systemix skills, plus the **runbook to update
Figma later**.

> Source of truth = **code** (`src/app/globals.css`). Figma is a mirror, pushed via
> skills. The reverse (`/tokens`) only runs when Figma is intentionally ahead.

---

## 1. The pipeline (tokens)

```
globals.css ──npm run tokens──▶ .systemix/tokens.bridge.json ──/sync-to-figma──▶ Figma Variables
   ▲  (source of truth)              (hex/rgba + metadata)        (token-writer → figma-writer, HITL)
   └────────────────────────── /tokens ◀── Figma  (only when Figma is intentionally ahead)
```

- `npm run tokens` = `scripts/token-converter.ts` (oklch → hex/rgba, builds the bridge).
- `/sync-to-figma` does: **staleness check** (bridge vs globals) → **bootstrap
  detection** → spawn `token-writer` → `figma-writer` (its own HITL gate) → report
  updated / in-sync / no-counterpart.

## 2. ⚠️ Bootstrap caveat (read before first push)

`/sync-to-figma` **only updates existing Figma variables — it cannot create them.**
Today the Figma file has **none**:

- File: **"Systemix — Token Bridge"** `h1m7dfFILe1wGSfxwQ6U02`
- `.systemix/systemix.json`: `variableIds: {}` for all collections, `lastSync: null`.

So a first push needs the collections + variables created first. Two ways:
- **Manual:** in Figma, create collections `Semantic` (Light+Dark), `Status`
  (Light+Dark), `Spacing & Radius` (Default), `Typography` (Default), then run
  `/sync-to-figma` to fill values.
- **Programmatic (recommended):** use the **Figma Console MCP** (Figma Desktop
  open) — `figma_create_variable_collection` + `figma_batch_create_variables` — to
  bootstrap from the bridge, then `/sync-to-figma` for ongoing updates. Write the
  returned `variableIds`/`modeIds` back into `.systemix/systemix.json`.

## 3. Skill map (DS artifact → skill → MCP → direction)

| DS artifact | Skill | MCP | Direction |
|---|---|---|---|
| Tokens (Figma → CSS) | `/tokens` | `mcp__claude_ai_Figma__get_variable_defs` (read) | Figma → code |
| Tokens (CSS → Figma) | `/sync-to-figma` | `figma-console` (write, via `token-writer`/`figma-writer`) | code → Figma |
| Token bridge build | `npm run tokens` | — | local |
| Component (Figma → code) | `/component` | official Figma REST (read) | Figma → code |
| Component ↔ Figma link | `/connect` | official Figma Code Connect (`get/send_code_connect_map`) | both |
| Story verify | `/storybook` | file + official Figma | check |
| Drift audit (hardcoded values) | `/drift-report` | local + `get_variable_defs` | check |
| Parity (Figma vs code) | `/check-parity` | official Figma REST (read) | check |
| Brand re-skin | `/apply-theme` | `get_variable_defs` | code |
| Scrape a look → diff | `/style-match` | web scrape → globals diff | code |
| Page → Figma frame image | `/figma-push` | `figma-console` `set_image_fill` | code → Figma |
| Inspect selected node | `/figma-inspect` | `figma-desktop` (port 3845) | read |

**Decision rule (from `CLAUDE.md`):** read from Figma → **Official** MCP (no
Desktop); write to Figma → **Console** MCP (Desktop open); Code Connect → Official.

## 4. Runbook — "update the DS in Figma later"

**Tokens:**
1. Edit token values in `src/app/globals.css`.
2. `npm run tokens` → regenerate `.systemix/tokens.bridge.json`.
3. *(first time only)* bootstrap collections/variables in Figma (§2); persist IDs
   to `.systemix/systemix.json`.
4. Open Figma Desktop (Console MCP needs it). Run `/sync-to-figma` → review the
   HITL diff → confirm.
5. Verify: `/check-parity` (Figma vs code) and `/drift-report` (no hardcoded vals).

**Components:**
1. `/component <figma-url>` to (re)generate a primitive, or build in code.
2. `/connect` to map the code component to its Figma component (Code Connect).
3. `/storybook` to verify the story vs the Figma spec.

**Re-skin for a client:**
1. `/style-match <url>` or `/apply-theme <brand>` → primary color + font override.
2. `npm run tokens` → `/sync-to-figma` so Figma reflects the client theme.

## 5. Review findings (gaps & risks to resolve)

| # | Finding | Action |
|---|---|---|
| R1 | **Typography not in the bridge** — fonts + font-size scale live in `globals.css` but aren't synced to Figma. | Add a Typography collection to `scripts/token-converter.ts` (`design-system-setup.md` §5.1). |
| R2 | **Figma not bootstrapped** — `variableIds: {}`, `lastSync: null`; `/sync-to-figma` would no-op. | Bootstrap via Console MCP, persist IDs (§2). |
| R3 | **Derived radius is calc-only** — sm/md/lg/xl won't carry real values to Figma. | Emit explicit radius values in the bridge. |
| R4 | **Components not contracted/Code-Connected** — no `contract/components/*` for the 12 primitives, no Code Connect map. | Contract + `/connect` each primitive. |
| R5 | **Console MCP needs Figma Desktop** — any write step fails headless/CI. | Note in docs; bootstrap + pushes are an interactive step. |
| R6 | **Chart tokens absent** — if any surface uses charts, tokens are missing. | Decide per `design-system-setup.md` §6.3. |

## 6. Definition of done (DS in Figma)
- All four collections (Semantic, Status, Spacing & Radius, Typography) exist in
  the Figma file with Light/Dark where applicable.
- `.systemix/systemix.json` has non-null `variableIds`/`modeIds` and a `lastSync`.
- `/check-parity` reports clean; `/drift-report` finds no hardcoded values.
- The 12 primitives have contracts + Code Connect mappings.
