"use strict";

/**
 * census.js — the file population every other counter rests on. Pure set
 * membership over the tree, no judgement: which files exist under the audited
 * dirs, which of them are tests / declarations / the token source, and what is
 * left to audit. If this module and a later counter disagree about "how many
 * files", this one is the reference.
 *
 * Population (from lib/design-source.js, shared with `drift scan`):
 *   census   = ts/tsx/js/jsx/css/vue/svelte files under the audited dirs
 *   audited  = census minus tests, `.d.ts` files and the resolved token source
 * The census skips node_modules, dist, build, out, coverage, vendor, reference,
 * .next, .expo, .git, .systemix, generated, __generated__, _generated, every
 * dot-directory, symlinks and `*.generated.*`, `*.gen.*` and `*.min.*` files.
 *
 * Counter ids (API — keep stable):
 *   census.files.total                  census size; detail.byExt
 *   census.files.tests                  test files (*.test.* / *.spec.* / __tests__/)
 *   census.files.declarations           *.d.ts / *.d.mts / *.d.cts
 *   census.files.token_source           1 when the resolved token source is in the census
 *   census.files.audited                census minus tests, declarations, token source
 *   census.files.unreadable             census files that cannot be opened as regular files (they contribute nothing to any counter)
 *   census.files.any_type               every regular file under the audited dirs, any extension
 *   census.audited.in_components_ui     audited files under a components/ui/ dir
 *   census.audited.outside_components_ui   audited files not under components/ui/
 *   census.audited.mockup_named         audited files whose basename contains "mockup"
 *   census.routes.app_pages             Next.js app-router page files (page.* under an app/ dir), tests excluded
 *   census.components.tsx_files         census tsx files under a components/ dir
 *   census.components.ui_files          census files (any census ext) under components/ui/
 */

const path = require("path");
const { counter, byString } = require("./counter");

const GROUP = "census";

const CENSUS_SET =
  "ts, tsx, js, jsx, css, vue and svelte files under the audited dirs (node_modules, dist, build, out, " +
  "coverage, vendor, reference, .next, .expo, .git, .systemix, generated, __generated__, _generated and dot-directories are skipped; " +
  "symlinks and *.generated.*, *.gen.* and *.min.* files are not followed)";
const AUDITED_SET = "the census minus test files, .d.ts files and the resolved token source";

// every pattern below is anchored on whole path segments: "myapp/page.tsx" is not under app/
const APP_PAGE_RE = /^(?:.*\/)?app\/(?:.*\/)?page\.(?:tsx|ts|jsx|js)$/;
const COMPONENTS_TSX_RE = /^(?:.*\/)?components\/.*\.tsx$/;
const COMPONENTS_UI_RE = /(?:^|\/)components\/ui\//;
const MOCKUP_RE = /mockup/i;

/** { ".ext": n } with keys sorted; extensionless files are grouped under "(none)". */
function byExt(rels) {
  const counts = new Map();
  for (const rel of rels) {
    const ext = path.posix.extname(rel) || "(none)";
    counts.set(ext, (counts.get(ext) ?? 0) + 1);
  }
  return Object.fromEntries([...counts.entries()].sort((a, b) => byString(a[0], b[0])));
}

/** One perFile row (count 1) per file — a membership list, capped by the counter builder. */
const membership = (files) => files.map((f) => ({ file: f.rel, count: 1 }));

/** Every regular file under the audited dirs, any extension (dot-directories included). */
function allFilesUnder(ctx) {
  const seen = new Set();
  for (const d of ctx.dirs) {
    if (ctx.isDirectory(d)) for (const f of ctx.listTree(d)) seen.add(f.rel);
    else if (ctx.exists(d)) seen.add(ctx.toPosix(d));
  }
  return [...seen].sort(byString);
}

function run(ctx) {
  const pop = ctx.population;
  const census = ctx.census;
  const audited = ctx.audited;
  const tokenRel = ctx.tokenSource.rel;
  const tokenInCensus = pop.tokenSourceInCensus;
  const dirNotes = [];
  if (pop.missingDirs.length) dirNotes.push(`audited dir(s) not found: ${pop.missingDirs.join(", ")}`);
  if (pop.rejectedDirs.length) dirNotes.push(`audited dir(s) outside the repo root were ignored: ${pop.rejectedDirs.join(", ")}`);
  if (!census.length) dirNotes.push("no source files under the audited dirs");
  // a symlinked audited dir that resolves outside the repo is refused by the resolver and lands in rejectedDirs

  const auditedUi = audited.filter((f) => COMPONENTS_UI_RE.test(f.rel));
  const auditedOutsideUi = audited.length - auditedUi.length;
  const mockups = audited.filter((f) => MOCKUP_RE.test(path.posix.basename(f.rel)));
  const testRels = new Set(pop.tests.map((f) => f.rel));
  const pages = census.filter((f) => APP_PAGE_RE.test(f.rel) && !testRels.has(f.rel));
  const componentTsx = census.filter((f) => COMPONENTS_TSX_RE.test(f.rel));
  const uiFiles = census.filter((f) => COMPONENTS_UI_RE.test(f.rel));
  const anyType = allFilesUnder(ctx);

  const tokenNotes = [];
  if (!tokenRel) tokenNotes.push("no token source resolved, so nothing was removed from the audited population for it");
  else if (!tokenInCensus) tokenNotes.push(`token source ${tokenRel} is outside the audited dirs, so it is not part of the census`);

  const unreadable = ctx.unreadable();
  return [
    counter({
      id: "census.files.total",
      group: GROUP,
      kind: "mechanical",
      unit: "file",
      value: census.length,
      definition: {
        summary: "Source files in the census (the extension set of the drift scanner), tests included",
        regex: null,
        fileSet: CENSUS_SET,
      },
      detail: { byExt: byExt(census.map((f) => f.rel)), dirs: pop.dirs },
      notes: dirNotes.length ? dirNotes : undefined,
    }),
    counter({
      id: "census.files.tests",
      group: GROUP,
      kind: "mechanical",
      unit: "file",
      value: pop.tests.length,
      definition: {
        summary: "Census files that are tests: a basename ending .test.<ext> or .spec.<ext>, or any file under a __tests__/ dir",
        regex: "\\.(?:test|spec)\\.[^./]+$|(^|/)__tests__/",
        fileSet: "the census",
      },
      perFile: membership(pop.tests),
    }),
    counter({
      id: "census.files.declarations",
      group: GROUP,
      kind: "mechanical",
      unit: "file",
      value: pop.declarations.length,
      definition: {
        summary: "Census files that are TypeScript declaration files",
        regex: "\\.d\\.[cm]?ts$",
        fileSet: "the census",
      },
      perFile: membership(pop.declarations),
    }),
    counter({
      id: "census.files.token_source",
      group: GROUP,
      kind: "mechanical",
      unit: "file",
      value: tokenInCensus ? 1 : 0,
      definition: {
        summary: "1 when the resolved token source is part of the census (and so removed from the audited population), else 0",
        regex: null,
        fileSet: "the resolved token source (design/tokens.css → config design.source → file named canonical in design docs → css file with the most custom properties)",
      },
      perFile: tokenInCensus ? [{ file: tokenRel, count: 1 }] : undefined,
      detail: { path: tokenRel, via: ctx.tokenSource.via, inCensus: tokenInCensus },
      notes: tokenNotes.length ? tokenNotes : undefined,
    }),
    counter({
      id: "census.files.audited",
      group: GROUP,
      kind: "mechanical",
      unit: "file",
      value: audited.length,
      definition: {
        summary: "The audited population: census files that are not tests, not .d.ts files and not the token source. The denominator other counters use",
        regex: null,
        fileSet: AUDITED_SET,
      },
      detail: {
        census: census.length,
        tests: pop.tests.length,
        declarations: pop.declarations.length,
        tokenSource: tokenInCensus ? 1 : 0,
        excludedUnion: census.length - audited.length,
        byExt: byExt(audited.map((f) => f.rel)),
      },
      notes: [
        "excludedUnion counts a file once even when it is both a test and a declaration, so tests + declarations + tokenSource can exceed it",
        ...dirNotes,
      ],
    }),
    counter({
      id: "census.files.unreadable",
      group: GROUP,
      kind: "mechanical",
      unit: "file",
      value: unreadable.length,
      definition: {
        summary: "Census files that cannot be opened as regular files: unreadable (permissions), a name that is not valid UTF-8, a FIFO or a device. They sit in the census and contribute nothing to any counter, so a nonzero value means other counters undercount",
        regex: null,
        fileSet: "the census",
      },
      perFile: membership(unreadable.map((u) => ({ rel: u.file }))),
      detail: { reasons: Object.fromEntries([...new Set(unreadable.map((u) => u.reason))].sort(byString).map((r) => [r, unreadable.filter((u) => u.reason === r).length])) },
      notes: unreadable.length ? ["a file over the 5 MB read cap is not listed here: it is opened fine and skipped by every counter with a warning"] : undefined,
    }),
    counter({
      id: "census.files.any_type",
      group: GROUP,
      kind: "mechanical",
      unit: "file",
      value: anyType.length,
      definition: {
        summary: "Every regular file under the audited dirs whatever its extension (svg, ico, json, md, ...), for context only",
        regex: null,
        fileSet: "all files under the audited dirs; node_modules, .git, .next, dist, build, out and coverage are skipped, dot-directories are included, symlinks are not followed",
      },
      detail: { byExt: byExt(anyType) },
      notes: ["a wider net than the census: it also walks vendor, reference, generated and dot-directories and keeps non-source files"],
    }),
    counter({
      id: "census.audited.in_components_ui",
      group: GROUP,
      kind: "mechanical",
      unit: "file",
      value: auditedUi.length,
      definition: {
        summary: "Audited files under a components/ui/ directory (vendored primitives such as shadcn/ui)",
        regex: COMPONENTS_UI_RE,
        fileSet: AUDITED_SET,
      },
      perFile: membership(auditedUi),
    }),
    counter({
      id: "census.audited.outside_components_ui",
      group: GROUP,
      kind: "mechanical",
      unit: "file",
      value: auditedOutsideUi,
      definition: {
        summary: "Audited files that are not under a components/ui/ directory",
        regex: null,
        fileSet: AUDITED_SET,
      },
    }),
    counter({
      id: "census.audited.mockup_named",
      group: GROUP,
      kind: "mechanical",
      unit: "file",
      value: mockups.length,
      definition: {
        summary: "Audited files whose basename contains \"mockup\" (case-insensitive, regex flag i): the candidates a guardrail may exempt as product mockups. Report totals with and without them",
        regex: MOCKUP_RE,
        fileSet: AUDITED_SET,
      },
      perFile: membership(mockups),
      notes: ["a filename rule only; whether a guardrail actually exempts the file is a separate fact (guardrails group)"],
    }),
    counter({
      id: "census.routes.app_pages",
      group: GROUP,
      kind: "mechanical",
      unit: "file",
      value: pages.length,
      definition: {
        summary: "Next.js app-router page files: basename page.tsx|ts|jsx|js with an \"app\" directory somewhere above it. A page file that is a test (anything under __tests__/) is not a route and is not counted",
        regex: APP_PAGE_RE,
        fileSet: "the census minus test files (so page.test.tsx, a page.tsx under __tests__/ and page.mdx are not counted)",
      },
      perFile: membership(pages),
      notes: ["route groups such as (app) and dynamic segments are directories like any other; the directory must be named exactly \"app\""],
    }),
    counter({
      id: "census.components.tsx_files",
      group: GROUP,
      kind: "mechanical",
      unit: "file",
      value: componentTsx.length,
      definition: {
        summary: "tsx files with a \"components\" directory anywhere in their path, tests included",
        regex: COMPONENTS_TSX_RE,
        fileSet: "the census",
      },
      perFile: membership(componentTsx),
    }),
    counter({
      id: "census.components.ui_files",
      group: GROUP,
      kind: "mechanical",
      unit: "file",
      value: uiFiles.length,
      definition: {
        summary: "Census files under a components/ui/ directory (any census extension, tests included)",
        regex: COMPONENTS_UI_RE,
        fileSet: "the census",
      },
      perFile: membership(uiFiles),
    }),
  ];
}

module.exports = { group: GROUP, run };
