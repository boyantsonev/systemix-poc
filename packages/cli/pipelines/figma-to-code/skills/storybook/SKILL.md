---
name: storybook
description: Read, verify, and update Storybook stories. Compares screenshots against the Figma spec and reports drift.
disable-model-invocation: true
argument-hint: [Component] [--verify figma-url?] [--fix?]
---

Storybook operation for: $ARGUMENTS

## Usage
```
/storybook                                    # list all components
/storybook [Component]                        # inspect a component
/storybook [Component] --verify [figma-url]   # compare vs Figma spec
/storybook [Component] --fix                  # update story to match Figma
```

## Steps

1. **Resolve mode from arguments**
   - No args → list mode: run `list-all-components` and `list-all-documentation`
   - Component name only → inspect: `get-documentation` + `get-story-urls` + screenshot
   - `--verify [figma-url]` → compare screenshots vs Figma spec, report drift
   - `--fix` → auto-fix: token mismatch → update CSS var, missing story → add `StoryObj`

2. **Inspect** (if component name given)
   - Locate the component file in `src/components/`
   - Read the `.stories.tsx` file alongside it
   - Report: stories found, props covered, variants missing

3. **Verify** (if `--verify` flag)
   - Extract Figma design context from the provided URL
   - Take a screenshot of each story at `localhost:6006`
   - Compare against the Figma screenshot — report: dimensions match, token values match, visual drift score

4. **Fix** (if `--fix` flag)
   - Token mismatch → replace hardcoded values with CSS custom properties
   - Missing variant → add a new `StoryObj` for each uncovered Figma variant
   - Write the updated `.stories.tsx` file

5. **Verify build**
   - Run `npx storybook build --quiet 2>&1 | tail -20`
   - If build fails: read error, fix, retry once

## Notes
- Requires Storybook running at `localhost:6006` for screenshot comparisons
- Do not delete existing stories without explicit user confirmation
- Run `/figma [url]` first to cache design context before `--verify`
