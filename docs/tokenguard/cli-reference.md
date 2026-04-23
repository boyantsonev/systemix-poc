# TokenGuard — CLI Reference

Complete reference for all TokenGuard commands and flags.

---

## `systemix sync`

Runs the Figma → code sync pipeline with TokenGuard optimization applied.

```bash
npx systemix sync [flags]
```

### Flags

| Flag | Type | Default | Description |
|---|---|---|---|
| `--dry-run` | boolean | `false` | Estimate token cost without executing any MCP calls. Shows per-skill breakdown and cache hit ratio. Exits after printing the estimate. |
| `--budget <n>` | number | unlimited | Abort if the pre-run estimate exceeds `n` tokens. Check happens before any API call — zero tokens consumed on abort. Useful in CI pipelines. |
| `--incremental` | boolean | `false` (first run), `true` (repeat runs) | Only sync nodes that have changed since the last run, based on the local node map and cache. First run always processes all nodes in scope. |
| `--node <id>` | string | — | Target a single component or node by its node ID or slug (e.g. `button-primary` or `123:456`). Skips all other nodes. |
| `--page <name>` | string | — | Scope the sync to a single Figma page by name (e.g. `"Components"`). Skips all other pages. |
| `--only <scope>` | string | — | Restrict to a subset of the pipeline. Accepted values: `tokens` (skip component traversal, ~70% cheaper), `components` (skip token sync), `styles`. |
| `--file <key>` | string | From project context | Override the Figma file key. Useful when syncing from a different file than the project default. |
| `--schedule <expr>` | string | — | Schedule the sync instead of running immediately. See [`systemix schedule`](#systemix-schedule) for expression syntax. |

### Examples

```bash
# Estimate cost before committing
npx systemix sync --dry-run

# Full sync with a 30k token budget cap
npx systemix sync --budget 30000

# Incremental sync — only changed nodes
npx systemix sync --incremental

# Sync a single component
npx systemix sync --node button-primary

# Sync a single page
npx systemix sync --page "Components"

# Tokens only — skip component traversal
npx systemix sync --only tokens

# Sync from a specific Figma file
npx systemix sync --file h1m7dfFILe1wGSfxwQ6U02

# Schedule for tonight at 22:00
npx systemix sync --schedule "tonight 22:00"

# Combine flags
npx systemix sync --incremental --budget 20000 --page "Components"
```

---

## `systemix token-profile [dir]`

Scans a directory for token inefficiency patterns: unscoped MCP calls, missing cache configuration, no budget caps in CI workflows.

```bash
npx systemix token-profile [dir]
```

| Argument | Default | Description |
|---|---|---|
| `dir` | `./` | Directory to scan. Recursively inspects `.ts`, `.js`, `.yml`, `.yaml`, and `.json` files. |

### Output

```
Token Profile Report — ./src
────────────────────────────────────────
⚠  scripts/sync.ts:14 — Unscoped get_file_data call
   Estimated waste: ~180k tokens/run
   Fix: pass --node-id or scope to page

⚠  .github/workflows/design-ci.yml:8 — No budget cap
   Risk: unbounded token spend in CI
   Fix: add TOKENGUARD_BUDGET=30000

✓  Cache configured correctly (3 files)
✓  Node map present and up-to-date
────────────────────────────────────────
2 issues found · Estimated weekly savings if fixed: ~1.2M tokens
```

### What It Detects

- Hardcoded Figma file URLs passed directly to agents
- `get_file_data` calls without node or page scoping
- CI workflow files missing `TOKENGUARD_BUDGET`
- Missing `.systemix/cache/` directory
- Missing or stale node map (older than 7 days)

---

## `systemix token-guard`

Manage the TokenGuard installation and MCP proxy.

### `systemix token-guard status`

Show current proxy state, cache status, node map age, budget config, and last run summary.

```bash
npx systemix token-guard status
```

```
TokenGuard Status
─────────────────────────────────────
Proxy        ✓ Running (systemix-mcp-proxy v1.x.x)
Cache        ✓ Initialized (.systemix/cache/) — 47 entries
Node map     ✓ Built 2026-04-01 (2 days ago)
Budget       30,000 tokens
Last run     2026-04-02 · 14,200 tokens · 74% cache hit
─────────────────────────────────────
```

### `systemix token-guard reset`

Clear the local cache and run history. The node map is preserved (rebuild with `systemix sync --incremental`).

```bash
npx systemix token-guard reset
```

Options:
- `--cache` — Clear only the cache (default)
- `--runs` — Clear only the run history
- `--all` — Clear cache, run history, and node map

```bash
npx systemix token-guard reset --all
```

### `systemix token-guard remove`

Uninstall TokenGuard from the project. Removes the MCP proxy registration, cache, and run history. The `systemix` CLI itself is unaffected.

```bash
npx systemix token-guard remove
```

Prompts for confirmation before removing. Use `--yes` to skip the prompt in automated contexts.

---

## `systemix schedule`

Manage scheduled sync runs. TokenGuard uses system cron (macOS/Linux) or Task Scheduler (Windows) — no cloud dependency.

### `systemix schedule list`

List all scheduled TokenGuard runs for this project.

```bash
npx systemix schedule list
```

```
Scheduled Runs
───────────────────────────────────────────────────
ID        Expression           Next Run           Command
sync-01   weekly Mon 06:00     2026-04-07 06:00   sync --incremental --budget 30000
sync-02   tonight 22:00        2026-04-02 22:00   sync --only tokens
───────────────────────────────────────────────────
2 schedules active
```

### `systemix schedule clear`

Remove all scheduled runs for this project.

```bash
npx systemix schedule clear
```

To remove a single schedule by ID:

```bash
npx systemix schedule clear sync-01
```

### `systemix schedule run <id>`

Trigger a scheduled run immediately (without waiting for its next scheduled time). Useful for testing.

```bash
npx systemix schedule run sync-01
```

### Schedule Expression Syntax

| Expression | Meaning |
|---|---|
| `"tonight 22:00"` | Today at 22:00 local time (one-shot) |
| `"tomorrow 06:00"` | Tomorrow at 06:00 local time (one-shot) |
| `"weekly Mon 06:00"` | Every Monday at 06:00 local time |
| `"daily 03:00"` | Every day at 03:00 local time |
| `"auto"` | Systemix picks optimal window in next 24h based on historical peak patterns |
| Standard cron | Any valid cron expression (e.g. `"0 6 * * 1"`) |

---

## See Also

- [Overview](overview.md)
- [Getting Started](getting-started.md)
- [MCP Proxy](mcp-proxy.md)
- [CI/CD Integration](ci-cd.md)
- [Benchmarks](benchmarks.md)
