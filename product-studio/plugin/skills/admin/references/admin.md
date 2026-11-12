# Admin: rate, runs, run, approve, decline

One section per subcommand. Every number you show comes from a CLI's `--json` output, quoted.

## rate [run-id|last] up|down "note"

The run defaults to `last`. The note is optional, in the person's own words, 300 characters or
fewer. Strip `"`, `$` and backticks from it, then:

`node "${CLAUDE_PLUGIN_ROOT}/scan/product-studio.js" runs rate last down "<their words>" --json`

(`up` for `down`, a run id for `last`.) Reply with the run rated and the rating. If the privacy
lint refuses the note, say so and ask for other words. Never write the note yourself.

## runs [--since YYYY-MM-DD]

`node "${CLAUDE_PLUGIN_ROOT}/scan/product-studio.js" runs list --since YYYY-MM-DD --json` (no `--since` when not given). Show every row of
`rows[]` newest first: run id, date, command, result, blocks, flags, rating (already merged on).
The JSON prints no total: state none, and no "N more" or date range of rows you didn't show.

## run

Typed by a person, or by an optional scheduled task that only runs `run`. Propose-only.

### 1 · Evals, key-free

`node "${CLAUDE_PLUGIN_ROOT}/scan/product-studio.js" admin eval --json`

Show `checks[]` as a table: name, ok, skipped, detail. `results` (the maintainer harness's file):
its `file`, `triggers` and `cases`, or "not run" when null.

### 2 · Digest, counts only

`node "${CLAUDE_PLUGIN_ROOT}/scan/product-studio.js" admin digest --json`

`since` defaults to the last admin run. Show: `runs`; per command its runs, ups, downs and
`downShare` (from `byCommand`); rules caught per surface (`rulesCaught`); `blocksFixed`;
`falsePositives` per rule; `errors` by message count. Quote; never add anything up.

### 3 · Signals and their thresholds

The digest lists `signals[]`, ranked by count. These thresholds live in the CLI; admin cannot
change them:

- the same rule dropped as a false positive 3 or more times;
- a command with 5 or more runs and a down share of 0.30 or more;
- the same error 2 or more times;
- a failing `admin eval` check;
- a trigger miss or negative firing in the results file.

Only signals marked `top: true` become proposals, at most 3 (`proposalsCap`). None marked top:
write nothing and say **"No proposals this run: nothing crossed a threshold."**

### 4 · One proposal per top signal

In the digest's order, for each top signal:

1. `node "${CLAUDE_PLUGIN_ROOT}/scan/product-studio.js" proposals next-id --json` gives the `id`.
2. Pick the target and kind:

   | Signal | target | kind |
   |---|---|---|
   | a rule dropped as a false positive | `client` | `rule-fix` (the row in `studio/rules.md`) |
   | a command rated down | `plugin` | `wording` |
   | a repeated error | `plugin` | `bug`, or `client` `rule-fix` when the error names a file under `studio/` |
   | a failing eval check | `client` | `rule-fix` or `new-eval` |
   | a trigger miss or negative firing | `plugin` | `trigger` |

3. Write `studio/proposals/<id>-<slug>.md` (slug: 2 to 4 lowercase words):

   ```markdown
   ---
   id: P-NNN
   title: <one line>
   target: client
   kind: rule-fix
   evidence: [<the signal's run ids, copied exactly>]
   status: New
   decided_by: null
   decided_at: null
   evals_before: null
   evals_after: null
   created: <today>
   ---
   ## Problem
   <one paragraph: what happened, with the digest's counts>
   ## Change
   <client: a fenced diff block with a unified diff against the current file. plugin: the change in words>
   ## How it will be checked
   <the admin eval check or eval case that shows it worked>
   ```

These files are `run`'s one automatic write (the person typed the command; no yes is needed).
Then `node "${CLAUDE_PLUGIN_ROOT}/scan/product-studio.js" proposals lint --json`. A problem in a file you wrote: fix it once, lint again.

### 5 · Connectors, then reply and log

Per `${CLAUDE_PLUGIN_ROOT}/skills/shared/connectors.md`: the digest page from `node "${CLAUDE_PLUGIN_ROOT}/scan/product-studio.js" connectors page digest --json`
and the notice from `node "${CLAUDE_PLUGIN_ROOT}/scan/product-studio.js" connectors notice digest --json`. Not connected: one line. Then each
proposal: id, title, target, kind, evidence ids. To rule: `/product-studio:admin approve P-NNN` or
`/product-studio:admin decline P-NNN "why"`. Then the admin row, proposal paths in `files_written`.

## approve P-NNN

1. `node "${CLAUDE_PLUGIN_ROOT}/scan/product-studio.js" proposals list --json`. Find the id; its status must be `New`. Show its Problem,
   Change and evidence.
2. Who rules: a name the person gave, else `git config user.name`. Ask: **"Approve P-NNN as
   <name>? (yes / no)"** and wait for the yes.
3. Strip `"`, `$` and backticks from the name, then
   `node "${CLAUDE_PLUGIN_ROOT}/scan/product-studio.js" proposals decide P-NNN approve --by "<name>" --json`. A name outside the roster is
   refused: say so, name who may rule, and stop.
4. **Client target.** Run `node "${CLAUDE_PLUGIN_ROOT}/scan/product-studio.js" proposals apply P-NNN --json`. It runs the evals before,
   applies the diff, runs them after, and reverts on any regression. Quote `status`, `before`,
   `after` and each of `regressions[]`. `Failed` means the change was reverted: say so. Never
   apply a diff by hand, retry it another way, or edit after a revert.
5. **Plugin target.** The decide output carries `draft: {title, body}`. Show it exactly. Edit
   nothing under the plugin's folder. Ask: **"File this as an issue on contextcraft/product-studio? (yes / no /
   give me a link)"**.
   - yes, and `gh auth status` succeeds: write the body to a temporary file outside the repo,
     then `gh issue create --repo contextcraft/product-studio --title "<title>" --body-file <that file>`. Quote the
     issue URL it prints.
   - "a link", or `gh` is missing or signed out: give
     `https://github.com/contextcraft/product-studio/issues/new` with `title` and `body` URL-encoded as the query.
   - no: file nothing. The proposal stays `Approved`.

In the studio's own repo, a plugin change goes through an ordinary pull request, not through admin.

## decline P-NNN "why"

The why is required: ask if missing. Ask the name as in approve, wait for the yes, strip `"`, `$`
and backticks, then `node "${CLAUDE_PLUGIN_ROOT}/scan/product-studio.js" proposals decide P-NNN decline --by "<name>" --why "<why>" --json`.
Reply with the id, the new status and the why.

## The scheduled task (optional)

Manual is the default. A person may set up a scheduled task that types `/product-studio:admin run`. It
runs `run` only: it never approves, declines, applies or files.

## Guardrails
- Self-modification of skills, triggers, scan code or rules happens only through a person's
  approve on a P-NNN file.
- `run` and scheduled tasks write nothing outside `studio/proposals/` and `studio/.state/`.
- At most 3 proposals per run, each with a run id or failing eval as evidence.
- Every applied change reruns the evals and records before and after. A regression reverts and
  marks the proposal Failed.
- Approve and decline are ruled by a person in the roster. The coding agent never approves its
  own proposal.
- Admin cannot change its thresholds, cap or rating frequency. That is a plugin-target proposal.
- `admin eval` needs no key and no network.
