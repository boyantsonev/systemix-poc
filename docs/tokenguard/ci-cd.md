# TokenGuard — CI/CD Integration

TokenGuard ships a GitHub Action for enforcing token budgets in automated Figma → code pipelines. Use it to prevent runaway token spend in CI, gate on cache efficiency, and track token usage across deploys.

---

## GitHub Actions — Full Example

```yaml
name: Figma Design Sync

on:
  push:
    branches: [main]
  schedule:
    # Run every Monday at 06:00 UTC (off-peak)
    - cron: "0 6 * * 1"
  workflow_dispatch:
    inputs:
      command:
        description: "Sync command (sync / token-profile)"
        required: false
        default: "sync"
      file:
        description: "Figma file key override"
        required: false
        default: ""
      budget:
        description: "Token budget cap (0 = unlimited)"
        required: false
        default: "30000"
      incremental:
        description: "Incremental mode (true/false)"
        required: false
        default: "true"
      node_version:
        description: "Node.js version"
        required: false
        default: "20"

jobs:
  figma-sync:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ github.event.inputs.node_version || '20' }}
          cache: "npm"

      - name: Install dependencies
        run: npm ci

      - name: Restore TokenGuard cache
        uses: actions/cache@v4
        with:
          path: .systemix/cache
          key: tokenguard-cache-${{ secrets.FIGMA_FILE_ID }}-${{ github.ref_name }}
          restore-keys: |
            tokenguard-cache-${{ secrets.FIGMA_FILE_ID }}-
            tokenguard-cache-

      - name: Run TokenGuard sync
        id: tokenguard
        uses: systemix/tokenguard-action@v1
        with:
          command: ${{ github.event.inputs.command || 'sync' }}
          file: ${{ github.event.inputs.file || secrets.FIGMA_FILE_ID }}
          budget: ${{ github.event.inputs.budget || '30000' }}
          incremental: ${{ github.event.inputs.incremental || 'true' }}
        env:
          FIGMA_TOKEN: ${{ secrets.FIGMA_TOKEN }}
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}

      - name: Print token usage summary
        run: |
          echo "Tokens used:      ${{ steps.tokenguard.outputs.tokens_used }}"
          echo "Cache hit ratio:  ${{ steps.tokenguard.outputs.cache_hit_ratio }}"
          echo "Run ID:           ${{ steps.tokenguard.outputs.run_id }}"

      - name: Save TokenGuard cache
        if: always()
        uses: actions/cache@v4
        with:
          path: .systemix/cache
          key: tokenguard-cache-${{ secrets.FIGMA_FILE_ID }}-${{ github.ref_name }}
```

---

## Required Secrets

Configure the following secrets in your GitHub repository settings (Settings → Secrets and variables → Actions):

| Secret | Description |
|---|---|
| `FIGMA_FILE_ID` | Figma file key (found in the file URL: `figma.com/design/:fileKey/...`) |
| `FIGMA_TOKEN` | Figma personal access token or OAuth token with read access |
| `ANTHROPIC_API_KEY` | Anthropic API key for Claude calls during the sync pipeline |

---

## Action Inputs

| Input | Required | Default | Description |
|---|---|---|---|
| `command` | No | `sync` | The Systemix command to run. Supported values: `sync`, `token-profile`. |
| `file` | No | From project context | Figma file key to sync. Overrides `.systemix/project-context.json`. |
| `budget` | No | `30000` | Token budget cap. The action exits with a non-zero code if the estimate exceeds this value. Set to `0` for unlimited. |
| `incremental` | No | `true` | Whether to use incremental mode. Recommended for scheduled runs. Set to `false` for a full sync. |
| `node_version` | No | `20` | Node.js version to use. Must be 18 or higher. |

---

## Action Outputs

| Output | Description |
|---|---|
| `tokens_used` | Total tokens consumed by the run (integer). `0` if the run was aborted due to budget. |
| `cache_hit_ratio` | Percentage of MCP calls served from cache (e.g. `74%`). Higher is better. |
| `run_id` | Unique run identifier. Matches the filename in `.systemix/runs/[run_id].json`. |

---

## Budget Exceeded Behavior

When the pre-run estimate exceeds the configured budget:

1. The action exits with code `1` (failure)
2. The GitHub Actions step is marked as failed
3. The job stops (unless `continue-on-error: true` is set)
4. No tokens are consumed — the run aborts before any MCP call
5. The step output includes the estimated cost and a suggestion to narrow scope

Example failure output:

```
TokenGuard Budget Exceeded
────────────────────────────────────
Estimated cost:   42,800 tokens
Budget cap:       30,000 tokens
Overage:          +12,800 tokens

Suggestions:
  • Use --incremental to skip unchanged nodes
  • Use --page "Components" to limit scope
  • Use --only tokens for token-only sync

Run aborted. 0 tokens consumed.
```

To proceed anyway (overriding the budget for a one-off run), set `budget: 0` in the workflow dispatch inputs.

---

## Caching Between Runs

The example workflow above uses `actions/cache` to persist `.systemix/cache/` between runs. This is strongly recommended: it allows incremental runs to skip nodes that haven't changed since the last CI run, which is the primary driver of cache hit ratio improvements over time.

On a cold cache (first run), expect 0% hit ratio. After a few runs against the same file, expect 60–80%+.

---

## Full Action Documentation

For the complete list of inputs, outputs, and advanced configuration options, see:

[packages/github-action/README.md](../../packages/github-action/README.md)

---

## See Also

- [Overview](overview.md)
- [Getting Started](getting-started.md)
- [CLI Reference](cli-reference.md)
- [MCP Proxy](mcp-proxy.md)
- [Benchmarks](benchmarks.md)
