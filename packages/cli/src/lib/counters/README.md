# Audit counters

`systemix audit counters` counts a repo's design system and prints **one JSON report**. It is a script: no
model, no network, no clock, nothing written. The audit skills (`/design-audit`, `/readiness-audit`,
`/drift-report`) are meant to quote this report instead of counting by hand; see [The rule for skills](#the-rule-for-skills).
**Today none of the three SKILL.md files calls it yet** (the counters and the rule were built first); until they
do, a skill that quotes it does so because its operator ran the command and handed it the JSON.

## Why it exists

A dry run audited one repo three times with those skills and had every claim checked.

- The facts mostly held (68.8% of 176 claims fully, 87.9% of presence checks), but the three scores did not
  reproduce (63 / 55 / 60).
- The skills left the counting definitions open: unit (matches vs lines vs files vs distinct values), file
  population (tests in or out, a mockup file in or out, vendored `ui/` in or out), which file is the token
  source. The model then recounted the same things with ad-hoc grep and the runs drifted (51 vs 47, 66 vs 84,
  24 / 25 / 23, 41 vs 44).
- 8 of the 21 false claims were ones all three runs agreed on: shared heuristic errors, not noise.
- So every number now has one definition, one unit, one regex, one file set, and a per-file breakdown, and is
  computed once, here.

## Run it

```bash
npx @getsystemix/cli audit counters                 # the scanner's default folders (src app components lib packages)
npx @getsystemix/cli audit counters --dirs src      # or: audit counters src
npx @getsystemix/cli audit counters src lib --groups colour,tokens
npx @getsystemix/cli audit counters --dirs src --out report.json --summary
npx @getsystemix/cli audit counters --dirs src --brief                      # id, unit, value only (~25 KB)
npx @getsystemix/cli audit counters --dirs src --ids colour.hex6,tokens     # a few counters, whole
```

| flag | meaning |
|---|---|
| `dir…`, `--dirs a,b` | folders or files to audit, relative to the project root (positional and `--dirs` are unioned; repeatable). A `..` path or a symlink that leaves the root is refused. Named in any order or spelling (`src`, `./src/`, an absolute path inside the root) the report is the same. |
| `--groups a,b` | only these groups (default: all twelve); the report lists the rest in `groups.skipped` |
| `--ids a,b` | only these counters: an id, or a dotted prefix (`colour.hex6` selects `colour.hex6.*`, not `colour.hex_scanner.*`). A selector that matches nothing is an error (exit 1) |
| `--brief` | per counter only `id`, `unit`, `value` (and a ratio's `numerator` / `denominator`) |
| `--no-definitions` | leave out every counter's `definition` (regex, flags, file set) |
| `--no-per-file` | leave out every counter's `perFile`, `perFileTotal`, `perFileOmitted` |
| `--out file` | write the JSON to `file` (parent folders are created); stdout stays empty |
| `--pretty` | indent the JSON (default: one line) |
| `--summary` | print a compact table of the full report on stdout instead of the JSON (`--out` still writes the JSON) |
| `--dirty` | also say whether the working tree differs from HEAD (`repo.dirty`). Runs `git status`, which runs the clean filters of the repo's own `.git/config`: **only for a repo you trust**. Without it `repo.dirty` is `null` |
| `--root dir` | the project to audit (default: the current folder), so the command runs from anywhere |

**Reading the report.** The full report is large: about 350 KB on a 200-file repo, one line, roughly 90 to 110k
tokens, and a line-oriented reader (a `Read` tool, `less`) will cut it. Do not read it whole. Write it with
`--out report.json --pretty`, or take a slice, and look things up by id:

```bash
# one number
jq '.counters[] | select(.id == "colour.scanner.colour_hits") | {value, unit}' report.json
# a few counters with what they were counted from
npx @getsystemix/cli audit counters --dirs src --ids colour.scanner,tokens.source > slice.json
# every counter of a group, value only
jq -r '.counters[] | select(.group == "typography") | "\(.id)\t\(.value)"' report.json
# the worst files for one counter
jq '.counters[] | select(.id == "colour.hex6.outside_token_source") | .perFile[:10]' report.json
```

A sliced report carries a `slice` field saying what was left out (`ids`, `brief`, `definitions`, `perFile`, and
`counters` of `of`); it is not a full report and no longer validates as one. Quote ids and units from either.

- **stdout is the report and nothing else.** Warnings and errors go to stderr, so `... > report.json` and
  `... | jq` are safe.
- **Exit code** 0, unless the project root cannot be read, an argument is wrong, an `--ids` selector matches no
  counter, a counter group cannot be loaded, or the report fails its own validation (then 1, and nothing is
  printed to stdout). A missing audited folder is a warning, not a failure.
- **Dependency-free.** It requires only node built-ins and its own files (never `gray-matter`), and `bin/cli.js`
  loads a command only when it runs, so it works in a checkout where `npm ci` has not been run.
- `systemix audit` with no subcommand is unchanged: it installs the `design-audit` skill. Any other argument is an
  error (exit 1, nothing installed), so a typo such as `audit counter` cannot fall through to an install;
  `audit --help` prints usage.
- Called from code: `require("@getsystemix/cli/src/lib/counters").runCounters(root, { dirs, groups })`.

## The report

```jsonc
{
  "schema": "systemix.audit-counters/1",
  "countersVersion": "1.0.0",          // see Versioning
  "toolVersion": "0.2.1",              // the CLI's package version
  "repo": { "commit": "…", "commitDate": "2026-09-15T12:00:00+00:00", "dirty": null, "prefix": "" },
  "scope": {
    "dirs": ["src"], "missingDirs": [], "rejectedDirs": [], "skippedDirs": [],
    "tokenSource": { "path": "src/app/globals.css", "via": "doc:design/DESIGN.md", "reason": "…", "customProperties": 194 },
    "population": { "census": 213, "tests": 19, "declarations": 0, "audited": 193, "unreadable": 0 }
  },
  "groups": { "run": ["census", "tokens", …], "skipped": [] },
  "counters": [ /* sorted by id */ ],
  "warnings": [ /* sorted */ ]
}
```

- `repo` is the git state of the repository that holds the root. **The audit date is the HEAD commit date**,
  never today's date: every age ("114 days old") is measured to it. `prefix` is where the root sits inside that
  repository (`""` at the top level, `packages/web` for a subfolder, `null` without git); a non-empty prefix
  also produces a warning, because the commit and date then belong to the larger repository. The counters read
  the working tree, not the commit. **`dirty` is `null` unless `--dirty` is given**: computing it runs `git status`,
  and `git status` runs the clean filters (and `core.fsmonitor`) that a repository's own `.git/config` defines,
  which is code from the tree being audited. With `--dirty` it is `true` when anything under the root differs from
  HEAD (a modified or deleted tracked file, or an untracked file that is not ignored) and `null` again when git
  could not tell (a failure, a timeout, output too large). The other git calls (`rev-parse`, `log -1`) run no
  repository-defined program, and `git` always runs with an allow-listed environment: a `GIT_DIR`, `GIT_WORK_TREE`
  or `GIT_INDEX_FILE` inherited from a hook or a CI wrapper cannot point the audit at another repository.
- `scope.tokenSource` says which file was treated as the token source and why. The order: (1) `design/tokens.css`,
  (2) `systemix.config.yaml` `design.source` (or `design.tokens`, the key the local app reads), (3) a css file
  that `design/DESIGN.md`, `design/tokens.mdx` or `design/index.mdx` calls canonical / source of truth,
  (4) the css file declaring the most custom properties (at least 5). In step 3 a clause that negates
  ("`old.css` is no longer canonical", "not `X.css`", legacy, deprecated) blesses nothing, "superseded by `X.css`"
  blesses X, and when one line leaves several candidates the one the line points at ("the source of truth is
  `X.css`") wins, then the one with the most custom properties; the others are listed in the reason and in a
  warning. The token source is exempt from the scanners (a token file is made of the values it defines) and is
  never scaffolded over. Custom properties are found by one statement parser (`lib/css-parse.js`) used by the
  resolver and by every counter, wherever a declaration sits on its line; a commented-out one is not one.
- `scope.population` is the file set most counters share. **Census** = ts, tsx, js, jsx, css, vue and svelte
  files under the audited folders. **Audited** = census minus tests (`*.test.*`, `*.spec.*`, `__tests__/`),
  `.d.ts` files and the token source. Never walked: `node_modules`, `dist`, `build`, `out`, `coverage`,
  `vendor`, `reference`, `generated`, `__generated__` (GraphQL, Relay), `_generated` (Convex), `.next`, `.expo`,
  `.git`, `.systemix`, dot-folders and symlinks; and never audited, whatever the folder: `*.generated.*`,
  `*.gen.*` (TanStack's `routeTree.gen.ts`) and `*.min.*` files. A skipped folder named `build`, `out`,
  `vendor`, `reference`, `generated`, `__generated__` or `_generated` that holds source files is listed in
  `scope.skippedDirs` and warned about, because those names can be real source (`app/(shop)/vendor`).
  `scope.population.unreadable` counts census files that could not be opened as regular files (no permission, a
  name that is not valid UTF-8): they are in the census, contribute nothing to any counter, and are listed in
  `census.files.unreadable` and in a warning.
- `warnings` are things a reader must know before trusting a number: a missing folder, a file over the 5 MB read
  cap or past the run's read budget, a file that is not a regular file, census files that could not be opened,
  no token source or an ambiguous one, a symlink that leaves the repo, a subfolder of a larger repository.

### One counter

```jsonc
{
  "id": "colour.scanner.colour_hits",
  "group": "colour",
  "kind": "mechanical",                // mechanical = count / ratio / parse · presence = exists / contains
  "unit": "match",
  "value": 113,
  "definition": {
    "summary": "Colour-literal regex hits as `systemix drift scan` counts them (its 'critical'). Regex hits, not violations; …",
    "regex": null, "flags": null,       // ONE pattern: { "regex": "…", "flags": "gi" } that compiles as new RegExp(regex, flags)
    "regexes": [                        // …or, when the counter really runs several patterns, each one pasteable on its own
      { "label": "hex literal", "regex": "(?<![&A-Za-z0-9]|url\\(…)#(?:…)", "flags": "gi" },
      { "label": "colour function call", "regex": "\\b(?:rgba?|hsla?|oklch)\\(", "flags": "g" }
    ],
    "fileSet": "the audited population: census files minus tests, .d.ts files and the resolved token source"
  },
  "perFile": [ { "file": "src/lib/system-graph.ts", "count": 42 }, … ],   // count desc, file asc; at most 200 rows
  "perFileTotal": 312,                 // only when perFile was cut at 200 …
  "perFileOmitted": { "files": 112, "count": 140 },   // … and what the dropped rows hold: rows + omitted = value
  "truncated": true,                   // only when a text from the repo was cut to 500 characters (a hostile line cannot bloat the report)
  "detail": { … },                     // small extras: splits, the numerator and denominator of a ratio
  "notes": [ "token source exempt: …" ]  // caveats a reader needs
}
```

**Reading a number means reading its unit, its regex and its file set.** The same text gives different numbers
under different units, which is how the dry run got 51 and 47 for one file. `regex` + `flags` is a pattern you
can paste into `grep -P` or `new RegExp(regex, flags)` and get the counter's number back; a counter that runs
several patterns (the scanner's hex and function-call regexes, a tokenise-then-match pipeline) has `regex: null`
and lists them in `regexes`, never glued into one string. A counter that counts something no regex defines (graph
edges, parsed css declarations, resolver results) has `regex: null` and no `regexes`, and says what it parsed.

| unit | what `value` is |
|---|---|
| `match` | regex hits (a line with three hits counts three) |
| `line` | lines holding at least one hit (or, for `*.lines`, the lines of a file, `wc -l` style) |
| `file` | files holding at least one hit |
| `distinct` | unique values (`13px` and `0.8125rem` are two spellings) |
| `boolean` | true / false. **Never null:** an answer that cannot be known (no drift script, so no exit code to read) is `false` plus a note, so check `notes` and `detail` on a `false` |
| `ratio` | a fraction 0..1 to 4 decimals; `detail.numerator` and `detail.denominator` are always there. A zero denominator is `null` with a note, never 0 and never 1 |
| `number` | any other count or measure (lines of a file, a score read from a file, days) |
| `string`, `date` | text; an ISO date (`YYYY-MM-DD`, or a full timestamp as stored) |

- **`perFile` is the proof of every number that sums over files.** Every `match`, `line` and `file` counter with a
  value above 0 carries it, and its rows add up to `value` (a `file` counter has one row per file). When a counter
  has more than 200 files the first 200 are listed, `perFileTotal` is the number of files and `perFileOmitted`
  says what the rest hold (`{ files, count }`): rows + `perFileOmitted.count` = `value`, and a note says so. The
  only exceptions are the population counters whose file set *is* the census: `census.files.total`,
  `census.files.audited`, `census.files.any_type`, `census.audited.outside_components_ui`,
  `reachability.graph.files_parsed`, `reachability.components.ui.total` and `reachability.components.other.total`.
- In a `file` counter a row's `count` is the hits in that file where that is meaningful; the `summary` says so
  ("perFile count = tags in the file").
- A missing input never crashes and never invents a number: it gives 0, `false` or `null` and a note.

## The rule for skills

> **A skill must not recompute a counter that is in the JSON. It fills only judged fields, and tags every
> number it prints as `mechanical` (copied from this report, with the counter id) or `judged` (its own
> reading).**

- Run `audit counters` first (or read the file the user gives you), keep the JSON, and quote ids (slice it, see
  "Reading the report"). If the command cannot run, say so in the report ("execution mode") and label what you
  counted by hand as regex hits.
- Stamp `countersVersion` (and the skill's own version) in the report header. Compare only reports with the same
  `countersVersion` major.
- A counter is a fact, not a verdict. Whether 89 font sizes that match no token are "a lot", whether a hand-styled
  button is a violation, or which dimension is most underserved are judgements: they are the skill's to make, and
  to label `judged`. Scores come from a published rubric applied to counters, never from this script.
- When a scope choice matters (a mockup file the guardrails exempt, a vendored `ui/` folder) the report carries
  both numbers, or a split in `detail`. Quote the unit and the scope with the number.
- Do not quote the `systemix drift scan` score as "drift control". It is a clean-file share of regex hits;
  `colour.scanner.*` reports the same hits with the token-source share split out.

## What it guarantees

- **Deterministic.** The same tree on the same commit gives byte-identical JSON: no timestamps, no randomness, no
  locale-dependent sorting, no reliance on directory order, no absolute paths, nothing read from the clock. The
  folder the repo lives in and the folder you run from do not change a byte. Counters are sorted by id, files by
  path, ties by a fixed rule.
- **Read-only.** Nothing is written to the repo. `git` is spawned to read the HEAD commit, its date and its
  prefix (and, only with `--dirty`, whether the tree differs from HEAD), with an allow-listed environment and with
  the repo-local settings that can run programs switched off. **Do not audit a directory whose `.git` you do not
  trust with `--dirty`**; without it no program named by the repo's own git config runs.
- **Contained.** Counter modules read the repo only through the shared context (`context.js`), for every group:
  cached, UTF-8, BOM stripped, CRLF read as LF. **A symlink that leaves the repo reads as absent**, for every
  fixed-path input (guardrails, DESIGN.md, the token file, instruction files, `package.json`, `tsconfig.json`,
  the config, the drift history, record folders), with one warning; the resolver applies the same rule to the
  files it reads to choose the token source. Files are opened non-blocking and `fstat`ed first: a FIFO or a device
  (a symlink to `/dev/zero`, which git can store) is refused instead of read until memory runs out or forever. A
  file over 5 MB is skipped with a warning, and the run keeps at most 256 MB of text (the cache holds every file
  for the whole run, and a group's own tables hold several times that): past it, files read as empty and are named
  in a warning. `drift scan` reads the same way and writes its history only inside the repo (it refuses a
  `.systemix` symlink that leaves it). The drift scanner, which `colour` and `reachability` call, is fed the files
  the context has read, so each file's text is read once per run and the counters ARE the scanner; a stand-alone
  `drift scan` has a 64 MB cap of its own.
- **Robust.** No `src/`, no token source, no `design/`, no git, an empty file, a one-line minified file, bytes that
  are not UTF-8, a folder name with spaces, a missing folder, a file that cannot be opened: each gives a report
  and exit 0. A group that cannot be *loaded* is a broken install and exits 1 (the report does not quietly shrink).
- **Fast.** A 200-file repo takes a fraction of a second. Every pattern that runs over a line is linear in the
  line's length (bounded runs, `[^\n]*` rather than `.*` before an end anchor), and the tests feed each of them a
  200,000-character hostile line. Text taken from the repo into the report is cut to 500 characters
  (1,000 in a note; the counter then says `truncated: true`), so one hostile line cannot make the report megabytes long.

## What it does not do

- **No scores, no grades, no "good" or "bad".** No severity beyond a pinned mechanical rule (for example "hex
  equals a token" is a count, not a verdict).
- **No judgement calls.** Where a number depends on a classification (is this button hand-styled?), the report
  gives the raw count and the classification inputs as separate counters and stops.
- **No fixing, no scaffolding, no queue writes.** It never edits the repo or `.systemix/`.
- **No runtime evidence.** It reads source, not a browser. Reachability is static (`import` / `export from` /
  literal `import()` / `require()`); a file loaded through a string-built path looks unimported.
- **No parsing of languages.** Text and token-level scans, not an AST, so a string that spells a class counts as
  the class. Each counter's `notes` says where that bites.

## Where one fact has two names (on purpose)

A fact has one counter. These pairs are the exceptions; they are the same fact, they agree, and each says so:

| counter | is also | why |
|---|---|---|
| `docs.spine.guardrails_mdx` | `guardrails.file.exists` | the spine checklist (`docs.spine.*`, six members) and `--groups docs` stand alone |
| `docs.spine.design_md` | `decisions.design_md.exists` | the same, but `decisions.design_md.exists` also accepts a root `DESIGN.md` |
| `colour.hex6.*` and `colour.hex_scanner.*` | one family, two regexes | the oracle's 6-digit regex and the drift scanner's stricter 3/4/6/8-digit regex, side by side |
| `colour.scanner.files_audited` | `census.files.audited` | equal unless the scanner skipped a file; the difference is stated in its notes |
| `tokens.declarations.lines` | `tokens.declarations.line_start` | the first counts lines holding a declaration (wherever it sits on the line); the second is the oracle's line-start regex, kept to reproduce the dry run |

One fact has one owner, whichever group needs it: which `--font-size-*` names exist and which have no consumer is
`tokens.font_size.*` (the typography group reads the same parse for its own comparisons and has no second counter
for it), and "what is the dark theme" is one classifier (`counters/css.js`) behind `tokens.declarations.dark` and
`decisions.design_md.colors_*_dark`, so the two cannot disagree about a `[data-mode="dark"]` block.

Two headline choices the audit skills should make the same way:

- **Spine completeness is `docs.spine.members_present` of six** (`DESIGN.md`, `guardrails.mdx`, `tokens.css`,
  `decisions/`, `goals/`, `.state/`: the v5 spine in root `CLAUDE.md`). `docs.layout.design_members_present` /
  `docs.layout.loop_members_present` count what `src/lib/layout.js` (v6) scaffolds; they are context, not the headline.
- **Drift hits come from `colour.scanner.*`**, which is `drift scan`'s tally with the token source split out. They
  are regex hits, not violations.

## Known limits

Left as they are on purpose, and visible in `notes` where they bite:

- Custom properties are found by a statement parser, not by the oracle's line-start regex, so same-line and
  minified declarations count (279 declarations on 271 lines in the repo this was built on, where the oracle's regex
  sees 265 lines). The oracle's number is kept as `tokens.declarations.line_start`. The parser knows `{ } ;`, quotes,
  parentheses and `/* */`; it does not expand `@import` or `var()`, and skips a rule nested more than 32 levels deep
  (with a warning).
- Token-source resolution step 4 (the css file with the most custom properties) looks only at css under the audited
  folders, `design/` and the project root, so it depends on `--dirs`; steps 1 to 3 do not (a bare file name that a
  design doc calls canonical is also looked up in the default folders).
- Files with the extensions `.mjs .cjs .mts .cts .scss .less .astro` are not in the census: never audited, and not
  counted as importers, so a component used only from an `.mjs` file looks unimported.
- `census.files.any_type` walks with the context's shorter skip list (no `vendor`, `reference`, `generated` or
  dot-folder skipping), so it can exceed `census.files.total`. `scale.*` finds `package.json` files the same way,
  so a `package.json` inside a vendored folder is read as the project's.
- The hex regex is a heuristic: a 3- or 4-digit word that is also valid hex (`#add`, `#bad`, `#fade` as an id or
  anchor) counts as a colour. An issue number with no issue word before it (`#123`) counts too.
- Memory is several times the text read (measured at about 4.5 times on a large synthetic corpus: the groups keep
  their own tables over the cached text), and the cache is never evicted, hence the 256 MB read budget; a monorepo with more source than that gets a partial report
  and a warning that names the first files left out. Raise it only with a larger heap.
- `repo.dirty` is `null` unless `--dirty` is given (see "The report"), so a report does not say by itself whether
  it describes the committed tree.
- `readJson` does not understand comments in JSON. `reachability` reads `tsconfig.json` with its own tolerant
  parser; other modules reading JSON with comments would need the same.
- A skipped-by-name folder is probed for source files only to a bounded depth; a huge one is assumed to hold some.
- A `definition.summary` can contain a number that depends on the repo (`… (4 distinct)`); the id table below strips them.

## Versioning

`countersVersion` (`COUNTERS_VERSION` in `index.js`) is `MAJOR.MINOR.PATCH` and is stamped in every report.

- **MAJOR**: an id is removed or renamed; a counter's unit changes; a definition changes so the number means
  something else (a different regex or file set on purpose); the report schema breaks (the `schema` string then
  changes too). Reports with different majors are not comparable.
- **MINOR**: a counter, a group, a report field or a flag is added; nothing existing changes meaning. A
  population rule that now *warns* about something it used to skip silently is minor.
- **PATCH**: a fix so a counter does what its published definition already says; wording in summaries and notes;
  speed.
- `1.0.0` is the first version. Add the date and a line to the changelog in the PR that bumps it; the id table
  below must be regenerated in the same PR (a test fails when it is stale).

## Adding a counter

A group is `src/lib/counters/<group>.js` exporting `{ group, run(ctx) }` and nothing else, listed in `GROUPS`
(`index.js`), nothing is discovered. `run` is pure: read only through `ctx`, no clock, no `localeCompare`, no
randomness. **A group never imports another group**: what two groups need lives in a shared module (`util.js`
dates, hex, tallies and notes; `css.js` the token source as css; `markdown.js` front matter, ADR files and
DESIGN.md colours; `exemptions.js` the exemptions the guardrails declare; `graph.js` and `tags.js` the import graph
and JSX tags), and `consistency.test.js` fails on any other require. Build every counter with `counter({...})`
(`counter.js` validates it), start its id with the group name, give it a unit, a file set and `perFile`
(`singleFile: "path"` for a count that sits in one file), and a regex **as the RegExp object that ran**
(`regex: HEX_RE`; the builder publishes its source and flags, so what is published cannot differ from what ran), or
`regexes: [{ label, regex }]` when it runs several patterns. Add hand-computed tests on a tiny temp repo; never pin
a number of a real repo. `tests/acceptance/counters/consistency.test.js` holds every group to the same shape, and
`containment.test.js`, `redos.test.js` and `report.test.js` hold the whole report to what it promises about
symlinks, hostile input and its own size.

## The counters

Generated from a run on the committed fixture (`tests/acceptance/counters/fixture.js`) by
`node tests/acceptance/counters/readme-table.js --write`, and checked against it by a test. Units are in the table above; the full definition, regex and file set of a
counter are in its JSON. Three ids exist only when `design/guardrails.mdx` declares an exemption
(`typography.arbitrary_size.*_excluding_exempt`).

<!-- counters-table:start -->

#### census (13)

| id | unit | meaning |
|---|---|---|
| `census.audited.in_components_ui` | file | Audited files under a components/ui/ directory (vendored primitives such as shadcn/ui) |
| `census.audited.mockup_named` | file | Audited files whose basename contains "mockup" (case-insensitive, regex flag i): the candidates a guardrail may exempt as… |
| `census.audited.outside_components_ui` | file | Audited files that are not under a components/ui/ directory |
| `census.components.tsx_files` | file | tsx files with a "components" directory anywhere in their path, tests included |
| `census.components.ui_files` | file | Census files under a components/ui/ directory (any census extension, tests included) |
| `census.files.any_type` | file | Every regular file under the audited dirs whatever its extension (svg, ico, json, md, ...), for context only |
| `census.files.audited` | file | The audited population: census files that are not tests, not .d.ts files and not the token source |
| `census.files.declarations` | file | Census files that are TypeScript declaration files |
| `census.files.tests` | file | Census files that are tests: a basename ending .test.<ext> or .spec.<ext>, or any file under a __tests__/ dir |
| `census.files.token_source` | file | 1 when the resolved token source is part of the census (and so removed from the audited population), else 0 |
| `census.files.total` | file | Source files in the census (the extension set of the drift scanner), tests included |
| `census.files.unreadable` | file | Census files that cannot be opened as regular files: unreadable (permissions), a name that is not valid UTF-8, a FIFO or a device |
| `census.routes.app_pages` | file | Next.js app-router page files: basename page.tsx\|ts\|jsx\|js with an "app" directory somewhere above it |

#### tokens (29)

| id | unit | meaning |
|---|---|---|
| `tokens.custom_properties.distinct` | distinct | Distinct custom properties declared, de-duplicated by name (a property redeclared for .dark counts once) |
| `tokens.declarations.dark` | line | Lines whose first declaration sits in the dark theme: .dark, :root.dark, html.dark, [data-theme=dark], [data-mode=dark], or… |
| `tokens.declarations.line_start` | line | The oracle's count: lines whose first token is --name:. Kept to reproduce the dry run; it misses a declaration that shares its… |
| `tokens.declarations.lines` | line | Lines holding at least one custom-property declaration |
| `tokens.declarations.other` | line | Lines whose first declaration sits in any other rule (component-local, a descendant such as .dark .card) or outside every rule |
| `tokens.declarations.root` | line | Lines whose first declaration sits in a :root rule (every :root rule; detail.blocks lists each one that holds a declaration,… |
| `tokens.declarations.theme` | line | Lines whose first declaration sits in an @theme rule (including @theme inline) |
| `tokens.declarations.total` | match | Custom-property declarations, each time a name is declared (a property redeclared for .dark counts again) |
| `tokens.font_size.consumers` | match | var() references to a --font-size-* property |
| `tokens.font_size.declarations` | line | Lines holding a --font-size-* custom-property declaration |
| `tokens.font_size.unconsumed` | distinct | Declared --font-size-* properties with no var() reference in the audited population |
| `tokens.hex.declared_distinct` | distinct | Distinct hex values declared as custom-property values, lowercased with 3→6 and 4→8 digit expansion |
| `tokens.hex.literals` | match | Hex colour literals in the token source |
| `tokens.oklch.declarations` | line | Lines holding a custom-property declaration whose value calls oklch(. |
| `tokens.oklch.occurrences` | match | Occurrences of the word oklch in the token source (case-insensitive, comments included) |
| `tokens.source.found` | boolean | A token source was resolved |
| `tokens.source.lines` | number | Line count of the token source (wc -l: a last line without a newline still counts) |
| `tokens.source.path` | string | Repo-relative path of the resolved token source |
| `tokens.source.via` | string | Which resolution step chose the token source |
| `tokens.space.consumers` | match | var() references to a --space-* property |
| `tokens.space.declarations` | line | Lines holding a --space-* custom-property declaration |
| `tokens.space.unconsumed` | distinct | Declared --space-* properties with no var() reference in the audited population |
| `tokens.text.consumers` | match | var() references to a --text-* property |
| `tokens.text.declarations` | line | Lines holding a --text-* custom-property declaration |
| `tokens.text.unconsumed` | distinct | Declared --text-* properties with no var() reference in the audited population |
| `tokens.theme.blocks` | number | @theme rules in the token source (@theme inline counts) |
| `tokens.theme.maps_font_size` | line | @theme declaration lines that expose the font-size scale to Tailwind: a --text-* or --font-size-* property, or a value… |
| `tokens.theme.maps_space` | line | @theme declaration lines that expose the spacing scale to Tailwind: a --spacing / --spacing-* property, or a value referencing… |
| `tokens.theme.present` | boolean | The token source has an @theme rule (Tailwind v4 theme mapping) |

#### colour (29)

| id | unit | meaning |
|---|---|---|
| `colour.arbitrary_colour_class.matches` | match | Colour-utility arbitrary classes whose bracket holds a hex, rgb(a), hsl(a) or oklch literal |
| `colour.arbitrary_property_class.colour_literals` | match | Arbitrary-property classes ([property:value]) whose value holds a hex, rgb(a), hsl(a) or oklch literal |
| `colour.hex6.equals_token` | match | Hits whose normalised value equals a hex declared as a custom-property value in the token source |
| `colour.hex6.not_token` | match | Hits whose normalised value matches no hex declared in the token source |
| `colour.hex6.outside_token_source` | match | Occurrences of 6-digit hex literals (#rrggbb), HTML numeric entities (&#123456;) excluded, outside the token source |
| `colour.hex6.outside_token_source_distinct` | distinct | Distinct hex values among those hits (lowercased, 3→6 and 4→8 digit expansion) |
| `colour.hex6.outside_token_source_files` | file | Files holding at least one of the hex6 hits |
| `colour.hex_scanner.equals_token` | match | Hits whose normalised value equals a hex declared as a custom-property value in the token source |
| `colour.hex_scanner.not_token` | match | Hits whose normalised value matches no hex declared in the token source |
| `colour.hex_scanner.outside_token_source` | match | Occurrences of hex literals (3, 4, 6 or 8 digits) by the drift scanner's regex — not an HTML entity, a url(#id) reference, an… |
| `colour.hex_scanner.outside_token_source_distinct` | distinct | Distinct hex values among those hits (lowercased, 3→6 and 4→8 digit expansion) |
| `colour.hex_scanner.outside_token_source_files` | file | Files holding at least one of the hex_scanner hits |
| `colour.hsl_fn.outside_token_source` | match | Calls of hsl( / hsla( outside the token source |
| `colour.oklch_fn.outside_token_source` | match | Calls of oklch( outside the token source |
| `colour.palette_class.extra_matches` | match | The same <hue>-<shade> shape on utilities outside the pinned family list: accent, caret, decoration, shadow, placeholder,… |
| `colour.palette_class.files` | file | Files holding at least one default-palette colour class |
| `colour.palette_class.matches` | match | Tailwind default-palette colour classes: (bg\|text\|border\|ring\|fill\|stroke\|outline\|divide\|from\|via\|to)-<hue>-<50..950>, with an… |
| `colour.rgb_fn.outside_token_source` | match | Calls of rgb( / rgba( outside the token source |
| `colour.scanner.colour_hits` | match | Colour-literal regex hits as systemix drift scan counts them (its 'critical') |
| `colour.scanner.files_audited` | number | Audited files the scanner scanned: the audited population minus any file it skipped (unreadable, or over the read cap shared… |
| `colour.scanner.files_with_colour_hits` | file | Files holding at least one colour-literal regex hit |
| `colour.scanner.files_with_hits` | file | Files holding at least one colour or px hit |
| `colour.scanner.files_with_px_only_hits` | file | Files holding at least one px hit and no colour hit |
| `colour.scanner.px_hits` | match | Raw px regex hits as systemix drift scan counts them (its 'warnings') |
| `colour.token_source.colour_hits` | match | Colour-literal regex hits inside the token source, which the scanner exempts |
| `colour.token_source.colour_share` | ratio | Share of all colour-literal hits (token source + audited files) that sit in the token source |
| `colour.token_source.px_hits` | match | Raw px regex hits inside the token source, which the scanner exempts |
| `colour.token_source.px_share` | ratio | Share of all px hits (token source + audited files) that sit in the token source |
| `colour.white_black_class.matches` | match | Colour utilities on white or black |

#### typography (25)

| id | unit | meaning |
|---|---|---|
| `typography.arbitrary_size.below_12px` | match | Arbitrary font-size utilities whose computed size is below 12px (rem × 16) |
| `typography.arbitrary_size.distinct` | distinct | Distinct spellings among the arbitrary font-size utilities (13px and 0.8125rem are two spellings of one size) |
| `typography.arbitrary_size.equals_token` | match | Arbitrary font-size utilities whose computed size equals the value of a --font-size-* token in the token source |
| `typography.arbitrary_size.files` | file | Files holding at least one arbitrary font-size utility |
| `typography.arbitrary_size.files_excluding_exempt` | file | Files holding an arbitrary font-size utility, excluding the files the repo's guardrails declare exempt |
| `typography.arbitrary_size.lines` | line | Lines holding at least one arbitrary font-size utility (a line with three matches counts once) |
| `typography.arbitrary_size.lines_excluding_exempt` | line | Lines holding an arbitrary font-size utility, excluding the files the repo's guardrails declare exempt |
| `typography.arbitrary_size.matches` | match | Arbitrary font-size utilities text-[<n>px\|rem], counted as class matches (not lines) |
| `typography.arbitrary_size.matches_excluding_exempt` | match | Arbitrary font-size utilities, class matches, excluding the files the repo's guardrails declare exempt |
| `typography.arbitrary_size.not_token` | match | Arbitrary font-size utilities whose computed size equals no --font-size-* token value |
| `typography.arbitrary_size.not_token_files` | file | Files holding at least one arbitrary font-size utility that equals no --font-size-* token value |
| `typography.arbitrary_size.other_form_matches` | match | Arbitrary text-size classes the main regex does not see: text-[length:…], a length in another unit (em, vw, %, …) and calc() /… |
| `typography.arbitrary_size.px_matches` | match | Arbitrary font-size utilities spelled in px |
| `typography.arbitrary_size.rem_matches` | match | Arbitrary font-size utilities spelled in rem |
| `typography.css_apply.arbitrary_size_matches` | match | Arbitrary font-size utilities inside @apply statements in audited css and in the token source |
| `typography.css_apply.named_size_matches` | match | Named standard sizes inside @apply statements in audited css and in the token source |
| `typography.exempt.declared` | boolean | design/guardrails.mdx declares at least one exemption that names a file, glob or directory (a block saying exception / exempt… |
| `typography.exempt.files` | file | Audited files that the exemptions declared in design/guardrails.mdx resolve to |
| `typography.leading_arbitrary.files` | file | Files holding at least one arbitrary line-height leading-[…] utility |
| `typography.leading_arbitrary.matches` | match | Arbitrary line-height leading-[…] utilities, any bracket value |
| `typography.named_size.files` | file | Files holding at least one Tailwind named standard size |
| `typography.named_size.matches` | match | Tailwind named standard sizes: text-xs, text-sm, text-base, text-lg, text-xl, text-2xl … text-9xl |
| `typography.token_family.zero_consumer_families` | distinct | Type token families (--font-size-, --text-, --line-height-, --leading-, --letter-spacing-, --tracking-, --font-weight-) that… |
| `typography.tracking_arbitrary.files` | file | Files holding at least one arbitrary letter-spacing tracking-[…] utility |
| `typography.tracking_arbitrary.matches` | match | Arbitrary letter-spacing tracking-[…] utilities, any bracket value |

#### scale (23)

| id | unit | meaning |
|---|---|---|
| `scale.competing_ui_library.declared` | distinct | Competing UI libraries named in a package.json dependency field |
| `scale.competing_ui_library.imported_files` | file | Files importing a competing UI library |
| `scale.competing_ui_library.present` | boolean | A competing UI library is declared in a package.json or imported by an audited file |
| `scale.icon_library.any_files` | file | Files importing at least one icon library (a file importing two counts once) |
| `scale.icon_library.declared_libraries` | distinct | Icon libraries (from the fixed table) named in a package.json dependency field |
| `scale.icon_library.distinct_libraries` | distinct | Icon libraries (from the fixed table) imported by at least one file |
| `scale.icon_library.lucide_files` | file | Files importing lucide (lucide-react and its framework siblings) |
| `scale.icon_library.other_files` | file | Files importing any other library in the fixed table (react_icons, heroicons, phosphor, tabler, fontawesome, mui_icons,… |
| `scale.icon_library.radix_icons_files` | file | Files importing @radix-ui/react-icons |
| `scale.icon_library.simple_icons_files` | file | Files importing simple-icons (@icons-pack/react-simple-icons, simple-icons, react-simple-icons) |
| `scale.radius.arbitrary_other` | match | rounded-[…] classes whose value is neither a var() nor a px/rem length (rounded-[inherit], rounded-[50%]) |
| `scale.radius.hardcoded_files` | file | Files holding at least one hardcoded px/rem radius |
| `scale.radius.hardcoded_uses` | match | Radius spelled as a px or rem literal: class rounded-[Npx] plus inline border-radius: Npx / borderRadius: N. |
| `scale.radius.named_classes` | match | Tailwind named radius classes: rounded, rounded-(none\|xs\|sm\|md\|lg\|xl\|2xl\|3xl\|4xl\|full), each with an optional side or corner… |
| `scale.radius.named_or_var_share` | ratio | (named radius classes + var() radius uses) ÷ (named + var + hardcoded px/rem radius uses) |
| `scale.radius.var_uses` | match | Radius taken from a custom property: rounded-[var(--x)], rounded-(--x), border-radius: var(--x), borderRadius: "var(--x)". |
| `scale.shadow_arbitrary.matches` | match | Arbitrary shadow utilities: shadow-[…] and shadow-(--x) |
| `scale.shadow_utility.files` | file | Files holding at least one named shadow utility |
| `scale.shadow_utility.matches` | match | Tailwind named shadow utilities shadow-xs, shadow-sm, shadow-md, shadow-lg, shadow-xl (--shadow-* definitions and… |
| `scale.shadow_utility.other_named_matches` | match | Named shadow utilities outside the shadow-(xs\|sm\|md\|lg\|xl) set: shadow-2xs, shadow-2xl, shadow-inner, shadow-none |
| `scale.spacing_arbitrary.files` | file | Files holding at least one spacing utility with an arbitrary bracket value |
| `scale.spacing_arbitrary.length_literal_matches` | match | Spacing utilities whose bracket value is a px, rem or em length literal |
| `scale.spacing_arbitrary.matches` | match | Spacing utilities with an arbitrary bracket value: padding, margin, gap and space-x/y (p-[3px], -mt-[10px], gap-[var(--g)]) |

#### primitives (59)

| id | unit | meaning |
|---|---|---|
| `primitives.badge.canonical_users.files` | file | Files outside components/ui/ with at least one <Badge> that renders the components/ui definition |
| `primitives.badge.canonical_users.no_importer_files` | file | Canonical Badge users (files above) that no other census file imports and that are not entry points: live-code reuse of the… |
| `primitives.badge.definitions.total` | match | Definitions of a component named Badge: a statement-start (function\|const) Badge |
| `primitives.badge.resolved.to_local_definition` | match | <Badge> tags outside components/ui/ that render a Badge defined in their own file (a local copy) |
| `primitives.badge.resolved.to_ui_definition` | match | <Badge> tags outside components/ui/ that render the Badge defined under components/ui/ |
| `primitives.badge.reuse_ratio.outside_ui` | ratio | <Badge> tags that render the components/ui Badge ÷ (those + <Badge> tags that render a Badge defined in their own file),… |
| `primitives.badge.tags.files_outside_ui` | file | Files outside components/ui/ that hold at least one <Badge> tag |
| `primitives.badge.tags.files_total` | file | Files, inside or outside components/ui/, that hold at least one <Badge> tag |
| `primitives.badge.tags.inside_ui` | match | <Badge> tags in files under components/ui/ |
| `primitives.badge.tags.outside_ui` | match | <Badge> tags in files outside components/ui/ |
| `primitives.badge.tags.total` | match | <Badge> opening tags anywhere, inside and outside components/ui/ |
| `primitives.button.canonical_users.files` | file | Files outside components/ui/ with at least one <Button> that renders the components/ui definition |
| `primitives.button.canonical_users.no_importer_files` | file | Canonical Button users (files above) that no other census file imports and that are not entry points: live-code reuse of the… |
| `primitives.button.definitions.total` | match | Definitions of a component named Button: a statement-start (function\|const) Button |
| `primitives.button.raw.files_outside_ui` | file | Files outside components/ui/ that hold at least one raw <button> tag |
| `primitives.button.raw.files_total` | file | Files, inside or outside components/ui/, that hold at least one raw <button> tag |
| `primitives.button.raw.inside_ui` | match | Raw <button> tags in files under components/ui/ (where the primitive itself is built) |
| `primitives.button.raw.outside_ui` | match | Raw <button> tags in files outside components/ui/ |
| `primitives.button.raw.outside_ui.rounded_full` | match | Raw <button> tags outside components/ui/ whose opening tag text contains the class "rounded-full" (a pill shape, as a class… |
| `primitives.button.raw.outside_ui.shared_class_literal` | match | Raw <button> tags outside components/ui/ whose literal className="…" / class="…" string is byte-identical to the string on at… |
| `primitives.button.raw.outside_ui.with_button_variants` | match | Raw <button> tags outside components/ui/ whose opening tag text mentions buttonVariants (the shared button styles applied to a… |
| `primitives.button.raw.outside_ui.with_focus_visible` | match | Raw <button> tags outside components/ui/ whose opening tag text contains "focus-visible" |
| `primitives.button.raw.total` | match | Raw <button> opening tags anywhere, inside and outside components/ui/ |
| `primitives.button.resolved.to_local_definition` | match | <Button> tags outside components/ui/ that render a Button defined in their own file (a local copy) |
| `primitives.button.resolved.to_ui_definition` | match | <Button> tags outside components/ui/ that render the Button defined under components/ui/ |
| `primitives.button.reuse_ratio.outside_ui` | ratio | <Button> tags that render the components/ui Button ÷ (those + <Button> tags that render a Button defined in their own file +… |
| `primitives.button.tags.files_outside_ui` | file | Files outside components/ui/ that hold at least one <Button> tag |
| `primitives.button.tags.files_total` | file | Files, inside or outside components/ui/, that hold at least one <Button> tag |
| `primitives.button.tags.inside_ui` | match | <Button> tags in files under components/ui/ |
| `primitives.button.tags.outside_ui` | match | <Button> tags in files outside components/ui/ |
| `primitives.button.tags.total` | match | <Button> opening tags anywhere, inside and outside components/ui/ |
| `primitives.card.canonical_users.files` | file | Files outside components/ui/ with at least one <Card> that renders the components/ui definition |
| `primitives.card.canonical_users.no_importer_files` | file | Canonical Card users (files above) that no other census file imports and that are not entry points: live-code reuse of the… |
| `primitives.card.definitions.total` | match | Definitions of a component named Card: a statement-start (function\|const) Card |
| `primitives.card.resolved.to_local_definition` | match | <Card> tags outside components/ui/ that render a Card defined in their own file (a local copy) |
| `primitives.card.resolved.to_ui_definition` | match | <Card> tags outside components/ui/ that render the Card defined under components/ui/ |
| `primitives.card.tags.files_outside_ui` | file | Files outside components/ui/ that hold at least one <Card> tag |
| `primitives.card.tags.files_total` | file | Files, inside or outside components/ui/, that hold at least one <Card> tag |
| `primitives.card.tags.inside_ui` | match | <Card> tags in files under components/ui/ |
| `primitives.card.tags.outside_ui` | match | <Card> tags in files outside components/ui/ |
| `primitives.card.tags.total` | match | <Card> opening tags anywhere, inside and outside components/ui/ |
| `primitives.definitions.identical_groups` | distinct | Distinct (name, body) pairs of a PascalCase component definition — function Name, or const Name = an arrow/function… |
| `primitives.input.canonical_users.files` | file | Files outside components/ui/ with at least one <Input> that renders the components/ui definition |
| `primitives.input.canonical_users.no_importer_files` | file | Canonical Input users (files above) that no other census file imports and that are not entry points: live-code reuse of the… |
| `primitives.input.definitions.total` | match | Definitions of a component named Input: a statement-start (function\|const) Input |
| `primitives.input.raw.files_outside_ui` | file | Files outside components/ui/ that hold at least one raw <input> tag |
| `primitives.input.raw.files_total` | file | Files, inside or outside components/ui/, that hold at least one raw <input> tag |
| `primitives.input.raw.inside_ui` | match | Raw <input> tags in files under components/ui/ (where the primitive itself is built) |
| `primitives.input.raw.outside_ui` | match | Raw <input> tags in files outside components/ui/ |
| `primitives.input.raw.outside_ui.with_focus_visible` | match | Raw <input> tags outside components/ui/ whose opening tag text contains "focus-visible" |
| `primitives.input.raw.total` | match | Raw <input> opening tags anywhere, inside and outside components/ui/ |
| `primitives.input.resolved.to_local_definition` | match | <Input> tags outside components/ui/ that render a Input defined in their own file (a local copy) |
| `primitives.input.resolved.to_ui_definition` | match | <Input> tags outside components/ui/ that render the Input defined under components/ui/ |
| `primitives.input.reuse_ratio.outside_ui` | ratio | <Input> tags that render the components/ui Input ÷ (those + <Input> tags that render a Input defined in their own file + raw… |
| `primitives.input.tags.files_outside_ui` | file | Files outside components/ui/ that hold at least one <Input> tag |
| `primitives.input.tags.files_total` | file | Files, inside or outside components/ui/, that hold at least one <Input> tag |
| `primitives.input.tags.inside_ui` | match | <Input> tags in files under components/ui/ |
| `primitives.input.tags.outside_ui` | match | <Input> tags in files outside components/ui/ |
| `primitives.input.tags.total` | match | <Input> opening tags anywhere, inside and outside components/ui/ |

#### reachability (25)

| id | unit | meaning |
|---|---|---|
| `reachability.colour_hits.assessed` | match | The drift scanner's colour hits in files whose imports were parsed: the denominator of the colour_hits shares |
| `reachability.colour_hits.in_no_importer_files` | match | Colour hits inside files that no other census file imports and that are not entry points (any audited file, not only components) |
| `reachability.colour_hits.in_unreachable_files` | match | Colour hits inside files that are not reachable from any entry point by following imports |
| `reachability.colour_hits.share_in_no_importer_files` | ratio | Colour hits in files with no importer ÷ colour hits in parsed files |
| `reachability.colour_hits.share_in_unreachable_files` | ratio | Colour hits in files unreachable from the entry points ÷ colour hits in parsed files |
| `reachability.components.no_importer` | file | Component files that no other census file imports (in-degree 0; tests and .d.ts files count as importers) and that are not… |
| `reachability.components.no_importer_excl_tests` | file | Component files whose only importers (if any) are test files: in-degree 0 once tests are ignored as importers; entry points… |
| `reachability.components.other.no_importer` | file | Component files under components/ but outside components/ui/ that no other census file imports |
| `reachability.components.other.no_importer_ratio` | ratio | Other component files with no importer ÷ other component files |
| `reachability.components.other.total` | file | Component files under components/ but not under components/ui/ (the denominator of the other counters) |
| `reachability.components.type_only_import` | file | Component files that have importers but every reference to them is import type / export type (erased at build time, so the… |
| `reachability.components.ui.no_importer` | file | Component files under components/ui/ that no other census file imports |
| `reachability.components.ui.no_importer_ratio` | ratio | components/ui/ files with no importer ÷ components/ui/ files |
| `reachability.components.ui.total` | file | Component files under components/ui/ (the denominator of the ui counters) |
| `reachability.components.unreachable_from_entries` | file | Component files not reachable from any entry point by following imports (a file imported only by unimported files or only by… |
| `reachability.graph.alias_configs` | file | tsconfig.json / jsconfig.json files that supplied compilerOptions.paths or baseUrl to at least one file (nearest config above… |
| `reachability.graph.entries` | file | Entry-point files that count as imported by the framework: Next.js app-router route/metadata files in the root app directory… |
| `reachability.graph.files_parsed` | file | Census files whose text was read and scanned for imports (ts, tsx, js, jsx, plus the <script> blocks of vue/svelte) |
| `reachability.graph.files_skipped_unread` | file | Parseable census files that were not read because they exceed the 5 MB read limit (the context warns about each) |
| `reachability.graph.references.missing` | match | Relative or alias-looking specifiers that match no file at all (an alias no tsconfig defines, a generated file that is not… |
| `reachability.graph.references.nonliteral` | match | import() and require() calls whose argument is not a literal string (a variable, a string built with a template substitution or +) |
| `reachability.graph.references.outside_census` | match | Relative or alias specifiers that point at a file that exists but is not in the census (json, svg, md, mdx, a file outside the… |
| `reachability.graph.references.package` | match | Bare specifiers that name a package (react, next/link, @scope/pkg, node:fs, a #subpath import) and no alias or baseUrl file |
| `reachability.graph.references.resolved` | match | References resolved to a census file through relative paths, tsconfig/jsconfig paths aliases, baseUrl, extension probing and… |
| `reachability.graph.references.total` | match | Import references found: token-level scan of import/export-from/import()/require() with literal specifiers, resolved to census… |

#### guardrails (21)

| id | unit | meaning |
|---|---|---|
| `guardrails.contrast.claims` | number | Contrast claims of the form N:1 attached to a hex colour, whether or not a background could be resolved |
| `guardrails.contrast.claims_matching` | number | Resolved claims whose stated ratio equals the recomputed ratio rounded to the claim's own decimals |
| `guardrails.contrast.claims_not_matching` | number | Resolved claims whose stated ratio differs from the recomputed one |
| `guardrails.contrast.claims_unresolved` | number | Contrast claims whose background could not be resolved, so the ratio was not recomputed |
| `guardrails.contrast.hex_values` | distinct | Distinct 3/6-digit hex colours named in the prose (case-insensitive, 3 digits expanded), HTML entities and anchors excluded |
| `guardrails.contrast.highest_ratio` | number | The highest recomputed ratio among the pairs, 2 dp |
| `guardrails.contrast.lowest_ratio` | number | The lowest recomputed ratio among the pairs, 2 dp |
| `guardrails.contrast.pairs` | number | Foreground/background hex pairs the file names (see the module header for the pair-detection rule), each with its WCAG… |
| `guardrails.contrast.pairs_below_4_5` | number | Pairs whose unrounded ratio is below 4.5:1 (the WCAG AA threshold for normal text; large text needs only 3:1 and is not… |
| `guardrails.contrast.threshold_mentions` | number | N:1 figures attached to a hex colour but worded as a limit (meets / passes / minimum / at least / required / AA / WCAG / ≥ …),… |
| `guardrails.file.bytes` | number | UTF-8 size of the text as read (BOM stripped, CRLF read as LF) |
| `guardrails.file.exists` | boolean | design/guardrails.mdx exists as a file |
| `guardrails.file.front_matter` | boolean | The file opens with a --- front-matter block |
| `guardrails.file.lines` | number | Line count as wc -l counts it (a last line without a newline still counts) |
| `guardrails.rules.spacing_scale` | boolean | True when a rule bullet or heading mentions a spacing vocabulary (a text match, not a judgement that the rule is sound) |
| `guardrails.rules.type_size` | boolean | True when a rule bullet or heading mentions a type-size vocabulary (a text match, not a judgement that the rule is sound) |
| `guardrails.structure.documented_exceptions` | distinct | Distinct file-like code spans (a name with an extension, or a path ending in /) in an exceptions clause or in a section headed… |
| `guardrails.structure.exception_clauses` | number | Bullets or paragraphs containing an "Exceptions:" / "Exemptions:" / "Exempt:" clause |
| `guardrails.structure.h2_sections` | line | Level-2 headings in the prose (front matter and fenced code skipped): ## at column 0 followed by a non-empty title |
| `guardrails.structure.rule_bullets` | line | Top-level (unindented) list items: the rules |
| `guardrails.structure.starred_rules` | line | Rule bullets that start with ★ or ⭐ (optionally inside ** or _): the rules the file marks as the ones enforced |

#### docs (32)

| id | unit | meaning |
|---|---|---|
| `docs.component_records.files` | file | Component record files |
| `docs.component_records.path_exists` | number | Component records whose repo-relative path: names an existing file |
| `docs.component_records.path_missing` | number | Component records whose repo-relative path: names a file that does not exist |
| `docs.component_records.path_unresolved` | number | Component records whose path: is absolute (/x, C:\x), home-relative (~/x) or climbs out of the repo (../x), so it was not… |
| `docs.component_records.with_path` | number | Component records with a frontmatter path: |
| `docs.contract.exists` | boolean | contract/ exists as a directory |
| `docs.contract.files` | file | Files of any type under contract/, recursively |
| `docs.coverage.component_records_per_component_file` | ratio | Distinct component files named by a component record's path: ÷ tsx files under a components/ directory in the audited dirs… |
| `docs.coverage.token_records_per_custom_property` | ratio | Distinct tokens named by a token record and declared in the token source ÷ distinct custom properties the token source declares |
| `docs.layout.design_members_present` | number | How many of the design/ members that lib/layout.js scaffolds (designFile, guardrails, tokens) exist |
| `docs.layout.loop_members_present` | number | How many of the loop/state members that lib/layout.js scaffolds (experiments/, LEARNINGS.md, experiments/goals/,… |
| `docs.oklch.adr_mentions` | match | Occurrences of the word oklch (case-insensitive, whole word) in decision records |
| `docs.oklch.claude_md_mentions` | match | Occurrences of the word oklch (case-insensitive, whole word) in root CLAUDE.md |
| `docs.oklch.docs_claim_without_declaration` | boolean | True when root CLAUDE.md or a decision record mentions oklch while the token source declares no custom property with oklch(… |
| `docs.spine.decisions_dir` | boolean | design/decisions exists as a directory |
| `docs.spine.design_md` | boolean | design/DESIGN.md exists as a file (the same fact as decisions.design_md.exists (which also accepts a root DESIGN.md when… |
| `docs.spine.goals_dir` | boolean | design/goals exists as a directory |
| `docs.spine.guardrails_mdx` | boolean | design/guardrails.mdx exists as a file (the same fact as guardrails.file.exists) |
| `docs.spine.members_listed_in_claude_md` | number | How many of the six spine member names root CLAUDE.md mentions (case-sensitive substring), i.e |
| `docs.spine.members_present` | number | How many of the 6 spine members (DESIGN.md, guardrails.mdx, tokens.css, decisions/, goals/, .state/) exist under design/ |
| `docs.spine.state_dir` | boolean | design/.state exists as a directory |
| `docs.spine.tokens_css` | boolean | design/tokens.css exists as a file |
| `docs.token_records.clean_drift_section_mismatching` | number | Mismatching token records whose body has a Drift heading whose first line starts with none / no drift / nothing / n/a |
| `docs.token_records.clean_status_mismatching` | number | Mismatching token records whose frontmatter claims no drift: status in {clean, ok, none, synced, in-sync, in_sync, match,… |
| `docs.token_records.files` | file | Token record files |
| `docs.token_records.keyed` | number | Token records that carry both a token name (frontmatter token:, or a title starting with --) and a value: |
| `docs.token_records.matches` | number | Token records whose value equals (after the pinned normalisation) a value the token is declared with in the token source |
| `docs.token_records.mismatches` | number | Token records whose token IS declared in the token source but whose value equals none of its declared values |
| `docs.token_records.unresolved` | number | Token records whose token is not declared in the token source (or there is no token source) |
| `docs.token_records.without_value` | number | Token records with no token name or no value:, which cannot be compared |
| `docs.token_source.canonical_claims` | line | Lines in the design docs that say canonical / source of truth / single source / authoritative AND name a .css file |
| `docs.token_source.docs_naming_resolved` | file | Design docs with a canonical-claim line naming the resolved token source (by path, path suffix or bare file name) |

#### decisions (33)

| id | unit | meaning |
|---|---|---|
| `decisions.adr.dated` | number | ADR sections with a Date: YYYY-MM-DD line (a real calendar date) |
| `decisions.adr.first_date` | date | The earliest ADR date |
| `decisions.adr.headings` | line | Lines starting ## ADR- outside fenced code and front matter |
| `decisions.adr.id_duplicates` | number | ADR headings that repeat an id already used by an earlier heading |
| `decisions.adr.id_gaps` | number | Integers between 1 and the highest ADR id that no ADR heading uses (id_max minus the distinct ids in that range) |
| `decisions.adr.id_max` | number | Highest numeric ADR id (## ADR-<n>) |
| `decisions.adr.last_date` | date | The newest ADR date |
| `decisions.adr.mentioning_guardrails` | number | ADR sections that mention "guardrails" (case-insensitive substring) |
| `decisions.adr.mentioning_oklch` | number | ADR sections that mention the word oklch (case-insensitive) |
| `decisions.adr.mentioning_rebrand` | number | ADR sections that mention TVA, rebrand/re-brand or Amber Mainframe (case-insensitive) |
| `decisions.adr.newest_age_days` | number | Calendar days (UTC dates) from the newest ADR date to the HEAD commit date |
| `decisions.adr.status_lines` | line | Status lines inside ADR sections; detail.byStatus counts the first word, upper-cased |
| `decisions.adr.without_date` | number | ADR sections with no valid Date: YYYY-MM-DD line |
| `decisions.adr.without_status` | number | ADR sections with no status line |
| `decisions.design_md.bytes` | number | UTF-8 size of the text as read (BOM stripped, CRLF read as LF) |
| `decisions.design_md.colors_equal_dark` | number | Front-matter colours whose custom property in the .dark theme (the .dark block, else the value :root gives it) is equal to the… |
| `decisions.design_md.colors_equal_light` | number | Front-matter colours whose custom property in the light theme (:root) is equal to the front-matter value |
| `decisions.design_md.colors_mismatch_dark` | number | Front-matter colours whose custom property in the .dark theme (the .dark block, else the value :root gives it) is different… |
| `decisions.design_md.colors_mismatch_light` | number | Front-matter colours whose custom property in the light theme (:root) is different from the front-matter value |
| `decisions.design_md.colors_missing_dark` | number | Front-matter colours whose custom property in the .dark theme (the .dark block, else the value :root gives it) is not declared… |
| `decisions.design_md.colors_missing_light` | number | Front-matter colours whose custom property in the light theme (:root) is not declared (neither --<name> nor --color-<name>)… |
| `decisions.design_md.exists` | boolean | design/DESIGN.md exists, or failing that a root DESIGN.md |
| `decisions.design_md.front_matter` | boolean | The file opens with a --- front-matter block |
| `decisions.design_md.front_matter_colors` | number | Entries directly under colors: in the front matter |
| `decisions.design_md.generator_output_exists` | boolean | True when at least one generator script exists and every DESIGN.md it writes exists (false also when there is no generator script) |
| `decisions.design_md.generator_outputs_missing` | number | DESIGN.md outputs of generator scripts that do not exist in the repo |
| `decisions.design_md.generator_scripts` | file | Scripts that write a file called DESIGN.md through writeFile/writeFileSync |
| `decisions.design_md.h2` | line | Level-2 headings outside front matter and fenced code |
| `decisions.design_md.lines` | number | Line count (wc -l semantics) |
| `decisions.files.bytes` | number | Total UTF-8 size of the decision-record files as read (BOM stripped, CRLF read as LF) |
| `decisions.files.count` | file | Decision-record files |
| `decisions.files.guardrails_mentions` | match | Case-insensitive occurrences of "guardrails" in the decision-record files, anywhere in the file |
| `decisions.files.lines` | number | Total lines of the decision-record files (wc -l semantics) |

#### habit (25)

| id | unit | meaning |
|---|---|---|
| `habit.config.design_keys` | number | Leaf keys under design: in systemix.config.yaml (a scalar design: x counts as one; an empty block as none) |
| `habit.config.design_source` | string | The design.source value: where the repo says its design system lives |
| `habit.drift_script.exclude_patterns` | match | Regex-literal and string entries of an array variable whose name contains EXCLUDE in the drift script(s): the files the script… |
| `habit.drift_script.exclusions_not_named_in_guardrails` | number | Exclusion entries whose literal tail (the file-ish text left after stripping regex syntax |
| `habit.drift_script.exit_zero_claims` | line | Lines in the drift script(s) that say the exit code is 0 or that drift is "not a gate" (case-insensitive) |
| `habit.drift_script.exits_nonzero` | boolean | True when at least one scripts/*drift* file contains an exit statement whose status is not the literal 0 (the forms listed at… |
| `habit.drift_script.nonzero_exit_statements` | match | Exit statements whose status is not the literal 0: process.exit(x), process.exitCode = x, Deno/sys/os._exit(x),… |
| `habit.npm_scripts.drift` | distinct | Root package.json scripts whose name or command mentions "drift" (case-insensitive) |
| `habit.scripts.drift_files` | file | Files directly inside scripts/ whose name contains "drift" (case-insensitive) |
| `habit.snapshots.count` | number | Snapshot entries in the drift history (a bare array and a {"snapshots": []} object are both read); non-object entries are ignored |
| `habit.snapshots.distinct_days` | distinct | Distinct UTC calendar days that hold at least one dated snapshot |
| `habit.snapshots.file_exists` | boolean | The drift history file exists (a symlink that resolves outside the repo reads as absent) |
| `habit.snapshots.first_run_at` | date | runAt of the earliest dated snapshot, normalised to UTC ISO-8601 |
| `habit.snapshots.last_age_days` | number | Calendar days (UTC dates) from the newest snapshot to the HEAD commit date |
| `habit.snapshots.last_critical` | number | The critical count stored in the newest dated snapshot, as written (not recomputed) |
| `habit.snapshots.last_files_audited` | number | The componentsAudited (files audited) stored in the newest dated snapshot, as written (not recomputed) |
| `habit.snapshots.last_run_at` | date | runAt of the newest dated snapshot (the greatest runAt; on a tie the later entry wins), normalised to UTC ISO-8601 |
| `habit.snapshots.last_score` | number | The score stored in the newest dated snapshot, as written (not recomputed) |
| `habit.snapshots.last_score_formula` | string | The scoreFormula stored in the newest dated snapshot |
| `habit.snapshots.last_triggered_by` | string | The triggeredBy stored in the newest dated snapshot |
| `habit.snapshots.last_warnings` | number | The warnings count stored in the newest dated snapshot, as written (not recomputed) |
| `habit.workflows.drift_mentions` | match | Case-insensitive occurrences of "drift" in workflow files, comments included |
| `habit.workflows.drift_noncomment_lines` | line | Lines with "drift" (case-insensitive) that are not whole-line # comments |
| `habit.workflows.files` | file | GitHub Actions workflow files |
| `habit.workflows.files_mentioning_drift` | file | Workflow files containing "drift" at least once (case-insensitive); perFile count = mentions in the file |

#### legibility (40)

| id | unit | meaning |
|---|---|---|
| `legibility.agents_md.exists` | boolean | AGENTS.md exists at the repo root |
| `legibility.agents_md.headings` | line | Markdown ATX headings in AGENTS.md, outside fenced code blocks and front matter; setext (underlined) headings are not counted |
| `legibility.agents_md.lines` | line | Lines in AGENTS.md (wc -l rule: a last line without a newline still counts) |
| `legibility.claude_md.exists` | boolean | CLAUDE.md exists at the repo root |
| `legibility.claude_md.headings` | line | Markdown ATX headings in CLAUDE.md, outside fenced code blocks and front matter; setext (underlined) headings are not counted |
| `legibility.claude_md.lines` | line | Lines in CLAUDE.md (wc -l rule: a last line without a newline still counts) |
| `legibility.config.autonomy` | string | The autonomy dial: hermes.autonomy, else a top-level autonomy |
| `legibility.config.design_block` | boolean | A non-empty design: key (block or scalar) is present |
| `legibility.config.exists` | boolean | systemix.config.yaml exists at the repo root |
| `legibility.config.posthog_signal_enabled` | boolean | signals.posthog.enabled is true |
| `legibility.config.self_improvement_mode` | string | self_improvement.mode |
| `legibility.config.signals_enabled` | distinct | Entries under signals: with enabled: true |
| `legibility.config.top_level_keys` | distinct | Top-level keys of systemix.config.yaml |
| `legibility.copilot_instructions.exists` | boolean | .github/copilot-instructions.md exists at the repo root |
| `legibility.copilot_instructions.headings` | line | Markdown ATX headings in .github/copilot-instructions.md, outside fenced code blocks and front matter; setext (underlined)… |
| `legibility.copilot_instructions.lines` | line | Lines in .github/copilot-instructions.md (wc -l rule: a last line without a newline still counts) |
| `legibility.cursor_rules.exists` | boolean | .cursor/rules exists at the repo root (a directory counts only when it holds at least one rule file) |
| `legibility.cursor_rules.headings` | line | Markdown ATX headings in .cursor/rules, outside fenced code blocks and front matter; setext (underlined) headings are not counted |
| `legibility.cursor_rules.lines` | line | Lines in .cursor/rules (wc -l rule: a last line without a newline still counts) |
| `legibility.freshness.newest_iso_date` | date | The newest ISO date (valid YYYY-MM-DD dates (year 1900 or later) not glued to other word characters or hyphens) anywhere in… |
| `legibility.freshness.newest_iso_date_age_days` | number | Calendar days (UTC dates) from the newest ISO date in the instruction files to the HEAD commit date |
| `legibility.freshness.status_heading_age_days` | number | Calendar days (UTC dates) from the status-heading date to the HEAD commit date |
| `legibility.freshness.status_heading_date` | date | The newest ISO date inside a Markdown heading whose text contains the word "status" (case-insensitive) |
| `legibility.guardrails.files_mentioning` | file | Root instruction files that mention "guardrails" at least once (case-insensitive); perFile count = mentions in the file |
| `legibility.guardrails.mentions` | match | Case-insensitive occurrences of "guardrails" in the root instruction files |
| `legibility.instructions.imports` | distinct | Distinct targets of @path import lines (a line that is only @path), resolved relative to the file that holds them |
| `legibility.instructions.present` | number | How many of the four root instruction files exist (CLAUDE.md, AGENTS.md, .cursor/rules, .github/copilot-instructions.md) |
| `legibility.machine_paths.matches` | match | References that start with ~/, /Users/ or /home/: paths that resolve on one person's machine, not in a fresh checkout |
| `legibility.path_refs.distinct` | distinct | Distinct repo-relative path pointers: inline-code spans made only of path characters with a "/" and either a trailing "/" or a… |
| `legibility.path_refs.resolved` | distinct | Pointers (see legibility.path_refs.distinct) whose target exists in the working tree |
| `legibility.path_refs.unresolved` | distinct | Pointers (see legibility.path_refs.distinct) whose target does not exist in the working tree, or that climb out of the repo… |
| `legibility.posthog.dependency_declared` | boolean | A dependency whose name contains "posthog" (case-insensitive) in dependencies, devDependencies, peerDependencies or… |
| `legibility.posthog.files_any_case` | file | Census files that mention posthog in any case (PostHog, POSTHOG_KEY, posthog-js, ...) |
| `legibility.posthog.files_lowercase` | file | Census files that contain the lowercase string posthog (case-sensitive: imports, posthog-js, posthog.capture; not the product… |
| `legibility.skills.installed` | file | SKILL.md files exactly one directory below .claude/skills/ (the layout Claude Code discovers) |
| `legibility.skills.named_installed` | distinct | Named slash tokens with .claude/skills/<name>/SKILL.md installed in this repo |
| `legibility.skills.named_with_skill_md_in_repo` | distinct | Named slash tokens for which a <name>/SKILL.md exists somewhere in the repo (installed or shipped as a template): the tokens… |
| `legibility.skills.skill_dirs` | distinct | Directories directly under .claude/skills/ that hold at least one file, with or without a SKILL.md |
| `legibility.skills.skill_md_in_repo` | file | Every SKILL.md in the repo: installed skills plus templates a package ships |
| `legibility.skills.slash_tokens_named` | distinct | Distinct slash-command names written as /name inline-code spans in the root instruction files (name = lowercase letters,… |

<!-- counters-table:end -->
