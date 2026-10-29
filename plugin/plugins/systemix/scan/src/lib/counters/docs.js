"use strict";

/**
 * docs.js — doc-vs-code presence checks: does the repo's design documentation
 * say what the code does? Facts only (a member exists, a word occurs, two value
 * strings are equal); whether a mismatch matters is for a reader to judge.
 *
 * Every check degrades on a repo without the thing it checks (no design/, no
 * contract/, no decisions/, no token source): the counter reports 0 / false and
 * a note, never an error and never an invented number.
 *
 * Pinned rules:
 *   • "spine" = what `systemix init` vendored into design/ per root CLAUDE.md's
 *     v5 list (DESIGN.md, guardrails.mdx, tokens.css, decisions/, goals/, .state/).
 *     lib/layout.js (v6) scaffolds only three of them under design/ (goals moved
 *     to experiments/, state to .systemix/), so both are reported separately.
 *   • a token record's value is compared with the token source as a string, after
 *     collapsing whitespace, dropping `!important` / a trailing `;` / one pair of
 *     surrounding quotes, and lowercasing + 3→6 / 4→8 digit expanding hex
 *     literals. No unit, colour-space or calc() conversion: `0.5rem` ≠ `8px`,
 *     `oklch(…)` ≠ `#a8511a`. A record "matches" when its value equals ANY value
 *     the token is declared with (:root, .dark, @theme, …).
 *   • "declared" token = a custom property the shared css parser (lib/css-parse.js,
 *     the one tokens.custom_properties.distinct and the token-source resolver use) finds
 *     in the token source, wherever it sits on its line.
 *   • "claims clean" = frontmatter `status` in CLEAN_STATUS, or frontmatter
 *     `drift` in NO_DRIFT; `## Drift` section saying "None…" is reported apart.
 *   • a path taken from repo content (a component record's `path:`) is only looked up
 *     when it is repo-relative. An absolute path (`/Users/…`, `C:\…`), a home path
 *     (`~/…`) or one that climbs out of the repo (`../x`) says nothing about THIS tree
 *     and would make the counter depend on the auditor's machine; such a record is
 *     counted in `path_unresolved`, never in `path_exists` / `path_missing`.
 *   • css is parsed up to 32 levels of nesting (real css nests a handful); a rule deeper
 *     than that is skipped and a warning says so, so hostile input stays linear.
 *   • a file over the 5 MB read cap reads as empty (ctx.read warns). Every counter that
 *     reads one says so in its notes instead of reporting a misleading 0.
 *
 * Counter ids (API — keep stable):
 *   docs.spine.design_md | guardrails_mdx | tokens_css | decisions_dir | goals_dir | state_dir
 *                                        presence  each CLAUDE.md-listed spine member exists under design/
 *   docs.spine.members_present           number    of the six above that exist
 *   docs.spine.members_listed_in_claude_md number  of the six names that root CLAUDE.md mentions
 *   docs.layout.design_members_present   number    of the design/ members lib/layout.js scaffolds that exist
 *   docs.layout.loop_members_present     number    of the loop/state members lib/layout.js scaffolds that exist
 *   docs.token_source.canonical_claims   line      doc lines saying "canonical" and naming a css file
 *   docs.token_source.docs_naming_resolved file    design docs whose claim names the resolved token source
 *   docs.oklch.claude_md_mentions        match     the word oklch in root CLAUDE.md
 *   docs.oklch.adr_mentions              match     the word oklch in decision records
 *                                        (oklch inside the token source itself is counted once, by
 *                                        tokens.oklch.occurrences / tokens.oklch.declarations)
 *   docs.oklch.docs_claim_without_declaration presence  docs mention oklch, token source declares none
 *   docs.contract.exists | .files        contract/ present / files under it
 *   docs.token_records.files | .keyed | .matches | .mismatches | .unresolved |
 *     .without_value | .clean_status_mismatching | .clean_drift_section_mismatching
 *   docs.component_records.files | .with_path | .path_exists | .path_missing | .path_unresolved
 *   docs.coverage.token_records_per_custom_property       ratio
 *   docs.coverage.component_records_per_component_file    ratio
 *
 * The markdown, css, hex and note helpers the documentation groups share live in
 * markdown.js, css.js and util.js; this module only exports its group.
 */

const layout = require("../layout");
const ds = require("../design-source");
const { counter, byString, round4 } = require("./counter");
const { LINE_CAP, capNotes, joinNotes, posixNorm, repoRelativePath, sortedByKey, sum } = require("./util");
const { ADR_DIRS, MD_EXTS, adrFiles, frontMatter, topLevel, yamlEntries } = require("./markdown");
const { normValue, tokenThemes } = require("./css");

const GROUP = "docs";
const DESIGN_DIR = layout.rel.design;
const SPINE = [
  { id: "design_md", rel: layout.rel.designFile, dir: false, listed: "DESIGN.md" },
  { id: "guardrails_mdx", rel: layout.rel.guardrails, dir: false, listed: "guardrails.mdx" },
  { id: "tokens_css", rel: layout.rel.tokens, dir: false, listed: "tokens.css" },
  { id: "decisions_dir", rel: `${DESIGN_DIR}/decisions`, dir: true, listed: "decisions/" },
  { id: "goals_dir", rel: `${DESIGN_DIR}/goals`, dir: true, listed: "goals/" },
  { id: "state_dir", rel: `${DESIGN_DIR}/.state`, dir: true, listed: ".state/" },
];
const LAYOUT_DESIGN = [
  { rel: layout.rel.designFile, dir: false },
  { rel: layout.rel.guardrails, dir: false },
  { rel: layout.rel.tokens, dir: false },
];
const LAYOUT_LOOP = [
  { rel: layout.rel.experiments, dir: true },
  { rel: layout.rel.learnings, dir: false },
  { rel: layout.rel.goals, dir: true },
  { rel: layout.rel.queue, dir: false },
];
const CANONICAL_DOCS = ["design/DESIGN.md", "design/tokens.mdx", "design/index.mdx"];
const CLEAN_STATUS = new Set(["clean", "ok", "none", "synced", "in-sync", "in_sync", "match", "matched", "clear", "no-drift", "aligned"]);
const NO_DRIFT = new Set(["none", "false", "no", "0", "clean", "no-drift", "n/a"]);
const ROW_CAP = 100;

const CANONICAL_LINE_RE = /canonical|source of truth|single source|authoritative/i;
const CSS_REF_RE = /[\w@~./-]*[\w-]\.css\b/g;
const OKLCH_RE = /\boklch\b/gi;
const OKLCH_CALL_RE = /\boklch\(/i;

// ── helpers ─────────────────────────────────────────────────────────────────

const isFile = (ctx, rel) => ctx.exists(rel) && !ctx.isDirectory(rel);
const memberExists = (ctx, m) => (m.dir ? ctx.isDirectory(m.rel) : isFile(ctx, m.rel));
/** Body of the first heading called `name` (case-insensitive) → its first non-blank line, or null. */
function sectionFirstLine(body, name) {
  const lines = body.split("\n");
  const re = new RegExp(`^#{1,6}[ \\t]+${name}\\b`, "i");
  let inFence = false;
  for (let i = 0; i < lines.length; i++) {
    if (/^ {0,3}(?:`{3,}|~{3,})/.test(lines[i])) inFence = !inFence;
    if (inFence || !re.test(lines[i])) continue;
    for (let j = i + 1; j < lines.length; j++) {
      if (/^#{1,6}[ \t]/.test(lines[j])) return null;
      if (lines[j].trim()) return lines[j].trim();
    }
    return null;
  }
  return null;
}

function readRecord(ctx, file) {
  const text = ctx.read(file);
  const fm = frontMatter(text);
  const entries = fm.present ? yamlEntries(fm.raw) : [];
  const body = fm.present ? text.split("\n").slice(fm.endLine).join("\n") : text;
  return { file: file.rel, fm: topLevel(entries), body };
}

// ── run ─────────────────────────────────────────────────────────────────────

function run(ctx) {
  const out = [];
  const tokenRel = ctx.tokenSource && ctx.tokenSource.rel;
  const tokenText = tokenRel ? ctx.read(ctx.tokenSource.abs) : "";
  // what is wrong with the token source itself (absent, or over the read cap)
  const sourceNotes = tokenRel
    ? capNotes(ctx, [tokenRel])
    : ["no token source was resolved (no design/tokens.css, design.source, canonical css named in the design docs, or css file with enough custom properties)"];
  const hasClaude = isFile(ctx, "CLAUDE.md");
  const claudeText = hasClaude ? ctx.read("CLAUDE.md") : "";
  const claudeCap = hasClaude ? capNotes(ctx, ["CLAUDE.md"]) : [];
  const claudeNotes = !hasClaude ? ["no CLAUDE.md at the repo root"] : claudeCap.length ? claudeCap : claudeText ? undefined : ["CLAUDE.md is empty"];

  // ── spine ──
  // two members are also existence flags of the group that analyses the file; the value is the same fact,
  // repeated so the spine checklist (and `--groups docs`) stands alone
  const alsoCounted = {
    guardrails_mdx: "guardrails.file.exists",
    design_md: "decisions.design_md.exists (which also accepts a root DESIGN.md when design/DESIGN.md is absent)",
  };
  const presentMembers = [];
  const missingMembers = [];
  for (const m of SPINE) {
    const ok = memberExists(ctx, m);
    (ok ? presentMembers : missingMembers).push(m.rel + (m.dir ? "/" : ""));
    out.push(counter({
      id: `docs.spine.${m.id}`,
      group: GROUP,
      kind: "presence",
      unit: "boolean",
      value: ok,
      definition: {
        summary: `${m.rel} exists as a ${m.dir ? "directory" : "file"}${alsoCounted[m.id] ? ` (the same fact as ${alsoCounted[m.id]})` : ""}`,
        regex: null,
        fileSet: m.rel,
      },
      notes: ctx.isDirectory(DESIGN_DIR) ? undefined : [`no ${DESIGN_DIR}/ directory`],
    }));
  }
  const listedInClaude = SPINE.filter((m) => claudeText.includes(m.listed));
  out.push(counter({
    id: "docs.spine.members_present",
    group: GROUP,
    kind: "mechanical",
    unit: "number",
    value: presentMembers.length,
    definition: {
      summary: `How many of the ${SPINE.length} spine members (DESIGN.md, guardrails.mdx, tokens.css, decisions/, goals/, .state/) exist under ${DESIGN_DIR}/`,
      regex: null,
      fileSet: SPINE.map((m) => m.rel + (m.dir ? "/" : "")).join(", "),
    },
    detail: { expected: SPINE.length, present: presentMembers, missing: missingMembers },
    notes: ["the six-member list is the v5 spine in root CLAUDE.md; lib/layout.js (v6) scaffolds only DESIGN.md, guardrails.mdx and tokens.css under design/ — see docs.layout.design_members_present"],
  }));
  out.push(counter({
    id: "docs.spine.members_listed_in_claude_md",
    group: GROUP,
    kind: "mechanical",
    unit: "number",
    value: listedInClaude.length,
    definition: {
      summary: "How many of the six spine member names root CLAUDE.md mentions (case-sensitive substring), i.e. whether CLAUDE.md is the source of the list",
      regex: null,
      fileSet: "CLAUDE.md at the repo root",
    },
    detail: { names: listedInClaude.map((m) => m.listed), expected: SPINE.length },
    notes: claudeNotes,
  }));

  const layoutCount = (members) => {
    const present = members.filter((m) => memberExists(ctx, m));
    return { present: present.map((m) => m.rel), missing: members.filter((m) => !present.includes(m)).map((m) => m.rel), n: present.length, total: members.length };
  };
  for (const [id, members, label] of [
    ["design_members_present", LAYOUT_DESIGN, "design/ members that lib/layout.js scaffolds (designFile, guardrails, tokens)"],
    ["loop_members_present", LAYOUT_LOOP, "loop/state members that lib/layout.js scaffolds (experiments/, LEARNINGS.md, experiments/goals/, .systemix/queue.json)"],
  ]) {
    const r = layoutCount(members);
    out.push(counter({
      id: `docs.layout.${id}`,
      group: GROUP,
      kind: "mechanical",
      unit: "number",
      value: r.n,
      definition: { summary: `How many of the ${label} exist`, regex: null, fileSet: members.map((m) => m.rel + (m.dir ? "/" : "")).join(", ") },
      detail: { expected: r.total, present: r.present, missing: r.missing },
    }));
  }

  // ── token source named canonical by the docs ──
  const claims = [];
  for (const rel of CANONICAL_DOCS) {
    if (!isFile(ctx, rel)) continue;
    ctx.read(rel).split("\n").forEach((l, i) => {
      if (l.length > LINE_CAP || !l.includes(".css") || !CANONICAL_LINE_RE.test(l)) return;
      const refs = [...new Set(l.match(CSS_REF_RE) ?? [])].sort(byString);
      if (refs.length) claims.push({ file: rel, line: i + 1, refs });
    });
  }
  const canonCap = capNotes(ctx, CANONICAL_DOCS);
  // a bare file name is a path suffix too, so "globals.css" names src/app/globals.css
  const names = (ref) => !!tokenRel && (posixNorm(ref) === tokenRel || tokenRel.endsWith("/" + posixNorm(ref)));
  const claimRows = new Map();
  for (const c of claims) claimRows.set(c.file, (claimRows.get(c.file) ?? 0) + 1);
  out.push(counter({
    id: "docs.token_source.canonical_claims",
    group: GROUP,
    kind: "mechanical",
    unit: "line",
    value: claims.length,
    definition: {
      summary: "Lines in the design docs that say canonical / source of truth / single source / authoritative AND name a .css file",
      regexes: [{ label: "a line that says canonical / source of truth / single source / authoritative", regex: CANONICAL_LINE_RE }, { label: "a .css file name on that line", regex: CSS_REF_RE }],
      fileSet: CANONICAL_DOCS.join(", "),
    },
    perFile: claimRows,
    detail: { claims: claims.slice(0, ROW_CAP) },
    notes: canonCap.length ? canonCap : claims.length ? undefined : ["none of the design docs names a canonical css file"],
  }));
  const naming = [...new Set(claims.filter((c) => c.refs.some(names)).map((c) => c.file))].sort(byString);
  out.push(counter({
    id: "docs.token_source.docs_naming_resolved",
    group: GROUP,
    kind: "mechanical",
    unit: "file",
    value: naming.length,
    definition: {
      summary: "Design docs with a canonical-claim line naming the resolved token source (by path, path suffix or bare file name)",
      regex: null,
      fileSet: CANONICAL_DOCS.join(", "),
    },
    perFile: new Map(naming.map((f) => [f, 1])),
    detail: { tokenSource: tokenRel, files: naming },
    notes: joinNotes(sourceNotes, canonCap),
  }));

  // ── oklch: what the docs say vs what the token source declares ──
  const adrs = adrFiles(ctx);
  const adrOklch = new Map(adrs.map((f) => [f.rel, ctx.countMatches(ctx.read(f), OKLCH_RE)]));
  const adrCap = capNotes(ctx, adrs.map((f) => f.rel));
  const claudeOklch = ctx.countMatches(claudeText, OKLCH_RE);
  const declLines = new Set();
  const themes = tokenThemes(ctx);
  for (const entries of themes.all.values()) for (const d of entries) if (OKLCH_CALL_RE.test(d.value)) declLines.add(d.line);
  const adrOklchTotal = sum(adrOklch);
  out.push(counter({
    id: "docs.oklch.claude_md_mentions",
    group: GROUP,
    kind: "mechanical",
    unit: "match",
    value: claudeOklch,
    definition: { summary: "Occurrences of the word oklch (case-insensitive, whole word) in root CLAUDE.md", regex: OKLCH_RE, fileSet: "root CLAUDE.md" },
    singleFile: "CLAUDE.md",
    notes: claudeNotes,
  }));
  out.push(counter({
    id: "docs.oklch.adr_mentions",
    group: GROUP,
    kind: "mechanical",
    unit: "match",
    value: adrOklchTotal,
    definition: { summary: "Occurrences of the word oklch (case-insensitive, whole word) in decision records", regex: OKLCH_RE, fileSet: `${ADR_DIRS.join("/ and ")}/ markdown files` },
    perFile: adrOklch,
    notes: adrs.length ? adrCap.length ? adrCap : undefined : [`no decision records under ${ADR_DIRS.join("/ or ")}/`],
  }));
  out.push(counter({
    id: "docs.oklch.docs_claim_without_declaration",
    group: GROUP,
    kind: "presence",
    unit: "boolean",
    value: claudeOklch + adrOklchTotal > 0 && declLines.size === 0,
    definition: {
      summary: "True when root CLAUDE.md or a decision record mentions oklch while the token source declares no custom property with oklch( (the declaration test is tokens.oklch.declarations, here also found by the css parser, so a declaration that shares its line with a selector counts)",
      regex: null,
      fileSet: "root CLAUDE.md, decision records, the resolved token source",
    },
    detail: { docMentions: claudeOklch + adrOklchTotal, tokenSourceDeclarations: declLines.size },
    notes: joinNotes(sourceNotes, claudeCap, adrCap),
  }));

  // ── contract/ records vs the token source ──
  const contractFiles = ctx.listTree("contract");
  const byDir = new Map();
  for (const f of contractFiles) {
    const top = f.rel.split("/").length > 2 ? f.rel.split("/").slice(0, 2).join("/") : "contract";
    byDir.set(top, (byDir.get(top) ?? 0) + 1);
  }
  const noContract = ctx.isDirectory("contract") ? [] : ["no contract/ directory in this repo"];
  out.push(counter({
    id: "docs.contract.exists",
    group: GROUP,
    kind: "presence",
    unit: "boolean",
    value: ctx.isDirectory("contract"),
    definition: { summary: "contract/ exists as a directory", regex: null, fileSet: "contract/" },
    notes: noContract.length ? noContract : undefined,
  }));
  out.push(counter({
    id: "docs.contract.files",
    group: GROUP,
    kind: "mechanical",
    unit: "file",
    value: contractFiles.length,
    definition: { summary: "Files of any type under contract/, recursively", regex: null, fileSet: "contract/" },
    perFile: new Map(contractFiles.map((f) => [f.rel, 1])),
    detail: { byDir: sortedByKey(byDir) },
    notes: noContract.length ? noContract : undefined,
  }));

  const declared = tokenRel ? new Set([...ds.customProperties(tokenText), ...themes.all.keys()]) : new Set();
  const recFiles = ctx.listTree("contract/tokens", { exts: MD_EXTS });
  const rows = [];
  for (const f of recFiles) {
    const rec = readRecord(ctx, f);
    const title = rec.fm.get("title") ?? "";
    const token = rec.fm.get("token") ?? (title.startsWith("--") ? title : null);
    const value = rec.fm.get("value") ?? null;
    const status = (rec.fm.get("status") ?? "").toLowerCase();
    const driftKey = (rec.fm.get("drift") ?? "").toLowerCase();
    const row = {
      file: rec.file, token, value, state: "", declared: [],
      status: rec.fm.get("status") ?? null, driftKey: rec.fm.get("drift") ?? null,
      claimsClean: CLEAN_STATUS.has(status) || NO_DRIFT.has(driftKey),
      driftSectionNone: /^(?:none|no drift|nothing|n\/a)\b/i.test(sectionFirstLine(rec.body, "drift") ?? ""),
    };
    if (!token || value === null) {
      row.state = "without_value";
    } else if (!declared.has(token) || !themes.all.has(token)) {
      row.state = "unresolved";
    } else {
      const decls = themes.all.get(token);
      row.declared = decls.slice(0, 6).map((d) => ({ block: d.block, value: d.value }));
      const want = normValue(value);
      row.state = decls.some((d) => normValue(d.value) === want) ? "match" : "mismatch";
    }
    rows.push(row);
  }
  const ofState = (s) => rows.filter((r) => r.state === s);
  const fileMap = (list) => new Map(list.map((r) => [r.file, 1]));
  const recordSet = "contract/tokens/*.md and *.mdx (recursive)";
  const recNotes = [
    ...noContract,
    ...(recFiles.length || noContract.length ? [] : ["contract/ has no tokens/ records"]),
    ...capNotes(ctx, recFiles.map((f) => f.rel)),
  ];
  const recDef = (summary, regex = null, flags = undefined) => ({ summary, regex, flags, fileSet: `${recordSet} compared with the resolved token source` });
  out.push(counter({
    id: "docs.token_records.files",
    group: GROUP,
    kind: "mechanical",
    unit: "file",
    value: recFiles.length,
    definition: { summary: "Token record files", regex: null, fileSet: recordSet },
    perFile: new Map(recFiles.map((f) => [f.rel, 1])),
    detail: { records: rows.slice(0, ROW_CAP) },
    notes: recNotes.length ? recNotes : undefined,
  }));
  out.push(counter({
    id: "docs.token_records.keyed",
    group: GROUP,
    kind: "mechanical",
    unit: "number",
    value: rows.length - ofState("without_value").length,
    definition: { summary: "Token records that carry both a token name (frontmatter token:, or a title starting with --) and a value:", regex: null, fileSet: recordSet },
    notes: recNotes.length ? recNotes : undefined,
  }));
  out.push(counter({
    id: "docs.token_records.without_value",
    group: GROUP,
    kind: "mechanical",
    unit: "number",
    value: ofState("without_value").length,
    definition: { summary: "Token records with no token name or no value:, which cannot be compared", regex: null, fileSet: recordSet },
    perFile: fileMap(ofState("without_value")),
    notes: recNotes.length ? recNotes : undefined,
  }));
  const compareNotes = [...recNotes, ...sourceNotes];
  out.push(counter({
    id: "docs.token_records.matches",
    group: GROUP,
    kind: "mechanical",
    unit: "number",
    value: ofState("match").length,
    definition: recDef("Token records whose value equals (after the pinned normalisation) a value the token is declared with in the token source"),
    perFile: fileMap(ofState("match")),
    notes: compareNotes.length ? compareNotes : ["strict string compare: no unit, colour-space or calc() conversion"],
  }));
  out.push(counter({
    id: "docs.token_records.mismatches",
    group: GROUP,
    kind: "mechanical",
    unit: "number",
    value: ofState("mismatch").length,
    definition: recDef("Token records whose token IS declared in the token source but whose value equals none of its declared values"),
    perFile: fileMap(ofState("mismatch")),
    detail: { records: ofState("mismatch").slice(0, ROW_CAP).map((r) => ({ file: r.file, token: r.token, value: r.value, declared: r.declared })) },
    notes: compareNotes.length ? compareNotes : ["strict string compare: no unit, colour-space or calc() conversion, so oklch vs hex always differs"],
  }));
  out.push(counter({
    id: "docs.token_records.unresolved",
    group: GROUP,
    kind: "mechanical",
    unit: "number",
    value: ofState("unresolved").length,
    definition: recDef("Token records whose token is not declared in the token source (or there is no token source)"),
    perFile: fileMap(ofState("unresolved")),
    notes: compareNotes.length ? compareNotes : undefined,
  }));
  const cleanMismatch = ofState("mismatch").filter((r) => r.claimsClean);
  out.push(counter({
    id: "docs.token_records.clean_status_mismatching",
    group: GROUP,
    kind: "mechanical",
    unit: "number",
    value: cleanMismatch.length,
    definition: recDef(
      "Mismatching token records whose frontmatter claims no drift: status in {" + [...CLEAN_STATUS].join(", ") + "} or drift in {" + [...NO_DRIFT].join(", ") + "}",
    ),
    perFile: fileMap(cleanMismatch),
    detail: { records: cleanMismatch.slice(0, ROW_CAP).map((r) => ({ file: r.file, token: r.token, status: r.status, drift: r.driftKey })) },
    notes: compareNotes.length ? compareNotes : undefined,
  }));
  const noneMismatch = ofState("mismatch").filter((r) => r.driftSectionNone);
  out.push(counter({
    id: "docs.token_records.clean_drift_section_mismatching",
    group: GROUP,
    kind: "mechanical",
    unit: "number",
    value: noneMismatch.length,
    definition: recDef("Mismatching token records whose body has a Drift heading whose first line starts with none / no drift / nothing / n/a", "^#{1,6}[ \\t]+Drift\\b", "i"),
    perFile: fileMap(noneMismatch),
    notes: compareNotes.length ? compareNotes : undefined,
  }));

  // ── component records ──
  const compRecFiles = ctx.listTree("contract/components", { exts: MD_EXTS });
  const testSet = new Set(ctx.tests.map((t) => t.rel));
  const componentFiles = new Set(ctx.census
    .filter((f) => /^(?:.*\/)?components\/.*\.tsx$/.test(f.rel) && !testSet.has(f.rel))
    .map((f) => f.rel));
  const compRows = compRecFiles.map((f) => {
    const rec = readRecord(ctx, f);
    const p = rec.fm.get("path");
    const written = p ? String(p).trim() : "";
    const norm = written ? repoRelativePath(written) : null;
    const state = !written ? "none" : norm === null ? "outside" : isFile(ctx, norm) ? "exists" : "missing";
    return {
      file: rec.file,
      path: written ? (norm ?? written) : null,
      state,
      exists: state === "exists",
      inComponents: norm !== null && componentFiles.has(norm),
    };
  });
  const compSet = "contract/components/*.md and *.mdx (recursive)";
  const compCap = capNotes(ctx, compRecFiles.map((f) => f.rel));
  const compNotes = [...noContract, ...(compRecFiles.length || noContract.length ? [] : ["contract/ has no components/ records"]), ...compCap];
  const inState = (s) => compRows.filter((r) => r.state === s);
  const outsideNote = inState("outside").length
    ? [`${inState("outside").length} record(s) name an absolute, home-relative or out-of-repo path; those are not looked up (see path_unresolved)`]
    : [];
  const compCount = (id, summary, value, list, extra = []) => out.push(counter({
    id: `docs.component_records.${id}`,
    group: GROUP,
    kind: "mechanical",
    unit: id === "files" ? "file" : "number",
    value,
    definition: { summary, regex: null, fileSet: compSet },
    perFile: list ? new Map(list.map((r) => [r.file, 1])) : undefined,
    detail: id === "files" ? { records: compRows.slice(0, ROW_CAP) } : undefined,
    notes: joinNotes(compNotes, extra),
  }));
  compCount("files", "Component record files", compRecFiles.length, compRecFiles.map((f) => ({ file: f.rel })));
  compCount("with_path", "Component records with a frontmatter path:", compRows.length - inState("none").length, compRows.filter((r) => r.state !== "none"));
  compCount("path_exists", "Component records whose repo-relative path: names an existing file", inState("exists").length, inState("exists"), outsideNote);
  compCount("path_missing", "Component records whose repo-relative path: names a file that does not exist", inState("missing").length, inState("missing"), outsideNote);
  compCount("path_unresolved", "Component records whose path: is absolute (/x, C:\\x), home-relative (~/x) or climbs out of the repo (../x), so it was not looked up", inState("outside").length, inState("outside"),
    ["such a path says nothing about this tree and would depend on the auditor's machine, so it counts in neither path_exists nor path_missing"]);

  // ── coverage ──
  const covered = new Set(rows.filter((r) => r.token && declared.has(r.token)).map((r) => r.token));
  out.push(counter({
    id: "docs.coverage.token_records_per_custom_property",
    group: GROUP,
    kind: "mechanical",
    unit: "ratio",
    value: declared.size ? round4(covered.size / declared.size) : null,
    definition: {
      summary: "Distinct tokens named by a token record and declared in the token source ÷ distinct custom properties the token source declares",
      regex: null,
      fileSet: `${recordSet}; the resolved token source`,
    },
    detail: { numerator: covered.size, denominator: declared.size },
    notes: declared.size ? undefined : sourceNotes.length ? sourceNotes : ["the token source declares no custom property"],
  }));
  const coveredComponents = new Set(compRows.filter((r) => r.inComponents).map((r) => r.path));
  out.push(counter({
    id: "docs.coverage.component_records_per_component_file",
    group: GROUP,
    kind: "mechanical",
    unit: "ratio",
    value: componentFiles.size ? round4(coveredComponents.size / componentFiles.size) : null,
    definition: {
      summary: "Distinct component files named by a component record's path: ÷ tsx files under a components/ directory in the audited dirs (tests excluded)",
      regex: "^(?:.*\\/)?components\\/.*\\.tsx$",
      fileSet: `${compSet}; census tsx files`,
    },
    detail: { numerator: coveredComponents.size, denominator: componentFiles.size },
    notes: joinNotes(componentFiles.size ? [] : ["no tsx files under a components/ directory in the audited dirs"], compCap),
  }));

  return out;
}

module.exports = { group: GROUP, run };
