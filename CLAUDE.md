# Systemix — Claude Code Briefing

## Session Start (always do this)
On every new session or after `/clear`: read `~/.claude/projects/-Users-boyan/memory/MEMORY.md` and any linked memory files, then confirm: "Memory loaded. Systemix context ready."

## What This Is
A design-code sync pipeline. Keeps a Next.js design system in sync with Figma bidirectionally using Claude Code skills (slash commands) and MCP servers. Live at **https://systemix-alpha.vercel.app**

## Current Status (as of 2026-03-29)
- Canvas built and deployed at systemix-alpha.vercel.app
- Token pipeline built — 31 tokens pre-converted to hex/rgba in `.systemix/tokens.bridge.json`
- Skills fixed and in sync — 12 skill definitions in `pipeline.ts` match disk SKILL.md files
- Figma file created: **"Systemix — Token Bridge"** (`h1m7dfFILe1wGSfxwQ6U02`)
- Next: push tokens to Figma (`/sync-to-figma`), then capture `/pipeline` page (`/figma-push`)

## Key Files
| File | Purpose |
|---|---|
| `src/app/globals.css` | Source of truth — oklch CSS variables |
| `.systemix/tokens.bridge.json` | 31 tokens pre-converted to hex + rgba for Figma (31 tokens, 3 collections) |
| `.systemix/systemix.json` | Manifest — fileKey, modeIds, variableIds written back after each sync |
| `scripts/token-converter.ts` | Converts globals.css → tokens.bridge.json (`npm run tokens`) |
| `src/lib/data/pipeline.ts` | All 15 skill definitions with prompts |
| `src/components/pipeline/PipelineBeam.tsx` | Hero diagram: Figma ↔ skill nodes ↔ Codebase with MCP badges |

## Figma File
- **File:** Systemix — Token Bridge
- **Key:** `h1m7dfFILe1wGSfxwQ6U02`
- **URL:** https://www.figma.com/design/h1m7dfFILe1wGSfxwQ6U02
- **Variables status:** not yet pushed (systemix.json has nulls for modeIds/variableIds)

## Token Collections (ready to push)
| Collection | Modes | Count |
|---|---|---|
| `Semantic` | Light + Dark | 26 COLOR (color/*, sidebar/*) |
| `Status` | Light + Dark | 4 COLOR (synced, drifted, stale, new) |
| `Spacing & Radius` | Default | 1 FLOAT (radius/base = 8px) |

## MCP Servers
| Server | Prefix | Purpose | Needs |
|---|---|---|---|
| Official Figma MCP | `mcp__claude_ai_Figma__*` | Read design context, get vars, create files | Figma OAuth |
| Figma Console MCP (southleft) | `mcp__claude_ai_Figma_Console__*` | Write variables, execute Plugin API, create nodes | FIGMA_ACCESS_TOKEN + Desktop Bridge cloud relay |
| Figma Desktop Bridge | `mcp__figma-desktop__*` | Local bridge to Figma Desktop (write ops only) | Figma Desktop on port 3845 |
| GitHub | `mcp__github__*` | Repo operations | token in ~/.claude.json |
| Vercel | `mcp__claude_ai_Vercel__*` | Deploy, logs | Vercel OAuth |

## Skills Architecture

**Pipeline skills** (15 skill definitions in `src/lib/data/pipeline.ts`):

| Skill | Command | MCP |
|---|---|---|
| Extract from Figma | `/figma` | `mcp__claude_ai_Figma__*` (REST, read) |
| Sync Tokens | `/tokens` | `mcp__claude_ai_Figma__get_variable_defs` |
| Generate Component | `/component` | `mcp__claude_ai_Figma__*` (REST, read) |
| Read & Verify Stories | `/storybook` | file-based + Official Figma MCP |
| Build & Deploy | `/deploy` | `mcp__claude_ai_Vercel__*` |
| Sync Tokens to Figma | `/sync-to-figma` | `mcp__figma-console__*` (via token-writer agent) |
| Push to Figma | `/figma-push` | `mcp__claude_ai_Figma_Console__figma_set_image_fill` |
| Inspect Figma Node | `/figma-inspect` | `mcp__figma-desktop__*` (preferred) / REST fallback |
| Full Sync | `/sync` | Both REST + Console MCPs |
| Full Pipeline | `/design-to-code` | Both REST + Console MCPs |
| Drift Report | `/drift-report` | `mcp__claude_ai_Figma__get_variable_defs` |
| Apply Theme | `/apply-theme` | `mcp__claude_ai_Figma__get_variable_defs` |
| Link Components | `/connect` | `mcp__claude_ai_Figma__*` (Code Connect) |
| Check Parity | `/check-parity` | `mcp__claude_ai_Figma__*` (REST, read) |
| Annotate Deploy | `/deploy-annotate` | Vercel MCP + `mcp__claude_ai_Figma__*` |

**Read operations** use Official Figma REST MCP (`mcp__claude_ai_Figma__*`) — no Desktop required.
**Write operations** use Figma Console MCP bridge (`mcp__figma-console__*`) — requires Figma Desktop on port 3845.

## TokenGuard
Token optimization layer for Figma MCP workflows. Full plan: `docs/token-intelligence.md`
- Phase 8 (Foundation): pre-fetch, cache, node map, session handoff — BAST-71 to BAST-75
- Phase 9 (CLI/Beta): --dry-run estimator, scope flags, dashboard, scheduler, profiler — BAST-76 to BAST-80
- Phase 10 (Distribution): MCP proxy, auto-register, GitHub Action, npx install — BAST-81 to BAST-85

### TokenGuard CLI
- `npx systemix add token-guard` — install TokenGuard
- `npx systemix token-guard status` — verify setup
- `npx systemix sync --dry-run` — estimate token cost
- `npx systemix sync --budget 30000 --incremental` — safe CI mode
- `npx systemix token-profile ./src` — scan for inefficiency patterns
- `npx systemix schedule run --when auto` — schedule off-peak run

## Dev
- App runs on **localhost:3001** (`npm run dev`)
- Deploy: `vercel --prod --yes` from project root
- Token regen: `npm run tokens` (runs `npx tsx scripts/token-converter.ts`)

## Capture Plan (localhost → Figma)
1. `/sync-to-figma` pushes bridge.json → Figma Variables, writes variableIds to systemix.json
2. `/figma-push http://localhost:3001/pipeline`:
   - Screenshots the page and places it as an image fill on a Figma frame
   - Use `/figma-push [url] [figma-url?node-id=...]` to target a specific frame
3. Update loop: change CSS → `npm run tokens` → `/sync-to-figma` → all bound nodes update
