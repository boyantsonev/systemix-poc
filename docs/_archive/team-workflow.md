# Team Workflow — .systemix/

## What to commit
- systemix.json — Figma IDs (shared)
- project-context.json — component registry (shared)
- agent-state.json — last run per agent (informational)
- sync-log.json — append-only history (merge by appending)
- drift-history.json — drift snapshots (merge by appending)

## What NOT to commit (auto-ignored)
- tokens.bridge.json — regenerate with: npm run tokens
- handoffs/ — runtime session data
- cache/ — Figma response cache
- runs/ — token usage logs
