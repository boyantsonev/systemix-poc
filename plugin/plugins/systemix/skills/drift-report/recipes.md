# Recipes — /systemix:drift-report

Part of the drift-report skill. Copy, run, paste the numbers.

The recipes below spell `<counters>` as `/tmp/audit-counters.json` and the scan's file as `/tmp/drift-scan.json`. Every counter, one
line each (id, unit, value; about 15 KB), and the header fields:
```
jq -r '.counters[] | [.id, .unit, (.value | tostring)] | @tsv' /tmp/audit-counters.json
jq '{countersVersion, schema, repo, slice, skipped: .groups.skipped, scope: (.scope | {dirs, missingDirs, rejectedDirs, skippedDirs, tokenSource, population}), warnings}' /tmp/audit-counters.json
```
The scan next to the counters it must equal:
```
jq '{ok, error, dryRun, snapshotWritten, snapshotNumber, critical, warnings, filesWithDrift, componentsAudited, score, scoreFormula, dirs, skipped}' /tmp/drift-scan.json
jq -r '.counters[] | select(.id | test("^colour[.]scanner[.]")) | [.id, .unit, (.value | tostring)] | @tsv' /tmp/audit-counters.json
```
Drift control with its derived values (the gate and the coverage floor are Step 0's, not this recipe's):
```
jq '. as $r | def c($id): [$r.counters[] | select(.id == $id)][0];
  ([c("colour.rgb_fn.outside_token_source"), c("colour.hsl_fn.outside_token_source"), c("colour.oklch_fn.outside_token_source")] | map(.detail.withVarArgument) | add) as $var
  | c("colour.scanner.colour_hits").value as $hits | c("colour.scanner.files_with_colour_hits").value as $files | c("colour.scanner.files_audited").value as $aud
  | ([$hits - $var, 0] | max) as $literal | ([$files, $literal] | min) as $dirty
  | { var_colour_hits: $var, literal_colour_hits: $literal, dirty_colour_files: $dirty, files_audited: $aud,
      drift_control: (if $aud > 0 then ([[($aud - $dirty) * 100 / $aud, 0] | max, 100] | min) else null end) }
  | .published = (if .drift_control == null then null else (.drift_control + 0.5 + 1e-9 | floor) end)' /tmp/audit-counters.json
```
One counter with its detail and its worst files, and the rules of the guardrails file:
```
jq '.counters[] | select(.id == "colour.hex_scanner.not_token") | {value, unit, detail, notes, perFile: .perFile[:10]}' /tmp/audit-counters.json
jq '.counters[] | select(.id == "guardrails.structure.rule_bullets") | .detail.rules' /tmp/audit-counters.json
```
**Severity**: the recipe in `/systemix:design-audit`'s `recipes.md` (folder `../design-audit/`), unchanged, run on `/tmp/audit-counters.json`.
**Locator** (file:line:text for the examples; a locator is not a count and carries no tag). Run it from the audited
root. It reads the file names out of that counter's `perFile` rows itself (the first `n`, default 3), so no repo-controlled
name is ever pasted into a shell line, and it prints every regex match of the counter's own regex, not only the ones the
counter classed:
```
node -e 'const fs=require("fs"),[,r,id,n]=process.argv;const k=JSON.parse(fs.readFileSync(r)).counters.find(c=>c.id===id),d=k.definition;for(const {file} of (k.perFile||[]).slice(0,+n||3))try{fs.readFileSync(file,"utf8").split("\n").forEach((l,i)=>{for(const x of d.regexes||[d])for(const m of l.matchAll(new RegExp(x.regex,x.flags.includes("g")?x.flags:x.flags+"g")))console.log(`${file}:${i+1}:${m[0]}`)})}catch{}' /tmp/audit-counters.json colour.hex_scanner.equals_token 3
```
