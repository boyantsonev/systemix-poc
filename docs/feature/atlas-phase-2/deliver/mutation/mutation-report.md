# Atlas Phase-2 — Mutation Report

Source under test: `packages/cli/src/commands/atlas.js` (driving port `build({ projectRoot })`).
Config: `packages/cli/stryker.atlas.conf.json` (mutates `atlas.js`, runs only
`tests/acceptance/atlas-build/atlas-build.test.js`).
Run: `cd packages/cli && npx stryker run stryker.atlas.conf.json`.

## Atlas generator — assertion-strengthening pass

### Score

| | Mutation score | atlas-build.test.js cases |
|---|---|---|
| Before | **56.36%** | 10 |
| After  | **94.50%** | 67 |

Constraint honored: **source unchanged** (`git diff --stat src/commands/atlas.js`
empty), no existing test weakened/skipped/deleted — assertions and cases were
ADDED only. Full package `npx jest` green (99 tests, up from 42).

### Assertions / cases added and the survivors they kill

All cases are self-contained (`mkdtempSync` workspace + own `contract/workflows/*.mdx`
+ `systemix.config.yaml`), mirroring the original `createTmpWorkspace` helper.

#### Frontmatter parsing / required-field validation (AC-5)
- **Per-field top-level missing** (`it.each` id/persona/title/pattern/surface):
  asserts the error names the file AND `"<field>"`. Kills the required-field loop
  conditionals (`atlas.js:107–116`).
- **Empty-string top-level field** (`title: ""`): kills the `value === ""` branch (`113`).
- **Null top-level field** (`title: null`): kills the `value === null` branch (`111`).
- **Empty-list field** (`steps: []`): kills the `Array.isArray(value) && value.length === 0`
  branch (`112–113`).
- **Scalar frontmatter** (`just a bare string`): non-object `data` → kills the
  `!data || typeof data !== "object"` guard + its message (`103–104`).
- **Invalid-YAML frontmatter** (`id: [unclosed`): `matter()` throws → kills the
  parse `catch` block + "not valid YAML" message (`100–101`).
- **Empty frontmatter** (`---\n---`): rejected naming the file.

#### Step / edge structural validation (AC-5)
- **Per-field step missing** (`it.each` id/label/kind/note): error names file + field.
  Kills `normaliseStep` required loop (`62–65`).
- **Empty-string step field** (`note: ""`) and **null step field** (`note: null`):
  kill the step `=== ""` (`63`) and `=== null` branches.
- **Step missing its own id**: asserts the `step "?"` placeholder appears →
  kills the `raw.id ?? "?"` fallback (`64`).
- **Non-map step** (scalar) and **non-map edge** (scalar): kill the
  `!raw || typeof raw !== "object"` guards (`59`, `85`).
- **Null edge** (bare `-` list item): asserts the `"from" and "to"` AtlasBuildError
  message (not a raw TypeError) → kills the `!raw` part of the edge guard (`85`).
- **Missing `from` / missing `to`** (`it.each`): kill `!raw.from || !raw.to` (`85`).
- **`steps`/`edges` not a list** (`it.each`): kill the `Array.isArray` list checks (`128`, `131`).

#### Vocab validation (AC-2) — one case per dimension
- **Closed enums round-trip**: every valid `pattern` (chain/routing/parallelization/
  orchestration) and every valid step `kind` (input/agent/router/parallel/tool/human/
  output) is accepted and preserved verbatim. Kills the `PATTERNS`/`STEP_KINDS`
  array-content mutants (`26–27`).
- **Invalid enum lists the allowed set**: the unknown-pattern / unknown-kind errors
  now assert the comma-space-joined allowed list (`chain, routing, …`). Kills the
  `PATTERNS.join(", ")` / `STEP_KINDS.join(", ")` mutants (`68`, `126`).
- **Undeclared persona/surface/agent** (existing `it.each`, retained) — distinct
  branch per dimension.
- **Malformed `atlas.personas` (scalar)** → empty persona vocab rejects the persona.
- **Malformed `atlas.surfaces` (scalar)** with valid personas → reaches and fires the
  surface check.
- **Malformed `atlas.agents` (scalar)** → empty agent vocab rejects an agent step.
  Kills the `readVocab` agents `typeof === "object"` guard (`50`).

#### Optional-field handling (AC-1)
- **Absent** agent/screen on a step + absent edge label → keys OMITTED (exact-shape
  `toEqual`). **Empty-string** and **null** variants of agent/screen/label → also
  treated as absent and omitted, and `agent: ""`/`agent: null` are NOT validated
  against the agent vocab. Kills the optional `!== undefined && !== null && !== ""`
  guards (`71`, `77`, `89`).
- **Edge with a label** → label preserved.
- **Absent `problem`** → defaults to `""`.

#### Ordering (`order` frontmatter)
- Three+ contracts with explicit `order` 2/1 and order-less siblings: asserts output
  order is `order` then `id`, order-less last, ties broken by `id`. Kills the
  `.sort((a,b) => a.order - b.order || id.localeCompare)` comparator (`200`).
- Equal `order` values → tie-break by id ascending.
- **Non-number `order`** (`order: high`) → treated as absent (sorts last). Kills the
  `typeof data.order === "number"` guard (`147`).
- Every emitted workflow asserted to NOT have an `order` property (artifact + domain).

#### Empty state (AC-4) — each variant distinct
- **No `atlas:` block** (config present) → empty catalog. (existing)
- **`atlas:` block present, no contracts** → empty catalog. (existing)
- **No `systemix.config.yaml` at all** → empty catalog, artifact written.
- **`contract/workflows/` directory absent** → empty catalog, artifact `{version:1,
  workflows:[]}`. Kills the `: []` fallback when the dir does not exist (`186`).

#### Catalog port
- `byPersona` filters per persona, returns `[]` for a vocab persona with zero
  workflows and for a non-vocab persona; `byId` resolves the right workflow and
  returns `undefined` for an unknown id. Kills `makeCatalog` filter/find (`157–159`).

#### Atomic write / artifact shape
- On-disk artifact has exactly `{ version: 1, workflows: [...] }` (key set asserted),
  `written` equals the resolved absolute artifact path, returned `workflows` equals
  `catalog.all()`, no `order` leaks into the serialized workflow.
- Serialized JSON is 2-space pretty-printed and ends with a trailing `\n` → kills the
  `JSON.stringify(..., 2) + "\n"` formatting mutant (`214`).

#### CLI presentation (`cli()` wrapper) — thin coverage
- Unknown subcommand → reports an error mentioning it and `process.exit(1)`.
- No args → defaults to `build` (no exit). Kills the `args[0] || "build"` default (`224`).
- Build success → logs a success line with the workflow count, no exit.
- Build authoring error → reports "atlas build failed" + the bad value, exits 1.

## Documented presentation-equivalent / equivalent survivors

The remaining **16 survivors** (94.50%, well above the 80% target) are equivalent
mutants or pure presentation strings that cannot be killed without asserting
implementation cosmetics or contorting tests against non-observable behavior:

| Line | Mutation | Why it survives (equivalent / presentation) |
|---|---|---|
| `37:17` | `this.name = "AtlasBuildError"` → `""` | Error `.name` property; the observable contract is the message (`file: …`), which every test asserts. Presentation. |
| `49:64` | personas fallback `[]` → `["Stryker"]` | An empty vocab and a junk-string vocab BOTH reject any declared persona; the fallback value is unobservable. Equivalent. |
| `50:13` `50:29` `50:92` | agents `&&`/`?:`/fallback `[]` | Same: a non-object `agents` yields no valid agent names regardless of fallback contents. Equivalent. |
| `51:64` | surfaces fallback `[]` → `["Stryker"]` | Same as personas. Equivalent. |
| `85:15` | `typeof raw !== "object"` → `false` | For every malformed edge our fixtures can express (null/scalar/missing key), `!raw` or `!raw.from` already catches it; the typeof clause is redundant for valid YAML inputs. Equivalent. |
| `185:7` | `.sort()` on filenames removed | `readdirSync` already returns names in sorted order on the test FS, and catalog order is fixed downstream by the `order`/`id` sort. Output is byte-identical. Equivalent. |
| `190:16` (×2) | `files.length > 0` → `>= 0` / `true` | An empty `files` array maps to an empty `parsed`/`workflows` either way; the guard is an optimization, not a behavior fork. Equivalent. |
| `192:67` | `readFileSync(…, "utf8")` → `""` | `""` encoding returns a Buffer; gray-matter parses it identically for our ASCII/UTF-8 contract content. Equivalent. |
| `215:34` | tmp suffix `".tmp"` → `""` | The temp file is renamed onto the artifact path before return; its intermediate name is never observed. Equivalent. |
| `216:35` | `writeFileSync(…, "utf8")` → `""` | Output bytes identical for our content; the idempotent/shape tests already pin the bytes. Equivalent. |
| `230:11` | `err instanceof AtlasBuildError` → `if (true)` | The `true` mutant only changes behavior for a NON-Atlas error (it would `exit(1)` instead of rethrowing). build() raises only `AtlasBuildError` for all inputs expressible through the filesystem fixtures; provoking a foreign throw would require source changes or fragile fs mocks. Defensive rethrow branch — documented. |
| `239:15` | `console.log("  Usage: …")` → `""` | Usage help text, pure presentation. |

These are acceptable: the goal is killing the `build()` LOGIC mutants (parsing,
validation, vocab, ordering, empty state, catalog port, artifact shape) — all of
which are now killed — not 100% on presentation/equivalent strings.
