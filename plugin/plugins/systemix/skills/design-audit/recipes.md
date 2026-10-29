# Recipes — /systemix:design-audit

Part of the design-audit skill. Copy, run, paste the numbers.

The recipes below spell `<counters>` as `/tmp/audit-counters.json`. Every counter, one line each (id, unit, value; about 15 KB):
```
jq -r '.counters[] | [.id, .unit, (.value | tostring)] | @tsv' /tmp/audit-counters.json
```
The header fields, and one counter with its detail and its worst files:
```
jq 'del(.counters)' /tmp/audit-counters.json
jq '.counters[] | select(.id == "colour.hex_scanner.not_token") | {value, unit, detail, notes, perFile: .perFile[:10]}' /tmp/audit-counters.json
```
**Severity** (Stage 2): one call classifies the per-file rows of the seven counters of the block's `severity`.
```
jq -c '
def words: split("/") | map(gsub("(?<a>[a-z0-9])(?<b>[A-Z])"; "\(.a) \(.b)") | gsub("(?<a>[A-Z]+)(?<b>[A-Z][a-z])"; "\(.a) \(.b)") | [splits("[-_. ]+")] | map(select(. != "") | ascii_downcase)) | add // [];
def info: if test("(^|/)components/ui/"; "i") then "vendored_ui"
  elif (words | any(. == "brand" or . == "brands")) then "brand_data"
  elif (words | any(. == "logo" or . == "logos")) then "official_logo" else null end;
. as $r | def c($id): [$r.counters[] | select(.id == $id)][0];
c("typography.exempt.files") as $x | c("census.files.audited").value as $aud
| (if $aud > 0 and ($x.value / $aud) <= 0.1 then ($x.detail.files // []) else [] end) as $exempt
| [ ["colour","critical","colour.hex_scanner.equals_token"], ["type","critical","typography.arbitrary_size.equals_token"],
    ["colour","warning","colour.hex_scanner.not_token"], ["colour","warning","colour.rgb_fn.outside_token_source"],
    ["colour","warning","colour.hsl_fn.outside_token_source"], ["colour","warning","colour.oklch_fn.outside_token_source"],
    ["type","warning","typography.arbitrary_size.not_token"] ] as $sev
| [ $sev[] | . as [$fam, $cls, $id] | c($id) as $k
    | (($k.perFile // [])[] | {family: $fam, file, count,
        class: (if (.file | IN($exempt[])) then "exempt" elif (.file | info) then "info" else $cls end), rule: (.file | info)}),
      {family: $fam, file: "(rows cut)", count: ($k.value - (($k.perFile // []) | map(.count) | add // 0)), class: $cls, rule: null} ] as $rows
| def tot($k): [$rows[] | select(.class == $k) | .count] | add // 0;
  { critical: tot("critical"), warning: tot("warning"), info: tot("info"), exempt: tot("exempt"),
    by: [$rows | group_by([.family, .class, .rule])[] | {family: .[0].family, class: .[0].class, rule: .[0].rule, hits: (map(.count) | add)} | select(.hits > 0)],
    incomplete: [$sev[] | c(.[2]) | select(.value > 0 and (.perFile == null or .perFileOmitted != null)) | .id],
    colour_check: [c("colour.scanner.colour_hits").value, ([c("colour.hex_scanner.outside_token_source", "colour.rgb_fn.outside_token_source", "colour.hsl_fn.outside_token_source", "colour.oklch_fn.outside_token_source").value] | add)],
    files: [$rows | group_by([.file, .class])[] | {file: .[0].file, class: .[0].class, hits: (map(.count) | add)} | select(.hits > 0)] | sort_by(-.hits) | .[:12] }
' /tmp/audit-counters.json
```
**Locator** (`file:line:text` for the examples; a locator is not a count and carries no tag). Run it from the audited
root. It reads the file names out of that counter's `perFile` rows itself (the first `n`, default 3), so no repo-controlled
name is ever pasted into a shell line, and it runs the counter's own regex over them. It prints every regex match, not
only the ones the counter classed:
```
node -e 'const fs=require("fs"),[,r,id,n]=process.argv;const k=JSON.parse(fs.readFileSync(r)).counters.find(c=>c.id===id),d=k.definition;for(const {file} of (k.perFile||[]).slice(0,+n||3))try{fs.readFileSync(file,"utf8").split("\n").forEach((l,i)=>{for(const x of d.regexes||[d])for(const m of l.matchAll(new RegExp(x.regex,x.flags.includes("g")?x.flags:x.flags+"g")))console.log(`${file}:${i+1}:${m[0]}`)})}catch{}' /tmp/audit-counters.json colour.hex_scanner.equals_token 3
```
