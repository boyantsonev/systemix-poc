---
name: connect
description: Link Figma components to codebase React components bidirectionally — updates Code Connect in Figma and adds implementation notes to Figma component descriptions.
disable-model-invocation: true
argument-hint: [figma-url]
---

Link Figma components to codebase components: $ARGUMENTS

## What this does

Builds a mapping table between Figma component nodes and React component files. After your approval, sends confirmed links to Figma (Code Connect) and updates each Figma component's description with its code file path.

Run this:
- When starting a new project to establish the initial linking
- After generating new components with `/component` or `/design-to-code`
- When a designer adds new components to the Figma file

## Steps

1. **Parse the Figma URL** from $ARGUMENTS
   - If no URL provided, check `.claude/project-context.json` for `figma.fileKey`
   - If neither exists, ask the user for the Figma URL

2. **Spawn the `code-connect` agent** with the Figma URL and current working directory

3. The `code-connect` agent will:
   - Discover all React components in `src/components/`
   - Read Figma's component list and code connect suggestions
   - Build a candidate mapping table with confidence scores
   - Show the mapping table for your approval (HITL gate inside the agent)
   - Send confirmed mappings to Figma via `figma-writer`
   - Update each Figma component description with the code file path
   - Save confirmed mappings to `.claude/project-context.json`

4. **Report results** — X linked, Y code-only, Z Figma-only (not yet built)

## Output

Summary of all mappings created, plus any components that couldn't be matched automatically.
