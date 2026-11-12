# Door: from the code

For a repo that ships UI but has no design system yet. You read what the code already is, and
draft a system that names it. Everything goes into `<stage>` (made by the setup guide); nothing
is written to the repo before the yes.

## 1. Read the audit

Use the `node "${CLAUDE_PLUGIN_ROOT}/scan/product-studio.js" audit --json` output from setup step 1. If the person named folders, rerun it
on them: `node "${CLAUDE_PLUGIN_ROOT}/scan/product-studio.js" audit <dirs> --json`. If the command fails, stop: print no numbers, say what
failed, and list it under "couldn't read".

Save the JSON to a file in `<stage>`. Every number you print is a value from that JSON, quoted
as it is: the size of each drift list is `driftCounts`. Never count by eye.

Show the person, in plain words:

- `setupClass` (fresh, partial or mature) and what it means here;
- `tokenSource` (`file`, `kind`, `count`) and `tokenCoverage.share`;
- the top of `palette`, `typeScale` and `spacing`, with their counts;
- `drift`: the critical entries with `file:line`, then `driftCounts` for each severity;
- `duplicates` and `primitives`, by name and file;
- the components the UI files define, each by name and path (for example
  `Button` in `src/widgets/Button.tsx`), from the audit's `components` list; never assume
  `components/ui`. Name them; don't count them;
- `images.withoutAlt` of `images.total`.

## 2. Cluster the palette (the one judgement step)

Group the `palette` values into a few hues by eye: near-identical greys are one family, a brand
blue and its hover shade are one family. Merge only inside a family: a neutral grey and a warm
grey are two families. For each family:

- name reference tokens `--ref-<hue>-<step>` (for example `--ref-blue-600`), holding the literal
  values as the audit printed them;
- map the role tokens (the required names in the tokens template header) to them with
  `var(--ref-…)`. A role never holds a raw value.

Every distinct `palette` value either becomes a reference token or is listed under "merged
into", with the exact token name that replaces it and why (for example "`#1a1a1b` merged into
`--ref-grey-900`: one step apart, same use"). Never "dropped" and never a loose name like "the
brand violet": a value you replace (an unreadable grey) is merged into the named token that
takes its job. Aim to keep at least nine in ten values reachable this way. Don't convert values by hand: keep the format the code uses; `tokens lint` reads hex,
rgb, hsl, oklch and oklab.

Draft the dark theme: the same role names, pointing at other reference steps. The proposal
shows a role table (role · light `var(--ref-…)` · dark `var(--ref-…)`) for at least background,
foreground, primary, muted-foreground and border. Then the scale
tokens: `--font-size-*` from `typeScale`, `--space-*` from `spacing`, `--radius*` from what the
code uses. Scale tokens may hold raw values.

## 3. One token file, never two

- `tokenSource.kind` is `none`: `design/tokens.css` is the token file.
- More than one source (the audit's `openQuestions` names them), or `css-vars`: which file is
  canonical is a person's call and a blocking question. Ask it, naming every file and your
  recommendation, in the same message as step 6, and wait. Once answered, the proposal holds
  the values in that one file and shows, as a diff, each other file pointing at it with
  `var(--…)` or removed; a design-tool export stays an import source only.
- `tokens-json`: run `node "${CLAUDE_PLUGIN_ROOT}/scan/product-studio.js" tokens diff --from <that file> --tokens <stage>/design/tokens.css --json`
  and show its rows. Each row's `status` is computed by the CLI.
- `tailwind-config`: draft `design/tokens.css` and propose that the config's colours point at
  `var(--…)`, shown as a diff.

Never leave two files that both claim to hold the tokens.

## 4. Draft DESIGN.md

Start from `${CLAUDE_PLUGIN_ROOT}/templates/design/DESIGN.md`. Fill what the code shows: what the product is
(from the README and screens), the components that exist, each named with its path (from `components`;
don't assume `components/ui`), the palette's families and their use.
Leave people, principles, voice and claims as short questions for the person when the code
doesn't say. Never invent a persona, a value or a claim.

## 5. Draft the rule rows

`rules init` already put the starter rows in `<stage>/design/rules.md`. Make them this repo's,
using the row grammar in that file's header ("How to add a rule"):

- **Keep T1 to T4** (raw colours, px font sizes, arbitrary colour and size classes). The
  audit's drift is what they catch.
- **Unruled drift.** For each kind of `drift` entry the T rows don't cover (raw spacing, raw
  radius, inline styles), propose one new row with the next free ID, a `script:` test, and a
  known-bad sample in `<stage>/design/rules/known-bad/<ID>-<what>.<ext>`. Write the sample by
  hand, as a few lines of new code that show the break. Never copy repo files into samples.
- **Duplicates.** Each entry in `duplicates` is a question for a person (which copy stays), and
  a reason to keep C2.
- **Images.** A1 already covers missing alt text.
- Remove a starter row only when it can't apply here, and say why.

## 6. Voice and claims (ask once)

Ask in one short message, then wait:

1. Words or phrases the product never uses?
2. Disclosures that must appear (pricing, legal, regulated wording)?
3. Claims you must not make (guarantees, "best", numbers you can't back)?

Turn each answer into a V or L row with a `script:` test where a pattern can catch it, else a
`review:` question with a bad and a good case in `<stage>/design/rules/review-cases.json`. Each
scripted row gets a known-bad sample. Rows that are only taste (the house voice, not a legal
need) carry `example: true` in their Source cell, so the team knows to confirm them. If the
person skips the questions, keep the starter V and L rows and list the three questions under
open questions.

## 7. Hand back

Return to the setup guide's common finish: the three checks on `<stage>`, the preview, the
proposal with open questions, and the stop before any write. Fold in, as open questions:

- every `openQuestions` entry from the audit, quoted;
- which token file is canonical, when there were two, until the person answers;
- which copy of each duplicated component stays;
- the drift you saw but did not turn into a rule, and why.
