"use strict";

/**
 * colour.js — raw colour literals and raw colour classes in the audited
 * population. Regex hits and token-by-token class matching; nothing here says a
 * hit is a violation, and nothing is scored.
 *
 * Counter ids (API — keep them stable):
 *
 * The drift scanner's own tally (colour.scanner.* calls scanProject() from
 * commands/drift.js, so these numbers ARE what `systemix drift scan` reports —
 * with one pinned input: the scanner is fed the files through ctx.scan(), i.e. the
 * text this run reads (5 MB cap, read budget), the token source and the population it
 * resolved. So the scanner and every other counter see the same files and read each
 * of them once. A file over the cap is skipped by the scanner and by every counter
 * alike, and is listed in colour.scanner.files_audited detail.skipped;
 * `systemix drift scan` itself has a larger cap, so for such a file its totals
 * differ from this report):
 *   colour.scanner.colour_hits               match   hex + rgb/rgba/hsl/hsla/oklch( hits, audited files
 *   colour.scanner.px_hits                   match   `\b\d+px\b` hits, audited files
 *   colour.scanner.files_audited             number  audited files the scanner scanned (scope.population.audited
 *                                                    minus detail.skipped)
 *   colour.scanner.files_with_colour_hits    file
 *   colour.scanner.files_with_px_only_hits   file    files with px hits and no colour hit
 *   colour.scanner.files_with_hits           file    files with either
 * The same regexes over the token source, which the scanner exempts (the old
 * scanner mixed these in: 139 of 254 colour hits sat in the token source):
 *   colour.token_source.colour_hits          match
 *   colour.token_source.px_hits              match
 *   colour.token_source.colour_share         ratio   token-source colour hits ÷ (token-source + audited)
 *   colour.token_source.px_share             ratio
 *
 * Hex literals outside the token source, ts/tsx only, two regexes on record:
 *   colour.hex6.*          the oracle's regex: 6-digit hex, HTML entities excluded
 *   colour.hex_scanner.*   the scanner's regex (PATTERNS.HEX_RE): 3/4/6/8 digits; not an HTML entity, a url(#id)
 *                          reference, an href fragment or an issue number after an issue word
 * Each family has
 *   .outside_token_source (match) · .outside_token_source_files (file) ·
 *   .outside_token_source_distinct (distinct, normalised) ·
 *   .equals_token (match) · .not_token (match)
 * "equals_token" = exact string match, after lowercasing and 3→6 digit (4→8)
 * expansion, against the hex values declared as custom-property values in the
 * token source (tokens.hex.declared_distinct is the size of that set). The
 * oracle labels equals_token "Critical" and not_token "Warning"; this module
 * only counts them.
 *
 * Colour function calls outside the token source, ts/tsx only:
 *   colour.rgb_fn.outside_token_source       match   rgb( / rgba(
 *   colour.hsl_fn.outside_token_source       match   hsl( / hsla(
 *   colour.oklch_fn.outside_token_source     match   oklch(
 *
 * Tailwind classes (audited files of any extension). The text is split into
 * class tokens: a run of class characters (`A-Za-z0-9_`, `-`, `:`, `/`, `!`) and
 * `[...]` arbitrary-value groups (one nesting level; no whitespace, quote,
 * backtick, brace or `$` inside). Anything else ends a token: whitespace, quotes,
 * backticks, `{}`, `$` and punctuation such as `< > ( ) , ; = | & . *` and `\`.
 * So `<code>bg-red-500</code>`, `"bg-red-500."`, `class=\"bg-red-500\"`,
 * `'a,bg-red-500'` and `(bg-red-500)` all yield the bare class. The escapes
 * `\n`, `\r`, `\t` are separators, not the first letter of the next class.
 * A token that is one `[...]` group with no colon (`[bg-red-500]`: not a class,
 * since an arbitrary property needs `prop:value`) is opened and its inside is
 * tokenised again. A leading `/` run and a trailing `:` or `/` run are trimmed,
 * variant prefixes (hover:, dark:, md:, [&>*]:) are stripped, then a leading
 * `!`/`-`, a trailing `!` and an opacity modifier (/50, /[.3]) are ignored:
 *   colour.palette_class.matches             match   (bg|text|border|ring|fill|stroke|outline|divide|from|via|to)-<hue>-<50..950>
 *   colour.palette_class.files               file
 *   colour.palette_class.extra_matches       match   the same shape on utilities outside that family list
 *                                                    (accent, caret, decoration, shadow, placeholder, ring-offset,
 *                                                    border-t/r/b/l/x/y/s/e, inset-shadow, inset-ring, drop-shadow)
 *   colour.arbitrary_colour_class.matches    match   <colour utility>-[<hex|rgb(|hsl(|oklch(>] — a colour utility
 *                                                    (a `url(#id)` svg reference is not a hex literal here, as in the scanner)
 *   colour.arbitrary_property_class.colour_literals  match  [property:value] classes whose value holds a colour literal
 *   colour.white_black_class.matches         match   <colour utility>-(white|black): OUT of the palette definition
 *
 * Scope choices are never silent: every literal counter reports in `detail`
 * how many hits sit in mockup files (a path containing `mockup`) and, for the
 * ts/tsx-pinned counters, how many sit in the other audited extensions.
 */

const path = require("path");
const { MAX_READ_BYTES } = require("../design-source");
const { counter, round4, byString } = require("./counter");
const { AUDITED_SET, bump, canonicalHex, sum } = require("./util");
const { declaredHexSet } = require("./css");
const { PATTERNS } = require("../../commands/drift");

const GROUP = "colour";

// The scanner's own regexes (commands/drift.js exports them), so a change there cannot desync this group.
const { HEX_RE: SCANNER_HEX_RE, COLOR_FN_RE: SCANNER_COLOR_FN_RE, PX_RE: SCANNER_PX_RE } = PATTERNS;

const HEX6_RE = /(?<!&)#[0-9a-fA-F]{6}\b/g;
const FN_FAMILIES = [
  { key: "rgb", label: "rgb( / rgba(", re: /\brgba?\(/g, varRe: /\brgba?\(\s*var\(/g },
  { key: "hsl", label: "hsl( / hsla(", re: /\bhsla?\(/g, varRe: /\bhsla?\(\s*var\(/g },
  { key: "oklch", label: "oklch(", re: /\boklch\(/g, varRe: /\boklch\(\s*var\(/g },
];

const UTILITIES = "bg|text|border|ring|fill|stroke|outline|divide|from|via|to";
const HUES = "slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose";
const SHADES = "50|100|200|300|400|500|600|700|800|900|950";
const EXTRA_UTILITIES = "accent|caret|decoration|shadow|placeholder|ring-offset|border-[trblxyse]|inset-shadow|inset-ring|drop-shadow";
const OPACITY = "(?:\\/(?:\\d+|\\[[^\\]]*\\]))?";

const PALETTE_RE = new RegExp(`^(?:${UTILITIES})-(?:${HUES})-(?:${SHADES})${OPACITY}$`);
const EXTRA_PALETTE_RE = new RegExp(`^(?:${EXTRA_UTILITIES})-(?:${HUES})-(?:${SHADES})${OPACITY}$`);
const WHITE_BLACK_RE = new RegExp(`^(?:${UTILITIES})-(?:white|black)${OPACITY}$`);
const ARBITRARY_COLOUR_RE = new RegExp(`^(?:${UTILITIES})-\\[([^\\]]*)\\]${OPACITY}$`);
const ARBITRARY_PROPERTY_RE = /^\[[a-zA-Z-]+:(.*)\]$/;
const COLOUR_LITERAL_RE = /(?<!url\()#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{4}|[0-9a-fA-F]{3})(?![0-9a-zA-Z])|(?<![A-Za-z])(?:rgba?|hsla?|oklch)\(/;

// A class token is a run of class characters and [..] groups; see the header.
// The two alternatives of every group are disjoint (a bracket cannot start with a
// class character; the inner set excludes [ and ]), so matching is linear.
const BRACKET_INNER = "[^\\[\\]\\s\"'`{}$]";
const BRACKET_GROUP = `\\[(?:${BRACKET_INNER}|\\[${BRACKET_INNER}*\\])*\\]`;
const CLASS_CHAR = "[A-Za-z0-9_:/!-]";
// group 1 is the token; a `\n`/`\r`/`\t` escape matches without it and is skipped
const CLASS_TOKEN_RE = new RegExp(`\\\\[nrt]|((?:${CLASS_CHAR}|${BRACKET_GROUP})+)`, "g");
const MAX_TOKEN = 300;
// the ends of a token that are never part of a class: `//bg-red-500`, `bg-red-500:`, `bg-red-500/`
const SLASH = 47;
const COLON = 58;

const MOCKUP_RE = /mock-?ups?/i;

const TS_SET = "audited ts/tsx, excluding the token source and tests";
const isTs = (ext) => ext === ".ts" || ext === ".tsx";

/** A token without its leading `/` run and trailing `:` / `/` run. */
function trimToken(token) {
  let start = 0;
  let end = token.length;
  while (start < end && token.charCodeAt(start) === SLASH) start++;
  while (end > start && (token.charCodeAt(end - 1) === COLON || token.charCodeAt(end - 1) === SLASH)) end--;
  return start === 0 && end === token.length ? token : token.slice(start, end);
}

/** Variant prefixes stripped (last ":" outside brackets/parens), then `!`/`-` markers dropped. */
function utilityOf(token) {
  let depth = 0;
  let cut = -1;
  for (let i = 0; i < token.length; i++) {
    const c = token.charCodeAt(i);
    if (c === 91 || c === 40) depth++;
    else if (c === 93 || c === 41) { if (depth > 0) depth--; }
    else if (c === 58 && depth === 0) cut = i;
  }
  let u = token.slice(cut + 1);
  if (u.charCodeAt(0) === 33) u = u.slice(1);
  if (u.charCodeAt(0) === 45) u = u.slice(1);
  if (u.charCodeAt(u.length - 1) === 33) u = u.slice(0, -1);
  return u;
}

/** Mockup split of a { file → count } map: what a reader needs to exclude exempt mockups. */
function mockupSplit(counts) {
  const files = [...counts.keys()].filter((f) => MOCKUP_RE.test(f)).sort(byString);
  const inMockups = files.reduce((n, f) => n + counts.get(f), 0);
  return { pattern: MOCKUP_RE.source, files, inMockupFiles: inMockups, excludingMockupFiles: sum(counts) - inMockups };
}

function byExtension(rows) {
  const out = {};
  for (const [ext, n] of [...rows].sort((a, b) => byString(a[0], b[0]))) out[ext] = n;
  return out;
}

function ratioCounter(spec, numerator, denominator) {
  const noHits = denominator === 0;
  return counter({
    group: GROUP,
    ...spec,
    kind: "mechanical",
    unit: "ratio",
    value: noHits ? null : round4(numerator / denominator),
    detail: { ...(spec.detail ?? {}), numerator, denominator },
    notes: [...(spec.notes ?? []), ...(noHits ? ["no hits in either place, so there is no ratio (value null)"] : [])],
  });
}

function run(ctx) {
  const out = [];
  const add = (spec) => out.push(counter({ group: GROUP, ...spec }));
  const ts = ctx.tokenSource;
  const declared = declaredHexSet(ctx);
  const noSource = ts.abs ? [] : [`no token source resolved: ${ts.reason}`];
  const noEquality = ts.abs ? [] : [...noSource, "with no token source nothing can equal a token: every hex counts as not_token"];
  const outsideDirs = ts.abs && !ctx.population.tokenSourceInCensus
    ? [`the token source (${ts.rel}) sits outside the audited dirs, so the scanner never visits it; its hits are counted here for reference`]
    : [];

  // ── scanner (the counter IS the scanner) ────────────────────────────────
  const scan = ctx.scan();
  const scanColour = new Map();
  const scanPx = new Map();
  const scanExt = new Map();
  let colourFiles = 0;
  let pxOnlyFiles = 0;
  for (const { file, c, w } of scan.perFile) {
    if (c) { scanColour.set(file, c); colourFiles++; bump(scanExt, path.extname(file), c); } else if (w) pxOnlyFiles++;
    if (w) scanPx.set(file, w);
  }

  // ── one pass over the audited population ────────────────────────────────
  const hex6 = { files: new Map(), other: 0, eq: new Map(), neq: new Map(), distinct: new Set() };
  const hexS = { files: new Map(), other: 0, eq: new Map(), neq: new Map(), distinct: new Set() };
  const fns = FN_FAMILIES.map((fam) => ({ ...fam, files: new Map(), other: 0, varArg: 0 }));
  const cls = {
    palette: new Map(), distinct: new Set(), extra: new Map(), arbitrary: new Map(),
    property: new Map(), whiteBlack: new Map(),
  };
  const mine = { c: 0, w: 0, perFile: new Map() };
  const tokenRe = new RegExp(CLASS_TOKEN_RE.source, "g");

  function classify(raw, rel) {
    const token = trimToken(raw);
    if (token.length < 4 || token.length > MAX_TOKEN) return;
    // a lone [..] group with no colon is no class (an arbitrary property needs `prop:value`): read what is inside it
    if (token.charCodeAt(0) === 91 && token.charCodeAt(token.length - 1) === 93 && token.indexOf(":") === -1) {
      for (const inner of token.slice(1, -1).matchAll(CLASS_TOKEN_RE)) if (inner[1] !== undefined) classify(inner[1], rel);
      return;
    }
    if (token.indexOf("-") === -1 && token.indexOf("[") === -1) return; // every class shape below has one
    const u = utilityOf(token);
    if (PALETTE_RE.test(u)) { bump(cls.palette, rel); cls.distinct.add(u); } else if (EXTRA_PALETTE_RE.test(u)) bump(cls.extra, rel);
    else if (WHITE_BLACK_RE.test(u)) bump(cls.whiteBlack, rel);
    else {
      const arb = ARBITRARY_COLOUR_RE.exec(u);
      if (arb) { if (COLOUR_LITERAL_RE.test(arb[1])) bump(cls.arbitrary, rel); return; }
      const prop = ARBITRARY_PROPERTY_RE.exec(u);
      if (prop && COLOUR_LITERAL_RE.test(prop[1])) bump(cls.property, rel);
    }
  }

  for (const f of ctx.audited) {
    const text = ctx.read(f);
    if (!text) continue;
    const tsFile = isTs(path.extname(f.rel));

    let colour = 0;
    for (const m of text.matchAll(SCANNER_HEX_RE)) {
      colour++;
      if (!tsFile) { hexS.other++; continue; }
      const v = canonicalHex(m[0]);
      bump(hexS.files, f.rel);
      hexS.distinct.add(v);
      bump(declared.has(v) ? hexS.eq : hexS.neq, f.rel);
    }
    colour += ctx.countMatches(text, SCANNER_COLOR_FN_RE);
    const px = ctx.countMatches(text, SCANNER_PX_RE);
    if (colour || px) mine.perFile.set(f.rel, `${colour}/${px}`);
    mine.c += colour;
    mine.w += px;

    for (const m of text.matchAll(HEX6_RE)) {
      if (!tsFile) { hex6.other++; continue; }
      const v = canonicalHex(m[0]);
      bump(hex6.files, f.rel);
      hex6.distinct.add(v);
      bump(declared.has(v) ? hex6.eq : hex6.neq, f.rel);
    }

    for (const fn of fns) {
      const n = ctx.countMatches(text, fn.re);
      if (!n) continue;
      if (tsFile) { bump(fn.files, f.rel, n); fn.varArg += ctx.countMatches(text, fn.varRe); } else fn.other += n;
    }

    tokenRe.lastIndex = 0;
    let m;
    while ((m = tokenRe.exec(text))) {
      if (m[1] !== undefined) classify(m[1], f.rel); // no group: an escape such as \n
    }
  }

  // ── the token source's own hits, same regexes ───────────────────────────
  const srcText = ts.abs ? ctx.read(ts.abs) : "";
  const srcColour = ctx.countMatches(srcText, SCANNER_HEX_RE) + ctx.countMatches(srcText, SCANNER_COLOR_FN_RE);
  const srcPx = ctx.countMatches(srcText, SCANNER_PX_RE);

  // ── self-check: the scanner's regexes run here vs scanProject itself ──
  const selfNotes = [];
  const scannerSkipped = new Set(scan.skipped.map((s) => s.file));
  if (mine.c !== scan.critical || mine.w !== scan.warnings) {
    const scanned = new Map(scan.perFile.map((r) => [r.file, `${r.c}/${r.w}`]));
    const disagree = [...new Set([...scanned.keys(), ...mine.perFile.keys()])]
      .filter((k) => scanned.get(k) !== mine.perFile.get(k) && !scannerSkipped.has(k)).sort(byString);
    if (disagree.length) {
      const msg = `colour: the scanner's regexes run here disagree with scanProject (here ${mine.c} colour / ${mine.w} px, scanner ${scan.critical} / ${scan.warnings}); differing files: ${disagree.slice(0, 5).join(", ")}. Token-source hit counts may be off.`;
      ctx.warn(msg);
      selfNotes.push(msg);
    }
  }
  const skippedRows = scan.skipped.map(({ file, reason }) => ({ file, reason }));
  const skippedNotes = scan.skipped.length
    ? [`${scan.skipped.length} audited file(s) were not scanned (${[...new Set(scan.skipped.map((s) => s.reason))].sort(byString).join(", ")}): ${scan.skipped.slice(0, 5).map((s) => s.file).join(", ")}${scan.skipped.length > 5 ? ", …" : ""}. Every other counter skips them too, so the scanner and the per-type counters cover the same files; scope.population.audited counts them, colour.scanner.files_audited does not. \`systemix drift scan\` has a larger read cap of its own, so for such a file its totals differ from this report.`]
    : [];

  add({
    id: "colour.scanner.colour_hits", kind: "mechanical", unit: "match", value: scan.critical,
    definition: {
      summary: "Colour-literal regex hits as `systemix drift scan` counts them (its 'critical'). Regex hits, not violations; quote the total, not a hex/rgb/oklch split.",
      regexes: [{ label: "hex literal", regex: SCANNER_HEX_RE }, { label: "colour function call", regex: SCANNER_COLOR_FN_RE }],
      fileSet: AUDITED_SET,
    },
    perFile: scanColour,
    detail: { byExtension: byExtension(scanExt), mockups: mockupSplit(scanColour), dirs: scan.dirs },
    notes: [`token source exempt: ${scan.tokenSource ?? "none found"} (${scan.tokenSourceVia})`, ...skippedNotes, ...selfNotes],
  });
  add({
    id: "colour.scanner.px_hits", kind: "mechanical", unit: "match", value: scan.warnings,
    definition: { summary: "Raw px regex hits as `systemix drift scan` counts them (its 'warnings'). Regex hits, not violations.", regex: SCANNER_PX_RE, fileSet: AUDITED_SET },
    perFile: scanPx,
    detail: { mockups: mockupSplit(scanPx) },
    notes: [...skippedNotes, ...selfNotes],
  });
  add({
    id: "colour.scanner.files_audited", kind: "mechanical", unit: "number", value: scan.componentsAudited,
    definition: {
      summary: "Audited files the scanner scanned: the audited population minus any file it skipped (unreadable, or over the read cap shared with every other counter).",
      regex: null,
      fileSet: AUDITED_SET,
    },
    detail: {
      missingDirs: scan.missingDirs,
      auditedPopulation: scan.population.audited,
      skipped: skippedRows.slice(0, 25),
      skippedTotal: skippedRows.length,
      readCapBytes: MAX_READ_BYTES,
    },
    notes: [...(scan.population.audited === 0 ? ["nothing to audit under the requested dirs"] : []), ...skippedNotes],
  });
  add({
    id: "colour.scanner.files_with_colour_hits", kind: "mechanical", unit: "file", value: colourFiles,
    definition: { summary: "Files holding at least one colour-literal regex hit (perFile count = colour hits in the file).", regexes: [{ label: "hex literal", regex: SCANNER_HEX_RE }, { label: "colour function call", regex: SCANNER_COLOR_FN_RE }], fileSet: AUDITED_SET },
    perFile: scan.perFile.filter((r) => r.c > 0).map((r) => ({ file: r.file, count: r.c })),
    notes: skippedNotes,
  });
  add({
    id: "colour.scanner.files_with_px_only_hits", kind: "mechanical", unit: "file", value: pxOnlyFiles,
    definition: { summary: "Files holding at least one px hit and no colour hit (perFile count = px hits in the file).", regex: SCANNER_PX_RE, fileSet: AUDITED_SET },
    perFile: scan.perFile.filter((r) => r.c === 0 && r.w > 0).map((r) => ({ file: r.file, count: r.w })),
    notes: skippedNotes,
  });
  add({
    id: "colour.scanner.files_with_hits", kind: "mechanical", unit: "file", value: scan.filesWithDrift,
    definition: { summary: "Files holding at least one colour or px hit (perFile count = colour + px hits in the file).", regexes: [{ label: "hex literal", regex: SCANNER_HEX_RE }, { label: "colour function call", regex: SCANNER_COLOR_FN_RE }, { label: "px value", regex: SCANNER_PX_RE }], fileSet: AUDITED_SET },
    perFile: scan.perFile.map((r) => ({ file: r.file, count: r.c + r.w })),
    notes: skippedNotes,
  });

  add({
    id: "colour.token_source.colour_hits", kind: "mechanical", unit: "match", value: srcColour,
    definition: { summary: "Colour-literal regex hits inside the token source, which the scanner exempts. Same regexes as colour.scanner.colour_hits.", regexes: [{ label: "hex literal", regex: SCANNER_HEX_RE }, { label: "colour function call", regex: SCANNER_COLOR_FN_RE }], fileSet: ts.abs ? `the resolved token source (${ts.rel})` : "the resolved token source (none found)" },
    perFile: srcColour > 0 && ts.rel ? [{ file: ts.rel, count: srcColour }] : undefined,
    notes: [...noSource, ...outsideDirs, ...selfNotes],
  });
  add({
    id: "colour.token_source.px_hits", kind: "mechanical", unit: "match", value: srcPx,
    definition: { summary: "Raw px regex hits inside the token source, which the scanner exempts.", regex: SCANNER_PX_RE, fileSet: ts.abs ? `the resolved token source (${ts.rel})` : "the resolved token source (none found)" },
    perFile: srcPx > 0 && ts.rel ? [{ file: ts.rel, count: srcPx }] : undefined,
    notes: [...noSource, ...outsideDirs, ...selfNotes],
  });
  out.push(ratioCounter({
    id: "colour.token_source.colour_share",
    definition: { summary: "Share of all colour-literal hits (token source + audited files) that sit in the token source.", regexes: [{ label: "hex literal", regex: SCANNER_HEX_RE }, { label: "colour function call", regex: SCANNER_COLOR_FN_RE }], fileSet: "the token source and the audited files" },
    notes: [...noSource, ...outsideDirs, ...skippedNotes],
  }, srcColour, srcColour + scan.critical));
  out.push(ratioCounter({
    id: "colour.token_source.px_share",
    definition: { summary: "Share of all px hits (token source + audited files) that sit in the token source.", regex: SCANNER_PX_RE, fileSet: "the token source and the audited files" },
    notes: [...noSource, ...outsideDirs, ...skippedNotes],
  }, srcPx, srcPx + scan.warnings));

  // ── hex literals outside the token source ───────────────────────────────
  const hexFamilies = [
    {
      key: "hex6", acc: hex6, re: HEX6_RE,
      label: "6-digit hex literals (`#rrggbb`), HTML numeric entities (&#123456;) excluded",
      notes: ["The oracle's regex: counts a `url(#aabbcc)` svg id reference and ignores 3/4/8-digit hex."],
    },
    {
      key: "hex_scanner", acc: hexS, re: SCANNER_HEX_RE,
      label: "hex literals (3, 4, 6 or 8 digits) by the drift scanner's regex — not an HTML entity, a `url(#id)` reference, an `href` fragment or an issue number after an issue word",
      notes: [
        "Same file set as hex6; only the regex differs. It is the regex `systemix drift scan` uses (PATTERNS.HEX_RE), imported, not copied.",
        "Known false positives, because a regex cannot tell them from a colour: an issue number with no issue word before it (#123), and an element id spelt in hex digits outside an href (#add, #bad, #fade).",
      ],
    },
  ];
  for (const fam of hexFamilies) {
    const { acc } = fam;
    const total = sum(acc.files);
    const common = {
      kind: "mechanical",
      definition: { regex: fam.re, fileSet: TS_SET },
    };
    const scope = {
      mockups: mockupSplit(acc.files),
      otherExtensions: acc.other,
    };
    const scopeNote = "otherExtensions = hits in audited files that are not ts/tsx (css, js, …); mockups = hits in files whose path contains 'mockup'.";
    add({
      ...common, id: `colour.${fam.key}.outside_token_source`, unit: "match", value: total,
      definition: { ...common.definition, summary: `Occurrences of ${fam.label}, outside the token source.` },
      perFile: acc.files, detail: scope, notes: [...fam.notes, scopeNote],
    });
    add({
      ...common, id: `colour.${fam.key}.outside_token_source_files`, unit: "file", value: acc.files.size,
      definition: { ...common.definition, summary: `Files holding at least one of the ${fam.key} hits (perFile count = hits in the file).` },
      perFile: acc.files,
    });
    add({
      ...common, id: `colour.${fam.key}.outside_token_source_distinct`, unit: "distinct", value: acc.distinct.size,
      definition: { ...common.definition, summary: "Distinct hex values among those hits (lowercased, 3→6 and 4→8 digit expansion)." },
    });
    add({
      ...common, id: `colour.${fam.key}.equals_token`, unit: "match", value: sum(acc.eq),
      definition: { ...common.definition, summary: `Hits whose normalised value equals a hex declared as a custom-property value in the token source (${declared.size} distinct).` },
      perFile: acc.eq, detail: { mockups: mockupSplit(acc.eq) }, notes: ["Exact string match after lowercasing and 3→6 / 4→8 digit expansion; no perceptual comparison, no alpha stripping.", ...noEquality],
    });
    add({
      ...common, id: `colour.${fam.key}.not_token`, unit: "match", value: sum(acc.neq),
      definition: { ...common.definition, summary: "Hits whose normalised value matches no hex declared in the token source." },
      perFile: acc.neq, detail: { mockups: mockupSplit(acc.neq) }, notes: noEquality,
    });
  }

  // ── colour function calls outside the token source ──────────────────────
  for (const fn of fns) {
    add({
      id: `colour.${fn.key}_fn.outside_token_source`, kind: "mechanical", unit: "match", value: sum(fn.files),
      definition: { summary: `Calls of ${fn.label} outside the token source.`, regex: fn.re, fileSet: TS_SET },
      perFile: fn.files,
      detail: { mockups: mockupSplit(fn.files), otherExtensions: fn.other, withVarArgument: fn.varArg },
      notes: ["withVarArgument = calls whose first argument is var(…), i.e. token-based, not a raw literal; they are included in the value. otherExtensions = hits in audited files that are not ts/tsx."],
    });
  }

  // ── Tailwind classes ────────────────────────────────────────────────────
  // a class is found in two steps: tokenise (CLASS_TOKEN_RE, group 1; leading "/" and trailing ":" "/" trimmed; variants and !/- markers stripped), then test the token
  const tokenStep = { label: "class token (group 1; leading \"/\" and trailing \":\" \"/\" trimmed, variant prefixes and !/- markers stripped)", regex: CLASS_TOKEN_RE };
  const classRegexes = (label, regex) => [tokenStep, { label, regex }];
  add({
    id: "colour.palette_class.matches", kind: "mechanical", unit: "match", value: sum(cls.palette),
    definition: {
      summary: "Tailwind default-palette colour classes: (bg|text|border|ring|fill|stroke|outline|divide|from|via|to)-<hue>-<50..950>, with an optional opacity modifier. white and black are out of the definition (see colour.white_black_class.matches).",
      regexes: classRegexes("palette class, tested on each token", PALETTE_RE),
      fileSet: AUDITED_SET,
    },
    perFile: cls.palette,
    detail: { distinct: cls.distinct.size, classes: [...cls.distinct].sort(byString).slice(0, 25) },
    notes: [
      "Any token in a file counts, in code, in a comment or in prose (JSX text, escaped quotes, a trailing comma or period); there is no className parsing. Punctuation ends a token, so a class touching , . ) > ] ; is still read.",
      "Hues are the 22 classic Tailwind default hues (slate … rose); the v4.2 neutrals (mauve, olive, mist, taupe) are not included.",
    ],
  });
  add({
    id: "colour.palette_class.files", kind: "mechanical", unit: "file", value: cls.palette.size,
    definition: { summary: "Files holding at least one default-palette colour class (perFile count = classes in the file).", regexes: classRegexes("palette class, tested on each token", PALETTE_RE), fileSet: AUDITED_SET },
    perFile: cls.palette,
  });
  add({
    id: "colour.palette_class.extra_matches", kind: "mechanical", unit: "match", value: sum(cls.extra),
    definition: {
      summary: "The same <hue>-<shade> shape on utilities outside the pinned family list: accent, caret, decoration, shadow, placeholder, ring-offset, directional border (border-t/r/b/l/x/y/s/e), inset-shadow, inset-ring, drop-shadow. Disjoint from colour.palette_class.matches.",
      regexes: classRegexes("palette-shaped class on an extra utility, tested on each token", EXTRA_PALETTE_RE),
      fileSet: AUDITED_SET,
    },
    perFile: cls.extra,
    notes: ["Exposed so a rule 'no raw palette classes' is not read as satisfied just because border-t-red-500 sits outside the pinned family list."],
  });
  add({
    id: "colour.arbitrary_colour_class.matches", kind: "mechanical", unit: "match", value: sum(cls.arbitrary),
    definition: {
      summary: "Colour-utility arbitrary classes whose bracket holds a hex, rgb(a), hsl(a) or oklch literal, e.g. bg-[#a8511a], text-[rgba(0,0,0,.5)].",
      regexes: [tokenStep, { label: "colour utility with a bracket value, tested on each token", regex: ARBITRARY_COLOUR_RE }, { label: "the bracket must hold a colour literal", regex: COLOUR_LITERAL_RE }],
      fileSet: AUDITED_SET,
    },
    perFile: cls.arbitrary,
    notes: [
      "Arbitrary-property classes ([box-shadow:…rgba(…)]) are a different shape: see colour.arbitrary_property_class.colour_literals.",
      "The bracket is read up to its first `]`, so a value holding its own [..] (bg-[color-mix(in_srgb,var(--c[0]),#fff)]) is not counted here.",
    ],
  });
  add({
    id: "colour.arbitrary_property_class.colour_literals", kind: "mechanical", unit: "match", value: sum(cls.property),
    definition: {
      summary: "Arbitrary-property classes ([property:value]) whose value holds a hex, rgb(a), hsl(a) or oklch literal.",
      regexes: [tokenStep, { label: "arbitrary property [property:value], tested on each token", regex: ARBITRARY_PROPERTY_RE }, { label: "the value must hold a colour literal", regex: COLOUR_LITERAL_RE }],
      fileSet: AUDITED_SET,
    },
    perFile: cls.property,
  });
  add({
    id: "colour.white_black_class.matches", kind: "mechanical", unit: "match", value: sum(cls.whiteBlack),
    definition: {
      summary: "Colour utilities on white or black, e.g. text-white, bg-black/50. Outside the palette-class definition; counted here so the boundary is on record.",
      regexes: classRegexes("white/black utility, tested on each token", WHITE_BLACK_RE),
      fileSet: AUDITED_SET,
    },
    perFile: cls.whiteBlack,
  });

  return out;
}

module.exports = { group: GROUP, run };
