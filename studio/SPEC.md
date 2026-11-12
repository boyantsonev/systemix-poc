# product-studio: the build contract

This is the contract between the CLI (`src/`), the skills (`plugin-src/`), the fixtures and the
evals (`evals/`). Build against it exactly. If something here is wrong, say so; don't work around it.
The approved catalog is `docs/catalog.md`. It explains why each piece exists and lists what each
skill must do before it counts as done.

## Names

The names live in one place, `namespace.json`: plugin `product-studio`, CLI binary `product-studio`,
package `@contextcraft/product-studio`, the client data folder `design/` and the state folder
`design/.studio/`. Code reads `namespace.json` (through `src/lib/layout.js`). Skill sources write
`{{PLUGIN}}`, `{{CLI}}` and `{{ROOT}}`, and the plugin build fills them in:

- `{{PLUGIN}}` becomes `product-studio`, so commands read `/{{PLUGIN}}:check`.
- `{{CLI}}` becomes `node "${CLAUDE_PLUGIN_ROOT}/scan/product-studio.js"`.
- `{{ROOT}}` becomes `${CLAUDE_PLUGIN_ROOT}`.

Never write a brand, client or product name: no systemix, getsystemix, hermes, hellobill, vero, vito,
contract/, .systemix (except in migrate), experiments/ (except in migrate), guardrails.mdx (except in
migrate), localhost:, posthog (except in the analytics reference and `evidence`), notion, or artifact
URLs. A leak-grep enforces this.

## The client repo layout (`src/lib/layout.js` is the code form)

```
design/DESIGN.md            the narrative: product, people, principles, voice, claims
design/tokens.css           canonical tokens: reference tokens (--ref-*) → role tokens, light and dark
design/rules.md             every rule as a row (ID | Rule | Surface | Severity | Source | Test)
design/rules/known-bad/     <ID>-<what>.<ext>: must trip rule <ID>
design/rules/known-good/    must trip nothing
design/rules/review-cases.json   { "<ID>": { bad, good, expect } } per review: rule
design/decisions/           D-NNN-<slug>.md: decisions with their reasons
design/goals/G-NNN-<slug>/  goal.md, evals.md, decisions.md (+ artifacts.md, plan.md)
design/loops/               product-loop.md, build-loop.md, joins.md, roster.md, README.md
design/context/             context packs (product, design, tech, business, marketing)
design/briefs/              B-NNN-<slug>.md decision briefs
design/proposals/           P-NNN-<slug>.md improvement proposals (admin)
design/evaluations.md       what build.measure measured
design/LEARNINGS.md         the learnings ledger (cited bullets)
design/.studio/runs.jsonl   the run log (gitignored by default)
design/.studio/preview.html the token preview (generated)
docs/components/<slug>.md + docs/manifest.json   component docs (optional)
.github/workflows/design-rules.yml               optional CI (no key)
```

There are three automatic writes: the run-log append, `preview.html`, and the proposal files that
`admin run` writes after a person types the command. Every other write under `design/` is shown as
a proposal first and made only after a person says yes. The CLI commands that write are named below.
Skills call them only after that yes.

## CLI conventions

- Each command lives in `src/commands/<name>.js` and exports `run(argv, ctx) → exit code`.
- Exit codes: 0 means ok, 1 means a finding or a failed check, 2 means a usage error.
- `ctx` comes from `src/lib/ctx.js`. Use `ctx.out`, `ctx.err`, `ctx.json`, `ctx.fail`, `ctx.usage`,
  `ctx.rootFrom(--root)`, `ctx.now` and `ctx.today()`. Never `console.*`, never `process.exit`.
- Parse flags with `src/lib/args.js`. Every command accepts `--root <dir>`, `--json` and `--help`.
- Output: `--json` prints exactly one JSON value on stdout. Without it the output is short text for
  a person. Paths in output are repo-relative with forward slashes (`relTo` in ctx.js).
- No runtime dependencies. Node 18 built-ins only, CommonJS, `"use strict"`. No network, no clock
  except `ctx.now`, and no randomness except where stated (run ids), seeded from `ctx.now`.
- Determinism: the same input always gives byte-identical output. Sort everything you list.
- Shared readers live in `src/lib/md.js`: `cells(line)`, `frontmatter(text)` and
  `stringifyFrontmatter(obj)`. Reuse them.
- Tests are Jest files in `tests/<name>.test.js`. Use `tests/helpers/cli.js`
  (`cli(argv, {root, now, stdin})`, `tmpRepo(files)`), and `tests/helpers/fixtures.js`
  (`materialize("F1-ui-drift", {variant})` → a temp git repo) for fixture goldens.
  Golden files go in `tests/golden/<name>/…`. A golden test also passes with `UPDATE_GOLDEN=1`,
  which rewrites the golden.
- Run the tests with `npx jest tests/<name>` from `studio/`. The whole suite must pass. Never skip
  or weaken a test to make it pass.

## Commands

### rules (built) `src/commands/rules.js`

- `rules init [--dry-run] [--json]` → `{written[], kept[]}`. This writes files.
- `rules lint [--json]` → `{ok, rules, scripted, review, problems[{file,line,message}]}`.
- `rules check <paths…> | --changed [--base ref] [--surface s] [--starter] [--json]` →
  `{result: "pass"|"pass with flags"|"fail", rules, surface, base, files[], blocks, flags,
  findings[{id,severity,rule,file,line,match}], reviews[{id,severity,question}]}`.
  The token file and `design/rules/` are never checked. Exit 1 on a block.
- `rules eval [--starter] [--json]` → `{ok, rows[{file,expect,ok,why}], uncovered[],
  reviewCases[{id,ok,why}], problems[]}`.
- `rules list [--surface s] [--starter] [--json]` → `{rules, surface, count,
  list[{id,rule,surface[],severity,kind,test,where?}]}`.
- When `design/rules.md` is missing, the output is `{ok:false,error:"no-rules"}` with exit 1.
  `--starter` runs the bundled starter rules instead.

### tokens `src/commands/tokens.js` + `src/lib/color.js` + `src/lib/css-tokens.js`

`templates/design/tokens.css` is layered. Reference tokens (`--ref-<hue>-<step>`) hold raw values.
Role tokens hold only `var(--ref-…)` or `var(--<role>)`. Its header lists the REQUIRED ROLES:
`background foreground card card-foreground muted muted-foreground primary primary-foreground
secondary secondary-foreground accent accent-foreground destructive destructive-foreground border
input ring`. The light theme is `:root`. Dark is `.dark`, `[data-theme="dark"]` or
`@media (prefers-color-scheme: dark) { :root {…} }`. The type scale is `--font-size-*`, radius is
`--radius*` and spacing is `--space-*`; these are scale tokens that may hold raw values.

- `tokens lint [--tokens <file>] [--json]` → `{ok, file, themes:["light","dark"], missing:{light[],dark[]},
  raw[{token,theme,value,line}], pairs[{fg,bg,theme,fgValue,bgValue,ratio,ok}], problems[string]}`.
  - Pairs are each `X-foreground` on `X`, `foreground` on `background`, and `muted-foreground` on
    `background`. Both values are resolved through `var()` chains.
  - `ratio` is WCAG 2.x contrast, rounded to 2 decimals. `ok` means ratio ≥ 4.5.
  - Colours parse as hex (3/4/6/8), `rgb()`/`rgba()`, `hsl()`, `oklch()` and `oklab()`. An
    unparseable colour is a problem, never a guess.
  - Exit 1 on any missing role, raw role value, failing pair or problem.
- `tokens diff --from <file> [--tokens <file>] [--json]` → `{from, kind, rows[{token,current,proposed,
  status:"new"|"changed"|"same"|"conflicts-rule", rule?}], counts{new,changed,same,conflicts}}`.
  - `kind` is detected as `css`, `dtcg` (a W3C tokens.json with `$value`), `flat-json`
    (`{"name": "value"}`), `figma-variables` (the official Figma MCP `get_variable_defs` output: a
    flat `{"Collection/name": "value"}` map, names turned into `--kebab-case`) or `html` (the custom
    properties in `<style>` of a Claude Design export).
  - A proposed value whose `--token: value;` line trips any css or any rule from `design/rules.md`
    **other than the T rows** is `conflicts-rule` with that `rule`.
  - Rows are sorted by token. The text output is a fixed-width table and is golden-tested.
  - Read-only. Exit 0, or 1 when there are conflicts.

### preview `src/commands/preview.js`

`preview [--tokens <file>] [--out <file>] [--stdout] [--json]` renders one self-contained HTML page
(inline CSS, no script, no external fetch). It shows colour swatches grouped as roles and reference
tokens, each role pair with its contrast ratio and pass or fail (the same numbers as
`tokens lint`), the type scale, radius and spacing. Light and dark sit side by side.

- It writes `design/.studio/preview.html` (an automatic write) unless `--stdout` is given.
- JSON output: `{file, roles, references, pairs[{fg,bg,theme,ratio,ok}]}`.
- The output is deterministic and golden-tested.

### audit `src/commands/audit.js` + `src/lib/audit/*`

`audit [<dirs…>] --json` is read-only. It reports what a repo's UI already is, so setup can propose a
system. Default dirs are the ones of `src app components lib packages pages styles` that exist.

```
{ version:1, root, dirs[], files:{scanned, ui, styles},
  tokenSource: { file|null, kind: "css-vars"|"tailwind-config"|"tokens-json"|"none", count },
  palette: [{ value (normalized lowercase hex or oklch string), count, files }],   // literal colours, by count desc then value
  typeScale: [{ value (px or rem string), count }],
  spacing: [{ value, count }],
  drift: { critical:[{file,line,match,kind}], warning:[…], info:[…] },
     // critical: a raw colour in a component (a file under a primitives path or a .tsx/.jsx/.vue/.svelte)
     // warning: raw px font-size / arbitrary tailwind values; info: raw values in plain stylesheets
  duplicates: [{ name, files[] }],          // the same component name (PascalCase export or file) in 2+ folders
  primitives: [{ name, file }],             // components under components/ui, ui/, primitives/ (paths from config if any)
  images: { total, withoutAlt },
  setupClass: "fresh"|"partial"|"mature", // fresh: no token source; partial: a token source but drift.critical > 0 or < 60% of colours via tokens; mature: otherwise
  tokenCoverage: { colourRefs, literalColours, share },  // share = colourRefs/(colourRefs+literalColours), 2 decimals
  openQuestions: [string] }                // contradictions code can see: two token sources, duplicate primitives, two type scales…
```

Without `--json`, a person gets a short summary. The command ports what it needs from the counters in
`../packages/cli/src/lib/counters/` and `css-parse.js`/`design-source.js`. Simplify freely, but
every number must be computed by code, not left to the model.

### score `src/commands/score.js` + `rubric/readiness.v2.json`

`score [<dirs…>] --json` is **beta** and read-only. It is the one readiness score.

```
{ version:2, beta:true, score: 0-100 | null, withheld: null | "<why>", coverage: 0-1,
  dimensions:[{ id, name, weight, score: 0-100|null, inputs:{…}, why }],   // six, fixed weights summing to 1
  opportunities:[{ dimension, gap, importance }],   // ranked: importance × (100 − score); ties stated in `tie`
  nearThreshold:[{ dimension, score, band, distance }],
  validity: "<one fixed sentence>", limits:["…"] }
```

The six dimensions, with their weights in the rubric file:

- tokens (a token source, coverage share)
- rules (the rows in rules.md, the scripted share, eval passing, review cases present)
- drift (`audit` drift counts per 100 UI files)
- components (duplicates, primitives present)
- rationale (decisions, goals and LEARNINGS bullets present, with sources)
- accessibility (images without alt, token pairs passing contrast)

When coverage is below 0.8 (inputs that could not be computed), `score` is null and `withheld` says
why. The validity sentence and the limits are printed verbatim from the rubric file.

### loops `src/commands/loops.js` + `src/lib/loopkit.js` + `templates/loops/…`

This is a port of `../packages/cli/src/commands/loops.js` and `src/lib/loopkit.js`, generalised. It
drops the market loop, experiments/, the hub, parity evals and `holder: Claude`. The agent's role is
called "the coding agent", and its may-list never includes merge.

- `loops init [--preset solo|team] [--holder role=name …] [--dry-run] [--json]` → `{written[], kept[]}`.
  This writes files. Solo is the default: one person holds every role and there is no deputy. The
  holder defaults to `git config user.name`, else asks via a non-zero exit with
  `{error:"need-holder"}`. No `{{` may remain in what it writes.
- `loops check [--goals|--loops] [--json]` → `{ok, problems[{file,line,message}]}`. It fails on any
  `{{` under design/loops, design/goals or design/context.
- `loops status [--json]` → `{goals[{id,slug,title,step,waitsOn:{role,holder,deputy}|null,lastRuling}]}`.
- `loops goal new <slug> --title "<one sentence>" [--json]` → `{id, dir, files[]}`. This writes files.
  It creates `design/goals/G-NNN-<slug>/` (the next number) with goal.md (frontmatter `id, title,
  status: open, step: <first step>, opened`, plus the sections Success criteria, Kill if and
  Context), evals.md (an empty table, filled by the guide) and an empty decisions.md.
- `loops gate <G-NNN> approve|rework|drop --by "<name>" [--note "…"] [--brief B-NNN|none] [--json]` →
  `{id, step, next, line}`. This writes one decision line and moves the goal's step.
  - The name must be the gate's role holder or deputy in the roster; otherwise it is refused (exit 1,
    `{error:"not-a-holder"}`).
  - Decision line: `- <YYYY-MM-DD> · <gate> · <approve|rework|drop> · by <name> · brief: <B-NNN|none>[ · note: …]`.
  - Identity is the name given, checked against the roster. The guide states that this is weak on
    shared machines.
- `loops decisions [--json]` → every decision line across goals.

### learnings `src/commands/learnings.js`

`design/LEARNINGS.md` holds one cited bullet per learning:

```
- **L-NNN** · <confidence: high|medium|low> · review-by <YYYY-MM-DD> · <one sentence> · source: <goal id, decision, or evaluation> [· used-by: G-NNN, …]
```

- `learnings add --text "…" --confidence high|medium|low --review-by YYYY-MM-DD --source "…" [--json]`
  → `{id, line}`. This writes the bullet. It rejects a missing field, a bad date or confidence, and
  text over 300 chars (exit 1). It creates the file with a header if it is missing.
- `learnings used <L-NNN> --by <G-NNN> [--json]` appends the goal to the bullet's `used-by` and is
  idempotent.
- `learnings list [--recent n] [--json]` → `{learnings[{id,confidence,reviewBy,text,source,usedBy[],stale}]}`.
  A learning is stale when review-by < today.

### runs `src/commands/runs.js` + `src/lib/runlog.js` + `src/lib/privacy.js`

The run log is `design/.studio/runs.jsonl`, one JSON object per line. Rows are only ever appended.

Row schema (unknown fields are rejected):

- `run`: `r-YYYYMMDD-HHMMSS-<4 hex>`, filled by `log`.
- `at`: ISO time, filled.
- `kind`: `run`|`eval`|`admin`|`rating`.
- `command`: `setup`|`brief`|`check`|`loop`|`admin`.
- `args`: a string.
- `surface`, `depth`: string or null.
- `goal`: `G-NNN` or null.
- `result`: `pass`|`pass-with-flags`|`pass-with-fixes`|`fail`|`proposed`|`written`|`stopped-at-gate`|`error`.
- `blocks`, `flags`: integers.
- `false_positives`: `[{rule, where, why}]`.
- `sources`: `[string]`.
- `files_written`: `[string]`.
- `duration_s`: number or null.
- `rating`: `up`|`down`|`none`.
- `note`: a string of 300 chars or fewer, in the person's own words.
- `ref`: the run id rated (rating rows only).
- `studio_version`: filled.

Commands:

- `runs log --json -` reads one row from stdin; `--row '<json>'` is the alternative. It fills
  `run`/`at`/`studio_version`, validates the row, runs the privacy lint on `note`, `args`,
  `false_positives[].why` and `sources`, appends it, and prints `{ok, run}`. On an invalid row it
  prints `{ok:false, problems[]}` with exit 1 and appends nothing.
- `runs rate <run-id|last> up|down ["note"] [--json]` appends a `kind:"rating"` row with `ref`.
- `runs list [--since YYYY-MM-DD] [--command c] [--kind k] [--json]` → `{rows[]}`, with ratings
  merged onto the run they rate.
- `runs should-ask [--json]` → `{ask: bool, why}`. This is the rating-frequency rule. Ask when the
  last `run` row ended in `error` or `fail` or recorded a false positive and has no rating yet.
  Otherwise ask at most once a calendar day: only when no rating row and no ask-eligible prompt
  exists today. The run log records `asked` as a `kind:"rating"` row with `rating:"none"` when the
  person skips. Never ask about a run older than the last one.
- Privacy lint: it rejects emails, things that look like tokens or keys (`sk-…`, `ghp_…`,
  `xox[bap]-…`, 32+ char hex or base64 runs), URLs with a query string, and absolute home paths
  (`/Users/<name>`, `/home/<name>`). Its message names the field, never the value.

### proposals `src/commands/proposals.js` + `src/lib/proposals.js`

A proposal is a file in `design/proposals/P-NNN-<slug>.md`. Frontmatter:

- `id`: `P-NNN`.
- `title`.
- `target`: `client` (this repo's design/ data) or `plugin` (the studio's own skills, triggers or scan).
- `kind`: `wording`|`trigger`|`rule-fix`|`new-rule`|`new-eval`|`bug`.
- `evidence`: a list of run ids or eval names, at least one.
- `status`: `New`|`Approved`|`Shipped`|`Declined`|`Failed`.
- `decided_by`, `decided_at`, `evals_before`, `evals_after`: null until decided.
- `created`.

Body sections: `## Problem` (one paragraph), `## Change` (a fenced ```diff unified diff, client
target only; a plugin target describes the change in words), `## How it will be checked`.

- `proposals lint [--json]` → `{ok, proposals, problems[{file,message}]}`.
- `proposals list [--status s] [--json]` → `{proposals[{id,title,target,kind,status,evidence[]}]}`.
- `proposals next-id [--json]` → `{id}`.
- `proposals decide <P-NNN> approve|decline --by "<name>" [--why "…"] [--json]`. This writes the
  frontmatter. The name must be in the roster: any holder or deputy, or `design/loops/roster.md`
  missing means the git user. Approving a `client` proposal sets `Approved`. Approving a `plugin`
  proposal sets `Approved` and prints `{draft: {title, body}}`, a scrubbed upstream issue with
  counts and evidence ids, no paths and no notes, for the guide to show. It never files anything
  itself. Decline sets `Declined` with the why.
- `proposals apply <P-NNN> [--json]` works only on an `Approved` client proposal. It runs
  `admin eval` (before), applies the diff with `git apply`, then runs `admin eval` (after). If any
  check that passed before now fails, it reverts with `git apply -R` and sets `Failed`. Otherwise it
  sets `Shipped`. It records `evals_before` and `evals_after` (the counts of passing checks) and
  prints `{status, before, after, regressions[]}`.

### admin `src/commands/admin.js`

- `admin eval [--json]` → `{ok, checks[{name, ok, skipped, detail}], results: {file, triggers, cases}|null}`.
  It is key-free and has no network. Checks:
  - `rules-lint`
  - `rules-eval` (includes the review-case presence)
  - `tokens-lint` (skipped when there is no tokens.css)
  - `docs-check` (skipped when there is no docs/manifest.json)
  - `loops-check` (skipped when there is no design/loops)
  - `proposals-lint` (skipped when there is no design/proposals)
  - `runlog-lint`: every row valid and privacy-clean.

  It reads the newest `evals/results/*.json` if one exists under the root (the maintainer harness).
  Exit 1 when any check that was not skipped fails.
- `admin digest [--since YYYY-MM-DD] [--json]` → `{since, runs, byCommand{cmd:{runs,up,down,downShare}},
  rulesCaught{surface:{ruleId:n}}, blocksFixed, falsePositives{ruleId:n}, errors{message:n},
  signals[{kind, subject, evidence[run ids], count, threshold}], proposalsCap: 3}`.
  - `since` defaults to the last `kind:"admin"` row.
  - Signals use these thresholds:
    - the same rule dropped as a false positive 3 or more times;
    - a command with 5 or more runs and a down share of 0.30 or more;
    - the same error 2 or more times;
    - a failing `admin eval` check;
    - a trigger miss or negative firing in the results file.
  - Signals are ranked by count, and at most 3 are marked `top: true`.
  - The thresholds live in code and in the guide's text, not in config.
  - `blocksFixed` counts runs where a `fail` check was followed by a `pass` or `pass-with-flags`
    check on the same args.

### docs `src/commands/docs.js`

This is a port of `../packages/cli/src/commands/docs.js` without gray-matter and without experiments.

- `docs sync [--check] [--json]` keeps `docs/manifest.json` (components → doc, source, status) in
  step with `docs/components/*.md`. `--check` writes nothing and exits 1 on drift.
- `docs props <component-source-file> [--json]` → `{component, props[{name,type,required}]}`, the
  props parsed from a React TS/JS component (interface or type Props, or destructured params).
  component-docs uses it to verify a props table.

### migrate `src/commands/migrate.js`

- `migrate [--dry-run] [--json]` (dry run is the default) lists the deterministic moves for an older
  install:
  - `experiments/LEARNINGS.md` to `design/LEARNINGS.md`, its bullets rewritten to the learnings
    grammar where the fields exist. A bullet that can't be rewritten is listed under `unmapped`.
  - `experiments/goals/*` to proposed `design/goals/G-NNN-<slug>/goal.md`.
  - `design/evals/rules/*` to `design/rules/*`.
  - `.systemix/` is runtime state: dropped, and listed.
  - `design/guardrails.mdx` bullets are listed as `guardrails[{line, text}]` for the guide to map
    to rule rows. The file itself stays until the guide leaves its one-line pointer.

  Output: `{moves[{from,to,action:"move"|"rewrite"|"drop"|"create"}], guardrails[], unmapped[], legacy:{…present flags}}`.
- `migrate --apply [--json]` performs the moves (never deletes guardrails.mdx), then prints the same
  JSON with `applied: true`. This writes files. It refuses with exit 1 when the working tree has
  uncommitted changes under the paths it would touch.

### evidence `src/commands/evidence.js`

`evidence check [--json]` → `{connected, source, problems[]}`. It reads `design/.studio/analytics.json`
(`{source:"posthog"|"other", hostEnv, keyEnv, projectEnv}`, the names of env vars, never values) and
checks that those env vars are set. It makes no network call. It exits 1 with a clear message when
something is missing.

## Templates (`templates/`)

- `templates/design/`: `DESIGN.md`, `tokens.css` (layered; the header lists the required roles),
  `rules.md` and `rules/` (built), `evaluations.md`, `LEARNINGS.md`, `proposals/README.md` and
  `gitignore-snippet` (`design/.studio/`).
- `templates/loops/`: `loops/{product-loop.md, build-loop.md, joins.md, roster.solo.md, roster.team.md, README.md}`,
  `goals/README.md`, `briefs/README.md` and `context/{README,product,design,tech,business,marketing}.md`.
- `templates/docs/components/_skeleton.md`.
- `templates/ci/design-rules.yml`: on pull_request it runs
  `npx @contextcraft/product-studio rules check --changed` and `rules eval`, and fails on a block.
  No key.
- `templates/agents-block.md`: the managed block for CLAUDE.md and AGENTS.md, between
  `<!-- product-studio:start -->` and `<!-- product-studio:end -->`. It says to read
  design/rules.md before UI work, run `/{{PLUGIN}}:brief` before building and `/{{PLUGIN}}:check`
  before review, and that people rule on gates.

## Fixtures (`evals/fixtures/<id>/`)

Each fixture has `repo/`, the files at the base commit, and `fixture.json`:
`{ id, purpose, branch?: { name, overlay: "branch/" }, variants?: { <name>: { remove?: [paths], overlay?: "<dir>/", initialBranch?: "trunk" } } }`.
`tests/helpers/fixtures.js` exports `materialize(id, {variant, branch=true}) → tmp dir`. It copies
`repo/`, runs `git init -b main`, commits as "fixture <fixture@example.com>", applies the variant,
and, when there is a branch, checks out `branch.name` and commits the overlay.

- F0-empty: README and package.json, no UI.
- F1-ui-drift: React and Tailwind with no design/.
  - Raw hex and px.
  - `bg-[#…]` and `text-[13px]`.
  - `<img>` and `<Image>` without alt.
  - A `Button` in `components/ui/` and again in `src/features/checkout/`.
  - Two primary buttons on one screen.
  - A low-contrast pair in `tailwind.config.js` colours.
  - A CSS `#add` id selector.
  - An exclamation-heavy CTA, and the claim "Guaranteed results".
- F2-css-vars: no Tailwind.
  - `tokens.json` (DTCG) plus plain CSS custom properties in `styles/theme.css`.
  - Components outside components/ui (`src/widgets/`).
  - `docs/components/button.md` as a skeleton, and `docs/manifest.json`.
- F3-installed: the studio already set up.
  - A full layered `design/tokens.css` (all roles, light and dark, AA), `design/DESIGN.md`, and
    `design/rules.md` (the starter plus V/L rows) with `design/rules/`.
  - Branch `feature/pricing-card`, whose overlay touches `design/tokens.css` (a new role) and two
    components: one block (T1) and one flag (V1).
  - Variant `no-origin`: there is no `main` either. The repo is initialised as `trunk`, so `--changed`
    must ask for `--base`.
- F4-loops: F3's design/ plus `design/loops` (solo roster, holder "Ada Lovelace"),
  `design/LEARNINGS.md` with two cited bullets, and goals:
  - `G-001` parked at the Evals gate;
  - `G-002` at product.design;
  - `G-003` at build.plan;
  - `G-004` at build.measure;
  - `G-005` at product.learn.

  Variant `team`: a team roster with holders "Ada Lovelace" and "Grace Hopper".
- F5-sources: F3's tokens.css plus `sources/export.html` (a Claude Design export with
  `<style>:root{…}</style>`), `sources/variables.json` (Figma `get_variable_defs` shape),
  `sources/tokens.json` (DTCG) and `sources/login.html` (an unfetchable-link stub: a sign-in page
  with no tokens).
- F6-runlog: F3 plus `design/.studio/runs.jsonl` with 40 rows:
  - T1 dropped as a false positive 4 times;
  - brief rated down 3 of 6 runs;
  - the same error twice;
  - the rest normal.

  It also has `evals/results/2026-01-14.json` with one trigger miss. Variant `clean`: 12 normal rows
  and no results file. Variant `vendored`: the plugin vendored under `.claude/plugins/product-studio/`.
- F7-surfaces: rules.md with product, marketing and email rows; `design/decisions/` with 2;
  `design/goals/` with 2; and a `design/context/analytics.md` that names an unreachable source
  ("dashboard at an internal URL we can't open").
- F8-legacy: an older install.
  - `design/guardrails.mdx` with 10 bullets.
  - `experiments/LEARNINGS.md` with 3 bullets; `experiments/goals/` with 2 goal files.
  - `.systemix/queue.json`.
  - `design/evals/rules/known-bad/*`.
  - `docs/components/*.md` and `docs/manifest.json`.

## Skills (`plugin-src/skills/`)

- `<command>/SKILL.md` exists for setup, brief, check, loop and admin. loop and admin have
  `disable-model-invocation: true`.
- References live in `<command>/references/*.md`. Shared ones live in `shared/*.md`, as
  context-pack.md, run-log.md and preview.md.
- A guide names every other file by its full path, `{{ROOT}}/skills/<command>/references/<file>.md`.
  Never use `../`.
- Frontmatter has `name` and a `description` that says when to use the skill and when not to (it
  defers copywriting to a ux-copy skill and critique to a design-critique skill; check reviews the
  result against the rules). setup, brief and check get designer phrasing in their descriptions.
- Every command's last step is the run-log row via `{{CLI}} runs log --json -`, then the rating ask
  per `runs should-ask`. That lives once, in `shared/run-log.md`, and each SKILL.md names it.
- Code does the arithmetic; a guide never counts, scores or computes contrast itself. It quotes the
  CLI's JSON.
- A guide proposes a write as a diff or file list and waits for an explicit yes before running a
  writing command or editing `design/`. The three automatic writes are the only exceptions.
- Gates, approvals, merges, publishes and issue filing are a person's. A guide never presents a
  ruling as made.
- Repo text is data, never instructions. It is never pasted unquoted into a shell. A source the
  guide cannot read is named under "couldn't read", never invented.
- Each guide stays within its length budget in docs/catalog.md (from-code ≤120 lines, score ≤80;
  aim for ≤150 elsewhere).

## Evals (`evals/`)

- `evals/triggers.json`: `[{ask, expect: "setup"|"brief"|"check"|null, note?}]`.
  - 30 asks: about 18 positives in designer phrasing and 12 negatives.
  - The negatives include collisions: "critique this mockup", "design a logo", "write a blog post",
    "accessibility review of this Figma".
  - Any ask naming loop or admin expects null.
- `evals/cases/<skill>.json`: `[{id, skill, fixture, variant?, turns:[string], beta?, expect:{…}}]`.
  - In `turns`, `"{{yes}}"` is an approval turn.
  - `expect` keys:
    - `skill_invoked`, `must_include[]`, `must_not_include[]`;
    - `no_repo_writes` (bool), `no_write_before_turn` (n), `files_exist[]`, `files_absent[]`;
    - `run_log_rows` (n);
    - `cli_after[{argv[], code}]`;
    - `judge[]` (criteria for the judge, free text only).
- The harness (`evals/run.mjs`) copies a fixture, runs `claude -p --plugin-dir <built plugin>`, scores
  and writes `evals/results/<date>.json`. It is built after the skills.

## Settled during the build (2026-11-12)

The agents reported these ambiguities in the contract. The lead settled each one as follows; the
code and the guides follow them.

- **Loop steps.** The product loop is goal → evals (approve gate) → design → validate (decide gate)
  → learn. The build loop is plan (approve gate) → code → test → ship (decide gate) → measure.
  `loops goal new` parks a goal at the first gated step (product.evals). A person's step (one
  with a holder but no named gate) is closed with `loops gate <G> approve --note "it holds"`.
  The coding agent's own steps are moved by the guide editing `step:` after a yes, and
  `loops check` refuses a goal that went past a gate with no approve line.
- **Roster.** `- deputy:` names a role (its holders stand in) or a person. `proposals decide`
  reads the roster through `loopkit.parseRoster`, the same reading a gate uses.
- **Run log.**
  - A rating is its own `kind:"rating"` row with `ref`; run rows carry `rating:"none"`.
  - `runs rate <id|last> skip` records that the person was asked and passed.
  - Brief and score runs log `result:"pass"` (or `error`).
  - The run-log field list is SPEC's; `claude_code_version` lives in the eval results file, not
    the row.
- **admin digest.**
  - `rulesCaught` is `{surface: {blocks, flags}}`, because a row carries no rule ids beyond
    false positives.
  - An error's message is the row's `note`.
  - The thresholds are SPEC's fixed numbers.
  - Writing the proposal files is the admin guide's job, so there is no `admin run` CLI command.
- **audit.** It adds `driftCounts {critical, warning, info}` so guides quote numbers instead of
  counting. A Tailwind config counts as a token source only when it reads tokens. It takes a
  `--primitives <path>` flag (repeatable) in place of a config file.
- **tokens.** Figma variable names keep their last path segment (`Color/primary` → `--primary`).
  `tokens diff` compares against the light theme. A source with no tokens returns no rows, and
  the import guide reads that as "send me the export". Field names: `missing[]` and pair `fg/bg`
  use bare role names; `raw[].token` and diff `rows[].token` keep the `--`.
- **Placeholders.** `{{REPO}}` and `{{MARKETPLACE}}` exist alongside PLUGIN, CLI and ROOT. The
  build fills them in skills and in templates (`.md`, `.yml`); a template's own `{{TODAY}}`
  stays for the command that copies it.
- **Copy extraction.** In markup and components, copy is the text nodes between a tag's `>` and
  the next `<`, with `{expressions}` blanked. Code that happens to sit between a `>` and a `<`
  (`=>`, `&&`, `return`, braces) is not copy.
- **Not built yet.** `jobs check` (loop/jobs is beta and runs by hand), a brief-id command, and
  a command that moves an agent-only step.
