---
name: deploy
description: Build and deploy the project to Vercel, then post the preview URL as a comment on the relevant Figma node.
disable-model-invocation: true
argument-hint: [environment?] [--skip-figma?]
allowed-tools: Bash(npm *), Bash(npx *), Bash(git *)
---

Deploy the project: $ARGUMENTS

## Steps

1. **Verify build passes**
   ```bash
   npm run build
   ```
   Stop if build fails - fix errors first.

2. **Check git status**
   ```bash
   git status
   ```
   Warn if there are uncommitted changes.

3. **Deploy to Vercel**
   - Production: `npx vercel --prod`
   - Preview: `npx vercel`

   Default to preview unless `prod` or `production` is specified.

4. **Capture the deployment URL** from Vercel output

5. **Post to Figma** (unless `--skip-figma` is specified)
   - Spawn `deploy-feedback` agent with the deployment URL
   - Agent will check `.systemix/systemix.json` for the Figma file key and node target
   - Agent will show HITL gate before posting
   - If no Figma context exists, skip silently and report "No Figma target — run /deploy-annotate to post manually"

6. **Report results**
   - Build: passed/failed
   - Preview URL: https://...
   - Figma comment: posted to [node] / skipped

## Environments

- `preview` (default) - Creates a preview deployment
- `prod` / `production` - Deploys to production

## Options

- `--skip-figma` - Skip the Figma comment step

## Prerequisites

- Vercel CLI authenticated (`npx vercel login`)
- Project linked to Vercel (`npx vercel link`)
