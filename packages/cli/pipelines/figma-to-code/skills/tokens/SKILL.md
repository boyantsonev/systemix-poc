---
name: tokens
description: Extract and sync design tokens from Figma to CSS variables
disable-model-invocation: true
argument-hint: [figma-url]
---

Sync design tokens from Figma URL: $ARGUMENTS

## Steps

1. Parse the Figma URL to extract `fileKey` and `nodeId`

2. Use `mcp__claude_ai_Figma__get_variable_defs` to extract:
   - Color tokens
   - Spacing values
   - Typography scales
   - Border radius values
   - Shadow definitions

3. Read the current `globals.css` in the project

4. Update or add CSS custom properties:
   - Preserve existing structure
   - Add new tokens under appropriate sections
   - Use semantic naming (e.g., `--color-primary`, `--spacing-4`)

5. Report changes:
   - New tokens added
   - Existing tokens updated
   - Any conflicts or manual review needed

## Token Mapping

```
Figma Variable          →  CSS Custom Property
─────────────────────────────────────────────
primary/default         →  --primary
background/default      →  --background
spacing/4               →  --spacing-4
radius/xl               →  --radius-xl
```
