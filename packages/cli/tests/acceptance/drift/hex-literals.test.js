/**
 * hex-literals.test.js — what the scanner counts as a hex colour, and what it must not.
 *
 * `critical` is a regex-hit tally, and one false hit costs a whole file in the score
 * (a file is colour-dirty from its first hit). The definition in drift.js's header lists
 * what is not a colour although it looks like one: HTML entities, a '#' glued to a word,
 * svg/css id references in every quoting, fragment links, and issue numbers after an issue
 * word. It also lists what is still counted although it is not a colour. Each line of that
 * definition is a row here, so the header cannot drift away from the regex.
 */

"use strict";

const { countHits, scanProject, PATTERNS } = require("../../../src/commands/drift");
const { makeRepo, removeRepo } = require("./helpers");

const colour = (text) => countHits(text).c;

describe("not a colour: the scanner does not count it", () => {
  test.each([
    // HTML entities
    ["&#123;", "decimal entity"],
    ["&#123456;", "6-digit decimal entity"],
    ["&#x1F600;", "hex entity"],
    ["&#125;", "closing-brace entity"],
    // glued to a word
    ["a#abc", "glued to a word"],
    ["https://example.com/page#fade", "url fragment after a word"],
    ["#abc-def", "followed by a hyphen"],
    ["#abcdefg", "followed by a letter past the digits"],
    // svg / css id references, every quoting the language allows
    ["url(#abc)", "url(#id)"],
    ['url("#a1b")', 'url("#id")'],
    ["url('#fade')", "url('#id')"],
    ["url( #fade)", "url( #id) with a space"],
    ["url(   #fade  )", "url(   #id) with several spaces"],
    ['url( "#a1b" )', 'url( "#id" )'],
    ['style="fill: url(\\"#a1b\\")"', 'url(\\"#id\\") inside an escaped string'],
    ["clip-path: URL(#c1c)", "URL( in capitals"],
    ["bg-[url(#a1b)]", "url(#id) inside a Tailwind arbitrary value"],
    // fragment links
    ['<a href="#bad">', 'href="#id"'],
    ["<a href='#bad'>", "href='#id'"],
    ["<a href=#bad>", "href=#id unquoted"],
    ['<use xlink:href="#icon1" />', "xlink:href"],
    ["<use href={'#abc'} />", "href={'#id'}"],
    ['<a href={"#abc"}>', 'href={"#id"}'],
    ["<a href = '#abc'>", "href = '#id' with spaces"],
    ["{ href: '#bad' }", "href: '#id' in an object"],
    ['{ "href": "#bad" }', '"href": "#id" in JSON'],
    ["const a = { href: `#bad` };", "href: `#id` in a template"],
    // issue numbers after an issue word
    ["// fixes #1234", "fixes #1234"],
    ["// see #123", "see #123"],
    ["// Fixes: #1234", "Fixes: #1234 with a colon"],
    ["// FIXED #123", "FIXED in capitals"],
    ["// closes #123", "closes"],
    ["// close #123", "close"],
    ["// resolves #123", "resolves"],
    ["// resolved #1234", "resolved"],
    ["// ref #123", "ref"],
    ["// refs #123", "refs"],
    ["// PR #123", "PR"],
    ["// pull #123", "pull"],
    ["// issue #123", "issue"],
    ["// issues #123", "issues"],
    ["// bug #123", "bug"],
    ["// ticket #1234", "ticket"],
    ["// TODO(#123): later", "TODO(#123)"],
    ["// FIXME(#1234)", "FIXME(#1234)"],
    ["// fixes   #123", "fixes with several spaces"],
    ["// see (#1234)", "see (#1234): the parenthesis is a separator"],
  ])("%s  (%s)", (text) => {
    expect(colour(text)).toBe(0);
  });
});

describe("still a colour: counted", () => {
  test.each([
    ["color: #fff", 1, "3 digits"],
    ["color: #FFFF", 1, "4 digits, capitals"],
    ["color: #a8511a", 1, "6 digits"],
    ["color: #A8511AFF", 1, "8 digits"],
    ["color: #AbCdEf", 1, "mixed case"],
    ["x = '#ff0000'", 1, "in a string"],
    ["border: 1px solid #333", 1, "3-digit decimal hex after a CSS keyword"],
    ["#123", 1, "a bare 3-digit decimal hex is a colour"],
    ["#1234", 1, "a bare 4-digit decimal hex is a colour"],
    ["#fff #000", 2, "two on a line"],
    // an issue word does not hide anything that is not a 3-4 digit decimal
    ["// see #fff", 1, "see + letters: a colour"],
    ["// fixes #abcd", 1, "fixes + 4 hex letters: a colour"],
    ["// see #123456", 1, "see + 6 digits is not the issue-number shape"],
    ["// see #12345678", 1, "see + 8 digits is not the issue-number shape"],
    // the issue word has to be a word
    ["prefix #123", 1, "'fix' inside 'prefix' is not an issue word"],
    ["suffix #1234", 1, "'fix' inside 'suffix'"],
    ["const pry = 1; #123", 1, "'pr' inside another word"],
    ["// seen #123", 1, "'seen' is not 'see'"],
    // a '#' that follows something else than the listed references
    ['to="#abc"', 1, "to=\"#id\" is a known false positive"],
    ["document.querySelector('#add')", 1, "'#add' selector is a known false positive"],
    ["(#1234)", 1, "(#1234) with no word: a known false positive"],
    ["fixes #12, #123", 1, "the second number of a list is a known false positive"],
    ["href='/#feed'", 1, "href to a path + fragment: a known false positive"],
    // Tailwind arbitrary values: an underscore stands for a space, so it is a separator here, not part of a word
    ["bg-[linear-gradient(to_right,#fff_0%,#000_100%)]", 2, "gradient stops glued with underscores"],
    ["shadow-[0_0_0_1px_#ff0000]", 1, "a colour after an underscore, closed by ]"],
    ["border-[1px_solid_#ddd]", 1, "a colour after an underscore"],
    ["shadow-[0_0_#fff_inset]", 1, "a colour between two underscores"],
    ["bg-[#fff]", 1, "a colour straight after ["],
    ["shadow-[inset_0_1px_#ffffff1f]", 1, "an 8-digit colour after an underscore"],
    ["_#ffffff1f_inset", 1, "an 8-digit colour with underscores on both sides"],
    ["#fff_0%", 1, "a colour followed by an underscore"],
    ["foo_#abc", 1, "an underscore is not a word character here: a known false positive for an id like foo_#abc"],
  ])("%s -> %i  (%s)", (text, hits) => {
    expect(colour(text)).toBe(hits);
  });

  test("an issue number is dropped only as itself: the colour next to it still counts", () => {
    expect(colour("// fixes #1234 — and the border is #333")).toBe(1);
    expect(colour('<a href="#top" style={{ color: "#ff0000" }}>')).toBe(1);
    expect(colour('fill="url(#a)" stroke="#00ff00"')).toBe(1);
  });
});

describe("the verifier's repro fixture", () => {
  // &#123; &#x1F600; url(#abc) plus the five false positives that used to count: c was 4
  const FIXTURE = [
    "const a = '&#123; &#x1F600; url(#abc)';",
    "// fixes #1234",
    "// see #123",
    'const b = \'url("#a1b")\';',
    "const c = \"url('#fade')\";",
    "const d = 'url( #fade)';",
    'const e = \'<a href="#bad">\';',
    "",
  ].join("\n");

  test("no colour hits at all", () => {
    expect(countHits(FIXTURE)).toEqual({ c: 0, w: 0 });
  });

  test("a file with only such text is clean, and a real colour next to it makes it dirty", () => {
    const root = makeRepo({
      "src/Refs.tsx": FIXTURE,
      "src/Real.tsx": `${FIXTURE}const real = "#ff0000";\n`,
      "src/Ok.tsx": "export const ok = 1;\n",
    });
    try {
      const r = scanProject(root, ["src"]);
      // 3 audited files; only Real.tsx has a colour literal: 100 × (1 − 1/3) = 66.67 → 67
      expect(r.componentsAudited).toBe(3);
      expect(r.critical).toBe(1);
      expect(r.filesWithDrift).toBe(1);
      expect(r.perFile).toEqual([{ file: "src/Real.tsx", c: 1, w: 0 }]);
      expect(r.score).toBe(67);
    } finally {
      removeRepo(root);
    }
  });

  test("a single issue-number comment no longer costs a file in the score", () => {
    const root = makeRepo({ "src/A.ts": "// fixes #1234\nexport const a = 1;\n", "src/B.ts": "export const b = 2;\n" });
    try {
      const r = scanProject(root, ["src"]);
      expect(r).toMatchObject({ critical: 0, filesWithDrift: 0, score: 100 });
    } finally {
      removeRepo(root);
    }
  });
});

describe("the regex stays linear", () => {
  // Each input is built to make a nested or overlapping quantifier in a lookbehind backtrack
  // quadratically (a long run of the characters a lookbehind skips, followed by a candidate).
  // A linear regex does each in milliseconds; the bound is far above that so a loaded CI
  // machine cannot trip it, and far below what quadratic backtracking would take.
  const BOUND_MS = 2000;
  const time = (text) => {
    const t0 = Date.now();
    const n = [...text.matchAll(PATTERNS.HEX_RE)].length;
    return { n, ms: Date.now() - t0 };
  };

  test.each([
    ["a long run of spaces before each candidate", (" ".repeat(20000) + "#abc\n").repeat(50), 50],
    ["href, a long run of spaces and braces, then a candidate", ("href" + " ".repeat(20000) + "{ ".repeat(5000) + "#abc\n").repeat(20), 20],
    ["an issue word and a long run of separators, then an issue number", ("fix" + " :(".repeat(10000) + "#123\n").repeat(20), 0],
    ["url( and a long run of spaces, then a candidate", ("url(" + " ".repeat(20000) + "#abc\n").repeat(20), 0],
    ["a minified line of glued candidates", "x#abcdef".repeat(100000), 0],
    ["two million '#'", "#".repeat(2000000), 0],
    ["600k real candidates", ("#abc ".repeat(20) + "\n").repeat(30000), 600000],
    ["a minified line of underscore-glued candidates", "_#abc".repeat(100000), 100000],
    ["a long run of underscores before each candidate", ("_".repeat(20000) + "#abc\n").repeat(20), 20],
  ])("%s", (_, text, expected) => {
    const { n, ms } = time(text);
    expect(n).toBe(expected);
    expect(ms).toBeLessThan(BOUND_MS);
  });
});
