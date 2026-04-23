---
name: figma
description: Extract design context and screenshot from a Figma URL
disable-model-invocation: true
argument-hint: [figma-url]
---

Extract design context from Figma URL: $ARGUMENTS

## Steps

1. Parse the Figma URL to extract:
   - `fileKey` from the URL path
   - `nodeId` from the `node-id` query parameter (convert `-` to `:`)

2. Use `mcp__claude_ai_Figma__get_design_context` to get:
   - Component structure and code
   - Asset download URLs
   - Code Connect mappings if available

3. Use `mcp__claude_ai_Figma__get_screenshot` to capture a visual reference

4. Summarize:
   - Component hierarchy
   - Key design decisions (colors, spacing, typography)
   - Any variables or tokens used

## Output

Provide a structured summary the user can reference when building components.
