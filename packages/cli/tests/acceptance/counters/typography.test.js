/**
 * typography.test.js — acceptance tests for the `typography` counter group.
 * Every expectation is hand-computed from a tiny temp repo (never from the live
 * repo): matches vs lines vs files, px vs rem, the 12px boundary, token-equal vs
 * no-token sizes, a commented-out token, CRLF, tests / .d.ts / the token source
 * out, ui/ in and out, and the exemptions a repo DECLARES in its guardrails.
 */

"use strict";

const fs = require("fs");
const path = require("path");
const { makeRepo, removeRepo, run, get, val } = require("./helpers");

const roots = [];
const repo = (files) => { const r = makeRepo(files); roots.push(r); return r; };
afterAll(() => roots.forEach(removeRepo));

const typo = (root, dirs = ["src"]) => run(root, { dirs, groups: ["typography"] });
const without = (files, key) => { const copy = { ...files }; delete copy[key]; return copy; };
const listAll = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
  const abs = path.join(dir, e.name);
  return e.isDirectory() ? listAll(abs) : [abs];
}).sort();
const perFile = (report, id) => get(report, id).perFile;

// token source outside the audited dirs. `--font-size-ghost` is commented out, so 99px equals no token;
// `--font-size-huge` is a clamp() and cannot be compared; `--ui-label` is the token source referencing xs.
const TOKENS = [
  ":root {",
  "  --font-size-xs: 0.75rem;   /* 12px */",
  "  --font-size-sm: 13px;",
  "  --font-size-base: 0.875rem;",
  "  --font-size-huge: clamp(1rem, 2vw, 2rem);",
  "  --line-height-tight: 1.2;",
  "  --ui-label: var(--font-size-xs);",
  "}",
  "/* --font-size-ghost: 99px; */",
  ".base { @apply text-base text-[18px]; }",
  "",
].join("\n");

const GUARDRAILS = [
  "---",
  "title: Guardrails",
  "---",
  "",
  "## Color",
  "",
  "- ★ **No raw hex.** Exceptions: the token source (`tokens.css`) and mockups",
  "  (`src/Mockups.tsx`).",
  "- **Roles only.** See `src/Other.tsx` for an example.",
  "",
].join("\n");

const FIXTURE = {
  "design/tokens.css": TOKENS,
  "design/guardrails.mdx": GUARDRAILS,
  // line 1: 13px 11px 0.75rem 9px (4) · line 2: 13px (1) · line 3: four named sizes · line 4: leading x2 + tracking x1 · line 5: a token consumer
  "src/a.tsx": [
    'export const a = "text-[13px] text-[11px] text-[0.75rem] text-[9px]";',
    'export const b = "text-[13px]";',
    'export const c = "text-sm text-xs hover:text-lg text-2xl";',
    'export const d = "leading-[1.1] tracking-[0.06em] leading-[20px]";',
    'export const e = "var(--font-size-sm)";',
    "",
  ].join("\n"),
  // CRLF: two lines hold a match (10px 14px | 99px)
  "src/Mockups.tsx": '"text-[10px] text-[14px]"\r\n"text-[99px]"\r\n',
  "src/components/ui/badge.tsx": 'export const x = "text-[11px]";\n',
  // leading-dot rem, a named 9xl, and every "other form" the main regex must not see
  "src/other.tsx": [
    'export const f = "text-[.5rem] text-9xl";',
    'export const g = "text-[length:12px] text-[1.2em] text-[clamp(1rem,2vw,2rem)] text-[var(--x)] text-[#fff] text-[calc(1rem+2px)]";',
    "",
  ].join("\n"),
  // lookalikes that are not the utilities
  "src/b.ts": 'export const w = "context-[12px] --text-sm: 1rem; text-sm-foo mytext-lg data-text-xl";\n',
  "src/c.test.tsx": 'export const t = "text-[15px] text-sm";\n',
  "src/types.d.ts": 'declare const q: "text-[16px]";\n',
  "src/s.css": "/* uses text-xs here */\n.x { @apply text-sm text-[11px]; font-size: 11px; }\n",
};

describe("typography: arbitrary font sizes", () => {
  let report;
  beforeAll(() => { report = typo(repo(FIXTURE)); });

  test("matches, lines and files are three different units", () => {
    // a.tsx 5 matches / 2 lines · Mockups.tsx 3 / 2 · other.tsx 1 (.5rem) / 1 · ui/badge.tsx 1 / 1; tests, .d.ts and css are out
    expect(val(report, "typography.arbitrary_size.matches")).toBe(10);
    expect(val(report, "typography.arbitrary_size.lines")).toBe(6);
    expect(val(report, "typography.arbitrary_size.files")).toBe(4);
    expect(perFile(report, "typography.arbitrary_size.matches")).toEqual([
      { file: "src/a.tsx", count: 5 },
      { file: "src/Mockups.tsx", count: 3 },
      { file: "src/components/ui/badge.tsx", count: 1 },
      { file: "src/other.tsx", count: 1 },
    ]);
    expect(perFile(report, "typography.arbitrary_size.lines")).toEqual([
      { file: "src/Mockups.tsx", count: 2 },
      { file: "src/a.tsx", count: 2 },
      { file: "src/components/ui/badge.tsx", count: 1 },
      { file: "src/other.tsx", count: 1 },
    ]);
  });

  test("px vs rem, distinct spellings, and the per-value tally", () => {
    expect(val(report, "typography.arbitrary_size.px_matches")).toBe(8);
    expect(val(report, "typography.arbitrary_size.rem_matches")).toBe(2); // 0.75rem, .5rem
    // 13px 11px 0.75rem 9px 10px 14px 99px .5rem
    expect(val(report, "typography.arbitrary_size.distinct")).toBe(8);
    expect(get(report, "typography.arbitrary_size.matches").detail.byValue).toEqual({
      "13px": 2, "11px": 2, "0.75rem": 1, "10px": 1, "14px": 1, "99px": 1, "9px": 1, ".5rem": 1,
    });
  });

  test("below 12px is strict: 0.75rem (= 12px) is out, .5rem (= 8px) is in", () => {
    // 11px (a.tsx), 9px, 10px, .5rem, 11px (badge)
    expect(val(report, "typography.arbitrary_size.below_12px")).toBe(5);
    const d = get(report, "typography.arbitrary_size.below_12px").detail;
    expect(d.byValue).toEqual({ "11px": 2, "10px": 1, "9px": 1, ".5rem": 1 });
    expect(d.thresholdPx).toBe(12);
  });

  test("token-equal vs no-token compares computed sizes against the --font-size-* values", () => {
    // tokens: xs = 0.75rem = 12px, sm = 13px, base = 0.875rem = 14px; huge (clamp) is unresolved; ghost is commented out
    // equal: 13px, 13px, 0.75rem, 14px · none: 11px, 9px, 10px, 99px, .5rem, 11px
    expect(val(report, "typography.arbitrary_size.equals_token")).toBe(4);
    expect(val(report, "typography.arbitrary_size.not_token")).toBe(6);
    expect(val(report, "typography.arbitrary_size.not_token_files")).toBe(4);
    const eq = get(report, "typography.arbitrary_size.equals_token");
    expect(eq.detail.byValue).toEqual({
      "13px": { count: 2, tokens: ["--font-size-sm"] },
      "0.75rem": { count: 1, tokens: ["--font-size-xs"] },
      "14px": { count: 1, tokens: ["--font-size-base"] },
    });
    expect(eq.detail.unresolvedTokens).toEqual(["--font-size-huge"]);
    expect(eq.detail.fontSizeTokens).toBe(4);
    expect(perFile(report, "typography.arbitrary_size.not_token")).toEqual([
      { file: "src/Mockups.tsx", count: 2 }, // ties sort by plain string order: "M" < "a"
      { file: "src/a.tsx", count: 2 },
      { file: "src/components/ui/badge.tsx", count: 1 },
      { file: "src/other.tsx", count: 1 },
    ]);
  });

  test("forms the main regex does not see are counted apart, never folded in", () => {
    // length:12px, 1.2em, clamp(...), calc(...); text-[var(--x)] and text-[#fff] are colours
    expect(val(report, "typography.arbitrary_size.other_form_matches")).toBe(4);
  });

  test("the in-ui/ split is a detail, not a silent scope choice", () => {
    expect(get(report, "typography.arbitrary_size.matches").detail.ui).toEqual({
      pattern: "(^|\\/)components\\/ui\\/", inUi: 1, outsideUi: 9,
    });
  });

  test("lookalikes are not utilities: context-[12px], --text-sm, text-sm-foo, mytext-lg, data-text-xl", () => {
    expect(perFile(report, "typography.arbitrary_size.matches").some((r) => r.file === "src/b.ts")).toBe(false);
    expect(perFile(report, "typography.named_size.matches").some((r) => r.file === "src/b.ts")).toBe(false);
  });
});

describe("typography: the exemptions the repo declares", () => {
  test("the exempt set is read from design/guardrails.mdx, and the split follows it", () => {
    const report = typo(repo(FIXTURE));
    expect(val(report, "typography.exempt.declared")).toBe(true);
    expect(val(report, "typography.exempt.files")).toBe(1);
    const detail = get(report, "typography.exempt.files").detail;
    expect(detail.source).toBe("design/guardrails.mdx");
    expect(detail.files).toEqual(["src/Mockups.tsx"]);
    // `tokens.css` resolves to the token source (already outside the audit); `src/Other.tsx` sits in a block with no exemption word
    expect(detail.declared.map((d) => d.reference)).toEqual(["tokens.css", "src/Mockups.tsx"]);
    expect(detail.declared[0].alreadyOutsideAudit).toEqual(["design/tokens.css"]);
    expect(detail.unmatched).toEqual([]);

    // Mockups.tsx: 3 matches, 2 lines, 1 file
    expect(val(report, "typography.arbitrary_size.matches_excluding_exempt")).toBe(7);
    expect(val(report, "typography.arbitrary_size.lines_excluding_exempt")).toBe(4);
    expect(val(report, "typography.arbitrary_size.files_excluding_exempt")).toBe(3);
    expect(get(report, "typography.arbitrary_size.matches").detail.exempt).toEqual({
      files: ["src/Mockups.tsx"], inExemptFiles: 3, excludingExemptFiles: 7,
    });
  });

  test("no guardrails file: no exemption is declared and NO split is emitted", () => {
    const report = typo(repo(without(FIXTURE, "design/guardrails.mdx")));
    expect(val(report, "typography.exempt.declared")).toBe(false);
    expect(val(report, "typography.exempt.files")).toBe(0);
    expect(get(report, "typography.arbitrary_size.matches_excluding_exempt")).toBeUndefined();
    expect(get(report, "typography.arbitrary_size.lines_excluding_exempt")).toBeUndefined();
    expect(get(report, "typography.arbitrary_size.files_excluding_exempt")).toBeUndefined();
    expect(get(report, "typography.arbitrary_size.matches").detail.exempt).toBeUndefined();
    expect(val(report, "typography.arbitrary_size.matches")).toBe(10);
  });

  test("a mockup-looking file is NOT exempt unless the guardrails say so", () => {
    const report = typo(repo({
      ...FIXTURE,
      "design/guardrails.mdx": "## Color\n\n- No raw hex. Exceptions: the token source (`tokens.css`).\n",
    }));
    expect(val(report, "typography.exempt.declared")).toBe(true);
    expect(val(report, "typography.exempt.files")).toBe(0);
    expect(get(report, "typography.arbitrary_size.matches_excluding_exempt")).toBeUndefined();
  });

  test("a reference that resolves to the token source names it alone, not a same-named audited file", () => {
    const report = typo(repo({
      "src/app/globals.css": ":root {\n  --a: 1;\n  --b: 2;\n  --c: 3;\n  --d: 4;\n  --e: 5;\n}\n",
      "src/other/globals.css": ".x { @apply text-sm; }\n",
      "src/other/page.tsx": '"text-[10px]"\n',
      "design/guardrails.mdx": "- Exceptions: the token source (`globals.css`).\n",
    }));
    expect(get(report, "typography.exempt.files").detail.declared[0]).toMatchObject({
      reference: "globals.css", auditedFiles: [], alreadyOutsideAudit: ["src/app/globals.css"],
    });
    expect(val(report, "typography.exempt.files")).toBe(0);
  });

  test("an alias path in the exemption (`@/components/legacy/`) resolves by its tail", () => {
    const report = typo(repo({
      "src/components/legacy/old.tsx": '"text-[10px]"\n',
      "src/components/new.tsx": '"text-[11px]"\n',
      "design/guardrails.mdx": "- Exceptions: the old widgets (`@/components/legacy/`).\n",
    }));
    expect(get(report, "typography.exempt.files").detail.files).toEqual(["src/components/legacy/old.tsx"]);
    expect(val(report, "typography.arbitrary_size.matches_excluding_exempt")).toBe(1);
  });

  test("an Exceptions heading opens a section: globs, directories and files after it all count", () => {
    const report = typo(repo({
      "src/a.stories.tsx": '"text-[10px]"\n',
      "src/legacy/old.tsx": '"text-[11px]"\n',
      "src/keep.tsx": '"text-[12px]"\n',
      "design/guardrails.mdx": [
        "## Rules",
        "",
        "- Use `src/keep.tsx` as the example.",
        "",
        "## Exceptions",
        "",
        "- `src/**/*.stories.tsx`",
        "- `src/legacy/`",
        "- `src/missing.tsx`",
        "",
        "## Other",
        "",
        "- Reference: `src/keep.tsx`.",
        "",
      ].join("\n"),
    }));
    expect(get(report, "typography.exempt.files").detail.files).toEqual(["src/a.stories.tsx", "src/legacy/old.tsx"]);
    expect(get(report, "typography.exempt.files").detail.unmatched).toEqual(["src/missing.tsx"]);
    expect(val(report, "typography.arbitrary_size.matches")).toBe(3);
    expect(val(report, "typography.arbitrary_size.matches_excluding_exempt")).toBe(1);
  });
});

describe("typography: named sizes, leading, tracking and @apply", () => {
  let report;
  beforeAll(() => { report = typo(repo(FIXTURE)); });

  test("named standard sizes: boundaries respected, tests and css excluded", () => {
    // a.tsx: text-sm text-xs text-lg text-2xl (hover: prefix stripped by the boundary) · other.tsx: text-9xl
    expect(val(report, "typography.named_size.matches")).toBe(5);
    expect(val(report, "typography.named_size.files")).toBe(2);
    expect(get(report, "typography.named_size.matches").detail.byClass).toEqual({
      "text-2xl": 1, "text-9xl": 1, "text-lg": 1, "text-sm": 1, "text-xs": 1,
    });
  });

  test("@apply in css counts separately: audited css and the token source, comments ignored", () => {
    // s.css: `@apply text-sm text-[11px]` (the /* text-xs */ comment is not an @apply) · tokens.css: `@apply text-base text-[18px]`
    expect(val(report, "typography.css_apply.named_size_matches")).toBe(2);
    expect(val(report, "typography.css_apply.arbitrary_size_matches")).toBe(2);
    const d = get(report, "typography.css_apply.named_size_matches").detail;
    expect(d).toEqual({ inAuditedCss: 1, inTokenSource: 1 });
  });

  test("leading and tracking brackets", () => {
    expect(val(report, "typography.leading_arbitrary.matches")).toBe(2);
    expect(val(report, "typography.leading_arbitrary.files")).toBe(1);
    expect(get(report, "typography.leading_arbitrary.matches").detail.byValue).toEqual({ "1.1": 1, "20px": 1 });
    expect(val(report, "typography.tracking_arbitrary.matches")).toBe(1);
    expect(val(report, "typography.tracking_arbitrary.files")).toBe(1);
  });
});

describe("typography: type tokens", () => {
  test("declared, unconsumed and zero-consumer families (the token source's own var() is not a consumer)", () => {
    const report = run(repo(FIXTURE), { dirs: ["src"], groups: ["typography", "tokens"] });
    // which --font-size-* names exist and which are unconsumed is ONE fact with one owner: the tokens group
    // (xs sm base huge; ghost is in a comment). Only --font-size-sm is read (a.tsx); --ui-label: var(--font-size-xs) lives in the token source
    expect(get(report, "tokens.font_size.declarations").detail.names).toEqual(["--font-size-base", "--font-size-huge", "--font-size-sm", "--font-size-xs"]);
    expect(val(report, "tokens.font_size.unconsumed")).toBe(3);
    expect(get(report, "tokens.font_size.unconsumed").detail.names).toEqual(["--font-size-base", "--font-size-huge", "--font-size-xs"]);
    expect(get(report, "tokens.font_size.consumers").value).toBe(1);
    expect(get(report, "tokens.font_size.consumers").detail.inTokenSource).toBe(1);
    expect(report.counters.some((c) => c.id.startsWith("typography.font_size_token."))).toBe(false); // no second name for it
    // font-size has a consumer; line-height is declared (1) and read nowhere
    expect(val(report, "typography.token_family.zero_consumer_families")).toBe(1);
    const rows = get(report, "typography.token_family.zero_consumer_families").detail.families;
    expect(rows.find((r) => r.family === "--line-height-*")).toMatchObject({ declared: 1, consumers: 0 });
    expect(rows.find((r) => r.family === "--font-size-*")).toMatchObject({ declared: 4, consumers: 1, referencedInTokenSource: 1, unconsumed: 3 });
  });
});

describe("typography: robustness", () => {
  test("no token source: nothing equals a token, every size matches none, and the note says why", () => {
    const report = typo(repo({ "src/a.tsx": '"text-[13px] text-[0.8125rem]"\n' }));
    expect(val(report, "typography.arbitrary_size.matches")).toBe(2);
    expect(val(report, "typography.arbitrary_size.equals_token")).toBe(0);
    expect(val(report, "typography.arbitrary_size.not_token")).toBe(2);
    expect(get(report, "typography.arbitrary_size.not_token").notes.join(" ")).toMatch(/no token source/);
    expect(get(report, "typography.arbitrary_size.equals_token").detail.fontSizeTokens).toBe(0);
  });

  test("a token source without --font-size-* says so instead of reporting a quiet zero", () => {
    const report = typo(repo({
      "src/theme.css": ":root {\n  --a: 1;\n  --b: 2;\n  --c: 3;\n  --d: 4;\n  --e: 5;\n}\n",
      "src/a.tsx": '"text-[13px]"\n',
    }));
    expect(val(report, "typography.arbitrary_size.equals_token")).toBe(0);
    expect(get(report, "typography.arbitrary_size.equals_token").notes.join(" ")).toMatch(/declares no --font-size-\*/);
  });

  test("an empty repo and a missing audited dir yield zeros, never an error", () => {
    const report = typo(repo({}), ["src"]);
    for (const c of report.counters) {
      if (c.unit === "boolean") expect(c.value).toBe(false);
      else expect(c.value).toBe(0);
    }
    expect(report.warnings.join(" ")).toMatch(/audited dir not found: src/);
  });

  test("CRLF files count the same lines as LF files", () => {
    const lf = typo(repo({ "src/a.tsx": '"text-[10px]"\n\n"text-[11px] text-[12px]"\n' }));
    const crlf = typo(repo({ "src/a.tsx": '"text-[10px]"\r\n\r\n"text-[11px] text-[12px]"\r\n' }));
    expect(val(lf, "typography.arbitrary_size.lines")).toBe(2);
    expect(val(crlf, "typography.arbitrary_size.lines")).toBe(2);
    expect(val(crlf, "typography.arbitrary_size.matches")).toBe(3);
  });

  test("a one-line minified file: many matches, one line, one file", () => {
    const body = Array.from({ length: 500 }, (_, i) => `text-[${10 + (i % 3)}px]`).join(" ");
    const report = typo(repo({ "src/min.js": `var a="${body}";` }));
    expect(val(report, "typography.arbitrary_size.matches")).toBe(500);
    expect(val(report, "typography.arbitrary_size.lines")).toBe(1);
    expect(val(report, "typography.arbitrary_size.files")).toBe(1);
  });

  test("a BOM and non-UTF-8 bytes do not hide or invent matches", () => {
    const bytes = Buffer.concat([
      Buffer.from([0xef, 0xbb, 0xbf]),
      Buffer.from('"text-[11px]" '),
      Buffer.from([0xff, 0xfe, 0xfd]),
      Buffer.from(' "text-[12px]"\n'),
    ]);
    const report = typo(repo({ "src/a.tsx": bytes }));
    expect(val(report, "typography.arbitrary_size.matches")).toBe(2);
  });

  test("a file over 5 MB is skipped with a warning, not read", () => {
    const report = typo(repo({
      "src/big.tsx": '"text-[11px]" ' + "x".repeat(5 * 1024 * 1024 + 10),
      "src/a.tsx": '"text-[12px]"\n',
    }));
    expect(val(report, "typography.arbitrary_size.matches")).toBe(1);
    expect(report.warnings.join(" ")).toMatch(/skipped \(over 5 MB\): src\/big\.tsx/);
  });

  test("a dir with spaces and parentheses (Next route groups) is audited like any other", () => {
    const report = typo(repo({ "src/app/(app)/my page/page.tsx": '"text-[11px]"\n' }));
    expect(perFile(report, "typography.arbitrary_size.matches")).toEqual([{ file: "src/app/(app)/my page/page.tsx", count: 1 }]);
  });

  test("deterministic: the same tree gives byte-identical JSON, and the module never writes to the repo", () => {
    const root = repo(FIXTURE);
    const before = listAll(root);
    const a = JSON.stringify(typo(root));
    const b = JSON.stringify(typo(root));
    expect(a).toBe(b);
    expect(listAll(root)).toEqual(before);
  });

  test("every counter id starts with the group and is unique (the report validator also runs)", () => {
    const report = typo(repo(FIXTURE));
    const ids = report.counters.map((c) => c.id);
    expect(ids.every((id) => id.startsWith("typography."))).toBe(true);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test("an audited dir can be a nested folder", () => {
    const report = typo(repo({ "web/src/a.tsx": '"text-[11px]"\n', "other/b.tsx": '"text-[11px]"\n' }), ["web/src"]);
    expect(val(report, "typography.arbitrary_size.matches")).toBe(1);
  });
});

// ── review follow-ups: exemptions are prose, globs are linear, line numbers are linear ──

const { lineNumbers } = require("../../../src/lib/counters/util");
const { MAX_REFS, MATCH_BUDGET } = require("../../../src/lib/counters/exemptions");
const { EXCLUDE_DIRS } = require("../../../src/lib/design-source");

const exemptionRepo = (guardrails, extra = {}) => ({
  "design/guardrails.mdx": guardrails,
  "src/a.tsx": '"text-[10px]"\n',
  "src/Mockups.tsx": '"text-[9px]"\n',
  "src/components/ui/button.tsx": '"text-[11px]"\n',
  ...extra,
});
const exemptReport = (guardrails, extra) => typo(repo(exemptionRepo(guardrails, extra)));
const exemptFiles = (guardrails, extra) => get(exemptReport(guardrails, extra), "typography.exempt.files").detail.files;

describe("typography: a negated mention is not a declaration", () => {
  test.each([
    ["no exceptions at all", "- No raw hex. No exceptions at all (see `src/components/ui/button.tsx` for the pattern).\n"],
    ["never exempt", "- Never exempt anything; the template lives in `src/a.tsx`.\n"],
    ["Exceptions: none", "- Exceptions: none (see `src/a.tsx`).\n"],
    ["without exception", "- Applied without exception to `src/a.tsx`.\n"],
    ["no exemptions", "- There are no exemptions for `src/a.tsx`.\n"],
    ["a curly-apostrophe contraction", "- We don’t make exceptions for `src/a.tsx`.\n"],
    ["a heading that negates", "## No exceptions\n\n- `src/a.tsx` is the reference implementation.\n"],
  ])("%s exempts nothing and declares nothing", (_name, body) => {
    const report = exemptReport(body);
    expect(get(report, "typography.exempt.files").detail.files).toEqual([]);
    expect(val(report, "typography.exempt.declared")).toBe(false);
    expect(get(report, "typography.arbitrary_size.matches_excluding_exempt")).toBeUndefined();
  });

  test.each([
    ["a negation in an earlier sentence", "- No raw hex. Exceptions: `src/Mockups.tsx`.\n"],
    ["a negated clause, then a real one", "- Never exempt anything; exceptions: `src/Mockups.tsx`.\n"],
    ["the bare word except, even after a `do not`", "- Do not use raw hex, except in `src/Mockups.tsx`.\n"],
    ["excluding", "- No raw hex outside the token source — excluding `src/Mockups.tsx`.\n"],
    ["exempt", "- Mockups are exempt from this: `src/Mockups.tsx`.\n"],
  ])("%s still exempts the file", (_name, body) => {
    expect(exemptFiles(body)).toEqual(["src/Mockups.tsx"]);
  });
});

describe("typography: code and comments declare nothing", () => {
  test.each([
    ["an HTML comment", "<!-- Exceptions: `src/Mockups.tsx` -->\n"],
    ["a multi-line HTML comment", "<!--\nExceptions:\n`src/Mockups.tsx`\n-->\n- Roles only.\n"],
    ["an MDX comment", "{/* Exceptions: `src/Mockups.tsx` */}\n"],
    ["a backtick fence", "```\nExceptions: `src/Mockups.tsx`\n```\n"],
    ["a tilde fence with an info string", "~~~md\nExceptions: `src/Mockups.tsx`\n~~~\n"],
    ["a fence that is never closed", "Roles only.\n\n```\nExceptions: `src/Mockups.tsx`\n"],
    ["an Exceptions heading inside a fence", "```\n## Exceptions\n```\n\n- `src/Mockups.tsx` is the example.\n"],
    ["front matter", "---\ntitle: Exceptions to `src/Mockups.tsx`\n---\n\n- Roles only.\n"],
  ])("%s", (_name, body) => {
    expect(exemptFiles(body)).toEqual([]);
  });

  test("prose around a comment or a closed fence still counts, and keeps its line number", () => {
    const afterComment = exemptReport("<!-- note --> Exceptions: `src/Mockups.tsx`\n");
    expect(get(afterComment, "typography.exempt.files").detail.files).toEqual(["src/Mockups.tsx"]);

    const afterFence = exemptReport("```\nx\n```\n\n- Exceptions: `src/Mockups.tsx`\n");
    expect(get(afterFence, "typography.exempt.files").detail.declared[0]).toMatchObject({ reference: "src/Mockups.tsx", line: 5 });

    // ```code``` on one line is inline code, not a fence
    expect(exemptFiles("```code``` and Exceptions: `src/Mockups.tsx`\n")).toEqual(["src/Mockups.tsx"]);
  });
});

describe("typography: exemption globs", () => {
  const TREE = {
    "src/a.tsx": "x\n", "src/b.tsx": "x\n", "src/ab.tsx": "x\n", "src/a.stories.tsx": "x\n",
    "src/x/a.tsx": "x\n", "src/x/y/a.tsx": "x\n", "src/x/b.stories.tsx": "x\n",
    "src/gen/one.ts": "x\n", "src/gen/deep/two.ts": "x\n", "lib/gen/three.ts": "x\n",
  };
  test.each([
    ["*.stories.tsx", ["src/a.stories.tsx", "src/x/b.stories.tsx"]], // no slash: the file name, anywhere
    ["?.tsx", ["src/a.tsx", "src/b.tsx", "src/x/a.tsx", "src/x/y/a.tsx"]],
    ["src/*/a.tsx", ["src/x/a.tsx"]], // one level only
    ["src/**/a.tsx", ["src/a.tsx", "src/x/a.tsx", "src/x/y/a.tsx"]], // ** = zero or more segments
    ["gen/**", ["lib/gen/three.ts", "src/gen/deep/two.ts", "src/gen/one.ts"]], // trailing /** = one or more, from any directory
    ["src/gen/*.ts", ["src/gen/one.ts"]],
    ["**/gen/*.ts", ["lib/gen/three.ts", "src/gen/one.ts"]],
    ["src/a*.tsx", ["src/a.stories.tsx", "src/a.tsx", "src/ab.tsx"]],
    ["src/a**.tsx", ["src/a.stories.tsx", "src/a.tsx", "src/ab.tsx"]], // stars that are not a whole segment collapse to one
    ["src/nothing/*.tsx", []],
  ])("`%s`", (pattern, expected) => {
    const report = typo(repo({ ...TREE, "design/guardrails.mdx": `## Exceptions\n\n- \`${pattern}\`\n` }), ["src", "lib"]);
    expect(get(report, "typography.exempt.files").detail.files).toEqual(expected);
  });

  test("a many-star glob on long file names does not backtrack (was ~12 s)", () => {
    const files = { "design/guardrails.mdx": "## Exceptions\n\n- `*a*a*a*a*b.tsx`\n" };
    for (let i = 0; i < 20; i++) files[`src/${"a".repeat(120)}${i}.tsx`] = "x\n";
    const started = Date.now();
    const report = typo(repo(files));
    expect(Date.now() - started).toBeLessThan(1500);
    expect(get(report, "typography.exempt.files").detail.unmatched).toEqual(["*a*a*a*a*b.tsx"]);
  });

  test(`only the first ${MAX_REFS} references are resolved; the rest are reported and warned about, never guessed`, () => {
    const total = MAX_REFS + 5;
    const files = { "design/guardrails.mdx": "## Exceptions\n\n" + Array.from({ length: total }, (_, i) => `- \`src/f${i}.tsx\``).join("\n") + "\n" };
    for (let i = 0; i < total; i++) files[`src/f${i}.tsx`] = '"text-[11px]"\n';
    const report = typo(repo(files));
    const detail = get(report, "typography.exempt.files").detail;
    expect(val(report, "typography.exempt.files")).toBe(MAX_REFS);
    expect(detail.skippedCount).toBe(5);
    expect(detail.skipped).toEqual(Array.from({ length: 5 }, (_, i) => `src/f${MAX_REFS + i}.tsx`));
    expect(report.warnings.join(" ")).toMatch(/5 exemption reference\(s\) were not resolved/);
    expect(val(report, "typography.arbitrary_size.matches_excluding_exempt")).toBe(5);
  });

  test("glob work is budgeted: past it the remaining references are skipped with a warning, and the run stays fast", () => {
    const name = 230;
    const files = {
      "design/guardrails.mdx": "## Exceptions\n\n" + Array.from({ length: MAX_REFS }, (_, k) => `- \`*a*a*a*a*a*a*a*a*b${k}.tsx\``).join("\n") + "\n",
    };
    const count = Math.ceil((2 * MATCH_BUDGET) / (MAX_REFS * name));
    for (let i = 0; i < count; i++) files[`src/${"a".repeat(name - 8)}${String(i).padStart(4, "0")}.tsx`] = "x\n";
    const started = Date.now();
    const report = typo(repo(files));
    expect(Date.now() - started).toBeLessThan(5000);
    const detail = get(report, "typography.exempt.files").detail;
    expect(detail.skippedCount).toBeGreaterThan(0);
    expect(detail.skippedCount).toBeLessThan(MAX_REFS);
    expect(detail.skipped.length).toBe(Math.min(50, detail.skippedCount));
    expect(report.warnings.join(" ")).toMatch(/exemption reference\(s\) were not resolved/);
    expect(val(report, "typography.exempt.files")).toBe(0);
  });
});

describe("typography: line numbers are linear", () => {
  const naive = (text, indices) => indices.map((idx) => 1 + (text.slice(0, idx).match(/\n/g) ?? []).length);

  test("lineNumbers agrees with a naive count on seeded random text", () => {
    let seed = 7;
    const rnd = (n) => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed % n; };
    for (let round = 0; round < 300; round++) {
      const text = Array.from({ length: rnd(60) }, () => ["a", "\n", "bc", "\n\n", "d"][rnd(5)]).join("");
      const indices = [...new Set(Array.from({ length: rnd(12) }, () => rnd(text.length + 1)))].sort((x, y) => x - y);
      expect(lineNumbers(text, indices)).toEqual(naive(text, indices));
    }
    expect(lineNumbers("a\nb\n", [0, 1, 2, 3, 4])).toEqual([1, 1, 2, 2, 3]);
    expect(lineNumbers("", [])).toEqual([]);
  });

  test("a single-line file with 200k matches finishes well under 2 s (was 10 s at 2 MB)", () => {
    const body = "text-[11px] ".repeat(200000);
    const root = repo({ "src/min.js": `${body}\n` });
    const started = Date.now();
    const report = typo(root);
    expect(Date.now() - started).toBeLessThan(2000);
    expect(val(report, "typography.arbitrary_size.matches")).toBe(200000);
    expect(val(report, "typography.arbitrary_size.lines")).toBe(1);
  });
});

describe("typography: behaviours pinned after mutation testing", () => {
  const TOKEN_SOURCE = [
    ":root {",
    "  --font-size-real: 15px;",
    "  --font-size-odd: 11.2px;",
    "}",
    "/*",
    "--font-size-ghost: 99px;",
    "--tracking-ghost: 1px;",
    "color: var(--font-size-ghost);",
    "*/",
    "",
  ].join("\n");

  test("a multi-line comment in the token source declares nothing and consumes nothing", () => {
    const report = typo(repo({
      "design/tokens.css": TOKEN_SOURCE,
      "src/a.tsx": '"text-[99px] text-[15px] var(--font-size-real)"\n',
    }));
    expect(get(report, "typography.arbitrary_size.equals_token").detail.fontSizeTokens).toBe(2); // real, odd
    expect(val(report, "typography.arbitrary_size.equals_token")).toBe(1); // 15px
    expect(val(report, "typography.arbitrary_size.not_token")).toBe(1); // 99px, the commented-out token
    // no --tracking-* family, and the comment's var() is not a reference from the token source
    expect(val(report, "typography.token_family.zero_consumer_families")).toBe(0);
    const row = get(report, "typography.token_family.zero_consumer_families").detail.families.find((r) => r.family === "--font-size-*");
    expect(row).toMatchObject({ declared: 2, consumers: 1, referencedInTokenSource: 0 });
  });

  test("a size spelled in rem is compared by its computed px with float noise removed (0.7rem = 11.2px)", () => {
    const report = typo(repo({ "design/tokens.css": TOKEN_SOURCE, "src/a.tsx": '"text-[0.7rem]"\n' }));
    expect(val(report, "typography.arbitrary_size.equals_token")).toBe(1);
    expect(val(report, "typography.arbitrary_size.below_12px")).toBe(1);
  });

  test("distinct counts spellings: 12px and 0.75rem are two, though one size", () => {
    const report = typo(repo({ "src/a.tsx": '"text-[12px] text-[0.75rem] text-[12px]"\n' }));
    expect(val(report, "typography.arbitrary_size.matches")).toBe(3);
    expect(val(report, "typography.arbitrary_size.distinct")).toBe(2);
  });

  test("jsx, vue and svelte are code files; js and css follow their own rules", () => {
    const report = typo(repo({
      "src/a.jsx": '"text-[11px]"\n',
      "src/b.vue": '<div class="text-[11px] text-[12px]"></div>\n',
      "src/c.svelte": '<p class="text-[13px]"></p>\n',
    }));
    expect(val(report, "typography.arbitrary_size.matches")).toBe(4);
    expect(val(report, "typography.arbitrary_size.files")).toBe(3);
    expect(val(report, "typography.named_size.files")).toBe(0);
  });

  test("tracking and leading need a word boundary: xtracking-[1px] and fooleading-[2px] are not utilities", () => {
    const report = typo(repo({ "src/a.tsx": '"xtracking-[1px] tracking-[2px] fooleading-[2px] leading-[3px] my-tracking-[4px]"\n' }));
    expect(val(report, "typography.tracking_arbitrary.matches")).toBe(1);
    expect(val(report, "typography.leading_arbitrary.matches")).toBe(1);
  });

  test("every file set says which directories the census never enters, from the census's own list", () => {
    const report = typo(repo({ "src/a.tsx": '"text-[11px]"\n' }));
    const fileSet = get(report, "typography.arbitrary_size.matches").definition.fileSet;
    for (const dir of EXCLUDE_DIRS) if (!dir.startsWith(".")) expect(fileSet).toContain(dir);
    expect(fileSet).toMatch(/the census skips directories named/);
  });
});
