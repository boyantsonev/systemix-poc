---
id: G-001
title: Every text size on the landing page comes from the type scale
status: open
step: product.evals
opened: 2026-11-12
issue: 139
---

# Every text size on the landing page comes from the type scale

## Success criteria
- Every text size on the landing page is a named step of one type scale, defined once in
  `src/app/globals.css`.
- The page looks the same to a reader: no size changes that someone would notice.

## Kill if
- The scale needs more than 8 steps to cover the page without visible changes: then the page's
  type needs a design decision first, not a refactor.

## Context
- Asked as: "go", after the studio was installed on this repo (2026-11-12).
- `rules check` on the landing gives 0 blocks and 41 flags, all T4 (arbitrary text sizes such as
  `text-[13px]`). (source: product-studio rules check src/components/landing src/lib/landing
  src/app/page.tsx --surface marketing)
- The site already has motion tokens in `globals.css` but no type-scale tokens. (source:
  src/app/globals.css)
