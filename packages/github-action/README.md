# Systemix TokenGuard GitHub Action

Runs Systemix sync inside CI with automatic token budget enforcement. A dry-run estimate is performed first; if the estimated token usage exceeds the configured budget the workflow fails fast — before spending any tokens — with a clear error message.

## Usage

```yaml
- uses: verolab/systemix-action@v1
  with:
    command: sync
    file: ${{ secrets.FIGMA_FILE_ID }}
    budget: 30000
    incremental: true
  env:
    FIGMA_TOKEN: ${{ secrets.FIGMA_TOKEN }}
    ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
```

### Full workflow example

```yaml
name: Design Sync

on:
  push:
    branches: [main]
  pull_request:

jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Systemix TokenGuard sync
        id: tokenguard
        uses: verolab/systemix-action@v1
        with:
          command: sync
          file: ${{ secrets.FIGMA_FILE_ID }}
          budget: 30000
          incremental: true
        env:
          FIGMA_TOKEN: ${{ secrets.FIGMA_TOKEN }}
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}

      - name: Print usage summary
        run: |
          echo "Tokens used:     ${{ steps.tokenguard.outputs.tokens_used }}"
          echo "Cache hit ratio: ${{ steps.tokenguard.outputs.cache_hit_ratio }}"
          echo "Run ID:          ${{ steps.tokenguard.outputs.run_id }}"
```

## Inputs

| Input          | Required | Default  | Description                                                          |
|----------------|----------|----------|----------------------------------------------------------------------|
| `command`      | No       | `sync`   | Systemix command to run (`sync`, `drift-report`, etc.)               |
| `file`         | No       | —        | Figma file key. Overrides the key in `project-context.json`.         |
| `budget`       | No       | `30000`  | Maximum token budget. The action fails if the estimate exceeds this. |
| `incremental`  | No       | `true`   | Only sync nodes that changed since the last run.                     |
| `node_version` | No       | `20`     | Node.js version used by the runner.                                  |

## Outputs

| Output            | Description                                             |
|-------------------|---------------------------------------------------------|
| `tokens_used`     | Actual tokens consumed by this run.                     |
| `cache_hit_ratio` | Fraction of node lookups served from cache (0–1).       |
| `run_id`          | Unique identifier for this Systemix execution.          |

## Behavior on budget exceeded

When the dry-run estimate is greater than the `budget` input the action calls `core.setFailed` with a descriptive message and exits with code 1:

```
Token budget exceeded: ~42 500 tokens estimated, budget 30 000.
Increase the budget input or reduce the sync scope with --incremental or --file.
```

The real sync command is never executed, so no API tokens are consumed beyond the cheap dry-run call.

## Environment variables

| Variable            | Purpose                                   |
|---------------------|-------------------------------------------|
| `FIGMA_TOKEN`       | Figma personal access token for REST API. |
| `ANTHROPIC_API_KEY` | Anthropic API key for Claude calls.       |

## Building

```bash
# Compile TypeScript
npm run build

# Bundle into dist/index.js (required before publishing)
npm run package
```

The action runs from `dist/index.js` — always run `npm run package` before tagging a release.
