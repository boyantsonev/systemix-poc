# Score (beta)

The readiness score of `/product-studio:check --score`: how ready this repo's design system is for
coding agents to follow. It is **beta** and read-only. The CLI computes every number; you present
them, word the top opportunities and list the open questions.

## 1 · Run it

```bash
node "${CLAUDE_PLUGIN_ROOT}/scan/product-studio.js" score --json
node "${CLAUDE_PLUGIN_ROOT}/scan/product-studio.js" audit --json
```

Pass folders only when the person names them: `node "${CLAUDE_PLUGIN_ROOT}/scan/product-studio.js" score '<dir>' … --json`. The audit is read
for its `openQuestions` only.

## 2 · Present it

Quote, never compute. Every number you print appears verbatim in the score JSON: no "X of Y",
difference or total that the JSON doesn't print itself, and no findings (file and line) of your own.

```
Readiness score (beta): <score>/100 · coverage <coverage>
```

- If `score` is null, print **withheld** and the `withheld` reason, word for word. Do not estimate,
  round a partial result or offer a number of your own. Name the dimensions whose `score` is null:
  those inputs could not be computed.
- A table of the six `dimensions`: name, weight, score, and its `why`.
- `nearThreshold`: each entry with its JSON field names, as printed:
  `<dimension>: score <score>, band <band>, next <next>, distance <distance>`. No other gap to a
  band edge: if an entry isn't there, don't work one out.
- The `validity` sentence and every line of `limits`, word for word.

## 3 · Top three opportunities

Take the first three of `opportunities` in the order printed (it is already ranked), numbered 1
to 3, each headed `<dimension> · gap <gap> · priority <priority>` as printed. If its `tie` lists
dimensions, say so. For each, one plain sentence on what to do next and which command helps:

- tokens: `/product-studio:setup` (a token source, role tokens);
- rules: add rows, samples and review cases, then `rules lint` and `rules eval`;
- drift: `/product-studio:check --changed` on each branch;
- components: merge the duplicates the audit names;
- rationale: record decisions and learnings with their sources;
- accessibility: the A rows and the contrast pairs from `tokens lint`.

Name the dimension and its gap from the JSON. Don't promise a new score.

## 4 · Open questions for a person

End with a section titled **Open questions for a person**: the audit's `openQuestions`, then any
contradiction you saw yourself, labelled agent reading (two token sources, two type scales, a
duplicate primitive with no canonical choice). These are choices code can't make.

## Rules for this page

- No share link, no tiers, no pricing, no claim about what a paid engagement shows.
- Writes nothing. Its only record is the run-log row (`args: "--score"`, `result: "pass"`, or
  `error` when the score command failed).
