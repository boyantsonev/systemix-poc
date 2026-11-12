# Door: from an interview

For a repo with no UI yet. A short conversation about the product, its people and what its
colours should mean, then a first draft of the system in the person's own words. Everything goes
into `<stage>` (made by the setup guide); nothing is written to the repo before the yes.

## Guard first

If the audit from setup step 1 shows `files.ui` above 0, stop. Say there is UI already, and that
the code door reads it: `{{ROOT}}/skills/setup/references/from-code.md`. Don't interview over
code that already decides things.

## The interview

At most 8 questions. **One question per turn, never two**: each turn ends with exactly one
question, one sentence with one question mark. Never add "And …?" or a second ask, even a
short one; a choice between options ("soft or sharp?") is one question. Reflect each answer back
in one line before the next question. Ask them in this order. Ask question 1 even when the
README suggests an answer: quote the README's line and ask whether it is right. If an answer
already covers a later question, skip that question and say so. If the person says "you
choose", choose, say what you chose, and list it under open questions.

1. **The product.** What is it, in one sentence?
2. **The people.** Who uses it most, in what moment (in a hurry, at a desk, worried)?
3. **The product's colour.** If the product were a colour, which one would it be, and why?
4. **The feeling.** What one word should using it feel like?
5. **Shape and density.** Should it feel soft and airy, or sharp and compact?
6. **Type.** Which typeface and scale do you want (the system font and a generous scale are
   fine)?
7. **Voice.** What does the product never say, in words or in tone when something goes wrong?
8. **Claims.** What must it never claim, or always disclose (guarantees, "best", numbers you
   can't back)?

## From associations to tokens

Map meaning to oklch, then let code check it. You choose hue, chroma and lightness by
judgement; `tokens lint` computes contrast.

- **Hue** follows the association: warm and friendly sits near 40 to 70 (orange, amber),
  growth and calm near 140 to 160 (green), trust and focus near 230 to 260 (blue), playful or
  creative near 300 to 330 (violet, pink).
- **Chroma** follows the feeling: calm or serious is low (0.04 to 0.10), energetic is higher
  (0.12 to 0.20).
- **Lightness** is for contrast: a primary that carries white text sits near 0.45 to 0.55;
  backgrounds sit near 0.98 in light and near 0.18 in dark.

Worked example. "Deep water, calm, trustworthy" and "calm":

```css
--ref-blue-50:  oklch(0.98 0.01 245);
--ref-blue-600: oklch(0.48 0.10 245);
--ref-blue-300: oklch(0.75 0.08 245);
--primary: var(--ref-blue-600);            /* light: deep water */
--primary-foreground: var(--ref-blue-50);
/* dark theme: --primary: var(--ref-blue-300); --primary-foreground: a near-black step */
```

Say why in DESIGN.md: "Primary is a calm, deep blue because the product should feel like deep
water: steady and trustworthy."

In the proposal, name the primary's oklch value as written in the draft (for example
`oklch(0.48 0.10 245)`) and give one line each for its hue, chroma and lightness, tied to the
person's words: "hue 245 for deep water, chroma 0.10 because they said calm, lightness 0.48 so
white text reads on it". These are values you chose, not computed ones; contrast is the CLI's.

## Draft (into the stage)

- `<stage>/studio/DESIGN.md` from `{{ROOT}}/templates/studio/DESIGN.md`: the product, the
  people, the principles, the voice and the claims, in the person's words. The associations are
  the rationale for the palette.
- `<stage>/studio/tokens.css` from `{{ROOT}}/templates/studio/tokens.css`: reference tokens
  (`--ref-<hue>-<step>`) holding the oklch values, every required role name from the template
  header in both the light and the dark theme pointing at them with `var(…)`, then
  `--font-size-*`, `--space-*` and `--radius*` from the shape, density and type answers.
- `<stage>/studio/rules.md`: `rules init` already put the starter rows there. Add V and L rows
  from answers 7 and 8 with the grammar in the file's header: a `script:` test with a known-bad
  sample in `<stage>/studio/rules/known-bad/<ID>-<what>.<ext>` where a pattern can catch it,
  else a `review:` question with a bad and a good case in
  `<stage>/studio/rules/review-cases.json`. Rows that are taste, not need, carry
  `example: true` in their Source cell.

If `tokens lint` on the stage reports a failing pair, move the lightness of one side and run it
again. Quote the `ratio` the CLI printed, at least the `lowest` (setup step 4); never estimate one.

## Hand back

Return to the setup guide's common finish: the three checks, the preview, the proposal with
open questions (every choice you made for the person, and every question they skipped), and
the stop before any write.
