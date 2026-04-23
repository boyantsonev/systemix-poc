---
name: component
description: Generate a hi-fi React component from a Figma design node
disable-model-invocation: true
argument-hint: [figma-url] [component-name?]
---

Generate React component from Figma: $ARGUMENTS

## Steps

1. Extract design context using `/figma` workflow

2. Analyze the design:
   - Component structure and hierarchy
   - Layout patterns (flex, grid, bento)
   - Interactive states
   - Responsive considerations

3. Generate the component:
   - Use existing project patterns (check `src/components/`)
   - Apply design tokens from `globals.css`
   - Use `lucide-react` for icons
   - Follow shadcn/ui patterns where applicable

4. Write the component file to `src/components/`

5. Update `page.tsx` if needed to include the new component

6. Run build to verify: `npm run build`

## Code Conventions

- TypeScript with proper types
- Tailwind CSS with CSS variables: `bg-[var(--primary)]`
- Default border radius: `rounded-[var(--radius-xl)]`
- Font: General Sans (already configured)
- Semantic class naming
- No unnecessary comments or over-engineering

## Output Structure

```tsx
import { Icon } from "lucide-react";

export function ComponentName() {
  return (
    <section className="...">
      {/* Clean, minimal implementation */}
    </section>
  );
}
```
