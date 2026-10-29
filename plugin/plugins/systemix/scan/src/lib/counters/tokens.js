"use strict";

/**
 * tokens.js — inventory of the token source (the one css file the audit treats
 * as canonical; see lib/design-source.js for how it is resolved). The source is
 * parsed ONCE (lib/css-parse.js via counters/css.js): every custom-property
 * declaration is found wherever it sits on its line, so `.dark { --a: #000; }`,
 * several declarations to a line and a minified file count like any other. Plus
 * `var()` consumer counts over the audited population. Counts only — whether 194
 * custom properties is "a lot" is for a reader to judge, not this module.
 *
 * Counter ids (API — keep them stable):
 *   tokens.source.found                 presence  a token source was resolved
 *   tokens.source.path                  string    repo-relative path (null when none)
 *   tokens.source.via                   string    how it was resolved (design/tokens.css, config:…, doc:…, most-custom-properties, none)
 *   tokens.source.lines                 number    line count (`wc -l` semantics)
 *   tokens.custom_properties.distinct   distinct  custom properties declared, de-duplicated by name
 *   tokens.declarations.total           match     custom-property declarations (a name redeclared for .dark counts each time)
 *   tokens.declarations.lines           line      lines holding >= 1 declaration (= root + dark + theme + other)
 *   tokens.declarations.line_start      line      the oracle's count: lines whose FIRST token is `--name:` (a regex; it misses
 *                                                 declarations that share a line with a selector or with another declaration)
 *   tokens.declarations.root            line      …lines whose first declaration sits in a `:root` rule
 *   tokens.declarations.dark            line      …in the dark theme (css.js: `.dark`, `:root.dark`, `[data-theme=dark]`,
 *                                                 `[data-mode=dark]`, `prefers-color-scheme: dark`; a selector that lists both
 *                                                 `:root` and `.dark` counts as dark)
 *   tokens.declarations.theme           line      …inside `@theme` (incl. `@theme inline`) rules
 *   tokens.declarations.other           line      …inside any other rule (component-local) or outside every rule
 *   tokens.oklch.occurrences            match     the word `oklch` anywhere in the file
 *   tokens.oklch.declarations           line      lines holding a custom-property declaration whose value calls `oklch(`
 *   tokens.hex.literals                 match     `#[0-9a-fA-F]{3,8}\b` anywhere in the file (comments included)
 *   tokens.hex.declared_distinct        distinct  distinct hex values in custom-property values, normalised
 *                                                 (lowercase, 3→6 and 4→8 digit expansion) — the set the colour
 *                                                 counters compare literals against
 *   tokens.font_size.declarations       line      lines holding a `--font-size-*` declaration
 *   tokens.font_size.consumers          match     `var(--font-size-*)` references in the audited population
 *   tokens.font_size.unconsumed         distinct  declared `--font-size-*` names with no such reference
 *   tokens.space.*, tokens.text.*       the same three counters for `--space-*` and `--text-*`
 *                                       (each family publishes its own reference regex, e.g.
 *                                       `var\(\s*--font-size-[\w-]*`, and counts with exactly that regex)
 *   tokens.theme.present                presence  the file has an `@theme` rule
 *   tokens.theme.blocks                 number    `@theme` rules
 *   tokens.theme.maps_font_size         line      @theme declarations that name a `--text-*` / `--font-size-*`
 *                                                 property or reference `var(--font-size-*)`
 *   tokens.theme.maps_space             line      @theme declarations that name a `--spacing*` property or
 *                                                 reference `var(--space-*)`
 *
 * Known limits (also in each counter's notes): hex and `oklch` counts include
 * comments (the oracle's regex does) while declarations do not (a commented-out
 * declaration is not one); a custom property used only through a Tailwind utility
 * generated from @theme has no `var()` consumer.
 */

const { counter } = require("./counter");
const { tokenCss, declaredHexSet, HEX_LITERAL_RE, THEME_RE } = require("./css");
const { canonicalHex, sortedList } = require("./util");

const GROUP = "tokens";

// the oracle's regex, kept as a separate legacy counter: `--name:` as the first token on a line
const DECL_LINE_START_RE = /^[ \t]*(--[\w-]+)[ \t]*:/gm;
const OKLCH_RE = /oklch/gi;
const OKLCH_CALL_RE = /oklch\(/i;
const MAPS_FONT_NAME_RE = /^--(?:text|font-size)-/;
const MAPS_FONT_VALUE_RE = /var\(\s*--font-size-/;
const MAPS_SPACE_NAME_RE = /^--spacing(?:-|$)/;
const MAPS_SPACE_VALUE_RE = /var\(\s*--space-/;

// one reference regex per family, so the regex a counter publishes is the one it ran
// (the prefixes are disjoint: a reference belongs to exactly one family)
const FAMILIES = [
  { key: "font_size", prefix: "--font-size-", label: "--font-size-*" },
  { key: "space", prefix: "--space-", label: "--space-*" },
  { key: "text", prefix: "--text-", label: "--text-*" },
].map((f) => ({ ...f, refRe: new RegExp(`var\\(\\s*${f.prefix}[\\w-]*`, "g") }));
const refName = (match) => match.slice(match.indexOf("--"));
const BLOCK_DETAIL_LIMIT = 50;

function blockDetail(blocks, kind) {
  const rows = blocks
    .filter((b) => b.kind === kind)
    .map((b) => ({ selector: b.selector, startLine: b.startLine, endLine: b.endLine, declarations: b.declarations }));
  const detail = { blocks: rows.slice(0, BLOCK_DETAIL_LIMIT) };
  if (rows.length > BLOCK_DETAIL_LIMIT) detail.blocksTotal = rows.length;
  return detail;
}

/** Number of distinct lines among declarations. */
const lineSet = (list) => new Set(list.map((d) => d.line));

function run(ctx) {
  const out = [];
  const add = (spec) => out.push(counter({ group: GROUP, singleFile: ts.rel ?? undefined, ...spec })); // every count reads the one token source
  const ts = ctx.tokenSource;
  const css = tokenCss(ctx);
  const { text, decls, blocks } = css;
  const found = Boolean(ts.abs);
  const missingNote = found ? [] : [`no token source resolved: ${ts.reason}`];
  const sourceSet = found ? `the resolved token source (${ts.rel})` : "the resolved token source (none found)";
  const parserNote = "Declarations are found by the statement parser lib/css-parse.js, wherever they sit on a line (several to a line, after a selector, minified); a commented-out declaration is not one.";

  add({
    id: "tokens.source.found", kind: "presence", unit: "boolean", value: found,
    definition: { summary: "A token source was resolved.", regex: null, fileSet: "resolution order: design/tokens.css, systemix.config.yaml design.source, a css file design/ names canonical, the css file with the most custom properties" },
    detail: { reason: ts.reason },
    notes: missingNote,
  });
  add({
    id: "tokens.source.path", kind: "mechanical", unit: "string", value: ts.rel ?? null,
    definition: { summary: "Repo-relative path of the resolved token source.", regex: null, fileSet: "resolution order: design/tokens.css, systemix.config.yaml design.source, a css file design/ names canonical, the css file with the most custom properties" },
    detail: { via: ts.via, reason: ts.reason, inAuditedDirs: ctx.population.tokenSourceInCensus },
    notes: missingNote,
  });
  add({
    id: "tokens.source.via", kind: "mechanical", unit: "string", value: ts.via,
    definition: { summary: "Which resolution step chose the token source.", regex: null, fileSet: "see tokens.source.path" },
    notes: missingNote,
  });
  add({
    id: "tokens.source.lines", kind: "mechanical", unit: "number", value: ctx.lineCount(text),
    definition: { summary: "Line count of the token source (`wc -l`: a last line without a newline still counts).", regex: null, fileSet: sourceSet },
    notes: missingNote,
  });

  const names = new Set(decls.map((d) => d.name));
  add({
    id: "tokens.custom_properties.distinct", kind: "mechanical", unit: "distinct", value: names.size,
    definition: { summary: "Distinct custom properties declared, de-duplicated by name (a property redeclared for .dark counts once). The resolver counts the same way, so this equals scope.tokenSource.customProperties.", regex: null, fileSet: sourceSet },
    notes: [...missingNote, parserNote],
  });

  const lineKind = new Map(); // a line belongs to the kind of its first declaration
  for (const d of decls) if (!lineKind.has(d.line)) lineKind.set(d.line, d.kind);
  const kindLines = (kind) => [...lineKind.values()].filter((k) => k === kind).length;
  add({
    id: "tokens.declarations.total", kind: "mechanical", unit: "match", value: decls.length,
    definition: { summary: "Custom-property declarations, each time a name is declared (a property redeclared for .dark counts again).", regex: null, fileSet: sourceSet },
    notes: [...missingNote, parserNote],
  });
  add({
    id: "tokens.declarations.lines", kind: "mechanical", unit: "line", value: lineKind.size,
    definition: { summary: "Lines holding at least one custom-property declaration. Equals root + dark + theme + other.", regex: null, fileSet: sourceSet },
    detail: { declarations: decls.length },
    notes: [...missingNote, parserNote],
  });
  add({
    id: "tokens.declarations.line_start", kind: "mechanical", unit: "line", value: (text.match(DECL_LINE_START_RE) ?? []).length,
    definition: { summary: "The oracle's count: lines whose first token is `--name:`. Kept to reproduce the dry run; it misses a declaration that shares its line with a selector or with another declaration (tokens.declarations.lines does not), and it counts a declaration inside a comment that starts a line.", regex: DECL_LINE_START_RE, fileSet: sourceSet },
    notes: missingNote,
  });
  const kindSummary = {
    root: "Lines whose first declaration sits in a `:root` rule (every :root rule; detail.blocks lists each one that holds a declaration, so a light block and a theme-independent block stay distinguishable).",
    dark: "Lines whose first declaration sits in the dark theme: `.dark`, `:root.dark`, `html.dark`, `[data-theme=dark]`, `[data-mode=dark]`, or :root inside prefers-color-scheme: dark. A selector that also names :root (`:root, .dark`) counts as dark, not root. The same rule decisions.design_md.colors_*_dark uses.",
    theme: "Lines whose first declaration sits in an `@theme` rule (including `@theme inline`).",
    other: "Lines whose first declaration sits in any other rule (component-local, a descendant such as `.dark .card`) or outside every rule.",
  };
  for (const kind of ["root", "dark", "theme", "other"]) {
    add({
      id: `tokens.declarations.${kind}`, kind: "mechanical", unit: "line", value: kindLines(kind),
      definition: { summary: kindSummary[kind], regex: null, fileSet: sourceSet },
      detail: { ...blockDetail(blocks, kind), declarations: decls.filter((d) => d.kind === kind).length },
      notes: [...missingNote, "Attributed to the nearest enclosing rule that is not an @layer/@media/@supports wrapper; classification of that rule is by selector text only. detail.declarations counts declarations, which exceeds the line count where one line holds several."],
    });
  }

  const oklchOccurrences = (text.match(OKLCH_RE) ?? []).length;
  add({
    id: "tokens.oklch.occurrences", kind: "mechanical", unit: "match", value: oklchOccurrences,
    definition: { summary: "Occurrences of the word `oklch` in the token source (case-insensitive, comments included).", regex: OKLCH_RE, fileSet: sourceSet },
    notes: missingNote,
  });
  add({
    id: "tokens.oklch.declarations", kind: "mechanical", unit: "line",
    value: lineSet(decls.filter((d) => OKLCH_CALL_RE.test(d.value))).size,
    definition: { summary: "Lines holding a custom-property declaration whose value calls `oklch(`.", regex: OKLCH_CALL_RE, fileSet: sourceSet },
    notes: missingNote,
  });

  const hexAll = text.match(HEX_LITERAL_RE) ?? [];
  const hexOutsideComments = css.clean.match(HEX_LITERAL_RE) ?? [];
  add({
    id: "tokens.hex.literals", kind: "mechanical", unit: "match", value: hexAll.length,
    definition: { summary: "Hex colour literals in the token source.", regex: HEX_LITERAL_RE, fileSet: sourceSet },
    detail: {
      distinct: new Set(hexAll.map(canonicalHex)).size,
      inComments: hexAll.length - hexOutsideComments.length,
    },
    notes: [...missingNote, "Comments are counted (the oracle regex does); detail.inComments says how many sit in comments."],
  });
  add({
    id: "tokens.hex.declared_distinct", kind: "mechanical", unit: "distinct", value: declaredHexSet(ctx).size,
    definition: {
      summary: "Distinct hex values declared as custom-property values, lowercased with 3→6 and 4→8 digit expansion. This is the set the colour counters call a 'token value'.",
      regex: HEX_LITERAL_RE,
      fileSet: sourceSet,
    },
    notes: [...missingNote, "Comments and hex literals outside custom-property declarations are not part of the set."],
  });

  const audited = ctx.audited;
  const refs = new Map(FAMILIES.map((f) => [f.key, { perFile: new Map(), names: new Set(), total: 0 }]));
  for (const f of audited) {
    const body = ctx.read(f);
    for (const fam of FAMILIES) {
      if (!body.includes(fam.prefix)) continue;
      const bucket = refs.get(fam.key);
      for (const m of body.matchAll(fam.refRe)) {
        bucket.total++;
        bucket.names.add(refName(m[0]));
        bucket.perFile.set(f.rel, (bucket.perFile.get(f.rel) ?? 0) + 1);
      }
    }
  }
  const sourceRefs = new Map(FAMILIES.map((f) => [f.key, { total: 0, names: new Set() }]));
  for (const fam of FAMILIES) {
    const bucket = sourceRefs.get(fam.key);
    for (const m of text.matchAll(fam.refRe)) {
      bucket.total++;
      bucket.names.add(refName(m[0]));
    }
  }

  const auditedSet = "audited files (ts, tsx, js, jsx, css, vue, svelte under the audited dirs), excluding tests, .d.ts and the token source";
  const themeDecls = decls.filter((d) => d.kind === "theme");
  for (const fam of FAMILIES) {
    const declared = decls.filter((d) => d.name.startsWith(fam.prefix));
    const declaredNames = new Set(declared.map((d) => d.name));
    const used = refs.get(fam.key);
    const inSource = sourceRefs.get(fam.key);
    const unconsumed = sortedList([...declaredNames].filter((n) => !used.names.has(n)));

    add({
      id: `tokens.${fam.key}.declarations`, kind: "mechanical", unit: "line", value: lineSet(declared).size,
      definition: { summary: `Lines holding a ${fam.label} custom-property declaration.`, regex: null, fileSet: sourceSet },
      detail: { distinct: declaredNames.size, names: sortedList(declaredNames) },
      notes: [...missingNote, parserNote],
    });
    add({
      id: `tokens.${fam.key}.consumers`, kind: "mechanical", unit: "match", value: used.total,
      definition: { summary: `var() references to a ${fam.label} property.`, regex: fam.refRe, fileSet: auditedSet },
      perFile: used.perFile,
      detail: { distinct: used.names.size, inTokenSource: inSource.total },
      notes: [
        ...missingNote,
        "The token source's own references (detail.inTokenSource) are not consumers. A property reached only through a Tailwind utility generated from @theme (text-sm for --text-sm) has no var() reference and is not counted.",
      ],
    });
    add({
      id: `tokens.${fam.key}.unconsumed`, kind: "mechanical", unit: "distinct", value: unconsumed.length,
      definition: { summary: `Declared ${fam.label} properties with no var() reference in the audited population.`, regex: fam.refRe, fileSet: `declarations from ${sourceSet}; references from ${auditedSet}` },
      detail: {
        declared: declaredNames.size,
        names: unconsumed,
        referencedInTokenSource: sortedList(unconsumed.filter((n) => inSource.names.has(n))),
      },
      notes: missingNote,
    });
  }

  const themeRules = css.rules.filter((r) => THEME_RE.test(r.selector));
  add({
    id: "tokens.theme.present", kind: "presence", unit: "boolean", value: themeRules.length > 0,
    definition: { summary: "The token source has an `@theme` rule (Tailwind v4 theme mapping).", regex: THEME_RE, fileSet: sourceSet },
    notes: missingNote,
  });
  add({
    id: "tokens.theme.blocks", kind: "mechanical", unit: "number", value: themeRules.length,
    definition: { summary: "`@theme` rules in the token source (`@theme inline` counts).", regex: THEME_RE, fileSet: sourceSet },
    notes: missingNote,
  });
  const mapsFontSize = themeDecls.filter((d) => MAPS_FONT_NAME_RE.test(d.name) || MAPS_FONT_VALUE_RE.test(d.value));
  const mapsSpace = themeDecls.filter((d) => MAPS_SPACE_NAME_RE.test(d.name) || MAPS_SPACE_VALUE_RE.test(d.value));
  add({
    id: "tokens.theme.maps_font_size", kind: "mechanical", unit: "line", value: lineSet(mapsFontSize).size,
    definition: {
      summary: "@theme declaration lines that expose the font-size scale to Tailwind: a `--text-*` or `--font-size-*` property, or a value referencing `var(--font-size-*)`.",
      regexes: [{ label: "the property name", regex: MAPS_FONT_NAME_RE }, { label: "the value", regex: MAPS_FONT_VALUE_RE }],
      fileSet: `@theme rules of ${sourceSet}`,
    },
    detail: { names: sortedList(new Set(mapsFontSize.map((d) => d.name))) },
    notes: missingNote,
  });
  add({
    id: "tokens.theme.maps_space", kind: "mechanical", unit: "line", value: lineSet(mapsSpace).size,
    definition: {
      summary: "@theme declaration lines that expose the spacing scale to Tailwind: a `--spacing` / `--spacing-*` property, or a value referencing `var(--space-*)`.",
      regexes: [{ label: "the property name", regex: MAPS_SPACE_NAME_RE }, { label: "the value", regex: MAPS_SPACE_VALUE_RE }],
      fileSet: `@theme rules of ${sourceSet}`,
    },
    detail: { names: sortedList(new Set(mapsSpace.map((d) => d.name))) },
    notes: missingNote,
  });

  return out;
}

module.exports = { group: GROUP, run };
