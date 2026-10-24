"use strict";

/**
 * reachability.js — which component files does no other file import? An
 * import-RESOLVING analysis, not a filename grep: every specifier is resolved
 * to a file (relative paths, tsconfig/jsconfig `paths` aliases such as `@/`,
 * `baseUrl`, extension probing, index files, TS-style `./x.js` → `./x.ts`),
 * so "imported" means "some file in the census really pulls this file in".
 * Derived tallies (colour hits inside unimported files) are computed here from
 * that resolver plus the drift scanner's per-file hits, never by a model.
 *
 * How imports are found. A small tokenizer (comments, strings, template
 * literals, regex literals and JSX text are skipped, so an `import` that only
 * appears in a comment, a docs code sample, a template string or the text of an
 * element is NOT an edge) reads:
 *   • `import … from "x"`, `import "x"`, `import type … from "x"`
 *   • `export … from "x"`, `export * from "x"`, `export * as ns from "x"`
 *   • `import("x")` and `require("x")` with a literal (or substitution-free
 *     template) argument, `import x = require("x")`
 * Static `import`/`export … from` count only at the top level of the file.
 * `.vue` / `.svelte` files contribute the imports of their <script> blocks.
 *
 * JSX. In every file but .ts, a `<` where an expression may start and that opens
 * a well-formed tag begins an element; its tags and text are markup (an
 * unbalanced bracket, a quote, `//` or a backtick in the text means nothing) and
 * only its `{ … }` containers are code. A `<` that does not turn out to be an
 * element — the markup never closes, a closing tag does not match — is read
 * again as an operator, so generics and angle-bracket assertions are safe; if
 * that happens too often in one file JSX is switched off for the rest of it.
 * In .ts files (where `<T>` is a generic or an assertion) JSX is never read.
 *
 * What static analysis cannot see (so "no importer" is an upper bound on dead
 * code, and every file listed needs a human look before it is deleted):
 *   • string-built paths: `import(\`./pages/${name}\`)`, `require(variable)` —
 *     counted in reachability.graph.references.nonliteral, never followed
 *   • MDX/Markdown imports (`.mdx` is outside the census), CSS `@import`/`url()`,
 *     HTML `<script src>`, `import.meta.glob`, `new URL("./x", import.meta.url)`,
 *     triple-slash references, bundler magic such as webpack aliases or Vite
 *     `resolve.alias` that are not mirrored in a tsconfig/jsconfig
 *   • framework conventions beyond the entry list below: Vite/CRA/Remix/Astro/
 *     Expo entry files (`src/main.tsx`, `app/root.tsx`, …), Storybook stories,
 *     config-driven loading, `package.json` `main`/`bin`/`exports`, scripts run
 *     directly by node
 *   • imports that cross a package boundary (workspace packages named in
 *     package.json, `#subpath` imports) and importers outside the audited dirs
 *   • JSX that cannot be parsed as JSX (Flow-style generics, an element that
 *     never closes): its text is read as code, as before, so an unbalanced
 *     bracket in that text can hide the imports that follow it
 *   • files over 5 MB: ctx.read does not read them, so their imports are unknown
 *     (reachability.graph.files_skipped_unread lists them)
 *   • `import type` is treated as an import (it is a dependency for the type
 *     checker); reachability.components.type_only_import says how many files
 *     are imported only that way
 *
 * Entry points (the file set transitive reachability starts from): Next.js
 * app-router route and metadata files (`app/**\/{page,layout,route,loading,
 * error,global-error,not-found,forbidden,unauthorized,template,default,sitemap,
 * robots,manifest,opengraph-image,twitter-image,icon,apple-icon}.<ext>`) in the
 * ROOT app directory of a package — `app/` or `src/app/` directly under the
 * repo root, `apps/<x>/`, `packages/<x>/`, `examples/<x>/`, or beside any
 * package.json — skipping private `_folders`. Such a directory must not belong
 * to a package whose package.json exists and does not name `next` (no
 * next.config.* either); with no package.json it must hold a route file itself
 * or directly under a `(group)` folder. So a Remix `app/routes/error.tsx`, a
 * component folder `components/app/loading.tsx` and `app/_ui/icon.tsx` are
 * ordinary files. Another framework's `app/` directory that does have a
 * package.json naming next, or no package.json and a layout/page-named file,
 * cannot be told apart. Also pages-router files
 * (`[apps/x/][src/]pages/**`) and the root special files
 * `[src/]{middleware,proxy,instrumentation,instrumentation-client,
 * mdx-components}.<ext>`. Test files are never entries.
 *
 * Two notions, both reported, never conflated:
 *   no_importer   — in-degree 0: no OTHER census file references the file
 *                   (tests and .d.ts files count as importers; the variant
 *                   excl_tests ignores tests) and it is not an entry point
 *   unreachable   — not reachable from any entry point by following imports
 *                   (a file imported only by another unimported file, or only
 *                   by tests, is unreachable but not no_importer)
 *
 * Population. "Component files" = audited ts/tsx/js/jsx/vue/svelte files with a
 * `components/` path segment (tests, .d.ts and the token source are not audited
 * files); "ui" = under `components/ui/`. CSS files are nodes but are not parsed
 * for imports, so they are never judged unimported.
 *
 * Counter ids (API — keep stable):
 *   reachability.graph.files_parsed             census files whose text was read and scanned for imports
 *   reachability.graph.files_skipped_unread     parseable census files not read (over 5 MB)
 *   reachability.graph.references.total         import references found (all kinds)
 *   reachability.graph.references.resolved      …that resolved to a census file
 *   reachability.graph.references.package       …bare specifiers treated as packages
 *   reachability.graph.references.outside_census …local specifiers resolving to a file outside the census
 *   reachability.graph.references.missing       …local specifiers matching no file
 *   reachability.graph.references.nonliteral    import()/require() with a non-literal argument
 *   reachability.graph.alias_configs            tsconfig/jsconfig files that supplied paths/baseUrl
 *   reachability.graph.entries                  entry-point files
 *   reachability.components.ui.total            component files under components/ui/
 *   reachability.components.other.total         component files elsewhere under components/
 *   reachability.components.no_importer         component files with no importer (ui + other)
 *   reachability.components.ui.no_importer
 *   reachability.components.other.no_importer
 *   reachability.components.ui.no_importer_ratio
 *   reachability.components.other.no_importer_ratio
 *   reachability.components.no_importer_excl_tests    same, tests do not count as importers
 *   reachability.components.type_only_import    imported, but only via import type / export type
 *   reachability.components.unreachable_from_entries  not reachable from any entry point
 *   reachability.colour_hits.assessed           scanner colour hits in files whose imports were parsed
 *   reachability.colour_hits.in_no_importer_files
 *   reachability.colour_hits.in_unreachable_files
 *   reachability.colour_hits.share_in_no_importer_files
 *   reachability.colour_hits.share_in_unreachable_files
 *
 */

const path = require("path");
const { byString, counter, round4 } = require("./counter");
const {
  APP_ROUTE_RE, COMPONENTS_DIR_RE, COMPONENTS_UI_RE, PACKAGE_NAME_RE, PAGES_ROUTE_RE, PARSE_EXTS, SPECIAL_ENTRY_RE,
  buildGraph, hasImporter,
} = require("./graph");

const GROUP = "reachability";

/* ---------------------------------------------------------------- counters */

const membership = (files) => files.map((rel) => ({ file: rel, count: 1 }));
const AUDITED_COMPONENTS =
  "audited ts/tsx/js/jsx/vue/svelte files with a components/ path segment (tests, .d.ts files and the token source are not audited)";

function ratioCounter(id, numerator, denominator, definition, notes) {
  return counter({
    id,
    group: GROUP,
    kind: "mechanical",
    unit: "ratio",
    value: denominator ? round4(numerator / denominator) : null,
    definition,
    detail: { numerator, denominator },
    notes: denominator ? notes : [...(notes ?? []), "denominator is 0, so there is no ratio (value null)"],
  });
}

function scanColourHits(ctx) {
  try {
    const scan = ctx.scan();
    if (!Array.isArray(scan.perFile)) throw new Error("scanProject returned no perFile rows");
    return { rows: scan.perFile, error: null };
  } catch (e) {
    ctx.warn(`reachability: the drift scanner could not run (${e && e.message ? e.message : e}); colour-hit tallies are 0`);
    return { rows: [], error: e && e.message ? e.message : String(e) };
  }
}

function run(ctx) {
  const g = buildGraph(ctx);
  const s = g.stats;
  const ext = (rel) => path.posix.extname(rel);

  const comps = ctx.audited.filter((f) => PARSE_EXTS.has(ext(f.rel)) && COMPONENTS_DIR_RE.test(f.rel));
  const ui = comps.filter((f) => COMPONENTS_UI_RE.test(f.rel));
  const other = comps.filter((f) => !COMPONENTS_UI_RE.test(f.rel));
  const noImporter = (f) => !hasImporter(g, f.rel);
  const noImporterExclTests = (f) => !hasImporter(g, f.rel, { exclTests: true });
  const uiNo = ui.filter(noImporter);
  const otherNo = other.filter(noImporter);
  const noTests = comps.filter(noImporterExclTests);
  const noEntries = !g.reached;
  const unreachable = noEntries ? [] : comps.filter((f) => !g.reached.has(f.rel));
  const typeOnly = comps.filter((f) => {
    const from = g.importers.get(f.rel);
    if (!from || !from.size) return false;
    for (const onlyTypes of from.values()) if (!onlyTypes) return false;
    return true;
  });

  const emptyNote = comps.length ? [] : ["no component files (no components/ directory among the audited files)"];
  const noEntryNote = noEntries
    ? ["no entry points were recognised (no Next.js app/pages routes or special files), so transitive reachability is not computed and this is 0"]
    : [];
  const splitDetail = (uiList, otherList) => ({
    ui: { count: uiList.length, of: ui.length },
    other: { count: otherList.length, of: other.length },
  });

  // derived tallies: scanner hits × resolver
  const scan = scanColourHits(ctx);
  const hitsOf = new Map(scan.rows.map((r) => [r.file, r.c]));
  const assessed = ctx.audited.filter((f) => PARSE_EXTS.has(ext(f.rel)));
  const assessedSet = new Set(assessed.map((f) => f.rel));
  let hitsAssessed = 0;
  const hitsAssessedBy = new Map();
  let hitsSkipped = 0;
  let filesWithHits = 0;
  const hitsNoImporter = new Map();
  const hitsUnreachable = new Map();
  for (const f of assessed) {
    const c = hitsOf.get(f.rel) ?? 0;
    if (c && !ctx.read(f.rel)) { hitsSkipped += c; continue; } // the scanner saw it, the context did not (over 5 MB): its imports are unknown
    hitsAssessed += c;
    if (c) { filesWithHits++; hitsAssessedBy.set(f.rel, c); }
    if (c && !hasImporter(g, f.rel)) hitsNoImporter.set(f.rel, c);
    if (c && g.reached && !g.reached.has(f.rel)) hitsUnreachable.set(f.rel, c);
  }
  let hitsNotAssessed = 0;
  for (const r of scan.rows) if (!assessedSet.has(r.file)) hitsNotAssessed += r.c;
  const sum = (m) => [...m.values()].reduce((a, b) => a + b, 0);
  const hitsDef = (summary) => ({
    summary,
    regex: null,
    fileSet: "audited ts/tsx/js/jsx/vue/svelte files (css files are not parsed for imports, so they are not assessed); hits are the drift scanner's colour hits (hex, rgb/rgba, hsl/hsla, oklch calls) from scanProject",
  });
  const hitsNotes = [
    "colour hits are the drift scanner's regex hits (a tally, not a verdict); this counter only splits that tally by import reachability",
    ...(hitsNotAssessed ? [`${hitsNotAssessed} further hit(s) sit in css files, which are not assessed`] : []),
    ...(hitsSkipped ? [`${hitsSkipped} further hit(s) sit in files that were not read (over 5 MB), so their imports are unknown and they are left out`] : []),
    ...(scan.error ? [`the drift scanner could not run: ${scan.error}`] : []),
  ];

  const aliasDetail = g.configs.slice(0, 20).map((c) => ({ file: c.file, baseUrl: c.baseUrl, patterns: c.patterns.slice(0, 20) }));
  const entryKinds = { app_route: 0, pages_route: 0, special: 0 };
  for (const k of g.entries.values()) entryKinds[k]++;
  const missingSpecs = [...s.missingSpecs].sort(byString).slice(0, 20);
  const methodSummary = "token-level scan of import/export-from/import()/require() with literal specifiers, resolved to census files";

  return [
    counter({
      id: "reachability.graph.files_parsed",
      group: GROUP,
      kind: "mechanical",
      unit: "file",
      value: s.parsed,
      definition: {
        summary: "Census files whose text was read and scanned for imports (ts, tsx, js, jsx, plus the <script> blocks of vue/svelte). Tests and .d.ts files are parsed too; css files are nodes but are not parsed; a file over 5 MB is not read, so it is counted in files_skipped_unread instead",
        regex: null,
        fileSet: "the census (tests and declarations included)",
      },
      notes: ctx.census.length ? undefined : ["the census is empty, so there is nothing to parse"],
    }),
    counter({
      id: "reachability.graph.files_skipped_unread",
      group: GROUP,
      kind: "mechanical",
      unit: "file",
      value: s.unread.size,
      definition: {
        summary: "Parseable census files that were not read because they exceed the 5 MB read limit (the context warns about each). Their imports are unknown: the files they import can look unimported, and their own colour hits are left out of the colour_hits tallies",
        regex: null,
        fileSet: "the census files with a ts, tsx, js, jsx, vue or svelte extension",
      },
      perFile: s.unread,
      notes: s.unread.size ? ["files they import may be reported by the no_importer counters"] : undefined,
    }),
    counter({
      id: "reachability.graph.references.total",
      group: GROUP,
      kind: "mechanical",
      unit: "match",
      value: s.total,
      definition: { summary: `Import references found: ${methodSummary}`, regex: null, fileSet: "the parsed census files" },
      perFile: s.totalByFile,
      detail: { byKind: Object.fromEntries(Object.keys(s.byKind).sort(byString).map((k) => [k, s.byKind[k]])) },
      notes: [
        "static imports and export-from count only at the top level of a file; an import that appears only in a comment, string, template literal or JSX text is not a reference",
        "JSX text is skipped only where the markup parses as JSX (every tag closes and matches); a file whose `<` cannot be read as an element — and every .ts file, where `<T>` is a generic or an assertion — is read as plain code",
      ],
    }),
    counter({
      id: "reachability.graph.references.resolved",
      group: GROUP,
      kind: "mechanical",
      unit: "match",
      value: s.resolved,
      definition: {
        summary: "References resolved to a census file through relative paths, tsconfig/jsconfig paths aliases, baseUrl, extension probing and index files",
        regex: null,
        fileSet: "the parsed census files",
      },
      perFile: s.resolvedByFile,
      detail: { aliasConfigs: g.configs.length },
    }),
    counter({
      id: "reachability.graph.references.package",
      group: GROUP,
      kind: "mechanical",
      unit: "match",
      value: s.package,
      definition: {
        summary: "Bare specifiers that name a package (react, next/link, @scope/pkg, node:fs, a #subpath import) and no alias or baseUrl file. Not followed",
        regex: PACKAGE_NAME_RE,
        fileSet: "the parsed census files",
      },
      perFile: s.packageByFile,
      notes: ["workspace packages that live in this repo are counted here too: imports across a package boundary are not followed"],
    }),
    counter({
      id: "reachability.graph.references.outside_census",
      group: GROUP,
      kind: "mechanical",
      unit: "match",
      value: s.outside,
      definition: {
        summary: "Relative or alias specifiers that point at a file that exists but is not in the census (json, svg, md, mdx, a file outside the audited dirs, a generated or excluded directory)",
        regex: null,
        fileSet: "the parsed census files",
      },
      perFile: s.outsideByFile,
    }),
    counter({
      id: "reachability.graph.references.missing",
      group: GROUP,
      kind: "mechanical",
      unit: "match",
      value: s.missing,
      definition: {
        summary: "Relative or alias-looking specifiers that match no file at all (an alias no tsconfig defines, a generated file that is not checked in, a typo)",
        regex: null,
        fileSet: "the parsed census files",
      },
      perFile: s.missingByFile,
      detail: { specifiers: missingSpecs },
      notes: ["a high number usually means an alias is configured outside tsconfig/jsconfig (bundler config) or the audited dirs are too narrow, and the no_importer counts are then too high"],
    }),
    counter({
      id: "reachability.graph.references.nonliteral",
      group: GROUP,
      kind: "mechanical",
      unit: "match",
      value: s.nonLiteral,
      definition: {
        summary: "import() and require() calls whose argument is not a literal string (a variable, a string built with a template substitution or +). Static analysis cannot follow these, so files they load look unimported",
        regex: null,
        fileSet: "the parsed census files",
      },
      perFile: s.nonLiteralByFile,
    }),
    counter({
      id: "reachability.graph.alias_configs",
      group: GROUP,
      kind: "mechanical",
      unit: "file",
      value: g.configs.length,
      definition: {
        summary: "tsconfig.json / jsconfig.json files that supplied compilerOptions.paths or baseUrl to at least one file (nearest config above the importing file; relative `extends` and `references` are followed; comments and trailing commas are tolerated)",
        regex: null,
        fileSet: "tsconfig.json and jsconfig.json files above the parsed census files",
      },
      perFile: new Map(g.configs.map((c) => [c.file, 1])),
      detail: { configs: aliasDetail },
      notes: g.configs.length ? undefined : ["no tsconfig/jsconfig with paths or baseUrl was found: only relative specifiers can resolve to files"],
    }),
    counter({
      id: "reachability.graph.entries",
      group: GROUP,
      kind: "mechanical",
      unit: "file",
      value: g.entries.size,
      definition: {
        summary: "Entry-point files that count as imported by the framework: Next.js app-router route/metadata files in the root app directory of a Next.js package (private _folders excluded; a package.json, if there is one, must name next; without one the app directory must hold a route file), pages-router files and root special files (middleware, proxy, instrumentation, mdx-components)",
        regex: APP_ROUTE_RE,
        fileSet: "the census minus test files",
      },
      perFile: membership([...g.entries.keys()].sort(byString)),
      detail: { ...entryKinds, pagesRouteRegex: PAGES_ROUTE_RE.source, specialRegex: SPECIAL_ENTRY_RE.source },
      notes: [
        "regex is the app-router pattern, applied to the path from its `app/` segment on; that `app/` must sit directly under the repo root, a `src/` there, `apps|packages|examples/<x>/` or a directory with a package.json. The pages-router and special-file patterns are in detail.pagesRouteRegex and detail.specialRegex",
        "other frameworks' entry files (src/main.tsx, app/root.tsx, stories, ...) are not recognised; another framework's `app/` directory is told apart from Next's only when its package.json exists and does not name next, or (with no package.json) when it holds no route file (page, layout, route, not-found, ...) at its top level",
      ],
    }),

    counter({
      id: "reachability.components.ui.total",
      group: GROUP,
      kind: "mechanical",
      unit: "file",
      value: ui.length,
      definition: { summary: "Component files under components/ui/ (the denominator of the ui counters)", regex: COMPONENTS_UI_RE, fileSet: AUDITED_COMPONENTS },
      notes: emptyNote.length ? emptyNote : undefined,
    }),
    counter({
      id: "reachability.components.other.total",
      group: GROUP,
      kind: "mechanical",
      unit: "file",
      value: other.length,
      definition: { summary: "Component files under components/ but not under components/ui/ (the denominator of the other counters)", regex: COMPONENTS_DIR_RE, fileSet: AUDITED_COMPONENTS },
    }),
    counter({
      id: "reachability.components.no_importer",
      group: GROUP,
      kind: "mechanical",
      unit: "file",
      value: uiNo.length + otherNo.length,
      definition: {
        summary: "Component files that no other census file imports (in-degree 0; tests and .d.ts files count as importers) and that are not entry points",
        regex: COMPONENTS_DIR_RE,
        fileSet: AUDITED_COMPONENTS,
      },
      perFile: membership([...uiNo, ...otherNo].map((f) => f.rel).sort(byString)),
      detail: { ...splitDetail(uiNo, otherNo), of: comps.length },
      notes: ["an upper bound on dead code: string-built paths, MDX/CSS imports and framework conventions beyond the entry list are invisible (see the module header)", ...emptyNote],
    }),
    counter({
      id: "reachability.components.ui.no_importer",
      group: GROUP,
      kind: "mechanical",
      unit: "file",
      value: uiNo.length,
      definition: { summary: "Component files under components/ui/ that no other census file imports", regex: COMPONENTS_UI_RE, fileSet: AUDITED_COMPONENTS },
      perFile: membership(uiNo.map((f) => f.rel)),
      detail: { of: ui.length },
    }),
    counter({
      id: "reachability.components.other.no_importer",
      group: GROUP,
      kind: "mechanical",
      unit: "file",
      value: otherNo.length,
      definition: { summary: "Component files under components/ but outside components/ui/ that no other census file imports", regex: COMPONENTS_DIR_RE, fileSet: AUDITED_COMPONENTS },
      perFile: membership(otherNo.map((f) => f.rel)),
      detail: { of: other.length },
    }),
    ratioCounter(
      "reachability.components.ui.no_importer_ratio", uiNo.length, ui.length,
      { summary: "components/ui/ files with no importer ÷ components/ui/ files", regex: COMPONENTS_UI_RE, fileSet: AUDITED_COMPONENTS },
    ),
    ratioCounter(
      "reachability.components.other.no_importer_ratio", otherNo.length, other.length,
      { summary: "Other component files with no importer ÷ other component files", regex: COMPONENTS_DIR_RE, fileSet: AUDITED_COMPONENTS },
    ),
    counter({
      id: "reachability.components.no_importer_excl_tests",
      group: GROUP,
      kind: "mechanical",
      unit: "file",
      value: noTests.length,
      definition: {
        summary: "Component files whose only importers (if any) are test files: in-degree 0 once tests are ignored as importers; entry points are excluded",
        regex: COMPONENTS_DIR_RE,
        fileSet: AUDITED_COMPONENTS,
      },
      perFile: membership(noTests.map((f) => f.rel)),
      detail: { of: comps.length, ...splitDetail(noTests.filter((f) => COMPONENTS_UI_RE.test(f.rel)), noTests.filter((f) => !COMPONENTS_UI_RE.test(f.rel))) },
    }),
    counter({
      id: "reachability.components.type_only_import",
      group: GROUP,
      kind: "mechanical",
      unit: "file",
      value: typeOnly.length,
      definition: {
        summary: "Component files that have importers but every reference to them is `import type` / `export type` (erased at build time, so the file is not shipped through that edge)",
        regex: null,
        fileSet: AUDITED_COMPONENTS,
      },
      perFile: membership(typeOnly.map((f) => f.rel)),
    }),
    counter({
      id: "reachability.components.unreachable_from_entries",
      group: GROUP,
      kind: "mechanical",
      unit: "file",
      value: unreachable.length,
      definition: {
        summary: "Component files not reachable from any entry point by following imports (a file imported only by unimported files or only by tests is unreachable)",
        regex: null,
        fileSet: AUDITED_COMPONENTS,
      },
      perFile: membership(unreachable.map((f) => f.rel)),
      detail: { computed: !noEntries, entries: g.entries.size, of: comps.length, ...splitDetail(unreachable.filter((f) => COMPONENTS_UI_RE.test(f.rel)), unreachable.filter((f) => !COMPONENTS_UI_RE.test(f.rel))) },
      notes: noEntryNote.length ? noEntryNote : ["only the recognised entry points seed the walk; an app with another framework's entry files will show far too much as unreachable"],
    }),

    counter({
      id: "reachability.colour_hits.assessed",
      group: GROUP,
      kind: "mechanical",
      unit: "match",
      value: hitsAssessed,
      definition: hitsDef("The drift scanner's colour hits in files whose imports were parsed: the denominator of the colour_hits shares"),
      perFile: hitsAssessedBy,
      detail: { filesWithHits, notAssessed: hitsNotAssessed, skippedUnread: hitsSkipped },
      notes: hitsNotes,
    }),
    counter({
      id: "reachability.colour_hits.in_no_importer_files",
      group: GROUP,
      kind: "mechanical",
      unit: "match",
      value: sum(hitsNoImporter),
      definition: hitsDef("Colour hits inside files that no other census file imports and that are not entry points (any audited file, not only components)"),
      perFile: hitsNoImporter,
      detail: { files: hitsNoImporter.size },
      notes: hitsNotes,
    }),
    counter({
      id: "reachability.colour_hits.in_unreachable_files",
      group: GROUP,
      kind: "mechanical",
      unit: "match",
      value: sum(hitsUnreachable),
      definition: hitsDef("Colour hits inside files that are not reachable from any entry point by following imports"),
      perFile: hitsUnreachable,
      detail: { files: hitsUnreachable.size, computed: !noEntries },
      notes: noEntries ? [...noEntryNote, ...hitsNotes] : hitsNotes,
    }),
    ratioCounter(
      "reachability.colour_hits.share_in_no_importer_files", sum(hitsNoImporter), hitsAssessed,
      hitsDef("Colour hits in files with no importer ÷ colour hits in parsed files"),
    ),
    ratioCounter(
      "reachability.colour_hits.share_in_unreachable_files", sum(hitsUnreachable), hitsAssessed,
      hitsDef("Colour hits in files unreachable from the entry points ÷ colour hits in parsed files"),
      noEntries ? noEntryNote : undefined,
    ),
  ];
}

module.exports = { group: GROUP, run };
