# Design

The narrative of this product's design system: what the product is, who it is for, what it values
and how it speaks. The values live in `studio/tokens.css` and the rules in `studio/rules.md`; this
file says why. Write it in plain sentences, in the team's own words. Where the team has not decided
something yet, leave the question in place rather than guessing an answer.

## Product

<!-- What the product is and what it helps someone do, in two or three sentences. Name the main
surfaces (the app, the marketing site, email) and which matters most. -->

## People

<!-- Who uses it, in their own terms: what they are trying to get done, where they are when they
use it, what they already know. One short paragraph per kind of person. No invented personas:
write only what the team knows, and list what it doesn't under Open questions. -->

## Principles

<!-- Three to five principles that settle a design argument, each one sentence plus why. A
principle names a trade-off ("dense over spacious, because people compare many rows at once"),
not a virtue everyone already agrees with. -->

## Voice

<!-- How the product speaks: a few adjectives with what each means in practice, words the team
uses and words it avoids, and the punctuation it keeps out of the interface. Each rule that a
pattern can catch becomes a V row in `studio/rules.md`. -->

## Claims

<!-- What the product may and may not say about itself: claims it can back, claims it never makes,
and disclosures it always carries. Each one becomes an L row in `studio/rules.md`. -->

## Look

<!-- The palette's families and what each is for, with the reason behind each choice ("primary is a
calm, deep blue because the product should feel steady"). Then type, shape and density in a
sentence each. Values do not go here: they live in the tokens. -->

## Tokens

The canonical values are in `studio/tokens.css`: reference tokens (`--ref-*`) hold the raw values,
role tokens (`--background`, `--primary`, …) point at them, in light and dark. Components read role
tokens only. To change a value, change it there, run `tokens lint`, and look at the preview.

## Rules

Every rule is a row in `studio/rules.md`, with its surface, severity, source and test. A rule that
is not a row there is not a rule. The header of that file says how to add one.

## Open questions

<!-- What only the team can decide, one question per bullet. Remove a bullet once it is answered
above. -->
