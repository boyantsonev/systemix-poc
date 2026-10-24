/**
 * design-source.test.js — which file is the canonical token source, and which
 * files form the audited population. `drift scan` and `audit counters` share
 * this module, so these tests pin what both of them rely on.
 *
 * Every repo here is tiny and built by hand; nothing is pinned to the live repo.
 */

"use strict";

const fs = require("fs");
const os = require("os");
const path = require("path");

const ds = require("../../../src/lib/design-source");
const { makeRepo, removeRepo } = require("./helpers");

/** A css file declaring `n` distinct custom properties, one per line start. */
const props = (n, prefix = "--p") =>
  ":root {\n" + Array.from({ length: n }, (_, i) => `  ${prefix}${i}: ${i};`).join("\n") + "\n}\n";

const config = (source) => `design:\n  source: ${source}\n`;

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

/** A project at <parent>/proj with a real css file next to it at <parent>/outside.css, so "../outside.css" exists. */
function nestedRepo(files) {
  const parent = fs.mkdtempSync(path.join(os.tmpdir(), "sx-nested-"));
  repos.push(parent);
  const root = path.join(parent, "proj");
  for (const [rel, body] of Object.entries({ ...files, "../outside.css": props(40, "--out") })) {
    const abs = path.join(root, rel);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, body);
  }
  return { root, outsideFile: path.join(parent, "outside.css") };
}

const pick = (r) => ({ rel: r.rel, via: r.via });

describe("resolveTokenSource — the four steps, in order", () => {
  // every source present at once; each test removes the winner above it
  const everything = {
    "design/tokens.css": props(2, "--spine"),
    "systemix.config.yaml": config("src/cfg.css"),
    "src/cfg.css": props(6, "--cfg"),
    "design/DESIGN.md": "The canonical tokens are in src/doc.css.\n",
    "src/doc.css": props(7, "--doc"),
    "src/big.css": props(20, "--big"),
  };
  const without = (...omit) => Object.fromEntries(Object.entries(everything).filter(([k]) => !omit.includes(k)));

  test("1: design/tokens.css wins over a config, a doc and a bigger file", () => {
    expect(pick(ds.resolveTokenSource(repo(everything), ["src"]))).toEqual({ rel: "design/tokens.css", via: "design/tokens.css" });
  });

  test("1: it wins even when it is empty — its location is what declares it canonical", () => {
    const root = repo({ ...everything, "design/tokens.css": "/* nothing yet */\n" });
    const r = ds.resolveTokenSource(root, ["src"]);
    expect(pick(r)).toEqual({ rel: "design/tokens.css", via: "design/tokens.css" });
    expect(r.customProperties).toBe(0);
  });

  test("2: without design/tokens.css, systemix.config.yaml design.source wins over a doc and a bigger file", () => {
    const r = ds.resolveTokenSource(repo(without("design/tokens.css")), ["src"]);
    expect(pick(r)).toEqual({ rel: "src/cfg.css", via: "config:design.source" });
    expect(r.customProperties).toBe(6);
    expect(r.reason).toContain("design.source points at src/cfg.css");
  });

  test("3: without a config, the css file a design doc names canonical wins over a bigger file", () => {
    const r = ds.resolveTokenSource(repo(without("design/tokens.css", "systemix.config.yaml")), ["src"]);
    expect(pick(r)).toEqual({ rel: "src/doc.css", via: "doc:design/DESIGN.md" });
    expect(r.reason).toContain("names src/doc.css as canonical");
  });

  test("4: with nothing naming a source, the css file with the most custom properties wins", () => {
    const r = ds.resolveTokenSource(repo(without("design/tokens.css", "systemix.config.yaml", "design/DESIGN.md")), ["src"]);
    expect(pick(r)).toEqual({ rel: "src/big.css", via: "most-custom-properties" });
    expect(r.customProperties).toBe(20);
  });

  test("4 picks among what is left: 7 properties beats 6", () => {
    const root = repo(without("design/tokens.css", "systemix.config.yaml", "design/DESIGN.md", "src/big.css"));
    expect(ds.resolveTokenSource(root, ["src"]).rel).toBe("src/doc.css");
  });

  test("no source at all: null, via none, and a reason that says why", () => {
    const r = ds.resolveTokenSource(repo({ "src/a.ts": "export const a = 1;\n", "src/few.css": props(4) }), ["src"]);
    expect(r).toMatchObject({ abs: null, rel: null, via: "none", customProperties: 0 });
    expect(r.reason).toMatch(/^no token source:/);
    expect(r.reason).toContain(`>= ${ds.MIN_PROPS} custom properties`);
  });

  test("an empty repo, a missing root and no dirs do not throw", () => {
    expect(ds.resolveTokenSource(repo({}), ["src"]).via).toBe("none");
    expect(ds.resolveTokenSource(path.join(repo({}), "does", "not", "exist"), ["src"]).via).toBe("none");
    expect(ds.resolveTokenSource(repo({ "src/t.css": props(5) })).rel).toBe("src/t.css"); // default dirs include src
  });
});

describe("step 2 — systemix.config.yaml design.source", () => {
  test("a path to a css file", () => {
    for (const written of ["src/styles/theme.css", "./src/styles/theme.css", '"src/styles/theme.css"', "src/styles/theme.css   # the tokens"]) {
      const root = repo({ "systemix.config.yaml": config(written), "src/styles/theme.css": props(2) });
      expect(pick(ds.resolveTokenSource(root, ["src"]))).toEqual({ rel: "src/styles/theme.css", via: "config:design.source" });
    }
  });

  test("a css file is accepted whatever its size or location inside the project, audited or not", () => {
    const root = repo({ "systemix.config.yaml": config("styles/theme.css"), "styles/theme.css": props(1), "src/big.css": props(30) });
    expect(ds.resolveTokenSource(root, ["src"]).rel).toBe("styles/theme.css");
  });

  test("an absolute path inside the project is fine", () => {
    const root = repo({ "src/t.css": props(2) });
    fs.writeFileSync(path.join(root, "systemix.config.yaml"), config(path.join(root, "src", "t.css")));
    expect(ds.resolveTokenSource(root, ["src"]).rel).toBe("src/t.css");
  });

  test("a path to a directory: tokens.css in it wins, however few properties it has", () => {
    const root = repo({
      "systemix.config.yaml": config("styles/"),
      "styles/tokens.css": props(2, "--t"),
      "styles/bigger.css": props(9, "--b"),
    });
    expect(pick(ds.resolveTokenSource(root, ["src"]))).toEqual({ rel: "styles/tokens.css", via: "config:design.source" });
  });

  test("a path to a directory without tokens.css: the css file in it with the most custom properties", () => {
    const root = repo({
      "systemix.config.yaml": config("styles"),
      "styles/a.css": props(6, "--a"),
      "styles/deep/b.css": props(8, "--b"),
      "styles/small.css": props(4, "--s"),
    });
    const r = ds.resolveTokenSource(root, ["src"]);
    expect(pick(r)).toEqual({ rel: "styles/deep/b.css", via: "config:design.source" });
    expect(r.reason).toContain("css file with the most custom properties");
  });

  test("a directory with nothing usable in it falls through to the next step", () => {
    const root = repo({
      "systemix.config.yaml": config("styles"),
      "styles/small.css": props(4),
      "design/DESIGN.md": "Canonical tokens: src/doc.css\n",
      "src/doc.css": props(5),
    });
    expect(pick(ds.resolveTokenSource(root, ["src"]))).toEqual({ rel: "src/doc.css", via: "doc:design/DESIGN.md" });
  });

  test.each([["none"], ["design"], ['"none"'], [""]])("design.source %j does not name a file: later steps decide", (value) => {
    // decoys: a folder literally called `none` and one called `design` hold a bigger tokens file
    const root = repo({
      "systemix.config.yaml": config(value),
      "src/t.css": props(6),
      "none/tokens.css": props(30, "--none"),
      "design/theme.css": props(2, "--design"),
    });
    expect(pick(ds.resolveTokenSource(root, ["src"]))).toEqual({ rel: "src/t.css", via: "most-custom-properties" });
  });

  test("design.source: design with a design/tokens.css is step 1 (the scaffolded spine)", () => {
    const root = repo({ "systemix.config.yaml": config("design"), "design/tokens.css": props(1) });
    expect(ds.resolveTokenSource(root, ["src"]).via).toBe("design/tokens.css");
  });

  test.each([
    ["a file that does not exist", "src/missing.css"],
    ["a file that is not css", "src/theme.ts"],
    ["a path that escapes the project", "../outside.css"],
    ["an absolute path outside the project", "OUTSIDE"],
    ["a deeper traversal that lands outside", "src/../../outside.css"],
  ])("%s is ignored, never used", (_name, source) => {
    const { root, outsideFile } = nestedRepo({ "src/theme.ts": "export const t = 1;\n", "src/fallback.css": props(5) });
    fs.writeFileSync(path.join(root, "systemix.config.yaml"), config(source === "OUTSIDE" ? outsideFile : source));
    expect(fs.existsSync(outsideFile)).toBe(true); // the escape target is real, so only the guard keeps it out
    expect(pick(ds.resolveTokenSource(root, ["src"]))).toEqual({ rel: "src/fallback.css", via: "most-custom-properties" });
  });

  test("a config with no design block, or one that is not valid, is not an error", () => {
    for (const yaml of ["version: 1\n", "design: nope\n", ": : :\n\t- [\n", "design:\n  source:\n"]) {
      const root = repo({ "systemix.config.yaml": yaml, "src/t.css": props(5) });
      expect(ds.resolveTokenSource(root, ["src"]).rel).toBe("src/t.css");
    }
  });
});

describe("step 3 — a css file the design docs name as canonical", () => {
  const withDoc = (text, extra = {}, doc = "design/DESIGN.md") =>
    repo({ [doc]: text, "src/app/globals.css": props(6, "--g"), "src/big.css": props(20, "--big"), ...extra });

  test("a line using canonical language names the file", () => {
    for (const line of [
      "The canonical tokens live in src/app/globals.css.",
      "src/app/globals.css is the SOURCE OF TRUTH.",
      "Single source: `src/app/globals.css`",
      "AUTHORITATIVE values: [globals](src/app/globals.css)",
    ]) {
      const r = ds.resolveTokenSource(withDoc(`# Design\n\n${line}\n`), ["src"]);
      expect(pick(r)).toEqual({ rel: "src/app/globals.css", via: "doc:design/DESIGN.md" });
    }
  });

  test("a line that merely mentions a css file, without canonical language, is ignored", () => {
    const text = [
      "We import src/app/globals.css in the root layout.",
      "Colours: see src/app/globals.css for the palette.",
      "The file src/app/globals.css is where tokens go.",
    ].join("\n");
    const r = ds.resolveTokenSource(withDoc(text), ["src"]);
    expect(pick(r)).toEqual({ rel: "src/big.css", via: "most-custom-properties" }); // step 4 decides instead
  });

  test("canonical language on one line does not claim a css file mentioned on another", () => {
    const text = "The canonical values are described below.\nsrc/app/globals.css\n";
    expect(ds.resolveTokenSource(withDoc(text), ["src"]).via).toBe("most-custom-properties");
  });

  test("a bare file name is found among the audited folders", () => {
    const r = ds.resolveTokenSource(withDoc("`globals.css` is the single source of truth.\n"), ["src"]);
    expect(pick(r)).toEqual({ rel: "src/app/globals.css", via: "doc:design/DESIGN.md" });
  });

  test("a path relative to the project root, outside the audited folders, is found", () => {
    const root = withDoc("canonical: styles/brand.css\n", { "styles/brand.css": props(3, "--brand") });
    expect(ds.resolveTokenSource(root, ["src"]).rel).toBe("styles/brand.css");
  });

  test("the docs are read in order: DESIGN.md, then tokens.mdx, then index.mdx", () => {
    const files = {
      "design/DESIGN.md": "Nothing canonical here.\n",
      "design/tokens.mdx": "Canonical: src/two.css\n",
      "design/index.mdx": "Canonical: src/three.css\n",
      "src/two.css": props(2, "--two"),
      "src/three.css": props(9, "--three"),
    };
    expect(pick(ds.resolveTokenSource(repo(files), ["src"]))).toEqual({ rel: "src/two.css", via: "doc:design/tokens.mdx" });
    expect(ds.resolveTokenSource(repo({ ...files, "design/DESIGN.md": "Canonical: src/one.css\n", "src/one.css": props(1) }), ["src"]).rel).toBe("src/one.css");
    expect(pick(ds.resolveTokenSource(repo({ ...files, "design/tokens.mdx": "nothing\n" }), ["src"]))).toEqual({ rel: "src/three.css", via: "doc:design/index.mdx" });
  });

  test("within a doc, the first usable canonical line wins", () => {
    const text = "Canonical: src/b.css\nCanonical: src/a.css\n";
    const root = repo({ "design/DESIGN.md": text, "src/a.css": props(3, "--a"), "src/b.css": props(3, "--b") });
    expect(ds.resolveTokenSource(root, ["src"]).rel).toBe("src/b.css");
  });

  test("a canonical line naming a missing file, or a file with no custom properties, is skipped", () => {
    const text = "Canonical: src/missing.css\nCanonical: src/plain.css\nCanonical: src/real.css\n";
    const root = repo({ "design/DESIGN.md": text, "src/plain.css": "body { margin: 0; }\n", "src/real.css": props(1) });
    expect(ds.resolveTokenSource(root, ["src"]).rel).toBe("src/real.css");
  });

  test("CRLF docs are read the same", () => {
    const root = repo({ "design/DESIGN.md": "# Design\r\n\r\nCanonical: src/t.css\r\n", "src/t.css": props(1), "src/big.css": props(9) });
    expect(ds.resolveTokenSource(root, ["src"]).rel).toBe("src/t.css");
  });

  test("a reference that escapes the project is ignored", () => {
    const { root } = nestedRepo({ "design/DESIGN.md": "Canonical: ../outside.css\nCanonical: /etc/hosts.css\n", "src/big.css": props(9) });
    expect(ds.resolveTokenSource(root, ["src"]).via).toBe("most-custom-properties");
  });

  test("a url is not a file in the project", () => {
    const root = repo({ "design/DESIGN.md": "Canonical: https://cdn.example.com/tokens.css\n", "src/big.css": props(9) });
    expect(ds.resolveTokenSource(root, ["src"]).via).toBe("most-custom-properties");
  });

  describe("a clause that negates blesses nothing", () => {
    const two = { "src/old.css": props(8, "--old"), "src/new.css": props(12, "--new") };

    test.each([
      ["old.css is no longer canonical; the source of truth is new.css", "src/new.css"],
      ["the source of truth is new.css; old.css is no longer canonical", "src/new.css"],
      ["new.css is canonical, old.css is deprecated", "src/new.css"],
      ["Canonical: new.css (legacy: old.css)", "src/new.css"],
      ["The authoritative file is old.css, not new.css", "src/old.css"],
      ["not new.css, the canonical file is old.css", "src/old.css"],
    ])("%s -> %s, whichever file comes first or exists first", (line, expected) => {
      const resolved = ds.resolveTokenSource(repo({ "design/DESIGN.md": `${line}\n`, ...two }), ["src"]);
      expect(pick(resolved)).toEqual({ rel: expected, via: "doc:design/DESIGN.md" });
      expect(resolved.alternatives).toEqual([]);
    });

    test("\"superseded by X\" blesses X, the file that replaced the one it describes", () => {
      for (const line of ["old.css was the single source of truth but is superseded by new.css", "old.css is canonical, replaced by new.css", "Canonical: old.css (deprecated in favour of new.css)"]) {
        const resolved = ds.resolveTokenSource(repo({ "design/DESIGN.md": `${line}\n`, ...two }), ["src"]);
        expect(pick(resolved)).toEqual({ rel: "src/new.css", via: "doc:design/DESIGN.md" });
      }
    });

    test("a file name does not negate itself: old.css and legacy-tokens.css can be canonical", () => {
      const files = { "src/old.css": props(8, "--old") };
      expect(ds.resolveTokenSource(repo({ "design/DESIGN.md": "Canonical: old.css\n", ...files }), ["src"]).rel).toBe("src/old.css");
      const legacy = { "src/legacy-tokens.css": props(8, "--legacy") };
      expect(ds.resolveTokenSource(repo({ "design/DESIGN.md": "The source of truth is legacy-tokens.css.\n", ...legacy }), ["src"]).rel).toBe("src/legacy-tokens.css");
    });

    test("a doc whose only canonical line negates its file blesses nothing: step 4 decides", () => {
      const resolved = ds.resolveTokenSource(repo({ "design/DESIGN.md": "old.css is no longer canonical.\n", ...two }), ["src"]);
      expect(pick(resolved)).toEqual({ rel: "src/new.css", via: "most-custom-properties" });
    });
  });

  describe("several candidates on one line", () => {
    const files = { "src/small.css": props(6, "--small"), "src/large.css": props(14, "--large") };

    test("the file the line points at (after is / are / :) wins, and the others are reported", () => {
      const r = ds.resolveTokenSource(repo({ "design/DESIGN.md": "Canonical: small.css and large.css\n", ...files }), ["src"]);
      expect(r.rel).toBe("src/small.css");
      expect(r.alternatives).toEqual(["src/large.css"]);
      expect(r.reason).toContain("the same line also names src/large.css");
      expect(r.reason).toContain("this one is the file it points at");
    });

    test("with no pointer, the one declaring the most custom properties wins", () => {
      const r = ds.resolveTokenSource(repo({ "design/DESIGN.md": "Both small.css and large.css are canonical.\n", ...files }), ["src"]);
      expect(r.rel).toBe("src/large.css");
      expect(r.alternatives).toEqual(["src/small.css"]);
      expect(r.reason).toContain("declares the most custom properties");
    });

    test("the report warns that the source was a choice", () => {
      const root = repo({ "design/DESIGN.md": "Both small.css and large.css are canonical.\n", ...files, "src/a.ts": "export {};\n" });
      const report = require("../../../src/lib/counters").runCounters(root, { dirs: ["src"], groups: ["census"] });
      expect(report.scope.tokenSource.path).toBe("src/large.css");
      expect(report.warnings.some((w) => /^token source is ambiguous: .*also names src\/small\.css/.test(w))).toBe(true);
    });

    test("a line naming one file is unchanged: no alternatives", () => {
      const r = ds.resolveTokenSource(repo({ "design/DESIGN.md": "Canonical: large.css\n", ...files }), ["src"]);
      expect(r).toMatchObject({ rel: "src/large.css", alternatives: [] });
      expect(r.reason).toBe("design/DESIGN.md names large.css as canonical");
    });
  });
});

describe("step 4 — the css file with the most custom properties", () => {
  const winner = (files, dirs = ["src"]) => ds.resolveTokenSource(repo(files), dirs).rel;

  test("more properties beat a shorter path", () => {
    expect(winner({ "src/a.css": props(5), "src/deeply/nested/dir/z.css": props(6) })).toBe("src/deeply/nested/dir/z.css");
  });

  test("equal counts: the shorter path wins", () => {
    expect(winner({ "src/app/globals.css": props(6), "src/z.css": props(6) })).toBe("src/z.css");
  });

  test("equal counts and equal length: alphabetical, whatever the creation order", () => {
    const files = { "src/c.css": props(6), "src/a.css": props(6), "src/b.css": props(6) };
    expect(winner(files)).toBe("src/a.css");
    expect(winner({ "src/b.css": props(6), "src/a.css": props(6) })).toBe("src/a.css");
    expect(winner({ "src/B.css": props(6), "src/a.css": props(6) })).toBe("src/B.css"); // code-unit order, not locale
  });

  test("the threshold: 5 distinct properties qualify, 4 do not", () => {
    expect(winner({ "src/four.css": props(4) })).toBeNull();
    expect(winner({ "src/five.css": props(5) })).toBe("src/five.css");
    expect(ds.MIN_PROPS).toBe(5);
  });

  test("it counts DISTINCT names: ten declarations of one property are one", () => {
    const repeated = Array.from({ length: 10 }, () => ":root { --x: 1; }").join("\n");
    expect(winner({ "src/repeated.css": repeated })).toBeNull();
    expect(winner({ "src/repeated.css": repeated, "src/five.css": props(5) })).toBe("src/five.css");
  });

  test("only declarations count — not references, commented-out declarations or properties inside values", () => {
    const css = "a { color: var(--a); background: var(--b); }\n/* .y { --old: 1; } */\n.x { content: \"--str: 1;\"; background: url(data:a;--in-url:1); }\n";
    expect(ds.customProperties(css).size).toBe(0);
    expect([...ds.customProperties("  --a: 1;\n\t--b : 2;\n--c:3;\r\n--a: 4;\n")].sort()).toEqual(["--a", "--b", "--c"]);
  });

  test("a declaration is seen wherever it sits: after the selector on the same line, several to a line, minified", () => {
    expect([...ds.customProperties(".dark { --a: #000; --b: #111; }\n[data-x=\"1\"] { --c: 0 }\n")].sort()).toEqual(["--a", "--b", "--c"]);
    expect([...ds.customProperties(":root{--m1:1;--m2:2}.dark{--m3:3}")].sort()).toEqual(["--m1", "--m2", "--m3"]);
    expect([...ds.customProperties("--top: 1;\n:root { --in: 2; }")].sort()).toEqual(["--in", "--top"]); // outside every rule too
  });

  test("candidates are the audited folders, design/ and css files at the project root", () => {
    const files = {
      "src/in.css": props(5, "--in"),
      "design/theme.css": props(6, "--design"),
      "root.css": props(7, "--root"),
      "elsewhere/out.css": props(40, "--out"),
    };
    expect(winner(files, ["src"])).toBe("root.css");
    expect(winner(files, ["src", "elsewhere"])).toBe("elsewhere/out.css");
  });

  test("css under node_modules, dist, build and dot folders is never a candidate", () => {
    const files = {};
    for (const dir of ["node_modules/pkg", "dist", "build", "out", "coverage", "vendor", "reference", ".next", ".expo", "generated", ".hidden"]) {
      files[`src/${dir}/huge.css`] = props(50);
    }
    files["src/real.css"] = props(5);
    expect(winner(files)).toBe("src/real.css");
  });
});

describe("safeJoin", () => {
  test.each([
    ["../x", null],
    ["a/../../b", null],
    ["/etc/passwd", null],
    ["", null],
    ["   ", null],
    [null, null],
    [undefined, null],
    [42, null],
    ["../" + "root-evil/a", null], // a sibling that merely shares the prefix of the root's name
  ])("rejects %j", (input, expected) => {
    expect(ds.safeJoin("/tmp/root", input)).toBe(expected);
  });

  test.each([
    ["src/a.ts", "/tmp/root/src/a.ts"],
    ["./src/a.ts", "/tmp/root/src/a.ts"],
    ["a/../b", "/tmp/root/b"],
    [".", "/tmp/root"],
    ["./", "/tmp/root"],
    ["..foo/a.css", "/tmp/root/..foo/a.css"], // a folder whose name starts with two dots is not a traversal
    ["/tmp/root/src/a.ts", "/tmp/root/src/a.ts"], // absolute, but inside
    [" src ", "/tmp/root/src"],
  ])("accepts %j", (input, expected) => {
    expect(ds.safeJoin("/tmp/root", input)).toBe(expected);
  });
});

describe("listFiles", () => {
  const rels = (root, dirs, opts) => ds.listFiles(root, dirs, opts).map((f) => f.rel);

  test("takes ts tsx js jsx css vue svelte, nothing else", () => {
    const root = repo(Object.fromEntries(["a.ts", "b.tsx", "c.js", "d.jsx", "e.css", "f.vue", "g.svelte", "h.md", "i.json", "j.scss", "k.mjs", "l.html", "m.svg"].map((f) => [`src/${f}`, "x"])));
    expect(rels(root, ["src"])).toEqual(["src/a.ts", "src/b.tsx", "src/c.js", "src/d.jsx", "src/e.css", "src/f.vue", "src/g.svelte"]);
  });

  test("skips vendored, build and dot folders and generated files", () => {
    const files = { "src/keep.ts": "x", "src/sub/keep.ts": "x", "src/sub.generated.ts": "x", "src/a.generated.css": "x" };
    for (const dir of ["node_modules", "dist", "build", "out", "coverage", "vendor", "reference", ".next", ".expo", ".git", ".systemix", "generated", ".storybook"]) {
      files[`src/${dir}/skip.ts`] = "x";
    }
    expect(rels(repo(files), ["src"])).toEqual(["src/keep.ts", "src/sub/keep.ts"]);
  });

  test("generated output is not source: __generated__/, _generated/, *.gen.*, *.min.* and *.generated.* stay out", () => {
    const files = {
      "src/real.tsx": "x",
      "src/__generated__/gql.ts": "x", // GraphQL / Relay
      "src/_generated/api.ts": "x", // Convex
      "src/lib/routeTree.gen.ts": "x", // TanStack Router
      "src/lib/vendor.min.js": "x",
      "src/lib/api.generated.ts": "x",
      "src/lib/genre.ts": "x", // "gen" inside a word is not a marker
      "src/lib/admin.min-width.ts": "x", // neither is ".min-"
      "src/lib/mine.ts": "x",
    };
    expect(rels(repo(files), ["src"])).toEqual(["src/lib/admin.min-width.ts", "src/lib/genre.ts", "src/lib/mine.ts", "src/real.tsx"]);
    // a file named explicitly is judged by its own name too
    expect(rels(repo(files), ["src/lib/routeTree.gen.ts"])).toEqual([]);
  });

  test("a skipped folder named __generated__ or _generated that holds source is reported, not dropped silently", () => {
    const root = repo({ "src/ok.ts": "x", "src/__generated__/gql.ts": "x", "src/_generated/api.ts": "x", "src/other/_generated/empty.md": "x" });
    const pop = ds.population(root, ["src"]);
    expect(pop.census.map((f) => f.rel)).toEqual(["src/ok.ts"]);
    expect(pop.skippedDirs).toEqual(["src/__generated__", "src/_generated"]);
  });

  test("a folder named explicitly is walked even if its name is on the skip list", () => {
    const root = repo({ "dist/a.ts": "x", "dist/node_modules/b.ts": "x" });
    expect(rels(root, ["dist"])).toEqual(["dist/a.ts"]);
  });

  test("symlinks are skipped: a file link, a folder link and a link back to the root", () => {
    const outside = repo({ "leak.ts": "const leak = 1;\n" });
    const root = repo({ "src/real.ts": "x", "src/sub/inner.ts": "y" });
    fs.symlinkSync(path.join(root, "src", "real.ts"), path.join(root, "src", "link.ts"));
    fs.symlinkSync(outside, path.join(root, "src", "outside-link"));
    fs.symlinkSync(path.join(root, "src", "sub"), path.join(root, "src", "sub-link"));
    fs.symlinkSync(root, path.join(root, "src", "loop"));
    expect(rels(root, ["src"])).toEqual(["src/real.ts", "src/sub/inner.ts"]);
    expect(rels(root, ["."])).toEqual(["src/real.ts", "src/sub/inner.ts"]);
  });

  test("order is by repo-relative path in code-unit order, whatever order the folders and files were given", () => {
    const names = ["src/b.ts", "src/B.ts", "src/a/z.ts", "src/a.ts", "src/a-b.ts", "src/10.ts", "src/9.ts", "lib/m.ts"];
    const expected = ["lib/m.ts", "src/10.ts", "src/9.ts", "src/B.ts", "src/a-b.ts", "src/a.ts", "src/a/z.ts", "src/b.ts"];
    const forward = repo(Object.fromEntries(names.map((n) => [n, "x"])));
    const backward = repo(Object.fromEntries([...names].reverse().map((n) => [n, "x"])));
    for (const root of [forward, backward]) {
      expect(rels(root, ["src", "lib"])).toEqual(expected);
      expect(rels(root, ["lib", "src"])).toEqual(expected);
      expect(rels(root, ["."])).toEqual(expected);
    }
  });

  test("overlapping folders list a file once", () => {
    const root = repo({ "src/a.ts": "x", "src/app/b.ts": "y" });
    expect(rels(root, ["src", "src/app", "./src", "src/a.ts"])).toEqual(["src/a.ts", "src/app/b.ts"]);
  });

  test("a folder may be a file; missing folders, traversal and non-source files are ignored", () => {
    const root = repo({ "src/a.ts": "x", "src/notes.md": "y" });
    expect(rels(root, ["src/a.ts"])).toEqual(["src/a.ts"]);
    expect(rels(root, ["src/notes.md", "missing", "../elsewhere", "/etc"])).toEqual([]);
  });

  test("{ exts } narrows the set", () => {
    const root = repo({ "src/a.ts": "x", "src/b.css": "y" });
    expect(rels(root, ["src"], { exts: new Set([".css"]) })).toEqual(["src/b.css"]);
  });

  test("a project with spaces in its path and in folder names", () => {
    const root = repo({ "my src/a b.ts": "x" });
    expect(ds.listFiles(root, ["my src"])).toEqual([{ abs: path.join(root, "my src", "a b.ts"), rel: "my src/a b.ts" }]);
  });
});

describe("population", () => {
  const fixture = {
    "design/tokens.css": props(3),
    "src/App.tsx": "x",
    "src/util.ts": "x",
    "src/App.test.tsx": "x",
    "src/util.spec.ts": "x",
    "src/__tests__/helper.ts": "x",
    "src/types.d.ts": "x",
    "src/api.generated.ts": "x",
    "src/generated/client.ts": "x",
    "src/styles.css": "body {}\n",
    "lib/helper.ts": "x",
  };
  const rels = (files) => files.map((f) => f.rel);

  test("census minus tests, .d.ts and the token source", () => {
    const root = repo(fixture);
    const ts = ds.resolveTokenSource(root, ["src", "design"]);
    const pop = ds.population(root, ["src", "design"], ts);
    expect(ts.rel).toBe("design/tokens.css");
    expect(rels(pop.census)).toEqual([
      "design/tokens.css", "src/App.test.tsx", "src/App.tsx", "src/__tests__/helper.ts",
      "src/styles.css", "src/types.d.ts", "src/util.spec.ts", "src/util.ts",
    ]);
    expect(rels(pop.tests)).toEqual(["src/App.test.tsx", "src/__tests__/helper.ts", "src/util.spec.ts"]);
    expect(rels(pop.declarations)).toEqual(["src/types.d.ts"]);
    expect(rels(pop.audited)).toEqual(["src/App.tsx", "src/styles.css", "src/util.ts"]);
    expect(pop.tokenSourceInCensus).toBe(true);
    // generated files never enter the census at all
    expect(rels(pop.census).some((f) => f.includes("generated"))).toBe(false);
  });

  test("the token source is exempt wherever it lives", () => {
    const cases = [
      [{ "systemix.config.yaml": config("src/styles/theme.css"), "src/styles/theme.css": props(2) }, "src/styles/theme.css", ["src"]],
      [{ "design/tokens.css": props(2) }, "design/tokens.css", ["design"]],
      [{ "tokens.css": props(6) }, "tokens.css", ["."]],
      [{ "src/app/globals.css": props(6) }, "src/app/globals.css", ["src"]],
    ];
    for (const [files, tokenRel, dirs] of cases) {
      const root = repo({ ...files, "src/a.ts": "x" });
      const ts = ds.resolveTokenSource(root, dirs);
      const pop = ds.population(root, dirs, ts);
      expect(ts.rel).toBe(tokenRel);
      expect(rels(pop.census)).toContain(tokenRel);
      expect(rels(pop.audited)).not.toContain(tokenRel);
    }
  });

  test("a token source outside the scanned folders is simply not in the census", () => {
    const root = repo({ "design/tokens.css": props(2), "src/a.ts": "x" });
    const pop = ds.population(root, ["src"], ds.resolveTokenSource(root, ["src"]));
    expect(pop.tokenSourceInCensus).toBe(false);
    expect(rels(pop.audited)).toEqual(["src/a.ts"]);
  });

  test("with no token source nothing is exempted", () => {
    const root = repo({ "src/a.css": props(2) });
    const pop = ds.population(root, ["src"], ds.resolveTokenSource(root, ["src"]));
    expect(rels(pop.audited)).toEqual(["src/a.css"]);
    expect(rels(ds.population(root, ["src"]).audited)).toEqual(["src/a.css"]); // and no source argument at all
  });

  test("missing and rejected folders are reported, not scanned", () => {
    const root = repo({ "src/a.ts": "x" });
    const pop = ds.population(root, ["src", "nope", "../up", "/etc"], null);
    expect(pop.dirs).toEqual(["src"]);
    expect(pop.missingDirs).toEqual(["nope"]);
    expect(pop.rejectedDirs).toEqual(["../up", "/etc"]);
  });

  test("a folder spelled as ./x or x/ is recorded as x; the project itself is `.`", () => {
    const root = repo({ "src/a.ts": "x" });
    expect(ds.population(root, ["./src/"], null).dirs).toEqual(["src"]);
    expect(ds.population(root, ["."], null).dirs).toEqual(["."]);
  });

  test("no folders means the default list", () => {
    const root = repo({ "src/a.ts": "x", "packages/p/b.ts": "x", "elsewhere/c.ts": "x" });
    for (const dirs of [[], undefined]) {
      const pop = ds.population(root, dirs, null);
      expect(pop.dirs).toEqual(["src", "packages"]);
      expect(pop.missingDirs).toEqual(["app", "components", "lib"]);
      expect(rels(pop.audited)).toEqual(["packages/p/b.ts", "src/a.ts"]);
    }
  });

  test("isTestFile and isDeclarationFile", () => {
    for (const f of ["a.test.ts", "a.spec.tsx", "a.test.js", "src/__tests__/a.ts", "x/__tests__/y/z.tsx"]) expect(ds.isTestFile(f)).toBe(true);
    for (const f of ["a.ts", "latest.ts", "contest.ts", "a.tests.ts", "test/a.ts", "a.test.d.ts", "attest.css"]) expect(ds.isTestFile(f)).toBe(false);
    for (const f of ["a.d.ts", "src/types.d.ts"]) expect(ds.isDeclarationFile(f)).toBe(true);
    for (const f of ["a.ts", "d.ts.bak", "a.d.tsx"]) expect(ds.isDeclarationFile(f)).toBe(false);
  });
});
