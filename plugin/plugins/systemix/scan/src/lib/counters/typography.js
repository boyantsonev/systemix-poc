"use strict";

/**
 * typography.js — type-size utilities and type tokens in the audited population.
 * Regex hits and set comparisons; nothing here says a hit is a violation.
 *
 * Counter ids (API — keep them stable):
 *
 * Arbitrary font-size utilities, `text-[<n>px|rem]`, in audited code files
 * (ts, tsx, js, jsx, vue, svelte — css is not code here; its @apply is below):
 *   typography.arbitrary_size.matches          match     class matches (the unit the oracle's 265 is in)
 *   typography.arbitrary_size.lines            line      lines holding >= 1 match
 *   typography.arbitrary_size.files            file      files holding >= 1 match
 *   typography.arbitrary_size.px_matches       match     …spelled in px
 *   typography.arbitrary_size.rem_matches      match     …spelled in rem
 *   typography.arbitrary_size.distinct         distinct  distinct spellings (`13px` and `0.8125rem` are two)
 *   typography.arbitrary_size.below_12px       match     computed size < 12px (rem × 16)
 *   typography.arbitrary_size.equals_token     match     computed size equals a `--font-size-*` value of the token source
 *   typography.arbitrary_size.not_token        match     …equals none of them
 *   typography.arbitrary_size.not_token_files  file
 *   typography.arbitrary_size.other_form_matches match   `text-[length:…]`, `text-[1.2em]`, `text-[clamp(…)]`: sizes the main regex does not see
 * The same three headline numbers WITHOUT the files the repo's own guardrails exempt — emitted
 * only when design/guardrails.mdx declares an exemption that names an audited file, so a repo
 * that declares none gets no split:
 *   typography.arbitrary_size.matches_excluding_exempt / .lines_excluding_exempt / .files_excluding_exempt
 * Which files are exempt is read, never guessed: see typography.exempt.*. A mention that is
 * negated ("no exceptions", "never exempt", "Exceptions: none"), sits in fenced code or in an
 * HTML / MDX comment declares nothing; at most 200 references are resolved per run.
 *   typography.exempt.declared                 presence  guardrails.mdx names >= 1 file-like exemption
 *   typography.exempt.files                    file      audited files those exemptions resolve to
 *
 * Named standard sizes, `text-(xs|sm|base|lg|xl|2xl…9xl)`:
 *   typography.named_size.matches / .files     match / file   audited code files
 *   typography.css_apply.named_size_matches    match     …inside `@apply` in audited css AND the token source
 *   typography.css_apply.arbitrary_size_matches match    `text-[<n>px|rem]` inside `@apply`, same files
 * Line height and letter spacing:
 *   typography.leading_arbitrary.matches / .files    `leading-[…]`
 *   typography.tracking_arbitrary.matches / .files   `tracking-[…]`
 * Type tokens (`--font-size-*` is the family the comparison above uses; which `--font-size-*`
 * names exist and which have no consumer is the tokens group's fact, tokens.font_size.*):
 *   typography.token_family.zero_consumer_families distinct  type token families that are declared and referenced nowhere
 *
 * Units are never mixed: every number says match, line or file, and the
 * headline counters keep the in-ui/ and the exempt split in `detail`.
 */

const path = require("path");
const { byString, counter } = require("./counter");
const { CODE_EXTS, CODE_SET, AUDITED_SET, bump, cap, lineNumbers, sortedByCount, sum } = require("./util");
const { tokenCss } = require("./css");
const { BACKTICK_RE, EXEMPT_WORD_RE, declaredExemptions, exemptionDetail, scopeSplit, withoutExempt } = require("./exemptions");

const GROUP = "typography";
const PX_PER_REM = 16;
const SMALL_PX = 12;

const NUM = "(?:\\d+(?:\\.\\d+)?|\\.\\d+)";
// `(?<![\w-])` keeps `context-sm` and the custom property `--text-sm` out; a Tailwind
// prefix (`tw-text-sm`) is therefore not matched either.
const ARBITRARY_SIZE_RE = new RegExp(`(?<![\\w-])text-\\[(${NUM})(px|rem)\\]`, "g");
const OTHER_FORM_RE = new RegExp(
  `(?<![\\w-])text-\\[(?:length:[^\\]\\s]{1,80}|-?${NUM}(?:em|ex|ch|vw|vh|vmin|vmax|svh|dvh|lvh|pt|pc|cm|mm|in|%)|(?:calc|clamp|min|max)\\([^\\]\\s]{1,120}\\))\\]`,
  "g",
);
const NAMED_SIZE_RE = /(?<![\w-])text-(xs|sm|base|lg|xl|[2-9]xl)(?![\w-])/g;
const LEADING_RE = /(?<![\w-])leading-\[([^\]\s]{1,40})\]/g;
const TRACKING_RE = /(?<![\w-])tracking-\[([^\]\s]{1,40})\]/g;
const APPLY_RE = /@apply\s+([^;}]*)/g;
const LENGTH_VALUE_RE = new RegExp(`^\\s*(-?${NUM})(px|rem)(?:\\s*!important)?\\s*$`);
const VAR_REF_RE = /var\(\s*(--[\w-]+)/g;

const FAMILIES = [
  { key: "font_size", prefix: "--font-size-" },
  { key: "text", prefix: "--text-" },
  { key: "line_height", prefix: "--line-height-" },
  { key: "leading", prefix: "--leading-" },
  { key: "letter_spacing", prefix: "--letter-spacing-" },
  { key: "tracking", prefix: "--tracking-" },
  { key: "font_weight", prefix: "--font-weight-" },
];

// ── the --font-size-* tokens ──────────────────────────────────────────────

// rem x 16 is exact in binary floating point, so a rem size and the px size it equals compare with ===
const pxOf = (n, unit) => (unit === "rem" ? n * PX_PER_REM : n);

/** `--font-size-*` declarations of the token source (parsed once, comments ignored) → { name → px set }. */
function fontSizeTokens(ctx) {
  const names = new Map();
  const unresolved = new Set();
  let textLength = 0;
  for (const d of tokenCss(ctx).decls) {
    if (d.name.startsWith("--font-size-")) {
      if (!names.has(d.name)) names.set(d.name, new Set());
      const v = LENGTH_VALUE_RE.exec(d.value);
      if (v) names.get(d.name).add(pxOf(parseFloat(v[1]), v[2]));
      else unresolved.add(d.name);
    } else if (d.name.startsWith("--text-") && LENGTH_VALUE_RE.test(d.value)) {
      textLength++;
    }
  }
  const byPx = new Map();
  for (const [name, set] of names) {
    for (const px of set) {
      if (!byPx.has(px)) byPx.set(px, []);
      byPx.get(px).push(name);
    }
  }
  for (const list of byPx.values()) list.sort(byString);
  return { names, byPx, unresolved: [...unresolved].sort(byString), textLength };
}

function run(ctx) {
  const out = [];
  const add = (spec) => out.push(counter({ group: GROUP, ...spec }));
  const ex = declaredExemptions(ctx);
  const tokens = fontSizeTokens(ctx);
  const ts = ctx.tokenSource;
  const noSource = ts.abs ? [] : [`no token source resolved: ${ts.reason}`];
  const noSizeTokens = ts.abs && !tokens.names.size
    ? [`the token source (${ts.rel}) declares no --font-size-* custom property, so no size can equal one`]
    : [];
  const sourceSet = ts.abs ? `the resolved token source (${ts.rel})` : "the resolved token source (none found)";

  const code = ctx.audited.filter((f) => CODE_EXTS.has(path.extname(f.rel)));
  const cssAudited = ctx.audited.filter((f) => path.extname(f.rel) === ".css");

  // ── one pass over the audited code files ────────────────────────────────
  const arb = {
    matches: new Map(), lines: new Map(), px: 0, rem: 0, pxFiles: new Map(), remFiles: new Map(), byValue: new Map(), distinct: new Set(),
    small: new Map(), smallByValue: new Map(), eq: new Map(), neq: new Map(), eqByValue: new Map(), other: new Map(),
  };
  const named = { matches: new Map(), byClass: new Map() };
  const leading = { matches: new Map(), byValue: new Map() };
  const tracking = { matches: new Map(), byValue: new Map() };

  for (const f of code) {
    const text = ctx.read(f);
    if (!text) continue;

    const hits = [...text.matchAll(ARBITRARY_SIZE_RE)];
    if (hits.length) {
      const lineNos = new Set(lineNumbers(text, hits.map((m) => m.index)));
      arb.matches.set(f.rel, hits.length);
      arb.lines.set(f.rel, lineNos.size);
      for (const m of hits) {
        const spelled = `${m[1]}${m[2]}`;
        const px = pxOf(parseFloat(m[1]), m[2]);
        if (m[2] === "px") { arb.px++; bump(arb.pxFiles, f.rel); } else { arb.rem++; bump(arb.remFiles, f.rel); }
        bump(arb.byValue, spelled);
        arb.distinct.add(spelled);
        if (px < SMALL_PX) { bump(arb.small, f.rel); bump(arb.smallByValue, spelled); }
        if (tokens.byPx.has(px)) {
          bump(arb.eq, f.rel);
          bump(arb.eqByValue, spelled);
        } else bump(arb.neq, f.rel);
      }
    }
    for (const _ of text.matchAll(OTHER_FORM_RE)) bump(arb.other, f.rel); // eslint-disable-line no-unused-vars

    for (const m of text.matchAll(NAMED_SIZE_RE)) { bump(named.matches, f.rel); bump(named.byClass, `text-${m[1]}`); }
    for (const m of text.matchAll(LEADING_RE)) { bump(leading.matches, f.rel); bump(leading.byValue, m[1]); }
    for (const m of text.matchAll(TRACKING_RE)) { bump(tracking.matches, f.rel); bump(tracking.byValue, m[1]); }
  }

  // ── @apply in css (audited css + the token source) ──────────────────────
  const apply = { named: 0, arbitrary: 0, namedSource: 0, arbitrarySource: 0, perFile: new Map(), perFileArb: new Map() };
  const cssTargets = cssAudited.map((f) => ({ file: f.rel, source: false, text: ctx.read(f) }));
  if (ts.abs) cssTargets.push({ file: ts.rel, source: true, text: ctx.read(ts.abs) });
  for (const t of cssTargets) {
    if (!t.text) continue;
    for (const m of t.text.matchAll(APPLY_RE)) {
      let n = 0;
      let a = 0;
      for (const _ of m[1].matchAll(NAMED_SIZE_RE)) n++; // eslint-disable-line no-unused-vars
      for (const _ of m[1].matchAll(ARBITRARY_SIZE_RE)) a++; // eslint-disable-line no-unused-vars
      if (t.source) { apply.namedSource += n; apply.arbitrarySource += a; } else { apply.named += n; apply.arbitrary += a; }
      if (n) bump(apply.perFile, t.file, n);
      if (a) bump(apply.perFileArb, t.file, a);
    }
  }

  // ── var() consumers of the type token families (whole audited population) ─
  const declaredByFamily = new Map(FAMILIES.map((fam) => [fam.key, new Set()]));
  const css = tokenCss(ctx);
  const sourceText = css.clean;
  for (const d of css.decls) {
    const fam = FAMILIES.find((x) => d.name.startsWith(x.prefix));
    if (fam) declaredByFamily.get(fam.key).add(d.name);
  }
  const used = new Map(FAMILIES.map((fam) => [fam.key, { names: new Set(), total: 0, files: new Set(), inSource: 0 }]));
  for (const m of sourceText.matchAll(VAR_REF_RE)) {
    const fam = FAMILIES.find((x) => m[1].startsWith(x.prefix));
    if (fam) used.get(fam.key).inSource++;
  }
  for (const f of ctx.audited) {
    const text = ctx.read(f);
    if (!text) continue;
    for (const m of text.matchAll(VAR_REF_RE)) {
      const fam = FAMILIES.find((x) => m[1].startsWith(x.prefix));
      if (!fam) continue;
      const u = used.get(fam.key);
      u.total++;
      u.names.add(m[1]);
      u.files.add(f.rel);
    }
  }

  // ── exemptions ──────────────────────────────────────────────────────────
  add({
    id: "typography.exempt.declared", kind: "presence", unit: "boolean", value: ex.refs.length > 0,
    definition: {
      summary: "design/guardrails.mdx declares at least one exemption that names a file, glob or directory (a block saying exception / exempt / except / excluded / allow-list, with backticked references). Negated mentions (no exceptions, never exempt, Exceptions: none), fenced code and HTML / MDX comments declare nothing.",
      regexes: [
        { label: "an exemption word (exception / exempt / except / excluded / allow-list)", regex: EXEMPT_WORD_RE },
        { label: "a backticked reference that follows it", regex: BACKTICK_RE },
      ],
      fileSet: ex.source ?? "design/guardrails.mdx (absent)",
    },
    detail: exemptionDetail(ex),
    notes: ex.source ? [] : ["no design/guardrails.mdx: no exemptions are declared, so no with/without split is emitted"],
  });
  add({
    id: "typography.exempt.files", kind: "mechanical", unit: "file", value: ex.exemptFiles.size,
    perFile: new Map([...ex.exemptFiles].map((f) => [f, 1])),
    definition: {
      summary: "Audited files that the exemptions declared in design/guardrails.mdx resolve to. This is the exempt set every `_excluding_exempt` counter in this group and in scale removes.",
      regex: null,
      fileSet: AUDITED_SET,
    },
    detail: exemptionDetail(ex),
    notes: [
      "The set is read from the repo's own guardrails and never inferred from file names.",
      "Negation is read within the clause: `No exceptions at all (see `x.tsx`)` and `Never exempt anything; the template lives in `x.tsx`` exempt nothing, while `No raw hex, except in `x.tsx`` does. A reference list longer than 200 or a pattern set past the glob comparison budget is cut off, listed under detail.skipped and warned about.",
      "A declared exemption is scoped by the guardrail that carries it (in this repo the hex rule); it is applied here as a file-level split, so a reader sees the number with and without those files and decides whether the exemption should extend to type sizes.",
      "References that resolve to the token source, tests or .d.ts are already outside the audited population and are listed under alreadyOutsideAudit. A reference that resolves to the token source names it alone: other audited files with the same name are not exempted by it.",
    ],
  });

  // ── arbitrary font sizes ────────────────────────────────────────────────
    const arbBase = (summary, extra = {}) => ({ definition: { summary, regex: ARBITRARY_SIZE_RE, fileSet: CODE_SET }, ...extra });
  const arbNotes = [
    "A match is any string that spells the class (code, comment or fixture); there is no className parsing, and a template such as `text-[${n}px]` is not matched.",
    "The lookbehind skips `context-[12px]`-style words; a Tailwind prefix (`tw-text-[12px]`) is not matched.",
  ];
  const arbTotal = sum(arb.matches);
  const arbLines = sum(arb.lines);
  add({
    id: "typography.arbitrary_size.matches", kind: "mechanical", unit: "match", value: arbTotal,
    ...arbBase("Arbitrary font-size utilities `text-[<n>px|rem]`, counted as class matches (not lines).", {
      perFile: arb.matches,
      detail: {
        px: arb.px,
        rem: arb.rem,
        byValue: sortedByCount(arb.byValue),
        ...scopeSplit(arb.matches, ex),
      },
      notes: arbNotes,
    }),
  });
  add({
    id: "typography.arbitrary_size.lines", kind: "mechanical", unit: "line", value: arbLines,
    ...arbBase("Lines holding at least one arbitrary font-size utility (a line with three matches counts once).", {
      perFile: arb.lines,
      detail: scopeSplit(arb.lines, ex),
      notes: ["Lines are counted after CRLF normalisation; matches ÷ lines tells how densely a line is styled."],
    }),
  });
  add({
    id: "typography.arbitrary_size.files", kind: "mechanical", unit: "file", value: arb.matches.size,
    ...arbBase("Files holding at least one arbitrary font-size utility (perFile count = utilities in the file).", { perFile: arb.matches, detail: scopeSplit(new Map([...arb.matches.keys()].map((k) => [k, 1])), ex) }),
  });
  if (ex.exemptFiles.size) {
    const keptMatches = withoutExempt(arb.matches, ex);
    const keptLines = withoutExempt(arb.lines, ex);
    const exemptNote = `Without the ${ex.exemptFiles.size} file(s) design/guardrails.mdx declares exempt (typography.exempt.files lists them).`;
    add({
      id: "typography.arbitrary_size.matches_excluding_exempt", kind: "mechanical", unit: "match", value: sum(keptMatches),
      ...arbBase("Arbitrary font-size utilities, class matches, excluding the files the repo's guardrails declare exempt.", { perFile: keptMatches, notes: [exemptNote] }),
    });
    add({
      id: "typography.arbitrary_size.lines_excluding_exempt", kind: "mechanical", unit: "line", value: sum(keptLines),
      ...arbBase("Lines holding an arbitrary font-size utility, excluding the files the repo's guardrails declare exempt.", { perFile: keptLines, notes: [exemptNote] }),
    });
    add({
      id: "typography.arbitrary_size.files_excluding_exempt", kind: "mechanical", unit: "file", value: keptMatches.size,
      ...arbBase("Files holding an arbitrary font-size utility, excluding the files the repo's guardrails declare exempt (perFile count = utilities in the file).", { perFile: keptMatches, notes: [exemptNote] }),
    });
  }
  add({
    id: "typography.arbitrary_size.px_matches", kind: "mechanical", unit: "match", value: arb.px,
    ...arbBase("Arbitrary font-size utilities spelled in px.", { perFile: arb.pxFiles }),
  });
  add({
    id: "typography.arbitrary_size.rem_matches", kind: "mechanical", unit: "match", value: arb.rem,
    ...arbBase("Arbitrary font-size utilities spelled in rem.", { perFile: arb.remFiles }),
  });
  add({
    id: "typography.arbitrary_size.distinct", kind: "mechanical", unit: "distinct", value: arb.distinct.size,
    ...arbBase("Distinct spellings among the arbitrary font-size utilities (`13px` and `0.8125rem` are two spellings of one size).", {
      detail: { values: cap([...arb.distinct].sort(byString), 60) },
    }),
  });
  add({
    id: "typography.arbitrary_size.below_12px", kind: "mechanical", unit: "match", value: sum(arb.small),
    ...arbBase(`Arbitrary font-size utilities whose computed size is below ${SMALL_PX}px (rem × ${PX_PER_REM}).`, {
      perFile: arb.small,
      detail: { thresholdPx: SMALL_PX, pxPerRem: PX_PER_REM, byValue: sortedByCount(arb.smallByValue), ...scopeSplit(arb.small, ex) },
      notes: ["A mechanical threshold, not a legibility verdict."],
    }),
  });

  const eqDetail = {};
  for (const [spelled, n] of [...arb.eqByValue.entries()].sort((a, b) => b[1] - a[1] || byString(a[0], b[0]))) {
    const m = /^(.+?)(px|rem)$/.exec(spelled);
    eqDetail[spelled] = { count: n, tokens: tokens.byPx.get(pxOf(parseFloat(m[1]), m[2])) ?? [] };
  }
  const tokenDetail = {
    fontSizeTokens: tokens.names.size,
    unresolvedTokens: cap(tokens.unresolved),
    textTokensWithLengthValue: tokens.textLength,
  };
  const tokenNotes = [
    ...noSource,
    ...noSizeTokens,
    "Equality is on the computed size: px as written, rem × 16. A token whose value is not a plain px/rem length (calc, clamp, var, em) cannot be compared and is listed under unresolvedTokens.",
    "Only --font-size-* tokens are compared; `--text-*` (the Tailwind v4 theme namespace) is not, and detail.textTokensWithLengthValue says how many length-valued ones exist.",
  ];
  add({
    id: "typography.arbitrary_size.equals_token", kind: "mechanical", unit: "match", value: sum(arb.eq),
    definition: { summary: "Arbitrary font-size utilities whose computed size equals the value of a `--font-size-*` token in the token source.", regexes: [{ label: "arbitrary font-size utility", regex: ARBITRARY_SIZE_RE }, { label: "a --font-size-* token's value, read as a px or rem length", regex: LENGTH_VALUE_RE }], fileSet: `${CODE_SET}; tokens from ${sourceSet}` },
    perFile: arb.eq,
    detail: { ...tokenDetail, byValue: eqDetail, ...scopeSplit(arb.eq, ex) },
    notes: tokenNotes,
  });
  add({
    id: "typography.arbitrary_size.not_token", kind: "mechanical", unit: "match", value: sum(arb.neq),
    definition: { summary: "Arbitrary font-size utilities whose computed size equals no `--font-size-*` token value.", regexes: [{ label: "arbitrary font-size utility", regex: ARBITRARY_SIZE_RE }, { label: "a --font-size-* token's value, read as a px or rem length", regex: LENGTH_VALUE_RE }], fileSet: `${CODE_SET}; tokens from ${sourceSet}` },
    perFile: arb.neq,
    detail: { ...tokenDetail, ...scopeSplit(arb.neq, ex) },
    notes: tokenNotes,
  });
  add({
    id: "typography.arbitrary_size.not_token_files", kind: "mechanical", unit: "file", value: arb.neq.size,
    definition: { summary: "Files holding at least one arbitrary font-size utility that equals no `--font-size-*` token value (perFile count = such utilities in the file).", regexes: [{ label: "arbitrary font-size utility", regex: ARBITRARY_SIZE_RE }, { label: "a --font-size-* token's value, read as a px or rem length", regex: LENGTH_VALUE_RE }], fileSet: `${CODE_SET}; tokens from ${sourceSet}` },
    perFile: arb.neq,
    notes: tokenNotes,
  });
  add({
    id: "typography.arbitrary_size.other_form_matches", kind: "mechanical", unit: "match", value: sum(arb.other),
    definition: {
      summary: "Arbitrary text-size classes the main regex does not see: `text-[length:…]`, a length in another unit (em, vw, %, …) and `calc()` / `clamp()` / `min()` / `max()` values.",
      regex: OTHER_FORM_RE,
      fileSet: CODE_SET,
    },
    perFile: arb.other,
    notes: ["`text-[var(--x)]` and `text-[#fff]` are not counted: without a `length:` hint Tailwind reads them as colours."],
  });

  // ── named standard sizes ────────────────────────────────────────────────
  add({
    id: "typography.named_size.matches", kind: "mechanical", unit: "match", value: sum(named.matches),
    definition: { summary: "Tailwind named standard sizes: text-xs, text-sm, text-base, text-lg, text-xl, text-2xl … text-9xl.", regex: NAMED_SIZE_RE, fileSet: CODE_SET },
    perFile: named.matches,
    detail: { byClass: sortedByCount(named.byClass), ...scopeSplit(named.matches, ex) },
    notes: [
      "Counts the class spelling anywhere in a code file (strings, comments); `--text-sm` custom properties and `text-sm-foo` words are skipped by the boundaries.",
      "`@apply` uses in css are in typography.css_apply.named_size_matches; the oracle's 'with the @apply' figure is the two added.",
    ],
  });
  add({
    id: "typography.named_size.files", kind: "mechanical", unit: "file", value: named.matches.size,
    definition: { summary: "Files holding at least one Tailwind named standard size (perFile count = sizes in the file).", regex: NAMED_SIZE_RE, fileSet: CODE_SET },
    perFile: named.matches,
  });
  add({
    id: "typography.css_apply.named_size_matches", kind: "mechanical", unit: "match", value: apply.named + apply.namedSource,
    definition: { summary: "Named standard sizes inside `@apply` statements in audited css and in the token source.", regexes: [{ label: "an @apply statement", regex: APPLY_RE }, { label: "a named size inside it", regex: NAMED_SIZE_RE }], fileSet: `audited css files and ${sourceSet}` },
    perFile: apply.perFile,
    detail: { inAuditedCss: apply.named, inTokenSource: apply.namedSource },
    notes: ["Only text inside an @apply statement counts, so a size named in a css comment does not."],
  });
  add({
    id: "typography.css_apply.arbitrary_size_matches", kind: "mechanical", unit: "match", value: apply.arbitrary + apply.arbitrarySource,
    definition: { summary: "Arbitrary font-size utilities inside `@apply` statements in audited css and in the token source.", regexes: [{ label: "an @apply statement", regex: APPLY_RE }, { label: "an arbitrary font-size utility inside it", regex: ARBITRARY_SIZE_RE }], fileSet: `audited css files and ${sourceSet}` },
    perFile: apply.perFileArb,
    detail: { inAuditedCss: apply.arbitrary, inTokenSource: apply.arbitrarySource },
  });

  // ── leading / tracking ──────────────────────────────────────────────────
  for (const [key, acc, re, what] of [
    ["leading_arbitrary", leading, LEADING_RE, "line-height `leading-[…]`"],
    ["tracking_arbitrary", tracking, TRACKING_RE, "letter-spacing `tracking-[…]`"],
  ]) {
    add({
      id: `typography.${key}.matches`, kind: "mechanical", unit: "match", value: sum(acc.matches),
      definition: { summary: `Arbitrary ${what} utilities, any bracket value.`, regex: re, fileSet: CODE_SET },
      perFile: acc.matches,
      detail: { byValue: sortedByCount(acc.byValue), ...scopeSplit(acc.matches, ex) },
    });
    add({
      id: `typography.${key}.files`, kind: "mechanical", unit: "file", value: acc.matches.size,
      definition: { summary: `Files holding at least one arbitrary ${what} utility (perFile count = utilities in the file).`, regex: re, fileSet: CODE_SET },
      perFile: acc.matches,
    });
  }

  // ── type tokens ─────────────────────────────────────────────────────────
  const rows = FAMILIES.map((fam) => {
    const declared = declaredByFamily.get(fam.key);
    const u = used.get(fam.key);
    return {
      family: `${fam.prefix}*`,
      declared: declared.size,
      consumers: u.total,
      consumerFiles: u.files.size,
      referencedInTokenSource: u.inSource,
      unconsumed: [...declared].filter((n) => !u.names.has(n)).length,
    };
  });
  add({
    id: "typography.token_family.zero_consumer_families", kind: "mechanical", unit: "distinct",
    value: rows.filter((r) => r.declared > 0 && r.consumers === 0).length,
    definition: {
      summary: "Type token families (--font-size-, --text-, --line-height-, --leading-, --letter-spacing-, --tracking-, --font-weight-) that the token source declares and no audited file references through var().",
      regex: VAR_REF_RE,
      fileSet: `declarations from ${sourceSet}; references from ${AUDITED_SET}`,
    },
    detail: { families: rows },
    notes: [
      ...noSource,
      "var() references only: a family exposed through Tailwind @theme utilities (text-sm, leading-tight) can show zero consumers here while its classes are in use.",
      "References inside the token source itself (a base-layer rule using var(--tracking-label)) are not consumers; each family row reports them as referencedInTokenSource so a family used only there is visible.",
      "The `--text-*` family also matches colour tokens such as --text-primary; the family list is fixed, not judged.",
    ],
  });

  return out;
}

module.exports = { group: GROUP, run };
