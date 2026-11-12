# The preview page

A designer approves what they can see. The preview is one HTML page rendered by code from a
tokens file: colour swatches (roles and reference tokens), each role pair with its contrast
ratio and pass or fail, the type scale, radius and spacing, with light and dark side by side.
It has no script and fetches nothing, so it works offline. Component specimens are not in this
version.

Setup's proposal and every visual gate in the loops point to it.

## Render it

**For a proposal not yet written** (the tokens live in a stage folder outside the repo), keep
the repo untouched:

```
{{CLI}} preview --tokens <stage>/design/tokens.css --out <stage>/preview.html --json
```

**For the repo's own tokens:**

```
{{CLI}} preview --json
```

This writes `design/.studio/preview.html`. It is one of the studio's automatic writes: it needs
no yes, and it is gitignored with the rest of `design/.studio/`.

The JSON is `{file, roles, references, pairs[{fg, bg, theme, ratio, ok}]}`. The numbers are the
same ones `tokens lint` prints.

## Show it

- Give the person the `file` path and say "open it in a browser".
- Quote the pairs that are not `ok`, with their `fg`, `bg`, `theme` and `ratio` exactly as the
  JSON has them. Never compute or round a ratio yourself, and never call a pair fine that the
  JSON marks as failing. When every pair is `ok`, say "every pair passes"; don't count them.
- If the page can't be rendered, say so and quote the error. Don't describe colours from memory
  instead.

## Sharing it

The page stays on the person's machine. Publishing it anywhere (for example as a shared page or
an attachment) happens only after the person says yes to that specific publish. Name where it
would go before asking.
