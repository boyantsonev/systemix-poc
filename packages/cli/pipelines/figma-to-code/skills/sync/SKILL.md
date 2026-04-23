---
name: sync
description: Orchestrate the full design↔code sync loop — one command to pull tokens, convert, push Variables, and report drift.
argument-hint: [figma-url]
---

# /sync — Full Bidirectional Sync

Full sync for: $ARGUMENTS

## Usage
```
/sync                                    # uses Figma file from .systemix/systemix.json
/sync https://figma.com/design/...      # explicit Figma file
```

## What this does
Runs all sync operations in sequence with a single HITL gate before any writes:

1. **Pull**: Fetch current Figma Variables via `get_variable_defs`
2. **Convert**: Diff against `.systemix/tokens.bridge.json` — find changed, added, removed
3. **Propose**: Show unified diff of what will change in globals.css + what will be updated in Figma
4. **HITL gate**: Present the full proposed changeset. Wait for approval.
5. **Apply to code**: Write changed tokens to `src/app/globals.css`
6. **Regenerate bridge**: Re-run `scripts/token-converter.ts` to update `.systemix/tokens.bridge.json`
7. **Push to Figma**: Execute Plugin API JS to sync Variable values back (same as `/sync-to-figma`)
8. **Drift check**: Run a fast grep-based scan for hardcoded values in components — surface any new drift
9. **Update manifest**: Write lastSync, tokenChangeLog entry, and syncStatus fields in `.systemix/systemix.json`

## Output
```
Sync complete — [timestamp]
  Tokens pulled:    31
  Changed:          3  (--border light, --muted-foreground, --status-new)
  Figma Variables:  31 updated across 3 collections
  Drift instances:  2 new hardcoded values flagged (see /drift-report)
  Bridge file:      .systemix/tokens.bridge.json updated
```

## Notes
- Never writes without HITL approval
- If only one direction is needed, use `/tokens` (Figma → code) or `/sync-to-figma` (code → Figma)
- Drift check is a fast static scan only — run `/drift-report` for a full audit
