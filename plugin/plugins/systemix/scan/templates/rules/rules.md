# Rules

Every design, brand, voice and legal-copy rule of this product as one row: an ID, the surfaces it
covers, how serious a break is, where it was decided, and how to test it. `/systemix:check` and the
known-bad evals (`design/evals/rules/`) read this file. Started {{TODAY}} by `/systemix:setup`;
these starter rows are generic, so replace them with this product's own.

**Where a rule's detail lives.** A row is the short form. The full rule stays where it was decided
(`design/DESIGN.md`, `design/guardrails.mdx`, a decision), named in Source. When a row and its
source disagree, the source is right and the row gets fixed.

## How to read a row

| Column | Values |
|---|---|
| ID | Area letter and a number. IDs never change or get reused; a retired rule keeps its row with severity `retired` |
| Surface | `product`, `marketing`, `email`, `docs`, or `all` (comma-separated) |
| Severity | `block`: fix before review or publishing. `flag`: fix it, or say why it is fine. `retired`: kept for history |
| Source | Where the rule is decided, with the date |
| Test | `script: <copy\|css\|html\|code\|any> /pattern/flags`: `systemix rules check` runs it. `review: <question>`: a person or the agent answers it by looking |

Write `\|` for a `|` inside a pattern. Raw values belong in `design/tokens.css` only, so don't run the
check on the tokens file itself.

## T · Tokens

| ID | Rule | Surface | Severity | Source | Test |
|---|---|---|---|---|---|
| T1 | Colours come from tokens: no raw hex values in components | product, marketing | block | design/guardrails.mdx | script: css /#[0-9a-fA-F]{3,8}\b/ |
| T2 | Font sizes come from the type scale tokens, not raw px | product | flag | design/guardrails.mdx | script: css /font-size:\s*\d+(\.\d+)?px/ |
| T3 | No arbitrary colour classes such as `bg-[#123456]` | product | block | design/guardrails.mdx | script: code /\b(bg\|text\|border\|fill\|stroke)-\[#[0-9a-fA-F]{3,8}\]/ |
| T4 | No arbitrary text sizes such as `text-[13px]` | product | flag | design/guardrails.mdx | script: code /\btext-\[\d+(\.\d+)?px\]/ |

## C · Components

| ID | Rule | Surface | Severity | Source | Test |
|---|---|---|---|---|---|
| C1 | One primary action per view | product | flag | design/guardrails.mdx | review: Is there more than one primary button on this view? |
| C2 | Use the design system's components; don't rebuild a primitive inline | product | flag | design/DESIGN.md | review: Is any button, field, dialog or card here built by hand instead of from the system? |

## A · Accessibility

| ID | Rule | Surface | Severity | Source | Test |
|---|---|---|---|---|---|
| A1 | Every image has alt text (empty alt for decoration) | all | block | WCAG 1.1.1 | script: html /<img(?![^>]*\balt=)[^>]*>/i |
| A2 | Every field has a visible label | product | block | WCAG 3.3.2 | review: Does every input, select and textarea have a visible label? |
| A3 | Text is never smaller than 12px | all | block | design/guardrails.mdx | script: css /font-size:\s*([0-9]\|1[01])(\.\d+)?px/ |

## V · Voice

| ID | Rule | Surface | Severity | Source | Test |
|---|---|---|---|---|---|
| V1 | No exclamation marks in product copy | product | flag | design/DESIGN.md (voice) | script: copy /\w!(\s\|$)/ |
| V2 | Links say where they go, never "click here" | all | flag | design/DESIGN.md (voice) | script: copy /\bclick here\b/i |
| V3 | No emoji in product copy | product | flag | design/DESIGN.md (voice) | script: copy /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u |
