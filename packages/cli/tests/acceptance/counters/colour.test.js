/**
 * colour.test.js — acceptance tests for the `colour` counter group. Each
 * expectation is hand-computed from a tiny temp repo (never from the live
 * repo): HTML entities, url(#id), CRLF, a token-equal vs non-token hex, tests
 * excluded, a mockup file in and out, the token source exempt.
 */

"use strict";

const fs = require("fs");
const os = require("os");
const path = require("path");
const { makeRepo, removeRepo, run, get, val } = require("./helpers");
const { scanProject } = require("../../../src/commands/drift");

const colour = (root, dirs = ["src"]) => run(root, { dirs, groups: ["colour"] });
const perFile = (report, id) => get(report, id).perFile;

const roots = [];
const repo = (files) => { const r = makeRepo(files); roots.push(r); return r; };
afterAll(() => roots.forEach(removeRepo));

// token source OUTSIDE the audited dirs (dirs = ["src"]); declares #A8511A, #fff, #abcd as custom properties.
// #123456 sits in a commented-out declaration and #112233 in a plain rule: neither is a declared token value.
const TOKENS = [
  "/*",
  "  --retired: #123456;",
  "*/",
  ":root {",
  "  --primary: #A8511A;",
  "  --bg: #fff;",
  "  --accent: #abcd;",
  "  --glow: rgba(0, 0, 0, 0.5);",
  "  --pad: 16px;",
  "  --radius: 4px;",
  "}",
  ".x { color: #112233; }",
  "",
].join("\n");

const FIXTURE_A = {
  "design/tokens.css": TOKENS,
  "src/a.tsx": 'export const a = { c1: "#a8511a", c2: "#A8511A", c3: "#FFF", c4: "#123456", p: "12px" };\n',
  "src/b.ts": 'export const e = "&#123456; &#123; &#x1F600; &#125;"; export const u = "url(#abcdef)"; export const v = "#abcd1234"; export const w = "#abcd";\n',
  "src/c.js": 'export const k = "#ff0000"; export const f = "rgb(1,2,3)";\n',
  "src/Mockups.tsx": 'export const m = "#112233";\n',
  "src/d.test.tsx": 'export const x = "#999999";\n',
  "src/types.d.ts": 'declare const y: "#ff00ff";\n',
  "src/e.tsx": [
    'export const e1 = "rgba(0,0,0,.5)";',
    'export const e2 = "rgba(var(--x), .5)";',
    'export const e3 = "hsl(10 20% 30%)";',
    'export const e4 = "oklch(0.5 0.1 20)";',
    "",
  ].join("\r\n"),
  "src/f.tsx": 'export const p = "8px 1rem";\n',
};

describe("colour counters: the scanner tally and the token-source share", () => {
  let report;
  let root;
  beforeAll(() => { root = repo(FIXTURE_A); report = colour(root); });

  test("the counter IS the scanner: values equal scanProject() on the same tree", () => {
    const scan = scanProject(root, ["src"]);
    expect(val(report, "colour.scanner.colour_hits")).toBe(scan.critical);
    expect(val(report, "colour.scanner.px_hits")).toBe(scan.warnings);
    expect(val(report, "colour.scanner.files_audited")).toBe(scan.componentsAudited);
    expect(val(report, "colour.scanner.files_with_hits")).toBe(scan.filesWithDrift);
  });

  test("colour hits: strict hex (3/4/6/8) + rgb/hsl/oklch calls, tests and .d.ts out, entities and url(#id) skipped", () => {
    // a.tsx 4 (#a8511a #A8511A #FFF #123456) · b.ts 2 (#abcd1234 #abcd) · c.js 2 (#ff0000 rgb()
    // Mockups.tsx 1 · e.tsx 4 (rgba x2, hsl, oklch) · f.tsx 0
    expect(val(report, "colour.scanner.colour_hits")).toBe(13);
    expect(perFile(report, "colour.scanner.colour_hits")).toEqual([
      { file: "src/a.tsx", count: 4 },
      { file: "src/e.tsx", count: 4 },
      { file: "src/b.ts", count: 2 },
      { file: "src/c.js", count: 2 },
      { file: "src/Mockups.tsx", count: 1 },
    ]);
    expect(get(report, "colour.scanner.colour_hits").detail.byExtension).toEqual({ ".js": 2, ".ts": 2, ".tsx": 9 });
  });

  test("px hits and file tallies", () => {
    expect(val(report, "colour.scanner.px_hits")).toBe(2); // a.tsx 12px, f.tsx 8px
    expect(val(report, "colour.scanner.files_audited")).toBe(6); // a b c Mockups e f
    expect(val(report, "colour.scanner.files_with_colour_hits")).toBe(5);
    expect(val(report, "colour.scanner.files_with_px_only_hits")).toBe(1); // f.tsx
    expect(val(report, "colour.scanner.files_with_hits")).toBe(6);
  });

  test("the scanner's colour hits reconcile with the per-type counters (all extensions)", () => {
    const hexAll = val(report, "colour.hex_scanner.outside_token_source") + get(report, "colour.hex_scanner.outside_token_source").detail.otherExtensions;
    const fnAll = ["rgb", "hsl", "oklch"].reduce((n, k) => {
      const c = get(report, `colour.${k}_fn.outside_token_source`);
      return n + c.value + c.detail.otherExtensions;
    }, 0);
    expect(hexAll + fnAll).toBe(val(report, "colour.scanner.colour_hits"));
  });

  test("the token source's own hits are separate, from the same regexes", () => {
    // #123456 (comment) #A8511A #fff #abcd rgba( #112233 — the scanner regexes see comments and plain rules too
    expect(val(report, "colour.token_source.colour_hits")).toBe(6);
    expect(val(report, "colour.token_source.px_hits")).toBe(2); // 16px 4px (1rem is not a px hit)
  });

  test("token-source share is a ratio with its numerator and denominator on record", () => {
    const colourShare = get(report, "colour.token_source.colour_share");
    expect(colourShare.unit).toBe("ratio");
    expect(colourShare.detail).toEqual({ numerator: 6, denominator: 19 });
    expect(colourShare.value).toBe(0.3158);
    const pxShare = get(report, "colour.token_source.px_share");
    expect(pxShare.detail).toEqual({ numerator: 2, denominator: 4 });
    expect(pxShare.value).toBe(0.5);
  });

  test("the copied regexes agree with the scanner: no self-check warning", () => {
    expect(report.warnings.filter((w) => /disagree/.test(w))).toEqual([]);
    expect(get(report, "colour.scanner.colour_hits").notes.join(" ")).not.toMatch(/disagree/);
  });

  test("mockup file is reported in and out, never silently dropped", () => {
    const m = get(report, "colour.scanner.colour_hits").detail.mockups;
    expect(m).toEqual({ pattern: "mock-?ups?", files: ["src/Mockups.tsx"], inMockupFiles: 1, excludingMockupFiles: 12 });
  });
});

describe("colour counters: hex literals outside the token source (two regexes on record)", () => {
  let report;
  beforeAll(() => { report = colour(repo(FIXTURE_A)); });

  test("oracle regex (6-digit): entity &#123456; excluded, url(#abcdef) counted, 3/4/8-digit ignored", () => {
    // a.tsx: #a8511a #A8511A #123456 · b.ts: #abcdef (url) · Mockups.tsx: #112233
    expect(val(report, "colour.hex6.outside_token_source")).toBe(5);
    expect(perFile(report, "colour.hex6.outside_token_source")).toEqual([
      { file: "src/a.tsx", count: 3 },
      { file: "src/Mockups.tsx", count: 1 },
      { file: "src/b.ts", count: 1 },
    ]);
    expect(val(report, "colour.hex6.outside_token_source_files")).toBe(3);
    expect(val(report, "colour.hex6.outside_token_source_distinct")).toBe(4); // a8511a 123456 abcdef 112233
  });

  test("equals a token vs not: exact string after case normalisation", () => {
    expect(val(report, "colour.hex6.equals_token")).toBe(2); // #a8511a #A8511A vs declared #A8511A
    expect(val(report, "colour.hex6.not_token")).toBe(3);
    expect(perFile(report, "colour.hex6.equals_token")).toEqual([{ file: "src/a.tsx", count: 2 }]);
    expect(val(report, "colour.hex6.equals_token") + val(report, "colour.hex6.not_token")).toBe(val(report, "colour.hex6.outside_token_source"));
  });

  test("the .js file's hex is outside the ts/tsx pin and reported as such", () => {
    expect(get(report, "colour.hex6.outside_token_source").detail.otherExtensions).toBe(1); // c.js #ff0000
    expect(get(report, "colour.hex6.outside_token_source").detail.mockups).toEqual({
      pattern: "mock-?ups?", files: ["src/Mockups.tsx"], inMockupFiles: 1, excludingMockupFiles: 4,
    });
  });

  test("a hex in a token-source comment or plain rule is not a declared token value", () => {
    // Mockups.tsx #112233 (plain rule in the token source) and a.tsx #123456 (comment) stay not_token
    expect(perFile(report, "colour.hex6.not_token")).toEqual([
      { file: "src/Mockups.tsx", count: 1 },
      { file: "src/a.tsx", count: 1 },
      { file: "src/b.ts", count: 1 },
    ]);
  });

  test("scanner regex (3/4/6/8): #FFF equals declared #fff, #abcd equals declared #abcd (4→8 expansion), #abcd1234 does not", () => {
    // a.tsx 4 · b.ts 2 (#abcd1234 #abcd) · Mockups.tsx 1
    expect(val(report, "colour.hex_scanner.outside_token_source")).toBe(7);
    expect(val(report, "colour.hex_scanner.outside_token_source_files")).toBe(3);
    // a8511a ffffff 123456 abcd1234 aabbccdd 112233
    expect(val(report, "colour.hex_scanner.outside_token_source_distinct")).toBe(6);
    expect(val(report, "colour.hex_scanner.equals_token")).toBe(4); // a.tsx 3 (#a8511a #A8511A #FFF) + b.ts 1 (#abcd)
    expect(val(report, "colour.hex_scanner.not_token")).toBe(3); // #123456 #abcd1234 #112233
    expect(get(report, "colour.hex_scanner.outside_token_source").detail.otherExtensions).toBe(1);
  });

  test("tests and .d.ts never enter", () => {
    const files = perFile(report, "colour.hex6.outside_token_source").map((r) => r.file);
    expect(files).not.toContain("src/d.test.tsx");
    expect(files).not.toContain("src/types.d.ts");
  });

  test("the regexes used are on record in each definition", () => {
    expect(get(report, "colour.hex6.outside_token_source").definition.regex).toBe("(?<!&)#[0-9a-fA-F]{6}\\b");
    expect(get(report, "colour.hex_scanner.outside_token_source").definition.regex).toMatch(/url\\\(/);
    expect(get(report, "colour.hex6.outside_token_source").definition.fileSet).toMatch(/ts\/tsx/);
  });
});

describe("colour counters: 'equals a token' is exact after lowercase and 3→6 / 4→8 expansion", () => {
  test("short and long spellings of one colour are equal; a near miss and a different alpha are not", () => {
    const root = repo({
      "design/tokens.css": ":root {\n  --a: #abc;\n  --b: #DEF0;\n  --c: #123456\n    ;\n  --d: #0A0B0C;\n}\n",
      "src/x.tsx": [
        'export const l = ["#aabbcc", "#AABBCC", "#abc", "#ddeeff00", "#DDEEFF00", "#ddeeff", "#aabbcd", "#123456", "#0a0b0c", "#abcdef12"];',
        "",
      ].join("\n"),
    });
    const r = colour(root);
    // hex6 sees the 6-digit ones: #aabbcc #AABBCC (= declared #abc) #ddeeff (alpha-less, not equal) #aabbcd #123456 #0a0b0c
    expect(val(r, "colour.hex6.outside_token_source")).toBe(6);
    expect(val(r, "colour.hex6.equals_token")).toBe(4); // aabbcc AABBCC 123456 0a0b0c
    expect(val(r, "colour.hex6.not_token")).toBe(2); // ddeeff aabbcd
    // the scanner regex also sees #abc, #ddeeff00 x2 and the 8-digit #abcdef12
    expect(val(r, "colour.hex_scanner.outside_token_source")).toBe(10);
    expect(val(r, "colour.hex_scanner.equals_token")).toBe(7); // 4 above + #abc + #ddeeff00 + #DDEEFF00
    expect(val(r, "colour.hex_scanner.not_token")).toBe(3); // ddeeff aabbcd abcdef12
  });
});

describe("colour counters: colour function calls outside the token source", () => {
  let report;
  beforeAll(() => { report = colour(repo(FIXTURE_A)); });

  test("rgb( / rgba(, hsl(, oklch( counted per file, ts/tsx pinned, token-based calls exposed", () => {
    expect(val(report, "colour.rgb_fn.outside_token_source")).toBe(2); // e.tsx rgba x2 (c.js rgb( is another extension)
    expect(perFile(report, "colour.rgb_fn.outside_token_source")).toEqual([{ file: "src/e.tsx", count: 2 }]);
    expect(get(report, "colour.rgb_fn.outside_token_source").detail.otherExtensions).toBe(1);
    expect(get(report, "colour.rgb_fn.outside_token_source").detail.withVarArgument).toBe(1); // rgba(var(--x), .5)
    expect(val(report, "colour.hsl_fn.outside_token_source")).toBe(1);
    expect(val(report, "colour.oklch_fn.outside_token_source")).toBe(1);
  });
});

describe("colour counters: the token source is exempt and its share is split out", () => {
  test("a token source inside the audited dirs contributes only to colour.token_source.*", () => {
    const root = repo({
      "src/theme.css": ":root {\n  --a: #ff0000;\n  --b: #00ff00;\n  --c: rgb(1, 2, 3);\n  --d: 12px;\n  --e: 1;\n}\n",
      "src/app.tsx": 'export const c = "#0000ff"; export const r = "#FF0000"; export const s = "var(--a)"; export const p = "10px";\n',
    });
    const r = colour(root);
    expect(get(r, "colour.scanner.colour_hits").notes[0]).toMatch(/src\/theme\.css/);
    expect(val(r, "colour.scanner.colour_hits")).toBe(2); // app.tsx only
    expect(val(r, "colour.scanner.px_hits")).toBe(1);
    expect(val(r, "colour.scanner.files_audited")).toBe(1);
    expect(val(r, "colour.token_source.colour_hits")).toBe(3); // #ff0000 #00ff00 rgb(
    expect(val(r, "colour.token_source.px_hits")).toBe(1);
    expect(get(r, "colour.token_source.colour_share").detail).toEqual({ numerator: 3, denominator: 5 });
    expect(val(r, "colour.token_source.colour_share")).toBe(0.6);
    expect(val(r, "colour.hex6.outside_token_source")).toBe(2);
    expect(val(r, "colour.hex6.equals_token")).toBe(1); // #FF0000 = declared #ff0000
    expect(val(r, "colour.hex6.not_token")).toBe(1); // #0000ff
  });

  test("copied scanner regexes behave exactly like the scanner on tricky text", () => {
    const corpus = [
      "#fff #FFFF #ffffff #ffffffff #fffff #1234567 #ggg #abc-def x#abc a-#abc",
      "&#123; &#125; &#123456; &#x1F600; url(#abc) url(#abcdef) url( #abc)",
      "rgb(1,2,3) RGBA( rgba( hsl( hsla( oklch( oklch( xrgb( rgb (1)",
      "12px 1.5px px 12 px 3pxx a12px 0px 100px",
      "",
    ].join("\n");
    const asSource = scanProject(repo({ "src/probe.tsx": corpus }), ["src"]);
    const asToken = colour(repo({ "design/tokens.css": corpus }));
    expect(val(asToken, "colour.token_source.colour_hits")).toBe(asSource.critical);
    expect(val(asToken, "colour.token_source.px_hits")).toBe(asSource.warnings);
    expect(asSource.critical).toBeGreaterThan(5); // the corpus does exercise the regexes
  });
});

describe("colour counters: Tailwind classes", () => {
  const CLASSES = [
    "export const x = (",
    '  <div className="bg-red-500 hover:text-blue-600 dark:md:border-gray-200/50 !bg-slate-50 -ring-lime-400 flex gap-2 text-white bg-black/50">',
    "    <i className={cn(\"from-[#a8511a] to-[rgba(0,0,0,.5)]/50\", cond && 'via-emerald-950', `fill-${c}-500`)} />",
    '    <b className="[&>*]:stroke-rose-700 [&:hover]:bg-[hsl(1,2%,3%)] data-[state=open]:outline-pink-100" />',
    '    <u className="[box-shadow:0_0_0_1px_rgba(0,0,0,.1)] hover:[color:#fff] [--tw:oklch(0.5_0.1_20)]" />',
    '    <s className="text-[14px] bg-[var(--x)] text-red text-red-5000 bg-red-500x border-t-red-500 shadow-green-300 accent-red-50 shadow-md" />',
    '    <q className="bg-[color-mix(in_oklab,var(--x),#fff)] text-primary bg-background" />',
    "    <p className={`ring-teal-200${extra}`} />",
    '    <a className="fill-sky-300!" />',
    "  </div>",
    ");",
    "",
  ].join("\n");

  let report;
  beforeAll(() => { report = colour(repo({ "src/classes.tsx": CLASSES })); });

  test("palette classes: variants, !, leading -, opacity modifiers and bracket variants are stripped; shade must be real", () => {
    // bg-red-500 · hover:text-blue-600 · dark:md:border-gray-200/50 · !bg-slate-50 · -ring-lime-400
    // via-emerald-950 · [&>*]:stroke-rose-700 · data-[state=open]:outline-pink-100
    // ring-teal-200 (next to a ${} in a template literal) · fill-sky-300! (trailing important)
    const c = get(report, "colour.palette_class.matches");
    expect(c.value).toBe(10);
    expect(c.perFile).toEqual([{ file: "src/classes.tsx", count: 10 }]);
    expect(c.detail.distinct).toBe(10);
    expect(c.detail.classes).toEqual([
      "bg-red-500", "bg-slate-50", "border-gray-200/50", "fill-sky-300", "outline-pink-100",
      "ring-lime-400", "ring-teal-200", "stroke-rose-700", "text-blue-600", "via-emerald-950",
    ]);
    expect(val(report, "colour.palette_class.files")).toBe(1);
  });

  test("near misses are not classes: bad shade, trailing junk, dynamic names, token utilities, sizes, var() brackets", () => {
    const r = colour(repo({
      "src/near.tsx": [
        "export const n = [",
        '  "text-red text-red-5000 bg-red-500x xbg-red-500 text-slate-500-foo text-gray-1000",',
        "  `fill-${c}-500 bg-${tone}-500`,",
        '  "text-primary bg-background border-border text-[14px] bg-[var(--x)] bg-[length:var(--y)] shadow-md",',
        "];",
        "",
      ].join("\n"),
    }));
    for (const id of ["colour.palette_class.matches", "colour.palette_class.extra_matches", "colour.arbitrary_colour_class.matches",
      "colour.arbitrary_property_class.colour_literals", "colour.white_black_class.matches"]) {
      expect(val(r, id)).toBe(0);
    }
  });

  test("white and black utilities are out of the palette definition and counted on their own", () => {
    expect(val(report, "colour.white_black_class.matches")).toBe(2); // text-white, bg-black/50
  });

  test("utilities outside the pinned family list are exposed separately", () => {
    expect(val(report, "colour.palette_class.extra_matches")).toBe(3); // border-t-red-500, shadow-green-300, accent-red-50
  });

  test("colour-utility arbitrary classes: literal in the bracket, any variant, opacity suffix; var()-only and sizes do not count", () => {
    // from-[#a8511a] · to-[rgba(0,0,0,.5)]/50 · [&:hover]:bg-[hsl(1,2%,3%)] · bg-[color-mix(in_oklab,var(--x),#fff)]
    expect(val(report, "colour.arbitrary_colour_class.matches")).toBe(4);
  });

  test("arbitrary-property classes with a colour literal are their own counter", () => {
    // [box-shadow:…rgba(…)] · hover:[color:#fff] · [--tw:oklch(…)]
    expect(val(report, "colour.arbitrary_property_class.colour_literals")).toBe(3);
  });

  test("a class mentioned in a comment counts (tokens, not className parsing) — documented", () => {
    const r = colour(repo({ "src/note.tsx": "// we ban bg-red-500 here\nexport const a = 1;\n" }));
    expect(val(r, "colour.palette_class.matches")).toBe(1);
    expect(get(r, "colour.palette_class.matches").notes.join(" ")).toMatch(/comment/);
  });

  test("css @apply lines count too (audited files of any extension)", () => {
    const r = colour(repo({ "src/x.css": ".a { @apply bg-red-500 text-sm; }\n.b { @apply border-gray-200/50; }\n" }));
    expect(val(r, "colour.palette_class.matches")).toBe(2);
  });

  test("none of the class counters judges: ids stay in the colour group", () => {
    expect(report.counters.every((c) => c.id.startsWith("colour."))).toBe(true);
  });
});

describe("colour counters: punctuation never hides a class", () => {
  const PALETTE = "colour.palette_class.matches";
  const one = (src) => colour(repo({ "src/p.tsx": src }));

  test("JSX text, escaped quotes, comma-joined classes and a trailing period or comma are still read", () => {
    const r = one([
      "export const A = () => <p>Use <code>bg-red-500</code> never.</p>;", // 1
      'export const B = () => <p>Use "bg-blue-500" never.</p>;', // 1
      'export const C = "<div class=\\"text-green-600\\"></div>";', // 1
      'export const D = "ok"; // text-lime-300, text-pink-300.', // 2
      'export const E = "bg-slate-100,text-zinc-900";', // 2
      "",
    ].join("\n"));
    expect(val(r, PALETTE)).toBe(7);
    expect(get(r, PALETTE).detail.distinct).toBe(7);
  });

  test("a backslash escape \\n, \\r or \\t inside a string is a separator, not the first letter of the next class", () => {
    const r = one([
      'export const a = "bg-amber-400\\ntext-lime-300";', // 2 (the n of \n must not turn text-... into ntext-...)
      'export const b = "\\tborder-teal-200\\r\\nring-sky-300";', // 2
      "",
    ].join("\n"));
    expect(val(r, PALETTE)).toBe(4);
    expect(get(r, PALETTE).detail.classes).toEqual(["bg-amber-400", "border-teal-200", "ring-sky-300", "text-lime-300"]);
  });

  test("every neighbour in a left x right matrix leaves the class countable: one file per left neighbour", () => {
    const lefts = ["", " ", '"', "'", "`", "(", ">", "=", ",", '\\"', ".", "//", "/*", "**", "|", ";", "&&", "?", "{", "${x}", "[", "<b>", "\\n", "\\t", ":", "!", "-", "<code>", "([", "*:"];
    const rights = ["", " ", '"', "'", "`", ")", "<", ">", ",", ".", ";", '\\"', "*", "|", "}", "]", ":", "/", "!", "?", "=", "\\n", "$", "</code>", ".)", "),", "].", ")]", "/>"];
    const files = {};
    lefts.forEach((l, i) => { files[`src/m${i}.tsx`] = rights.map((rt) => `${l}bg-red-500${rt}`).join("\n") + "\n"; });
    const c = get(colour(repo(files)), PALETTE);
    expect(c.value).toBe(lefts.length * rights.length);
    expect(c.perFile.every((row) => row.count === rights.length)).toBe(true);
    expect(c.perFile).toHaveLength(lefts.length);
  });

  test("a lone [..] group with no colon is opened; an arbitrary property with a colon is not a palette class", () => {
    const r = one([
      "// see [bg-red-500] and [text-blue-600,border-gray-200] or [ring-sky-300, fill-rose-50]", // 1 + 2 + 2
      'export const p = "[color:bg-red-500] [box-shadow:0_0_0_1px_rgba(0,0,0,.1)]";', // 0 (property classes, value is not a palette class)
      "",
    ].join("\n"));
    expect(val(r, PALETTE)).toBe(5);
    expect(val(r, "colour.arbitrary_property_class.colour_literals")).toBe(1);
  });

  test("a [..] group never swallows whitespace, quotes or braces, so a class inside one that holds a colon is still read", () => {
    const r = one([
      "// [hover:bg-red-500 text-blue-600]", // 2: a space ends the group
      'export const j = ["hover:border-gray-200","focus:ring-sky-300"];', // 2: a compact array, quotes end the group
      "export const o = [hover:fill-rose-50,{x}];", // 1: a brace ends the group
      "",
    ].join("\n"));
    expect(val(r, PALETTE)).toBe(5);
  });

  test("only a token that is entirely one [..] group is opened: a group glued to a word is left alone, never misread as another class", () => {
    const r = one('export const g = "[note]bg-red-500 [note]bg-red-500x";\n');
    expect(val(r, PALETTE)).toBe(0);
    expect(get(r, PALETTE).detail.classes).toEqual([]);
  });

  test("one level of nested brackets stays inside a [..] group, so an arbitrary property keeps its colour literal", () => {
    const r = one('export const n = "[background:linear-gradient(var(--x[0]),#fff)] [--tw:var(--y[1])]";\n');
    expect(val(r, "colour.arbitrary_property_class.colour_literals")).toBe(1);
  });

  test("variants made of brackets, parens and @ do not break the class after them", () => {
    const r = one([
      'export const v = "supports-[display:grid]:bg-red-500 has-[:checked]:text-blue-600 *:border-gray-200 @md:ring-sky-300 group-hover/item:fill-rose-50 min-[320px]:max-[600px]:stroke-lime-400 peer-[.is-dirty]:peer-required:outline-pink-100";',
      "",
    ].join("\n"));
    expect(val(r, PALETTE)).toBe(7);
  });

  test("commas inside a [..] value do not split the class; commas between classes do", () => {
    const r = one([
      'export const c = "border-[rgba(0,0,0,.1)],text-[hsl(1,2%,3%)] from-[#a8511a],to-[#fff]";',
      "",
    ].join("\n"));
    expect(val(r, "colour.arbitrary_colour_class.matches")).toBe(4);
    expect(val(r, PALETTE)).toBe(0);
  });

  test("a word that merely ends in, starts with or continues a class is not that class", () => {
    const near = ["abg-red-500", "0bg-red-500", "_bg-red-500", "bg-red-500x", "bg-red-5000", "bg-red-500_", "bg-red-500-", "bg-red-500-foo", "x-bg-red-500", "bg-red-500a", "xtext-red-500", "text-red-50-0"];
    const r = one(`export const n = ${JSON.stringify(near.join(" "))};\n${near.map((c) => `// ${c}.`).join("\n")}\n`);
    expect(val(r, PALETTE)).toBe(0);
    expect(val(r, "colour.palette_class.extra_matches")).toBe(0);
  });

  test("a url(#id) svg reference in an arbitrary value is not a hex colour (the scanner skips it too)", () => {
    const r = one('export const u = "bg-[url(#add)] fill-[url(#abcdef)] bg-[#add] fill-[#abcdef] bg-[url(#fff)]/50";\n');
    expect(val(r, "colour.arbitrary_colour_class.matches")).toBe(2); // bg-[#add] and fill-[#abcdef]
  });

  test("opacity modifiers in both forms, and every extra utility, are exact", () => {
    const r = one([
      'export const o = "text-red-500/[.3] bg-blue-500/50 border-gray-200/[0.25]";', // palette 3
      'export const e = "accent-red-50 caret-sky-300 decoration-rose-200 shadow-green-300 placeholder-teal-400 ring-offset-red-500 border-t-red-500 border-r-red-500 border-b-red-500 border-l-red-500 border-x-red-500 border-y-red-500 border-s-red-500 border-e-red-500 inset-shadow-lime-100 inset-ring-lime-200 drop-shadow-pink-300";', // extra 17
      "",
    ].join("\n"));
    expect(val(r, PALETTE)).toBe(3);
    expect(val(r, "colour.palette_class.extra_matches")).toBe(17);
  });

  test("a hex literal in an arbitrary value needs a clean boundary and a real length", () => {
    const r = one('export const h = "bg-[#fffff] bg-[#abcg] bg-[#1234567] bg-[#12] text-[#abc]x bg-[#abc] bg-[#abcd] bg-[#abcdef] bg-[#abcdef12]";\n');
    expect(val(r, "colour.arbitrary_colour_class.matches")).toBe(4); // #abc #abcd #abcdef #abcdef12
  });

  test("colour function names need a word boundary: xrgb( ahsl( 9hsla( _oklch( are not colours", () => {
    const r = one('export const f = [xrgb(1), ahsl(2), 9hsla(3), _oklch(4), rgb(1,2,3), hsl(1,2%,3%), oklch(0.5 0.1 20)];\n');
    expect(val(r, "colour.rgb_fn.outside_token_source")).toBe(1);
    expect(val(r, "colour.hsl_fn.outside_token_source")).toBe(1);
    expect(val(r, "colour.oklch_fn.outside_token_source")).toBe(1);
  });

  test("the published class regex is the tokenizer that ran", () => {
    const c = get(one("export const a = 1;\n"), PALETTE);
    // two patterns, each one pasteable: the tokenizer, then the palette shape tested on every token it yields
    expect(c.definition.regex).toBeNull();
    const [tokenizer, shape] = c.definition.regexes;
    expect(tokenizer.regex).toContain("\\\\[nrt]|((?:[A-Za-z0-9_:/!-]|");
    expect(tokenizer.label).toContain("trimmed");
    expect([tokenizer.flags, shape.flags]).toEqual(["g", ""]);
  });
});

describe("colour counters: odd repos", () => {
  test("empty repo, missing dir, no token source: zeros, notes, no throw", () => {
    const empty = repo({});
    for (const r of [colour(empty, []), colour(empty, ["nope"])]) {
      expect(val(r, "colour.scanner.colour_hits")).toBe(0);
      expect(val(r, "colour.scanner.files_audited")).toBe(0);
      expect(val(r, "colour.hex6.outside_token_source")).toBe(0);
      expect(val(r, "colour.palette_class.matches")).toBe(0);
      expect(val(r, "colour.token_source.colour_hits")).toBe(0);
      expect(val(r, "colour.token_source.colour_share")).toBeNull(); // 0 of 0 is no ratio, not a 0% share
      expect(get(r, "colour.token_source.colour_share").notes.join(" ")).toMatch(/no token source/);
      expect(get(r, "colour.token_source.colour_share").notes.join(" ")).toMatch(/no ratio \(value null\)/);
    }
  });

  test("no token source: every hex counts as not_token, with a note saying why", () => {
    const r = colour(repo({ "src/x.tsx": 'export const a = "#ffffff"; export const b = "#fff";\n' }));
    expect(val(r, "colour.hex6.outside_token_source")).toBe(1);
    expect(val(r, "colour.hex6.equals_token")).toBe(0);
    expect(val(r, "colour.hex6.not_token")).toBe(1);
    expect(get(r, "colour.hex6.not_token").notes.join(" ")).toMatch(/no token source/);
    expect(val(r, "colour.token_source.colour_hits")).toBe(0);
  });

  test("a one-line minified file, non-UTF-8 bytes and a dir with spaces are read without error, quickly", () => {
    const root = repo({ "my src/min.ts": ".a{color:#abcdef;background:rgba(0,0,0,.5)}".repeat(25000) });
    fs.writeFileSync(path.join(root, "my src", "bin.ts"), Buffer.concat([Buffer.from([0xff, 0xfe]), Buffer.from('"#123456"')]));
    const started = Date.now();
    const r = colour(root, ["my src"]);
    expect(Date.now() - started).toBeLessThan(3000);
    expect(val(r, "colour.hex6.outside_token_source")).toBe(25001);
    expect(val(r, "colour.rgb_fn.outside_token_source")).toBe(25000);
    expect(r.warnings.filter((w) => /disagree/.test(w))).toEqual([]);
  });

  describe("a file over the 5 MB read cap", () => {
    const CAP = 5 * 1024 * 1024;
    let root;
    let r;
    beforeAll(() => {
      root = repo({ "src/ok.tsx": 'export const a = "#abcdef";\n' });
      // 5.5 MB: over the cap · 4.4 MB: under it
      fs.writeFileSync(path.join(root, "src", "huge.ts"), "export const x = '#123456';\n" + "// padding\n".repeat(500000));
      fs.writeFileSync(path.join(root, "src", "big.ts"), "export const y = '#654321';\n" + "// padding\n".repeat(400000));
      r = colour(root);
    });

    test("is skipped by every counter alike, with a warning: no counter sees what the others cannot", () => {
      expect(fs.statSync(path.join(root, "src", "huge.ts")).size).toBeGreaterThan(CAP);
      expect(fs.statSync(path.join(root, "src", "big.ts")).size).toBeLessThan(CAP);
      expect(r.warnings.some((w) => /skipped \(over 5 MB\).*huge\.ts/.test(w))).toBe(true);
      expect(r.warnings.filter((w) => /disagree/.test(w))).toEqual([]);
      expect(val(r, "colour.hex6.outside_token_source")).toBe(2); // ok.tsx and big.ts
      expect(val(r, "colour.scanner.colour_hits")).toBe(2); // the scanner skips huge.ts too
      expect(perFile(r, "colour.scanner.colour_hits")).toEqual([{ file: "src/big.ts", count: 1 }, { file: "src/ok.tsx", count: 1 }]);
    });

    test("the scanner total still reconciles with the per-type counters", () => {
      const hexAll = val(r, "colour.hex_scanner.outside_token_source") + get(r, "colour.hex_scanner.outside_token_source").detail.otherExtensions;
      expect(hexAll).toBe(val(r, "colour.scanner.colour_hits"));
    });

    test("files_audited is the scanned count, and says which audited files it left out and why", () => {
      const audited = get(r, "colour.scanner.files_audited");
      expect(audited.value).toBe(2);
      expect(r.scope.population.audited).toBe(3);
      expect(audited.detail.auditedPopulation).toBe(3);
      expect(audited.detail.skippedTotal).toBe(1);
      expect(audited.detail.skipped).toEqual([{ file: "src/huge.ts", reason: "over 5 MB" }]);
      expect(audited.detail.readCapBytes).toBe(CAP);
    });

    test("every scanner counter carries the note, not just the hit totals", () => {
      for (const id of ["colour.scanner.colour_hits", "colour.scanner.px_hits", "colour.scanner.files_audited", "colour.scanner.files_with_colour_hits",
        "colour.scanner.files_with_px_only_hits", "colour.scanner.files_with_hits", "colour.token_source.colour_share", "colour.token_source.px_share"]) {
        expect(get(r, id).notes.join(" ")).toMatch(/not scanned.*huge\.ts/);
      }
    });

    test("the scanner is held to the cap: its own run with that cap gives the same numbers", () => {
      const scan = scanProject(root, ["src"], { maxBytes: CAP });
      expect(scan.skipped.map((s) => s.file)).toEqual(["src/huge.ts"]);
      expect(val(r, "colour.scanner.colour_hits")).toBe(scan.critical);
      expect(val(r, "colour.scanner.px_hits")).toBe(scan.warnings);
      expect(val(r, "colour.scanner.files_audited")).toBe(scan.componentsAudited);
      expect(val(r, "colour.scanner.files_with_hits")).toBe(scan.filesWithDrift);
    });
  });

  test("when every audited file is over the cap, nothing is invented and the reason is on record", () => {
    const root = repo({});
    fs.mkdirSync(path.join(root, "src"));
    fs.writeFileSync(path.join(root, "src", "huge.ts"), "export const x = '#123456';\n" + "// padding\n".repeat(500000));
    const r = colour(root);
    expect(val(r, "colour.scanner.colour_hits")).toBe(0);
    expect(val(r, "colour.scanner.files_audited")).toBe(0);
    const notes = get(r, "colour.scanner.files_audited").notes.join(" ");
    expect(notes).toMatch(/not scanned.*huge\.ts/);
    expect(notes).not.toMatch(/nothing to audit/); // the population is not empty; its only file is too large
  });

  test("a BOM at the start of a source file or of the token file changes nothing", () => {
    const plain = colour(repo({
      "design/tokens.css": ":root {\n  --a: #abcdef;\n}\n",
      "src/a.tsx": "bg-red-500 #abcdef rgba(0,0,0,.5)\n",
    }));
    const bom = colour(repo({
      "design/tokens.css": "\uFEFF:root {\n  --a: #abcdef;\n}\n",
      "src/a.tsx": "\uFEFFbg-red-500 #abcdef rgba(0,0,0,.5)\n",
    }));
    expect(val(bom, "colour.palette_class.matches")).toBe(1);
    expect(val(bom, "colour.hex6.equals_token")).toBe(1);
    expect(val(bom, "colour.token_source.colour_hits")).toBe(1);
    expect(bom.counters.map((c) => [c.id, c.value])).toEqual(plain.counters.map((c) => [c.id, c.value]));
    // a token file whose very first line is a declaration: the BOM must not hide it
    const first = colour(repo({ "design/tokens.css": "\uFEFF--a: #abcdef;\n--b: 1;\n", "src/a.tsx": 'export const c = "#ABCDEF";\n' }));
    expect(val(first, "colour.hex6.equals_token")).toBe(1);
  });

  test("symlinks are never followed: a linked file or folder is not audited", () => {
    const outside = repo({ "real.tsx": 'export const o = "#ff0000 bg-red-500";\n', "dir/inner.tsx": 'export const i = "#00ff00";\n' });
    const root = repo({ "src/own.tsx": 'export const a = "#abcdef";\n' });
    try {
      fs.symlinkSync(path.join(outside, "real.tsx"), path.join(root, "src", "linked.tsx"));
      fs.symlinkSync(path.join(outside, "dir"), path.join(root, "src", "linkdir"));
    } catch {
      return; // no symlink support here (e.g. Windows without privileges)
    }
    const r = colour(root);
    expect(r.scope.population.audited).toBe(1);
    expect(val(r, "colour.hex6.outside_token_source")).toBe(1);
    expect(val(r, "colour.scanner.colour_hits")).toBe(1);
    expect(val(r, "colour.palette_class.matches")).toBe(0);
  });

  test("a '..' dir or an absolute dir outside the repo is rejected and never read", () => {
    const outside = repo({ "src/x.tsx": 'export const o = "#ff0000 bg-red-500";\n' });
    const root = repo({ "src/own.tsx": "export const a = 1;\n" });
    for (const dir of [path.relative(root, path.join(outside, "src")), path.join(outside, "src"), "../../etc"]) {
      const r = colour(root, [dir]);
      expect(r.scope.rejectedDirs).toEqual([dir]);
      expect(r.warnings.some((w) => /outside the repo root/.test(w))).toBe(true);
      expect(val(r, "colour.hex6.outside_token_source")).toBe(0);
      expect(val(r, "colour.scanner.colour_hits")).toBe(0);
      expect(val(r, "colour.palette_class.matches")).toBe(0);
    }
  });

  test("a 200-file repo is well under 2 s", () => {
    const files = { "design/tokens.css": TOKENS };
    for (let i = 0; i < 200; i++) {
      files[`src/c${i}.tsx`] = `export const C${i} = () => <div className="bg-[#a8511a] text-sm hover:bg-red-500" style={{ color: "#A8511A", gap: "12px" }} />;\n`.repeat(40);
    }
    const root = repo(files);
    const started = Date.now();
    const r = colour(root);
    expect(Date.now() - started).toBeLessThan(2000);
    // per line: bg-[#a8511a] and "#A8511A" are two hex6 hits, both equal to the declared #A8511A
    expect(val(r, "colour.hex6.outside_token_source")).toBe(200 * 40 * 2);
    expect(val(r, "colour.hex6.equals_token")).toBe(200 * 40 * 2);
    expect(val(r, "colour.palette_class.matches")).toBe(200 * 40); // hover:bg-red-500
    expect(val(r, "colour.arbitrary_colour_class.matches")).toBe(200 * 40); // bg-[#a8511a]
  });

  test("determinism: two runs over the same tree are deep-equal", () => {
    const root = repo(FIXTURE_A);
    expect(colour(root)).toEqual(colour(root));
  });

  test("os temp dirs with spaces still resolve (path with a space in the repo root)", () => {
    const base = fs.mkdtempSync(path.join(os.tmpdir(), "sx colour "));
    roots.push(base);
    fs.mkdirSync(path.join(base, "src"));
    fs.writeFileSync(path.join(base, "src", "a.tsx"), 'export const a = "#abcdef";\n');
    const r = colour(base);
    expect(val(r, "colour.hex6.outside_token_source")).toBe(1);
  });
});
