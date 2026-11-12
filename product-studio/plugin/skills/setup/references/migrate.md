# Door: from an older install

For a repo set up with an earlier version: its system in `design/` (`DESIGN.md`, `tokens.css`), rules in `design/guardrails.mdx`, learnings and
goals under `experiments/`, runtime state in `.systemix/`, rule samples in `design/evals/rules/`.
The CLI lists the moves that need no judgement; you turn each guardrail bullet into a proposed
rule row. Nothing is written before the yes.

## 1. The dry run (writes nothing)

```
node "${CLAUDE_PLUGIN_ROOT}/scan/product-studio.js" migrate --json
```

A dry run is the default. It prints:

- `moves[{from, to, action}]`, where `action` is `move`, `rewrite`, `drop` or `create`.
  `experiments/LEARNINGS.md` moves to `studio/LEARNINGS.md` with its bullets rewritten to the
  learnings grammar; `experiments/goals/*` become proposed `studio/goals/G-NNN-<slug>/goal.md`;
  `design/evals/rules/*` move to `studio/rules/*`; `design/DESIGN.md`, `tokens.css` and the other
  system files move to `studio/` as they are; `.systemix/` is runtime state and is dropped.
- `guardrails[{line, text}]`: every bullet of `design/guardrails.mdx`, for you to map.
- `unmapped`: learnings bullets the CLI could not rewrite.
- `legacy`: which old pieces are present.

Show the moves as a table, exactly as printed. Quote each `unmapped` bullet: each is an open
question (rewrite it by hand, or leave it out).

`docs/components/` and `docs/manifest.json` stay where they are; nothing moves them.

## 2. Map every guardrail bullet to one row

Read `studio/rules.md` in the stage (the setup guide ran `rules init` there). For each entry in
`guardrails`, in order, choose exactly one:

- **A scripted row**, when a pattern can catch a break: ID, rule, surface, severity, source
  (`design/guardrails.mdx line <line>`, with today's date), and `script: <where> /pattern/`.
  Add a known-bad sample in `<stage>/studio/rules/known-bad/<ID>-<what>.<ext>`.
- **A review row**, when only looking can tell: `review: <question>`, plus a bad and a good
  case in `<stage>/studio/rules/review-cases.json`.
- **The same as starter rows**: name the ID, or the IDs that together cover it (for example
  T3 and T4 for colour and size classes); no new row.
- **An open question**, when the bullet is unclear, contradicts another, or is not a rule
  (a wish, a note). Quote it.

Show a table: `line · bullet (quoted) · mapped to (ID, new or existing) · test`. Every bullet
appears exactly once, in one row of the table. Learnings bullets are not mapped here: the CLI
rewrites them; show its `unmapped` list only. Use the grammar in the header of `studio/rules.md`.

## 3. The pointer

`design/guardrails.mdx` is not deleted. Propose replacing its body with one line:

```
The rules now live in studio/rules.md. This file is kept only as a pointer.
```

## 4. Propose, then apply after the yes

Return to the setup guide's common finish on the stage: the three checks, the preview (when
there is a `studio/tokens.css`), and one proposal with the moves table, the bullet table, the
pointer diff and open questions. Then stop.

On the yes:

1. `node "${CLAUDE_PLUGIN_ROOT}/scan/product-studio.js" migrate --apply --json`. It performs the moves and prints the same JSON with
   `applied: true`. It never deletes `design/guardrails.mdx`.
   If it refuses because the working tree has uncommitted changes under the paths it would
   touch, show its message and stop. Committing or stashing is the person's job; never do it
   for them.
2. Copy the staged rule rows, samples and review cases into `studio/rules.md` and
   `studio/rules/`.
3. Write the pointer into `design/guardrails.mdx`.
4. Run `node "${CLAUDE_PLUGIN_ROOT}/scan/product-studio.js" rules lint --json` and `node "${CLAUDE_PLUGIN_ROOT}/scan/product-studio.js" rules eval --json`. Both must be `ok`.
5. When goals moved: they need loops to live in and evals to be ruled on. If `studio/loops/` does
   not exist, offer the loop setup (`${CLAUDE_PLUGIN_ROOT}/skills/loop/references/status-and-setup.md`) and
   run it only on a yes. Then run `node "${CLAUDE_PLUGIN_ROOT}/scan/product-studio.js" loops check --json`. A migrated goal has no evals yet,
   so expect `loops check` to name each one: list them under the open questions with the next
   step, `/product-studio:loop open` on that goal's sentence, typed by a person. Any other problem
   must be fixed before you finish.

## Open questions this door adds

- Each guardrail bullet you could not map, quoted.
- Each `unmapped` learning, quoted.
- Any goal whose number or slug you would change.
- References to the old paths in the team's own docs or scripts: list the files; don't edit them.

Return to the setup guide for the reply and the run-log row.
