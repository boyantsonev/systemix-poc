/**
 * guardrails.test.js — acceptance tests for the `guardrails` counters: the
 * structure of design/guardrails.mdx and the WCAG contrast ratios recomputed
 * from the hex colours it names. Every expectation is hand-computed from a tiny
 * temp repo (never from the live repo).
 *
 * Contrast values used below, by hand (relative luminance with the sRGB
 * linearisation, ratio = (L1 + 0.05) / (L2 + 0.05)):
 *   #000000 on #ffffff  L = 0 and 1                       → 1.05 / 0.05 = 21.00
 *   #777777 on #ffffff  L = 0.18447  → 1.05 / 0.23447     → 4.48
 *   #767676 on #ffffff  L = 0.18118  → 1.05 / 0.23118     → 4.54
 *   #efe5d3 on #16100a  → 15.12, #b39b6e on #16100a → 7.04 (the values the audit oracle verified)
 *   #677988 on #ffffff  L = 0.18336  → 1.05 / 0.23336      → 4.4995 (2 dp: 4.50, but below AA)
 */

"use strict";

const { makeRepo, removeRepo, run, get, val } = require("./helpers");
const { clampText, MAX_DETAIL_TEXT } = require("../../../src/lib/counters/counter");

const lines = (...l) => l.join("\n") + "\n";
const G = "design/guardrails.mdx";

describe("guardrails counters", () => {
  const roots = [];
  const repo = (files) => {
    const root = makeRepo(files);
    roots.push(root);
    return root;
  };
  afterEach(() => roots.splice(0).forEach(removeRepo));
  const r = (files) => run(repo(files), { groups: ["guardrails"] });

  describe("structure", () => {
    const body = lines(
      "---",
      "title: Guardrails",
      "---",
      "",
      "Intro paragraph.",
      "",
      "## Color",
      "",
      "- ★ **No raw hex.** Exceptions: the token source (`globals.css`) and mockups",
      "  (`Mock.tsx`).",
      "- ⭐ Second starred rule.",
      "- Plain rule.",
      "  - nested sub item",
      "1. Ordered rule",
      "",
      "```md",
      "## Not a heading",
      "- not a bullet",
      "```",
      "",
      "## Type & shape",
      "",
      "- Role fonts only: `--font-sans`.",
      "",
      "### A sub heading",
      "",
      "## Accessibility",
      "",
      "- Body text.",
    );

    test("lines, sections, rule bullets, stars and exceptions are hand-countable", () => {
      const report = r({ [G]: body });
      expect(val(report, "guardrails.file.exists")).toBe(true);
      expect(val(report, "guardrails.file.lines")).toBe(29); // `wc -l` of the 29 lines above
      expect(val(report, "guardrails.file.bytes")).toBe(Buffer.byteLength(body, "utf8"));
      expect(val(report, "guardrails.file.front_matter")).toBe(true);

      // Color, Type & shape, Accessibility; the fenced "## Not a heading" and the H3 are not H2 sections
      expect(val(report, "guardrails.structure.h2_sections")).toBe(3);
      expect(get(report, "guardrails.structure.h2_sections").detail.titles.map((t) => t.title)).toEqual(["Color", "Type & shape", "Accessibility"]);

      // top-level bullets: ★, ⭐, Plain, Ordered, Role fonts, Body text = 6; the nested item and the fenced bullet are not rules
      expect(val(report, "guardrails.structure.rule_bullets")).toBe(6);
      expect(get(report, "guardrails.structure.rule_bullets").detail.nestedBullets).toBe(1);
      expect(get(report, "guardrails.structure.rule_bullets").detail.bySection).toEqual({ Accessibility: 1, Color: 4, "Type & shape": 1 });
      expect(val(report, "guardrails.structure.starred_rules")).toBe(2);

      // one Exceptions clause, wrapped over two lines, naming two files
      expect(val(report, "guardrails.structure.exception_clauses")).toBe(1);
      expect(val(report, "guardrails.structure.documented_exceptions")).toBe(2);
      expect(get(report, "guardrails.structure.documented_exceptions").detail.files).toEqual(["Mock.tsx", "globals.css"]);
      expect(get(report, "guardrails.structure.exception_clauses").detail.clauses).toEqual([{ line: 9, files: ["Mock.tsx", "globals.css"] }]);
    });

    test("the same file with CRLF endings and a BOM gives the same counts", () => {
      const lf = r({ [G]: body });
      const crlf = r({ [G]: "\uFEFF" + body.replace(/\n/g, "\r\n") });
      const pick = (rep) => rep.counters.filter((c) => c.id !== "guardrails.file.bytes").map((c) => [c.id, c.value]);
      expect(pick(crlf)).toEqual(pick(lf));
    });

    test("an exceptions SECTION counts the file-like code spans below it, up to the next heading of its level", () => {
      const report = r({
        [G]: lines(
          "## Rules",
          "",
          "- No raw hex.",
          "",
          "## Exceptions",
          "",
          "- `legacy/old.css`",
          "- `vendor/`",
          "- `.terminal` is a class, not a file",
          "",
          "## Other",
          "",
          "- `not-an-exception.ts`",
        ),
      });
      expect(val(report, "guardrails.structure.exception_clauses")).toBe(0);
      expect(val(report, "guardrails.structure.documented_exceptions")).toBe(2);
      expect(get(report, "guardrails.structure.documented_exceptions").detail.files).toEqual(["legacy/old.css", "vendor/"]);
    });

    test("an exception named in prose without a code span is a clause but not a documented file", () => {
      const report = r({ [G]: lines("## Color", "", "- No raw hex. Exempt: the token source and mockups.") });
      expect(val(report, "guardrails.structure.exception_clauses")).toBe(1);
      expect(val(report, "guardrails.structure.documented_exceptions")).toBe(0);
    });

    test("type-size and spacing rules are detected only in rule bullets and headings", () => {
      const without = r({
        [G]: lines(
          "## Type",
          "- Role fonts only: `--font-sans`, no letter-spacing tweaks.",
          "",
          "A paragraph that talks about font size and spacing but is not a rule.",
        ),
      });
      expect(val(without, "guardrails.rules.type_size")).toBe(false);
      expect(val(without, "guardrails.rules.spacing_scale")).toBe(false);

      const withBoth = r({
        [G]: lines(
          "## Type",
          "- Font sizes come from the `--font-size-*` tokens.",
          "- Spacing uses the `--space-*` scale.",
          "",
          "## Layout and padding",
        ),
      });
      expect(val(withBoth, "guardrails.rules.type_size")).toBe(true);
      expect(get(withBoth, "guardrails.rules.type_size").detail.lines).toEqual([2]);
      expect(val(withBoth, "guardrails.rules.spacing_scale")).toBe(true);
      expect(get(withBoth, "guardrails.rules.spacing_scale").detail.lines).toEqual([3, 5]);
    });

    test("a heading with a closing # sequence and a very long blank run is read without blowing up", () => {
      const start = Date.now();
      const report = r({ [G]: lines("## Section ##", "- x" + " ".repeat(200000) + "y", "## Next" + " ".repeat(200000) + "z") });
      expect(Date.now() - start).toBeLessThan(3000);
      // the 200,000-blank title is read whole and reported clamped (a hostile line cannot make the report megabytes long)
      const heading = get(report, "guardrails.structure.h2_sections");
      expect(heading.value).toBe(2);
      expect(heading.detail.titles.map((t) => t.title)).toEqual(["Section", clampText("Next" + " ".repeat(200000) + "z", MAX_DETAIL_TEXT)]);
      expect(heading.truncated).toBe(true);
      expect(JSON.stringify(report).length).toBeLessThan(400000);
    });
  });

  describe("contrast", () => {
    test("black on white is 21.00 and the claim 21:1 matches; 3-digit hex is expanded", () => {
      const report = r({ [G]: lines("## A11y", "", "- `#000` on `#FFFFFF` is 21:1.") });
      const pair = get(report, "guardrails.contrast.pairs").detail.pairs[0];
      expect(pair).toMatchObject({ line: 3, foreground: "#000000", background: "#ffffff", ratio: 21, claimed: "21", claimMatches: true, meetsAa: true });
      expect(val(report, "guardrails.contrast.pairs")).toBe(1);
      expect(val(report, "guardrails.contrast.claims")).toBe(1);
      expect(val(report, "guardrails.contrast.claims_matching")).toBe(1);
      expect(val(report, "guardrails.contrast.lowest_ratio")).toBe(21);
      expect(val(report, "guardrails.contrast.highest_ratio")).toBe(21);
    });

    test("#777 on white is 4.48 (below AA) and #767676 is 4.54 (above); a claim is compared at its own decimals", () => {
      const report = r({
        [G]: lines(
          "- `#777` on `#fff` (5:1)",
          "- `#767676` on `#FFFFFF` (4.5:1)",
          "- `#767676` over `#FFFFFF`",
        ),
      });
      const pairs = get(report, "guardrails.contrast.pairs").detail.pairs;
      expect(pairs.map((p) => [p.line, p.ratio, p.claimed, p.claimMatches, p.meetsAa])).toEqual([
        [1, 4.48, "5", false, false],
        [2, 4.54, "4.5", true, true],
        [3, 4.54, null, null, true],
      ]);
      expect(val(report, "guardrails.contrast.pairs")).toBe(3);
      expect(val(report, "guardrails.contrast.claims")).toBe(2);
      expect(val(report, "guardrails.contrast.claims_matching")).toBe(1);
      expect(val(report, "guardrails.contrast.claims_not_matching")).toBe(1);
      expect(val(report, "guardrails.contrast.pairs_below_4_5")).toBe(1);
      expect(val(report, "guardrails.contrast.lowest_ratio")).toBe(4.48);
      expect(val(report, "guardrails.contrast.highest_ratio")).toBe(4.54);
    });

    test("X over Y and X against Y are pairs too, with up to two words and a quote or bracket in between", () => {
      const report = r({
        [G]: lines(
          "- `#FFFFFF` against `#000000` (21:1)",
          "- **`#000000`** text over the `#FFFFFF` page",
          "- `#000000` is not a pair with `#FFFFFF` when no on/over/against joins them",
        ),
      });
      const pairs = get(report, "guardrails.contrast.pairs").detail.pairs;
      expect(pairs.map((p) => [p.line, p.foreground, p.background, p.ratio, p.claimed])).toEqual([
        [1, "#ffffff", "#000000", 21, "21"],
        [2, "#000000", "#ffffff", 21, null],
      ]);
    });

    test("a lone claim takes its background from the token source: .dark when the bullet says dark, :root otherwise", () => {
      const report = r({
        "design/tokens.css": ":root { --background: #ffffff; }\n.dark { --background: #000000; }\n",
        [G]: lines(
          "- Dark body is `#FFFFFF` at 21:1.",
          "- Light body is `#000000` at 21:1.",
          "- Plain `#000000` at 21:1.",
        ),
      });
      const pairs = get(report, "guardrails.contrast.pairs").detail.pairs;
      expect(pairs.map((p) => [p.foreground, p.background, p.ratio, p.backgroundVia])).toEqual([
        ["#ffffff", "#000000", 21, "token source --background (.dark)"],
        ["#000000", "#ffffff", 21, "token source --background (:root)"],
        ["#000000", "#ffffff", 21, "token source --background (:root)"],
      ]);
    });

    test("the oracle's two ratios: wrapped over two lines, dark background from .dark, 15.12 and 7.04", () => {
      const report = r({
        "design/tokens.css": ":root { --background: #ECE3CB; }\n.dark { --background: #16100A; }\n",
        [G]: lines(
          "## Accessibility",
          "",
          "- Body text ≥ 4.5:1 (dark body is `#EFE5D3` at 15.1:1; muted `#B39B6E` at",
          "  7.0:1 — muted is for secondary text only).",
        ),
      });
      const pairs = get(report, "guardrails.contrast.pairs").detail.pairs;
      expect(pairs.map((p) => [p.foreground, p.background, p.ratio, p.claimed, p.claimMatches])).toEqual([
        ["#b39b6e", "#16100a", 7.04, "7.0", true],
        ["#efe5d3", "#16100a", 15.12, "15.1", true],
      ]);
      expect(pairs[1].line).toBe(3);
      expect(pairs[0].line).toBe(3); // the hex is on line 3; its claim wraps to line 4
      expect(get(report, "guardrails.contrast.pairs").detail.pairs[1].ratioRaw).toBeCloseTo(15.1162, 3);
      expect(val(report, "guardrails.contrast.claims")).toBe(2);
      expect(val(report, "guardrails.contrast.claims_not_matching")).toBe(0);
      expect(val(report, "guardrails.contrast.hex_values")).toBe(2);
    });

    test("a 'surface'/'background' word right before a colour that has its own claim does not turn it into the background", () => {
      // #EFE5D3 follows the word "surface" within 24 characters, but "15.1:1" is its own ratio: it is a
      // foreground. Reading it as the background silently dropped that claim and judged #B39B6E against it (2.15).
      const report = r({
        "design/tokens.css": ":root { --background: #ffffff; }\n.dark { --background: #16100a; }\n",
        [G]: lines("- On the dark surface, body text `#EFE5D3` at 15.1:1; muted `#B39B6E` at 7.0:1."),
      });
      const pairs = get(report, "guardrails.contrast.pairs").detail.pairs;
      expect(pairs.map((p) => [p.foreground, p.background, p.ratio, p.claimed, p.claimMatches])).toEqual([
        ["#b39b6e", "#16100a", 7.04, "7.0", true],
        ["#efe5d3", "#16100a", 15.12, "15.1", true],
      ]);
      expect(val(report, "guardrails.contrast.claims")).toBe(2);
      expect(val(report, "guardrails.contrast.claims_not_matching")).toBe(0);
      expect(val(report, "guardrails.contrast.claims_unresolved")).toBe(0);
    });

    test("a colour after 'background' with no claim of its own is still the background", () => {
      const report = r({
        "design/tokens.css": ":root { --background: #ffffff; }\n",
        [G]: lines("- On the surface `#000000`, text `#FFFFFF` at 21:1."),
      });
      const pairs = get(report, "guardrails.contrast.pairs").detail.pairs;
      expect(pairs).toHaveLength(1);
      expect(pairs[0]).toMatchObject({ foreground: "#ffffff", background: "#000000", ratio: 21 });
    });

    test("a background named in the same bullet wins over the token source", () => {
      const report = r({
        "design/tokens.css": ":root { --background: #ffffff; }\n",
        [G]: lines("- Background `#000000`; text `#FFFFFF` at 21:1."),
      });
      const pairs = get(report, "guardrails.contrast.pairs").detail.pairs;
      expect(pairs).toHaveLength(1);
      expect(pairs[0]).toMatchObject({ foreground: "#ffffff", background: "#000000", ratio: 21, backgroundVia: "background named in the same bullet" });
    });

    test("without a token source the DESIGN.md front-matter background is the fallback", () => {
      const report = r({
        "design/DESIGN.md": lines("---", "colors:", '  background: "#000000"', "---", "", "# D"),
        [G]: lines("- Text `#FFFFFF` at 21:1."),
      });
      const pair = get(report, "guardrails.contrast.pairs").detail.pairs[0];
      expect(pair).toMatchObject({ background: "#000000", ratio: 21, backgroundVia: "DESIGN.md front matter colors.background" });
    });

    test("a claim with no resolvable background is reported unresolved, never guessed", () => {
      const report = r({ [G]: lines("- Text `#FFFFFF` at 21:1.") });
      expect(val(report, "guardrails.contrast.pairs")).toBe(0);
      expect(val(report, "guardrails.contrast.claims")).toBe(1);
      expect(val(report, "guardrails.contrast.claims_unresolved")).toBe(1);
      expect(get(report, "guardrails.contrast.claims_unresolved").detail.claims[0]).toMatchObject({ line: 1, foreground: "#ffffff", claimed: "21" });
      expect(val(report, "guardrails.contrast.lowest_ratio")).toBeNull();
      expect(get(report, "guardrails.contrast.lowest_ratio").notes.length).toBeGreaterThan(0);
    });

    test("a --background that is not a hex colour leaves the claim unresolved with the reason", () => {
      const report = r({
        "design/tokens.css": ":root { --background: oklch(0.2 0 0); }\n",
        [G]: lines("- Text `#FFFFFF` at 21:1."),
      });
      expect(val(report, "guardrails.contrast.claims_unresolved")).toBe(1);
      expect(get(report, "guardrails.contrast.claims_unresolved").detail.claims[0].reason).toMatch(/oklch/);
    });

    test("alpha hex, HTML entities, anchors and fenced code are not colours", () => {
      const report = r({
        [G]: lines(
          "- `#ffffff80` on `#000000` and &#123; and [link](#abc).",
          "",
          "```css",
          "color: #123456;",
          "```",
        ),
      });
      expect(val(report, "guardrails.contrast.hex_values")).toBe(1);
      expect(get(report, "guardrails.contrast.hex_values").detail.values).toEqual(["#000000"]);
      expect(val(report, "guardrails.contrast.pairs")).toBe(0);
    });

    test("a pathological unit (huge, hex-dense) is scanned in bounded time", () => {
      const start = Date.now();
      const report = r({ [G]: "- " + "#abc on ".repeat(20000) + "end\n" });
      expect(Date.now() - start).toBeLessThan(3000);
      expect(val(report, "guardrails.contrast.hex_values")).toBe(1);
    });
  });

  describe("lone claims: where the background comes from", () => {
    const TOKENS_RD = "design/tokens.css";

    test("a background named right after the claim (on / over / against) wins over the token source", () => {
      const report = r({
        [TOKENS_RD]: ":root { --background: #ffffff; }\n",
        [G]: lines(
          "- Body `#FFFFFF` at 21:1 on `#000000`.",
          "- Text `#EFE5D3` reads at 15.1:1 on `#16100A`.",
          "- `#000000` shows 21:1 against `#FFFFFF`.",
          "- `#FFFFFF` holds 21:1 over `#000000`.",
        ),
      });
      const pairs = get(report, "guardrails.contrast.pairs").detail.pairs;
      expect(pairs.map((p) => [p.line, p.foreground, p.background, p.ratio, p.claimed, p.claimMatches])).toEqual([
        [1, "#ffffff", "#000000", 21, "21", true],
        [2, "#efe5d3", "#16100a", 15.12, "15.1", true],
        [3, "#000000", "#ffffff", 21, "21", true],
        [4, "#ffffff", "#000000", 21, "21", true],
      ]);
      expect(pairs[0].backgroundVia).toMatch(/after the claim/);
      expect(val(report, "guardrails.contrast.claims")).toBe(4);
      expect(val(report, "guardrails.contrast.claims_not_matching")).toBe(0);
      // the background written after the claim is a background, not a second foreground
      expect(val(report, "guardrails.contrast.claims_unresolved")).toBe(0);
    });

    test("the theme comes from the nearest dark / light word to each colour, not from the whole bullet", () => {
      const report = r({
        [TOKENS_RD]: ":root { --background: #ffffff; }\n.dark { --background: #000000; }\n",
        [G]: lines(
          "- Light body `#000000` at 21:1; dark body `#FFFFFF` at 21:1.",
          "- `#FFFFFF` in dark mode at 21:1.",
          "- dark `#FFFFFF` light at 21:1.",
        ),
      });
      const pairs = get(report, "guardrails.contrast.pairs").detail.pairs;
      expect(pairs.map((p) => [p.line, p.foreground, p.background, p.ratio, p.backgroundVia])).toEqual([
        [1, "#000000", "#ffffff", 21, "token source --background (:root)"],
        [1, "#ffffff", "#000000", 21, "token source --background (.dark)"],
        [2, "#ffffff", "#000000", 21, "token source --background (.dark)"],
      ]);
      // line 3: "dark" and "light" are both 2 characters from the colour, so its theme is unknown
      const un = get(report, "guardrails.contrast.claims_unresolved").detail.claims;
      expect(un).toHaveLength(1);
      expect(un[0]).toMatchObject({ line: 3, foreground: "#ffffff", claimed: "21" });
      expect(un[0].reason).toMatch(/equally close/);
    });

    test("a background named after one claim is not a possible background for the next claim in the same bullet", () => {
      const report = r({
        "design/tokens.css": ":root { --background: #000000; }\n",
        [G]: lines("- `#FFFFFF` at 21:1 on `#000000`; `#777777` at 4.7:1."),
      });
      // #777777 on black: (0.18447 + 0.05) / 0.05 = 4.69, claimed 4.7
      const pairs = get(report, "guardrails.contrast.pairs").detail.pairs;
      expect(pairs.map((p) => [p.foreground, p.background, p.ratio, p.claimMatches, p.backgroundVia])).toEqual([
        ["#777777", "#000000", 4.69, true, "token source --background (:root)"],
        ["#ffffff", "#000000", 21, true, "background named after the claim (on, over or against)"],
      ]);
      expect(val(report, "guardrails.contrast.claims_unresolved")).toBe(0);
    });

    test("the nearest word wins whichever side it is on: a far 'Light' before the colour loses to a near 'dark' after it", () => {
      const report = r({
        "design/tokens.css": ":root { --background: #ffffff; }\n.dark { --background: #000000; }\n",
        [G]: lines("- Light theme: body `#FFFFFF` in dark mode at 21:1."),
      });
      const pair = get(report, "guardrails.contrast.pairs").detail.pairs[0];
      expect(pair).toMatchObject({ foreground: "#ffffff", background: "#000000", ratio: 21, backgroundVia: "token source --background (.dark)" });
    });

    test("another colour in the bullet that nobody names as the background makes the background ambiguous, not the token source's", () => {
      const report = r({
        [TOKENS_RD]: ":root { --background: #ffffff; }\n",
        [G]: lines(
          "- Body `#FFFFFF` and links `#0000EE` at 9.4:1.",
          "- Body `#000000` at 21:1.",
        ),
      });
      // line 1 names #ffffff without saying it is the background; line 2 has no other colour and resolves
      const un = get(report, "guardrails.contrast.claims_unresolved").detail.claims;
      expect(un).toHaveLength(1);
      expect(un[0]).toMatchObject({ line: 1, foreground: "#0000ee", claimed: "9.4" });
      expect(un[0].reason).toMatch(/#ffffff/);
      const pairs = get(report, "guardrails.contrast.pairs").detail.pairs;
      expect(pairs.map((p) => [p.line, p.foreground, p.background, p.ratio])).toEqual([[2, "#000000", "#ffffff", 21]]);
    });

    test("two different backgrounds named in one bullet leave a lone claim unresolved; naming the same one twice does not", () => {
      const two = r({
        [G]: lines("- Light background `#FFFFFF`, dark background `#000000`; text `#777777` at 4.5:1."),
      });
      expect(val(two, "guardrails.contrast.pairs")).toBe(0);
      expect(get(two, "guardrails.contrast.claims_unresolved").detail.claims[0].reason).toMatch(/2 different backgrounds/);

      const same = r({ [G]: lines("- Surface `#000000` and background `#000000` hold `#FFFFFF` at 21:1.") });
      expect(get(same, "guardrails.contrast.pairs").detail.pairs.map((p) => [p.foreground, p.background, p.ratio])).toEqual([["#ffffff", "#000000", 21]]);
    });

    test("a fenced block ends the bullet it interrupts, so text after it is not read as part of the sentence", () => {
      const report = r({
        [G]: lines("- `#FFFFFF` on", "```", "code", "```", "`#000000` at 21:1."),
      });
      // read as one sentence this would be "`#FFFFFF` on `#000000` at 21:1" = a pair
      expect(val(report, "guardrails.contrast.pairs")).toBe(0);
      expect(val(report, "guardrails.contrast.claims_unresolved")).toBe(1);
    });
  });

  describe("contrast claims vs thresholds", () => {
    test("an N:1 worded as a limit is a threshold mention, never a claim", () => {
      const report = r({
        "design/tokens.css": ":root { --background: #ffffff; }\n",
        [G]: lines(
          "- Headings use `#111111`, which passes AAA (7:1).",
          "- Muted text `#767676` meets the 4.5:1 minimum.",
          "- `#767676` on `#FFFFFF` — 4.5:1 required.",
          "- Link `#000000` at 21:1 or better.",
          "- Body `#000000` at 21:1.",
        ),
      });
      expect(val(report, "guardrails.contrast.threshold_mentions")).toBe(4);
      expect(get(report, "guardrails.contrast.threshold_mentions").detail.mentions).toEqual([
        { line: 1, foreground: "#111111", threshold: "7" },
        { line: 2, foreground: "#767676", threshold: "4.5" },
        { line: 3, foreground: "#767676", threshold: "4.5" },
        { line: 4, foreground: "#000000", threshold: "21" },
      ]);
      // only line 5 is a claim; line 3 is still a pair (X on Y) but carries no claim
      expect(val(report, "guardrails.contrast.claims")).toBe(1);
      expect(val(report, "guardrails.contrast.claims_matching")).toBe(1);
      expect(val(report, "guardrails.contrast.claims_not_matching")).toBe(0);
      const pairs = get(report, "guardrails.contrast.pairs").detail.pairs;
      expect(pairs.map((p) => [p.line, p.ratio, p.claimed])).toEqual([[3, 4.54, null], [5, 21, "21"]]);
    });

    test("a plain ratio next to a colour is still a claim: #767676 on white at 4.5:1", () => {
      const report = r({
        "design/tokens.css": ":root { --background: #ffffff; }\n",
        [G]: lines("- Muted `#767676` at 4.5:1."),
      });
      expect(val(report, "guardrails.contrast.threshold_mentions")).toBe(0);
      expect(val(report, "guardrails.contrast.claims_matching")).toBe(1);
    });

    test("an arrow before a ratio points at the claim, it does not limit it: -> => <- are not comparison signs", () => {
      const report = r({
        [G]: lines(
          "- `#EFE5D3` on `#16100A` -> 15.1:1",
          "- `#B39B6E` on `#16100A` => 7.0:1",
          "- `#EFE5D3` at 15.1:1 on `#16100A` <- measured",
          "- `#B39B6E` on `#16100A` → 7.0:1 (arrow in unicode)",
        ),
      });
      expect(val(report, "guardrails.contrast.threshold_mentions")).toBe(0);
      const pairs = get(report, "guardrails.contrast.pairs").detail.pairs;
      expect(pairs.map((p) => [p.line, p.ratio, p.claimed, p.claimMatches])).toEqual([
        [1, 15.12, "15.1", true],
        [2, 7.04, "7.0", true],
        [3, 15.12, "15.1", true],
        [4, 7.04, "7.0", true],
      ]);
      expect(val(report, "guardrails.contrast.claims")).toBe(4);
      expect(val(report, "guardrails.contrast.claims_matching")).toBe(4);
    });

    test("real comparison signs still make a limit: >= ≥ > < <= before a ratio", () => {
      const report = r({
        [G]: lines(
          "- `#000000` on `#FFFFFF` >= 4.5:1",
          "- `#000000` on `#FFFFFF` ≥ 4.5:1",
          "- `#000000` on `#FFFFFF` > 4.4:1",
          "- `#000000` on `#FFFFFF` < 22:1",
          "- `#000000` on `#FFFFFF` <= 21:1",
        ),
      });
      expect(val(report, "guardrails.contrast.threshold_mentions")).toBe(5);
      expect(val(report, "guardrails.contrast.claims")).toBe(0);
    });

    test("AA is tested on the unrounded ratio: #677988 on white is 4.4995, shown as 4.5 but below AA", () => {
      const report = r({ [G]: lines("- `#677988` on `#FFFFFF` (4.5:1)") });
      const pair = get(report, "guardrails.contrast.pairs").detail.pairs[0];
      expect(pair).toMatchObject({ ratio: 4.5, claimed: "4.5", claimMatches: true, meetsAa: false });
      expect(pair.ratioRaw).toBeCloseTo(4.4995, 4);
      expect(val(report, "guardrails.contrast.pairs_below_4_5")).toBe(1);
    });
  });

  describe("rule vocabulary", () => {
    const only = (bullet) => r({ [G]: lines(`- ${bullet}`) });

    test.each([
      ["Never use `text-[13px]`.", true],
      ["Sizes come from `--text-lg`.", true],
      ["Body uses `--text-size-body`.", true],
      ["`--text-xs--line-height` pairs with `--text-xs`.", true],
      ["Headings are `text-2xl` only.", true],
      ["Font sizes are tokens.", true],
      ["Copy uses `--text-primary` on `--surface`.", false],
      ["Muted copy is `text-[#999999]`.", false],
      ["Muted copy is `text-[var(--muted)]`.", false],
      ["Use `--text-muted` for hints.", false],
    ])("type-size rule: %s → %s", (bullet, expected) => {
      expect(val(only(bullet), "guardrails.rules.type_size")).toBe(expected);
    });

    test.each([
      ["Margins around cards.", true],
      ["Paddings follow the scale.", true],
      ["Padding is `--space-4`.", true],
      ["No letter-spacing tweaks.", false],
    ])("spacing rule: %s → %s", (bullet, expected) => {
      expect(val(only(bullet), "guardrails.rules.spacing_scale")).toBe(expected);
    });

    test("a colour rule alone flips neither flag", () => {
      const report = r({ [G]: lines("## Color", "- Body copy uses `--text-primary` on `--surface`.", "- Margins around cards.") });
      expect(val(report, "guardrails.rules.type_size")).toBe(false);
      expect(val(report, "guardrails.rules.spacing_scale")).toBe(true);
    });
  });

  describe("H2 sections follow the stated rule", () => {
    test("column 0 and a non-empty title: an indented or empty ## is not a section, and does not take over the bullets", () => {
      const report = r({
        [G]: lines("## Real", "- a", " ## indented one space", "- b", "## ", "- c", "##\tTab", "- d", "## Real2 ##"),
      });
      expect(val(report, "guardrails.structure.h2_sections")).toBe(3);
      expect(get(report, "guardrails.structure.h2_sections").detail.titles).toEqual([
        { line: 1, title: "Real" },
        { line: 7, title: "Tab" },
        { line: 9, title: "Real2" },
      ]);
      expect(get(report, "guardrails.structure.h2_sections").definition.regex).toBe("^##[ \\t]+\\S");
      // a, b and c all sit under the last counted section "Real"
      expect(get(report, "guardrails.structure.rule_bullets").detail.bySection).toEqual({ Real: 3, Tab: 1 });
    });

    test("an exception named before the Exceptions: word in the same bullet is not an exception", () => {
      const report = r({ [G]: lines("- Keep `tokens.css` canonical. Exceptions: `Mock.tsx`.") });
      expect(val(report, "guardrails.structure.exception_clauses")).toBe(1);
      expect(get(report, "guardrails.structure.documented_exceptions").detail.files).toEqual(["Mock.tsx"]);
    });
  });

  describe("scale", () => {
    const within = (ms, fn) => {
      const start = Date.now();
      fn();
      expect(Date.now() - start).toBeLessThan(ms);
    };

    test("40,000 claims in one bullet are read in bounded time", () => {
      within(3000, () => {
        const report = r({ [G]: "- " + "#abc 1:1 ".repeat(40000) + "\n" });
        expect(val(report, "guardrails.contrast.claims")).toBe(40000);
      });
    });

    test("a 20,000-line paragraph of claims is read in bounded time, with each claim on its own line", () => {
      within(3000, () => {
        const report = r({ "design/tokens.css": ":root { --background: #000000; }\n", [G]: "#fff at 21:1 and\n".repeat(20000) });
        expect(val(report, "guardrails.contrast.pairs")).toBe(20000);
        expect(get(report, "guardrails.contrast.pairs").detail.pairs[0].line).toBe(1);
      });
      // every claim is on the line it was written on
      const lines3 = r({ "design/tokens.css": ":root { --background: #000000; }\n", [G]: "#fff at 21:1 and\n#eee at 17:1 and\n#ddd at 14:1 and\n" });
      expect(get(lines3, "guardrails.contrast.pairs").detail.pairs.map((p) => [p.line, p.foreground])).toEqual([[1, "#ffffff"], [2, "#eeeeee"], [3, "#dddddd"]]);
    });

    test("30,000 claims in a bullet that also names 30,000 other colours are each reported ambiguous in bounded time", () => {
      within(3000, () => {
        const others = Array.from({ length: 30000 }, (_, i) => "#" + (i + 4096).toString(16).padStart(6, "0")).join(" ");
        const report = r({ [G]: "- " + others + " " + "#fff at 21:1 ".repeat(30000) + "\n" });
        expect(val(report, "guardrails.contrast.claims_unresolved")).toBe(30000);
        expect(get(report, "guardrails.contrast.claims_unresolved").detail.claims[0].reason).toMatch(/also names #001000, #001001, #001002 and 29997 more/);
      });
    });

    test("20,000 one-claim bullets resolved through DESIGN.md are read in bounded time (DESIGN.md is parsed once)", () => {
      within(3000, () => {
        const report = r({
          "design/DESIGN.md": lines("---", "colors:", '  background: "#000000"', "---", "", "# D"),
          [G]: "- `#fff` at 21:1\n".repeat(20000),
        });
        expect(val(report, "guardrails.contrast.pairs")).toBe(20000);
      });
    });
  });

  describe("a file over the read cap", () => {
    test("says so instead of calling the file empty", () => {
      const report = r({ [G]: "x".repeat(5 * 1024 * 1024 + 10) });
      expect(val(report, "guardrails.file.exists")).toBe(true);
      expect(val(report, "guardrails.file.lines")).toBe(0);
      expect(get(report, "guardrails.file.lines").notes[0]).toMatch(/5 MB read cap/);
      expect(get(report, "guardrails.file.lines").notes[0]).not.toMatch(/empty/);
    });
  });

  describe("missing input", () => {
    test("a repo without guardrails.mdx reports 0 / false / null with notes, not an error", () => {
      const report = run(repo({}), { groups: ["guardrails"] });
      expect(val(report, "guardrails.file.exists")).toBe(false);
      expect(val(report, "guardrails.file.lines")).toBe(0);
      expect(val(report, "guardrails.file.bytes")).toBe(0);
      expect(val(report, "guardrails.structure.h2_sections")).toBe(0);
      expect(val(report, "guardrails.structure.rule_bullets")).toBe(0);
      expect(val(report, "guardrails.structure.documented_exceptions")).toBe(0);
      expect(val(report, "guardrails.rules.type_size")).toBe(false);
      expect(val(report, "guardrails.contrast.pairs")).toBe(0);
      expect(val(report, "guardrails.contrast.lowest_ratio")).toBeNull();
      expect(get(report, "guardrails.structure.h2_sections").notes).toEqual([`${G} does not exist`]);
    });

    test("an empty guardrails file is 0 lines and still never throws", () => {
      const report = r({ [G]: "" });
      expect(val(report, "guardrails.file.exists")).toBe(true);
      expect(val(report, "guardrails.file.lines")).toBe(0);
      expect(val(report, "guardrails.structure.rule_bullets")).toBe(0);
      expect(get(report, "guardrails.file.lines").notes[0]).toMatch(/empty/);
    });

    test("a directory called guardrails.mdx is not a file", () => {
      const report = r({ [`${G}/inner.md`]: "x" });
      expect(val(report, "guardrails.file.exists")).toBe(false);
    });
  });

  test("the report is deterministic and valid (ids dotted, sorted, group-prefixed)", () => {
    const files = { [G]: lines("## A", "- `#000` on `#fff` (21:1)", "- ★ star") };
    const a = r(files);
    const b = r(files);
    expect(JSON.stringify(b)).toBe(JSON.stringify(a));
    expect(a.counters.every((c) => c.group === "guardrails" && c.id.startsWith("guardrails."))).toBe(true);
    expect(a.counters.map((c) => c.id)).toEqual([...a.counters.map((c) => c.id)].sort());
  });
});
