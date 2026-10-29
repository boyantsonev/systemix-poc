"use strict";

/**
 * decisions.js — facts about the decision records (ADRs) and the DESIGN.md that
 * carries the design system's identity. Text parsing only; whether an ADR is
 * stale, or DESIGN.md hand-maintained, is for a reader to judge.
 *
 * Which files. Decision records = markdown files (.md .mdx .markdown) under
 * decisions/ and design/decisions/. DESIGN.md = design/DESIGN.md, else a root
 * DESIGN.md (the path is in each counter's detail). A repo with neither reports 0 /
 * false / null and a note.
 *
 * Text rules (pinned):
 *   • an ADR heading is a line `## ADR-…` outside fenced code blocks and outside front matter
 *   • an ADR section runs from its heading to the next heading of level 1 or 2
 *   • a status line is `Status: x` (optionally `**Status:** x`, `- Status: x`, `> Status: x`)
 *     inside an ADR section; its word is the first alphabetic token, upper-cased
 *   • an ADR's date is the first `Date: YYYY-MM-DD` line in its section (a real calendar date)
 *   • "mentions" are case-insensitive substring matches over the whole section text, code
 *     fences included (a raw grep would see them): `guardrails`; `TVA|rebrand|Amber Mainframe`;
 *     the word `oklch`
 *   • lines = `wc -l`; bytes = UTF-8 size of the text as read (BOM stripped, CRLF read as LF)
 *   • ages are calendar days between UTC dates, measured to the HEAD commit date (never to
 *     today), the same rule habit.* uses
 *   • DESIGN.md colours: each entry under front-matter `colors:` is compared with the custom
 *     property `--<name>` (then `--color-<name>`) of the token source in one theme, as a string
 *     after normValue (whitespace collapsed, hex lower-cased and 3→6 expanded, `var(--x)`
 *     followed). "dark" = the .dark / [data-theme=dark] / prefers-color-scheme: dark block,
 *     falling back to the value :root gives it when the block does not redeclare it; "light" =
 *     :root. A name with no such property is "missing", not a mismatch.
 *   • a generator script = a direct child of scripts/ that calls writeFile/writeFileSync with a
 *     path that resolves, by reading its text, to a file called DESIGN.md. Nothing is run. A path
 *     resolves when it is join()/resolve() of `__dirname`, `process.cwd()` (read as the repo root:
 *     scripts run from there) or an identifier whose own `const x = join(...)` declaration in the
 *     same file resolves, followed by plain string literals; or a plain string literal. Anything
 *     else (an identifier with no declaration, an argv value, a `${…}` template, an absolute or
 *     out-of-repo path) is UNRESOLVED: it is never guessed to be the repo root, never looked up on
 *     the auditor's disk, and a script whose only DESIGN.md writes are unresolved is not a
 *     generator (the count of such scripts is in the note).
 *   • ADR ids are the digits after `## ADR-`; an id above Number.MAX_SAFE_INTEGER is not a usable
 *     number and is left out of the id counters (a note counts them). id_gaps is arithmetic —
 *     id_max minus the distinct ids in 1..id_max — never a loop over the range, so an id that is a
 *     date or a timestamp costs nothing.
 *   • a file over the 5 MB read cap reads as empty (ctx.read warns): every counter that depends on
 *     one says so in its notes instead of reporting a bare 0 or blaming the layout.
 *
 * Counter ids (API — keep stable):
 *   decisions.files.count | .lines | .bytes | .guardrails_mentions
 *   decisions.adr.headings | .status_lines | .without_status | .dated | .without_date
 *   decisions.adr.first_date | .last_date | .newest_age_days
 *   decisions.adr.id_max | .id_duplicates | .id_gaps
 *   decisions.adr.mentioning_guardrails | .mentioning_rebrand | .mentioning_oklch
 *   decisions.design_md.exists | .lines | .bytes | .h2 | .front_matter | .front_matter_colors
 *   decisions.design_md.colors_equal_dark | .colors_mismatch_dark | .colors_missing_dark
 *   decisions.design_md.colors_equal_light | .colors_mismatch_light | .colors_missing_light
 *   decisions.design_md.generator_scripts | .generator_outputs_missing | .generator_output_exists
 */

const path = require("path");
const { counter } = require("./counter");
const { DAY_MS, capNotes, isoDay, isoToMs, joinNotes, repoRelativePath, sortedByKey, sortedList, utcDay } = require("./util");
const { H2_RE, adrFiles, designColors, designMdPath, scanMarkdown } = require("./markdown");
const { normValue, themeColor, tokenThemes } = require("./css");

const GROUP = "decisions";
const POSIX = path.posix;
const ROW_CAP = 100;

const ADR_HEADING_RE = /^## ADR-/;
const ADR_ID_RE = /^## ADR-(\d+)/;
// [^\n]* rather than .*: a lone \r or U+2028 stops `.`, and the closing `$` then fails after every backtrack step
const STATUS_RE = /^[ \t>*_-]*status[*_]*[ \t]*:[*_]*([^\n]*)$/i;
const DATE_RE = /^[ \t>*_-]*date[*_]*[ \t]*:[*_]*[ \t]*(\d{4})-(\d{2})-(\d{2})(?!\d)/i;
const SECTION_END_RE = /^#{1,2}[ \t]/;
const GUARDRAILS_RE = /guardrails/gi;
const REBRAND_RE = /\bTVA\b|re-?brand|Amber Mainframe/gi;
const OKLCH_RE = /\boklch\b/gi;
const SCRIPT_EXTS = [".ts", ".js", ".mjs", ".cjs", ".mts", ".cts"];
const WRITE_RE = /\bwriteFile(?:Sync)?\s*\(\s*(?:(?:path\.)?(?:join|resolve)\s*\(((?:[^()]|\(\))*)\)|([A-Za-z_$][\w$]*)|(["'`])([^"'`\n]+)\3)/g;
// `const x = join(a, b)` / `= process.cwd()` / `= __dirname`, ending the statement
const DECL_RE = /\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*(?::[^=\n]{1,60})?=\s*(?:(?:path\.)?(?:join|resolve)\s*\(((?:[^()]|\(\))*)\)|(process\.cwd\(\))|(__dirname)\b)(?=[ \t]*(?:;|\r?\n|$))/g;
const MAX_REF_DEPTH = 4;


/** Real calendar date → UTC day number, else null. */
function dayNumber(y, m, d) {
  if (m < 1 || m > 12 || d < 1 || d > new Date(Date.UTC(y, m, 0)).getUTCDate()) return null;
  return Math.floor(Date.UTC(y, m - 1, d) / DAY_MS);
}

const isoOfDay = (dayNo) => isoDay(dayNo * DAY_MS);

// ── ADR sections ────────────────────────────────────────────────────────────

/** Every ADR section of every file → [{file, line, heading, id, statuses, date, dayNo, text}]. */
function adrSections(ctx, files) {
  const sections = [];
  for (const f of files) {
    const md = scanMarkdown(ctx.read(f));
    let cur = null;
    const close = () => { if (cur) { cur.text = cur.parts.join("\n"); delete cur.parts; sections.push(cur); } cur = null; };
    for (const l of md.lines) {
      if (!l.fenced && SECTION_END_RE.test(l.text)) {
        close();
        if (ADR_HEADING_RE.test(l.text)) {
          const idm = ADR_ID_RE.exec(l.text);
          const n = idm ? Number(idm[1]) : null;
          const usable = n !== null && Number.isSafeInteger(n);
          cur = { file: f.rel, line: l.n, heading: l.text.slice(3).trim(), id: usable ? n : null, idTooLarge: n !== null && !usable, statuses: [], date: null, dayNo: null, invalidDate: false, parts: [l.text] };
        }
        continue;
      }
      if (!cur) continue;
      cur.parts.push(l.text);
      if (l.fenced) continue;
      const st = STATUS_RE.exec(l.text);
      if (st && st[1].trim()) cur.statuses.push(st[1].trim());
      if (!cur.date && !cur.invalidDate) {
        const dm = DATE_RE.exec(l.text);
        if (dm) {
          const n = dayNumber(Number(dm[1]), Number(dm[2]), Number(dm[3]));
          if (n === null) cur.invalidDate = true;
          else { cur.date = `${dm[1]}-${dm[2]}-${dm[3]}`; cur.dayNo = n; }
        }
      }
    }
    close();
  }
  return sections;
}

const idLabel = (s) => (s.id === null ? s.heading.split(":")[0] : `ADR-${String(s.id).padStart(3, "0")}`);

// ── generator scripts ───────────────────────────────────────────────────────

function splitArgs(args) {
  return [...args.matchAll(/\s*("[^"\n]*"|'[^'\n]*'|`[^`\n]*`|[^,]+?)\s*(?:,|$)/g)].map((m) => m[1].trim()).filter(Boolean);
}

/**
 * name → how that identifier is declared in the script; one pass over the text. An identifier
 * declared twice with different values (two scopes) is "ambiguous" and resolves to nothing.
 */
function declarations(text) {
  const decls = new Map();
  for (const m of text.matchAll(DECL_RE)) {
    const d = m[2] !== undefined ? { kind: "join", args: m[2] } : m[3] !== undefined ? { kind: "cwd" } : { kind: "dirname" };
    const seen = decls.get(m[1]);
    if (!seen) decls.set(m[1], d);
    else if (seen.kind !== d.kind || seen.args !== d.args) decls.set(m[1], { kind: "ambiguous" });
  }
  return decls;
}

/** Directory (repo-relative, "" or "." = the repo root) an identifier or expression stands for, or null. */
function baseOf(first, decls, scriptRel, depth) {
  if (first === "__dirname") return POSIX.dirname(scriptRel);
  if (first === "process.cwd()") return "";
  const d = /^[A-Za-z_$][\w$]*$/.test(first) ? decls.get(first) : undefined;
  if (!d || depth >= MAX_REF_DEPTH) return null;
  if (d.kind === "cwd") return "";
  if (d.kind === "dirname") return POSIX.dirname(scriptRel);
  if (d.kind === "ambiguous") return null;
  return resolveArgs(d.args, decls, scriptRel, depth + 1);
}

/** `join(ROOT, "a", "b.md")` arguments → normalised repo-relative posix path ("." = the root), or null when not resolvable. */
function resolveArgs(argText, decls, scriptRel, depth = 0) {
  if (argText.length > 500) return null;
  const args = splitArgs(argText);
  if (!args.length) return null;
  const baseDir = baseOf(args[0], decls, scriptRel, depth);
  if (baseDir === null) return null;
  const parts = [];
  for (const a of args.slice(1)) {
    const m = /^(["'`])([^"'`$\n]*)\1$/.exec(a);
    if (!m || POSIX.isAbsolute(m[2])) return null;
    parts.push(m[2]);
  }
  const joined = POSIX.normalize(POSIX.join(baseDir, ...parts));
  return joined === ".." || joined.startsWith("../") || POSIX.isAbsolute(joined) ? null : joined;
}

/** Output paths a script writes with writeFile/writeFileSync, as {output|null, how}; null = unresolved. */
function writeTargets(text, scriptRel) {
  const decls = declarations(text);
  const out = [];
  for (const m of text.matchAll(WRITE_RE)) {
    if (m[1] !== undefined) {
      out.push({ output: resolveArgs(m[1], decls, scriptRel), how: "join()" });
    } else if (m[2] !== undefined) {
      const d = decls.get(m[2]);
      out.push({ output: d && d.kind === "join" ? resolveArgs(d.args, decls, scriptRel) : null, how: `variable ${m[2]}` });
    } else {
      out.push({ output: repoRelativePath(m[4]), how: "string literal" });
    }
  }
  return out;
}

// ── run ─────────────────────────────────────────────────────────────────────

function run(ctx) {
  const out = [];
  const base = { group: GROUP };
  const headMs = isoToMs(ctx.git && ctx.git.commitDate);

  // ── decision records ──
  const files = adrFiles(ctx);
  const texts = files.map((f) => ({ f, text: ctx.read(f) }));
  const sections = adrSections(ctx, files);
  const adrSet = "markdown files under decisions/ and design/decisions/";
  const adrCap = capNotes(ctx, files.map((f) => f.rel));
  const noAdr = files.length ? joinNotes(adrCap) : ["no decision records: neither decisions/ nor design/decisions/ holds a markdown file"];
  const perFile = (rows) => {
    const m = new Map();
    for (const r of rows) m.set(r.file, (m.get(r.file) ?? 0) + 1);
    return m;
  };

  out.push(counter({ ...base, id: "decisions.files.count", kind: "mechanical", unit: "file", value: files.length,
    definition: { summary: "Decision-record files", regex: null, fileSet: adrSet },
    perFile: new Map(files.map((f) => [f.rel, 1])),
    detail: { files: texts.slice(0, ROW_CAP).map(({ f, text }) => ({ file: f.rel, lines: ctx.lineCount(text), bytes: Buffer.byteLength(text, "utf8") })) },
    notes: noAdr }));
  out.push(counter({ ...base, id: "decisions.files.lines", kind: "mechanical", unit: "number", value: texts.reduce((a, t) => a + ctx.lineCount(t.text), 0),
    definition: { summary: "Total lines of the decision-record files (`wc -l` semantics)", regex: null, fileSet: adrSet },
    perFile: new Map(texts.map((t) => [t.f.rel, ctx.lineCount(t.text)])),
    notes: noAdr }));
  out.push(counter({ ...base, id: "decisions.files.bytes", kind: "mechanical", unit: "number", value: texts.reduce((a, t) => a + Buffer.byteLength(t.text, "utf8"), 0),
    definition: { summary: "Total UTF-8 size of the decision-record files as read (BOM stripped, CRLF read as LF)", regex: null, fileSet: adrSet },
    perFile: new Map(texts.map((t) => [t.f.rel, Buffer.byteLength(t.text, "utf8")])),
    notes: [...(noAdr ?? []), "equals `wc -c` unless a file has a BOM or CRLF line endings"] }));
  out.push(counter({ ...base, id: "decisions.files.guardrails_mentions", kind: "mechanical", unit: "match", value: texts.reduce((a, t) => a + ctx.countMatches(t.text, GUARDRAILS_RE), 0),
    definition: { summary: "Case-insensitive occurrences of \"guardrails\" in the decision-record files, anywhere in the file", regex: GUARDRAILS_RE, fileSet: adrSet },
    perFile: new Map(texts.map((t) => [t.f.rel, ctx.countMatches(t.text, GUARDRAILS_RE)])),
    notes: noAdr }));

  const adrDef = (summary, regex = null) => ({ summary, regex, fileSet: `ADR sections of the ${adrSet}` });
  out.push(counter({ ...base, id: "decisions.adr.headings", kind: "mechanical", unit: "line", value: sections.length,
    definition: adrDef("Lines starting `## ADR-` outside fenced code and front matter", ADR_HEADING_RE),
    perFile: perFile(sections),
    notes: joinNotes(noAdr, files.length > ctx.skippedReads(files.map((f) => f.rel)).length && !sections.length
      ? [`${files.length} decision file(s) found but none has a "## ADR-" heading, so no ADR facts could be read (a one-file-per-ADR layout with "# ADR …" titles is not recognised)`]
      : []) }));

  const statusRows = sections.flatMap((s) => s.statuses.map((st) => ({ file: s.file, word: ((/^[A-Za-z][A-Za-z-]*/.exec(st) || ["(none)"])[0]).toUpperCase() })));
  const byStatus = new Map();
  for (const r of statusRows) byStatus.set(r.word, (byStatus.get(r.word) ?? 0) + 1);
  out.push(counter({ ...base, id: "decisions.adr.status_lines", kind: "mechanical", unit: "line", value: statusRows.length,
    definition: adrDef("Status lines inside ADR sections; detail.byStatus counts the first word, upper-cased", STATUS_RE),
    perFile: perFile(statusRows),
    detail: { byStatus: sortedByKey(byStatus) },
    notes: noAdr }));
  const noStatus = sections.filter((s) => !s.statuses.length);
  out.push(counter({ ...base, id: "decisions.adr.without_status", kind: "mechanical", unit: "number", value: noStatus.length,
    definition: adrDef("ADR sections with no status line", STATUS_RE),
    detail: { adrs: noStatus.slice(0, ROW_CAP).map(idLabel) },
    notes: noAdr }));

  const dated = sections.filter((s) => s.dayNo !== null);
  const days = dated.map((s) => s.dayNo);
  const first = days.length ? days.reduce((a, b) => Math.min(a, b)) : null;
  const last = days.length ? days.reduce((a, b) => Math.max(a, b)) : null;
  const undated = sections.length - dated.length;
  const dateNotes = [...(noAdr ?? [])];
  const invalid = sections.filter((s) => s.invalidDate).length;
  if (invalid) dateNotes.push(`${invalid} ADR(s) have a Date line that is not a real calendar date and are treated as undated`);
  out.push(counter({ ...base, id: "decisions.adr.dated", kind: "mechanical", unit: "number", value: dated.length,
    definition: adrDef("ADR sections with a `Date: YYYY-MM-DD` line (a real calendar date)", DATE_RE),
    notes: dateNotes.length ? dateNotes : undefined }));
  out.push(counter({ ...base, id: "decisions.adr.without_date", kind: "mechanical", unit: "number", value: undated,
    definition: adrDef("ADR sections with no valid `Date: YYYY-MM-DD` line", DATE_RE),
    detail: { adrs: sections.filter((s) => s.dayNo === null).slice(0, ROW_CAP).map(idLabel) },
    notes: noAdr }));
  for (const [id, value, word] of [["first_date", first, "earliest"], ["last_date", last, "newest"]]) {
    out.push(counter({ ...base, id: `decisions.adr.${id}`, kind: "mechanical", unit: "date", value: value === null ? null : isoOfDay(value),
      definition: adrDef(`The ${word} ADR date`, DATE_RE),
      detail: { adr: value === null ? null : idLabel(dated.find((s) => s.dayNo === value)) },
      notes: value === null ? [...(noAdr ?? []), "no ADR carries a valid date"] : undefined }));
  }
  const ageNotes = [];
  if (last === null) ageNotes.push(...(noAdr ?? ["no ADR carries a valid date"]));
  else if (headMs === null) ageNotes.push("no git history, so there is no HEAD commit date to measure against (today's date is never used)");
  out.push(counter({ ...base, id: "decisions.adr.newest_age_days", kind: "mechanical", unit: "number", value: last !== null && headMs !== null ? utcDay(headMs) - last : null,
    definition: { summary: "Calendar days (UTC dates) from the newest ADR date to the HEAD commit date. Never measured to today", regex: DATE_RE, fileSet: `ADR sections + git HEAD commit date` },
    detail: { newestAdrDate: last === null ? null : isoOfDay(last), headCommitDay: headMs === null ? null : isoOfDay(utcDay(headMs)) },
    notes: ageNotes.length ? ageNotes : undefined }));

  const ids = sections.filter((s) => s.id !== null).map((s) => s.id);
  const distinctIds = new Set(ids);
  const idMax = ids.reduce((a, b) => Math.max(a, b), 0);
  const usedInRange = [...distinctIds].filter((i) => i >= 1).length; // every positive id is <= idMax
  const gaps = idMax - usedInRange;
  const seenIds = new Set();
  const dupSet = new Set();
  for (const id of ids) (seenIds.has(id) ? dupSet : seenIds).add(id);
  const dupIds = sortedList(new Set([...dupSet].map(String)));
  const tooLarge = sections.filter((s) => s.idTooLarge).length;
  const idNotes = [
    ...(tooLarge ? [`${tooLarge} ADR heading(s) have an id above ${Number.MAX_SAFE_INTEGER}, which is not a usable number; they are left out of the id counters`] : []),
  ];
  const gapNotes = idMax > 1000 && idMax > 10 * usedInRange
    ? [`the highest id (${idMax}) is far above the number of distinct ids (${usedInRange}), so the ids look like dates or timestamps rather than a sequence; id_gaps counts every unused integer up to it and is not a count of missing records`]
    : [];
  for (const [id, value, summary, detail, extra] of [
    ["id_max", idMax, "Highest numeric ADR id (`## ADR-<n>`)", {}, idNotes],
    ["id_duplicates", ids.length - distinctIds.size, "ADR headings that repeat an id already used by an earlier heading", { ids: dupIds }, idNotes],
    ["id_gaps", gaps, "Integers between 1 and the highest ADR id that no ADR heading uses (id_max minus the distinct ids in that range)", {}, [...idNotes, ...gapNotes]],
  ]) {
    out.push(counter({ ...base, id: `decisions.adr.${id}`, kind: "mechanical", unit: "number", value,
      definition: adrDef(summary, ADR_ID_RE), detail, notes: joinNotes(noAdr, extra) }));
  }

  for (const [id, re, summary] of [
    ["mentioning_guardrails", GUARDRAILS_RE, "ADR sections that mention \"guardrails\" (case-insensitive substring)"],
    ["mentioning_rebrand", REBRAND_RE, "ADR sections that mention TVA, rebrand/re-brand or Amber Mainframe (case-insensitive)"],
    ["mentioning_oklch", OKLCH_RE, "ADR sections that mention the word oklch (case-insensitive)"],
  ]) {
    const hit = sections.filter((s) => ctx.countMatches(s.text, re) > 0);
    out.push(counter({ ...base, id: `decisions.adr.${id}`, kind: "mechanical", unit: "number", value: hit.length,
      definition: adrDef(summary, re),
      perFile: perFile(hit),
      detail: { adrs: hit.slice(0, ROW_CAP).map(idLabel) },
      notes: noAdr }));
  }

  // ── DESIGN.md ──
  const designRel = designMdPath(ctx);
  const designText = designRel ? ctx.read(designRel) : "";
  const noDesign = designRel ? undefined : ["no design/DESIGN.md and no root DESIGN.md"];
  const fellBack = designRel === "DESIGN.md" ? ["design/DESIGN.md does not exist; the root DESIGN.md was read instead"] : undefined;
  const md = scanMarkdown(designText);
  const designSet = designRel ?? "design/DESIGN.md (else DESIGN.md)";
  const dDef = (summary, regex = null) => ({ summary, regex, fileSet: designSet });
  const dNotes = joinNotes(noDesign ?? fellBack, designRel ? capNotes(ctx, [designRel]) : []);
  out.push(counter({ ...base, id: "decisions.design_md.exists", kind: "presence", unit: "boolean", value: !!designRel,
    definition: dDef("design/DESIGN.md exists, or failing that a root DESIGN.md"),
    detail: { path: designRel },
    notes: dNotes }));
  out.push(counter({ ...base, id: "decisions.design_md.lines", kind: "mechanical", unit: "number", value: ctx.lineCount(designText),
    definition: dDef("Line count (`wc -l` semantics)"), detail: { path: designRel }, notes: dNotes }));
  out.push(counter({ ...base, id: "decisions.design_md.bytes", kind: "mechanical", unit: "number", value: Buffer.byteLength(designText, "utf8"),
    definition: dDef("UTF-8 size of the text as read (BOM stripped, CRLF read as LF)"), detail: { path: designRel },
    notes: [...(dNotes ?? []), "equals `wc -c` unless the file has a BOM or CRLF line endings"] }));
  out.push(counter({ ...base, id: "decisions.design_md.h2", kind: "mechanical", unit: "line", value: md.lines.filter((l) => !l.fenced && H2_RE.test(l.text)).length,
    definition: dDef("Level-2 headings outside front matter and fenced code", H2_RE), singleFile: designRel ?? undefined, detail: { path: designRel }, notes: dNotes }));
  out.push(counter({ ...base, id: "decisions.design_md.front_matter", kind: "presence", unit: "boolean", value: md.front.present,
    definition: dDef("The file opens with a --- front-matter block", "^---[ \\t]*$"), detail: { path: designRel }, notes: dNotes }));

  const dc = designColors(ctx);
  out.push(counter({ ...base, id: "decisions.design_md.front_matter_colors", kind: "mechanical", unit: "number", value: dc.colors.length,
    definition: dDef("Entries directly under `colors:` in the front matter"),
    detail: { path: designRel, names: dc.colors.map((c) => c.name).slice(0, ROW_CAP) },
    notes: dc.colors.length ? dNotes : [...(dNotes ?? []), "no colors: block in the DESIGN.md front matter"] }));

  const themes = tokenThemes(ctx);
  const tokenRel = ctx.tokenSource && ctx.tokenSource.rel;
  const noSource = tokenRel ? capNotes(ctx, [tokenRel]) : ["no token source was resolved, so every colour is reported missing"];
  for (const key of ["dark", "light"]) {
    const rows = dc.colors.map((c) => {
      const prop = themeColor(themes, key, [`--${c.name}`, `--color-${c.name}`]);
      const status = !prop ? "missing" : normValue(c.value) === normValue(prop.value) ? "equal" : "mismatch";
      return { name: c.name, designValue: c.value, property: prop ? prop.name : null, tokenValue: prop ? prop.value : null, inherited: prop ? prop.inherited : false, status };
    });
    const blockDef = key === "dark" ? "the .dark theme (the .dark block, else the value :root gives it)" : "the light theme (:root)";
    for (const status of ["equal", "mismatch", "missing"]) {
      const hit = rows.filter((r) => r.status === status);
      out.push(counter({ ...base, id: `decisions.design_md.colors_${status}_${key}`, kind: "mechanical", unit: "number", value: hit.length,
        definition: dDef(`Front-matter colours whose custom property in ${blockDef} is ${status === "equal" ? "equal to" : status === "mismatch" ? "different from" : "not declared (neither --<name> nor --color-<name>)"} the front-matter value`),
        detail: { path: designRel, tokenSource: ctx.tokenSource ? ctx.tokenSource.rel : null, inheritedFromRoot: hit.filter((r) => r.inherited).length, rows: hit.slice(0, ROW_CAP) },
        notes: [...(dNotes ?? []), ...noSource, ...(dc.colors.length ? [] : ["no front-matter colours to compare"])] }));
    }
  }

  // ── generator scripts ──
  const scripts = ctx.listTree("scripts", { exts: SCRIPT_EXTS }).filter((f) => f.rel.split("/").length === 2);
  const candidates = [];
  for (const f of scripts) {
    const text = ctx.read(f);
    if (!/DESIGN\.md/.test(text) || !/\bwriteFile(?:Sync)?\s*\(/.test(text)) continue;
    const outputs = writeTargets(text, f.rel).filter((t) => t.output && /^design\.md$/i.test(POSIX.basename(t.output)));
    const unique = sortedList(new Set(outputs.map((t) => t.output)));
    candidates.push({
      script: f.rel,
      lines: ctx.lineCount(text),
      outputs: unique.map((o) => ({ output: o, exists: ctx.exists(o) && !ctx.isDirectory(o) })),
    });
  }
  const generators = candidates.filter((c) => c.outputs.length);
  const missingOutputs = generators.reduce((a, c) => a + c.outputs.filter((o) => !o.exists).length, 0);
  const genSet = "direct children of scripts/ with a script extension (.ts .js .mjs .cjs .mts .cts)";
  const genDef = (summary) => ({ summary, regex: WRITE_RE, fileSet: genSet });
  const genNotes = [
    "a text search, never run: a path resolves only from join/resolve of __dirname, process.cwd() (read as the repo root) or an identifier declared in the same file as such a join, plus string literals; anything else is unresolved, never guessed",
    ...(candidates.length > generators.length ? [`${candidates.length - generators.length} script(s) mention DESIGN.md and write a file, but none of the paths they write resolved to a file called DESIGN.md inside the repo`] : []),
    ...capNotes(ctx, scripts.map((f) => f.rel)),
  ];
  out.push(counter({ ...base, id: "decisions.design_md.generator_scripts", kind: "mechanical", unit: "file", value: generators.length,
    definition: genDef("Scripts that write a file called DESIGN.md through writeFile/writeFileSync"),
    perFile: new Map(generators.map((g) => [g.script, 1])),
    detail: { generators: generators.slice(0, ROW_CAP) },
    notes: generators.length ? genNotes : ["no script under scripts/ writes a DESIGN.md", ...genNotes] }));
  out.push(counter({ ...base, id: "decisions.design_md.generator_outputs_missing", kind: "mechanical", unit: "number", value: missingOutputs,
    definition: genDef("DESIGN.md outputs of generator scripts that do not exist in the repo"),
    detail: { missing: generators.flatMap((c) => c.outputs.filter((o) => !o.exists).map((o) => ({ script: c.script, output: o.output }))).slice(0, ROW_CAP) },
    notes: generators.length ? genNotes : ["no generator script to check", ...genNotes] }));
  out.push(counter({ ...base, id: "decisions.design_md.generator_output_exists", kind: "presence", unit: "boolean", value: generators.length > 0 && missingOutputs === 0,
    definition: genDef("True when at least one generator script exists and every DESIGN.md it writes exists (false also when there is no generator script)"),
    notes: generators.length ? genNotes : ["no generator script to check, so false", ...genNotes] }));

  return out;
}

module.exports = { group: GROUP, run };
