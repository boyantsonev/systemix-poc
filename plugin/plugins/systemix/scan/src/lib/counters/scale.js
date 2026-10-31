"use strict";

/**
 * scale.js — radius, shadow and spacing utilities, icon libraries and competing
 * UI libraries. Regex hits and manifest lookups; nothing here says a hit is a
 * violation.
 *
 * Counter ids (API — keep them stable):
 *
 * Radius (audited code files: ts, tsx, js, jsx, vue, svelte). A "use" is a class
 * (`rounded-[…]`, `rounded-(--x)`) or an inline declaration (`border-radius: …`,
 * `borderRadius: …`), one per occurrence:
 *   scale.radius.var_uses                 match  radius taken from a custom property
 *   scale.radius.hardcoded_uses           match  radius spelled as a px/rem literal (class + inline)
 *   scale.radius.hardcoded_files          file
 *   scale.radius.named_classes            match  rounded, rounded-md, rounded-t-lg, rounded-full … (the named scale)
 *   scale.radius.arbitrary_other          match  rounded-[…] that is neither a var() nor a px/rem length (rounded-[inherit])
 *   scale.radius.named_or_var_share       ratio  (named + var) ÷ (named + var + hardcoded)
 * Shadow:
 *   scale.shadow_utility.matches / .files          shadow-(xs|sm|md|lg|xl)
 *   scale.shadow_utility.other_named_matches       shadow-(2xs|2xl|inner|none)
 *   scale.shadow_arbitrary.matches                 shadow-[…] and shadow-(--x)
 * Spacing (padding, margin, gap, space-x/y with a bracket value):
 *   scale.spacing_arbitrary.matches                match  any bracket value
 *   scale.spacing_arbitrary.length_literal_matches match  …that is a px/rem/em length
 *   scale.spacing_arbitrary.files                  file
 * Icon libraries (import statements in audited code files):
 *   scale.icon_library.lucide_files / .radix_icons_files / .simple_icons_files   file  one counter per library
 *   scale.icon_library.other_files                 file  any other library in the fixed table
 *   scale.icon_library.any_files                   file  any icon-library import
 *   scale.icon_library.distinct_libraries          distinct  libraries with >= 1 import file
 *   scale.icon_library.declared_libraries          distinct  libraries named in a package.json
 * Competing UI libraries (MUI, Chakra, antd, Mantine — a fixed list):
 *   scale.competing_ui_library.declared            distinct  libraries named in a package.json
 *   scale.competing_ui_library.imported_files      file      files importing one
 *   scale.competing_ui_library.present             presence  declared or imported
 *
 * Which package.json files are read: the root one, and the nearest one above each audited
 * file (a workspace package; the package holding an audited dir such as web/src). A manifest
 * inside a fixture / template / example / test directory is a sample, not the project: it is
 * not read, and neither is one that no audited file belongs to. Every manifest that was
 * skipped is listed, with its reason, in detail.manifestsSkipped of the two `declared`
 * counters; the ones that were read are in detail.manifests.
 *
 * Scope is never silent: the radius, shadow and spacing counters carry the
 * in-components/ui/ split and the split for the files the repo's own guardrails
 * declare exempt (see exemptions.js) in `detail`, and radius reports the
 * stylesheet occurrences it does not count under detail.inAuditedCss.
 */

const path = require("path");
const { byString, counter, round4 } = require("./counter");
const { CODE_EXTS, CODE_SET, bump, cap, lineNumbers, sortedByCount, sum } = require("./util");
const { declaredExemptions, scopeSplit } = require("./exemptions");

const GROUP = "scale";

const NUM = "(?:\\d+(?:\\.\\d+)?|\\.\\d+)";
const SIDE = "(?:-(?:t|r|b|l|s|e|tl|tr|br|bl|ss|se|ee|es))?";
const LENGTH_VALUE_RE = new RegExp(`^(${NUM})(px|rem)(?:[_\\s]|$)`);
const VAR_VALUE_RE = /^var\(\s*(--[\w-]+)/;

const RADIUS_BRACKET_RE = new RegExp(`(?<![\\w-])rounded${SIDE}-\\[([^\\]\\s]{1,80})\\]`, "g");
const RADIUS_PAREN_RE = new RegExp(`(?<![\\w-])rounded${SIDE}-\\((--[\\w-]+)\\)`, "g");
const RADIUS_NAMED_RE = new RegExp(`(?<![\\w-])rounded${SIDE}(?:-(?:none|xs|sm|md|lg|xl|2xl|3xl|4xl|full))?(?![\\w\\[(-])`, "g");
const RADIUS_KEBAB_RE = /(?<![\w-])border(?:-(?:top|bottom|start|end)-(?:left|right|start|end))?-radius\s*:\s*([^;}"'`\n]{1,80})/g;
const RADIUS_CAMEL_RE = new RegExp(
  `\\bborder(?:Top|Bottom|Start|End)?(?:Left|Right|Start|End)?Radius\\s*:\\s*(?:(["'\`])([^"'\`\\n]{1,80})\\1|(-?${NUM})(?=\\s*(?:[,})\\]]|\\n|$)))`,
  "g",
);

const SHADOW_NAMED_RE = /(?<![\w-])shadow-(xs|sm|md|lg|xl)(?![\w-])/g;
const SHADOW_OTHER_RE = /(?<![\w-])shadow-(2xs|2xl|inner|none)(?![\w-])/g;
const SHADOW_ARBITRARY_RE = /(?<![\w-])shadow-(?:\[([^\]\s]{1,160})\]|\((--[\w-]+)\))/g;
const SHADOW_VAR_ONLY_RE = /^var\(\s*--[\w-]+\s*\)$/;

const SPACING_UTILITIES = "p|px|py|pt|pr|pb|pl|ps|pe|m|mx|my|mt|mr|mb|ml|ms|me|gap|gap-x|gap-y|space-x|space-y";
const SPACING_ARBITRARY_RE = new RegExp(`(?<![\\w-])-?(${SPACING_UTILITIES})-\\[([^\\]\\s]{1,80})\\]`, "g");
const SPACING_LENGTH_RE = new RegExp(`^-?${NUM}(?:px|rem|em)$`);

const IMPORT_RE = /(?:\bfrom\s*|\bimport\s*(?:\(\s*)?|\brequire\s*\(\s*)(["'])([^"'\n]{1,200})\1/g;

const ICON_LIBS = [
  { key: "lucide", re: /^(?:lucide|lucide-(?:react|react-native|vue-next|svelte|solid|preact|angular))$/ },
  { key: "radix_icons", re: /^@radix-ui\/react-icons$/ },
  { key: "simple_icons", re: /^(?:@icons-pack\/react-simple-icons|simple-icons|react-simple-icons)$/ },
  { key: "react_icons", re: /^react-icons$/ },
  { key: "heroicons", re: /^(?:@heroicons\/react|heroicons)$/ },
  { key: "phosphor", re: /^@phosphor-icons\/(?:react|core|react-native|vue)$/ },
  { key: "tabler", re: /^@tabler\/icons(?:-react|-vue|-svelte|-solid)?$/ },
  { key: "fontawesome", re: /^@fortawesome\// },
  { key: "mui_icons", re: /^@mui\/icons-material$/ },
  { key: "ant_icons", re: /^@ant-design\/icons$/ },
  { key: "feather", re: /^(?:react-feather|feather-icons)$/ },
  { key: "carbon_icons", re: /^@carbon\/icons-react$/ },
  { key: "iconify", re: /^@iconify\/react$/ },
  { key: "iconoir", re: /^iconoir-react$/ },
  { key: "remix", re: /^@remixicon\/react$/ },
  { key: "octicons", re: /^@primer\/octicons-react$/ },
  { key: "expo_vector_icons", re: /^@expo\/vector-icons$/ },
  { key: "hugeicons", re: /^@hugeicons\/react$/ },
];
const NAMED_ICON_KEYS = ["lucide", "radix_icons", "simple_icons"];

const UI_LIBS = [
  { key: "mui", label: "MUI", re: /^(?:@mui\/[\w-]+|@material-ui\/[\w-]+)$/ },
  { key: "chakra", label: "Chakra UI", re: /^@chakra-ui\/[\w-]+$/ },
  { key: "antd", label: "Ant Design", re: /^(?:antd|@ant-design\/[\w-]+)$/ },
  { key: "mantine", label: "Mantine", re: /^@mantine\/[\w-]+$/ },
];

const DEP_FIELDS = ["dependencies", "devDependencies", "peerDependencies", "optionalDependencies"];
// Directories whose package.json describes a sample, not the project (matched case-insensitively, below the audited dir).
const MANIFEST_SET = "the root package.json and the nearest package.json above each audited file (fixture, template, example and test directories skipped)";

const SAMPLE_DIRS = new Set([
  "__fixtures__", "fixtures", "fixture", "__mocks__", "mocks", "__tests__", "test", "tests", "e2e", "testdata", "test-data",
  "templates", "template", "examples", "example",
]);


/** `lodash/fp` → lodash, `@scope/pkg/sub` → @scope/pkg; null for relative, alias and node: specifiers. */
function packageName(spec) {
  if (!spec || /^(?:\.|\/|~|@\/|node:|#)/.test(spec)) return null;
  const parts = spec.split("/");
  return spec.startsWith("@") ? parts.slice(0, 2).join("/") : parts[0];
}

/**
 * The package.json files that describe the audited project, read once:
 *   - the root one, and
 *   - the nearest package.json above each audited file (a workspace package, or the
 *     package that holds an audited dir such as web/src), and nothing else.
 * A manifest found inside an audited dir that is NOT read is returned under `skipped`
 * with its reason: it sits in a fixture / template / example / test directory (below
 * the audited dir, so auditing `examples/app` directly still reads its manifest), it
 * belongs to no audited file, or it is not valid JSON.
 */
function manifests(ctx) {
  const dirOf = (rel) => (rel.includes("/") ? rel.slice(0, rel.lastIndexOf("/")) : "");
  const manifestAt = (dir) => (dir ? `${dir}/package.json` : "package.json");
  const nearestCache = new Map();
  const nearest = (dir) => {
    if (!nearestCache.has(dir)) {
      nearestCache.set(dir, ctx.exists(manifestAt(dir)) ? dir : dir ? nearest(dirOf(dir)) : null);
    }
    return nearestCache.get(dir);
  };

  const owners = new Set();
  for (const dir of new Set(ctx.audited.map((f) => dirOf(f.rel)))) {
    const owner = nearest(dir);
    if (owner !== null) owners.add(owner);
  }

  const auditedDirs = ctx.dirs.filter((d) => ctx.isDirectory(d));
  const isSample = (dir) => {
    let inside = null;
    for (const a of auditedDirs) {
      if ((a === "." || dir === a || dir.startsWith(`${a}/`)) && (inside === null || a.length > inside.length)) inside = a;
    }
    if (inside === null) return false;
    const below = inside === "." ? dir : dir.slice(inside.length + 1);
    return below.split("/").some((seg) => SAMPLE_DIRS.has(seg.toLowerCase()));
  };

  const found = new Set(); // dirs holding a manifest inside the audited dirs
  for (const d of auditedDirs) {
    for (const f of ctx.listTree(d, { exts: [".json"] })) {
      if (f.rel === "package.json" || f.rel.endsWith("/package.json")) found.add(dirOf(f.rel));
    }
  }

  const candidates = new Set(owners);
  if (ctx.exists("package.json")) candidates.add("");
  const skipped = [];
  const wanted = [];
  for (const dir of new Set([...candidates, ...found])) {
    const rel = manifestAt(dir);
    if (dir !== "" && isSample(dir)) skipped.push({ path: rel, reason: "fixture, template, example or test directory" });
    else if (dir !== "" && !owners.has(dir)) skipped.push({ path: rel, reason: "no audited file belongs to this package" });
    else wanted.push(rel);
  }

  const read = [];
  for (const rel of wanted.sort(byString)) {
    const json = ctx.readJson(rel);
    if (!json || typeof json !== "object") { skipped.push({ path: rel, reason: "not valid JSON" }); continue; }
    const names = new Set();
    for (const field of DEP_FIELDS) {
      if (json[field] && typeof json[field] === "object") for (const n of Object.keys(json[field])) names.add(n);
    }
    read.push({ rel, names: [...names].sort(byString) });
  }
  skipped.sort((a, b) => byString(a.path, b.path));
  return { read, skipped };
}

/** Classify one radius value (bracket content or inline declaration value). */
function radiusKind(value) {
  const v = VAR_VALUE_RE.exec(value);
  if (v) return { kind: "var", name: v[1] };
  const l = LENGTH_VALUE_RE.exec(value);
  if (l) return parseFloat(l[1]) === 0 ? { kind: "zero" } : { kind: "hardcoded", value: `${l[1]}${l[2]}` };
  return { kind: "other" };
}

function run(ctx) {
  const out = [];
  const add = (spec) => out.push(counter({ group: GROUP, ...spec }));
  const ex = declaredExemptions(ctx);
  const code = ctx.audited.filter((f) => CODE_EXTS.has(path.extname(f.rel)));
  const cssAudited = ctx.audited.filter((f) => path.extname(f.rel) === ".css");

  const radius = {
    varUses: new Map(), varClass: 0, varInline: 0, varByName: new Map(),
    hard: new Map(), hardClass: 0, hardInline: 0, hardByValue: new Map(), sites: [],
    named: new Map(), namedByClass: new Map(), other: new Map(),
    cssHard: 0, cssVar: 0,
  };
  const shadow = { named: new Map(), bySize: new Map(), other: new Map(), otherByClass: new Map(), arb: new Map(), arbVarOnly: 0, arbComposite: 0 };
  const spacing = { matches: new Map(), literal: new Map(), byUtility: new Map(), byKind: new Map(), byValue: new Map() };
  const iconFiles = new Map(ICON_LIBS.map((l) => [l.key, new Set()]));
  const uiFiles = new Map(UI_LIBS.map((l) => [l.key, new Set()]));
  const libOfPackage = new Map();
  const classify = (pkg) => {
    if (!libOfPackage.has(pkg)) {
      libOfPackage.set(pkg, {
        icon: ICON_LIBS.find((l) => l.re.test(pkg))?.key ?? null,
        ui: UI_LIBS.find((l) => l.re.test(pkg))?.key ?? null,
      });
    }
    return libOfPackage.get(pkg);
  };

  for (const f of code) {
    const text = ctx.read(f);
    if (!text) continue;

    // radius uses, in source order so the line numbers can be assigned in one pass
    const uses = [];
    for (const m of text.matchAll(RADIUS_BRACKET_RE)) uses.push({ index: m.index, form: "class", ...radiusKind(m[1]), raw: m[1] });
    for (const m of text.matchAll(RADIUS_PAREN_RE)) uses.push({ index: m.index, form: "class", kind: "var", name: m[1] });
    for (const m of text.matchAll(RADIUS_KEBAB_RE)) uses.push({ index: m.index, form: "inline", ...radiusKind(m[1].trim()) });
    for (const m of text.matchAll(RADIUS_CAMEL_RE)) {
      if (m[1] !== undefined) uses.push({ index: m.index, form: "inline", ...radiusKind(m[2].trim()) });
      else uses.push({ index: m.index, form: "inline", ...(parseFloat(m[3]) > 0 ? { kind: "hardcoded", value: `${m[3]}px` } : { kind: "zero" }) });
    }
    uses.sort((a, b) => a.index - b.index);
    const hardUses = uses.filter((u) => u.kind === "hardcoded");
    const hardLines = hardUses.length ? lineNumbers(text, hardUses.map((u) => u.index)) : [];
    hardUses.forEach((u, i) => { u.line = hardLines[i]; });
    for (const u of uses) {
      if (u.kind === "var") {
        bump(radius.varUses, f.rel);
        bump(radius.varByName, u.name);
        if (u.form === "class") radius.varClass++; else radius.varInline++;
      } else if (u.kind === "hardcoded") {
        bump(radius.hard, f.rel);
        bump(radius.hardByValue, u.value);
        if (u.form === "class") radius.hardClass++; else radius.hardInline++;
        radius.sites.push({ file: f.rel, line: u.line, form: u.form, value: u.value });
      } else if (u.kind === "other" && u.form === "class") {
        bump(radius.other, f.rel);
      }
    }
    for (const m of text.matchAll(RADIUS_NAMED_RE)) {
      bump(radius.named, f.rel);
      bump(radius.namedByClass, m[0]);
    }

    for (const m of text.matchAll(SHADOW_NAMED_RE)) { bump(shadow.named, f.rel); bump(shadow.bySize, m[1]); }
    for (const m of text.matchAll(SHADOW_OTHER_RE)) { bump(shadow.other, f.rel); bump(shadow.otherByClass, `shadow-${m[1]}`); }
    for (const m of text.matchAll(SHADOW_ARBITRARY_RE)) {
      bump(shadow.arb, f.rel);
      if (m[2] !== undefined || SHADOW_VAR_ONLY_RE.test(m[1])) shadow.arbVarOnly++; else shadow.arbComposite++;
    }

    for (const m of text.matchAll(SPACING_ARBITRARY_RE)) {
      const value = m[2];
      const kind = SPACING_LENGTH_RE.test(value) ? "length" : value.includes("var(") ? "var" : "other";
      bump(spacing.matches, f.rel);
      bump(spacing.byUtility, m[1]);
      bump(spacing.byKind, kind);
      bump(spacing.byValue, value);
      if (kind === "length") bump(spacing.literal, f.rel);
    }

    if (text.includes("from") || text.includes("import") || text.includes("require")) {
      for (const m of text.matchAll(IMPORT_RE)) {
        const pkg = packageName(m[2]);
        if (!pkg) continue;
        const hit = classify(pkg);
        if (hit.icon) iconFiles.get(hit.icon).add(f.rel);
        if (hit.ui) uiFiles.get(hit.ui).add(f.rel);
      }
    }
  }

  // stylesheet occurrences (not part of the headline radius counters)
  for (const f of cssAudited) {
    const text = ctx.read(f);
    if (!text) continue;
    for (const m of text.matchAll(RADIUS_KEBAB_RE)) {
      const k = radiusKind(m[1].trim()).kind;
      if (k === "hardcoded") radius.cssHard++;
      else if (k === "var") radius.cssVar++;
    }
  }

  const manifestInfo = manifests(ctx);
  const manifestRows = manifestInfo.read;
  const declaredBy = (table) => {
    const found = new Map(table.map((l) => [l.key, new Set()]));
    for (const mf of manifestRows) {
      for (const name of mf.names) {
        const lib = table.find((l) => l.re.test(name));
        if (lib) found.get(lib.key).add(name);
      }
    }
    return found;
  };
  const iconDeclared = declaredBy(ICON_LIBS);
  const uiDeclared = declaredBy(UI_LIBS);
  const manifestNote = [
    ...(manifestRows.length ? [] : ["no readable package.json (missing or invalid JSON) at the root or for any audited file: nothing is declared"]),
    ...(manifestInfo.skipped.length
      ? [`${manifestInfo.skipped.length} package.json file(s) were NOT read (detail.manifestsSkipped lists each with its reason): sample directories (fixtures, templates, examples, tests), packages no audited file belongs to, invalid JSON`]
      : []),
  ];

  // ── radius ──────────────────────────────────────────────────────────────
  const radiusSet = CODE_SET;
  const hardRegexes = [
    { label: "class rounded-[…], counted when the value is a px or rem length", regex: RADIUS_BRACKET_RE },
    { label: "inline border-radius: <value>, counted when the value is a px or rem length", regex: RADIUS_KEBAB_RE },
    { label: "inline borderRadius: <value>, counted when the value is a px or rem length", regex: RADIUS_CAMEL_RE },
  ];
  const varRegexes = [
    { label: "class rounded-[…], counted when the value is var(--x)", regex: RADIUS_BRACKET_RE },
    { label: "class rounded-(--x)", regex: RADIUS_PAREN_RE },
    { label: "inline border-radius: <value>, counted when the value is var(--x)", regex: RADIUS_KEBAB_RE },
    { label: "inline borderRadius: <value>, counted when the value is var(--x)", regex: RADIUS_CAMEL_RE },
  ];
  const radiusNotes = [
    "A use is one class or one inline declaration. A zero radius with a unit or inline (rounded-[0px], border-radius: 0, borderRadius: 0) is neither var nor hardcoded and is not counted; `rounded-[0]` without a unit lands in scale.radius.arbitrary_other.",
    "Inline = `border-radius: <value>` (also inside template strings) and `borderRadius: <value>`; an unquoted number in a `borderRadius:` property is read as px (React). Values that are expressions (`borderRadius: shape.radius`) are not seen.",
  ];
  add({
    id: "scale.radius.var_uses", kind: "mechanical", unit: "match", value: sum(radius.varUses),
    definition: { summary: "Radius taken from a custom property: `rounded-[var(--x)]`, `rounded-(--x)`, `border-radius: var(--x)`, `borderRadius: \"var(--x)\"`.", regexes: varRegexes, fileSet: radiusSet },
    perFile: radius.varUses,
    detail: { class: radius.varClass, inline: radius.varInline, byProperty: sortedByCount(radius.varByName), inAuditedCss: radius.cssVar, ...scopeSplit(radius.varUses, ex) },
    notes: radiusNotes,
  });
  add({
    id: "scale.radius.hardcoded_uses", kind: "mechanical", unit: "match", value: sum(radius.hard),
    definition: { summary: "Radius spelled as a px or rem literal: class `rounded-[Npx]` plus inline `border-radius: Npx` / `borderRadius: N`.", regexes: hardRegexes, fileSet: radiusSet },
    perFile: radius.hard,
    detail: {
      class: radius.hardClass,
      inline: radius.hardInline,
      byValue: sortedByCount(radius.hardByValue),
      sites: cap(radius.sites.sort((a, b) => byString(a.file, b.file) || a.line - b.line), 50),
      inAuditedCss: radius.cssHard,
      ...scopeSplit(radius.hard, ex),
    },
    notes: [...radiusNotes, "Stylesheet declarations in audited css are reported under detail.inAuditedCss and are not part of the value."],
  });
  add({
    id: "scale.radius.hardcoded_files", kind: "mechanical", unit: "file", value: radius.hard.size,
    definition: { summary: "Files holding at least one hardcoded px/rem radius (perFile count = uses in the file).", regexes: hardRegexes, fileSet: radiusSet },
    perFile: radius.hard,
  });
  add({
    id: "scale.radius.named_classes", kind: "mechanical", unit: "match", value: sum(radius.named),
    definition: { summary: "Tailwind named radius classes: rounded, rounded-(none|xs|sm|md|lg|xl|2xl|3xl|4xl|full), each with an optional side or corner (rounded-t-lg, rounded-tl-md).", regex: RADIUS_NAMED_RE, fileSet: radiusSet },
    perFile: radius.named,
    detail: { byClass: sortedByCount(radius.namedByClass), ...scopeSplit(radius.named, ex) },
    notes: ["The bare word `rounded` also matches when it appears in prose inside a string; there is no className parsing."],
  });
  add({
    id: "scale.radius.arbitrary_other", kind: "mechanical", unit: "match", value: sum(radius.other),
    definition: { summary: "`rounded-[…]` classes whose value is neither a var() nor a px/rem length (rounded-[inherit], rounded-[50%]).", regex: RADIUS_BRACKET_RE, fileSet: radiusSet },
    perFile: radius.other,
  });
  const named = sum(radius.named);
  const viaVar = sum(radius.varUses);
  const hard = sum(radius.hard);
  const denom = named + viaVar + hard;
  add({
    id: "scale.radius.named_or_var_share", kind: "mechanical", unit: "ratio", value: denom ? round4((named + viaVar) / denom) : null,
    definition: {
      summary: "(named radius classes + var() radius uses) ÷ (named + var + hardcoded px/rem radius uses). A share of radius utilities, not a conformance verdict.",
      regex: null,
      fileSet: radiusSet,
    },
    detail: { numerator: named + viaVar, denominator: denom, named, var: viaVar, hardcoded: hard },
    notes: denom ? ["Counts `rounded-md` as 'named' without asking whether the theme maps it to a token; scale.radius.* counters give the three parts."] : ["no radius utilities found, so there is no ratio (value null)"],
  });

  // ── shadow ──────────────────────────────────────────────────────────────
  add({
    id: "scale.shadow_utility.matches", kind: "mechanical", unit: "match", value: sum(shadow.named),
    definition: { summary: "Tailwind named shadow utilities shadow-xs, shadow-sm, shadow-md, shadow-lg, shadow-xl (`--shadow-*` definitions and `inset-shadow-*` / `drop-shadow-*` are excluded by the boundary).", regex: SHADOW_NAMED_RE, fileSet: CODE_SET },
    perFile: shadow.named,
    detail: { bySize: sortedByCount(shadow.bySize), ...scopeSplit(shadow.named, ex) },
    notes: ["The bare `shadow` class is not counted: the word is too common in prose."],
  });
  add({
    id: "scale.shadow_utility.files", kind: "mechanical", unit: "file", value: shadow.named.size,
    definition: { summary: "Files holding at least one named shadow utility (perFile count = utilities in the file).", regex: SHADOW_NAMED_RE, fileSet: CODE_SET },
    perFile: shadow.named,
    detail: scopeSplit(new Map([...shadow.named.keys()].map((k) => [k, 1])), ex),
  });
  add({
    id: "scale.shadow_utility.other_named_matches", kind: "mechanical", unit: "match", value: sum(shadow.other),
    definition: { summary: "Named shadow utilities outside the shadow-(xs|sm|md|lg|xl) set: shadow-2xs, shadow-2xl, shadow-inner, shadow-none.", regex: SHADOW_OTHER_RE, fileSet: CODE_SET },
    perFile: shadow.other,
    detail: { byClass: sortedByCount(shadow.otherByClass), ...scopeSplit(shadow.other, ex) },
  });
  add({
    id: "scale.shadow_arbitrary.matches", kind: "mechanical", unit: "match", value: sum(shadow.arb),
    definition: { summary: "Arbitrary shadow utilities: `shadow-[…]` and `shadow-(--x)`.", regex: SHADOW_ARBITRARY_RE, fileSet: CODE_SET },
    perFile: shadow.arb,
    detail: { varOnly: shadow.arbVarOnly, composite: shadow.arbComposite, ...scopeSplit(shadow.arb, ex) },
    notes: ["varOnly = the bracket holds exactly one var(--x) (a token); composite = anything else. `shadow-[<colour>]` sets a shadow colour and is counted here too."],
  });

  // ── spacing ─────────────────────────────────────────────────────────────
  const spacingDef = (summary) => ({ summary, regex: SPACING_ARBITRARY_RE, fileSet: CODE_SET });
  add({
    id: "scale.spacing_arbitrary.matches", kind: "mechanical", unit: "match", value: sum(spacing.matches),
    definition: spacingDef("Spacing utilities with an arbitrary bracket value: padding, margin, gap and space-x/y (`p-[3px]`, `-mt-[10px]`, `gap-[var(--g)]`)."),
    perFile: spacing.matches,
    detail: { byKind: sortedByCount(spacing.byKind), byUtility: sortedByCount(spacing.byUtility), byValue: sortedByCount(spacing.byValue), ...scopeSplit(spacing.matches, ex) },
    notes: ["byKind: length = a px/rem/em literal, var = the value uses var(), other = calc(), %, vh and so on. Sizing (w-, h-) and offsets (top-, left-) are not spacing here."],
  });
  add({
    id: "scale.spacing_arbitrary.length_literal_matches", kind: "mechanical", unit: "match", value: sum(spacing.literal),
    definition: spacingDef("Spacing utilities whose bracket value is a px, rem or em length literal."),
    perFile: spacing.literal,
    detail: scopeSplit(spacing.literal, ex),
  });
  add({
    id: "scale.spacing_arbitrary.files", kind: "mechanical", unit: "file", value: spacing.matches.size,
    definition: spacingDef("Files holding at least one spacing utility with an arbitrary bracket value (perFile count = utilities in the file)."),
    perFile: spacing.matches,
  });

  // ── icon libraries ──────────────────────────────────────────────────────
  const importRegex = IMPORT_RE; // the package name it captures is then tested against a fixed library table
  const importNotes = ["An import is any `from '<pkg>'`, `import '<pkg>'`, `import('<pkg>')` or `require('<pkg>')` whose package name is in a fixed library table; there is no AST, so a string that merely reads `from 'lucide-react'` also counts."];
  const iconFileOf = (key) => iconFiles.get(key);
  const members = (files) => new Map([...files].map((f) => [f, 1]));
  const iconLabel = { lucide: "lucide (lucide-react and its framework siblings)", radix_icons: "@radix-ui/react-icons", simple_icons: "simple-icons (@icons-pack/react-simple-icons, simple-icons, react-simple-icons)" };
  for (const key of NAMED_ICON_KEYS) {
    add({
      id: `scale.icon_library.${key}_files`, kind: "mechanical", unit: "file", value: iconFileOf(key).size,
      definition: { summary: `Files importing ${iconLabel[key]}.`, regex: importRegex, fileSet: CODE_SET },
      perFile: members(iconFileOf(key)),
      detail: { files: cap([...iconFileOf(key)].sort(byString), 40), declaredAs: [...iconDeclared.get(key)].sort(byString) },
      notes: importNotes,
    });
  }
  const otherKeys = ICON_LIBS.map((l) => l.key).filter((k) => !NAMED_ICON_KEYS.includes(k));
  const otherUnion = new Set();
  for (const k of otherKeys) for (const f of iconFileOf(k)) otherUnion.add(f);
  const anyUnion = new Set(otherUnion);
  for (const k of NAMED_ICON_KEYS) for (const f of iconFileOf(k)) anyUnion.add(f);
  const byLibrary = new Map(ICON_LIBS.filter((l) => iconFileOf(l.key).size).map((l) => [l.key, iconFileOf(l.key).size]));
  add({
    id: "scale.icon_library.other_files", kind: "mechanical", unit: "file", value: otherUnion.size,
    definition: { summary: `Files importing any other library in the fixed table (${otherKeys.join(", ")}).`, regex: importRegex, fileSet: CODE_SET },
    perFile: members(otherUnion),
    detail: { byLibrary: sortedByCount(new Map([...byLibrary].filter(([k]) => otherKeys.includes(k)))) },
    notes: importNotes,
  });
  add({
    id: "scale.icon_library.any_files", kind: "mechanical", unit: "file", value: anyUnion.size,
    definition: { summary: "Files importing at least one icon library (a file importing two counts once).", regex: importRegex, fileSet: CODE_SET },
    perFile: members(anyUnion),
    detail: { byLibrary: sortedByCount(byLibrary) },
    notes: importNotes,
  });
  add({
    id: "scale.icon_library.distinct_libraries", kind: "mechanical", unit: "distinct", value: byLibrary.size,
    definition: { summary: "Icon libraries (from the fixed table) imported by at least one file.", regex: importRegex, fileSet: CODE_SET },
    detail: { libraries: [...byLibrary.keys()].sort(byString) },
  });
  const declaredIcons = ICON_LIBS.filter((l) => iconDeclared.get(l.key).size);
  add({
    id: "scale.icon_library.declared_libraries", kind: "mechanical", unit: "distinct", value: declaredIcons.length,
    definition: { summary: "Icon libraries (from the fixed table) named in a package.json dependency field.", regex: null, fileSet: `${MANIFEST_SET} (${DEP_FIELDS.join(", ")})` },
    detail: {
      libraries: declaredIcons.map((l) => l.key).sort(byString),
      packages: cap(declaredIcons.flatMap((l) => [...iconDeclared.get(l.key)]).sort(byString), 40),
      manifests: manifestRows.map((m) => m.rel),
      manifestsSkipped: cap(manifestInfo.skipped),
    },
    notes: manifestNote,
  });

  // ── competing UI libraries ──────────────────────────────────────────────
  const uiRows = UI_LIBS.map((l) => ({
    library: l.label,
    declared: [...uiDeclared.get(l.key)].sort(byString),
    importFiles: uiFiles.get(l.key).size,
  }));
  const uiImportUnion = new Set();
  for (const l of UI_LIBS) for (const f of uiFiles.get(l.key)) uiImportUnion.add(f);
  const uiDeclaredCount = uiRows.filter((r) => r.declared.length).length;
  const uiSet = "MUI (@mui/*, @material-ui/*), Chakra UI (@chakra-ui/*), Ant Design (antd, @ant-design/*), Mantine (@mantine/*) — a fixed list";
  add({
    id: "scale.competing_ui_library.declared", kind: "mechanical", unit: "distinct", value: uiDeclaredCount,
    definition: { summary: "Competing UI libraries named in a package.json dependency field.", regex: null, fileSet: `${uiSet}; ${MANIFEST_SET}` },
    detail: { libraries: uiRows, manifests: manifestRows.map((m) => m.rel), manifestsSkipped: cap(manifestInfo.skipped) },
    notes: manifestNote,
  });
  add({
    id: "scale.competing_ui_library.imported_files", kind: "mechanical", unit: "file", value: uiImportUnion.size,
    definition: { summary: "Files importing a competing UI library.", regex: importRegex, fileSet: `${uiSet}; ${CODE_SET}` },
    perFile: members(uiImportUnion),
    detail: { libraries: uiRows },
    notes: importNotes,
  });
  add({
    id: "scale.competing_ui_library.present", kind: "presence", unit: "boolean", value: uiDeclaredCount > 0 || uiImportUnion.size > 0,
    definition: { summary: "A competing UI library is declared in a package.json or imported by an audited file.", regex: null, fileSet: uiSet },
    notes: ["The list is fixed (MUI, Chakra, antd, Mantine); another component library is not detected."],
  });

  return out;
}

module.exports = { group: GROUP, run };
