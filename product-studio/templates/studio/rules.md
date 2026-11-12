# Rules

Every design, brand, voice and legal-copy rule of this product as one row: an ID, the surfaces it
covers, how serious a break is, where it was decided, and how to test it. The `check` and `brief`
commands read this file and nothing else, so a rule changes here or nowhere. Started {{TODAY}};
the starter rows are generic. Replace them with this product's own.

## How to read a row

| Column | Values |
|---|---|
| ID | An area letter and a number (T tokens, C components, A accessibility, V voice, L legal and claims; add your own letters). IDs never change and are never reused: a retired rule keeps its row with severity `retired` |
| Surface | `product`, `marketing`, `email`, `docs`, or `all` (comma-separated) |
| Severity | `block`: fix before review or publishing. `flag`: fix it, or say why it is fine. `retired`: kept for history, never checked |
| Source | Where the rule was decided (`studio/DESIGN.md`, a decision, a standard), with the date |
| Test | `script: <copy\|css\|html\|code\|any> /pattern/flags`, which the check runs, or `review: <question>`, which a person or the agent answers by looking |

## How to add a rule

1. Add a row to the table for its area, with the next free ID in that letter.
2. Prefer a `script:` test when a pattern can catch the break; write `\|` for a `|` inside a pattern.
   `copy` is visible text, `css` is stylesheets, `<style>` blocks and `style=""`, `html` is markup,
   `code` is the raw file, `any` is all of them.
3. For a `script:` rule, add a sample of bad work that must trip it to `studio/rules/known-bad/`,
   named `<ID>-<what>.<ext>` (for example `T1-raw-hex.css`).
4. For a `review:` rule, add a bad and a good snippet with the expected answer to
   `studio/rules/review-cases.json`.
5. Run `rules lint` (every row well formed) and `rules eval` (every sample caught, the known-good
   files clean, every rule covered). A rule that fails its eval is not ready for anyone to rely on.

The token source (`studio/tokens.css`) and the samples in `studio/rules/` are never checked: raw
values belong there.

## T · Tokens

| ID | Rule | Surface | Severity | Source | Test |
|---|---|---|---|---|---|
| T1 | Colours come from tokens: no raw hex values in styles | product, marketing, email | block | studio/DESIGN.md | script: css /(?<=:[^;{}]*)#[0-9a-fA-F]{3,8}\b/ |
| T2 | Font sizes come from the type scale tokens, not raw px | product, marketing | flag | studio/DESIGN.md | script: css /font-size:\s*\d+(\.\d+)?px/ |
| T3 | No arbitrary colour classes such as `bg-[#123456]` | product, marketing | block | studio/DESIGN.md | script: code /\b(bg\|text\|border\|fill\|stroke)-\[#[0-9a-fA-F]{3,8}\]/ |
| T4 | No arbitrary text sizes such as `text-[13px]` | product, marketing | flag | studio/DESIGN.md | script: code /\btext-\[\d+(\.\d+)?px\]/ |

## C · Components

| ID | Rule | Surface | Severity | Source | Test |
|---|---|---|---|---|---|
| C1 | One primary action per view | product, marketing | flag | studio/DESIGN.md | review: Is there more than one primary button on this view? |
| C2 | Use the design system's components; don't rebuild a primitive inline | product | flag | studio/DESIGN.md | review: Is any button, field, dialog or card here built by hand instead of from the system? |

## A · Accessibility

| ID | Rule | Surface | Severity | Source | Test |
|---|---|---|---|---|---|
| A1 | Every image has alt text (empty alt for decoration) | all | block | WCAG 1.1.1 | script: html /<(img\|Image)\b(?![^>]*\balt=)[^>]*>/ |
| A2 | Every field has a visible label | product, marketing | block | WCAG 3.3.2 | review: Does every input, select and textarea have a visible label? |
| A3 | Text is never smaller than 12px | all | block | WCAG 1.4.4 | script: css /font-size:\s*([0-9]\|1[01])(\.\d+)?px/ |

## V · Voice

| ID | Rule | Surface | Severity | Source | Test |
|---|---|---|---|---|---|
| V1 | No exclamation marks in product copy | product | flag | studio/DESIGN.md (voice) | script: copy /\w!(\s\|$)/ |
| V2 | Links say where they go, never "click here" | all | flag | studio/DESIGN.md (voice) | script: copy /\bclick here\b/i |
| V3 | No emoji in product copy | product | flag | studio/DESIGN.md (voice) | script: copy /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u |

## L · Legal and claims

| ID | Rule | Surface | Severity | Source | Test |
|---|---|---|---|---|---|
| L1 | No unqualified superlatives or guarantees (an example: set your own words) | marketing, email, product | flag | studio/DESIGN.md (claims) | script: copy /\b(best-in-class\|guaranteed\|world-class\|100% (secure\|safe))\b/i |
