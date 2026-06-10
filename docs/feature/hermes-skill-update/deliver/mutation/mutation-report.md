# Mutation Report — `skill-update.js`

QUALITY_GATE deliverable: raise the mutation score of `packages/cli/src/commands/skill-update.js`
to **≥ 80 %** by strengthening test **assertions only**. No source change, no test weakened.

## Result

| Metric | Before | After |
|---|---|---|
| **Mutation score** | **55.49 %** | **87.28 %** |
| Mutants killed | 93 | 141 |
| Timed out (counted as killed) | 3 | 10 |
| Survived | 77 | 22 |
| No coverage | 0 | 0 |
| Errors | 0 | 0 |

Threshold (`stryker.conf.json`): `high: 80`. **PASS** — 87.28 % ≥ 80 %.

### Per-file breakdown (final)

```
File             | % score | # killed | # timeout | # survived | # no cov | # errors
-----------------|---------|----------|-----------|------------|----------|---------
skill-update.js  |  87.28  |   141    |    10     |     22     |    0     |    0
```

(Single-file config — `mutate: ["src/commands/skill-update.js"]`. The "All files" row is identical.)

## Test changes

- Source file: **unchanged** (`git diff --stat packages/cli/src/commands/skill-update.js` is empty).
- Test file: `packages/cli/tests/acceptance/hermes-skill-update/skill-update.test.js`
  - **11 → 22 tests** (11 added). No existing test deleted, skipped, or weakened — existing
    scenarios were only given **additional / stronger** assertions.
  - Added one recording fetch helper (`makeRecordingOllama`) to assert the exact request the
    production code builds.

## How to reproduce

```bash
cd packages/cli
npx jest tests/acceptance/hermes-skill-update   # 22 green
npx stryker run                                  # ~25s, prints score table
```

## Assertions / tests added → survivors killed

| Change (test) | Kind | Survivors killed (file:line) |
|---|---|---|
| **AC-1** — capture generate request + assert `buildPrompt` body | strengthened | `138:69` `139:17` `140:18` `140:36` `141:30` `141:39` `141:66` (generate request object/method/headers/body/model/stream); `43:60` `45:10` (buildPrompt block & template string); `44:16` (date `.slice(0,10)` — see note) |
| **AC-2** — assert exactly-one refused log with exact `event/adapter/reason/action` | strengthened | `114:71` (`reason:"econnrefused"`); reinforced `114` event/action |
| **AC-3** — assert every fail-card field value + queue length | strengthened | `166:20` (id template), `170:20` (`reason`), card `type`/`status`/`decision`/`hypothesisId` (`93`-family types) |
| **AC-7** — assert every review-card field value + exactly one card + structural heading written | strengthened | `189:20` (id template), `193:20` (`changeType`); `187:7` reinforced |
| **skill-dir-absent** — assert exact `event/reason/hypothesisId`, exactly one log | strengthened | `105:50` (`reason:"skill-dir-absent"`) |
| **model-absent** — assert exact `event/adapter/reason/action`, exactly one log | strengthened | `120:53` (`adapter`), `120:95` (`action`), `118:46` reinforced |
| **probe — mixed models** (`[llama3, hermes3]`) detects hermes | NEW | `118:46` (`models.some` → `models.every`) |
| **retry: HTTP-error then success on attempt 2** (asserts 2 generate calls + 2nd content written) | NEW | `131:25` (`attempt <= 2` → `< 2`) |
| **retry: generate THROWS then success on attempt 2** (must resolve, 2nd content written) | NEW | `143:19` (empty `catch {}` — without `continue`, `genRes.ok` throws) |
| **trailing-whitespace stripping** (leading kept, trailing removed) | NEW | `26:42` (`trimEnd`→`trimStart`), `26:63` (`join("\n")`→`join("")`) |
| **bullet-level change → NO review card, write proceeds** | NEW | `187:7` (`changeType==="structural"` → `if(true)`); reinforces `37:7` |
| **heading REORDER is bullet-level** (sort before compare) | NEW | `31:20` (`matches.sort()`→`matches`); `37:29` `37:60` (`join("|")` separators) |
| **queue append to a pre-existing queue.json** (2 cards, original preserved) | NEW | `59:24` (`cards:[]`→`["Stryker"]`), `60:7` (`if(false)`), `60:33` (empty block), `62:52` (reset array) |
| **queue heal — non-array `cards` reset** | NEW | `62:9` (`!Array.isArray` family) |
| **missing-contract log** — exact `event/reason/hypothesisId`, exactly one log | NEW | `93:9` (`log({})`), `93:18` (`event`), `93:50` (`reason`) |
| **skill-tags: first of many wins, trimmed** (`[hermes, other]`) | NEW | `22:31` (`s => undefined`), `20:7` (`if(true) return []`), tags[0] resolution |
| **non-default tag from multi-line frontmatter** (`skill-tags : [custom:skill]`) | NEW | `9:31` regex family (anchored `^---`, `[\s\S]*?`, `[^\s\S]` etc.), `10:7` (`if(true) return {}`), `12:37` (`split("\n")`→`split("")`), `12:44` (empty loop body), `13:39` (`split(":")`→`split("")`), `14:32` (`key.trim()`), `14:56` (`rest.join("")`), `100:22` (`fm[""]`), `21:*`/`22:*` parseSkillTags chain |

Net: **77 → 22 survivors** (48 real mutants killed; +7 additional timeouts now counted).

## Equivalent / behaviorally-redundant mutants (documented, NOT force-killed)

The 22 remaining survivors are equivalent mutants (no observable behavior change) or
near-equivalent mutants that would require contorted, low-value tests. They are intentionally
left alive per the standard mutation-testing practice of documenting equivalents.

### A. `"utf8"` encoding → `""` (Node default encoding)

| Line | Mutant | Justification |
|---|---|---|
| `61:51` | `readFileSync(queuePath, "")` | `utf8` is Node's default read encoding. With `""`, Node falls back to default → identical string. Behaviorally identical. |
| `66:61` | `writeFileSync(tmpPath, …, "")` (queue) | Same — `utf8` is the default write encoding. Identical bytes on disk. |
| `183:46` | `writeFileSync(tmpPath, proposedContent, "")` (skill) | Same default-encoding equivalence. |

### B. `+ ".tmp"` → `+ ""` (atomic-write temp path)

| Line | Mutant | Justification |
|---|---|---|
| `65:31` | `tmpPath = queuePath + ""` | Then `tmpPath === queuePath`; the write targets the final path and `renameSync(queuePath, queuePath)` is a no-op rename onto itself. Final file content is identical. The `.tmp` indirection is an atomicity guarantee, not an observable output — unobservable via the filesystem end-state. |
| `182:31` | `tmpPath = skillPath + ""` | Same: write-then-rename-onto-self yields identical final SKILL.md. AC-6 already asserts no `.tmp` remains, which both the original and this mutant satisfy. |

### C. Retry-delay timing (`if (attempt > 1) { setTimeout(resolve, 500) }`)

| Line | Mutant | Justification |
|---|---|---|
| `132:9` | `if (attempt > 1)` → `if (false)` | Removes only the 500 ms inter-attempt sleep. The retry still happens (driven by the `for` loop), output is identical; only wall-clock timing differs. Asserting it would require a flaky timer test. |
| `132:22` | block body → `{}` | Same: drops the sleep only. No observable behavior change. |

(The retry **count** boundary `131:25` and the `catch` **continue** `143:19` are NOT timing —
those are real and were killed by the two new retry tests.)

### D. `new Date().toISOString().slice(0,10)` → `…toISOString()`

| Line | Mutant | Justification |
|---|---|---|
| `44:16` | drop `.slice(0,10)` | Non-deterministic timestamp embedded in the prompt. AC-1 asserts the prompt contains `Date: ${today}` (the 10-char date), which is a substring of the full ISO timestamp — so the mutant's longer string still contains it. Only the *exact length* differs, which is non-deterministic and not a meaningful business assertion. Equivalent for the observable contract. |

### E. `return "bullet-level"` → `return ""`

| Line | Mutant | Justification |
|---|---|---|
| `40:10` | `return ""` | The return value of `classifyChange` is only ever compared via `=== "structural"`. Both `"bullet-level"` and `""` are non-structural, so the downstream branch (push review card?) is identical. The literal string is never otherwise observed. Equivalent mutant. |

### F. Frontmatter / parse mutants with no observable effect on the only consumed field

The only frontmatter field the production code reads is `skill-tags`; all other parsed
fields are inert. These mutants survive because they only perturb parsing in ways that do not
change the resolved `skill-tags` value for any realistic contract:

| Line | Mutant | Justification |
|---|---|---|
| `10:7` | `if (!match)` → `if (false)` | "no frontmatter" path. When frontmatter IS present (every realistic contract), `match` is truthy, so `if(false) return {}` is never taken → same `fm`. The negative ("no `---` block") path defaults `skill-tags` to `hermes`, which is the same default an empty `fm` produces — indistinguishable from the happy path's hermes resolution. Near-equivalent. |
| `9:31` | `/---\n…/` (drop `^` anchor) | The `^` only matters if a stray `---` appears earlier than the real frontmatter on a non-first line; no realistic contract does. Same capture group. |
| `14:9` | `if (key && rest.length)` → `if (true)` / `if (key \|\| rest.length)` | The guard skips malformed lines (no colon). Every line in a well-formed contract has a colon, so the guard is always true anyway → mutant indistinguishable. Killing it needs a deliberately malformed frontmatter line whose mis-parse changes `skill-tags`, which no valid contract produces. |
| `14:46` | `rest.join(":")` → `rest.join(":")` w/o trailing `.trim()` | `parseSkillTags` re-runs `rawValue.trim()` on the value, so the dropped trim is re-applied downstream → identical resolved tag. Equivalent given the double-trim. |
| `21:17` | `parseSkillTags`: drop `rawValue.trim()` | `parseFrontmatter` already trimmed the value, so the second trim is redundant for any value coming through the real pipeline → equivalent in-pipeline. |
| `21:41` `21:60` | `/^\[/`→`/\[/`, `/\]$/`→`/\]/` (drop anchors) | The bracket strip removes the first `[` / first `]`. For a single-pair `[tag]` value the anchored and unanchored regexes remove the same characters → identical inner string. |
| `22:10` | drop `.filter(Boolean)` | Only removes empty entries from a trailing comma. No realistic `skill-tags` value has empty segments that would alter `tags[0]`. |
| `22:36` | `map(s => s.trim())` → `map(s => s)` | The frontmatter value is already trimmed upstream and the bracketed list `[a, b]` is split on `,`; the first element's surrounding space is stripped earlier in the pipeline for the resolving tag. Does not change `tags[0]` for the realistic `[hermes]` / `[custom:skill]` forms tested. |

### G. Heading-regex mutants with no observable classification change

| Line | Mutant | Justification |
|---|---|---|
| `30:33` | `/^## .+/`→`/## .+/` (drop `^`) | With the `gm` flag, `## ` realistically only appears at line starts in SKILL.md; dropping the anchor matches the same headings. No fixture has an inline `## ` mid-line that would change the set. |
| `30:33` | `/^## .+/`→`/^## ./` (`.+`→`.`) | Truncates each captured heading to its first char after `## `. `classifyChange` compares the **sorted, joined** heading lists of existing vs proposed. Both sides are truncated identically, so structural-vs-bullet classification is unchanged for the tested fixtures (no two headings collide to the same first char in a way that flips the verdict). |
| `31:37` | `: []` → `: ["Stryker was here"]` | The `else` branch (no `## ` headings at all). Every SKILL.md fixture has headings, so the falsy branch is never taken → dead-for-our-inputs. Killing it requires a heading-less existing AND proposed file, an unrealistic skill document. |

## Files touched (git status)

| Path | State | Note |
|---|---|---|
| `packages/cli/tests/acceptance/hermes-skill-update/skill-update.test.js` | modified | the only test change — assertions added, nothing weakened |
| `docs/feature/hermes-skill-update/deliver/mutation/mutation-report.md` | new | this report |
| `packages/cli/reports/` | untracked | Stryker HTML/run artifacts — **not gitignored**; safe to delete or add to `.gitignore`. Regenerated on every `stryker run`. |
| `packages/cli/src/commands/skill-update.js` | **unchanged** | `git diff --stat` empty — source under test not modified |
| `packages/cli/package.json` | modified (pre-existing task setup) | adds `@stryker-mutator/core` + `@stryker-mutator/jest-runner` devDeps — part of the mutation-testing harness, not a behavior change |
| `packages/cli/stryker.conf.json` | untracked (pre-existing task setup) | the provided Stryker config |
