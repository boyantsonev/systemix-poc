# systemix

Agentic design-system + hypothesis-validation ops for Claude Code — installed **per repo** as a self-contained instance.

`npx systemix init` scaffolds an instance into your repo: skills land in **`.claude/skills/`** (project-scoped, committed, CI-reproducible), and your topology is written to **`systemix.config.yaml`**.

## Quick start

```bash
# in your project root
npx systemix init
```

The wizard asks four questions (your instance **topology**):

| # | Question | Writes to `systemix.config.yaml` |
|---|----------|----------------------------------|
| 1 | **Surfaces** — what are you validating? (design-system / hypothesis-validation / both) | `surfaces`, installed skills |
| 2 | **Signals** — what can Hermes read? (Figma, PostHog, Vercel, …) | `signals`, credentials → `~/.systemix/config.json` |
| 3 | **Autonomy** — how much does Hermes decide alone? (conservative / balanced / progressive) | `hermes.autonomy` + thresholds |
| 4 | **Self-improvement** — should Hermes audit its own accuracy? (off / audit / tuning / auto) | `self_improvement.mode` |

Then commit `.claude/skills/` + `systemix.config.yaml` so the instance is reproducible in CI.

## Commands

```bash
npx systemix init [--reconfigure]   # setup wizard (--reconfigure overwrites the config)
npx systemix config show            # print the active instance topology
npx systemix workflow add <name>    # add a workflow (design-system | hypothesis-validation | figma-to-code | token-guard)
npx systemix list                   # installed skills + available workflows
npx systemix doctor                 # health check (skills, MCP server, Ollama, Figma token)
npx systemix watch                  # run Hermes continuously (polls signals, fills the HITL queue)
npx systemix sync [--dry-run]       # design-token sync (TokenGuard budget-aware)
```

## How it runs (no hosted dependency)

- **Local-first.** Contracts are MDX files in your repo (`contract/**`); the HITL queue, sync log, and run history live under `.systemix/`. No database required to run the loops.
- **Hermes** is a local LLM via [Ollama](https://ollama.com) (`localhost:11434`) — air-gapped, no API key.
- **Agents** boot at **Trust Tier 0** (Ghost Mode) — nothing executes autonomously without your `systemix.config.yaml`.
- The **MCP server** exposes your contracts to Claude Code / Cursor so coding agents read what's been tested before they ship.

## Requirements

- Node.js ≥ 18
- Claude Code (or any MCP-compatible client)
- Ollama + a model (e.g. `ollama pull hermes3`) for autonomous Hermes runs

Learn more: https://getsystemix.vercel.app
