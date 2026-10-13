/**
 * scan-project.test.js — what `scanProject` counts, over which files, and how it
 * scores them. Every repo is tiny and every number is worked out by hand in the
 * comments next to it; nothing is pinned to the live repo.
 *
 * Counting rules under test (commands/drift.js):
 *   critical = hex literals (3/4/6/8 digits, never an HTML entity or url(#id))
 *              + rgb( rgba( hsl( hsla( oklch( calls)
 *   warnings = \b\d+px\b
 *   score    = round-half-up of 100 × (1 − (files with a colour hit + ½ files
 *              with only px hits) ÷ files scanned)
 */

"use strict";

const fs = require("fs");
const path = require("path");

const { scanProject, cleanFileScore, countHits, PATTERNS, SCORE_FORMULA } = require("../../../src/commands/drift");
const { makeRepo, removeRepo } = require("./helpers");

let repos = [];
const repo = (files) => {
  const root = makeRepo(files);
  repos.push(root);
  return root;
};
afterEach(() => {
  repos.forEach(removeRepo);
  repos = [];
});

const props = (n, prefix = "--p") =>
  ":root {\n" + Array.from({ length: n }, (_, i) => `  ${prefix}${i}: ${i};`).join("\n") + "\n}\n";

describe("scanProject — which files are audited", () => {
  test("tests, .d.ts and generated files are not audited, and their hits are not counted", () => {
    const root = repo({
      "src/a.tsx": "const a = '#ff0000';\n", //                     colour 1
      "src/ok.ts": "export const ok = 1;\n",
      "src/a.test.tsx": "const t = '#ff0000'; const u = '1px';\n",
      "src/a.spec.ts": "const s = '#ff0000';\n",
      "src/__tests__/helper.ts": "const h = '#ff0000';\n",
      "src/types.d.ts": "declare const x: '#ff0000';\n",
      "src/api.generated.ts": "export const g = '#ff0000';\n",
      "src/generated/client.ts": "export const c = '#ff0000';\n",
    });
    const r = scanProject(root, ["src"]);
    expect(r).toMatchObject({ critical: 1, warnings: 0, componentsAudited: 2, filesWithDrift: 1, score: 50 });
    // census = a.tsx ok.ts a.test.tsx a.spec.ts __tests__/helper.ts types.d.ts; generated files never enter it
    expect(r.population).toEqual({ census: 6, tests: 3, declarations: 1, audited: 2, scanned: 2, tokenSourceInCensus: false });
    expect(r.perFile).toEqual([{ file: "src/a.tsx", c: 1, w: 0 }]);
  });

  test("the token source is exempt wherever it lives, and nothing else is", () => {
    const tokenHits = ":root {\n  --a: #111111;\n  --b: #222222;\n  --c: rgb(1, 2, 3);\n  --d: 4px;\n  --e: 5px;\n  --f: 6;\n}\n";
    const other = "const x = '#333333';\n"; // the one hit that must remain
    const cases = [
      ["design/tokens.css (step 1)", { "design/tokens.css": tokenHits }, ["src", "design"]],
      ["a configured file", { "systemix.config.yaml": "design:\n  source: src/styles/theme.css\n", "src/styles/theme.css": tokenHits }, ["src"]],
      ["a file a doc names canonical", { "design/DESIGN.md": "Canonical: src/theme/vars.css\n", "src/theme/vars.css": tokenHits }, ["src"]],
      ["the css file with the most custom properties", { "src/app/globals.css": tokenHits }, ["src"]],
      ["a css file at the project root", { "tokens.css": tokenHits }, ["."]],
    ];
    for (const [name, files, dirs] of cases) {
      const r = scanProject(repo({ ...files, "src/a.ts": other }), dirs);
      expect({ name, critical: r.critical, warnings: r.warnings, audited: r.componentsAudited, tokenSource: r.tokenSource !== null }).toEqual({
        name,
        critical: 1,
        warnings: 0,
        audited: 1,
        tokenSource: true,
      });
    }
  });

  test("with no resolvable token source a css file is audited like any other", () => {
    // 3 declarations + 1 on a line with its selector = 4 custom properties, one short of a token source
    const root = repo({ "src/theme.css": props(3) + ":root { --x: #123456; }\n", "src/a.ts": "export const a = 1;\n" });
    const r = scanProject(root, ["src"]);
    expect(r.tokenSource).toBeNull();
    expect(r.tokenSourceVia).toBe("none");
    expect(r).toMatchObject({ critical: 1, componentsAudited: 2 });
  });

  test("reports where the token source came from", () => {
    const root = repo({ "design/tokens.css": props(1), "src/a.ts": "export const a = 1;\n" });
    expect(scanProject(root, ["src"])).toMatchObject({ tokenSource: "design/tokens.css", tokenSourceVia: "design/tokens.css" });
  });

  test("vendored and build folders are not walked", () => {
    const files = { "src/a.ts": "export const a = 1;\n" };
    for (const d of ["node_modules/pkg", "dist", "build", "coverage", ".next", "vendor", ".git"]) files[`src/${d}/x.ts`] = "const x = '#ff0000';\n";
    const r = scanProject(repo(files), ["src"]);
    expect(r).toMatchObject({ critical: 0, componentsAudited: 1, score: 100 });
  });
});

describe("scanProject — which folders", () => {
  const files = {
    "src/a.ts": "const a = '#ff0000';\n",
    "packages/p/b.ts": "const b = '#00ff00'; const w = '4px';\n",
    "elsewhere/c.ts": "const c = '#0000ff';\n",
  };

  test("a named folder is the only folder scanned; the default list also takes packages/", () => {
    const root = repo(files);
    const only = scanProject(root, ["src"]);
    expect(only).toMatchObject({ dirs: ["src"], critical: 1, warnings: 0, componentsAudited: 1 });
    const all = scanProject(root); // default list: src app components lib packages
    expect(all).toMatchObject({ dirs: ["src", "packages"], critical: 2, warnings: 1, componentsAudited: 2 });
    expect(all.missingDirs).toEqual(["app", "components", "lib"]);
    expect(scanProject(root, []).dirs).toEqual(["src", "packages"]); // an empty list is the default list
  });

  test("a folder that is not there is listed under missingDirs, and the rest is still scanned", () => {
    const r = scanProject(repo(files), ["src", "nope"]);
    expect(r).toMatchObject({ dirs: ["src"], missingDirs: ["nope"], critical: 1 });
  });

  test("a folder outside the project is listed under rejectedDirs and never read", () => {
    const outside = repo({ "leak.ts": "const leak = '#123456';\n" });
    const r = scanProject(repo(files), ["src", "../" + path.basename(outside), outside]);
    expect(r.rejectedDirs).toEqual(["../" + path.basename(outside), outside]);
    expect(r).toMatchObject({ dirs: ["src"], critical: 1, componentsAudited: 1 });
  });

  test("odd inputs for the folder list: a string, blanks and non-strings", () => {
    const root = repo(files);
    expect(scanProject(root, "src").dirs).toEqual(["src"]);
    expect(scanProject(root, ["src", "", "   ", null, 7, undefined]).dirs).toEqual(["src"]);
  });

  test("nothing audited: a null score, zero everywhere, and the reason is in `population`", () => {
    const root = repo({ "src/only.test.ts": "const t = '#ff0000';\n", "README.md": "# hi\n" });
    const r = scanProject(root, ["src"]);
    expect(r).toMatchObject({ score: null, critical: 0, warnings: 0, componentsAudited: 0, filesWithDrift: 0, topOffenders: [], perFile: [] });
    expect(r.population).toMatchObject({ census: 1, tests: 1, audited: 0, scanned: 0 });
    expect(scanProject(root, ["nope"])).toMatchObject({ score: null, componentsAudited: 0, missingDirs: ["nope"], dirs: [] });
    expect(scanProject(repo({}), ["src"]).score).toBeNull();
    expect(scanProject(path.join(repo({}), "gone"), ["src"]).score).toBeNull();
  });

  test("a relative project root works", () => {
    const root = repo({ "src/a.ts": "const a = '#ff0000';\n" });
    const r = scanProject(path.relative(process.cwd(), root), ["src"]);
    expect(r).toMatchObject({ critical: 1, componentsAudited: 1, perFile: [{ file: "src/a.ts", c: 1, w: 0 }] });
  });
});

describe("scanProject — what counts as a hit", () => {
  const hits = (text) => {
    const r = scanProject(repo({ "src/f.ts": text }), ["src"]);
    return [r.critical, r.warnings];
  };

  test("hex: 3, 4, 6 and 8 digits count; 5, 7, 9 digits, entities and url(#id) do not", () => {
    const text = [
      "const a = '#abc';", //            3 digits      1
      "const b = '#abcd';", //           4             1
      "const c = '#aabbcc';", //         6             1
      "const d = '#aabbccdd';", //       8             1
      "const e = '#abcde';", //          5: not a colour
      "const f = '#abcdef0';", //        7: not a colour
      "const g = '#abcdefab9';", //      9: not a colour
      "const h = '#ggg';", //            not hex
      "const i = 'a#fff';", //           glued to a word
      "const j = '#fff-x';", //          an id selector, not a colour
      "const k = '&#123; &#125; &#8212; &#x1F600;';", //  HTML entities
      "const l = '<rect fill=\"url(#abc)\" />';", //      svg id reference
      "const m = '#ABCDEF';", //         upper case    1
      "const n = 'x: #0f0;';", //        1
      "const o = 'linear-gradient(#fff,#000)';", // two literals back to back    2
    ].join("\n");
    expect(hits(text)).toEqual([8, 0]);
  });

  test("the hex rule is not the old `#[0-9a-fA-F]{3,8}\\b`, which also counted entities and 5/7-digit runs", () => {
    const old = /#[0-9a-fA-F]{3,8}\b/g;
    const text = "'&#123;' '&#125;' '#abcde' '#abcdef0' 'url(#abc)' '#ff0000'";
    expect(text.match(old)).toHaveLength(6);
    expect(hits(text)).toEqual([1, 0]);
  });

  test("colour functions: rgb rgba hsl hsla oklch count; look-alikes do not", () => {
    const text = [
      "a: rgb(1,2,3);", //                          1
      "b: rgba(1,2,3,.5);", //                      1
      "c: hsl(0 0% 0%);", //                        1
      "d: hsla(0,0%,0%,.5);", //                    1
      "e: oklch(0.2 0.01 70);", //                  1
      "f: myrgb(1);", //                            glued to a word
      "g: color-mix(in oklch, red, blue);", //      no call
      "h: RGB(1,2,3);", //                          upper case is not a CSS-in-code habit here
      "i: rgb (1,2,3);", //                         space before the paren
      "j: hsl(var(--h));", //                       1 — a regex hit, not a verdict: it is still a call
    ].join("\n");
    expect(hits(text)).toEqual([6, 0]);
  });

  test("px: whole numbers followed by px; units glued to other words do not count", () => {
    const text = [
      "a: 16px;", //            1
      "b: 1.5px;", //           1 (the 5px part)
      "c: 0px;", //             1
      "d: -2px;", //            1
      "e: 100PX;", //           upper case
      "f: 16 px;", //           a space
      "g: a16px;", //           glued to a word
      "h: 16pxx;", //           glued to a word
      "i: px;", //
      "j: 4px 8px;", //        2
      "k: 12px;", //           1
    ].join("\n");
    expect(hits(text)).toEqual([0, 7]);
  });

  test("countHits and PATTERNS agree with the scanner", () => {
    const text = "const a = '#fff'; const b = 'rgb(1,2,3)'; const p = '8px'; const q = '&#123;';";
    expect(countHits(text)).toEqual({ c: 2, w: 1 });
    const viaPatterns = [...text.matchAll(PATTERNS.HEX_RE)].length + [...text.matchAll(PATTERNS.COLOR_FN_RE)].length;
    expect(viaPatterns).toBe(2);
    expect([...text.matchAll(PATTERNS.PX_RE)]).toHaveLength(1);
    for (const re of Object.values(PATTERNS)) expect(re.global).toBe(true);
  });
});

describe("scanProject — the files themselves", () => {
  test("CRLF line endings change nothing", () => {
    const lf = scanProject(repo({ "src/a.ts": "const a = '#ff0000';\nconst b = '4px';\n" }), ["src"]);
    const crlf = scanProject(repo({ "src/a.ts": "const a = '#ff0000';\r\nconst b = '4px';\r\n" }), ["src"]);
    expect(crlf).toEqual(lf);
    expect(crlf).toMatchObject({ critical: 1, warnings: 1 });
  });

  test("an empty file is audited and clean; a BOM is harmless", () => {
    const root = repo({ "src/empty.ts": "", "src/bom.ts": "﻿const a = '#ff0000';\n" });
    const r = scanProject(root, ["src"]);
    expect(r).toMatchObject({ componentsAudited: 2, critical: 1, filesWithDrift: 1, score: 50 });
  });

  test("bytes that are not UTF-8 do not crash the scan", () => {
    const root = repo({ "src/ok.ts": "export const ok = 1;\n" });
    fs.writeFileSync(path.join(root, "src", "binary.ts"), Buffer.concat([Buffer.from([0xff, 0xfe, 0x00, 0x80]), Buffer.from("'#ff0000' 3px")]));
    const r = scanProject(root, ["src"]);
    expect(r).toMatchObject({ componentsAudited: 2, critical: 1, warnings: 1 });
  });

  test("one huge minified line is scanned in linear time", () => {
    const line = "a{color:#fff;margin:2px}".repeat(100000); // 2.4 MB on one line, 100000 + 100000 hits
    const root = repo({ "src/min.js": line });
    const started = Date.now();
    const r = scanProject(root, ["src"]);
    expect(r).toMatchObject({ critical: 100000, warnings: 100000, componentsAudited: 1 });
    expect(Date.now() - started).toBeLessThan(5000);
  });

  test("a file just over 5 MB is still scanned: the scanner has no 5 MB cap (that is the counters' read cap)", () => {
    const root = repo({ "src/a.ts": "const a = '#ff0000';\n" });
    fs.writeFileSync(path.join(root, "src", "big.ts"), "#fff ".repeat(Math.ceil((5 * 1024 * 1024 + 1) / 5)));
    const r = scanProject(root, ["src"]);
    expect(r.skipped).toEqual([]);
    expect(r.componentsAudited).toBe(2);
    expect(r.critical).toBe(1 + Math.ceil((5 * 1024 * 1024 + 1) / 5));
  });

  test("a file over the size limit is skipped and reported, not counted as clean", () => {
    const root = repo({ "src/a.ts": "const a = '#ff0000';\n", "src/ok.ts": "export const ok = 1;\n" });
    fs.writeFileSync(path.join(root, "src", "big.ts"), "#fff ".repeat(100)); // 500 bytes
    const r = scanProject(root, ["src"], { maxBytes: 499 });
    expect(r.skipped).toEqual([{ file: "src/big.ts", reason: "over 499 bytes" }]);
    expect(r).toMatchObject({ critical: 1, componentsAudited: 2, score: 50 });
    // the skipped file is neither clean nor dirty: it leaves the denominator
    expect(r.population).toMatchObject({ audited: 3, scanned: 2 });
    // at exactly the limit it is scanned
    expect(scanProject(root, ["src"], { maxBytes: 500 })).toMatchObject({ skipped: [], componentsAudited: 3, critical: 101 });
    // the default limit is 64 MB
    expect(scanProject(root, ["src"]).skipped).toEqual([]);
  });

  test("a file that cannot be read is skipped and reported, not counted as clean", () => {
    const root = repo({
      "src/a.ts": "const a = '#ff0000';\n",
      "src/ok.ts": "export const ok = 1;\n",
      "src/locked.ts": "const l = '#ff0000';\n",
    });
    // a stub, not chmod: permission bits do not stop root, and this must hold for every user
    const real = fs.openSync; // files are opened (not slurped) so a device or a FIFO can be refused first
    const spy = jest.spyOn(fs, "openSync").mockImplementation((file, ...rest) => {
      if (String(file).endsWith(path.join("src", "locked.ts"))) throw Object.assign(new Error("EACCES: permission denied"), { code: "EACCES" });
      return real.call(fs, file, ...rest);
    });
    try {
      const r = scanProject(root, ["src"]);
      expect(r.skipped).toEqual([{ file: "src/locked.ts", reason: "unreadable" }]);
      expect(r).toMatchObject({ critical: 1, componentsAudited: 2, score: 50 });
      expect(r.population).toMatchObject({ audited: 3, scanned: 2 });
    } finally {
      spy.mockRestore();
    }
  });
});

describe("scanProject — ordering and determinism", () => {
  const seven = {
    "src/f.tsx": "'#111111'", //                         total 1
    "src/e.tsx": "'#111111'", //                         1
    "src/d.tsx": "'#111111'", //                         1
    "src/c.tsx": "'#111111' '#222222'", //               2
    "src/b.tsx": "'#111111' '4px'", //                   2
    "src/a.tsx": "'#111111' '#222222' '#333333'", //     3
    "src/g.tsx": "'#111111'", //                         1
  };

  test("offenders by total hits (colour + px) descending, ties by path; the top five are named", () => {
    const r = scanProject(repo(seven), ["src"]);
    expect(r.perFile.map((f) => f.file)).toEqual(["src/a.tsx", "src/b.tsx", "src/c.tsx", "src/d.tsx", "src/e.tsx", "src/f.tsx", "src/g.tsx"]);
    expect(r.topOffenders).toEqual(["src/a.tsx", "src/b.tsx", "src/c.tsx", "src/d.tsx", "src/e.tsx"]);
    expect(r.perFile[1]).toEqual({ file: "src/b.tsx", c: 1, w: 1 });
    expect(r.filesWithDrift).toBe(7);
  });

  test("same tree, same result — whatever order the files were created in, and no project path in it", () => {
    const forward = repo(seven);
    const backward = repo(Object.fromEntries(Object.entries(seven).reverse()));
    const a = scanProject(forward, ["src"]);
    const b = scanProject(backward, ["src"]);
    expect(b).toEqual(a);
    expect(scanProject(forward, ["src"])).toEqual(a);
    expect(JSON.stringify(a)).not.toContain(forward);
  });

  test("scanning writes nothing", () => {
    const root = repo({ "src/a.ts": "const a = '#ff0000';\n", "design/tokens.css": props(2) });
    const listing = () =>
      (function walk(dir) {
        return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
          const full = path.join(dir, e.name);
          return e.isDirectory() ? [path.relative(root, full) + "/", ...walk(full)] : [`${path.relative(root, full)}:${fs.statSync(full).mtimeMs}:${fs.statSync(full).size}`];
        });
      })(root).sort();
    const before = listing();
    scanProject(root, ["src"]);
    scanProject(root);
    expect(listing()).toEqual(before);
  });
});

describe("the score", () => {
  test("is the clean-file share: colour-hit files count 1, px-only files count ½", () => {
    const root = repo({
      "src/c1.ts": "'#111111'", //      colour
      "src/c2.ts": "'rgb(1,2,3)' '4px'", // colour (and px — a colour file counts once, as colour)
      "src/p.ts": "'4px' '8px'", //     px only
      "src/ok1.ts": "export const a = 1;",
      "src/ok2.ts": "export const b = 1;",
    });
    const r = scanProject(root, ["src"]);
    // 2 colour files + ½ of 1 px-only file out of 5: 100 × (1 − 2.5/5) = 50
    expect(r).toMatchObject({ score: 50, critical: 2, warnings: 3, componentsAudited: 5, filesWithDrift: 3, scoreFormula: SCORE_FORMULA });
    expect(SCORE_FORMULA).toBe("clean-files/1");
  });

  test("cannot saturate: a repo with hundreds of hits in few files still scores above zero", () => {
    const files = { "src/dirty.ts": "'#111111' ".repeat(500) };
    for (let i = 0; i < 9; i++) files[`src/clean${i}.ts`] = "export const x = 1;\n";
    const r = scanProject(repo(files), ["src"]);
    // the old penalty formula: 100 − 2 × 500 → floored at 0. 1 dirty file of 10 is 90.
    expect(r.critical).toBe(500);
    expect(r.score).toBe(90);
  });

  test.each([
    [0, 0, 0, null],
    [1, 0, 0, 100],
    [1, 1, 0, 0],
    [1, 0, 1, 50],
    [2, 1, 1, 25],
    [3, 1, 1, 50],
    [3, 0, 2, 67], // 66.67
    [7, 1, 0, 86], // 85.71
    [8, 0, 1, 94], // 93.75
    [4, 1, 1, 63], // 62.5 is a tie: rounds up
    [200, 23, 0, 89], // 88.5: a tie
    [1000, 5, 0, 100], // 99.5: a tie
    [20, 8, 1, 58], // 57.5: a tie that float arithmetic gets wrong (naive 100 × (1 − 8.5/20) = 57.49999999999999)
    [20, 5, 7, 58], // 57.5 again
  ])("cleanFileScore(%i audited, %i colour files, %i px-only files) = %p", (audited, colour, px, expected) => {
    expect(cleanFileScore(audited, colour, px)).toBe(expected);
  });

  test("agrees with an independent derivation for every small case, and stays in 0..100", () => {
    // half-up(v) is the largest k in 0..100 with k − ½ ≤ v, i.e. (2k − 1) × A ≤ 100 × (2A − 2C − P) when v = 100 × (2A − 2C − P) ÷ 2A
    for (let A = 1; A <= 60; A++) {
      for (let C = 0; C <= A; C++) {
        for (let P = 0; P <= A - C; P++) {
          let k = 0;
          while (k < 100 && (2 * (k + 1) - 1) * A <= 100 * (2 * A - 2 * C - P)) k++;
          expect([A, C, P, cleanFileScore(A, C, P)]).toEqual([A, C, P, k]);
        }
      }
    }
  });

  test("a score is monotonic: another dirty file never raises it", () => {
    for (let A = 1; A <= 40; A++) {
      let previous = 101;
      for (let C = 0; C <= A; C++) {
        const s = cleanFileScore(A, C, 0);
        expect(s).toBeLessThanOrEqual(previous);
        previous = s;
      }
    }
  });
});
