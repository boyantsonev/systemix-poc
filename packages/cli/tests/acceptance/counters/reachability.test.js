/**
 * reachability.test.js — acceptance tests for the `reachability` counters: an
 * import-resolving analysis of which component files no other file imports.
 * Every expectation is hand-computed from a tiny temp repo (never from the live
 * repo); the fixtures include the cases a filename grep gets wrong (imports in
 * comments, strings and code samples, aliases, index files, extension probing).
 */

"use strict";

const fs = require("fs");
const path = require("path");
const { makeRepo, removeRepo, run, get, val } = require("./helpers");
const { extractRefs, lex, stripJsonc } = require("../../../src/lib/counters/graph");

const tokens = `:root {\n${[1, 2, 3, 4, 5].map((i) => `  --t${i}: ${i};`).join("\n")}\n}\n`;
const files = (c) => (c.perFile ?? []).map((p) => p.file);
const refSpecs = (text) => extractRefs(text).refs.map((r) => `${r.kind}:${r.spec}`);

const TSCONFIG = `{
  // path aliases
  "compilerOptions": {
    /* the only alias; the glob below holds a slash-star inside a string */
    "paths": {
      "@/*": ["./src/*"], // trailing comma follows
    },
  },
}
`;

const PAGE = [
  'import { Hero } from "@/components/home/Hero";',
  'import type { T } from "@/lib/types";',
  'import type { OT } from "@/components/OnlyType";',
  "",
  '// import { M } from "../components/Mention";',
  '/* const x = import("../components/Mention"); */',
  "const sample = 'import M from \"../components/Mention\"';",
  "const code = `",
  'import M from "../components/Mention";',
  'const lazy = require("../components/Mention");',
  "`;",
  "const re = /['\"`]/;",
  'export const Lazy = () => import("../components/Lazy");',
  'const name = "Dyn";',
  "export const Dyn = () => import(`../components/${name}`);",
  "export default function Page() {",
  "  return (",
  "    <main>",
  "      <p>Don't import M from \"../components/Mention\" here</p>",
  "      <Hero />",
  "    </main>",
  "  );",
  "}",
  "",
].join("\n");

/** The Next-style fixture whose numbers are worked out in the comments of each test. */
const NEXT_FILES = {
  "tsconfig.json": TSCONFIG,
  "data.json": "{}",
  "src/app/globals.css": tokens,
  "src/app/layout.tsx": 'import "./globals.css";\nimport Link from "next/link";\nimport { Shell } from "@/components/Shell";\nexport default function Layout() { return <Shell><Link href="/" /></Shell>; }\n',
  "src/app/page.tsx": PAGE,
  "src/app/api/x/route.ts": 'export const GET = () => require("../../../lib/server.js");\n',
  "src/components/Shell.tsx": 'import { Button } from "./ui";\nexport const Shell = () => <Button />;\n',
  "src/components/ui/index.ts": 'export * from "./button";\nexport { Card as C } from "./card";\n',
  "src/components/ui/button.tsx": "export const Button = () => null;\n",
  "src/components/ui/card.tsx": "export const Card = () => null;\n",
  "src/components/ui/dead.tsx": 'import { Q } from "../OnlyByDead";\nexport const color = "#ff0000";\n',
  "src/components/OnlyByDead.tsx": 'export const Q = "rgb(0,0,0) #00ff00";\n',
  "src/components/home/Hero.tsx": 'import { Sub } from "./Sub";\r\nexport const Hero = () => <Sub color="#abcdef" />;\r\n',
  "src/components/home/Sub.tsx": "export const Sub = (p: object) => null;\n",
  "src/components/Lazy.tsx": "export default null;\n",
  "src/components/OnlyType.tsx": "export type OT = string;\n",
  "src/components/Mention.tsx": 'export const M = "oklch(0.5 0.1 20)";\n',
  "src/components/Dyn.tsx": "export default 1;\n",
  "src/components/OnlyByTest.tsx": "export const Y = 1;\n",
  "src/components/OnlyByTest.test.tsx": 'import { Y } from "./OnlyByTest";\ntest("y", () => Y);\n',
  "src/lib/types.ts": 'import data from "../../data.json";\nexport type T = typeof data;\n',
  "src/lib/server.ts": 'import "@/nope/missing";\nexport const s = 1;\n',
};

describe("reachability counters", () => {
  const roots = [];
  const repo = (f) => {
    const root = makeRepo(f);
    roots.push(root);
    return root;
  };
  afterEach(() => roots.splice(0).forEach(removeRepo));
  const reach = (root, dirs = ["src"]) => run(root, { dirs, groups: ["reachability"] });

  describe("the import scanner", () => {
    test("finds static imports, re-exports, dynamic imports and requires, with their bindings", () => {
      const out = extractRefs([
        'import a, { b as c, type d } from "x";',
        "import * as ns from 'y';",
        'import type { T } from "z";',
        'import type from "t";',
        'import "side";',
        'export { e as f } from "re";',
        'export * from "star";',
        'export * as ns2 from "star2";',
        'export type { U } from "ty";',
        'import legacy = require("eq");',
        'const q = await import("dyn");',
        'const w = require("req");',
      ].join("\n"));
      expect(out.refs.map((r) => `${r.kind}:${r.spec}${r.typeOnly ? ":type" : ""}`)).toEqual([
        "import:x", "import:y", "import:z:type", "import:t", "side_effect:side", "export_from:re",
        "export_star:star", "export_star:star2", "export_from:ty:type", "require:eq", "dynamic:dyn", "require:req",
      ]);
      expect(out.refs[0].bindings).toEqual([
        { local: "a", imported: "default" }, { local: "c", imported: "b" }, { local: "d", imported: "d" },
      ]);
      expect(out.refs[1].bindings).toEqual([{ local: "ns", imported: "*" }]);
      expect(out.refs[3].bindings).toEqual([{ local: "type", imported: "default" }]); // `type` is a default binding here
      expect(out.refs[5].names).toEqual([{ local: "e", exported: "f" }]);
      expect(out.refs[7].ns).toBe("ns2");
    });

    test("ignores imports that only appear in comments, strings, templates, regexes, JSX text or as properties", () => {
      expect(refSpecs([
        '// import a from "line-comment";',
        '/* import b from "block-comment"; */',
        "const s = 'import c from \"string\"';",
        "const t = `import d from \"template\";\nrequire(\"in-template\")`;",
        "const o = { import: 1, export: 2 }; o.import; o.require('prop'); module.require('mod');",
        'export default function F() { return <p>import e from "jsx-text"</p>; }',
        "const u = typeof require;",
      ].join("\n"))).toEqual([]);
    });

    test("keeps lexing correctly after regex literals, apostrophes in JSX text and nested template literals", () => {
      expect(refSpecs([
        "const re = /['\"`]/;",
        'const a = () => import("./after-regex");',
        "const J = () => <p>Don't stop</p>;",
        'const b = () => import("./after-apostrophe");',
        "const q = 'x';",
        "const s = `a ${ { k: `n${1}` }.k } z`;",
        'const c = () => import("./after-template");',
        "const d = 4 / 2 / 1;",
        'const e = () => require("./after-division");',
      ].join("\n"))).toEqual([
        "dynamic:./after-regex", "dynamic:./after-apostrophe", "dynamic:./after-template", "require:./after-division",
      ]);
    });

    test("counts non-literal import() and require() instead of following them", () => {
      const out = extractRefs('const n = "x";\nimport(`./a/${n}`);\nrequire(n);\nimport(n + ".js");\nimport(`./plain`);\nrequire("./lit");\n');
      expect(out.nonLiteral).toBe(3);
      expect(out.refs.map((r) => `${r.kind}:${r.spec}`)).toEqual(["dynamic:./plain", "require:./lit"]);
    });

    test("a `function require(id)` declaration is not a call", () => {
      const out = extractRefs("declare function require(id: string): any;\nfunction require(id) { return id; }\nrequire(variable);\n");
      expect(out.nonLiteral).toBe(1); // only the real call
    });

    test("static imports count only at the top level of the file", () => {
      expect(refSpecs('function f() {\n  import a from "nested";\n}\nimport b from "top";\n')).toEqual(["import:top"]);
    });

    test("stripJsonc removes comments and trailing commas but never touches strings", () => {
      const parsed = JSON.parse(stripJsonc('{ // c\n "a": ["x/*y*/", "// not a comment",], /* b */ "b": { "c": 1, }, }'));
      expect(parsed).toEqual({ a: ["x/*y*/", "// not a comment"], b: { c: 1 } });
    });
  });

  describe("the import scanner and JSX", () => {
    // An element whose text holds an unbalanced "(" is only read correctly when it is parsed as markup:
    // read as code, the "(" would hide the `export` that follows. Each case below ends with one.
    const H = "Press ( to open";
    const after = (src) => refSpecs(`${src}\nexport * from "./after";`);
    const FOUND = ["export_star:./after"];

    test("import and export text inside an element is text, even without parentheses around the JSX", () => {
      expect(refSpecs('export const Sample = () => <code>import { Button } from "@/components/ui/button"</code>;')).toEqual([]);
      expect(refSpecs('const A = <p>import e from "./b"</p>;')).toEqual([]);
      expect(refSpecs('const A = <p>export * from "./b"</p>;')).toEqual([]);
      expect(refSpecs('export default () => <pre>\nimport a from "./a";\nexport { b } from "./b";\nconst c = require("./c");\n</pre>;')).toEqual([]);
      expect(refSpecs('export const A = () => <><b>import q from "./q"</b>{" "}<i>x</i></>;')).toEqual([]);
    });

    test("unbalanced brackets, URLs and backticks in JSX text do not hide the statements that follow", () => {
      expect(after(`export const A = () => <p>${H}</p>;`)).toEqual(FOUND);
      expect(after("export const A = () => <p>Press [ to open</p>;")).toEqual(FOUND);
      expect(after("export const A = () => <p>close ) ] here</p>;")).toEqual(FOUND);
      expect(refSpecs('const A = <a>https://example.com</a>; const L = () => import("./b");')).toEqual(["dynamic:./b"]);
      expect(refSpecs('const A = <p>use ` to quote</p>;\nconst L = () => import("./b");')).toEqual(["dynamic:./b"]);
      expect(refSpecs("const A = <p>don't 'quote \"this</p>;\nconst L = () => import(\"./b\");")).toEqual(["dynamic:./b"]);
      expect(after("const A = () => <p>${not} {\"a\"} \\</p>;")).toEqual(FOUND);
    });

    test("tag and attribute names may use every name character, and a closing tag may have spaces", () => {
      expect(after(`const A = <A0 Z9="1" _a$b="2" z:z-z.z="3" é="4" aZ="5" a9="6">${H}</A0>;`)).toEqual(FOUND);
      expect(after(`const A = <Zz.Aa0:b-c_$>${H}</Zz.Aa0:b-c_$>;`)).toEqual(FOUND);
      expect(after(`const A = <svg:rect>${H}</ svg:rect >;`)).toEqual(FOUND);
      expect(after(`const A = <_x>${H}</_x>; const B = <$y>${H}</$y>; const C = <é>${H}</é>;`)).toEqual(FOUND);
    });

    test("attribute strings may hold // /* quotes > { and newlines; a backslash does not escape", () => {
      expect(after(`const A = <a href="http://x.y//z" t='it"s' u="/* c" v="a > b {" w="multi\nline" f="\\">${H}</a>;`)).toEqual(FOUND);
      expect(after(`const A = <a b = "1" c=\n'2'>${H}</a>;`)).toEqual(FOUND);
    });

    test("attribute values in braces are code: nested braces, strings, templates, arrows and elements", () => {
      expect(after(`const A = <a b={{ c: { d: 1 } }} e={"}" + '}'} f={\`t\${ { k: 1 }.k }\`} g={() => { go(); }} h={<i>${H}</i>}>${H}</a>;`)).toEqual(FOUND);
      expect(after(`const A = <a {...p} {...{ q: 1 }}>${H}</a>;`)).toEqual(FOUND);
      expect(refSpecs('const A = <a b={require("./r")} c={() => import("./s")}>x</a>;')).toEqual(["require:./r", "dynamic:./s"]);
    });

    test("comments may sit between attributes; a stray slash in a tag makes it not an element", () => {
      expect(after(`const A = <a /* c ( */ b="1" // d [\n c="2" /* e */>${H}</a>;`)).toEqual(FOUND);
      expect(after(`const A = <a b="1" // d\n>${H}</a>;`)).toEqual(FOUND);
      expect(after(`const A = <a b=/* c */"1" d= // e\n'2' f /* g */ = "3">${H}</a>;`)).toEqual(FOUND); // TypeScript allows comments around ="
      expect(refSpecs('const q = <a / b>x;\nexport * from "./z";\n</a>;')).toEqual(["export_star:./z"]); // a lone slash in a tag
    });

    test("self-closing, nested, sibling and fragment elements", () => {
      expect(after(`const A = <a><b /><c d="1" />${H}<e></e></a>;`)).toEqual(FOUND);
      expect(after(`const A = <><b>${H}</b><></></>;`)).toEqual(FOUND);
      expect(after(`const A = <a><b><c><d>${H}</d></c></b></a>;`)).toEqual(FOUND);
      expect(after(`const A = <a />; const B = <b c="1" />; const C = <d/>;`)).toEqual(FOUND);
      expect(after(`const A = <a>${H}</a>;\nconst B = <b>${H}</b>;`)).toEqual(FOUND);
    });

    test("containers inside text: expressions, comments, nested elements and callbacks", () => {
      expect(after(`const A = <a>{x}${H}{y}{/* c ( */}</a>;`)).toEqual(FOUND);
      expect(after(`const A = <ul>{list.map((i) => (<li key={i}>${H} {i}</li>))}</ul>;`)).toEqual(FOUND);
      expect(after(`const A = <a>{c && <b>${H}</b>}{d ? <e>${H}</e> : <f>${H}</f>}</a>;`)).toEqual(FOUND);
      expect(after(`const A = <a>{[<i key="1">${H}</i>, <i key="2">${H}</i>]}</a>;`)).toEqual(FOUND);
    });

    test("the code in {…} containers is still read: dynamic imports in children and attributes are edges", () => {
      expect(refSpecs('const A = () => <Suspense fallback={<i>…</i>}>{React.lazy(() => import("./lazy"))}</Suspense>;')).toEqual(["dynamic:./lazy"]);
      expect(refSpecs('const A = <Foo render={() => require("./r")} {...(await import("./s"))}>x</Foo>;')).toEqual(["require:./r", "dynamic:./s"]);
      expect(refSpecs('const A = <ul>{items.map((i) => <li key={i}>{i}{import("./nested")}</li>)}</ul>;')).toEqual(["dynamic:./nested"]);
    });

    test("type arguments on a tag name: <Select<Option> />", () => {
      expect(after(`const A = <Select<Option> a="1">${H}</Select>;`)).toEqual(FOUND);
      expect(after(`const A = <Map<string, Array<number>> a="1">${H}</Map>;`)).toEqual(FOUND);
    });

    test("an element that does not parse is rewound and read as code: mismatched tags, a bad attribute, a bad name", () => {
      // lenient matching would swallow the export as text up to the lookalike closing tags
      expect(refSpecs('const q = <a><b>x</a>;\nexport * from "./z";\n</b></a>;')).toEqual(["export_star:./z"]);
      expect(refSpecs('const q = <a>x</b>;\nexport * from "./z";\n</b></a>;')).toEqual(["export_star:./z"]);
      expect(refSpecs('const q = <a b=c>x;\nexport * from "./z";\n</a>;')).toEqual(["export_star:./z"]);
      expect(refSpecs('const q = <a b= >x;\nexport * from "./z";\n</a>;')).toEqual(["export_star:./z"]);
      expect(refSpecs('const q = <a (b)>x;\nexport * from "./z";\n</a>;')).toEqual(["export_star:./z"]);
      expect(refSpecs('const q = <a b="unterminated>x;\nexport * from "./z";\n</a>;')).toEqual(["export_star:./z"]);
      expect(refSpecs('const q = <a>x< 1;\nexport * from "./z";\n</a>;')).toEqual(["export_star:./z"]);
    });

    test("a failed element inside a container does not undo the element around it", () => {
      expect(after(`const A = <a>{c && <b>x</i>}${H}</a>;`)).toEqual(FOUND);
      expect(after(`const A = <a b={c && <d>x</e>}>${H}</a>;`)).toEqual(FOUND);
    });

    test("a < that is not an element is an operator: comparisons, generics, assertions and generic arrows", () => {
      expect(refSpecs('if (a < b && c <d) {}\nconst L = () => import("./b");')).toEqual(["dynamic:./b"]);
      expect(refSpecs('const m = new Map<string, number>();\nconst f = useState<Foo>(null);\nconst L = () => import("./b");')).toEqual(["dynamic:./b"]);
      expect(refSpecs('const f = <T,>(a: T) => a;\nconst g = <T extends object>(a: T) => a;\nexport * from "./b";')).toEqual(["export_star:./b"]);
      // read as an element, `<T extends object>` would run on to the lookalike closing tags and hide the export
      expect(refSpecs('const g = <T extends object>(a: T) => a;\nconst h = <T extends\nobject>(b: T) => b;\nexport * from "./b";\n// </T></T>')).toEqual(["export_star:./b"]);
      expect(refSpecs('const g = <T = any>(a: T) => a;\nconst h = <T = any>(b: T) => b;\nexport * from "./b";\n// </T></T>')).toEqual(["export_star:./b"]);
      expect(refSpecs('const a = <any>window;\nconst b = <HTMLElement>el;\nexport * from "./b";')).toEqual(["export_star:./b"]);
      expect(refSpecs('const id = <T>(x: T) => x;\nexport function g() { return 1; }\nexport * from "./b";')).toEqual(["export_star:./b"]);
      expect(refSpecs('x = <b>text</i>;\nexport * from "./b";')).toEqual(["export_star:./b"]); // closing tag does not match
      expect(extractRefs('const a = <any>window;\nexport * from "./b";', { jsx: false }).refs.map((r) => r.spec)).toEqual(["./b"]);
    });

    test("with jsx off (a .ts file) markup is code, so an import in an element's text is an edge", () => {
      const src = "const a = <b>\nimport q from \"./inside\";\n</b>;";
      expect(refSpecs(src)).toEqual([]);
      expect(extractRefs(src, { jsx: false }).refs.map((r) => `${r.kind}:${r.spec}`)).toEqual(["import:./inside"]);
    });

    test("an element starts only where an expression can start", () => {
      const inside = (prefix) => refSpecs(`${prefix}<b>\nimport q from "./inside";\n</b>;`).includes("import:./inside");
      for (const prefix of [
        "", "x = ", "return ", "export default ", "case ", "(", "[", "f(a, ", "c ? ", "c ? d : ", "c && ", "c || ", "() => ", "go(() =>", "; ", "typeof ",
        "else ", "yield ", "await ", "void ", "delete ", "throw ", "do ", "x in ", "x of ", "new ", "x instanceof ", "{ k: ",
      ]) {
        expect([prefix, inside(prefix)]).toEqual([prefix, false]); // markup text: the import is not an edge
      }
      for (const prefix of ["a ", "f(1) ", "arr[0] ", "1 ", '"s" ', "{} ", "a << ", "`t` ", "/re/ ", "this ", "x.y "]) {
        expect([prefix, inside(prefix)]).toEqual([prefix, true]); // a comparison: the text is code
      }
    });

    test("import and export statements: every binding form, and the shapes that are not statements", () => {
      const forms = (src) => extractRefs(src).refs.map((r) => ({ k: r.kind, s: r.spec, t: r.typeOnly, b: r.bindings, n: r.names, ns: r.ns }));
      expect(forms('import { type as foo, type, bar as type } from "a";')[0].b).toEqual([
        { local: "foo", imported: "type" }, { local: "type", imported: "type" }, { local: "type", imported: "bar" },
      ]);
      expect(forms('import def, * as ns from "b";')[0].b).toEqual([{ local: "def", imported: "default" }, { local: "ns", imported: "*" }]);
      expect(forms('import def, { a, b as c } from "c";')[0].b).toEqual([
        { local: "def", imported: "default" }, { local: "a", imported: "a" }, { local: "c", imported: "b" },
      ]);
      expect(forms('import type X from "d";\nimport type { Y } from "e";\nimport type * as Z from "f";')).toMatchObject([
        { s: "d", t: true, b: [{ local: "X", imported: "default" }] },
        { s: "e", t: true, b: [{ local: "Y", imported: "Y" }] },
        { s: "f", t: true, b: [{ local: "Z", imported: "*" }] },
      ]);
      expect(forms('import {} from "g";\nimport "h";')).toMatchObject([{ k: "import", s: "g", b: [] }, { k: "side_effect", s: "h" }]);
      expect(forms('export type * from "i";\nexport type * as T from "j";\nexport * as default from "k";\nexport { default } from "l";\nexport { default as D, type E } from "m";'))
        .toMatchObject([
          { k: "export_star", s: "i", t: true }, { k: "export_star", s: "j", t: true, ns: "T" }, { k: "export_star", s: "k", ns: "default" },
          { k: "export_from", s: "l", n: [{ local: "default", exported: "default" }] },
          { k: "export_from", s: "m", n: [{ local: "default", exported: "D" }, { local: "E", exported: "E" }] },
        ]);
      expect(extractRefs('const a = 1;\nexport { a, b as c };\nexport { x as default };').localExports).toEqual([
        { local: "a", exported: "a" }, { local: "b", exported: "c" }, { local: "x", exported: "default" },
      ]);
      // not statements: an incomplete or malformed one gives no edge
      expect(refSpecs('import * from "x";\nimport * as from "y";\nimport { a, from "z";\nimport a b from "w";\nimport a from;')).toEqual([]);
      expect(refSpecs('export * "x";\nexport { a } "y";\nexport * as "z";\nexport const a = 1;\nexport default 1;\nimport.meta.url;')).toEqual([]);
      expect(refSpecs("import foo = require(\"bar\");")).toEqual(["require:bar"]);
    });

    test("static imports and exports count at the top level only: inside brackets, braces and template substitutions they do not", () => {
      expect(refSpecs('foo(\nimport a from "./p"\n);')).toEqual([]);
      expect(refSpecs('const x = [export * from "./q"];')).toEqual([]);
      expect(refSpecs('const t = `${import("./dyn")}`;\nimport a from "./top";')).toEqual(["dynamic:./dyn", "import:./top"]);
      expect(refSpecs('const o = { m() { import b from "./nested"; } };\nimport c from "./top";')).toEqual(["import:./top"]);
    });

    test("stray closing brackets do not push the nesting level below zero", () => {
      expect(refSpecs(') ) ] }\nexport * from "./x";')).toEqual(["export_star:./x"]);
      expect(refSpecs('const t = `${a}}}`;\n} }\nexport * from "./y";')).toEqual(["export_star:./y"]);
    });

    test("require() and import() with nothing to follow", () => {
      expect(extractRefs("require();").nonLiteral).toBe(0);
      expect(extractRefs("require(").nonLiteral).toBe(0);
      expect(extractRefs("require(x);").nonLiteral).toBe(1);
      expect(extractRefs("require(x, y);").nonLiteral).toBe(1);
      expect(extractRefs("const r = require;").refs).toEqual([]);
    });

    test("type arguments on a tag are accepted only when short, balanced and made of type characters", () => {
      // rejected: read as code, so the lookalike closing tag cannot swallow the export
      expect(refSpecs('const q = <A<(x)> y>t;\nexport * from "./z";\n</A>;')).toEqual(["export_star:./z"]);
      expect(refSpecs('const q = <A<b x>y;\nexport * from "./z";\n</A>;')).toEqual(["export_star:./z"]);
      expect(refSpecs(`const q = <A<${"b,".repeat(150)}c> x>t;\nexport * from "./z";\n</A>;`)).toEqual(["export_star:./z"]);
      expect(refSpecs('const q = <A<{ k: 1 }> y>t;\nexport * from "./z";\n</A>;')).toEqual(["export_star:./z"]);
      // accepted: the export is inside the element's text
      expect(refSpecs('const q = <A<B | C> y>\nexport * from "./z";\n</A>;')).toEqual([]);
    });

    test("empty comments end where they end", () => {
      expect(refSpecs('/**/ const L = () => import("./a");')).toEqual(["dynamic:./a"]);
      expect(refSpecs('/***/ const L = () => import("./a");')).toEqual(["dynamic:./a"]);
      expect(refSpecs('//\nconst L = () => import("./a");')).toEqual(["dynamic:./a"]);
      expect(refSpecs('const A = <a /**/ b="1" //\n c>Press ( here</a>;\nexport * from "./after";')).toEqual(["export_star:./after"]);
      expect(refSpecs('const A = <a /***/>x</a>; const L = () => import("./a");')).toEqual(["dynamic:./a"]);
    });

    test("a slash right before a name is a division, whatever the token before it", () => {
      expect(refSpecs('const z = 4 /require("./a");')).toEqual(["require:./a"]);
      expect(refSpecs('a /import("./x")/ 2;')).toEqual(["dynamic:./x"]); // a division right at the start of the file
      expect(refSpecs('const w = a /b/ c; import("./x");')).toEqual(["dynamic:./x"]);
    });

    test("an unclosed string or regex on a line does not swallow the lines after it", () => {
      const code = (src) => extractRefs(src, { jsx: false }).refs.map((r) => `${r.kind}:${r.spec}`);
      expect(code("it's fine\nconst L = () => import(\"./a\");")).toEqual(["dynamic:./a"]);
      expect(code('say "hello\nconst L = () => import("./a");')).toEqual(["dynamic:./a"]);
      expect(code("const x = /unterminated\nconst L = () => import(\"./a\");")).toEqual(["dynamic:./a"]);
      expect(code("<p>Don't stop</p>\nconst L = () => import(\"./a\");")).toEqual(["dynamic:./a"]);
    });

    test("a slash inside a regex character class does not end the regex; $ and { in a template are text", () => {
      expect(refSpecs('const re = /[/`]/;\nconst L = () => import("./a");')).toEqual(["dynamic:./a"]);
      expect(refSpecs('const re = /[\\]/`]/;\nconst L = () => import("./a");')).toEqual(["dynamic:./a"]);
      expect(refSpecs('const s = `cost $5 and {braces} and $`;\nconst L = () => import("./a");')).toEqual(["dynamic:./a"]);
      expect(refSpecs('const s = `a${1}b$c{d}e${2}`;\nconst L = () => import("./a");')).toEqual(["dynamic:./a"]);
    });

    test("boolean attributes and attributes without a space before the closing bracket", () => {
      expect(after(`const A = <input disabled>${H}</input>;`)).toEqual(FOUND);
      expect(after(`const A = <a b c d>${H}</a>;`)).toEqual(FOUND);
      expect(after(`const A = <a b="1"c='2'>${H}</a>;`)).toEqual(FOUND);
      expect(after(`const A = <a b/><c d/>;`)).toEqual(FOUND);
    });

    test("incomplete statements make no edge: a missing specifier after from", () => {
      expect(refSpecs('export * from;\nexport { a } from;\nexport * as ns from;\nimport a from;\nimport { b } from;\nimport * as c from;')).toEqual([]);
    });

    test("lex gives every token its kind and its exact source range", () => {
      const tokens = (src, opts) => {
        const t = lex(src, { offsets: true, ...opts });
        return t.kind.map((k, i) => [k, src.slice(t.from[i], t.to[i])]);
      };
      expect(tokens('x = (1) / 2; y = /re/g; w = "s" + \'q\' + `t` + `a${b}c`; v = <i/>; [ ] { } 0 9 12.5 0xFF a.b')).toEqual([
        ["i", "x"], ["p", "="], ["p", "("], ["n", "1"], ["p", ")"], ["p", "/"], ["n", "2"], ["p", ";"],
        ["i", "y"], ["p", "="], ["r", "/re/"], ["i", "g"], ["p", ";"],
        ["i", "w"], ["p", "="], ["s", '"s"'], ["p", "+"], ["s", "'q'"], ["p", "+"], ["t", "`t`"], ["p", "+"],
        ["T", "`a${"], ["i", "b"], ["e", "}c`"], ["p", ";"],
        ["i", "v"], ["p", "="], ["J", "<"], ["x", ">"], ["p", ";"],
        ["p", "["], ["p", "]"], ["p", "{"], ["p", "}"], ["n", "0"], ["n", "9"], ["n", "12.5"], ["n", "0xFF"], ["i", "a"], ["p", "."], ["i", "b"],
      ]);
      // an element is one J … x pair; its containers are tokens in between and its text is no token at all
      expect(tokens("x = <a b={1}>t{c}</a>;")).toEqual([
        ["i", "x"], ["p", "="], ["J", "<"], ["p", "{"], ["n", "1"], ["p", "}"], ["p", "{"], ["i", "c"], ["p", "}"], ["x", ">"], ["p", ";"],
      ]);
      expect(tokens("x = <a>t</a>>y;")).toEqual([["i", "x"], ["p", "="], ["J", "<"], ["x", ">"], ["p", ">"], ["i", "y"], ["p", ";"]]);
      expect(tokens("x = <></>;")).toEqual([["i", "x"], ["p", "="], ["J", "<"], ["x", ">"], ["p", ";"]]);
      expect(tokens("x = <a/>;")).toEqual([["i", "x"], ["p", "="], ["J", "<"], ["x", ">"], ["p", ";"]]);
      // a string or regex with no closing quote on its line is skipped, not a token
      expect(tokens("it's fine\nx", { jsx: false })).toEqual([["i", "it"], ["i", "s"], ["i", "fine"], ["i", "x"]]);
      expect(tokens('say "hello\nx', { jsx: false })).toEqual([["i", "say"], ["i", "hello"], ["i", "x"]]);
      expect(tokens("y = /open\nx", { jsx: false })).toEqual([["i", "y"], ["p", "="], ["p", "/"], ["i", "open"], ["i", "x"]]);
      expect(tokens("x = /a\\/b/;", { jsx: false })).toEqual([["i", "x"], ["p", "="], ["r", "/a\\/b/"], ["p", ";"]]);
    });

    test("a comment, template or element that never ends stops at the end of the file", () => {
      expect(refSpecs('const a = 1; /* never closed\nimport("./a")')).toEqual([]);
      expect(refSpecs('const a = 1; // no newline at the end import("./a")')).toEqual([]);
      expect(refSpecs('const a = `never closed ${x\nimport("./a")')).toEqual(["dynamic:./a"]); // inside `${` the text is code
      expect(refSpecs('const a = `never closed\nimport("./a")')).toEqual([]);
      expect(refSpecs('import("./a"); /*')).toEqual(["dynamic:./a"]);
      expect(refSpecs('import("./a"); `${')).toEqual(["dynamic:./a"]);
    });

    test("a spread of require() or import() is a call, a property access is not", () => {
      expect(refSpecs('foo(...require("./a"));\nconst o = { ...require("./b") };\nconst l = [...import("./c")];')).toEqual(["require:./a", "require:./b", "dynamic:./c"]);
      expect(refSpecs('o.require("./a"); a?.require("./b"); x.y.import("./c");')).toEqual([]);
    });

    test("import(spec, options) is an edge", () => {
      expect(refSpecs('const j = import("./a.json", { with: { type: "json" } });\nconst k = import(`./b`, {});')).toEqual(["dynamic:./a.json", "dynamic:./b"]);
      expect(extractRefs('import(name, { with: {} });').nonLiteral).toBe(1);
    });

    test("a regex literal after a keyword is a regex; a slash after ) ] } is a division", () => {
      for (const word of ["return", "typeof", "instanceof", "in", "of", "void", "delete", "new", "case", "do", "else", "yield", "await", "throw"]) {
        expect(refSpecs(`${word} /\\(/;\nexport * from "./b";`)).toEqual(["export_star:./b"]);
      }
      expect(refSpecs('const q = (1) / 2; const L = () => import("./a"); const z = (4) / 5;')).toEqual(["dynamic:./a"]);
      expect(refSpecs('const q = arr[0] / 2; const L = () => import("./a"); const z = arr[1] / 5;')).toEqual(["dynamic:./a"]);
      expect(refSpecs('const q = {} / 2; const L = () => import("./a"); const z = {} / 5;')).toEqual(["dynamic:./a"]);
      expect(refSpecs('const w = a / b / c; const L = () => import("./a"); const z = 4 / 5 / 6;')).toEqual(["dynamic:./a"]);
    });

    test("a long run of escaped quotes or slashes is lexed in linear time", () => {
      const t0 = Date.now();
      expect(refSpecs(`const a = "${'\\"'.repeat(150000)}\nimport("./a");`)).toEqual(["dynamic:./a"]);
      expect(refSpecs(`const a = '${"\\'".repeat(150000)}\nimport("./b");`)).toEqual(["dynamic:./b"]);
      expect(refSpecs(`const a = /${"\\/".repeat(150000)}\nimport("./c");`)).toEqual(["dynamic:./c"]);
      expect(Date.now() - t0).toBeLessThan(4000);
    });

    test("elements that never close, generic arrows and assertions cost a bounded number of passes", () => {
      const t0 = Date.now();
      expect(refSpecs(`${"<div>".repeat(300000)}\nimport("./a");`)).toEqual(["dynamic:./a"]);
      expect(refSpecs(`${"const f = <T>(a: T) => a;\n".repeat(60000)}import("./b");`)).toEqual(["dynamic:./b"]);
      expect(refSpecs(`${"const a = <any>window;\n".repeat(80000)}import("./c");`)).toEqual(["dynamic:./c"]);
      expect(Date.now() - t0).toBeLessThan(6000);
    });
  });

  describe("on a Next-style repo", () => {
    let r;
    beforeEach(() => {
      r = reach(repo(NEXT_FILES));
    });

    test("graph: references by outcome, kind and file", () => {
      expect(val(r, "reachability.graph.files_parsed")).toBe(19); // 20 census files, the css one is not parsed
      expect(val(r, "reachability.graph.references.total")).toBe(16);
      expect(get(r, "reachability.graph.references.total").detail.byKind).toEqual({
        dynamic: 1, export_from: 1, export_star: 1, import: 10, require: 1, side_effect: 2,
      });
      expect(val(r, "reachability.graph.references.resolved")).toBe(13);
      expect(val(r, "reachability.graph.references.package")).toBe(1); // next/link
      expect(val(r, "reachability.graph.references.outside_census")).toBe(1); // ../../data.json
      expect(val(r, "reachability.graph.references.missing")).toBe(1); // @/nope/missing
      expect(get(r, "reachability.graph.references.missing").detail.specifiers).toEqual(["@/nope/missing"]);
      expect(files(get(r, "reachability.graph.references.missing"))).toEqual(["src/lib/server.ts"]);
      expect(get(r, "reachability.graph.references.missing").perFile).toEqual([{ file: "src/lib/server.ts", count: 1 }]);
      expect(val(r, "reachability.graph.references.nonliteral")).toBe(1);
      expect(files(get(r, "reachability.graph.references.nonliteral"))).toEqual(["src/app/page.tsx"]);
      expect(val(r, "reachability.graph.alias_configs")).toBe(1);
      expect(get(r, "reachability.graph.alias_configs").detail.configs).toEqual([
        { file: "tsconfig.json", baseUrl: "", patterns: ["@/*"] },
      ]);
    });

    test("entry points are Next route files and root special files", () => {
      expect(val(r, "reachability.graph.entries")).toBe(3);
      expect(files(get(r, "reachability.graph.entries"))).toEqual(["src/app/api/x/route.ts", "src/app/layout.tsx", "src/app/page.tsx"]);
      expect(get(r, "reachability.graph.entries").detail).toMatchObject({ app_route: 3, pages_route: 0, special: 0 });
    });

    test("components with no importer: aliases, index files, extension probing and dynamic imports resolve; mentions do not count", () => {
      // 13 component files: ui = index, button, card, dead ; other = Shell, Hero, Sub, Lazy, OnlyType, OnlyByDead, Mention, Dyn, OnlyByTest
      expect(val(r, "reachability.components.ui.total")).toBe(4);
      expect(val(r, "reachability.components.other.total")).toBe(9);
      expect(val(r, "reachability.components.ui.no_importer")).toBe(1);
      expect(files(get(r, "reachability.components.ui.no_importer"))).toEqual(["src/components/ui/dead.tsx"]);
      expect(val(r, "reachability.components.other.no_importer")).toBe(2);
      expect(files(get(r, "reachability.components.other.no_importer"))).toEqual(["src/components/Dyn.tsx", "src/components/Mention.tsx"]);
      expect(val(r, "reachability.components.no_importer")).toBe(3);
      expect(get(r, "reachability.components.no_importer").detail).toEqual({ ui: { count: 1, of: 4 }, other: { count: 2, of: 9 }, of: 13 });
      expect(val(r, "reachability.components.ui.no_importer_ratio")).toBe(0.25);
      expect(val(r, "reachability.components.other.no_importer_ratio")).toBe(0.2222); // 2/9 at 4 dp
      expect(get(r, "reachability.components.other.no_importer_ratio").detail).toEqual({ numerator: 2, denominator: 9 });
    });

    test("a file imported only by a test has an importer, unless tests are ignored", () => {
      expect(files(get(r, "reachability.components.no_importer"))).not.toContain("src/components/OnlyByTest.tsx");
      expect(val(r, "reachability.components.no_importer_excl_tests")).toBe(4);
      expect(files(get(r, "reachability.components.no_importer_excl_tests"))).toEqual([
        "src/components/Dyn.tsx", "src/components/Mention.tsx", "src/components/OnlyByTest.tsx", "src/components/ui/dead.tsx",
      ]);
    });

    test("transitive reachability from the entry points differs from having no importer", () => {
      // not reached: dead (no importer), OnlyByDead (only importer is dead), Mention, Dyn, OnlyByTest (only a test imports it)
      expect(val(r, "reachability.components.unreachable_from_entries")).toBe(5);
      expect(files(get(r, "reachability.components.unreachable_from_entries"))).toEqual([
        "src/components/Dyn.tsx", "src/components/Mention.tsx", "src/components/OnlyByDead.tsx",
        "src/components/OnlyByTest.tsx", "src/components/ui/dead.tsx",
      ]);
      expect(get(r, "reachability.components.unreachable_from_entries").detail).toMatchObject({ computed: true, entries: 3, of: 13 });
    });

    test("a file imported only through `import type` is reported separately", () => {
      expect(val(r, "reachability.components.type_only_import")).toBe(1);
      expect(files(get(r, "reachability.components.type_only_import"))).toEqual(["src/components/OnlyType.tsx"]);
    });

    test("colour hits are split by the resolver, using the drift scanner's hits per file", () => {
      // hits: ui/dead 1 (#ff0000), OnlyByDead 2 (rgb( and #00ff00), Hero 1 (#abcdef), Mention 1 (oklch()
      expect(val(r, "reachability.colour_hits.assessed")).toBe(5);
      expect(val(r, "reachability.colour_hits.in_no_importer_files")).toBe(2); // dead + Mention
      expect(files(get(r, "reachability.colour_hits.in_no_importer_files"))).toEqual(["src/components/Mention.tsx", "src/components/ui/dead.tsx"]);
      expect(val(r, "reachability.colour_hits.in_unreachable_files")).toBe(4); // dead + OnlyByDead + Mention
      expect(get(r, "reachability.colour_hits.in_unreachable_files").perFile).toEqual([
        { file: "src/components/OnlyByDead.tsx", count: 2 },
        { file: "src/components/Mention.tsx", count: 1 },
        { file: "src/components/ui/dead.tsx", count: 1 },
      ]);
      expect(val(r, "reachability.colour_hits.share_in_no_importer_files")).toBe(0.4);
      expect(val(r, "reachability.colour_hits.share_in_unreachable_files")).toBe(0.8);
      expect(get(r, "reachability.colour_hits.share_in_unreachable_files").detail).toEqual({ numerator: 4, denominator: 5 });
    });

    test("every counter states its definition and the report is deterministic", () => {
      for (const c of r.counters) {
        expect(c.definition.summary.length).toBeGreaterThan(10);
        expect(c.definition.fileSet.length).toBeGreaterThan(5);
      }
      const again = reach(repo(NEXT_FILES));
      const strip = (rep) => JSON.stringify({ ...rep, repo: null, scope: { ...rep.scope, missingDirs: [] } });
      expect(strip(again)).toBe(strip(r));
    });
  });

  describe("alias resolution", () => {
    test("follows relative `extends`, baseUrl and paths across a monorepo, using the nearest config", () => {
      const root = repo({
        "tsconfig.base.json": '{ "compilerOptions": { "baseUrl": ".", "paths": { "@ui/*": ["packages/ui/src/*"] } } }',
        "apps/web/tsconfig.json": '{ "extends": "../../tsconfig.base.json" }',
        "apps/docs/tsconfig.json": '{ "compilerOptions": { "baseUrl": "src", "paths": { "~/*": ["*"] } } }',
        "apps/web/src/app/page.tsx": 'import { Button } from "@ui/components/Button";\n',
        "apps/docs/src/app/page.tsx": [
          'import { U } from "~/components/U";',
          'import { V } from "components/V";',
          'import { W } from "@ui/components/Button";',
        ].join("\n"),
        "packages/ui/src/components/Button.tsx": 'import { o } from "@ui/other";\nexport const Button = () => o;\n',
        "packages/ui/src/components/Unused.tsx": "export const Unused = 1;\n",
        "apps/docs/src/components/U.tsx": "export const U = 1;\n",
        "apps/docs/src/components/V.tsx": "export const V = 1;\n",
      });
      const r = reach(root, ["apps", "packages"]);
      // Button (from web via the inherited alias), U (alias to baseUrl), V (bare baseUrl import) are imported; only Unused is not
      expect(val(r, "reachability.components.ui.total") + val(r, "reachability.components.other.total")).toBe(4);
      expect(files(get(r, "reachability.components.no_importer"))).toEqual(["packages/ui/src/components/Unused.tsx"]);
      expect(val(r, "reachability.graph.references.total")).toBe(5);
      expect(val(r, "reachability.graph.references.resolved")).toBe(3);
      expect(val(r, "reachability.graph.references.package")).toBe(2); // docs → @ui/... (no such alias there), Button → @ui/other (no config)
      expect(get(r, "reachability.graph.alias_configs").detail.configs).toEqual([
        { file: "apps/docs/tsconfig.json", baseUrl: "apps/docs/src", patterns: ["~/*"] },
        { file: "apps/web/tsconfig.json", baseUrl: ".", patterns: ["@ui/*"] },
      ]);
    });

    test("reads paths from a referenced config when the nearest tsconfig has none", () => {
      const root = repo({
        "tsconfig.json": '{ "files": [], "references": [{ "path": "./tsconfig.app.json" }] }',
        "tsconfig.app.json": '{ "compilerOptions": { "paths": { "@/*": ["./src/*"] } } }',
        "src/main.tsx": 'import { A } from "@/components/A";\n',
        "src/components/A.tsx": "export const A = 1;\n",
      });
      const r = reach(root);
      expect(val(r, "reachability.components.no_importer")).toBe(0);
      expect(val(r, "reachability.graph.references.resolved")).toBe(1);
    });

    test("understands jsconfig.json and js/jsx files", () => {
      const root = repo({
        "jsconfig.json": '{ "compilerOptions": { "paths": { "#/*": ["./src/*"] } } }',
        "src/index.js": 'import { B } from "#/components/B";\n',
        "src/components/B.jsx": 'export const B = () => null;\n',
        "src/components/C.jsx": 'export const C = () => null;\n',
      });
      const r = reach(root);
      expect(files(get(r, "reachability.components.no_importer"))).toEqual(["src/components/C.jsx"]);
    });

    test("without an alias config an `@/` import is missing, not a package", () => {
      const root = repo({
        "src/app/page.tsx": 'import { A } from "@/components/A";\nimport "react";\n',
        "src/components/A.tsx": "export const A = 1;\n",
      });
      const r = reach(root);
      expect(val(r, "reachability.graph.references.missing")).toBe(1);
      expect(val(r, "reachability.graph.references.package")).toBe(1);
      expect(val(r, "reachability.components.no_importer")).toBe(1); // the alias cannot be followed, so A looks unimported
      expect(get(r, "reachability.graph.alias_configs").notes[0]).toMatch(/only relative specifiers/);
    });

    test("`./x.js` resolves to x.ts, a directory to its index, and an unparsable tsconfig only warns", () => {
      const root = repo({
        "src/a.ts": 'import "./b.js";\nimport "./dir";\nimport "left-pad";\n',
        "src/b.ts": "export {};\n",
        "src/dir/index.tsx": "export {};\n",
        "src/components/Z.tsx": 'import "./Z";\nexport {};\n',
        "tsconfig.json": "{ this is not json",
      });
      const rep = reach(root);
      expect(val(rep, "reachability.graph.references.resolved")).toBe(3);
      expect(files(get(rep, "reachability.components.no_importer"))).toEqual(["src/components/Z.tsx"]); // a self-import is not an importer
      expect(rep.warnings).toContain("could not parse tsconfig.json; its path aliases were ignored");
    });
  });

  describe("entry points and other file kinds", () => {
    test("without a recognised entry point transitive reachability is not computed (and says so)", () => {
      const root = repo({
        "src/main.tsx": 'import { A } from "./components/A";\n',
        "src/components/A.tsx": 'import { B } from "./B";\nexport const A = "#ffffff";\n',
        "src/components/B.tsx": "export const B = 1;\n",
      });
      const r = reach(root);
      expect(val(r, "reachability.graph.entries")).toBe(0);
      expect(val(r, "reachability.components.no_importer")).toBe(0);
      const u = get(r, "reachability.components.unreachable_from_entries");
      expect(u.value).toBe(0);
      expect(u.detail.computed).toBe(false);
      expect(u.notes[0]).toMatch(/no entry points were recognised/);
      expect(val(r, "reachability.colour_hits.in_unreachable_files")).toBe(0);
      expect(get(r, "reachability.colour_hits.in_unreachable_files").detail.computed).toBe(false);
      expect(val(r, "reachability.colour_hits.assessed")).toBe(1);
    });

    test("recognises pages-router files and the root special files, but not test files", () => {
      const root = repo({
        "src/pages/index.tsx": "export default null;\n",
        "src/pages/api/hello.ts": "export default null;\n",
        "src/middleware.ts": "export {};\n",
        "src/app/not-found.tsx": "export default null;\n",
        "src/app/page.test.tsx": "test('x', () => {});\n",
        "src/lib/middleware.ts": "export {};\n",
        "src/components/pages/Card.tsx": "export {};\n",
      });
      const r = reach(root);
      expect(files(get(r, "reachability.graph.entries"))).toEqual([
        "src/app/not-found.tsx", "src/middleware.ts", "src/pages/api/hello.ts", "src/pages/index.tsx",
      ]);
      expect(get(r, "reachability.graph.entries").detail).toMatchObject({ app_route: 1, pages_route: 2, special: 1 });
    });

    test("reads the <script> blocks of vue and svelte files", () => {
      const root = repo({
        "src/components/Parent.vue": '<template><Child /></template>\n<script>\nimport Child from "./Child.vue";\nimport Leaf from "./Leaf.svelte";\n</script>\n<style>.a { color: red; }</style>\n',
        "src/components/Child.vue": '<script setup lang="ts">\nexport default {};\n</script>\n',
        "src/components/Leaf.svelte": "<script>\n  let x = 1;\n</script>\n<p>{x}</p>\n",
      });
      const r = reach(root);
      expect(files(get(r, "reachability.components.no_importer"))).toEqual(["src/components/Parent.vue"]);
      expect(val(r, "reachability.graph.references.resolved")).toBe(2);
    });
  });

  describe("app-router entry points are the root app directory of a Next.js package", () => {
    const entries = (root, dirs = ["src"]) => files(get(reach(root, dirs), "reachability.graph.entries"));
    const NEXT_PKG = '{ "dependencies": { "next": "15.0.0" } }';

    test("components/app/, private _folders and nested look-alikes are ordinary files; @slots and (groups) are routes", () => {
      const root = repo({
        "src/app/page.tsx": "export default null;\n",
        "src/app/(shop)/cart/page.tsx": "export default null;\n",
        "src/app/@modal/login/page.tsx": "export default null;\n",
        "src/app/_components/icon.tsx": "export default null;\n",
        "src/app/blog/_lib/loading.tsx": "export default null;\n",
        "src/components/app/loading.tsx": "export default null;\n",
        "src/lib/app/error.tsx": "export default null;\n",
        "src/app/blog/not-a-route.tsx": "export default null;\n",
      });
      expect(entries(root)).toEqual(["src/app/(shop)/cart/page.tsx", "src/app/@modal/login/page.tsx", "src/app/page.tsx"]);
    });

    test("app/ at the repo root, src/app/ and a workspace package's app/ are roots", () => {
      const root = repo({
        "app/layout.tsx": "export default null;\n",
        "apps/web/src/app/page.tsx": "export default null;\n",
        "apps/web/app/error.tsx": "export default null;\n",
        "packages/site/app/loading.tsx": "export default null;\n",
        "examples/demo/src/app/not-found.tsx": "export default null;\n",
        "tools/gen/src/app/page.tsx": "export default null;\n",
      });
      expect(entries(root, ["app", "apps", "packages", "examples", "tools"])).toEqual([
        "app/layout.tsx", "apps/web/app/error.tsx", "apps/web/src/app/page.tsx", "examples/demo/src/app/not-found.tsx", "packages/site/app/loading.tsx",
      ]);
    });

    test("a directory with a package.json is a root, whatever it is called", () => {
      const root = repo({
        "frontend/package.json": NEXT_PKG,
        "frontend/src/app/page.tsx": "export default null;\n",
        "frontend/src/app/api/route.ts": "export const GET = 1;\n",
      });
      expect(entries(root, ["frontend"])).toEqual(["frontend/src/app/api/route.ts", "frontend/src/app/page.tsx"]);
    });

    test("a package.json that does not name next means another framework's app/ directory", () => {
      const remix = repo({
        "package.json": '{ "dependencies": { "@remix-run/react": "2.0.0", "react": "18" } }',
        "app/root.tsx": "export default null;\n",
        "app/routes/error.tsx": "export default null;\n",
        "app/routes/icon.tsx": "export default null;\n",
        "app/routes/page.tsx": "export default null;\n",
      });
      expect(entries(remix, ["app"])).toEqual([]);
      for (const key of ["dependencies", "devDependencies", "peerDependencies", "optionalDependencies"]) {
        const root = repo({ "package.json": JSON.stringify({ [key]: { next: "15" } }), "app/page.tsx": "export default null;\n" });
        expect(entries(root, ["app"])).toEqual(["app/page.tsx"]);
      }
      const byConfig = repo({ "package.json": '{ "name": "x" }', "next.config.mjs": "export default {};\n", "src/app/page.tsx": "export default null;\n" });
      expect(entries(byConfig)).toEqual(["src/app/page.tsx"]);
    });

    test("a package.json that cannot be read cannot rule Next out; with none at all the folder structure decides", () => {
      expect(entries(repo({ "package.json": "{ not json", "src/app/page.tsx": "export default null;\n" }))).toEqual(["src/app/page.tsx"]);
      expect(entries(repo({ "src/app/page.tsx": "export default null;\n" }))).toEqual(["src/app/page.tsx"]);
    });

    test("with no package.json, an app/ directory is Next's only if it holds a route file at its top, or directly under a (group)", () => {
      // a manifest-less repo with a Remix-style app/routes/ next to the real Next app
      const mixed = repo({
        "src/app/page.tsx": "export default null;\n",
        "src/app/_components/icon.tsx": "export default null;\n",
        "src/components/app/loading.tsx": "export default null;\n",
        "app/routes/error.tsx": "export default null;\n",
        "app/routes/page.tsx": "export default null;\n",
        "app/root.tsx": "export default null;\n",
      });
      expect(entries(mixed, ["src", "app"])).toEqual(["src/app/page.tsx"]);
      // several root layouts: nothing at the top, route files directly under route groups
      const groups = repo({
        "src/app/(marketing)/layout.tsx": "export default null;\n",
        "src/app/(marketing)/about/page.tsx": "export default null;\n",
        "src/app/(shop)/(eu)/page.tsx": "export default null;\n",
        "src/lib/util.ts": "export {};\n",
      });
      expect(entries(groups)).toEqual(["src/app/(marketing)/about/page.tsx", "src/app/(marketing)/layout.tsx", "src/app/(shop)/(eu)/page.tsx"]);
      // a route file one plain folder down does not make the folder an app root
      expect(entries(repo({ "app/blog/page.tsx": "export default null;\n" }), ["app"])).toEqual([]);
    });

    test("the app directory is judged on disk, so auditing only a sub-folder of it keeps its routes", () => {
      const root = repo({
        "src/app/layout.tsx": "export default null;\n",
        "src/app/dashboard/page.tsx": "export default null;\n",
        "src/app/dashboard/_ui/loading.tsx": "export default null;\n",
      });
      expect(entries(root, ["src/app/dashboard"])).toEqual(["src/app/dashboard/page.tsx"]);
    });

    test("test files are never entries, whatever their folder is called", () => {
      const root = repo({
        "src/app/page.tsx": "export default null;\n",
        "src/app/__tests__/page.tsx": "export default null;\n",
        "src/app/layout.test.tsx": "export default null;\n",
        "src/pages/__tests__/index.tsx": "export default null;\n",
      });
      expect(entries(root)).toEqual(["src/app/page.tsx"]);
    });

    test("a component under components/app/ is reported as unimported, not hidden as an entry", () => {
      const r = reach(repo({
        "src/app/page.tsx": "export default null;\n",
        "src/components/app/loading.tsx": "export default null;\n",
      }));
      expect(files(get(r, "reachability.components.no_importer"))).toEqual(["src/components/app/loading.tsx"]);
      expect(files(get(r, "reachability.components.unreachable_from_entries"))).toEqual(["src/components/app/loading.tsx"]);
    });
  });

  describe("the graph counts what was read", () => {
    test("a file over 5 MB is skipped: not parsed, listed as unread, and its imports are unknown", () => {
      const root = repo({
        "src/components/A.tsx": "export const A = 1;\n",
        "src/main.ts": 'import "./components/A";\n',
        "src/empty.ts": "",
      });
      fs.writeFileSync(path.join(root, "src/huge.ts"), `import "./components/A";\n${"x".repeat(6 * 1024 * 1024)}\n`);
      const r = reach(root);
      expect(val(r, "reachability.graph.files_parsed")).toBe(3); // A, main and the empty file (read, no imports); not huge
      const unread = get(r, "reachability.graph.files_skipped_unread");
      expect(unread.value).toBe(1);
      expect(files(unread)).toEqual(["src/huge.ts"]);
      expect(unread.notes.join(" ")).toMatch(/no_importer/);
      expect(val(r, "reachability.graph.references.total")).toBe(1);
    });

    test("with nothing skipped the unread counter is 0", () => {
      const r = reach(repo({ "src/a.ts": "export const a = 1;\n" }));
      expect(val(r, "reachability.graph.files_skipped_unread")).toBe(0);
      expect(get(r, "reachability.graph.files_skipped_unread").notes).toBeUndefined();
    });

    test("upper-case characters whose lower-case form is longer do not shift the <script> offsets", () => {
      for (const n of [0, 1, 3, 12]) {
        const root = repo({
          "src/components/Parent.vue": `<template><h1>${"İ".repeat(n)}stanbul</h1></template>\n<script>\nimport Child from "./Child.vue";\n</script>\n`,
          "src/components/Child.vue": "<script>export default {};</script>\n",
        });
        const r = reach(root);
        expect(val(r, "reachability.graph.references.resolved")).toBe(1);
        expect(files(get(r, "reachability.components.no_importer"))).toEqual(["src/components/Parent.vue"]);
      }
      const upper = repo({
        "src/components/Parent.vue": '<TEMPLATE></TEMPLATE>\n<SCRIPT setup>\nimport Child from "./Child.vue";\n</SCRIPT>\n',
        "src/components/Child.vue": "<script>export default {};</script>\n",
      });
      expect(val(reach(upper), "reachability.graph.references.resolved")).toBe(1);
    });

    test(".ts files never read markup: an angle-bracket assertion does not hide the import after it", () => {
      const root = repo({
        "src/components/A.ts": "export const A = 1;\n",
        "src/main.ts": 'const el = <HTMLElement>document.body;\nconst f = <T>(x: T) => x;\nimport("./components/A");\n',
      });
      const r = reach(root);
      expect(val(r, "reachability.graph.references.resolved")).toBe(1);
      expect(val(r, "reachability.components.no_importer")).toBe(0);
    });

    test("the same markup is an element in a .tsx file and code in a .ts file", () => {
      const text = 'export const a = <b>\nimport q from "./inside";\n</b>;\n';
      const root = repo({ "src/a.ts": text, "src/b.tsx": text, "src/c.js": text, "src/d.jsx": text, "src/inside.ts": "export const q = 1;\n" });
      const r = reach(root);
      expect(val(r, "reachability.graph.references.resolved")).toBe(1); // only a.ts reads the import in the "text"
      expect(val(r, "reachability.graph.references.total")).toBe(1);
    });

    test("JSX text in a .tsx file does not create an edge to the file it mentions", () => {
      const root = repo({
        "tsconfig.json": '{ "compilerOptions": { "paths": { "@/*": ["./src/*"] } } }',
        "src/app/page.tsx": 'export default () => <code>import { Button } from "@/components/ui/button"</code>;\n',
        "src/components/ui/button.tsx": "export const Button = 1;\n",
      });
      const r = reach(root);
      expect(val(r, "reachability.graph.references.total")).toBe(0);
      expect(files(get(r, "reachability.components.no_importer"))).toEqual(["src/components/ui/button.tsx"]);
    });
  });

  describe("resolution details", () => {
    test("the longest alias prefix wins, whatever order the patterns are written in", () => {
      const tree = (paths) => ({
        "tsconfig.json": JSON.stringify({ compilerOptions: { paths } }),
        "src/main.ts": 'import "@/ui/button";\nimport "@/lib/util";\nimport "@/ui/exact";\n',
        "src/ui/button.ts": "export {};\n", // what the shorter pattern "@/*" would pick
        "src/ui/exact.ts": "export {};\n",
        "src/components/ui/button.ts": "export {};\n",
        "src/components/exact.ts": "export {};\n",
        "src/lib/util.ts": "export {};\n",
      });
      const general = ["./src/*"];
      const ui = ["./src/components/ui/*"];
      const exact = ["./src/components/exact.ts"];
      for (const paths of [
        { "@/*": general, "@/ui/*": ui, "@/ui/exact": exact },
        { "@/ui/exact": exact, "@/ui/*": ui, "@/*": general },
      ]) {
        const r = reach(repo(tree(paths)));
        expect(val(r, "reachability.graph.references.resolved")).toBe(3);
        expect(val(r, "reachability.graph.references.missing")).toBe(0);
        expect(files(get(r, "reachability.components.no_importer"))).toEqual([]); // both components/ files were reached
      }
    });

    test("a ?query or #hash after a specifier is ignored, and a leading / is relative to the repo root", () => {
      const root = repo({
        "src/main.ts": 'import "./a?raw";\nimport "./b#frag";\nimport "/src/c";\nimport "?x";\n',
        "src/a.ts": "export {};\n",
        "src/b.ts": "export {};\n",
        "src/c.ts": "export {};\n",
      });
      const r = reach(root);
      expect(val(r, "reachability.graph.references.resolved")).toBe(3);
      expect(val(r, "reachability.graph.references.missing")).toBe(1); // "?x" has nothing before the query
    });

    test("a file imported by value and by `import type` is not a type-only import, in either order", () => {
      const root = repo({
        "src/components/B.ts": "export type T = 1;\nexport const v = 1;\n",
        "src/components/C.ts": "export type T = 1;\n",
        "src/components/D.ts": "export type T = 1;\nexport const v = 1;\n",
        "src/a.ts": 'import type { T } from "./components/B";\nimport { v } from "./components/B";\nimport type { T as U } from "./components/C";\n',
        "src/b.ts": 'import { v } from "./components/D";\nimport type { T } from "./components/D";\n',
      });
      const r = reach(root);
      expect(files(get(r, "reachability.components.type_only_import"))).toEqual(["src/components/C.ts"]);
    });

    test("a file imported by two files, one by type only, is not type-only", () => {
      const root = repo({
        "src/components/B.ts": "export type T = 1;\n",
        "src/a.ts": 'import type { T } from "./components/B";\n',
        "src/b.ts": 'import "./components/B";\n',
      });
      expect(val(reach(root), "reachability.components.type_only_import")).toBe(0);
    });

    test("components/ is a path segment: mycomponents/ is not a component folder, and mycomponents/ui/ is not the ui folder", () => {
      const root = repo({
        "src/mycomponents/Foo.tsx": "export const Foo = 1;\n",
        "src/mycomponents/ui/Bar.tsx": "export const Bar = 1;\n",
        "src/components/ui/Baz.tsx": "export const Baz = 1;\n",
        "src/components/Qux.tsx": "export const Qux = 1;\n",
      });
      const r = reach(root);
      expect(val(r, "reachability.components.ui.total")).toBe(1);
      expect(val(r, "reachability.components.other.total")).toBe(1);
      expect(files(get(r, "reachability.components.no_importer"))).toEqual(["src/components/Qux.tsx", "src/components/ui/Baz.tsx"]);
      // inside a real components/ folder, mycomponents/ui/ is still not the ui folder
      const nested = reach(repo({ "src/components/mycomponents/ui/X.tsx": "export const X = 1;\n", "src/components/ui/Y.tsx": "export const Y = 1;\n" }));
      expect(val(nested, "reachability.components.ui.total")).toBe(1);
      expect(val(nested, "reachability.components.other.total")).toBe(1);
    });
  });

  describe("colour hits split by reachability", () => {
    test("an entry point has an importer (the framework), so its colour hits are not in unimported files", () => {
      const root = repo({
        "src/app/page.tsx": 'export default () => <i style={{ color: "#ff0000" }} />;\n',
        "src/lib/dead.ts": 'export const c = "#00ff00";\n',
      });
      const r = reach(root);
      expect(val(r, "reachability.colour_hits.assessed")).toBe(2);
      expect(val(r, "reachability.colour_hits.in_no_importer_files")).toBe(1);
      expect(files(get(r, "reachability.colour_hits.in_no_importer_files"))).toEqual(["src/lib/dead.ts"]);
      expect(val(r, "reachability.colour_hits.in_unreachable_files")).toBe(1);
      expect(val(r, "reachability.colour_hits.share_in_no_importer_files")).toBe(0.5);
    });

    test("only colour hits are tallied: px hits and css files are not", () => {
      const root = repo({
        "src/app/page.tsx": "export default () => <i style={{ width: '10px', height: '20px' }} />;\n",
        "src/lib/dead.ts": 'export const c = "#00ff00";\n',
        "src/lib/style.css": ".a { color: #123456; width: 4px; }\n.b { background: rgb(0, 0, 0); }\n",
      });
      const r = reach(root);
      expect(val(r, "reachability.colour_hits.assessed")).toBe(1);
      const assessed = get(r, "reachability.colour_hits.assessed");
      expect(assessed.detail).toEqual({ filesWithHits: 1, notAssessed: 2, skippedUnread: 0 });
      expect(assessed.notes.join(" ")).toMatch(/2 further hit\(s\) sit in css files/);
      expect(val(r, "reachability.colour_hits.in_no_importer_files")).toBe(1);
    });

    test("a test file importing a component makes it imported, so the colour hits in it are not in unimported files", () => {
      const root = repo({
        "src/lib/tested.ts": 'export const c = "#00ff00";\n',
        "src/lib/tested.test.ts": 'import "./tested";\n',
      });
      const r = reach(root);
      expect(val(r, "reachability.colour_hits.assessed")).toBe(1);
      expect(val(r, "reachability.colour_hits.in_no_importer_files")).toBe(0);
    });
  });

  describe("resolution edge cases", () => {
    test("tsconfig extends: with or without .json, a directory, an array, a package (ignored), a cycle and a long chain", () => {
      // baseUrl is relative to the config that declares it, so each one points back at the repo root
      const aliasTo = (dir, baseUrl) => JSON.stringify({ compilerOptions: { baseUrl, paths: { "@x/*": [`${dir}/*`] } } });
      const tree = (extendsValue, extra = {}) => ({
        "base.json": aliasTo("lib", "."),
        "cfg/tsconfig.base.json": aliasTo("lib", ".."),
        "cfg/dir/tsconfig.json": aliasTo("lib", "../.."),
        "app/tsconfig.json": JSON.stringify({ extends: extendsValue }),
        "app/main.ts": 'import "@x/a";\n',
        "lib/a.ts": "export {};\n",
        ...extra,
      });
      const resolved = (extendsValue, extra) => val(reach(repo(tree(extendsValue, extra)), ["app", "lib"]), "reachability.graph.references.resolved");
      expect(resolved("../base")).toBe(1);
      expect(resolved("../base.json")).toBe(1);
      expect(resolved("../cfg/dir")).toBe(1);
      expect(resolved(["../nothing", "../cfg/tsconfig.base"])).toBe(1);
      expect(resolved("@scope/tsconfig-base")).toBe(0); // a package config is not followed
      expect(resolved("base.json")).toBe(0); // not relative
      expect(resolved("../../outside")).toBe(0);
      // a config that extends itself terminates
      expect(resolved("./tsconfig.json")).toBe(0);
      // a chain of nine configs: the ninth link is past the follow limit
      const chain = {};
      for (let i = 1; i <= 10; i++) chain[`c${i}/tsconfig.json`] = JSON.stringify({ extends: i < 10 ? `../c${i + 1}/tsconfig.json` : undefined, ...(i === 10 ? { compilerOptions: { baseUrl: "..", paths: { "@x/*": ["lib/*"] } } } : {}) });
      expect(val(reach(repo({ ...chain, "c1/main.ts": 'import "@x/a";\n', "lib/a.ts": "export {};\n" }), ["c1", "lib"]), "reachability.graph.references.resolved")).toBe(0);
      const shortChain = {};
      for (let i = 1; i <= 5; i++) shortChain[`c${i}/tsconfig.json`] = JSON.stringify({ extends: i < 5 ? `../c${i + 1}/tsconfig.json` : undefined, ...(i === 5 ? { compilerOptions: { baseUrl: "..", paths: { "@x/*": ["lib/*"] } } } : {}) });
      expect(val(reach(repo({ ...shortChain, "c1/main.ts": 'import "@x/a";\n', "lib/a.ts": "export {};\n" }), ["c1", "lib"]), "reachability.graph.references.resolved")).toBe(1);
    });

    test("references: the first referenced config that supplies paths wins; a later one is not needed", () => {
      const root = repo({
        "tsconfig.json": '{ "files": [], "references": [{ "path": "./tsconfig.node.json" }, { "path": "./tsconfig.app.json" }, { "path": "./tsconfig.other.json" }] }',
        "tsconfig.node.json": '{ "compilerOptions": { "strict": true } }',
        "tsconfig.app.json": '{ "compilerOptions": { "paths": { "@/*": ["./src/*"] } } }',
        "tsconfig.other.json": '{ "compilerOptions": { "paths": { "@/*": ["./nowhere/*"] } } }',
        "src/main.ts": 'import "@/components/A";\n',
        "src/components/A.ts": "export {};\n",
      });
      expect(val(reach(root), "reachability.graph.references.resolved")).toBe(1);
    });

    test("jsconfig.json is used when there is no tsconfig.json beside it, and tsconfig.json wins when both exist", () => {
      const both = repo({
        "tsconfig.json": '{ "compilerOptions": { "paths": { "@/*": ["./ts/*"] } } }',
        "jsconfig.json": '{ "compilerOptions": { "paths": { "@/*": ["./js/*"] } } }',
        "src/main.ts": 'import "@/a";\n',
        "ts/a.ts": "export {};\n",
        "js/a.ts": "export {};\n",
      });
      const r = reach(both, ["src", "ts", "js"]);
      expect(get(r, "reachability.graph.alias_configs").detail.configs.map((c) => c.file)).toEqual(["tsconfig.json"]);
      expect(val(r, "reachability.graph.references.resolved")).toBe(1);
    });

    test("an alias to a file outside the census is outside (not missing); a pattern with no prefix is not an alias", () => {
      const root = repo({
        "tsconfig.json": '{ "compilerOptions": { "paths": { "@data/*": ["./data/*"], "*": ["./src/*"] } } }',
        "data/x.json": "{}",
        "src/main.ts": 'import "@data/x.json";\nimport "@data/nope";\nimport "react";\nimport "util";\nimport "@/lib/a";\n',
        "src/util.ts": "export {};\n",
      });
      const r = reach(root);
      expect(val(r, "reachability.graph.references.outside_census")).toBe(1); // @data/x.json
      expect(val(r, "reachability.graph.references.missing")).toBe(2); // @data/nope and @/lib/a: nothing maps them
      expect(val(r, "reachability.graph.references.package")).toBe(1); // react: "*" maps to ./src/react, which is missing, so it stays a package
      expect(val(r, "reachability.graph.references.resolved")).toBe(1); // util through "*"
    });

    test("an empty capture resolves to the index file, and a bare @ or ~ with no alias is missing, not a package", () => {
      const root = repo({
        "tsconfig.json": '{ "compilerOptions": { "paths": { "@/*": ["./src/*"] } } }',
        "src/index.ts": "export {};\n",
        "src/main.ts": 'import "@/";\n',
      });
      expect(val(reach(root), "reachability.graph.references.resolved")).toBe(1);
      const none = repo({ "src/a.ts": 'import "~/x";\nimport "~";\nimport "@";\nimport "@/y";\n' });
      const r = reach(none);
      expect(val(r, "reachability.graph.references.missing")).toBe(4);
      expect(val(r, "reachability.graph.references.package")).toBe(0);
    });

    test("package-looking specifiers: scoped, subpath, protocol and bundler-prefixed ones are packages", () => {
      const r = reach(repo({
        "src/a.ts": 'import "react";\nimport "@scope/pkg/sub";\nimport "node:fs";\nimport "https://cdn.example.com/x.js";\nimport "$lib/x";\nimport "#internal/x";\nimport "left-pad";\n',
      }));
      expect(val(r, "reachability.graph.references.package")).toBe(7);
      expect(val(r, "reachability.graph.references.missing")).toBe(0);
    });

    test("an import of a json or markdown file, or of a directory index that is not parsed, is outside the census", () => {
      const r = reach(repo({
        "src/a.ts": 'import "./data";\nimport "./notes";\nimport "./dir";\nimport "./sub/deep";\n',
        "src/data.json": "{}",
        "src/notes.md": "x",
        "src/dir/index.mdx": "x",
        "src/sub/deep/index.svg": "<svg/>",
      }));
      expect(val(r, "reachability.graph.references.outside_census")).toBe(4);
      expect(val(r, "reachability.graph.references.missing")).toBe(0);
    });

    test("../ above the repo root is outside, and a dir that is also a file name resolves to the file", () => {
      const r = reach(repo({
        "src/a.ts": 'import "../../elsewhere";\nimport "../x";\nimport "./b";\n',
        "src/b.ts": "export {};\n",
        "src/b/index.ts": "export {};\n",
        "x.ts": "export {};\n",
      }), ["src", "x.ts"]);
      expect(val(r, "reachability.graph.references.outside_census")).toBe(1); // ../../elsewhere
      expect(val(r, "reachability.graph.references.resolved")).toBe(2); // ../x -> x.ts and ./b -> b.ts (not b/index.ts)
    });

    test("one .vue file with several <script> blocks, attributes and an unclosed one", () => {
      const root = repo({
        "src/components/Multi.vue": '<script>\nimport A from "./A.vue";\n</script>\n<template><div /></template>\n<script lang="ts" setup>\nimport B from "./B.vue";\n</script>\n<script>\nimport C from "./C.vue";\n',
        "src/components/A.vue": "<script>export default {};</script>\n",
        "src/components/B.vue": "<script>export default {};</script>\n",
        "src/components/C.vue": "<script>export default {};</script>\n",
        "src/components/D.vue": "<script>export default {};</script>\n",
      });
      const r = reach(root);
      expect(val(r, "reachability.graph.references.resolved")).toBe(3);
      expect(files(get(r, "reachability.components.no_importer"))).toEqual(["src/components/D.vue", "src/components/Multi.vue"]);
    });

    test("a tsconfig with comments at the very end, an escaped quote and a trailing comma is still read", () => {
      const root = repo({
        "tsconfig.json": '{\n  "compilerOptions": {\n    "paths": { "@/*": ["./src/*",], "@q\\"/*": ["./src/*"] },\n  },\n} // the end',
        "src/main.ts": 'import "@/a";\n',
        "src/a.ts": "export {};\n",
      });
      expect(val(reach(root), "reachability.graph.references.resolved")).toBe(1);
      expect(JSON.parse(stripJsonc('{ "a": 1 } /* never closed'))).toEqual({ a: 1 });
      expect(JSON.parse(stripJsonc('{ "a": [1, 2,\n],\n "b": "x\\"y,}" }'))).toEqual({ a: [1, 2], b: 'x"y,}' });
      expect(stripJsonc('{ // no newline at the end')).toBe("{ ");
    });

    test("the primitives and reachability groups share one parse and give the same numbers together as apart", () => {
      const root = repo(NEXT_FILES);
      const both = run(root, { dirs: ["src"], groups: ["primitives", "reachability"] });
      const only = (g) => run(root, { dirs: ["src"], groups: [g] }).counters;
      expect(both.counters).toEqual([...only("primitives"), ...only("reachability")].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)));
    });

    test("components that only a test imports: the excl_tests counter splits ui and other", () => {
      const r = reach(repo(NEXT_FILES));
      expect(get(r, "reachability.components.no_importer_excl_tests").detail).toEqual({
        of: 13, ui: { count: 1, of: 4 }, other: { count: 3, of: 9 },
      });
    });
  });

  describe("configuration files and counters in detail", () => {
    test("a config chain is followed through nine links; a config that is not an object is ignored", () => {
      const link = (n, last) => `c${n}/tsconfig.json`.length && JSON.stringify(n < last ? { extends: `../c${n + 1}/tsconfig.json` } : { compilerOptions: { baseUrl: "..", paths: { "@x/*": ["lib/*"] } } });
      const chain = (n) => {
        const f = { "c1/main.ts": 'import "@x/a";\n', "lib/a.ts": "export {};\n" };
        for (let i = 1; i <= n; i++) f[`c${i}/tsconfig.json`] = link(i, n);
        return f;
      };
      const resolved = (n) => val(reach(repo(chain(n)), ["c1", "lib"]), "reachability.graph.references.resolved");
      expect(resolved(9)).toBe(1);
      expect(resolved(10)).toBe(0);
      for (const content of ["5", '"text"', "[1, 2]", "null", "// only a comment\n5"]) {
        const r = reach(repo({ "tsconfig.json": content, "src/main.ts": 'import "./a";\nimport "@/b";\n', "src/a.ts": "export {};\n" }));
        expect(val(r, "reachability.graph.references.resolved")).toBe(1);
        expect(val(r, "reachability.graph.alias_configs")).toBe(0);
      }
    });

    test("odd extends and references entries are skipped without error", () => {
      const root = repo({
        "tsconfig.json": JSON.stringify({
          extends: [5, null, "../x", "./tsconfig.base.json"],
          references: [null, 7, { path: 3 }, { path: "../outside" }, { path: "./tsconfig.app.json" }],
        }),
        "tsconfig.base.json": "{}",
        "tsconfig.app.json": '{ "compilerOptions": { "paths": { "@/*": ["./src/*"] } } }',
        "src/main.ts": 'import "@/a";\n',
        "src/a.ts": "export {};\n",
      });
      expect(val(reach(root), "reachability.graph.references.resolved")).toBe(1);
      const numeric = repo({ "tsconfig.json": '{ "extends": 5 }', "src/main.ts": 'import "./a";\n', "src/a.ts": "export {};\n" });
      expect(val(reach(numeric), "reachability.graph.references.resolved")).toBe(1);
    });

    test("only configs that supply paths or a baseUrl count as alias configs", () => {
      const root = repo({
        "a/tsconfig.json": '{ "compilerOptions": { "strict": true } }',
        "a/main.ts": 'import "@/x";\n',
        "a/x.ts": "export {};\n",
        "b/tsconfig.json": '{ "compilerOptions": { "baseUrl": "src" } }',
        "b/main.ts": 'import "@/x";\n',
        "b/x.ts": "export {};\n",
        "c/tsconfig.json": '{ "compilerOptions": { "paths": { "@/*": ["./*"] } } }',
        "c/main.ts": 'import "@/x";\n',
        "c/x.ts": "export {};\n",
      });
      const r = reach(root, ["a", "b", "c"]);
      expect(get(r, "reachability.graph.alias_configs").detail.configs.map((c) => c.file)).toEqual(["b/tsconfig.json", "c/tsconfig.json"]);
      expect(val(r, "reachability.graph.alias_configs")).toBe(2);
    });

    test("stripJsonc handles empty objects and arrays before anything else, and a comment glued to the next token", () => {
      expect(JSON.parse(stripJsonc("{ } // c"))).toEqual({});
      expect(JSON.parse(stripJsonc("[ ] // c"))).toEqual([]);
      expect(JSON.parse(stripJsonc('{ /* c */"a": 1 }'))).toEqual({ a: 1 });
      expect(JSON.parse(stripJsonc('{ "a": /* c */1, // d\n"b": 2 }'))).toEqual({ a: 1, b: 2 });
    });

    test("membership counters list each file once", () => {
      const r = reach(repo(NEXT_FILES));
      expect(get(r, "reachability.components.no_importer").perFile).toEqual([
        { file: "src/components/Dyn.tsx", count: 1 }, { file: "src/components/Mention.tsx", count: 1 }, { file: "src/components/ui/dead.tsx", count: 1 },
      ]);
      expect(get(r, "reachability.graph.entries").perFile.every((p) => p.count === 1)).toBe(true);
    });

    test("transitive reachability starts from every entry point, the first one included", () => {
      const root = repo({
        "src/app/a/page.tsx": 'import { OnlyA } from "../../components/OnlyA";\nexport default OnlyA;\n',
        "src/app/b/page.tsx": 'import { OnlyB } from "../../components/OnlyB";\nexport default OnlyB;\n',
        "src/app/layout.tsx": "export default null;\n",
        "src/components/OnlyA.tsx": 'import { Deep } from "./Deep";\nexport const OnlyA = Deep;\n',
        "src/components/OnlyB.tsx": "export const OnlyB = 1;\n",
        "src/components/Deep.tsx": "export const Deep = 1;\n",
        "src/components/Dead.tsx": "export const Dead = 1;\n",
      });
      const r = reach(root);
      expect(files(get(r, "reachability.components.unreachable_from_entries"))).toEqual(["src/components/Dead.tsx"]);
    });
  });

  describe("robustness", () => {
    test("malformed vue markup (unclosed and look-alike script tags) is scanned linearly", () => {
      const root = repo({
        "src/components/Broken.vue": `${"<scripty>x</scripty>\n<script".repeat(20000)}>\nimport A from "./A.vue";\n`,
        "src/components/A.vue": "<script>export default {};</script>\n",
      });
      const t0 = Date.now();
      const r = reach(root);
      expect(Date.now() - t0).toBeLessThan(5000);
      expect(val(r, "reachability.graph.references.resolved")).toBe(1); // the unclosed <script> runs to the end of the file
    });

    test("when the drift scanner cannot run, the colour tallies are 0 and the cause is reported, not thrown", () => {
      jest.isolateModules(() => {
        jest.doMock("../../../src/commands/drift", () => ({
          scanProject() { throw new Error("scanner exploded"); },
        }));
        const { runCounters } = require("../../../src/lib/counters");
        const rep = runCounters(repo({ "src/components/A.tsx": 'export const A = "#ffffff";\n' }), { dirs: ["src"], groups: ["reachability"] });
        expect(val(rep, "reachability.colour_hits.assessed")).toBe(0);
        expect(get(rep, "reachability.colour_hits.assessed").notes.join(" ")).toMatch(/scanner exploded/);
        expect(rep.warnings.some((w) => w.includes("scanner exploded"))).toBe(true);
        jest.dontMock("../../../src/commands/drift");
      });
    });

    test("an empty repo and a missing dir give zero counters, a null ratio and a note, never an error", () => {
      const r = reach(repo({ "README.md": "# nothing" }), ["src"]);
      expect(r.counters.length).toBeGreaterThan(20);
      expect(val(r, "reachability.graph.files_parsed")).toBe(0);
      expect(val(r, "reachability.components.no_importer")).toBe(0);
      const ratio = get(r, "reachability.components.ui.no_importer_ratio");
      expect(ratio.value).toBeNull();
      expect(ratio.notes.join(" ")).toMatch(/denominator is 0/);
      expect(val(r, "reachability.colour_hits.in_no_importer_files")).toBe(0);
      expect(r.scope.missingDirs).toEqual(["src"]);
    });

    test("non-UTF-8 bytes, a BOM, CRLF and a directory with spaces do not break import discovery", () => {
      const root = repo({
        "my app/src/main.tsx": '\uFEFFimport { A } from "./components/A";\r\nimport { B } from "./components/B";\r\n',
        "my app/src/components/A.tsx": "export const A = 1;\r\n",
        "my app/src/components/B.tsx": "export const B = 1;\n",
      });
      fs.writeFileSync(path.join(root, "my app/src/binary.ts"), Buffer.concat([Buffer.from([0xff, 0xfe, 0x00, 0x80, 0x0a]), Buffer.from('import "./components/A";\n')]));
      const r = reach(root, ["my app/src"]);
      expect(val(r, "reachability.graph.references.resolved")).toBe(3);
      expect(val(r, "reachability.components.no_importer")).toBe(0);
    });

    test("a file over 5 MB is skipped with a warning; a one-line minified file parses quickly", () => {
      const root = repo({
        "src/components/A.tsx": "export const A = 1;\n",
        "src/main.ts": 'import "./components/A";\n',
      });
      fs.writeFileSync(path.join(root, "src/huge.ts"), `import "./components/A";\nexport const c = "#ffffff";\n${"x".repeat(6 * 1024 * 1024)}\n`);
      const minified = `${'var a=b/c/d,e="it\'s",f=`t${g}`,h=/[\'"]/g;'.repeat(40000)}import("./components/A");`;
      fs.writeFileSync(path.join(root, "src/min.js"), minified);
      const t0 = Date.now();
      const r = reach(root);
      expect(Date.now() - t0).toBeLessThan(5000);
      expect(r.warnings.some((w) => w.startsWith("skipped (over 5 MB)") && w.includes("src/huge.ts"))).toBe(true);
      expect(val(r, "reachability.graph.references.resolved")).toBe(2); // main.ts and min.js; the huge file is not read
      // one reader for the whole run: the scanner skipped the huge file too, so there is no colour hit of it to leave out
      expect(val(r, "reachability.colour_hits.assessed")).toBe(0);
      expect(val(r, "reachability.colour_hits.in_no_importer_files")).toBe(0);
      expect(get(r, "reachability.colour_hits.assessed").detail.skippedUnread).toBe(0);
    });
  });
});
