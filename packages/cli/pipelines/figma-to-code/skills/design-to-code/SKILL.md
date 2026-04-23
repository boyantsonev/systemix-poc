---
name: design-to-code
description: Full bidirectional Figma-to-deployed-code workflow — parity check, token sync, component generation, code connect linking, build, deploy, and Figma annotation.
disable-model-invocation: true
argument-hint: [figma-url] [--skip-deploy?] [--skip-figma?]
---

# Full Design-to-Code Workflow

Convert Figma design to deployed code: $ARGUMENTS

## Workflow Steps

### 1. Parity Check (non-blocking)

Spawn `parity-checker` agent with the Figma URL.

Show the drift report to the user. This is informational — do not stop the workflow based on findings. User will decide if they want to address drift separately.

Note: skip this step if `--skip-parity` is passed.

### 2. Sync Tokens

Use the `/tokens` skill workflow:
- Extract variables from the Figma file via `mcp__claude_ai_Figma__get_variable_defs`
- Compare with existing `globals.css`
- Update CSS custom properties if new or changed values found
- Report: X tokens added, Y updated, Z unchanged

### 3. Extract Design Context

Use the `/figma` skill workflow:
- Get design context from `mcp__claude_ai_Figma__get_design_context`
- Capture screenshot via `mcp__claude_ai_Figma__get_screenshot`
- Identify component structure and name

### 4. Generate Component

Use the `/component` skill workflow:
- Create hi-fi React component (TypeScript)
- Follow design system conventions from `/design-system`
- Place in `src/components/`
- Update `page.tsx` imports if needed

**HITL gate:** Show the generated component file. Ask "Looks good? Proceed to build? (y/N)". Stop if user says no.

### 5. Link to Figma (Code Connect)

After component is written, spawn `code-connect` agent for the new component only:
- Match the new component file to the Figma node that was just implemented
- The agent will use the nodeId from the Figma URL as the primary match target
- Skip full codebase scan — just link this one component
- Shows HITL gate inside the agent before sending to Figma

### 6. Verify Build

```bash
npm run build
```

Stop and fix if build fails. Do not proceed to deploy with a broken build.

### 7. Commit Changes

```bash
git add src/components/[ComponentName].tsx
git add src/app/globals.css
git add .claude/project-context.json
git commit -m "Add [ComponentName] from Figma design [nodeId]"
```

Skip if `--no-commit` is passed.

### 8. Deploy Preview

Unless `--skip-deploy` is specified:
- Run `npx vercel` for preview deployment
- Capture the preview URL

### 9. Post to Figma

Unless `--skip-figma` is specified:
- Spawn `deploy-feedback` agent with the Vercel URL and the original Figma node URL
- Agent will compose and post a comment with the preview URL
- HITL gate inside the agent before posting

## Options

- `--skip-deploy` — Stop after commit, skip deploy and Figma annotation
- `--skip-figma` — Deploy but don't post to Figma
- `--skip-parity` — Skip the initial parity check
- `--tokens-only` — Only sync tokens, skip component generation
- `--no-commit` — Don't auto-commit changes

## Output

Report:
- Parity: [n] tokens drifted, [n] components unlinked
- Tokens updated: [n] added/changed
- Component created: `src/components/[name].tsx`
- Code Connect: linked to Figma node [nodeId]
- Build: passed/failed
- Preview URL: https://...
- Figma comment: posted / skipped
