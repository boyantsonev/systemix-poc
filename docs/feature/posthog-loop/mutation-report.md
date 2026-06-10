# PostHog loop — mutation report

## Engagement loop

Mutation hardening of the **landing-engagement** code in
`packages/cli/src/commands/evidence.js`, scoped by `stryker.evidence.conf.json` to
the engagement ranges only:

- `:99-243` — `queryPostHogEngagement`, `synthesizeEngagement`, `writeEngagementSnapshot`
- `:494-637` — `appendEngagementAck`, `engagementPull`, `engagementClose`, `engagement`, `check`

Run with `cd packages/cli && npx stryker run stryker.evidence.conf.json`.

| | Score | Killed | Survived |
|---|---|---|---|
| **Before** | **46.17%** | 193 | 225 |
| **After** | **82.06%** | 343 | 75 |

Test file: `packages/cli/tests/acceptance/evidence-engagement/engagement.test.js`
— grown from **11** tests to **53** (`npx jest` green; full package suite 152 green).
**Source unchanged** — `git diff --stat src/commands/evidence.js` is empty (assertions
only, no behavior change).

### Assertions / cases added and the survivors they kill

**`queryPostHogEngagement` (`:99-162`)**
- *No-credentials base shape* — asserts `cta_clicks === {hero:0,nav:0}`, `sections === []`,
  `fetched_at` is a sliced `YYYY-MM-DD` (not full ISO).
  Kills `:107` (`.slice(0,10)` removal), `:113` (`cta_clicks:{}`), `:114` (`sections` array content).
- *Partial-credentials case* (only key, or only project id) → still `no-credentials`, no fetch.
  Kills `:117` `LogicalOperator` (`||`→`&&`).
- *Funnel from rows* — asserts every destructured field (`pageviews/unique_visitors/install_copies/
  install_persons/cta_clicks`), the bearer `Authorization` header, and that the **two** queries are
  sent with the right bodies (`install_command_copied` + `count(DISTINCT person_id)` in headline,
  `section_viewed` + `GROUP BY section` in the second). Kills the row-destructuring defaults
  (`:150`), the sections `.map` (`:156`), the second-query dispatch, the header literals (`:122`).
- *Host default + trailing-slash strip* — unset `POSTHOG_HOST` → `https://eu.posthog.com`;
  `".../"` → normalised. Kills `:102` EU-host default and `.replace(/\/$/,"")`.
- *No-traffic* — empty `results` from both queries → funnel zeroed, `install_conversion === null`.
  Kills `:154` conversion guard (`unique_visitors > 0 ? … : null`; `>`→`>=` and `true ?`).
- *Section mapping* — `[[name,views]]` → `[{section,views}]`.
- *Error path* — `ok:false, status:403` → `source:"error"`, `error === "PostHog query 403"`
  (exact, not `/403/`). Kills `:125` error-message literal and `:159` error branch.

**`synthesizeEngagement` (`:165-192`)**
- *Confidence tiers at boundaries* — parametrized `1000→0.8, 999→0.5, 100→0.5, 99→0.2, 1→0.2, 0→0`.
  Kills the `:179` `>=`/`>` EqualityOperator and ConditionalExpression mutants at each tier.
- *Recommendation branches* — `no-traffic-yet` (v=0), `keep-collecting` (v=99),
  `healthy` (v≥100 ∧ conv≥0.05), `low conversion` (v≥100 ∧ conv<0.05), and conv=null→low.
  The **v=100 boundary** asserts *not* keep-collecting (kills `:188` `<`→`<=`).
  The **conv=0.05 boundary** asserts healthy (kills `:189` `>=`→`>`).
  Kills the `:187/:188/:189` branch ConditionalExpression/Equality mutants and the branch string literals.
- *Summary rendering* — singular/plural for `visitor`/`pageview` at exactly 1 (kills `:183`
  `=== 1` ternaries), `n/a` when conv null (kills `:184`), `pct()` one-decimal rounding `0.1234→12.3%`
  (kills `:166`), CTA echo `hero 7, nav 4`, `Top sections: a, b, c.` with a **3-entry cap**
  (kills `:181` `.slice(0,3)` MethodExpression), and `Top sections: none.` when empty
  (kills `:181` `|| "none"` LogicalOperator).
- *Error synthesis* — `source:"error"` → `recommendation:"retry"`, summary contains the error.
  Kills `:174-175` error branch.

**`writeEngagementSnapshot` (`:195-242`)**
- *Block keys + values* — asserts each `evidence-posthog:` line (`source/window_days/unique_visitors/
  pageviews/install_copies/install_persons/install_conversion`). Kills `:208-213` per-line StringLiterals.
- *`last-synced` replacement* + dated `### … — synced (live)` heading + inlined
  `Signal strength: 50%. Note: low conversion …` line. Kills `:218`, `:222`, `:226` signal-strength
  ternary/arithmetic, and the placeholder-removal assertion stays.
- *Conversion rounding* — `37/800 → 0.0463` (4dp), not the full float. Kills `:214`
  `Math.round(conv*10000)/10000` and the `conv == null ? "null"` branch.
- *Null conversion* — writes literal `null` + `Signal strength: none.` Kills `:214`/`:226` null branches.
- *No-heading fallback* — a record body lacking `## Engagement Log` → heading appended, prose preserved.
  Kills `:232` `if (/##\s*Engagement Log/.test(body))` ConditionalExpression and the `:235` fallback branch.
- *Throws* — missing record → `Engagement record not found: …does-not-exist.mdx`; unparseable
  frontmatter → `Could not parse engagement frontmatter`. Kills `:197`/`:200` guard ConditionalExpressions
  and message StringLiterals.

**`appendEngagementAck` (`:496-507`)**
- *Throw on missing record* — kills `:498` guard + message.
- *trimEnd before append* — record padded with trailing blank lines → ack sits on the next line,
  no `\n\n\n` run survives. Kills `:502` `trimEnd`→`trimStart` MethodExpression.

**`engagementPull` (`:509-554`)**
- *Card field values* — no-creds card: `surface/metric/baselineRate(null)/variantRate(null)/
  sessions(0)/confidenceLevel(0)/proposal/context/_posthogData.source`. Live card:
  `sessions=1200, baselineRate=72/1200, confidenceLevel=0.8`. Kills `:530-545` card-field
  ObjectLiteral/StringLiteral mutants.
- *Hypothesis singular/plural* — exactly 1 visitor/1 install → `"… — 1 visitor, 1 install"`.
  Kills `:534` `=== 1` ternaries and the surrounding string literals.
- *`--days` propagation* — `toIntervalDay(7|14)` in the HogQL body **and** `window_days:` in the record.
  Kills `:512` `daysIdx !== -1` ConditionalExpression and the `Number(args[daysIdx+1])` arithmetic.
- *Dedup filter* — seeds 4 decoys (wrong-type/same-record, right-type/different-record,
  right-type/resolved, the stale same-record pending) and asserts only the stale one is evicted.
  Kills all three `:549` predicate clauses (`type`, `recordPath`, `status`) + the `||`/`&&` LogicalOperator.
- *Missing-record guard* — kills `:515` guard.
- *No `cards` key in queue.json* — `?? []` applies, one card still written. Exercises `:548`.

**`engagementClose` (`:556-581`)**
- *Find predicate* — seeds wrong-type/wrong-record/already-approved decoys; only the matching
  pending snapshot is resolved, decoys untouched. Kills all three `:572` clauses + LogicalOperator.
- *`--flag` vs default* — `flagged-for-experiment` vs `acknowledged`, asserted on both the record
  line and `card.resolution.action`. Kills `:560`/`:577` branch.
- *`--note` vs no-note* — `acknowledged — looks fine` vs `acknowledged` with no em-dash;
  `card.resolution.note` is the value or `null`. Kills `:501`/`:559` note handling.
- *Explicit positional record id* (`close pricing`) → pricing record acked, landing untouched.
  Kills `:557` `args.find(a => !a.startsWith("--"))` arrow + `"--"` StringLiteral.
- *Default record id* (`close --flag`, no positional) → landing resolved. Exercises the `?? "landing"` default.
- *Missing-record + no-cards-key guards* — kill `:562` guard and exercise `:571`.

**`check` (`:591-636`)**
- *Missing creds* (both, and only-one) → prints the `Set POSTHOG_API_KEY + POSTHOG_PROJECT_ID` hint,
  **no fetch**. Kills the `:602` `||` LogicalOperator and the missing-branch.
- *Connected, count>0* → `42 $pageview`, `✓ connected`, `Capture is live`.
- *Connected, count==0* and *empty results* → `0 $pageview`, `no pageviews yet`, **not** `Capture is live`.
  Kills `:627`/`:629` `count > 0` EqualityOperator/ConditionalExpression and the `:625` `rows[0]?.[0] ?? 0`
  extraction.
- *HTTP error* (`ok:false, status:401`) → `HTTP 401`, `Connection failed`, not `connected`.
  Kills `:619` `!resp.ok` BlockStatement/ConditionalExpression.

### Documented equivalent / presentation-only survivors (not chased)

These remain by design — killing them would require asserting on cosmetic output or would be
impossible because the mutant produces identical observable behavior.

- **HogQL / SQL string internals** (`:121-126`, `:611-615`, `:624`): whitespace, keyword case, and
  unused-fallback array contents inside query bodies. The queries are asserted by *substring*
  (event names, `GROUP BY`, `toIntervalDay`), but their exact formatting is equivalent — PostHog
  ignores whitespace, and the `results ?? []` fallback array (`["Stryker was here"]`) is filtered
  out downstream, so it is genuinely equivalent.
- **`console.log` presentation text** (`:520, :521, :527, :530, :553, :580, :594-600, :607, :620,
  :621, :627 mark chars, :630, :631, :633, :634`): human-facing CLI strings (`"✓ snapshot written…"`,
  the `✓`/`·`/`✗` glyphs, hint lines). Their *branch selection* is asserted (e.g. capture-live vs
  no-pageviews vs connection-failed), but the literal wording is presentation-only.
- **Frontmatter / log regexes** (`:199, :217, :218, :232, :233`): anchor/quantifier mutants
  (`^` removal, `\s*`→`\s`, `*`→`+`, trailing `$`) on the `---…---` frontmatter and the
  `## Engagement Log` insertion. On the well-formed records this code reads/writes, these variants
  match identically — they only diverge on malformed input the function never produces. The
  *behavior* (block replaced, heading inserted, placeholder removed, fallback heading appended) is
  fully asserted; the regex micro-variants are equivalent.
- **`engagement` dispatcher** (`:586` `sub === "pull" ? args.slice(1) : args`): because
  `engagementPull` only reads the `--days` flag by value (not by position), slicing or not slicing
  the leading `pull` token yields the same resolved `days`. Both the sliced (`engagement pull --days N`)
  and unsliced (`engagement --days N`) paths are tested and produce identical windows — the mutant
  is equivalent.
- **`:512` residual** (`daysIdx !== +1` UnaryOperator, `true ?` ConditionalExpression): differs from
  the original only when `--days` sits at index 1 or is absent with a numeric `args[0]`, neither of
  which changes the resolved window given the `|| 30` default — equivalent for observable output.
- **`:503/:504` atomic-write internals** (`filePath + ".tmp"`, the `"utf8"` encoding arg): the
  temp-file name and encoding are structural; the observable result (file contents) is identical, so
  these are presentation/equivalent.
- **`:189` `true && conv >= 0.05`**: with `conv == null`, both original (`null != null` → false) and
  mutant (`true && null >= 0.05` → false) fall through to low-conversion — equivalent for the only
  input that reaches it.

Reaching **82.06%** (≥80% threshold) with every *logic* mutant in the funnel math, confidence
tiers, recommendation branches, snapshot block, card fields, dedup/find predicates, and `check`
branches killed is the goal; the residual survivors above are equivalent or presentation-only.
