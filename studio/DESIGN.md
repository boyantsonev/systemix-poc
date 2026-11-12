# DESIGN.md · Systemix (the proof of concept for the product studio)

This site's design system is **TVA · Amber Mainframe**. Its narrative (overview, colour,
type, layout, components, voice) lives in `design/DESIGN.md`, and its tokens are canonical in
`src/app/globals.css` (oklch, light and dark). The motion layer lives in `src/styles/motion.css`,
with its `--motion-*` tokens in `globals.css`.

The studio reads this file first, then `studio/rules.md`. Both older paths stay where they are
while the earlier Systemix CLI still reads them. Moving them into `studio/` is an open question
for a person (see below).

## Surfaces

- **marketing**: the landing page (`src/app/page.tsx`, `src/components/landing/`,
  `src/lib/landing/content.ts`) and the docs.
- **product**: the app pages under `src/app/` other than the landing.

## Voice (marketing)

From `docs/feature/product-studio/copy-deck.md`:

- One term per thing: the studio, the five commands by name, rules (`studio/rules.md`), "a person
  makes every call", and setup (the paid service, done by a designer).
- Marketing copy never says "the rot", "ghost mode", "autonomy" or "the loop" as a noun on its
  own (rule M1).

## Open questions for a person

- Should `design/DESIGN.md` and the old loop kit in `design/` move into `studio/` now? `migrate`
  can do it, but the older Systemix CLI and its CI step still read `design/`.
- There is no `studio/tokens.css` yet: the tokens live in `globals.css`. Should the studio's
  layered `tokens.css` become the source, with `globals.css` importing it?
