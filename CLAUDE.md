# Systemix — Claude Code Briefing

## Session Start (always do this)
On every new session or after `/clear`: read `~/.claude/projects/-Users-boyan-projects-systemix-poc/memory/MEMORY.md` and the linked memory files, then confirm: "Memory loaded. Systemix context ready."

## What This Is
Systemix is **the evidence / self-training layer for a design system**. A builder sets up a context-based design system, builds prototypes, measures them (PostHog), validates assumptions — and the reasons + decisions are written back into the living design system, on a schedule, in Claude Code. The loop is the product; **this repo runs on its own contract (it is the demo of itself)**. Live: https://getsystemix.vercel.app

**Direction: out of alpha → public release.** The approved architecture is the **v5 plan** at `~/.claude/plans/help-me-plan-and-golden-seahorse.md` (and memory `project_public_release`). Read those before non-trivial work.

## Current Status (2026-07-09)
Public-release groundwork (Phase 0) in progress:
- ✅ Landing tightened + artifact-forward (denser sections, live loop pulled up), marketing `/for/<persona>` routes removed (personas stay as a home section + `/docs` guides), docs pruned (dropped Deferred TokenGuard docs + stale `_archive`, moved superseded scratch)
- ✅ `write-policy` self-modification safety rail (skill/guardrail writes = always HITL)
- ✅ `design/` instance template (`packages/cli/templates/design/`) — the spine
- ✅ Hermes re-pointed Ollama → deterministic (engine = Claude Code)
- ✅ `npx @getsystemix/cli init` scaffolds `design/` + a per-instance `CLAUDE.md`, ghost-at-init
- ⬜ migrate the POC's own runtime-state readers (MCP/app) off `.systemix/` into `design/.state/`
- Next: the validation loop (build-first), code-first drift + claude-design-sync, the scheduled routine, distribution + fumadocs docs.

## Model (v5)
- **Unit of evidence = the prototype/idea**, NOT components. No usage telemetry.
- **`design/` = the design-system-as-object** (what `init` vendors): `DESIGN.md` (source of truth) · `guardrails.mdx` · `tokens.css` · `decisions/` · `goals/` · `.state/`. Skills live in `.claude/skills/`; the root `CLAUDE.md` links them.
- **Code-first**: tokens are canonical in CSS. **Figma is optional/deferred** (a design-engineer adapter), not the spine.
- **Engine = Claude Code.** A local LLM (Ollama) is NOT a dependency.
- **Autonomy dial**: ghost / assisted / autonomous; instances start at **ghost**; self-modification (skills + guardrails) is always HITL, even autonomous.
- **Packaging**: free kit → paid scheduled loop → team.

## Key Files
| File | Purpose |
|---|---|
| `packages/cli/` | the `systemix` CLI — `init` vendors the instance (the product) |
| `packages/cli/templates/design/` | the `design/` spine template `init` copies into a repo |
| `packages/cli/templates/CLAUDE.md` | the per-instance loop orchestrator `init` writes to a repo root |
| `packages/cli/src/lib/layout.js` | single source of truth for the `design/` layout |
| `packages/mcp-server/` | the file-backed MCP (`contract_*`, hitl, events) |
| `src/app/globals.css` | the POC's own token source of truth (oklch) |
| `contract/` + `.systemix/` | the POC's own live contract + runtime state (it dogfoods itself; migrating to `design/`) |
| `src/lib/contract/` | contract MDX parsing, memory write-back, `write-policy` (autonomy) |
| `scripts/token-converter.ts` | globals.css → tokens.bridge.json (`npm run tokens`) |

## The loop (skills)
Core: `/init-experiment` → `/write-variants` → `/measure` → `/close-experiment` (captures the decision into the contract Memory) · `/growth-audit` + `/hermes` (synthesize evidence; propose skill/guardrail improvements as HITL) · `/drift-report` (code-first drift). The Figma skills (`/figma`, `/tokens`, `/sync-to-figma`, …) are the **optional** design-engineer adapter.
Runner: `systemix loop [<id>]` (CLI, daily cron `systemix-loop.yml`) Ralph-drives running experiments to **decision-ready** — evidence pull → evaluate vs thresholds → close-proposal HITL card. It never closes; humans close.
Engine (generate stage): `/propose-experiment` (weekly cron `systemix-engine.yml`, needs `ANTHROPIC_API_KEY` secret) drafts the ONE next bet from LEARNINGS + ODI + goals via `systemix propose context|queue` → hypothesis-proposal HITL card; approving on Home scaffolds the contract. Propose-only.
**Recall before building**: before product/UI changes run `systemix experiment learnings --recent 5`; don't contradict a high-confidence learning without flagging it; cite learning ids in PRs and backlink with `systemix experiment used <prior-id> --by <id>`.

## MCP Servers
- **GitHub** (`mcp__github__*`), **Vercel**, **PostHog** — active.
- **Systemix MCP** (`packages/mcp-server`) — the file-backed contract/HITL protocol.
- **Figma** (Official read / Console write / Desktop bridge) — **optional/deferred** under code-first v5. See `docs/figma-mcp-guide.md` only if using the design-engineer adapter.

## Dev
- App: `npm run dev` (**localhost:3001**)
- CLI tests: `npm --prefix packages/cli test` (Jest) · app tests: `npm test` (Vitest)
- Deploy: `vercel --prod --yes` · Token regen: `npm run tokens`

## Names & environments (canonical — don't reintroduce drift)
- **GitHub repo:** `boyantsonev/systemix-poc` · **Vercel project:** `systemix` (team `pivotool`)
- **Production** = `main` → **`getsystemix.vercel.app`** (the ONE canonical URL; link this everywhere)
- **Staging** = automatic per-branch/PR Vercel previews (`systemix-git-‹branch›-pivotool.vercel.app`) — no dedicated staging domain
- The other `*.vercel.app` domains (`systemix-blond`, `systemix-pivotool`, per-deploy hashes) are Vercel auto-noise — never reference them

## Deferred (out of v1, see the plan's "OUT of scope")
TokenGuard / mcp-proxy, the `github-action` package, the `figma-plugin`, and the Next.js control-plane app (→ Team tier).
