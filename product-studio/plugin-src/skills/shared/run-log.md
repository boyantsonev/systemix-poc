# Run log: the last step of every command

Every command (setup, brief, check, loop, admin) ends here, once. The row says what the run did,
so a person can later see what the studio caught, what it got wrong and what to improve. Log
short runs, stopped runs and failed runs too. A run that errored still gets its row.

The log is `studio/.state/runs.jsonl`, one JSON object per line. It is local and gitignored by
default. Appending to it is one of the three automatic writes: no yes is needed. Rows are only
ever appended, never edited.

## 1 · Build the row

One JSON object with exactly these fields. The CLI fills `run`, `at` and `studio_version`, and
rejects any field not listed here.

| Field | Value |
|---|---|
| `kind` | `run` (an admin run uses `admin`) |
| `command` | `setup`, `brief`, `check`, `loop` or `admin` |
| `args` | what the person asked for, as a short string (`--changed`, `--surface email`, `--score`) |
| `surface` | `product`, `marketing`, `email`, `docs`, or null |
| `depth` | `quick`, `full`, `light`, or null |
| `goal` | `G-NNN` if the work belongs to a goal, else null |
| `result` | `pass`, `pass-with-flags`, `pass-with-fixes`, `fail`, `proposed`, `written`, `stopped-at-gate` or `error` |
| `blocks`, `flags` | the integers from the command's JSON (`rules check` gives them); 0 when nothing was checked |
| `false_positives` | `[{rule, where, why}]` for every hit that was dropped, with the reason. Be specific: this is how a rule that misfires gets found |
| `sources` | the sources read, by name or repo-relative path (`studio/rules.md`, `studio/decisions`, `code`) |
| `files_written` | repo-relative paths written in this run after a yes; `[]` when none |
| `duration_s` | null (no one times the run by hand) |
| `rating` | `none` (a rating is its own row, step 3) |
| `note` | the person's own words about the run, 300 characters or fewer, or `""` |

`result` is what the run ended in: check uses the verdict; brief uses `pass` when the brief was
given; setup uses `proposed` or `written`; loop uses `stopped-at-gate` at a gate. Use `error` when a
command failed and the run could not finish.

## 2 · Append it

Send the row on stdin through a quoted heredoc, so the shell expands nothing inside it:

```bash
{{CLI}} runs log --json - <<'ROW'
{"kind":"run","command":"check","args":"--changed","surface":"product","depth":"light","goal":null,"result":"pass-with-flags","blocks":0,"flags":2,"false_positives":[],"sources":["studio/rules.md"],"files_written":[],"duration_s":null,"rating":"none","note":""}
ROW
```

It prints `{ok, run}`. Keep the `run` id for step 3. If it prints `{ok:false, problems[]}`, fix the
field each problem names and append again, once. Never put a value the privacy lint refused back in
by another field. If it still fails, say "The run log refused this row" in one line and carry on.

## 3 · Ask for a rating, only when told to

```bash
{{CLI}} runs should-ask --json
```

It prints `{ask, why}`. When `ask` is false, ask nothing. When it is true, ask once, in one line,
after the result and above the reply's closing commands, and do not wait for the answer:

> Was this useful? Up or down, and a few words if something was off.

- When the person answers, record it: `{{CLI}} runs rate last up --json` or
  `{{CLI}} runs rate last down "<their words>" --json`. Quote their words in double quotes and keep
  any `"`, `$` or backtick out of them.
- When the person moves on without answering, record the skip: `{{CLI}} runs rate last skip --json`.
- Never ask again at the start of the next run. Never block on it. The person can rate any time
  later with the admin command.

## 4 · Say so

One line, after the result: **Logged this run.** In the reply it sits above the closing commands
(the stop report, or "Next"), so the reply still ends with what the person answers with.

**The whole reply comes after this step.** The person reads only your last message, so text
written before the log and rating commands is lost. Run them first, then write the full reply in
one final message: the draft, file list, diff or brief the person is asked to say yes to goes in
that message in full, never "the files above".

## Privacy

- `note` holds only what the person said about this run, in their words. Never a summary of the
  conversation, never repo text, never anything from their private sources. The one addition: a
  run that posted a page records `page: <link>` there, per `{{ROOT}}/skills/shared/connectors.md`.
- No customer names, emails, account details, secrets, tokens, URLs with a query string or home
  paths in any field. The CLI's privacy lint rejects these and names the field; fix that field.
- `sources` names a source, never quotes it. A private source is written as `private source`.
