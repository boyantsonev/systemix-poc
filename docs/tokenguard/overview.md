# TokenGuard — Overview

> **Figma MCP token intelligence. Know what you'll spend before you spend it.**

---

## The Problem

Figma MCP is one of the most token-hungry integrations in the agentic ecosystem. Without guardrails, a single `get_file_data` call can consume 50k–400k+ tokens. Most teams discover this only after hitting their quota mid-run — pipelines fail, sessions reset, and there's no warning until it's too late.

Three structural patterns drive the waste:

| Metric | Value | What It Means |
|---|---|---|
| ~10× | Typical over-fetch ratio | `get_file_data` vs scoped reads |
| 5h | Rolling quota window | Before reset (varies by load) |
| 80%+ | Estimated token reduction | With structured pre-fetch strategy |

Token waste in Figma MCP workflows is almost entirely structural, not conversational. It comes from over-fetching, session length, and re-reading unchanged data — all of which are predictable and preventable.

---

## What TokenGuard Does

TokenGuard is a first-class Systemix feature that gives you visibility, control, and optimization over every Figma MCP call your pipelines make.

| Feature | What It Does |
|---|---|
| **F-01 — Pre-Run Token Estimator** | Scans target scope and shows a per-skill token cost breakdown before any Claude call is made. Flags budget overruns before they happen. |
| **F-02 — Scope Narrowing CLI Flags** | `--node`, `--page`, `--only`, `--incremental`, `--budget` — first-class flags that target exactly what needs syncing and avoid whole-file reads. |
| **F-03 — TokenGuard Dashboard** | A Mission Control panel showing token usage history per run, per skill, and per file. Regression alerts, cache efficiency scores, and exportable reports. |
| **F-04 — Smart Fetch / MCP Proxy** | A thin proxy that intercepts Figma MCP calls from any agent and applies token optimization rules automatically — not just Systemix's own pipeline. |
| **F-05 — Off-Peak Scheduler** | Schedules heavy runs for off-peak windows (avoiding 13:00–19:00 GMT peaks) using local cron or launchd. No cloud dependency. |
| **F-06 — Token Profiler** | A repository scanner that audits your codebase for token inefficiency patterns: unscoped MCP calls, missing cache config, no budget caps in CI. |

---

## Quick Start

Add TokenGuard to any existing Systemix project in one command:

```bash
npx systemix add token-guard
```

This installs the MCP proxy, initializes the cache directory, and registers the proxy in your MCP config. No manual configuration required.

---

## Who It's For

| Audience | Pain Point | TokenGuard Hook | Distribution Path |
|---|---|---|---|
| Design engineers using Claude Desktop + Figma MCP | Hitting Pro limits mid-session doing design system work | MCP Proxy + Estimator | shadcn CLI install |
| Frontend teams with Figma → code CI pipelines | Unpredictable token costs in automated workflows | Budget enforcement + Scheduler | GitHub Action |
| Design system leads managing large Figma files | Full-file reads burning quota before the workday starts | Incremental sync + Cache | Systemix CLI |
| Agencies running multiple client Figma files | Token costs across projects are opaque and unbudgeted | Dashboard + Export Report | Direct / word of mouth |

---

## Next Steps

- [Getting Started](getting-started.md) — install, verify, first run
- [CLI Reference](cli-reference.md) — all flags and commands
- [MCP Proxy](mcp-proxy.md) — architecture and config
- [CI/CD Integration](ci-cd.md) — GitHub Actions setup
- [Benchmarks](benchmarks.md) — real savings data
