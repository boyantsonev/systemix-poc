"use strict";

/**
 * guardrails.js — what design/guardrails.mdx contains (its structure) and whether
 * the contrast ratios it states are arithmetically right. A static parse plus
 * WCAG arithmetic; whether the rules are good ones is for a reader to judge.
 *
 * Text rules (pinned):
 *   • only prose is read: the front matter and fenced code blocks are skipped
 *   • a unit = a heading, or a bullet with its continuation lines, or a paragraph;
 *     units are what the regexes run over, so a sentence wrapped across lines is
 *     read as one. A fenced block ends the unit it interrupts.
 *   • H2 section  = `^##[ \t]+\S` (column 0, a non-empty title; the same rule
 *     decisions.design_md.h2 uses). An indented or empty `##` still ends the unit
 *     before it, but is not counted as a section.
 *   • rule bullet = a top-level (unindented) list item: `^[-*+][ \t]+\S` or `^\d{1,3}[.)][ \t]+\S`
 *   • starred rule = a rule bullet whose text starts with ★ or ⭐ (optionally wrapped in ** or _)
 *   • exceptions   = distinct file-like `code spans` (a name with an extension, or a path ending
 *     in /) inside an "Exceptions:" / "Exempt:" clause (the rest of that bullet or paragraph, from
 *     the word on), or anywhere inside a section headed "Exceptions" / "Exemptions"
 *   • type-size / spacing rule = a rule bullet or heading that matches the vocabulary regexes below.
 *     Colour tokens such as `--text-primary` are not type sizes: only `--font-size*`, `--text-size*`
 *     and the Tailwind size names (`--text-xs … --text-9xl`, `text-sm`, `text-[13px]`) are.
 *
 * Contrast (WCAG 2.x, exact): relative luminance L = 0.2126 R + 0.7152 G + 0.0722 B with each
 * 8-bit sRGB channel c/255 linearised (c <= 0.03928 ? c/12.92 : ((c+0.055)/1.055)^2.4); ratio =
 * (L1 + 0.05) / (L2 + 0.05), L1 the lighter. Reported to 2 dp (half-up on the exact value);
 * the AA test uses the unrounded ratio. Only 3- and 6-digit hex colours take part (4/8-digit
 * alpha forms cannot be placed on a background and are ignored).
 *
 * Pair-detection rule — a pair is found in one unit, by any of:
 *   (a) "X on Y" phrasing: PAIR_ON_RE (hex, up to two words, on|over|against, up to three
 *       words, hex). X is the foreground, Y the background. A ratio claim `N:1` within 40
 *       characters after Y (no other hex between) is attached to the pair.
 *   (b) a lone hex followed within 40 characters (no other hex between) by a claim `N:1`
 *       (CLAIM_AFTER_RE). Its background is, in order:
 *         1. the hex after "on | over | against" right after the claim (ON_AFTER_RE:
 *            "`#fff` at 21:1 on `#000`");
 *         2. the hex written after the words background / backdrop / bg / surface in the same
 *            unit (BG_RE), when the unit names exactly one such colour;
 *         3. otherwise, if the unit also names a colour that is not used as a background and has
 *            no claim of its own, the background is ambiguous and the claim is UNRESOLVED;
 *         4. the token source's --background (then --color-background) in the theme of the NEAREST
 *            word "dark" or "light" in the unit (before or after the hex; the :root theme when the
 *            unit names neither; equally near to both = unresolved);
 *         5. the colors.background of DESIGN.md's front matter.
 *       If none resolves the claim is reported unresolved, never guessed.
 * A claim "matches" when the computed ratio, rounded to the claim's own decimals, equals it.
 * A threshold mention is not a claim: an `N:1` with wording such as meets / passes / minimum /
 * at least / required / AA / WCAG / ≥ before it, or "minimum" / "required" / "or better" / "+"
 * after it ("passes AAA (7:1)") states a limit, not the colour's own ratio. It is counted in
 * threshold_mentions (with its line and colour) and never compared. Limit of the rule: it is
 * wording-based, so a limit worded some other way is still read as a claim.
 *
 * Counter ids (API — keep stable):
 *   guardrails.file.exists | .lines | .bytes | .front_matter
 *   guardrails.structure.h2_sections | .rule_bullets | .starred_rules |
 *     .exception_clauses | .documented_exceptions
 *   guardrails.rules.type_size | .spacing_scale        presence of a rule (detail.lines)
 *   guardrails.contrast.hex_values                     distinct hex colours named in the prose
 *   guardrails.contrast.pairs                          pairs whose ratio could be computed (detail.pairs)
 *   guardrails.contrast.claims | .claims_unresolved | .claims_matching | .claims_not_matching
 *   guardrails.contrast.threshold_mentions             N:1 limits worded as a threshold, not a claim
 *   guardrails.contrast.pairs_below_4_5 | .lowest_ratio | .highest_ratio
 */

const layout = require("../layout");
const { counter, byString } = require("./counter");
const { HEX_SRC, capNotes, normalizeHex, parseHex, sortedByKey } = require("./util");
const { H2_RE, designColors, scanMarkdown } = require("./markdown");
const { themeColor, tokenThemes } = require("./css");

const GROUP = "guardrails";
const FILE = layout.rel.guardrails;
const AA_NORMAL = 4.5;
const ROW_CAP = 100;

// [^\n]* rather than .*: a lone \r or U+2028 stops `.`, and the closing `$` then fails after every backtrack step
const HEADING_RE = /^ {0,3}(#{1,6})[ \t]+([^\n]*)$/;
const BULLET_RE = /^([ \t]*)(?:[-*+]|\d{1,3}[.)])[ \t]+\S/;
const HR_RE = /^ {0,3}(?:[-*_][ \t]*){3,}$/;
const STAR_RE = /^(?:[-*+]|\d{1,3}[.)])[ \t]+[*_]{0,2}(?:★|⭐)/;
const EXC_TRIGGER_RE = /\b(?:exceptions?|exemptions?|exempt)\b[*_ \t]*:/i;
const EXC_HEADING_RE = /^(?:exceptions?|exemptions?)\b/i;
const CODE_SPAN_RE = /`([^`\n]{1,200})`/g;
const FILE_LIKE_RE = /^(?:[\w@~.*/-]*[\w*-])\.[A-Za-z][A-Za-z0-9]{0,7}$|^[\w@~.*/-]+\/$/;
const TYPE_SIZE_RE = /\bfont[- ]?sizes?\b|\b(?:type|text|typography|typographic)[- ](?:sizes?|scale|ramp)\b|\btext-(?:xs|sm|base|lg|[2-9]?xl)\b|\btext-\[(?:length:)?\.?\d/i;
const SPACING_RE = /(?<![\w-])spacing\b|--spacing\b|--space-[\w-]+|(?<![\w-])space[- ]scale\b|(?<![\w-])(?:paddings?|margins?)\b/i;

const HEX_CAP = `(${HEX_SRC})`;
// The runs of quote/emphasis marks are bounded ({0,8}): two adjacent unbounded runs around an optional group
// made one long line of "(" cost quadratic time
const PAIR_ON_RE = new RegExp(
  `${HEX_CAP}[\`*_"')]{0,8}(?:[ \\t]+[a-z-]+){0,2}[ \\t]+(?:on|over|against)[ \\t]+[\`*_("']{0,8}(?:[a-z-]+[ \\t]+){0,3}[\`*_("']{0,8}${HEX_CAP}`,
  "gi",
);
// right after a lone claim: "… 21:1 on `#000`" → the background
const ON_AFTER_RE = new RegExp(
  `^[\`*_"')\\].,;:]{0,8}(?:[ \\t]+[a-z-]+){0,2}[ \\t]+(?:on|over|against)[ \\t]+[\`*_("']{0,8}(?:[a-z-]+[ \\t]+){0,3}[\`*_("']{0,8}${HEX_CAP}`,
  "i",
);
const BG_RE = new RegExp(`\\b(?:background|backdrop|bg|surface)\\b[^#\\n]{0,24}?${HEX_CAP}`, "gi");
// group 1 = the words between the colour and the claim, 2 = the ratio's number
const CLAIM_AFTER_RE = /^([^#\n]{0,40}?)(?<![\d.])(\d{1,2}(?:\.\d{1,3})?)[ \t]*:[ \t]*1(?!\d)/;
// wording that makes an N:1 a limit rather than the colour's own ratio. Comparison signs count only as signs:
// the ">" of an arrow ("-> 15.1:1", "=> 15.1:1") or the "<" of "<-" points at a claim, it does not limit one
const THRESHOLD_BEFORE_RE = /\b(?:meets?|passes?|passing|minimum|min|at least|required?|requires?|requirement|threshold|exceeds?|AAA?|WCAG)\b|[≥≤]|(?<![-=])>=?|<(?!-)=?/i;
const THRESHOLD_AFTER_RE = /^[)\]`*_"',.;: \t]*(?:\+|or[ \t]+(?:better|higher|more|above|greater)\b|min(?:imum)?\b|required\b|threshold\b)/i;
const THEME_WORD_RE = /\b(dark|light)\b/gi;
const HEX_GLOBAL_RE = new RegExp(HEX_SRC, "g");

// ── WCAG arithmetic ─────────────────────────────────────────────────────────

const channel = (v) => {
  const c = v / 255;
  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
};

/** WCAG relative luminance of an [r, g, b] triple (0..255). */
function luminance([r, g, b]) {
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/** WCAG contrast ratio of two [r, g, b] triples, unrounded (1..21). */
function contrastRatio(a, b) {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

const round2 = (n) => Number(n.toFixed(2));
const round4 = (n) => Number(n.toFixed(4));
const decimalsOf = (s) => (s.includes(".") ? s.length - s.indexOf(".") - 1 : 0);

// ── markdown units ──────────────────────────────────────────────────────────

/**
 * Prose lines → units. Each unit: {kind: heading|bullet|paragraph, startLine, indent,
 * level and raw (headings: the depth and the source line), text (lines joined by one
 * space), lineStarts}.
 */
function proseUnits(lines) {
  const units = [];
  let cur = null;
  const close = () => { if (cur) units.push(cur); cur = null; };
  const open = (kind, l, extra = {}) => {
    cur = { kind, startLine: l.n, indent: 0, level: 0, text: l.text, lineStarts: [{ n: l.n, at: 0 }], ...extra };
  };
  for (const l of lines) {
    if (l.fenced) { close(); continue; }
    if (!l.text.trim()) { close(); continue; }
    const h = HEADING_RE.exec(l.text);
    if (h) {
      close();
      open("heading", l, { level: h[1].length, text: trimClosing(h[2]), raw: l.text });
      close();
      continue;
    }
    const b = !HR_RE.test(l.text) && BULLET_RE.exec(l.text);
    if (b) {
      close();
      open("bullet", l, { indent: b[1].length });
    } else if (cur) {
      cur.lineStarts.push({ n: l.n, at: cur.text.length + 1 });
      cur.text += " " + l.text;
    } else {
      open("paragraph", l);
    }
  }
  close();
  return units;
}

/** Heading text without trailing blanks and the optional closing # sequence (manual: no backtracking regex). */
function trimClosing(title) {
  let end = title.length;
  while (end > 0 && (title[end - 1] === " " || title[end - 1] === "\t")) end--;
  let hashes = end;
  while (hashes > 0 && title[hashes - 1] === "#") hashes--;
  if (hashes < end && (hashes === 0 || title[hashes - 1] === " " || title[hashes - 1] === "\t")) end = hashes;
  while (end > 0 && (title[end - 1] === " " || title[end - 1] === "\t")) end--;
  return title.slice(0, end);
}

/** 1-based file line of a character offset inside a unit (binary search over the unit's line starts). */
function lineAt(unit, offset) {
  const starts = unit.lineStarts;
  let lo = 0;
  let hi = starts.length - 1;
  let line = unit.startLine;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (starts[mid].at <= offset) { line = starts[mid].n; lo = mid + 1; } else hi = mid - 1;
  }
  return line;
}

const hexMatches = (text) => [...text.matchAll(HEX_GLOBAL_RE)].map((m) => ({ index: m.index, end: m.index + m[0].length, hex: m[0] }));

// ── contrast pairs ──────────────────────────────────────────────────────────

/** The `N:1` right after `from` in `text` → {value, end, threshold}, or null. threshold = worded as a limit, not a ratio. */
function claimAfter(text, from) {
  const m = CLAIM_AFTER_RE.exec(text.slice(from, from + 60));
  if (!m) return null;
  const end = from + m[0].length;
  const threshold = THRESHOLD_BEFORE_RE.test(m[1]) || THRESHOLD_AFTER_RE.test(text.slice(end, end + 24));
  return { value: m[2], end, threshold };
}

/** The dark/light words of a unit, in order: [{at, end, theme}]. */
const themeWords = (text) => [...text.matchAll(THEME_WORD_RE)].map((m) => ({ at: m.index, end: m.index + m[0].length, theme: m[1].toLowerCase() }));

/**
 * Theme of the nearest dark/light word to the span [start, end) of a unit, before or after it.
 * "light" when the unit names neither; null when the nearest two are equally near and differ.
 */
function nearestTheme(words, start, end) {
  if (!words.length) return "light";
  let lo = 0;
  let hi = words.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (words[mid].at >= end) hi = mid; else lo = mid + 1;
  }
  const before = lo > 0 ? words[lo - 1] : null;
  const after = lo < words.length ? words[lo] : null;
  if (!before) return after.theme;
  if (!after) return before.theme;
  const db = start - before.end;
  const da = after.at - end;
  if (db === da && before.theme !== after.theme) return null;
  return da < db ? after.theme : before.theme;
}

/** The page background of one theme from the token source (then DESIGN.md): {hex, via, note}; hex null when nothing resolves. */
function themeBackground(ctx, key, cache) {
  if (cache.has(key)) return cache.get(key);
  const themes = tokenThemes(ctx);
  const found = themeColor(themes, key, ["--background", "--color-background"]);
  let result;
  if (found && found.hex) {
    result = { hex: found.hex, via: `token source ${found.name} (${key === "dark" ? ".dark" : ":root"})` };
  } else {
    const note = found ? `${found.name} in the ${key} theme is "${found.value}", not a hex colour` : null;
    const design = designColors(ctx).colors.find((c) => c.name === "background");
    const fromDesign = design && normalizeHex(design.value);
    result = fromDesign
      ? { hex: fromDesign, via: "DESIGN.md front matter colors.background", note }
      : { hex: null, via: null, note: note ?? capNotes(ctx, ctx.tokenSource && ctx.tokenSource.rel ? [ctx.tokenSource.rel] : [])[0] ?? "no background named in the bullet, no --background in the token source, no colors.background in DESIGN.md" };
  }
  cache.set(key, result);
  return result;
}

const listHex = (hexes, total = hexes.length) => hexes.slice(0, 3).join(", ") + (total > 3 ? ` and ${total - 3} more` : "");

function findPairs(ctx, units) {
  const pairs = [];
  const unresolved = [];
  const thresholds = [];
  const bgCache = new Map();
  for (const unit of units) {
    if (unit.kind === "heading") continue;
    const text = unit.text;
    const tokens = hexMatches(text);
    if (!tokens.length) continue;
    const used = new Set();

    // (a) "X on Y"
    for (const m of text.matchAll(PAIR_ON_RE)) {
      const posB = m.index + m[0].length - m[2].length;
      const fg = parseHex(m[1]);
      const bg = parseHex(m[2]);
      used.add(m.index);
      used.add(posB);
      if (!fg || !bg) continue;
      const tail = claimAfter(text, m.index + m[0].length);
      const claimed = tail && !tail.threshold ? tail.value : null;
      const pair = makePair(unit, m.index, normalizeHex(m[1]), normalizeHex(m[2]), fg, bg, "X on Y phrasing", claimed);
      pairs.push(pair);
      if (tail && tail.threshold) thresholds.push({ line: pair.line, foreground: pair.foreground, threshold: tail.value });
    }

    // colours written after background / backdrop / bg / surface
    const explicit = [];
    for (const m of text.matchAll(BG_RE)) {
      const posB = m.index + m[0].length - m[1].length;
      if (used.has(posB)) continue;
      // "On the dark surface, body text #EFE5D3 at 15.1:1": the colour has a claim of its own, so it is a
      // foreground that happens to follow the word "surface", not the background
      const own = claimAfter(text, posB + m[1].length);
      if (own && !own.threshold) continue;
      used.add(posB);
      explicit.push({ hex: m[1], index: posB });
    }
    const explicitHexes = [...new Set(explicit.map((e) => normalizeHex(e.hex)))];

    // (b) lone colours: the claim after each, and a background named right after the claim
    const claimOf = new Map();
    const onBg = new Map();
    for (const t of tokens) {
      if (used.has(t.index)) continue;
      const c = claimAfter(text, t.end);
      if (!c) continue;
      claimOf.set(t.index, c);
      if (c.threshold) continue;
      const on = ON_AFTER_RE.exec(text.slice(c.end, c.end + 80));
      if (!on) continue;
      const index = c.end + on[0].length - on[1].length;
      onBg.set(t.index, { hex: on[1], index });
      used.add(index); // a background is not also read as a foreground
    }

    // colours the unit names that are nobody's background and carry no claim: possible backgrounds
    const unclaimed = new Set();
    for (const t of tokens) if (!used.has(t.index) && !claimOf.has(t.index)) unclaimed.add(normalizeHex(t.hex));

    let words = null;
    for (const t of tokens) {
      if (used.has(t.index)) continue;
      const c = claimOf.get(t.index);
      if (!c) continue;
      const fgHex = normalizeHex(t.hex);
      const line = lineAt(unit, t.index);
      if (c.threshold) { thresholds.push({ line, foreground: fgHex, threshold: c.value }); continue; }
      const fg = parseHex(t.hex);
      const skip = (reason) => unresolved.push({ line, foreground: fgHex, claimed: c.value, reason });

      const on = onBg.get(t.index);
      if (on) {
        pairs.push(makePair(unit, t.index, fgHex, normalizeHex(on.hex), fg, parseHex(on.hex), "background named after the claim (on, over or against)", c.value));
        continue;
      }
      if (explicitHexes.length === 1) {
        pairs.push(makePair(unit, t.index, fgHex, explicitHexes[0], fg, parseHex(explicitHexes[0]), "background named in the same bullet", c.value));
        continue;
      }
      if (explicitHexes.length > 1) {
        skip(`the ${unit.kind} names ${explicitHexes.length} different backgrounds (${listHex(explicitHexes)}) and does not say which one this colour sits on`);
        continue;
      }
      const otherCount = unclaimed.size - (unclaimed.has(fgHex) ? 1 : 0);
      if (otherCount > 0) {
        const named = [];
        for (const h of unclaimed) {
          if (h !== fgHex) named.push(h);
          if (named.length === 3) break;
        }
        skip(`the ${unit.kind} also names ${listHex(named, otherCount)} without saying which is the background (no on / over / against after the claim, no "background" word)`);
        continue;
      }
      words = words ?? themeWords(text);
      const key = nearestTheme(words, t.index, t.end);
      if (key === null) { skip('the nearest "dark" and "light" words are equally close to this colour, so its theme is unknown'); continue; }
      const bgInfo = themeBackground(ctx, key, bgCache);
      if (!bgInfo.hex) { skip(bgInfo.note ?? "no background"); continue; }
      pairs.push(makePair(unit, t.index, fgHex, bgInfo.hex, fg, parseHex(bgInfo.hex), bgInfo.via, c.value));
    }
  }
  const byPos = (a, b) => a.line - b.line || byString(a.foreground, b.foreground);
  return { pairs: pairs.sort(byPos), unresolved: unresolved.sort(byPos), thresholds: thresholds.sort(byPos) };
}

function makePair(unit, offset, fgHex, bgHex, fg, bg, via, claimed) {
  const raw = contrastRatio(fg, bg);
  const claim = claimed ? String(claimed) : null;
  return {
    line: lineAt(unit, offset),
    foreground: fgHex,
    background: bgHex,
    backgroundVia: via,
    ratio: round2(raw),
    ratioRaw: round4(raw),
    meetsAa: raw >= AA_NORMAL,
    claimed: claim,
    claimMatches: claim === null ? null : Number(raw.toFixed(decimalsOf(claim))) === Number(claim),
  };
}

// ── exceptions ──────────────────────────────────────────────────────────────

const fileSpans = (text) => [...text.matchAll(CODE_SPAN_RE)].map((m) => m[1].trim()).filter((s) => FILE_LIKE_RE.test(s));

function findExceptions(units) {
  const files = new Set();
  const clauses = [];
  let sectionLevel = 0;
  for (const u of units) {
    if (u.kind === "heading") {
      if (sectionLevel && u.level <= sectionLevel) sectionLevel = 0;
      if (EXC_HEADING_RE.test(u.text.replace(/[*_`]/g, "").trim())) sectionLevel = u.level;
      continue;
    }
    const trigger = EXC_TRIGGER_RE.exec(u.text);
    if (trigger) {
      const found = fileSpans(u.text.slice(trigger.index));
      clauses.push({ line: lineAt(u, trigger.index), files: [...new Set(found)].sort(byString) });
      for (const f of found) files.add(f);
    } else if (sectionLevel) {
      for (const f of fileSpans(u.text)) files.add(f);
    }
  }
  return { files: [...files].sort(byString), clauses };
}

// ── run ─────────────────────────────────────────────────────────────────────

function run(ctx) {
  const out = [];
  const exists = ctx.exists(FILE) && !ctx.isDirectory(FILE);
  const text = exists ? ctx.read(FILE) : "";
  const missing = exists ? [] : [`${FILE} does not exist`];
  if (exists && !text) {
    missing.push(ctx.skippedReads([FILE]).length
      ? `${FILE} is over the 5 MB read cap and was not read, so a 0 here is not a measurement`
      : `${FILE} is empty, so nothing could be read`);
  }
  const md = scanMarkdown(text);
  const units = proseUnits(md.lines);
  const base = { group: GROUP, singleFile: FILE }; // every counter here reads the one guardrails file
  const noteIf = (cond, ...n) => (cond ? n : undefined);
  const missNote = missing.length ? missing : undefined;

  // ── file ──
  out.push(counter({ ...base, id: "guardrails.file.exists", kind: "presence", unit: "boolean", value: exists,
    definition: { summary: `${FILE} exists as a file`, regex: null, fileSet: FILE },
    notes: noteIf(!exists, `${FILE} does not exist`) }));
  out.push(counter({ ...base, id: "guardrails.file.lines", kind: "mechanical", unit: "number", value: ctx.lineCount(text),
    definition: { summary: "Line count as `wc -l` counts it (a last line without a newline still counts)", regex: null, fileSet: FILE },
    notes: missNote }));
  out.push(counter({ ...base, id: "guardrails.file.bytes", kind: "mechanical", unit: "number", value: Buffer.byteLength(text, "utf8"),
    definition: { summary: "UTF-8 size of the text as read (BOM stripped, CRLF read as LF)", regex: null, fileSet: FILE },
    notes: [...(missNote ?? []), "equals `wc -c` unless the file has a BOM or CRLF line endings"] }));
  out.push(counter({ ...base, id: "guardrails.file.front_matter", kind: "presence", unit: "boolean", value: md.front.present,
    definition: { summary: "The file opens with a --- front-matter block", regex: "^---[ \\t]*$", fileSet: FILE },
    notes: missNote }));

  // ── structure ──
  const sections = [];
  const rules = [];
  let current = "(before the first H2)";
  let nested = 0;
  for (const u of units) {
    if (u.kind === "heading") {
      if (u.level === 2 && H2_RE.test(u.raw)) { sections.push({ line: u.startLine, title: u.text }); current = u.text; }
      continue;
    }
    if (u.kind !== "bullet") continue;
    if (u.indent === 0) {
      rules.push({ line: u.startLine, section: current, starred: STAR_RE.test(u.text), text: u.text.replace(/^(?:[-*+]|\d{1,3}[.)])[ \t]+/, "").replace(/\s+/g, " ").slice(0, 100) });
    } else {
      nested++;
    }
  }
  const bySection = new Map(); // keyed by heading text: a section called "constructor" or "__proto__" is a key like any other
  for (const r of rules) bySection.set(r.section, (bySection.get(r.section) ?? 0) + 1);
  out.push(counter({ ...base, id: "guardrails.structure.h2_sections", kind: "mechanical", unit: "line", value: sections.length,
    definition: { summary: "Level-2 headings in the prose (front matter and fenced code skipped): `##` at column 0 followed by a non-empty title. An indented or empty `##` is not counted", regex: H2_RE, fileSet: FILE },
    detail: { titles: sections.slice(0, ROW_CAP) },
    notes: missNote }));
  out.push(counter({ ...base, id: "guardrails.structure.rule_bullets", kind: "mechanical", unit: "line", value: rules.length,
    definition: { summary: "Top-level (unindented) list items: the rules. Indented sub-items are not counted", regex: "^(?:[-*+]|\\d{1,3}[.)])[ \\t]+\\S", fileSet: FILE },
    detail: { bySection: sortedByKey(bySection), nestedBullets: nested, rules: rules.slice(0, ROW_CAP) },
    notes: missNote }));
  out.push(counter({ ...base, id: "guardrails.structure.starred_rules", kind: "mechanical", unit: "line", value: rules.filter((r) => r.starred).length,
    definition: { summary: "Rule bullets that start with ★ or ⭐ (optionally inside ** or _): the rules the file marks as the ones enforced", regex: STAR_RE, fileSet: FILE },
    detail: { rules: rules.filter((r) => r.starred).slice(0, ROW_CAP) },
    notes: missNote }));
  const exc = findExceptions(units);
  out.push(counter({ ...base, id: "guardrails.structure.exception_clauses", kind: "mechanical", unit: "number", value: exc.clauses.length,
    definition: { summary: "Bullets or paragraphs containing an \"Exceptions:\" / \"Exemptions:\" / \"Exempt:\" clause", regex: EXC_TRIGGER_RE, fileSet: FILE },
    detail: { clauses: exc.clauses.slice(0, ROW_CAP) },
    notes: missNote }));
  out.push(counter({ ...base, id: "guardrails.structure.documented_exceptions", kind: "mechanical", unit: "distinct", value: exc.files.length,
    definition: {
      summary: "Distinct file-like `code spans` (a name with an extension, or a path ending in /) in an exceptions clause or in a section headed Exceptions",
      regexes: [{ label: "a `code span`", regex: CODE_SPAN_RE }, { label: "kept when it is file-like", regex: FILE_LIKE_RE }],
      fileSet: FILE,
    },
    detail: { files: exc.files },
    notes: [...(missNote ?? []), "an exception named in prose without a `code span` is not counted"] }));

  // ── rule vocabulary ──
  const ruleUnits = units.filter((u) => u.kind === "heading" || (u.kind === "bullet" && u.indent === 0));
  for (const [id, re, label] of [
    ["type_size", TYPE_SIZE_RE, "a type-size"],
    ["spacing_scale", SPACING_RE, "a spacing"],
  ]) {
    const hits = ruleUnits.filter((u) => re.test(u.text));
    out.push(counter({ ...base, id: `guardrails.rules.${id}`, kind: "presence", unit: "boolean", value: hits.length > 0,
      definition: {
        summary: `True when a rule bullet or heading mentions ${label} vocabulary (a text match, not a judgement that the rule is sound)`,
        regex: re,
        fileSet: FILE,
      },
      detail: { lines: hits.slice(0, 20).map((u) => u.startLine) },
      notes: missNote }));
  }

  // ── contrast ──
  const hexes = new Set();
  for (const u of units) if (u.kind !== "heading") for (const t of hexMatches(u.text)) hexes.add(normalizeHex(t.hex));
  const { pairs, unresolved, thresholds } = findPairs(ctx, units);
  const claimed = pairs.filter((p) => p.claimed !== null);
  const pairRegexes = [
    { label: "an 'X on Y' pair of colours", regex: PAIR_ON_RE },
    { label: "a contrast claim N:1 after a colour", regex: CLAIM_AFTER_RE },
    { label: "the background named right after a claim (on / over / against)", regex: ON_AFTER_RE },
    { label: "a colour written after the word background / backdrop / bg / surface", regex: BG_RE },
    { label: "wording before an N:1 that makes it a limit, not a claim", regex: THRESHOLD_BEFORE_RE },
    { label: "wording after an N:1 that makes it a limit, not a claim", regex: THRESHOLD_AFTER_RE },
    { label: "a theme word (dark / light) that picks the page background", regex: THEME_WORD_RE },
  ];
  const ratios = pairs.map((p) => p.ratio);
  const pairDef = (summary) => ({ summary, regexes: pairRegexes, fileSet: FILE });
  out.push(counter({ ...base, id: "guardrails.contrast.hex_values", kind: "mechanical", unit: "distinct", value: hexes.size,
    definition: { summary: "Distinct 3/6-digit hex colours named in the prose (case-insensitive, 3 digits expanded), HTML entities and anchors excluded", regex: HEX_SRC, fileSet: FILE },
    detail: { values: [...hexes].sort(byString).slice(0, ROW_CAP) },
    notes: missNote }));
  out.push(counter({ ...base, id: "guardrails.contrast.pairs", kind: "mechanical", unit: "number", value: pairs.length,
    definition: pairDef("Foreground/background hex pairs the file names (see the module header for the pair-detection rule), each with its WCAG contrast ratio to 2 dp"),
    detail: { pairs: pairs.slice(0, ROW_CAP) },
    notes: [...(missNote ?? []), "ratio is WCAG 2.x relative-luminance contrast; ratioRaw is the same to 4 dp"] }));
  out.push(counter({ ...base, id: "guardrails.contrast.claims", kind: "mechanical", unit: "number", value: claimed.length + unresolved.length,
    definition: pairDef("Contrast claims of the form N:1 attached to a hex colour, whether or not a background could be resolved"),
    detail: { resolved: claimed.length, unresolved: unresolved.length },
    notes: missNote }));
  out.push(counter({ ...base, id: "guardrails.contrast.claims_unresolved", kind: "mechanical", unit: "number", value: unresolved.length,
    definition: pairDef("Contrast claims whose background could not be resolved, so the ratio was not recomputed"),
    detail: { claims: unresolved.slice(0, ROW_CAP) },
    notes: missNote }));
  out.push(counter({ ...base, id: "guardrails.contrast.claims_matching", kind: "mechanical", unit: "number", value: claimed.filter((p) => p.claimMatches).length,
    definition: pairDef("Resolved claims whose stated ratio equals the recomputed ratio rounded to the claim's own decimals"),
    notes: missNote }));
  out.push(counter({ ...base, id: "guardrails.contrast.claims_not_matching", kind: "mechanical", unit: "number", value: claimed.filter((p) => !p.claimMatches).length,
    definition: pairDef("Resolved claims whose stated ratio differs from the recomputed one"),
    detail: { claims: claimed.filter((p) => !p.claimMatches).slice(0, ROW_CAP) },
    notes: missNote }));
  out.push(counter({ ...base, id: "guardrails.contrast.threshold_mentions", kind: "mechanical", unit: "number", value: thresholds.length,
    definition: pairDef("N:1 figures attached to a hex colour but worded as a limit (meets / passes / minimum / at least / required / AA / WCAG / ≥ …), not as that colour's own ratio. Not counted as claims and never compared"),
    detail: { mentions: thresholds.slice(0, ROW_CAP) },
    notes: [...(missNote ?? []), "wording-based: a limit worded some other way is still read as a claim"] }));
  out.push(counter({ ...base, id: "guardrails.contrast.pairs_below_4_5", kind: "mechanical", unit: "number", value: pairs.filter((p) => !p.meetsAa).length,
    definition: pairDef(`Pairs whose unrounded ratio is below ${AA_NORMAL}:1 (the WCAG AA threshold for normal text; large text needs only 3:1 and is not distinguished)`),
    detail: { pairs: pairs.filter((p) => !p.meetsAa).slice(0, ROW_CAP) },
    notes: missNote }));
  for (const [id, pick, word] of [["lowest_ratio", Math.min, "lowest"], ["highest_ratio", Math.max, "highest"]]) {
    out.push(counter({ ...base, id: `guardrails.contrast.${id}`, kind: "mechanical", unit: "number", value: ratios.length ? ratios.reduce((a, b) => pick(a, b)) : null,
      definition: pairDef(`The ${word} recomputed ratio among the pairs, 2 dp`),
      notes: ratios.length ? undefined : [...(missNote ?? []), "no foreground/background pair could be computed"] }));
  }
  return out;
}

module.exports = { group: GROUP, run };
