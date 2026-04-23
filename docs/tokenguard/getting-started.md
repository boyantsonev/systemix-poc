# TokenGuard — Getting Started

This guide walks you from zero to your first optimized Figma MCP sync.

---

## Step 1 — Prerequisites

Before installing TokenGuard, confirm your environment meets the following requirements:

| Requirement | Minimum | Notes |
|---|---|---|
| Node.js | 18+ | Check with `node --version` |
| Systemix CLI | Latest | Installed via `npm install -g systemix` or `npx systemix` |
| Project context | Present | `.systemix/project-context.json` must exist in the project root |
| Figma token | Set | `FIGMA_TOKEN` environment variable or `.env` file |

**Verify your project context exists:**

```bash
ls .systemix/project-context.json
```

If the file is missing, initialize your project first:

```bash
npx systemix init
```

---

## Step 2 — Install TokenGuard

Run the following command from your project root:

```bash
npx systemix add token-guard
```

You should see output like:

```
✓ TokenGuard installed
✓ MCP proxy registered in .cursor/mcp.json
✓ Cache directory initialized at .systemix/cache/
✓ Run `systemix token-guard status` to verify
```

What this does:
- Installs the `systemix-mcp-proxy` binary
- Registers the proxy as an MCP server entry in your local config (`.cursor/mcp.json`, `.claude/mcp.json`, or equivalent)
- Creates `.systemix/cache/` for local response caching
- Creates `.systemix/runs/` for per-run token history

---

## Step 3 — Verify the Installation

Confirm TokenGuard is active and the proxy is reachable:

```bash
npx systemix token-guard status
```

Expected output:

```
TokenGuard Status
─────────────────────────────────────
Proxy        ✓ Running (systemix-mcp-proxy v1.x.x)
Cache        ✓ Initialized (.systemix/cache/)
Node map     ✗ Not built — will generate on first run
Budget       Not set (unlimited)
Last run     Never
─────────────────────────────────────
Run `systemix sync --dry-run` to generate your first estimate.
```

If the proxy shows as not running, restart your MCP client (Claude Desktop, Cursor, etc.) to pick up the new server registration.

---

## Step 4 — First Estimate (Dry Run)

Before spending any tokens, get a cost estimate for your first sync:

```bash
npx systemix sync --dry-run
```

TokenGuard scans the target Figma file's metadata and node counts — without making full MCP reads — and shows a breakdown by skill:

```
TokenGuard Estimate
────────────────────────────────────
Skill 1 · Figma Read          ~4,200 tokens
Skill 2 · Token Diff          ~2,800 tokens
Skill 3 · Component Sync      ~8,100 tokens
Skill 4 · Code Gen            ~11,400 tokens
Skill 5 · Linear PR           ~2,600 tokens
────────────────────────────────────
Total Estimate                ~29,100 tokens
Cache hit ratio           0% (first run — no cache)

Proceed? [y/N/--scope narrow]
```

On your first run, the cache hit ratio will be 0%. After the first run, subsequent dry-runs will show cached data savings.

To narrow scope if the estimate is too high:

```bash
# Target a single page
npx systemix sync --dry-run --page "Components"

# Target a single node
npx systemix sync --dry-run --node button-primary

# Tokens only (no component traversal)
npx systemix sync --dry-run --only tokens
```

---

## Step 5 — First Real Run (Incremental)

Run your first sync using the incremental flag. On a first run, `--incremental` scopes to all nodes — on subsequent runs, it only processes nodes that have changed since the last run:

```bash
npx systemix sync --incremental
```

After completion, TokenGuard logs the run to `.systemix/runs/` and updates the cache at `.systemix/cache/`.

**Set a budget cap** to prevent runaway costs:

```bash
npx systemix sync --incremental --budget 30000
```

If the estimated cost exceeds 30,000 tokens, the run aborts before any API call is made. No tokens are consumed for aborted runs.

---

## Step 6 — View the Dashboard

Open Mission Control in your browser and navigate to the TokenGuard panel:

```
http://localhost:3001/token-guard
```

The dashboard shows:
- Per-run token breakdown (by skill, by file)
- Cache efficiency score
- Regression alerts (runs that cost significantly more than previous runs)
- Next scheduled run (if configured)
- Weekly usage summary

All data is stored locally in `.systemix/` — no telemetry, no cloud sync.

---

## What's Next

- [CLI Reference](cli-reference.md) — full flag documentation for all TokenGuard commands
- [MCP Proxy](mcp-proxy.md) — how the proxy works and advanced configuration
- [CI/CD Integration](ci-cd.md) — set up budget enforcement in GitHub Actions
- [Benchmarks](benchmarks.md) — expected savings by file type and workflow
