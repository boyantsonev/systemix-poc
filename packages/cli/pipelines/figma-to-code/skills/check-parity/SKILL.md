---
name: check-parity
description: Detect drift between Figma design tokens/components and the codebase. Shows a full parity report with token diffs, unlinked components, and designer comments.
disable-model-invocation: true
argument-hint: [figma-url]
---

Check parity between Figma and codebase: $ARGUMENTS

## Steps

1. **Parse the Figma URL** from $ARGUMENTS
   - If no URL provided, check `.claude/project-context.json` for `figma.fileKey` and construct the URL
   - If neither exists, ask the user for the Figma URL before proceeding

2. **Spawn the `parity-checker` agent** with:
   - The Figma URL
   - Current working directory as the project root

3. **Display the parity report** returned by the agent

4. **Offer next actions** based on the report findings:
   - If token drift found: "Run `/tokens [figma-url]` to pull updates"
   - If unimplemented Figma components found: "Run `/component [figma-url]` to generate"
   - If unlinked code components found: "Run `/connect [figma-url]` to link them"
   - If designer comments found: surface them for review

## Output

The parity report from the agent, followed by a short list of recommended next commands.
