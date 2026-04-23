---
name: sync-docs
description: Sync all documentation entries in lib/data/docs.ts from live component, token, and brand data
disable-model-invocation: true
argument-hint: "[scope] (optional: path to a single component file)"
---

Sync all documentation entries in lib/data/docs.ts.

## Steps

1. Read `lib/data/components.ts`, `lib/data/tokens.ts`, and `lib/data/brands.ts` to get the current design system inventory.

2. For each component or token group, read the relevant source file (e.g. `src/components/ui/<name>.tsx`) to extract:
   - Props interface / TypeScript types
   - Token usage (CSS variable references)
   - Export names and variants

3. Diff against existing entries in `lib/data/docs.ts`:
   - **stale**: entry exists but source file was modified >7 days ago vs `writtenAt`
   - **drifted**: entry exists but props or tokens have changed since last write
   - **missing**: component exists in components.ts but has no docs entry
   - **current**: entry is up to date

4. Before writing, show the user a summary:
   - How many entries will be created / updated / unchanged
   - Which components are drifted or missing
   - Request approval (HITL gate) before writing

5. On approval, update `lib/data/docs.ts`:
   - Set `status` from the diff result above
   - Set `coverageScore` = (documented props / total props) * 100
   - Set `writtenBy: "doc-sync"`, `writtenAt: <now ISO>`, `runId: <uuid>`

6. Emit a completion summary: N created, M updated, K unchanged.

## Scope

If `$ARGUMENTS` contains a file path, scope the sync to that single component only.

## Quality rules

- Never delete an existing entry — only update or add
- Coverage score must be between 0 and 100
- `writtenBy` must always be `"doc-sync"`
