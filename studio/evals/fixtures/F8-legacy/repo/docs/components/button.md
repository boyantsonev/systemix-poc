---
name: Button
slug: button
group: actions
status: ported
source: src/components/ui/Button.tsx
reference: null
platforms: [web]
---

# Button

## What & when

The one button. `primary` for the single main action of a screen, `secondary` for the rest.

## Props

| Prop | Type | Default | Notes |
| ---- | ---- | ------- | ----- |
| variant | "primary" \| "secondary" | "secondary" | one primary per screen |
| disabled | boolean | false | |
| onClick | () => void | | |
| children | React.ReactNode | | the label |

## Platform notes & deviations

None. See the experiment empty-notebook-2025-09 for why the empty state uses a primary button.

## Do & don't

- **Do** keep one primary per screen.
- **Don't** style a div as a button.
