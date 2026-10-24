/**
 * tokens.test.js — acceptance tests for the `tokens` counter group (token
 * source inventory). Every expectation is hand-computed from a tiny temp repo;
 * no number of the live repo is pinned here.
 */

"use strict";

const { makeRepo, removeRepo, run, get, val } = require("./helpers");

// 30 lines, LF. Line numbers matter: the block detail reports them.
const TOKENS_CSS = [
  "/* palette: old #abcdef value */",
  ":root {",
  "  --background: #FFFFFF;",
  "  --foreground: #111;",
  "  --primary: #a8511a;",
  "  --font-size-sm: 0.8125rem;",
  "  --font-size-base: 0.875rem;",
  "  --space-1: 0.25rem;",
  "  --space-2: 0.5rem;",
  "  --accent: oklch(0.7 0.1 70);",
  "}",
  "",
  ".dark {",
  "  --background: #16100A;",
  "  --foreground: #EEE;",
  "  --primary: #FF9E3D;",
  "}",
  "",
  "@theme inline {",
  "  --color-background: var(--background);",
  "  --text-sm: var(--font-size-sm);",
  "  --spacing: 0.25rem;",
  "  --spacing-base: var(--space-1);",
  "  --font-sans: ui-sans-serif, system-ui;",
  "}",
  "",
  ".btn {",
  "  --btn-pad: 4px;",
  "  color: #123;",
  "}",
  "",
].join("\n");

const FILES = {
  "design/tokens.css": TOKENS_CSS,
  "src/a.tsx": 'export const s = "var(--font-size-sm)"; export const t = "calc(var(--space-2) * 2)";\n',
  "src/b.css": ".x { font-size: var(--font-size-sm); padding: var( --space-2 ); margin: var(--space-2) }\n",
  "src/c.test.tsx": 'export const t = "var(--space-1)";\n',
};

const tokens = (root, dirs = ["src"]) => run(root, { dirs, groups: ["tokens"] });

describe("tokens counters", () => {
  const roots = [];
  const repo = (files) => { const r = makeRepo(files); roots.push(r); return r; };
  afterAll(() => roots.forEach(removeRepo));

  let report;
  beforeAll(() => { report = tokens(repo(FILES)); });

  test("source: found, path, how it was resolved, line count", () => {
    expect(val(report, "tokens.source.found")).toBe(true);
    expect(val(report, "tokens.source.path")).toBe("design/tokens.css");
    expect(val(report, "tokens.source.via")).toBe("design/tokens.css");
    expect(val(report, "tokens.source.lines")).toBe(30);
    expect(get(report, "tokens.source.path").detail.inAuditedDirs).toBe(false);
  });

  test("custom properties are de-duplicated by name (a .dark redeclaration counts once)", () => {
    // 8 in :root + 5 in @theme + 1 in .btn; .dark repeats three names
    expect(val(report, "tokens.custom_properties.distinct")).toBe(14);
    expect(report.scope.tokenSource.customProperties).toBe(14); // the resolver counts the same way
    expect(val(report, "tokens.declarations.lines")).toBe(17);
  });

  test("declaration lines split by block: root, dark, theme, other add up to the total", () => {
    expect(val(report, "tokens.declarations.root")).toBe(8);
    expect(val(report, "tokens.declarations.dark")).toBe(3);
    expect(val(report, "tokens.declarations.theme")).toBe(5);
    expect(val(report, "tokens.declarations.other")).toBe(1);
    const sum = ["root", "dark", "theme", "other"].reduce((n, k) => n + val(report, `tokens.declarations.${k}`), 0);
    expect(sum).toBe(val(report, "tokens.declarations.lines"));
  });

  test("block detail names each block with its selector and line range", () => {
    expect(get(report, "tokens.declarations.root").detail.blocks).toEqual([
      { selector: ":root", startLine: 2, endLine: 11, declarations: 8 },
    ]);
    expect(get(report, "tokens.declarations.dark").detail.blocks).toEqual([
      { selector: ".dark", startLine: 13, endLine: 17, declarations: 3 },
    ]);
    expect(get(report, "tokens.declarations.theme").detail.blocks).toEqual([
      { selector: "@theme inline", startLine: 19, endLine: 25, declarations: 5 },
    ]);
    expect(get(report, "tokens.declarations.other").detail.blocks).toEqual([
      { selector: ".btn", startLine: 27, endLine: 30, declarations: 1 },
    ]);
  });

  test("hex literals count comments too, and say how many sit in them", () => {
    const hex = get(report, "tokens.hex.literals");
    // #abcdef (comment) #FFFFFF #111 #a8511a #16100A #EEE #FF9E3D #123
    expect(hex.value).toBe(8);
    expect(hex.detail.inComments).toBe(1);
    expect(hex.detail.distinct).toBe(8);
  });

  test("declared hex set holds only custom-property values, normalised (comment and .btn colour excluded)", () => {
    // ffffff 111111 a8511a 16100a eeeeee ff9e3d
    expect(val(report, "tokens.hex.declared_distinct")).toBe(6);
  });

  test("oklch occurrences and declarations", () => {
    expect(val(report, "tokens.oklch.occurrences")).toBe(1);
    expect(val(report, "tokens.oklch.declarations")).toBe(1);
  });

  test("scale families: declarations, var() consumers across the audited population, unconsumed", () => {
    expect(val(report, "tokens.font_size.declarations")).toBe(2);
    expect(val(report, "tokens.space.declarations")).toBe(2);
    expect(val(report, "tokens.text.declarations")).toBe(1);

    // a.tsx 1 + b.css 1; the token source's own reference is not a consumer
    const fs = get(report, "tokens.font_size.consumers");
    expect(fs.value).toBe(2);
    expect(fs.perFile).toEqual([{ file: "src/a.tsx", count: 1 }, { file: "src/b.css", count: 1 }]);
    expect(fs.detail).toEqual({ distinct: 1, inTokenSource: 1 });
    expect(val(report, "tokens.font_size.unconsumed")).toBe(1);
    expect(get(report, "tokens.font_size.unconsumed").detail.names).toEqual(["--font-size-base"]);

    // a.tsx 1 + b.css 2 (`var( --space-2 )` counts); c.test.tsx is a test and does not
    const sp = get(report, "tokens.space.consumers");
    expect(sp.value).toBe(3);
    expect(sp.perFile).toEqual([{ file: "src/b.css", count: 2 }, { file: "src/a.tsx", count: 1 }]);
    // --space-1 is referenced only by a test file and by the token source's own @theme line: no consumer
    expect(get(report, "tokens.space.unconsumed").detail.names).toEqual(["--space-1"]);
    expect(get(report, "tokens.space.unconsumed").detail.referencedInTokenSource).toEqual(["--space-1"]);
    expect(get(report, "tokens.space.consumers").detail).toEqual({ distinct: 1, inTokenSource: 1 });

    expect(val(report, "tokens.text.consumers")).toBe(0);
    expect(get(report, "tokens.text.unconsumed").detail.names).toEqual(["--text-sm"]);
  });

  test("@theme mapping: present, block count, which lines expose the font-size and spacing scales", () => {
    expect(val(report, "tokens.theme.present")).toBe(true);
    expect(val(report, "tokens.theme.blocks")).toBe(1);
    expect(val(report, "tokens.theme.maps_font_size")).toBe(1);
    expect(get(report, "tokens.theme.maps_font_size").detail.names).toEqual(["--text-sm"]);
    expect(val(report, "tokens.theme.maps_space")).toBe(2); // --spacing and --spacing-base (which also references var(--space-1))
    expect(get(report, "tokens.theme.maps_space").detail.names).toEqual(["--spacing", "--spacing-base"]);
  });

  test("CRLF and LF token files give identical counters", () => {
    const crlf = tokens(repo({ ...FILES, "design/tokens.css": TOKENS_CSS.replace(/\n/g, "\r\n") }));
    expect(crlf.counters).toEqual(report.counters);
  });

  test("same tree, same report: two runs are deep-equal", () => {
    const root = repo(FILES);
    expect(tokens(root)).toEqual(tokens(root));
  });
});

describe("tokens counters: block attribution", () => {
  let root;
  afterAll(() => removeRepo(root));

  test("wrappers are transparent; :not(.dark) stays light; data-theme=dark is dark; braces in comments and strings do not move blocks", () => {
    root = makeRepo({
      "design/tokens.css": [
        "@layer base {",
        "  :root {",
        "    --a: 1;",
        "    /* } { */",
        '    --b: "}";',
        "  }",
        "  .dark {",
        "    --a: 2;",
        "  }",
        "  :root:not(.dark) {",
        "    --c: 3;",
        "  }",
        '  [data-theme="dark"] {',
        "    --d: 4;",
        "  }",
        "  .dark {",
        "    @media (prefers-contrast: more) {",
        "      --f: 6;",
        "    }",
        "  }",
        "}",
        "@media (min-width: 640px) {",
        "  @theme {",
        "    --e: 5;",
        "  }",
        "}",
        "",
      ].join("\n"),
    });
    const r = tokens(root);
    expect(val(r, "tokens.declarations.root")).toBe(3); // a, b, c
    expect(val(r, "tokens.declarations.dark")).toBe(3); // a, d, and f (an @media nested inside .dark)
    expect(val(r, "tokens.declarations.theme")).toBe(1); // e
    expect(val(r, "tokens.declarations.other")).toBe(0);
    expect(val(r, "tokens.declarations.lines")).toBe(7);
    expect(val(r, "tokens.custom_properties.distinct")).toBe(6);
    expect(val(r, "tokens.theme.blocks")).toBe(1);
  });
});

describe("tokens counters: the declared hex set", () => {
  test("is normalised: #abc, #AABBCC are one value; #DEF0 and #ddeeff00 are one value; multi-line values and comments handled", () => {
    const root = makeRepo({
      "design/tokens.css": [
        "/*",
        "  --retired: #999999;",
        "*/",
        ":root {",
        "  --a: #abc;",
        "  --b: #AABBCC;",
        "  --c: #DEF0;",
        "  --d: #ddeeff00;",
        "  --e: linear-gradient(",
        "    #123456,",
        "    #654321",
        "  );",
        "}",
        ".x { color: #777777; }",
        "",
      ].join("\n"),
    });
    try {
      const r = tokens(root);
      // aabbcc · ddeeff00 · 123456 · 654321 (not #999999: comment; not #777777: not a custom property)
      expect(val(r, "tokens.hex.declared_distinct")).toBe(4);
      expect(val(r, "tokens.hex.literals")).toBe(8);
      expect(get(r, "tokens.hex.literals").detail.inComments).toBe(1);
    } finally {
      removeRepo(root);
    }
  });
});

describe("tokens counters: odd repos never crash and never invent numbers", () => {
  const roots = [];
  const repo = (files) => { const r = makeRepo(files); roots.push(r); return r; };
  afterAll(() => roots.forEach(removeRepo));

  const NUMERIC = ["tokens.source.lines", "tokens.custom_properties.distinct", "tokens.declarations.lines",
    "tokens.hex.literals", "tokens.oklch.occurrences", "tokens.font_size.declarations", "tokens.space.consumers"];

  test("no token source: found=false, path null, every number 0, the reason is on record", () => {
    const root = repo({ "src/a.tsx": "export const a = 1;\n" });
    const r = tokens(root);
    expect(val(r, "tokens.source.found")).toBe(false);
    expect(val(r, "tokens.source.path")).toBeNull();
    expect(val(r, "tokens.source.via")).toBe("none");
    for (const id of NUMERIC) expect(val(r, id)).toBe(0);
    expect(val(r, "tokens.theme.present")).toBe(false);
    expect(get(r, "tokens.source.found").notes[0]).toMatch(/no token source/);
    expect(r.warnings.some((w) => /no token source/.test(w))).toBe(true);
  });

  test("empty repo and a missing audited dir", () => {
    const empty = repo({});
    for (const r of [tokens(empty, []), tokens(empty, ["nope"])]) {
      expect(val(r, "tokens.source.found")).toBe(false);
      for (const id of NUMERIC) expect(val(r, id)).toBe(0);
    }
    expect(tokens(empty, ["nope"]).scope.missingDirs).toEqual(["nope"]);
  });

  test("a token source without a trailing newline still counts its last line; empty file counts 0", () => {
    const noNl = tokens(repo({ "design/tokens.css": ":root {\n  --a: #fff;\n}" }));
    expect(val(noNl, "tokens.source.lines")).toBe(3);
    const blank = tokens(repo({ "design/tokens.css": "" }));
    expect(val(blank, "tokens.source.found")).toBe(true);
    expect(val(blank, "tokens.source.lines")).toBe(0);
    expect(val(blank, "tokens.custom_properties.distinct")).toBe(0);
  });

  test("a minified token source is read in bounded time and every declaration in it is counted", () => {
    const minified = ":root{--a:#fff;--b:#000;--c:1px}".repeat(2000);
    const started = Date.now();
    const r = tokens(repo({ "design/tokens.css": minified }));
    expect(Date.now() - started).toBeLessThan(2000);
    expect(val(r, "tokens.source.lines")).toBe(1);
    expect(val(r, "tokens.hex.literals")).toBe(4000);
    expect(val(r, "tokens.custom_properties.distinct")).toBe(3);
    expect(val(r, "tokens.declarations.total")).toBe(6000);
    expect(val(r, "tokens.declarations.lines")).toBe(1); // one line holds them all
    expect(get(r, "tokens.declarations.root").detail.declarations).toBe(6000);
    expect(val(r, "tokens.declarations.line_start")).toBe(0); // the oracle's line-start regex sees none of them
    expect(val(r, "tokens.hex.declared_distinct")).toBe(2);
  });

  test("an unclosed comment and an unbalanced brace do not hang or throw; a declaration inside the comment is not one", () => {
    const r = tokens(repo({ "design/tokens.css": ":root {\n  --a: 1;\n/* never closed\n  --b: 2;\n" + "/* x ".repeat(2000) }));
    expect(val(r, "tokens.custom_properties.distinct")).toBe(1);
    expect(val(r, "tokens.declarations.line_start")).toBe(2); // the oracle regex counts the commented-out line; the parser does not
  });

  test("a dir with spaces in its name and non-UTF-8 bytes in a source file", () => {
    const root = repo({ "my src/a.tsx": "export const a = 'var(--space-1)';\n", "design/tokens.css": ":root {\n  --space-1: 1px;\n}\n" });
    require("fs").writeFileSync(require("path").join(root, "my src", "bin.ts"), Buffer.from([0xff, 0xfe, 0x76, 0x61, 0x72, 0x28, 0x2d, 0x2d, 0x73, 0x70, 0x61, 0x63, 0x65, 0x2d, 0x31, 0x29]));
    const r = tokens(root, ["my src"]);
    expect(val(r, "tokens.space.consumers")).toBe(2); // var(--space-1) in both files
    expect(val(r, "tokens.space.unconsumed")).toBe(0);
  });
});

describe("tokens counters: token source resolution is the foundation's, not re-decided", () => {
  test("a css file inside the audited dirs is picked by the most-custom-properties rule and reported as such", () => {
    const root = makeRepo({
      "src/theme.css": ":root {\n  --a: 1;\n  --b: 2;\n  --c: 3;\n  --d: 4;\n  --e: 5;\n}\n",
      "src/app.tsx": "export const x = 1;\n",
    });
    try {
      const r = tokens(root);
      expect(val(r, "tokens.source.path")).toBe("src/theme.css");
      expect(val(r, "tokens.source.via")).toBe("most-custom-properties");
      expect(get(r, "tokens.source.path").detail.inAuditedDirs).toBe(true);
      expect(val(r, "tokens.custom_properties.distinct")).toBe(5);
      expect(r.scope.population.audited).toBe(1); // the token source is exempt
    } finally {
      removeRepo(root);
    }
  });
});

describe("tokens counters: each family counts, and publishes, its own reference regex", () => {
  const FAMILY_FILES = {
    "design/tokens.css": ":root {\n  --font-size-sm: 1px;\n  --font-size-lg: 2px;\n  --space-1: 1px;\n  --text-sm: 3px;\n}\n",
    "src/a.tsx": 'x = "var(--space-1) var(--font-size-sm) var( --font-size-sm ) var(--text-sm)";\n',
    "src/b.css": ".a { margin: var(--space-1); padding: var(--space-1) var(--space-1); }\n",
  };
  let root;
  let r;
  beforeAll(() => { root = makeRepo(FAMILY_FILES); r = tokens(root); });
  afterAll(() => removeRepo(root));

  test("values: font-size 2, space 4 (a.tsx 1 + b.css 3), text 1 (the three families are not summed into each other)", () => {
    expect(val(r, "tokens.font_size.consumers")).toBe(2);
    expect(val(r, "tokens.space.consumers")).toBe(4);
    expect(val(r, "tokens.text.consumers")).toBe(1);
  });

  test("the regex a counter states, run over the audited files, reproduces that counter's value", () => {
    const fs = require("fs");
    const texts = ["src/a.tsx", "src/b.css"].map((f) => fs.readFileSync(require("path").join(root, f), "utf8"));
    for (const family of ["font_size", "space", "text"]) {
      const c = get(r, `tokens.${family}.consumers`);
      const re = new RegExp(c.definition.regex, "g");
      const reproduced = texts.reduce((n, t) => n + (t.match(re) ?? []).length, 0);
      expect(reproduced).toBe(c.value);
    }
  });

  test("three different regexes, one per family; unconsumed states the same one as its consumers", () => {
    const stated = ["font_size", "space", "text"].map((family) => get(r, `tokens.${family}.consumers`).definition.regex);
    expect(new Set(stated).size).toBe(3);
    expect(stated).toEqual(["var\\(\\s*--font-size-[\\w-]*", "var\\(\\s*--space-[\\w-]*", "var\\(\\s*--text-[\\w-]*"]);
    for (const [i, family] of ["font_size", "space", "text"].entries()) {
      expect(get(r, `tokens.${family}.unconsumed`).definition.regex).toBe(stated[i]);
    }
  });

  test("unconsumed is per family too: --font-size-lg is the only unused font-size", () => {
    expect(get(r, "tokens.font_size.unconsumed").detail.names).toEqual(["--font-size-lg"]);
    expect(get(r, "tokens.space.unconsumed").detail.names).toEqual([]);
    expect(get(r, "tokens.text.unconsumed").detail.names).toEqual([]);
  });
});

describe("tokens counters: declarations are seen however they are indented", () => {
  test("unindented and tab-indented declarations count", () => {
    const root = makeRepo({ "design/tokens.css": ":root {\n--a: 1;\n\t--b: 2;\n  --c: 3;\n}\n" });
    try {
      const r = tokens(root);
      expect(val(r, "tokens.custom_properties.distinct")).toBe(3);
      expect(val(r, "tokens.declarations.root")).toBe(3);
      expect(val(r, "tokens.declarations.lines")).toBe(3);
    } finally {
      removeRepo(root);
    }
  });
});

describe("tokens counters: block classification is by selector text", () => {
  test(":root.dark and :root, .dark are dark (a selector that names .dark wins); html:root and :root are root", () => {
    const root = makeRepo({
      "design/tokens.css": [
        ":root.dark {", "  --a: 1;", "}",
        ":root, .dark {", "  --b: 2;", "}",
        "html:root {", "  --c: 3;", "}",
        ":root {", "  --d: 4;", "}",
        "",
      ].join("\n"),
    });
    try {
      const r = tokens(root);
      expect(val(r, "tokens.declarations.dark")).toBe(2);
      expect(val(r, "tokens.declarations.root")).toBe(2);
      expect(get(r, "tokens.declarations.dark").detail.blocks.map((b) => b.selector)).toEqual([":root.dark", ":root, .dark"]);
      expect(get(r, "tokens.declarations.root").detail.blocks.map((b) => b.selector)).toEqual(["html:root", ":root"]);
    } finally {
      removeRepo(root);
    }
  });

  test("rules without a declaration are not listed in detail.blocks; the counts are unaffected", () => {
    const root = makeRepo({ "design/tokens.css": ":root {\n}\n:root {\n  --a: 1;\n}\n.dark {\n}\n@theme {\n}\n" });
    try {
      const r = tokens(root);
      expect(get(r, "tokens.declarations.root").detail.blocks).toEqual([{ selector: ":root", startLine: 3, endLine: 5, declarations: 1 }]);
      expect(get(r, "tokens.declarations.dark").detail.blocks).toEqual([]);
      expect(val(r, "tokens.declarations.dark")).toBe(0);
      expect(val(r, "tokens.theme.blocks")).toBe(1); // an empty @theme is still a block
    } finally {
      removeRepo(root);
    }
  });

  test("a declaration straight inside a wrapper is 'outside every rule' (no block listed); @themes is not @theme", () => {
    const root = makeRepo({
      "design/tokens.css": ["@layer base {", "  --a: 1;", "}", "@themes {", "  --b: 2;", "}", "@theme {", "  --c: 3;", "}", ""].join("\n"),
    });
    try {
      const r = tokens(root);
      expect(val(r, "tokens.declarations.other")).toBe(2); // a (wrapper only) and b (@themes)
      expect(get(r, "tokens.declarations.other").detail.blocks).toEqual([{ selector: "@themes", startLine: 4, endLine: 6, declarations: 1 }]);
      expect(val(r, "tokens.declarations.theme")).toBe(1);
      expect(val(r, "tokens.theme.blocks")).toBe(1);
    } finally {
      removeRepo(root);
    }
  });
});

describe("tokens counters: strings are skipped when matching braces", () => {
  test("a } or { inside a string does not close or open a block; line numbers survive an escaped newline", () => {
    const root = makeRepo({
      "design/tokens.css": [
        ":root {",
        "  --a: 1;",
        '  --b: "}";',
        "  --c: '{';",
        '  --d: "x\\"}";',
        "  --e: 5;",
        "}",
        ".dark {",
        "  --a: 2;",
        "}",
        "",
      ].join("\n"),
    });
    try {
      const r = tokens(root);
      expect(val(r, "tokens.declarations.root")).toBe(5);
      expect(val(r, "tokens.declarations.dark")).toBe(1);
      expect(val(r, "tokens.declarations.other")).toBe(0);
      expect(get(r, "tokens.declarations.root").detail.blocks).toEqual([{ selector: ":root", startLine: 1, endLine: 7, declarations: 5 }]);
      expect(get(r, "tokens.declarations.dark").detail.blocks).toEqual([{ selector: ".dark", startLine: 8, endLine: 10, declarations: 1 }]);
    } finally {
      removeRepo(root);
    }
  });

  test("an escaped newline inside a string keeps the line count; an unterminated string ends at its line", () => {
    const root = makeRepo({
      "design/tokens.css": [
        ":root {",
        '  --content: "a\\',
        'b";',
        "  --z: 1;",
        "}",
        ".dark {",
        '  --q: "oops;',
        "  --r: 2;",
        "}",
        "",
      ].join("\n"),
    });
    try {
      const r = tokens(root);
      expect(get(r, "tokens.declarations.root").detail.blocks).toEqual([{ selector: ":root", startLine: 1, endLine: 5, declarations: 2 }]);
      // `--q: "oops;` is a bad string that ends at its line, so the `;` in it ends nothing: --q and the line after it are one (invalid)
      // declaration, as a browser reads it; the block still closes at line 9
      expect(get(r, "tokens.declarations.dark").detail.blocks).toEqual([{ selector: ".dark", startLine: 6, endLine: 9, declarations: 1 }]);
      expect(val(r, "tokens.declarations.other")).toBe(0);
    } finally {
      removeRepo(root);
    }
  });
});

describe("tokens counters: oklch is counted as a word and as a call", () => {
  test("occurrences ignore case and count comments; declarations count only calls (any case)", () => {
    const root = makeRepo({
      "design/tokens.css": [
        "/* oklch palette */",
        ":root {",
        "  --a: oklch(0.5 0.1 20);",
        "  --b: OKLCH(0.5 0.1 20);",
        '  --c: "oklch";',
        "  --d: oklch-fallback;",
        "}",
        "",
      ].join("\n"),
    });
    try {
      const r = tokens(root);
      expect(val(r, "tokens.oklch.occurrences")).toBe(5);
      expect(val(r, "tokens.oklch.declarations")).toBe(2);
    } finally {
      removeRepo(root);
    }
  });
});

describe("tokens counters: @theme mapping by property name, by value, or by both", () => {
  const THEME = [
    "@theme inline {",
    "  --text-lg: 1.125rem;", // font: name only
    "  --font-size-xl: 1.25rem;", // font: name only
    "  --my-size: var(--font-size-sm);", // font: value only
    "  --text-md: var(--font-size-md);", // font: name and value (one line, counted once)
    "  --spacing: 0.25rem;", // space: name only
    "  --spacing-lg: 2rem;", // space: name only
    "  --gap-md: var(--space-3);", // space: value only
    "  --spacing-sm: var(--space-1);", // space: name and value
    "  --spacingx: 1px;", // neither: not a --spacing property
    "  --color-x: red;", // neither
    "}",
    ":root {",
    "  --text-sm: 1px;", // not in @theme
    "  --spacing-z: var(--space-3);", // not in @theme
    "  --other: var(--font-size-sm);", // not in @theme
    "}",
    "",
  ].join("\n");
  let root;
  let r;
  beforeAll(() => { root = makeRepo({ "design/tokens.css": THEME }); r = tokens(root); });
  afterAll(() => removeRepo(root));

  test("font size: name-only, value-only and both are each counted once", () => {
    expect(val(r, "tokens.theme.maps_font_size")).toBe(4);
    expect(get(r, "tokens.theme.maps_font_size").detail.names).toEqual(["--font-size-xl", "--my-size", "--text-lg", "--text-md"]);
  });

  test("spacing: name-only, value-only and both are each counted once; --spacingx is not --spacing", () => {
    expect(val(r, "tokens.theme.maps_space")).toBe(4);
    expect(get(r, "tokens.theme.maps_space").detail.names).toEqual(["--gap-md", "--spacing", "--spacing-lg", "--spacing-sm"]);
  });
});

describe("tokens counters: a BOM at the start of the token source changes nothing", () => {
  test("a first-line declaration is still seen and the line count is the same", () => {
    const body = "--a: #fff;\n:root {\n  --b: oklch(0.5 0.1 20);\n}\n";
    const plain = makeRepo({ "design/tokens.css": body });
    const bom = makeRepo({ "design/tokens.css": "﻿" + body });
    try {
      const a = tokens(plain);
      const b = tokens(bom);
      expect(val(b, "tokens.custom_properties.distinct")).toBe(2);
      expect(val(b, "tokens.declarations.other")).toBe(1); // --a sits outside every rule
      expect(val(b, "tokens.source.lines")).toBe(4);
      expect(b.counters).toEqual(a.counters);
    } finally {
      removeRepo(plain);
      removeRepo(bom);
    }
  });
});

describe("tokens counters: a declaration is a declaration wherever it sits on its line", () => {
  // the shape of a real token file: one-liners next to blocks. The oracle's line-start regex saw none of these.
  const ONE_LINERS = [
    ":root { --primary: #A8511A; --bg: #ffffff; --one: 1; --two: 2; --three: 3; }",
    ".dark { --primary: #FF9E3D; --bg: #000000; }",
    '[data-mode="dark"] { --extra: #111; }',
    '[data-radius="sharp"] { --radius: 0rem; }',
    "@theme inline { --color-primary: var(--primary); }",
    "",
  ].join("\n");

  let r;
  let shared;
  beforeAll(() => {
    shared = makeRepo({ "design/tokens.css": ONE_LINERS, "src/a.tsx": 'export const c = "#a8511a";\n' });
    r = tokens(shared);
  });
  afterAll(() => removeRepo(shared));

  test("custom properties, declarations and lines are each counted as what they are", () => {
    expect(val(r, "tokens.custom_properties.distinct")).toBe(8);
    expect(r.scope.tokenSource.customProperties).toBe(8); // the resolver and the inventory are one answer
    expect(val(r, "tokens.declarations.total")).toBe(10);
    expect(val(r, "tokens.declarations.lines")).toBe(5);
    expect(val(r, "tokens.declarations.line_start")).toBe(0); // the oracle's regex: a line must START with --name:
  });

  test("the split by rule kind: root, the two spellings of the dark theme, @theme, and the component-local rule", () => {
    expect(val(r, "tokens.declarations.root")).toBe(1);
    expect(val(r, "tokens.declarations.dark")).toBe(2); // .dark and [data-mode="dark"]
    expect(val(r, "tokens.declarations.theme")).toBe(1);
    expect(val(r, "tokens.declarations.other")).toBe(1); // [data-radius="sharp"]
    expect(get(r, "tokens.declarations.root").detail.declarations).toBe(5);
    expect(get(r, "tokens.declarations.dark").detail.declarations).toBe(3);
    const sum = ["root", "dark", "theme", "other"].reduce((n, k) => n + val(r, `tokens.declarations.${k}`), 0);
    expect(sum).toBe(val(r, "tokens.declarations.lines"));
  });

  test("the declared hex set is not empty, so the colour counters can tell a token value from another colour", () => {
    expect(val(r, "tokens.hex.declared_distinct")).toBe(5); // a8511a ffffff ff9e3d 000000 111111
    const root = makeRepo({ "design/tokens.css": ONE_LINERS, "src/a.tsx": 'export const t = "#a8511a"; export const u = "#123456";\n' });
    try {
      const both = run(root, { dirs: ["src"], groups: ["colour"] });
      expect(val(both, "colour.hex6.equals_token")).toBe(1);
      expect(val(both, "colour.hex6.not_token")).toBe(1);
    } finally {
      removeRepo(root);
    }
  });

  test("tokens and decisions agree on what the dark theme is", () => {
    const root = makeRepo({
      "design/tokens.css": ONE_LINERS,
      "design/DESIGN.md": '---\ncolors:\n  primary: "#FF9E3D"\n  bg: "#000000"\n  extra: "#111"\n---\n# D\n',
      "src/a.tsx": "export {};\n",
    });
    try {
      const both = run(root, { dirs: ["src"], groups: ["tokens", "decisions"] });
      expect(val(both, "decisions.design_md.colors_equal_dark")).toBe(3); // primary and bg from .dark, extra from [data-mode="dark"]
      expect(val(both, "tokens.declarations.dark")).toBe(2);
      expect(get(both, "tokens.declarations.dark").detail.blocks.map((b) => b.selector)).toEqual([".dark", '[data-mode="dark"]']);
    } finally {
      removeRepo(root);
    }
  });

  test("a descendant of the dark selector is component-local, not the dark theme; prefers-color-scheme: dark on :root is dark", () => {
    const root = makeRepo({
      "design/tokens.css": [
        ".dark .card { --card-bg: #111; }",
        "@media (prefers-color-scheme: dark) { :root { --media: #222; } }",
        "@media (min-width: 1px) { :root { --wide: 1; } }",
        ":root.dark { --both: #333; }",
        "",
      ].join("\n"),
    });
    try {
      const res = tokens(root);
      expect(val(res, "tokens.declarations.dark")).toBe(2); // the media query and :root.dark
      expect(val(res, "tokens.declarations.root")).toBe(1); // :root inside a min-width query: wrappers are transparent
      expect(val(res, "tokens.declarations.other")).toBe(1); // .dark .card
    } finally {
      removeRepo(root);
    }
  });

  test("the font-size family: which names exist and which are unconsumed is this group's fact, and it agrees with typography", () => {
    const root = makeRepo({
      "design/tokens.css": ":root { --font-size-a: 12px; --font-size-b: 13px; /* --font-size-ghost: 99px; */ --c: 1; --d: 2; --e: 3; }\n",
      "src/x.tsx": 'x = "var(--font-size-a) text-[13px]";\n',
    });
    try {
      const both = run(root, { dirs: ["src"], groups: ["tokens", "typography"] });
      expect(get(both, "tokens.font_size.declarations").detail.names).toEqual(["--font-size-a", "--font-size-b"]);
      expect(get(both, "tokens.font_size.unconsumed").detail.names).toEqual(["--font-size-b"]);
      const row = get(both, "typography.token_family.zero_consumer_families").detail.families.find((f) => f.family === "--font-size-*");
      expect(row).toMatchObject({ declared: 2, consumers: 1, unconsumed: 1 });
      expect(get(both, "typography.arbitrary_size.equals_token").value).toBe(1); // 13px is --font-size-b
    } finally {
      removeRepo(root);
    }
  });
});
