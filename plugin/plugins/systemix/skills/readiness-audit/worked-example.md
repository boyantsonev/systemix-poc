# Worked example — /systemix:readiness-audit

Part of the readiness-audit skill, read from SKILL.md only when its Output format template leaves a layout doubt.

A sample report for the Systemix repository itself (systemix-poc, `--dirs src`, commit `986a92fca0cb`, counters
1.0.0), computed by the reference evaluator, not by hand. Every name, path and number below is that repository's; the
`checkout:` line and the wording of the opportunities are readings, not evaluator output. Your numbers will differ;
the layout will not. The operator re-runs it with the cross-check of Step 3 (the evaluator reads the rubric out of the three `rubric.json` files):
`node packages/cli/tests/acceptance/skills/rubric-eval.js <counters> --skills packages/cli/pipelines/design-system/skills`

```
skill: readiness-audit@0.3.0 · rubric: v1 · counters: 1.0.0 (systemix.audit-counters/1) · commit: 986a92fca0cb (2026-10-13T22:26:41+00:00) · token source: src/app/globals.css via doc:design/DESIGN.md · dirs: src · execution: counters-cli
population: census 213 files [m:census.files.total] · tests 19 [m:census.files.tests] · .d.ts 0 [m:census.files.declarations] · token source 1 [m:census.files.token_source] · audited 193 [m:census.files.audited] · coverage: 213 of 213 source-looking files seen [m:census.files.total] [m:census.files.any_type#byExt] · skipped dirs: none · missing or refused dirs: none · counters warnings: 0 [m:warnings] · counters tool 0.2.1 [m:toolVersion]
checkout: clean [j]

# AI-native Readiness Audit — systemix-poc (src)
Rubric score: 53/100 [r:overall]   (a rubric score, not a measurement of readiness; one satisfaction point moves it by 1.67 [r:overall.per_point])
Flags: exemption_applied — a declared exemption removes 1 [m:typography.exempt.files] of 193 [m:census.files.audited] audited files from the items marked with !
Spine completeness: 2 of 6 [m:docs.spine.members_present]   (printed, not scored)
Prose/block mismatch: none

## Rubric (ODI — most underserved first)
| Rank | Dimension | Imp [r:importance] | Pts /10 [r:pts] | Sat [r:sat] | Opp [r:opp] | Evidence |
|---|---|---|---|---|---|---|
| 1 | Component consistency | 8 | 2.5 | 3 | 13 | 8 `<Badge>` matches render a local copy [m:primitives.badge.resolved.to_local_definition], 25 raw `<button>` matches [m:primitives.button.raw.outside_ui] and 1 raw `<input>` match [m:primitives.input.raw.outside_ui] outside components/ui; 1 group of identical definitions [m:primitives.definitions.identical_groups]; 3 Badge definitions [m:primitives.badge.definitions.total]; 13 of 53 other component files have no importer [m:reachability.components.other.no_importer] [m:reachability.components.other.total] |
| 2 | Captured rationale | 9 | 6 | 6 | 12 | token records cover 0.0103 of the custom properties [m:docs.coverage.token_records_per_custom_property]; newest ADR 116 days before HEAD [m:decisions.adr.newest_age_days]; 0 of 2 keyed records match [m:docs.token_records.matches] [m:docs.token_records.keyed]; an oklch claim without a declaration [m:docs.oklch.docs_claim_without_declaration] and 1 generator output missing [m:decisions.design_md.generator_outputs_missing] |
| 3 | Codified rules | 9 | 7 | 7 | 11 | no type-size rule [m:guardrails.rules.type_size]; no spacing-scale rule [m:guardrails.rules.spacing_scale]; no design/tokens.css [m:docs.spine.tokens_css] |
| 4 | Token discipline | 8 | 5 | 5 | 11 | 247 arbitrary font-size class matches outside the exempt files [m:typography.arbitrary_size.matches!] and 208 named ones [m:typography.named_size.matches!], all off-token because the theme maps no font-size name [m:tokens.theme.maps_font_size#names]; 9 --font-size-* tokens with no consumer [m:tokens.font_size.unconsumed]; 10 --space-* tokens with no consumer [m:tokens.space.unconsumed] and the theme maps no spacing name [m:tokens.theme.maps_space#names] |
| 5 | Drift control | 7 | 4.5 | 5 | 9 | 10 [r:dirty_colour_files] of 193 [m:colour.scanner.files_audited] audited files hold a raw colour literal; 1 snapshot day [m:habit.snapshots.distinct_days]; no CI step [m:habit.workflows.drift_noncomment_lines]; newest snapshot 97 days old [m:habit.snapshots.last_age_days]; the script cannot fail a build [m:habit.drift_script.exits_nonzero] |
Satisfied (not ranked): Agent legibility, satisfaction 6 [r:sat.agent_legibility] against importance 6 [r:importance]
Tied for the top: Component consistency and Captured rationale (opportunity 13 [r:opp.component_consistency] and 12 [r:opp.captured_rationale], within 1)
Most underserved: none named: the gap to the next is 1 [r:gap], 2 are needed
Tie break: Codified rules (rank 3) and Token discipline (rank 4) both have opportunity 11 [r:opp.codified_rules]; importance decides
Arithmetic: 6 + 7 + 5 + 3 + 5 + 6 = 32; 32 × 10 / 6 = 53.33; rounded half up = 53 [r:overall]

## Inputs from the other audits (mapped, not sibling scores)
| Input | Value | Feeds | How |
|---|---|---|---|
| /systemix:drift-report drift_control | 94.82 [r:value.drift_control.drift_control_score] (published 95 [r:drift_control]) | Drift control, item drift_control_score: 3 / 5 [r:pts.drift_control.drift_control_score] | same measure, banded on the exact value |
| /systemix:design-audit components | 49.25 [r:value.component_consistency.canonical_reuse] (published 49 [r:components]) | Component consistency, item canonical_reuse: 1 / 5 [r:pts.component_consistency.canonical_reuse] | same measure, banded on the exact value |
| /systemix:design-audit tokens | 73 [r:tokens] | Token discipline: context | colour literals are drift control's; not a score input |
| /systemix:design-audit density, health | 75 [r:density], 66 [r:health] | none | not inputs; for reference |

## Top opportunities   (one entry per ranked dimension, in rank order, never merged; the wording is yours, so each is tagged [j])
1. Component consistency [j] — one Badge, one Button, one Input: point the 8 `<Badge>` matches that render a local copy at the components/ui Badge [m:primitives.badge.resolved.to_local_definition] and replace the 25 raw `<button>` matches [m:primitives.button.raw.outside_ui] and the 1 raw `<input>` match [m:primitives.input.raw.outside_ui] outside components/ui with the components/ui Button and Input; merge the 1 group of identical definitions [m:primitives.definitions.identical_groups] and the 3 Badge definitions [m:primitives.badge.definitions.total]; 13 other component files that nothing imports are candidates to delete or wire in [m:reachability.components.other.no_importer].
2. Captured rationale [j] — the rationale exists but is not tied to the code: write token records for more of the custom properties, which they cover at 0.0103 [m:docs.coverage.token_records_per_custom_property], and refresh the keyed ones (0 [m:docs.token_records.matches] of 2 [m:docs.token_records.keyed] match); write one ADR, the newest being 116 days old [m:decisions.adr.newest_age_days]; correct the oklch claim that has no declaration [m:docs.oklch.docs_claim_without_declaration] and restore the 1 missing generator output [m:decisions.design_md.generator_outputs_missing].
3. Codified rules [j] — three drift classes have no rule, so they are unruled drift: font sizes (247 class matches outside the exempt files [m:typography.arbitrary_size.matches!], no type-size rule [m:guardrails.rules.type_size]), spacing (3 raw class matches [m:scale.spacing_arbitrary.length_literal_matches!], no spacing-scale rule [m:guardrails.rules.spacing_scale]), radii (3 uses [m:scale.radius.hardcoded_uses!], no counter reads a radius rule); propose the rules (a proposal for approval, nothing written). There is no design/tokens.css [m:docs.spine.tokens_css] (spine 2 of 6 [m:docs.spine.members_present]) but a token source resolves: propose `design.source: src/app/globals.css` in systemix.config.yaml, not a second token file.
4. Token discipline [j] — the theme maps no font-size name [m:tokens.theme.maps_font_size#names], so the 208 named font-size class matches outside the exempt files count as off-token [m:typography.named_size.matches!]: map the type scale in @theme; wire the 9 --font-size-* tokens [m:tokens.font_size.unconsumed] and the 10 --space-* tokens [m:tokens.space.unconsumed] that nothing uses.
5. Drift control [j] — point the 10 audited files that hold a raw colour literal [r:dirty_colour_files] at the tokens; keep a snapshot history (1 snapshot day exists [m:habit.snapshots.distinct_days], the newest is 97 days old [m:habit.snapshots.last_age_days]): taking a snapshot is the operator's call, this audit writes none; no workflow step runs the drift script [m:habit.workflows.drift_noncomment_lines], so add one; the script cannot fail a build [m:habit.drift_script.exits_nonzero], so make it exit non-zero.

## Recommended setup   (class: mature [r:setup_class] → systemix init — you confirm each)
   triggered by: token source found (1 [m:tokens.source.found]) · colour 94.82 ≥ 90 [r:tokens.colour] · spacing 98.45 ≥ 90 [r:tokens.spacing] · dirty colour files 10 < 20 [r:dirty_colour_files]
→ design: existing: adopt src/app/globals.css and wire drift-only · signals: PostHog (a posthog dependency is declared [m:legibility.posthog.dependency_declared]) · autonomy: ghost · self-improve: on

---
Validity: Thresholds are conventions chosen for reproducibility, calibrated to nothing yet (there is no benchmark corpus): a score is a pure function of the counters, not a measurement of quality.
Limits: The overall is a rubric score over documentation and code signals, not a readiness measurement: documentation items count structure and length, so filler files can earn them. The docs_need_code cap bounds that only when the code ignores the documents.
Limits: 27 of 60 points read names or files that only a Systemix-style repo has (design/guardrails.mdx, design/DESIGN.md, design/tokens.css, decisions/ and design/decisions/, contract/tokens records, .systemix/drift-history.json, scripts/*drift*, a workflow that mentions drift, slash-named skills): a repo with other conventions loses them whatever its practice, and Captured rationale and Codified rules read nothing else.
Limits: Every share divides by all audited files; adding files with no styling raises it.

## Appendix — How these numbers were made
Captured rationale: 6 points [r:pts.captured_rationale] → satisfaction 6, importance 9, opportunity 12
| Item | Counters = values [m] | Value [r:value] | Band | Points [r:pts] |
|---|---|---|---|---|
| adr_corpus | decisions.adr.headings=22 | 22 | >= 10 | 2 / 2 |
| design_md_sections | decisions.design_md.h2=10 | 10 | >= 5 | 2 / 2 |
| token_record_coverage | docs.coverage.token_records_per_custom_property=0.0103 | 0.0103 | else | 0 / 1 |
| adr_recency | decisions.adr.newest_age_days=116 | 116 | <= 180 | 1 / 2 |
| token_record_currency | docs.token_records.matches=0, docs.token_records.keyed=2 | 0.0000 | else | 0 / 1 |
| design_md_currency | decisions.design_md.colors_equal_light=0, decisions.design_md.colors_equal_dark=10, decisions.design_md.front_matter_colors=10 | 1.0000 | >= 0.9 | 1 / 1 |
| no_contradictions | docs.oklch.docs_claim_without_declaration=1, decisions.design_md.generator_outputs_missing=1 | 2 | else | 0 / 1 |
Limit: Documentation items count structure and length, not truth: a file of filler can earn them, which is why the docs_need_code cap exists. Every item reads a Systemix-style path: decisions/ and design/decisions/ (the ADR items), design/DESIGN.md or a root DESIGN.md (the DESIGN.md items), contract/tokens records (the two token-record items); a repo that keeps its rationale elsewhere scores 0 here whatever its practice.
Codified rules: 7 points [r:pts.codified_rules] → satisfaction 7, importance 9, opportunity 11
| Item | Counters = values [m] | Value [r:value] | Band | Points [r:pts] |
|---|---|---|---|---|
| guardrails_file | guardrails.file.lines=52 | 52 | >= 20 | 2 / 2 |
| rule_count | guardrails.structure.rule_bullets=12 | 12 | >= 8 | 2 / 2 |
| starred_rules | guardrails.structure.starred_rules=2 | 2 | >= 1 | 0.5 / 0.5 |
| type_size_rule | guardrails.rules.type_size=0 | 0 | else | 0 / 1 |
| spacing_scale_rule | guardrails.rules.spacing_scale=0 | 0 | else | 0 / 1 |
| sections | guardrails.structure.h2_sections=5 | 5 | >= 3 | 1 / 1 |
| contrast_checked | guardrails.contrast.pairs_below_4_5=0 | 0 | == 0 | 1.5 / 1.5 |
| tokens_css | docs.spine.tokens_css=0 | 0 | else | 0 / 1 |
Limit: Items count the structure and vocabulary of design/guardrails.mdx (lines, bullets, sections, words) and the existence of design/tokens.css, not whether the rules are sound or followed. A repo that keeps its rules elsewhere (CLAUDE.md, a lint config) scores 0 here whatever its practice.
Token discipline: 5 points [r:pts.token_discipline] → satisfaction 5, importance 8, opportunity 11
| Item | Counters = values [m] | Value [r:value] | Band | Points [r:pts] |
|---|---|---|---|---|
| token_source | tokens.source.found=1 | 1 | true | 1 / 1 |
| palette_classes | colour.palette_class.matches=0, colour.palette_class.extra_matches=0, census.files.audited=193 | 0.0000 | == 0 | 2 / 2 |
| font_size_off_token | typography.arbitrary_size.matches_excluding_exempt=247, typography.named_size.matches#exempt.excludingExemptFiles=208, mapped named sizes (typography.named_size.matches#byClass listed in tokens.theme.maps_font_size#names)=0 → (247 + 208) / (247 + 208) | 1.0000 | else | 0 / 3 |
| type_scale_wired | tokens.font_size.unconsumed=9, tokens.text.unconsumed=0, tokens.theme.maps_font_size#names=0 entries; declared tokens.font_size.unconsumed#declared=9, tokens.text.unconsumed#declared=0 → 9 / 9 | 1.0000 | else | 0 / 1 |
| spacing_literals | scale.spacing_arbitrary.length_literal_matches#exempt.excludingExemptFiles=3, census.files.audited=193 | 0.0155 | <= 0.02 | 1 / 1 |
| spacing_scale_wired | tokens.space.unconsumed=10, tokens.theme.maps_space#names=0 entries; declared tokens.space.unconsumed#declared=10 → 10 / 10 | 1.0000 | else | 0 / 1 |
| radius_share | scale.radius.hardcoded_uses#exempt.excludingExemptFiles=3, scale.radius.named_classes#exempt.excludingExemptFiles=178, scale.radius.var_uses#exempt.excludingExemptFiles=11 → 3 / 192 | 0.0156 | <= 0.05 | 1 / 1 |
Limit: A missing token source zeroes token_source and both wiring items together (3 of 10 points), because wiring is measured against the source; renormalising instead would raise the score when the token file is deleted. A named size such as text-sm counts as on-token only when the theme maps that very name, in both this dimension and design-audit tokens.type. Font-size, spacing, palette and radius items read Tailwind class spellings and are not rated without a Tailwind vocabulary; a token reached only through var() outside the --font-size-*, --text-* and --space-* families is invisible here. When a measure has nothing to count (no font-size utilities, no radius utilities) it earns full points, but only where styling code exists. type_scale_wired and spacing_scale_wired subtract the number of names the theme maps from the number of tokens with no var() consumer without intersecting the two lists (the language has no set operator): a mapped token that is also consumed hides a token that is really unwired, so the two items can over-award.
Component consistency: 2.5 points [r:pts.component_consistency] → satisfaction 3, importance 8, opportunity 13
| Item | Counters = values [m] | Value [r:value] | Band | Points [r:pts] |
|---|---|---|---|---|
| canonical_reuse | canonical primitives.button.resolved.to_ui_definition=22, primitives.badge.resolved.to_ui_definition=3, primitives.card.resolved.to_ui_definition=1, primitives.input.resolved.to_ui_definition=7 (33; #to_package=0, #to_other_file=0); local primitives.badge.resolved.to_local_definition=8, the other three 0; raw primitives.button.raw.outside_ui=25, primitives.input.raw.outside_ui=1; duplicate-definition matches 0 → 33 / 67 | 49.25 | >= 30 | 1 / 5 |
| identical_definitions | primitives.definitions.identical_groups=1 | 1 | <= 2 | 0.5 / 1 |
| single_definitions | primitives.button.definitions.total=1, primitives.badge.definitions.total=3, primitives.card.definitions.total=1, primitives.input.definitions.total=1 → max 3 | 3 | else | 0 / 1 |
| dead_components | reachability.components.other.no_importer=13, reachability.components.other.total=53 | 0.2453 | <= 0.3 | 1 / 3 |
Limit: A canonical tag renders the components/ui definition, a package, or the only definition of its name in the project; Button, Badge, Card and Input are the only primitives. The ratio weighs every tag the same and needs 5 tags before it is rated. Live reuse (canonical users that no file imports) is a report line, not an item: it overlaps dead_components. dead_components is not rated (0 points) when no component file outside components/ui is seen, because a layout that keeps components elsewhere (src/features/) is invisible to the counter.
Drift control: 4.5 points [r:pts.drift_control] → satisfaction 5, importance 7, opportunity 9
| Item | Counters = values [m] | Value [r:value] | Band | Points [r:pts] |
|---|---|---|---|---|
| drift_control_score | dirty files = min(colour.scanner.files_with_colour_hits=10, colour.scanner.colour_hits=114 minus var() calls 0) = 10; colour.scanner.files_audited=193 → (193 − 10) × 100 / 193 | 94.82 | >= 90 | 3 / 5 |
| script_exists | habit.scripts.drift_files=1, habit.npm_scripts.drift=0 | 1 | >= 1 | 1 / 1 |
| history_recurring | habit.snapshots.distinct_days=1 | 1 | >= 1 | 0.5 / 1 |
| ci_wired | habit.workflows.drift_noncomment_lines=0 | 0 | else | 0 / 1 |
| recent_snapshot | habit.snapshots.last_age_days=97 | 97 | else | 0 / 1 |
| can_fail_build | habit.drift_script.exits_nonzero=0 | 0 | else | 0 / 1 |
Limit: Five of the ten points read Systemix drift tooling (.systemix/drift-history.json, scripts/*drift*, a workflow that mentions drift, a script that exits non-zero): a repo without those names cannot exceed 5 here, whatever its practice.
Agent legibility: 5.5 points [r:pts.agent_legibility] → satisfaction 6, importance 6, opportunity 6 (satisfied)
| Item | Counters = values [m] | Value [r:value] | Band | Points [r:pts] |
|---|---|---|---|---|
| instruction_file | legibility.instructions.present=1 | 1 | >= 1 | 2 / 2 |
| substance | legibility.claude_md.lines=67, legibility.agents_md.lines=0, legibility.cursor_rules.lines=0, legibility.copilot_instructions.lines=0 | 67 | >= 30 | 1.5 / 1.5 |
| guardrails_pointer | legibility.guardrails.files_mentioning=1 | 1 | >= 1 | 0.5 / 0.5 |
| pointers_resolve | legibility.path_refs.resolved=15, legibility.path_refs.distinct=18 | 0.8333 | >= 0.8 | 1 / 2 |
| no_machine_paths | legibility.machine_paths.matches=2 | 2 | else | 0 / 1 |
| fresh_status | legibility.freshness.status_heading_age_days=96 | 96 | <= 120 | 0.5 / 1 |
| skills_installed | legibility.skills.named_installed=1, legibility.skills.named_with_skill_md_in_repo=11 | 0.0909 | else | 0 / 2 |
Limit: The instruction items count length, headings and pointers, not whether the instructions are right. guardrails_pointer is worth 0.5 because the counter only sees a mention of the word, not an instruction to read the guardrails before UI work.
Gates that failed: none
Near-threshold awards (a counter within 1 unit of an edge)
| Item | One-unit move | Points [r:pts] |
|---|---|---|
| token_record_currency | +1 docs.token_records.matches | 0 → 0.5 |
| no_contradictions | −1 decisions.design_md.generator_outputs_missing | 0 → 0.5 |
| contrast_checked | +1 guardrails.contrast.pairs_below_4_5 | 1.5 → 0 |
| palette_classes | +1 colour.palette_class.matches, colour.palette_class.extra_matches | 2 → 1 |
| spacing_literals | +1 scale.spacing_arbitrary.length_literal_matches | 1 → 0.5 |
| canonical_reuse | +1 primitives.<p>.resolved.to_ui_definition, or −1 primitives.badge.resolved.to_local_definition, primitives.button.raw.outside_ui, primitives.input.raw.outside_ui | 1 → 2 |
| identical_definitions | −1 primitives.definitions.identical_groups | 0.5 → 1 |
| single_definitions | −1 primitives.badge.definitions.total | 0 → 0.5 |
| drift_control_score | −1 colour.scanner.files_with_colour_hits | 3 → 4 |
| script_exists | −1 habit.scripts.drift_files | 1 → 0 |
| history_recurring | +1 or −1 habit.snapshots.distinct_days | 0.5 → 1, or 0.5 → 0 |
| ci_wired | +1 habit.workflows.drift_noncomment_lines | 0 → 1 |
| instruction_file | −1 legibility.instructions.present | 2 → 0 |
| guardrails_pointer | −1 legibility.guardrails.files_mentioning | 0.5 → 0 |
| pointers_resolve | −1 legibility.path_refs.resolved, or +1 legibility.path_refs.distinct | 1 → 0 |
| no_machine_paths | −1 legibility.machine_paths.matches | 0 → 0.5 |
Rounding edges: Component consistency ends in .5 (2.5 points), half a point lower gives satisfaction 2, not 3 [r:sat.component_consistency]
Rounding edges: Drift control ends in .5 (4.5 points), half a point lower gives satisfaction 4, not 5 [r:sat.drift_control]
Rounding edges: Agent legibility ends in .5 (5.5 points), half a point lower gives satisfaction 5, not 6 [r:sat.agent_legibility]
Cap edges: none
Counters missing or null: none missing, none null; docs.spine.tokens_css=0 (no design/tokens.css): 1 point in Codified rules, deducted once.
```
