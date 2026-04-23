---
name: sync-to-figma
description: Push CSS custom property values from the codebase back to Figma variables. Reverse of /tokens. Use when you've made code-side token changes that should be reflected in Figma.
disable-model-invocation: true
argument-hint: [figma-url]
---

Sync CSS token values back to Figma: $ARGUMENTS

## When to use

Run this after you've intentionally changed token values in `globals.css` and want Figma to reflect those changes. This is the reverse of `/tokens` — code is the source here, not Figma.

**Do not run this to "fix" Figma drift** — if Figma has newer values than code, run `/tokens` instead.

## Steps

1. **Parse the Figma URL** from $ARGUMENTS
   - If no URL provided, check `.claude/project-context.json` for `figma.fileKey`
   - If neither exists, ask the user for the Figma URL

2. **Spawn the `token-writer` agent** with the Figma URL and current working directory

3. The `token-writer` agent will:
   - Read CSS custom properties from `globals.css`
   - Compare against current Figma variable values
   - Build a diff (only changed values)
   - Show a summary table
   - Spawn `figma-writer` with a variables manifest (which will show its own HITL gate before writing)

4. **Report results** — tokens updated, tokens in sync, tokens with no Figma counterpart

## Notes

- Variables are updated only, never created. If a CSS variable has no matching Figma variable, it is flagged but not auto-created.
- The `figma-writer` agent will always ask for confirmation before writing to Figma.
