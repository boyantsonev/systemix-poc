---
name: deploy-annotate
description: Post a Vercel deployment URL as a comment on a Figma node. Use after deploying to close the loop between code and design.
disable-model-invocation: true
argument-hint: [vercel-url] [figma-node-url]
---

Post deploy URL to Figma: $ARGUMENTS

## Steps

1. **Parse arguments**
   - First argument: Vercel deployment URL (e.g. `https://verolab-abc.vercel.app`) or deployment ID
   - Second argument: Figma node URL to comment on (e.g. `https://www.figma.com/design/...?node-id=...`)
   - If Figma URL is missing, check `.claude/project-context.json` for the last active node — prompt if still missing

2. **Spawn `deploy-feedback` agent** with both URLs

3. The `deploy-feedback` agent will:
   - Fetch deployment status and build details from Vercel MCP
   - Compose a short comment with the preview URL, branch, build time
   - Show the comment text for your approval (HITL gate inside the agent)
   - Post to Figma via `figma-writer`

4. **Report** — comment posted / skipped

## Standalone vs. automatic

This skill is also triggered automatically at the end of `/deploy` and `/design-to-code` when `.claude/project-context.json` contains a `figma.nodeMap` entry.

Run it manually when you deployed outside of those skills and want to post the URL retroactively.
