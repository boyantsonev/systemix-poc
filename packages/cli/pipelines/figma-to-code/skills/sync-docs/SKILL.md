---
name: sync-docs
description: Sync all documentation entries in lib/data/docs.ts from live component, token, and brand data
argument-hint: "[scope] (optional: path to single component file)"
---

# /sync-docs — Documentation Sync

Sync `src/lib/data/docs.ts` with the current design system state.

## Source files to read

1. `src/lib/data/components.ts` — `Component[]` array. Each entry has: `slug`, `name`, `status`, `category`, `sourceFile` (path to the .tsx), `driftInstances[]`
2. `src/lib/data/tokens.ts` — token registry. Groups of `TokenEntry[]` with `cssVar`, `value`, `figmaVariable`, `syncStatus`
3. `src/lib/data/brands.ts` — `Brand[]` array with `slug`, `name`, `tokens[]`
4. Each component's `.tsx` source file (path from `Component.sourceFile`) — extract props interface and CSS var usage

## Types you are writing (from `src/lib/data/docs.ts`)

```ts
type ComponentDoc = {
  type: "component";
  slug: string;          // matches Component.slug
  name: string;
  status: "current" | "stale" | "drifted" | "draft";
  category: string;
  summary: string;
  meta: { writtenBy: string; writtenAt: string; runId: string; sourceFile?: string };
  props: { name: string; type: string; default?: string; required?: boolean; description: string }[];
  tokens: { cssVar: string; property: string; currentValue: string; figmaVariable: string; status: "synced"|"drift"|"stale" }[];
  driftInstances: DriftRow[];  // preserve existing value
  variants: VariantDef[];      // preserve existing value
  usageExample: string;        // preserve existing value
  storyCount: number;          // preserve existing value
  coverageScore: number;       // 0–100
};

type VariableGroupDoc = {
  type: "variable-group";
  slug: string;
  name: string;
  status: "current" | "stale" | "drifted" | "draft";
  meta: { writtenBy: string; writtenAt: string; runId: string };
  description: string;
  variables: { name: string; value: string; figmaVariable: string; syncStatus: string; usedIn: string[]; description?: string }[];
};
```

## Steps

1. Read `src/lib/data/components.ts` and `src/lib/data/tokens.ts` to build the current inventory.

2. For each `Component`, read its source `.tsx` file to extract:
   - Props interface fields → `props[]` (name, type, infer default from defaultProps or `= value`, required if no `?` or default)
   - CSS variable references (`var(--...)`) in className or style attrs → `tokens[]`

3. For each token group in `tokens.ts`, prepare a `VariableGroupDoc` entry.

4. Read `src/lib/data/docs.ts` to get existing entries and build a map by `slug`.

5. Classify each component/group:
   - **missing**: slug not in existing docs → new entry, `status: "draft"`
   - **drifted**: props list changed vs existing entry → `status: "drifted"`
   - **stale**: `writtenAt` >7 days before today's ISO date → `status: "stale"`
   - **current**: nothing changed → skip (report as unchanged)

6. Show HITL summary before writing — **wait for approval**:
   ```
   sync-docs: N to create, M to update, K unchanged
   Create: [slug1, slug2, ...]
   Update: [slug3 (drifted), slug4 (stale), ...]
   ```

7. On approval, write the updated `docs.ts`:
   - `writtenBy: "doc-sync"`
   - `writtenAt: new Date().toISOString()`
   - `runId: crypto.randomUUID()` (or a short timestamp-based id if unavailable)
   - `coverageScore: Math.round((props.filter(p => p.description).length / props.length) * 100)` — default 100 if no props
   - Preserve `driftInstances`, `variants`, `usageExample`, `storyCount` from existing entry if present

8. Print completion: `sync-docs complete: N created, M updated, K unchanged`.

## Scope

If `$ARGUMENTS` contains a file path (e.g. `src/components/ui/button.tsx`), restrict the sync to that single component only — skip all others.

## Rules

- Never delete an existing entry — only add or update
- `coverageScore` must be clamped to 0–100
- `writtenBy` must always be `"doc-sync"`
- Preserve fields you are not regenerating (`driftInstances`, `variants`, `usageExample`, `storyCount`)
- The output file must remain valid TypeScript — keep the existing imports, type exports, and `export const docs` structure intact
