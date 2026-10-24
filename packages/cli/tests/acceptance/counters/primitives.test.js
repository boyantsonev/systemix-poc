/**
 * primitives.test.js — acceptance tests for the `primitives` counters: raw
 * <button>/<input> against <Button>/<Input>, <Badge> tags and the definition
 * each one renders, and copy-pasted component definitions. Every expectation
 * is hand-computed from a tiny temp repo (never from the live repo).
 */

"use strict";

const { makeRepo, removeRepo, run, get, val } = require("./helpers");
const { definitionBody, tagEnd } = require("../../../src/lib/counters/tags");

const files = (c) => (c.perFile ?? []).map((p) => `${p.file}:${p.count}`);

const FIXTURE = {
  "tsconfig.json": '{ "compilerOptions": { "paths": { "@/*": ["./src/*"] } } }',

  // the design system's primitives (components/ui)
  "src/components/ui/button.tsx": [
    "export function Button(props: object) {",
    "  return <button className={buttonVariants()} {...props} />;",
    "}",
    'export const buttonVariants = () => "x";',
    "",
  ].join("\n"),
  "src/components/ui/badge.tsx": "export function Badge({ children }: { children: string }) {\n  return <span>{children}</span>;\n}\n",
  "src/components/ui/input.tsx": "export function Input(props: object) {\n  return <input {...props} />;\n}\n",
  "src/components/ui/card.tsx": "export function Card(props: object) {\n  return <div {...props} />;\n}\n",
  "src/components/ui/sidebar.tsx": 'import { Button } from "./button";\nexport const Sidebar = () => <Button />;\n',
  "src/components/index.ts": 'export { Badge } from "./ui/badge";\nexport * from "./ui/card";\n',

  // raw elements and primitives side by side
  "src/components/Toolbar.tsx": [
    'import { Button, buttonVariants } from "@/components/ui/button";',
    'import { Input } from "@/components/ui/input";',
    'import { Badge, Card } from "@/components";',
    "",
    "const cn = (...a: string[]) => a.join(\" \");",
    "",
    "export function Toolbar({ a, b, go }: { a: number; b: number; go: (x: boolean) => void }) {",
    "  return (",
    '    <div className="focus-visible:outline-2">',
    "      <Button>one</Button>",
    "      <Button>two</Button>",
    "      <ButtonGroup />",
    "      <Button.Root />",
    '      <button className="px-2 rounded-full" type="button">pill</button>',
    '      <button onClick={() => go(a > b)} title="x > y" className={cn("focus-visible:ring-2", buttonVariants())}>go</button>',
    '      <button className="plain">plain</button>',
    '      <input type="text" />',
    "      <Input />",
    "      <Badge>b</Badge>",
    "      <Card />",
    "    </div>",
    "  );",
    "}",
    "",
  ].join("\n"),
  "src/components/Other.tsx": 'export const Other = () => <button className="px-2 rounded-full">dup</button>;\r\n',

  // <Badge> in every flavour: local copy, local const copy, global, package, default import from a non-ui file
  "src/components/Legend.tsx": [
    "function Badge({ children }: { children: string }) {",
    "  return <span>{children}</span>;",
    "}",
    "export const Legend = () => (",
    "  <div>",
    "    <Badge>a</Badge>",
    "    <Badge>b</Badge>",
    "  </div>",
    ");",
    "",
  ].join("\n"),
  "src/components/Chip.tsx": "export const Badge = ({ c }: { c: string }) => <i>{c}</i>;\nexport function BadgeList() {\n  return null;\n}\n",
  "src/components/Misc.tsx": "export const Misc = () => <Badge />;\n",
  "src/components/Pkg.tsx": 'import { Badge } from "some-lib";\nexport const Pkg = () => <Badge />;\n',
  "src/components/Fancy.tsx": "export default function Fancy() {\n  return null;\n}\n",
  "src/components/FancyUser.tsx": 'import Badge from "@/components/Fancy";\nexport const FancyUser = () => <Badge />;\n',
  "src/components/Orphan.tsx": 'import { Card } from "@/components/ui/card";\nexport const Orphan = () => <Card />;\n',

  // copy-pasted definitions (b is CRLF) and a polymorphic tag variable that is not a component
  "src/components/a/Stat.tsx": "export function Stat() {\n  return <b>1</b>;\n}\n",
  "src/components/b/Stat.tsx": "export function Stat() {\r\n  return <b>1</b>;\r\n}\r\n",
  "src/components/c/Stat.tsx": "export function Stat() {\n  return <b>2</b>;\n}\n",
  "src/components/a/PolyA.tsx": 'export function PolyA(flag: boolean) {\n  const Comp = flag ? "a" : "b";\n  return <Comp />;\n}\n',
  "src/components/b/PolyB.tsx": 'export function PolyB(flag: boolean) {\n  const Comp = flag ? "a" : "b";\n  return <Comp />;\n}\n',

  // not counted: a test file, a .ts file holding markup in a string
  "src/components/Toolbar.test.tsx": "render(<button>t</button>);\n",
  "src/lib/html.ts": 'export const html = "<button>x</button><Button/>";\n',

  "src/app/page.tsx": [
    'import { Toolbar } from "@/components/Toolbar";',
    'import { Legend } from "@/components/Legend";',
    'import { Misc } from "@/components/Misc";',
    'import { Pkg } from "@/components/Pkg";',
    'import { FancyUser } from "@/components/FancyUser";',
    'import { Other } from "@/components/Other";',
    'import "@/components/Chip";',
    "export default function Page() {",
    "  return null;",
    "}",
    "",
  ].join("\n"),
};

describe("primitives counters", () => {
  const roots = [];
  const repo = (f) => {
    const root = makeRepo(f);
    roots.push(root);
    return root;
  };
  afterEach(() => roots.splice(0).forEach(removeRepo));
  const prim = (root) => run(root, { dirs: ["src"], groups: ["primitives"] });

  describe("on a repo with raw elements, primitives and local copies", () => {
    let r;
    beforeEach(() => {
      r = prim(repo(FIXTURE));
    });

    test("raw <button> by zone; tests and .ts files are not counted", () => {
      // inside ui: 1 (button.tsx) · outside: Toolbar 3 (pill, go, plain) + Other 1 = 4
      expect(val(r, "primitives.button.raw.total")).toBe(5);
      expect(val(r, "primitives.button.raw.inside_ui")).toBe(1);
      expect(val(r, "primitives.button.raw.outside_ui")).toBe(4);
      expect(files(get(r, "primitives.button.raw.outside_ui"))).toEqual(["src/components/Toolbar.tsx:3", "src/components/Other.tsx:1"]);
      expect(val(r, "primitives.button.raw.files_outside_ui")).toBe(2);
      expect(val(r, "primitives.button.raw.files_total")).toBe(3);
      expect(get(r, "primitives.button.raw.outside_ui").definition.regex).toBe("<button(?![\\w$.:-])");
    });

    test("focus-visible is looked for in the opening tag only, past `=>` and `>` inside the tag", () => {
      // the div has focus-visible but is not a button; only the `go` button carries it (after `=>` and `title="x > y"`)
      expect(val(r, "primitives.button.raw.outside_ui.with_focus_visible")).toBe(1);
      expect(files(get(r, "primitives.button.raw.outside_ui.with_focus_visible"))).toEqual(["src/components/Toolbar.tsx:1"]);
      expect(get(r, "primitives.button.raw.outside_ui.with_focus_visible").detail).toEqual({ files: 1, of: 4 });
      expect(val(r, "primitives.input.raw.outside_ui.with_focus_visible")).toBe(0);
    });

    test("classification inputs are exposed as mechanical counters, not decided", () => {
      expect(val(r, "primitives.button.raw.outside_ui.rounded_full")).toBe(2); // pill + Other
      expect(val(r, "primitives.button.raw.outside_ui.with_button_variants")).toBe(1); // go
      // "px-2 rounded-full" appears on pill and Other; "plain" on one button
      expect(val(r, "primitives.button.raw.outside_ui.shared_class_literal")).toBe(2);
      expect(get(r, "primitives.button.raw.outside_ui.shared_class_literal").detail).toEqual({ groups: 1, largestGroup: 2, tagsWithLiteral: 3, of: 4 });
    });

    test("raw <input> against <Input>", () => {
      expect(val(r, "primitives.input.raw.total")).toBe(2);
      expect(val(r, "primitives.input.raw.inside_ui")).toBe(1);
      expect(val(r, "primitives.input.raw.outside_ui")).toBe(1);
      expect(val(r, "primitives.input.tags.total")).toBe(1);
      expect(val(r, "primitives.input.tags.outside_ui")).toBe(1);
      expect(val(r, "primitives.input.definitions.total")).toBe(1);
      expect(val(r, "primitives.input.reuse_ratio.outside_ui")).toBe(0.5); // 1 / (1 + 1)
    });

    test("<Button> tags: ButtonGroup and Button.Root are different elements; inside and outside are separate", () => {
      expect(val(r, "primitives.button.tags.total")).toBe(3);
      expect(val(r, "primitives.button.tags.inside_ui")).toBe(1); // ui/sidebar.tsx
      expect(val(r, "primitives.button.tags.outside_ui")).toBe(2); // Toolbar
      expect(val(r, "primitives.button.tags.files_outside_ui")).toBe(1);
      expect(val(r, "primitives.button.tags.files_total")).toBe(2);
      expect(val(r, "primitives.button.definitions.total")).toBe(1);
      expect(get(r, "primitives.button.definitions.total").detail).toEqual({ inside_ui: 1, outside_ui: 0 });
      expect(val(r, "primitives.button.resolved.to_ui_definition")).toBe(2);
      expect(val(r, "primitives.button.reuse_ratio.outside_ui")).toBe(0.3333); // 2 / (2 + 4 raw)
      expect(get(r, "primitives.button.reuse_ratio.outside_ui").detail).toEqual({ numerator: 2, denominator: 6 });
    });

    test("<Badge> tags are matched to the definition they render: ui, local copy, other file, package, unresolved", () => {
      expect(val(r, "primitives.badge.tags.total")).toBe(6);
      expect(val(r, "primitives.badge.tags.inside_ui")).toBe(0);
      expect(val(r, "primitives.badge.tags.files_outside_ui")).toBe(5);
      // Toolbar via the barrel (export { Badge } from) · Legend 2 · FancyUser default import from a non-ui file · Pkg · Misc (global)
      expect(val(r, "primitives.badge.resolved.to_ui_definition")).toBe(1);
      expect(val(r, "primitives.badge.resolved.to_local_definition")).toBe(2);
      expect(get(r, "primitives.badge.resolved.to_ui_definition").detail).toEqual({
        to_ui_definition: 1, to_local_definition: 2, to_other_file: 1, to_package: 1, unresolved: 1,
      });
      expect(files(get(r, "primitives.badge.resolved.to_local_definition"))).toEqual(["src/components/Legend.tsx:2"]);
      expect(val(r, "primitives.badge.reuse_ratio.outside_ui")).toBe(0.3333); // 1 ui / (1 ui + 2 local)
      expect(get(r, "primitives.badge.reuse_ratio.outside_ui").detail).toEqual({ numerator: 1, denominator: 3 });
    });

    test("Badge definitions: function and const forms count, BadgeList does not", () => {
      expect(val(r, "primitives.badge.definitions.total")).toBe(3); // ui/badge.tsx, Legend.tsx, Chip.tsx
      expect(get(r, "primitives.badge.definitions.total").detail).toEqual({ inside_ui: 1, outside_ui: 2 });
      expect(files(get(r, "primitives.badge.definitions.total"))).toEqual([
        "src/components/Chip.tsx:1", "src/components/Legend.tsx:1", "src/components/ui/badge.tsx:1",
      ]);
    });

    test("<Card> is resolved through `export *`, and canonical users carry their import status", () => {
      expect(val(r, "primitives.card.tags.outside_ui")).toBe(2); // Toolbar (barrel) + Orphan (direct)
      expect(val(r, "primitives.card.resolved.to_ui_definition")).toBe(2);
      expect(val(r, "primitives.card.definitions.total")).toBe(1);
      expect(val(r, "primitives.card.canonical_users.files")).toBe(2);
      expect(val(r, "primitives.card.canonical_users.no_importer_files")).toBe(1); // Orphan; Toolbar is imported by the page
      expect(files(get(r, "primitives.card.canonical_users.no_importer_files"))).toEqual(["src/components/Orphan.tsx:1"]);
      expect(val(r, "primitives.badge.canonical_users.no_importer_files")).toBe(0);
      expect(get(r, "primitives.badge.canonical_users.no_importer_files").detail).toEqual({ of: 1 });
      expect(get(r, "primitives.card.reuse_ratio.outside_ui")).toBeUndefined(); // no raw-equivalent regex is defined for Card
    });

    test("identical definitions: a local Badge copied byte-for-byte from ui, and a CRLF copy, match; a changed body and a polymorphic tag variable do not", () => {
      expect(val(r, "primitives.definitions.identical_groups")).toBe(2);
      const c = get(r, "primitives.definitions.identical_groups");
      expect(c.detail.files).toBe(4);
      expect(c.detail.groups).toEqual([
        { name: "Badge", lines: 3, filesTotal: 2, files: ["src/components/Legend.tsx", "src/components/ui/badge.tsx"] },
        { name: "Stat", lines: 3, filesTotal: 2, files: ["src/components/a/Stat.tsx", "src/components/b/Stat.tsx"] },
      ]);
      expect(files(c)).toEqual([
        "src/components/Legend.tsx:1", "src/components/a/Stat.tsx:1", "src/components/b/Stat.tsx:1", "src/components/ui/badge.tsx:1",
      ]);
    });

    test("every counter carries a regex or an explicit null, a file set and a unit, and the report is deterministic", () => {
      for (const c of r.counters) {
        expect(c.group).toBe("primitives");
        expect(c.definition.fileSet.length).toBeGreaterThan(5);
      }
      const again = prim(repo(FIXTURE));
      const strip = (rep) => JSON.stringify({ ...rep, repo: null });
      expect(strip(again)).toBe(strip(r));
    });
  });

  describe("edge cases", () => {
    test("an empty repo gives zero counts and null ratios, never an error", () => {
      const r = prim(repo({ "README.md": "# nothing" }));
      expect(val(r, "primitives.button.raw.total")).toBe(0);
      expect(val(r, "primitives.badge.definitions.total")).toBe(0);
      expect(val(r, "primitives.definitions.identical_groups")).toBe(0);
      const ratio = get(r, "primitives.button.reuse_ratio.outside_ui");
      expect(ratio.value).toBeNull();
      expect(ratio.notes.join(" ")).toMatch(/denominator is 0/);
    });

    test("vue and svelte templates count, with class= as the literal class string", () => {
      const r = prim(repo({
        "src/components/Foo.vue": '<template><button class="a b">x</button><Button /></template>\n',
        "src/components/Bar.svelte": '<button class="a b">y</button>\n',
      }));
      expect(val(r, "primitives.button.raw.outside_ui")).toBe(2);
      expect(val(r, "primitives.button.tags.outside_ui")).toBe(1);
      expect(val(r, "primitives.button.raw.outside_ui.shared_class_literal")).toBe(2);
      expect(val(r, "primitives.button.resolved.to_ui_definition")).toBe(0);
      expect(get(r, "primitives.button.resolved.to_ui_definition").detail.unresolved).toBe(1);
    });

    test("a barrel that renames or re-exports through a local import still finds the ui definition", () => {
      const r = prim(repo({
        "src/components/ui/badge.tsx": "export function Badge() {\n  return null;\n}\n",
        "src/components/barrel.ts": 'import { Badge as B } from "./ui/badge";\nexport { B as Badge };\n',
        "src/components/Use.tsx": 'import { Badge } from "./barrel";\nexport const Use = () => <Badge />;\n',
      }));
      expect(val(r, "primitives.badge.resolved.to_ui_definition")).toBe(1);
    });

    test("an import cycle between barrels terminates", () => {
      const r = prim(repo({
        "src/components/a.ts": 'export * from "./b";\n',
        "src/components/b.ts": 'export * from "./a";\n',
        "src/components/Use.tsx": 'import { Badge } from "./a";\nexport const Use = () => <Badge />;\n',
      }));
      expect(get(r, "primitives.badge.resolved.to_ui_definition").detail.to_other_file).toBe(1); // the definition is not found: the barrel is the answer
    });
  });

  describe("identical definitions are compared on the token stream, not by indentation", () => {
    const identical = (r) => get(r, "primitives.definitions.identical_groups");
    const two = (a, b, name = "Demo") => ({ [`src/components/a/${name}.tsx`]: a, [`src/components/b/${name}.tsx`]: b });

    test("a template literal with a line at column 0 does not end the body early", () => {
      const body = (word) => `export function Demo() {\n  const s = \`\nx\`;\n  return <p>${word}</p>;\n}\n`;
      const r = prim(repo(two(body("one"), body("TWO, completely different"))));
      expect(val(r, "primitives.definitions.identical_groups")).toBe(0);
      const same = prim(repo(two(body("one"), body("one"))));
      expect(identical(same).detail.groups).toEqual([
        { name: "Demo", lines: 5, filesTotal: 2, files: ["src/components/a/Demo.tsx", "src/components/b/Demo.tsx"] },
      ]);
    });

    test("a comment at column 0, and a body line indented less than its keyword, do not end it either", () => {
      const comment = (word) => `export function Demo() {\n  // note\n// column zero\n  return <p>${word}</p>;\n}\n`;
      expect(val(prim(repo(two(comment("one"), comment("TWO")))), "primitives.definitions.identical_groups")).toBe(0);
      expect(val(prim(repo(two(comment("one"), comment("one")))), "primitives.definitions.identical_groups")).toBe(1);
      const shallow = (word) => `function Wrap() {\n  const Demo = () => {\nreturn <p>${word}</p>;\n  };\n  return Demo;\n}\n`;
      expect(val(prim(repo(two(shallow("one"), shallow("TWO")))), "primitives.definitions.identical_groups")).toBe(0);
      const same = identical(prim(repo(two(shallow("one"), shallow("one")))));
      expect(same.value).toBe(2); // the nested Demo and the Wrap that holds it are both copies
      expect(same.detail.groups.map((g) => g.name).sort()).toEqual(["Demo", "Wrap"]);
    });

    test("JSX text with brackets, quotes and semicolons inside the body is not parsed as code", () => {
      const body = (word) => `export const Demo = () => (\n  <p>\n    it's ( ; \` // ${word}\n  </p>\n);\n`;
      expect(val(prim(repo(two(body("one"), body("TWO")))), "primitives.definitions.identical_groups")).toBe(0);
      expect(val(prim(repo(two(body("one"), body("one")))), "primitives.definitions.identical_groups")).toBe(1);
    });

    test("a definition inside a comment or a code sample is not a copy-pasted component", () => {
      const sample = "export const doc = `\nfunction Demo() {\n  return 1;\n}\n`;\n";
      const r = prim(repo(two(sample, sample)));
      expect(val(r, "primitives.definitions.identical_groups")).toBe(0);
      expect(identical(r).detail.uncompared).toEqual({ not_code: 2, extent: 0, budget: 0 });
      expect(identical(r).notes.join(" ")).toMatch(/uncompared/);
    });

    test("a definition whose brackets never balance is left out and counted", () => {
      const open = "export function Demo() {\n  return (1;\n}\n";
      const r = prim(repo(two(open, open)));
      expect(val(r, "primitives.definitions.identical_groups")).toBe(0);
      expect(identical(r).detail.uncompared).toEqual({ not_code: 0, extent: 2, budget: 0 });
    });

    test("an all-caps name is a constant, not a component", () => {
      const r = prim(repo(two("export const API = () => 1;\n", "export const API = () => 1;\n", "API")));
      expect(val(r, "primitives.definitions.identical_groups")).toBe(0);
    });

    test("every function-like form is compared; a name bound to a plain value is not", () => {
      const forms = {
        Fwd: "export const Fwd = React.forwardRef((p, r) => <div ref={r} />);\n",
        Fwd2: "export const Fwd2 = forwardRef(function Fwd2(p, r) {\n  return null;\n});\n",
        Memo: "export const Memo = memo(() => null);\n",
        Lazy: "export const Lazy = React.lazy(() => Promise.resolve(null));\n",
        Typed: "export const Typed: React.FC<{ a: number }> = ({ a }) => <i>{a}</i>;\n",
        Bare: "export const Bare = (props) => null;\nexport const Bare2 = props => null;\n",
        Asy: "export const Asy = async () => null;\n",
        Fx: "export const Fx = function () {\n  return null;\n};\n",
        Af: "export async function Af() {\n  return null;\n}\n",
        Star: "export function* Star() {\n  yield 1;\n}\n",
      };
      const plain = {
        Cfg: "export const Cfg = { a: 1 };\n",
        Pick: "export const Pick = flag ? A : B;\n",
        Str: "export const Str = 'hello';\n",
      };
      const files = {};
      for (const [name, body] of Object.entries({ ...forms, ...plain })) Object.assign(files, two(body, body, name));
      const r = prim(repo(files));
      const names = identical(r).detail.groups.map((g) => g.name).sort();
      // Bare is the parenthesised arrow, Bare2 the paren-less one
      expect(names).toEqual(["Af", "Asy", "Bare", "Bare2", "Fwd", "Fwd2", "Fx", "Lazy", "Memo", "Star", "Typed"]);
      expect(val(r, "primitives.definitions.identical_groups")).toBe(11);
    });

    test("definitionBody finds the end of each declaration form", () => {
      const at = (text, needle) => definitionBody(text, text.indexOf(needle));
      const fn = "function Foo<T extends { a: number }>(p: { x: T }): { y: number } {\n  return { y: 1 };\n}\nconst After = 1;\n";
      expect(at(fn, "function Foo")).toBe("function Foo<T extends { a: number }>(p: { x: T }): { y: number } {\n  return { y: 1 };\n}");
      expect(at("export async function Foo(): Promise<{ a: 1 }> {\n  return null;\n}\nfoo();\n", "async function")).toBe("async function Foo(): Promise<{ a: 1 }> {\n  return null;\n}");
      expect(at("function Foo(a: string): void;\nfunction Foo(a: any) {}\n", "function Foo(a: string)")).toBe("function Foo(a: string): void;");
      expect(at("const A = () => <div>x</div>\nconst B = 2\n", "const A")).toBe("const A = () => <div>x</div>");
      expect(at("const A = cond\n  ? () => 1\n  : () => 2;\nconst B = 1;\n", "const A")).toBe("const A = cond\n  ? () => 1\n  : () => 2;");
      expect(at("const A = () =>\n  <b>x</b>\nconst B = 2\n", "const A")).toBe("const A = () =>\n  <b>x</b>");
      expect(at("const Fwd = React.forwardRef<HTMLDivElement, Props>(({ a }, ref) => {\n  return <div ref={ref} />;\n});\nexport default Fwd;\n", "const Fwd"))
        .toBe("const Fwd = React.forwardRef<HTMLDivElement, Props>(({ a }, ref) => {\n  return <div ref={ref} />;\n});");
      expect(at("const A: () => void = () => {\n  go();\n};\nconst B = 1;\n", "const A")).toBe("const A: () => void = () => {\n  go();\n};");
      expect(at("const A = `a\n${b}\nc`\nconst B = 1\n", "const A")).toBe("const A = `a\n${b}\nc`");
      expect(at("const A = () => {\n  return 1;\n}\n.call()\nconst B = 1;\n", "const A")).toBe("const A = () => {\n  return 1;\n}\n.call()");
      expect(at("if (x) {\n  const A = () => 1\n}\n", "const A")).toBe("const A = () => 1");
    });

    test("definitionBody refuses a keyword that is not code or whose brackets do not balance", () => {
      expect(definitionBody("// function Foo() {}\n", 3)).toBeNull();
      expect(definitionBody("const s = 'function Foo() {}';\n", 11)).toBeNull();
      expect(definitionBody("function Foo() {\n  return (1;\n}\n", 0)).toBeNull();
      expect(definitionBody("function Foo(", 0)).toBeNull();
    });

    test("definitionBody steps over templates, elements and generics as whole groups", () => {
      const at = (text, needle) => definitionBody(text, text.indexOf(needle));
      // a line break right after `${`, and between substitutions, is inside the template, not the end of the statement
      expect(at("const A = `a${\n  b\n}c${\n  d\n}`\nconst B = 1\n", "const A")).toBe("const A = `a${\n  b\n}c${\n  d\n}`");
      // a line break between the end of one element's container and its closing tag is inside the element
      expect(at("const A = <div>\n  {x}\n</div>\nconst B = 2\n", "const A")).toBe("const A = <div>\n  {x}\n</div>");
      expect(at("const A = () => <div>\n  {x}\n  {y}\n</div>\nconst B = 2\n", "const A")).toBe("const A = () => <div>\n  {x}\n  {y}\n</div>");
      // generics and arrow types before the parameter list or the body
      expect(at("function F<T extends (a: number) => void>(x: T) {\n  return 1;\n}\nconst Z = 0;\n", "function F"))
        .toBe("function F<T extends (a: number) => void>(x: T) {\n  return 1;\n}");
      expect(at("function G<T = Array<number>>() {\n  return 1;\n}\nconst Z = 0;\n", "function G")).toBe("function G<T = Array<number>>() {\n  return 1;\n}");
      expect(at("function H(): () => { a: 1 } {\n  return () => ({ a: 1 });\n}\nconst Z = 0;\n", "function H"))
        .toBe("function H(): () => { a: 1 } {\n  return () => ({ a: 1 });\n}");
      expect(at("function I(): A | { b: 1 } & { c: 2 } {\n  return null;\n}\nconst Z = 0;\n", "function I")).toBe("function I(): A | { b: 1 } & { c: 2 } {\n  return null;\n}");
      expect(at("function J(): Promise<{ a: [1, 2] }> {\n  return null;\n}\nconst Z = 0;\n", "function J")).toBe("function J(): Promise<{ a: [1, 2] }> {\n  return null;\n}");
      expect(at("const K: Foo<Bar<Baz>> = make<Bar>();\nconst Z = 0;\n", "const K")).toBe("const K: Foo<Bar<Baz>> = make<Bar>();");
      expect(at("const L: [number, string] = [1, 'a'];\nconst Z = 0;\n", "const L")).toBe("const L: [number, string] = [1, 'a'];");
      expect(at("const M: { a: number } = { a: 1 }\nconst Z = 0;\n", "const M")).toBe("const M: { a: number } = { a: 1 }");
    });

    test("a line break ends a const statement only after a finished expression that the next line does not continue", () => {
      const at = (text, needle) => definitionBody(text, text.indexOf(needle));
      // unfinished: the line ends with a word that wants an operand, or an operator
      expect(at("const A = await\n  foo();\nconst Z = 0;\n", "const A")).toBe("const A = await\n  foo();");
      expect(at("const A = typeof\n  x\nconst Z = 0;\n", "const A")).toBe("const A = typeof\n  x");
      expect(at("const A = a +\n  b\nconst Z = 0;\n", "const A")).toBe("const A = a +\n  b");
      expect(at("const A = a,\n  b\nconst Z = 0;\n", "const A")).toBe("const A = a,\n  b");
      // finished, but the next line continues it
      expect(at("const A = x\n  as Foo;\nconst Z = 0;\n", "const A")).toBe("const A = x\n  as Foo;");
      expect(at("const A = x\n  satisfies Foo;\nconst Z = 0;\n", "const A")).toBe("const A = x\n  satisfies Foo;");
      expect(at("const A = 'k'\n  in obj;\nconst Z = 0;\n", "const A")).toBe("const A = 'k'\n  in obj;");
      expect(at("const A = x\n  instanceof Foo;\nconst Z = 0;\n", "const A")).toBe("const A = x\n  instanceof Foo;");
      expect(at("const A = css\n`color: red`\nconst Z = 0;\n", "const A")).toBe("const A = css\n`color: red`");
      expect(at("const A = css\n`a ${b}`\nconst Z = 0;\n", "const A")).toBe("const A = css\n`a ${b}`");
      expect(at("const A = foo\n  .bar()\n  .baz()\nconst Z = 0;\n", "const A")).toBe("const A = foo\n  .bar()\n  .baz()");
      expect(at("const A = a\n  ? b\n  : c\nconst Z = 0;\n", "const A")).toBe("const A = a\n  ? b\n  : c");
      expect(at("const A = make<X>\n(1)\nconst Z = 0;\n", "const A")).toBe("const A = make<X>\n(1)");
      // finished and not continued: a new statement starts
      expect(at("const A = foo()\nconst Z = 0;\n", "const A")).toBe("const A = foo()");
      expect(at("const A = [1]\nconst Z = 0;\n", "const A")).toBe("const A = [1]");
      expect(at("const A = 'x'\nexport const Z = 0;\n", "const A")).toBe("const A = 'x'");
      expect(at("const A = x\n!y\n", "const A")).toBe("const A = x");
      expect(at("const A = 1", "const A")).toBe("const A = 1"); // end of file
      expect(at("const A = 1\n", "const A")).toBe("const A = 1");
      expect(at("const A = (\n  1\n)\n", "const A")).toBe("const A = (\n  1\n)");
      expect(at("{ const A = foo() }\nconst Z = 0;\n", "const A")).toBe("const A = foo()"); // the block ends it
      expect(at("foo(() => { const A = 1 }, 2);\n", "const A")).toBe("const A = 1");
      expect(at("const A = 1; const B = 2;\n", "const A")).toBe("const A = 1;");
    });

    test("an unfinished function or an initializer with no tokens gives no body", () => {
      expect(definitionBody("function Foo() {\n  return 1;\n", 0)).toBeNull();
      expect(definitionBody("function Foo", 0)).toBeNull();
      expect(definitionBody("function Foo<T", 0)).toBeNull();
      expect(definitionBody("function Foo<T>(a", 0)).toBeNull();
      expect(definitionBody("const A", 0)).toBeNull();
      expect(definitionBody("const A: Foo<", 0)).toBeNull();
      expect(definitionBody("const A = (1,", 0)).toBeNull();
      expect(definitionBody("let A = 1;", 0)).toBeNull(); // only function and const are definitions
      expect(definitionBody("function Foo(): Bar", 0)).toBeNull();
      expect(definitionBody("function Foo(a);\nfunction Foo(a) {}\n", 0)).toBe("function Foo(a);"); // an overload with no return type
    });

    test("hostile nesting is bounded by the file's slicing budget instead of hashing every nested body", () => {
      const depth = 1500;
      const nest = Array.from({ length: depth }, (_, i) => `${" ".repeat(i)}function Foo() {`).join("\n")
        + "\n" + Array.from({ length: depth }, (_, i) => `${" ".repeat(depth - 1 - i)}}`).join("\n") + "\n";
      const root = repo(two(nest, nest, "Foo"));
      const t0 = Date.now();
      const r = prim(root);
      expect(Date.now() - t0).toBeLessThan(5000);
      expect(val(r, "primitives.definitions.identical_groups")).toBeGreaterThanOrEqual(1);
      expect(identical(r).detail.uncompared.budget).toBeGreaterThan(0);
    });
  });

  describe("copy counts for raw elements, primitives and definitions", () => {
    test("a <Button> from a package or a local copy is not canonical reuse, and a <button> counts against it", () => {
      const r = prim(repo({
        "src/components/Mui.tsx": 'import { Button } from "@mui/material";\nexport const Mui = () => <div><Button>1</Button><Button>2</Button><button>raw</button></div>;\n',
      }));
      expect(val(r, "primitives.button.resolved.to_ui_definition")).toBe(0);
      expect(val(r, "primitives.button.canonical_users.files")).toBe(0);
      const ratio = get(r, "primitives.button.reuse_ratio.outside_ui");
      expect(ratio.value).toBe(0);
      expect(ratio.detail).toEqual({ numerator: 0, denominator: 1 }); // the package <Button>s are in neither
      expect(ratio.notes.join(" ")).toMatch(/is in neither the numerator nor the denominator/);
    });

    test("canonical, local-copy and raw tags make up the denominator of the button and input ratios", () => {
      const r = prim(repo({
        "tsconfig.json": '{ "compilerOptions": { "paths": { "@/*": ["./src/*"] } } }',
        "src/components/ui/button.tsx": "export function Button() {\n  return <button />;\n}\n",
        "src/components/ui/input.tsx": "export function Input() {\n  return <input />;\n}\n",
        "src/components/Canon.tsx": 'import { Button } from "@/components/ui/button";\nimport { Input } from "@/components/ui/input";\nexport const Canon = () => <div><Button /><Button /><Button /><Input /></div>;\n',
        "src/components/Copy.tsx": "function Button() {\n  return <button />;\n}\nfunction Input() {\n  return <input />;\n}\nexport const Copy = () => <div><Button /><Input /><Input /><button>a</button><input /></div>;\n",
      }));
      // button: 3 canonical ÷ (3 + 1 local copy + 2 raw: Copy's own <button> and the one inside the Button copy)
      expect(val(r, "primitives.button.resolved.to_ui_definition")).toBe(3);
      expect(val(r, "primitives.button.resolved.to_local_definition")).toBe(1);
      expect(get(r, "primitives.button.reuse_ratio.outside_ui").detail).toEqual({ numerator: 3, denominator: 6 });
      expect(val(r, "primitives.button.reuse_ratio.outside_ui")).toBe(0.5);
      // input: 1 canonical ÷ (1 + 2 local copy + 2 raw)
      expect(get(r, "primitives.input.reuse_ratio.outside_ui").detail).toEqual({ numerator: 1, denominator: 5 });
      expect(val(r, "primitives.input.reuse_ratio.outside_ui")).toBe(0.2);
    });

    test("a canonical user that only a test imports still has an importer; ignoring tests it has none", () => {
      const r = prim(repo({
        "src/components/ui/card.tsx": "export function Card() {\n  return <div />;\n}\n",
        "src/components/OnlyTested.tsx": 'import { Card } from "./ui/card";\nexport const OnlyTested = () => <Card />;\n',
        "src/components/OnlyTested.test.tsx": 'import { OnlyTested } from "./OnlyTested";\ntest("x", () => OnlyTested);\n',
        "src/components/Lonely.tsx": 'import { Card } from "./ui/card";\nexport const Lonely = () => <Card />;\n',
      }));
      expect(val(r, "primitives.card.canonical_users.files")).toBe(2);
      expect(files(get(r, "primitives.card.canonical_users.no_importer_files"))).toEqual(["src/components/Lonely.tsx:1"]);
    });

    test(".js files hold JSX too: raw elements, primitive tags and definitions are counted there", () => {
      const r = prim(repo({
        "src/components/ui/button.js": "export function Button() {\n  return <button />;\n}\n",
        "src/components/A.js": 'import { Button } from "./ui/button";\nexport const A = () => <div><button className="x">a</button><Button /></div>;\n',
        "src/components/B.jsx": 'export const B = () => <button className="x">b</button>;\n',
        "src/lib/util.ts": 'export const html = "<button>x</button>";\n',
      }));
      expect(val(r, "primitives.button.raw.total")).toBe(3);
      expect(files(get(r, "primitives.button.raw.outside_ui"))).toEqual(["src/components/A.js:1", "src/components/B.jsx:1"]);
      expect(val(r, "primitives.button.raw.inside_ui")).toBe(1);
      expect(val(r, "primitives.button.definitions.total")).toBe(1);
      expect(val(r, "primitives.button.resolved.to_ui_definition")).toBe(1);
      expect(get(r, "primitives.button.raw.outside_ui").definition.fileSet).toMatch(/js/);
    });

    test("a single-quoted class string is compared like a double-quoted one", () => {
      const r = prim(repo({
        "src/components/A.tsx": "export const A = () => <button className='a b'>x</button>;\n",
        "src/components/B.tsx": "export const B = () => <button className='a b'>y</button>;\n",
        "src/components/C.tsx": 'export const C = () => <button className="a b">z</button>;\n',
        "src/components/D.tsx": "export const D = () => <button className='other'>z</button>;\n",
      }));
      expect(val(r, "primitives.button.raw.outside_ui.shared_class_literal")).toBe(3);
      expect(get(r, "primitives.button.raw.outside_ui.shared_class_literal").detail).toEqual({ groups: 1, largestGroup: 3, tagsWithLiteral: 4, of: 4 });
      expect(files(get(r, "primitives.button.raw.outside_ui.shared_class_literal"))).toEqual(["src/components/A.tsx:1", "src/components/B.tsx:1", "src/components/C.tsx:1"]);
    });

    test("when no two raw buttons share a class string there are no groups", () => {
      const r = prim(repo({
        "src/components/A.tsx": 'export const A = () => <button className="a">x</button>;\n',
        "src/components/B.tsx": 'export const B = () => <button className="b">x</button>;\n',
        "src/components/C.tsx": "export const C = () => <button className={dyn}>x</button>;\n",
      }));
      expect(val(r, "primitives.button.raw.outside_ui.shared_class_literal")).toBe(0);
      expect(get(r, "primitives.button.raw.outside_ui.shared_class_literal").detail).toEqual({ groups: 0, largestGroup: 0, tagsWithLiteral: 2, of: 3 });
    });

    test("two raw buttons in one ui file are one file", () => {
      const r = prim(repo({
        "src/components/ui/pair.tsx": "export const Pair = () => <div><button>a</button><button>b</button></div>;\n",
        "src/components/Plain.tsx": "export const Plain = () => <button>a</button>;\n",
      }));
      expect(val(r, "primitives.button.raw.inside_ui")).toBe(2);
      expect(val(r, "primitives.button.raw.files_total")).toBe(2); // pair.tsx once, Plain.tsx once
      expect(val(r, "primitives.button.raw.files_outside_ui")).toBe(1);
    });

    test("components/ui/ is a path segment: mycomponents/ui/ is not the primitive folder", () => {
      const r = prim(repo({
        "src/mycomponents/ui/x.tsx": "export const X = () => <button>a</button>;\n",
        "src/components/ui/y.tsx": "export const Y = () => <button>a</button>;\n",
      }));
      expect(val(r, "primitives.button.raw.inside_ui")).toBe(1);
      expect(val(r, "primitives.button.raw.outside_ui")).toBe(1);
      expect(files(get(r, "primitives.button.raw.outside_ui"))).toEqual(["src/mycomponents/ui/x.tsx:1"]);
    });

    test("unclosed tags are read once per file, not once per tag", () => {
      const root = repo({ "src/components/A.tsx": "<button ".repeat(250000) });
      const t0 = Date.now();
      const r = prim(root);
      expect(Date.now() - t0).toBeLessThan(2500);
      expect(val(r, "primitives.button.raw.outside_ui")).toBe(250000);
    });

    test("a tag text stops at the next tag of the same name, and tagEnd is bounded", () => {
      const text = "<button a <button b>";
      expect(tagEnd(text, 7)).toBe(19);
      expect(tagEnd(text, 7, 10)).toBe(10);
    });
  });

  describe("which definition a tag renders", () => {
    const UI_BADGE = { "src/components/ui/badge.tsx": "export function Badge() {\n  return null;\n}\n" };
    const one = (extra) => prim(repo({ ...UI_BADGE, ...extra }));
    const kinds = (r) => get(r, "primitives.badge.resolved.to_ui_definition").detail;

    test("a re-export of one name does not make the barrel define the others", () => {
      const r = one({
        "src/components/barrel.ts": 'import { Badge as B, Other } from "./ui/badge";\nexport { B as Badge, Other };\n',
        "src/components/Use.tsx": 'import { Badge } from "./barrel";\nexport const Use = () => <Badge />;\n',
        "src/components/Use2.tsx": 'import { Other as Badge } from "./barrel";\nexport const Use2 = () => <Badge />;\n',
      });
      // Use2 imports the barrel's `Other`, which is not Badge, but the tag is still matched through the file's own local name
      expect(kinds(r).to_ui_definition).toBe(1);
      expect(kinds(r).to_other_file).toBe(1);
    });

    test("export * as ns is a namespace, not a re-export of the names inside it", () => {
      const r = one({
        "src/components/barrel.ts": 'export * as ui from "./ui/badge";\n',
        "src/components/Use.tsx": 'import { Badge } from "./barrel";\nexport const Use = () => <Badge />;\n',
      });
      expect(kinds(r)).toMatchObject({ to_ui_definition: 0, to_other_file: 1 });
    });

    test("an import that resolves to nothing, to a json file or to a package is not a definition", () => {
      const r = one({
        "src/components/A.tsx": 'import { Badge } from "./nope";\nexport const A = () => <Badge />;\n',
        "src/components/B.tsx": 'import { Badge } from "./data.json";\nexport const B = () => <Badge />;\n',
        "src/components/data.json": "{}",
        "src/components/C.tsx": 'import { Badge } from "left-pad";\nexport const C = () => <Badge />;\n',
        "src/components/D.tsx": 'import * as UI from "./ui/badge";\nexport const D = () => <UI.Badge />;\nexport const D2 = () => <Badge />;\n',
      });
      expect(kinds(r)).toMatchObject({ to_ui_definition: 0, to_package: 1, unresolved: 3 });
    });

    test("a barrel that imports a name without exporting it does not define it", () => {
      const r = one({
        "src/components/barrel.ts": 'import { Badge } from "./ui/badge";\nexport * from "./other";\nexport const x = Badge;\n',
        "src/components/other.ts": "export const other = 1;\n",
        "src/components/Use.tsx": 'import { Badge } from "./barrel";\nexport const Use = () => <Badge />;\n',
      });
      expect(kinds(r)).toMatchObject({ to_ui_definition: 0, to_other_file: 1 });
    });

    test("a re-export alias is found when the barrel also has export * and other imports", () => {
      const r = one({
        "src/components/barrel.ts": 'export * from "./other";\nimport { Badge as B } from "./ui/badge";\nimport { x } from "./other";\nexport { B as Badge };\n',
        "src/components/other.ts": "export const x = 1;\n",
        "src/components/Use.tsx": 'import { Badge } from "./barrel";\nexport const Use = () => <Badge />;\n',
      });
      expect(kinds(r).to_ui_definition).toBe(1);
    });

    test("a barrel chain is followed up to eight links", () => {
      const chain = (links) => {
        const f = { "src/components/Use.tsx": 'import { Badge } from "./b1";\nexport const Use = () => <Badge />;\n' };
        for (let i = 1; i < links; i++) f[`src/components/b${i}.ts`] = `export * from "./b${i + 1}";\n`;
        f[`src/components/b${links}.ts`] = 'export * from "./ui/badge";\n';
        return f;
      };
      expect(kinds(one(chain(3))).to_ui_definition).toBe(1);
      expect(kinds(one(chain(8))).to_ui_definition).toBe(1);
      expect(kinds(one(chain(9))).to_ui_definition).toBe(0); // too deep: the last barrel reached is the answer
    });

    test("a default import of the ui file, and a re-exported default, find the definition", () => {
      const r = one({
        "src/components/ui/card.tsx": "export default function Card() {\n  return null;\n}\n",
        "src/components/barrel.ts": 'export { default as Card } from "./ui/card";\n',
        "src/components/A.tsx": 'import { Card } from "./barrel";\nexport const A = () => <Card />;\n',
        "src/components/B.tsx": 'import Card from "./ui/card";\nexport const B = () => <Card />;\n',
      });
      expect(get(r, "primitives.card.resolved.to_ui_definition").value).toBe(2);
    });

    test("a tag is matched to a definition in its own file before any import", () => {
      const r = one({
        "src/components/Own.tsx": 'import { Badge } from "./ui/badge";\nconst Badge2 = 1;\nfunction Badge() {\n  return null;\n}\nexport const Own = () => <Badge />;\n',
      });
      expect(kinds(r)).toMatchObject({ to_ui_definition: 0, to_local_definition: 1 });
    });
  });

  describe("tag and definition helpers", () => {
    test("tagEnd ignores a > inside a line comment, a block comment, an escaped string or a nested template", () => {
      const tag = (src) => src.slice(0, tagEnd(src, 7) + 1);
      expect(tag("<button a={ // x > y don't\n 1 }>rest")).toBe("<button a={ // x > y don't\n 1 }>");
      expect(tag("<button a={ /* x > y */ 1 }>rest")).toBe("<button a={ /* x > y */ 1 }>");
      expect(tag('<button a={"x\\" > y"}>rest')).toBe('<button a={"x\\" > y"}>');
      expect(tag("<button a={`t ${ `n ${ 1 } >` } >`}>rest")).toBe("<button a={`t ${ `n ${ 1 } >` } >`}>");
      expect(tag("<button a={/* unterminated > }>rest")).toBe("<button a={/* unterminated > }>rest".slice(0, 4000));
      expect(tag("<button a='x > y' b=\"z > w\">rest")).toBe("<button a='x > y' b=\"z > w\">");
    });

    test("tagEnd skips braces, strings, template literals and comments, and is bounded", () => {
      const tag = (src) => src.slice(0, tagEnd(src, 7) + 1);
      expect(tag('<button a={() => 1} b="x > y" c={`t${"}"}`}>rest')).toBe('<button a={() => 1} b="x > y" c={`t${"}"}`}>');
      expect(tag("<button a={/* don't > */ 1} b='>'>rest")).toBe("<button a={/* don't > */ 1} b='>'>");
      expect(tag("<button />rest")).toBe("<button />");
      expect(tagEnd(`<button ${"x ".repeat(5000)}>`, 7)).toBeLessThanOrEqual(7 + 4000);
    });

    test("definitionBody ends at the end of the declaration and keeps closing brackets", () => {
      const text = "export const A = () => (\n  <p />\n);\n\nconst B = 1;\n";
      expect(definitionBody(text, text.indexOf("const A"))).toBe("const A = () => (\n  <p />\n);");
      const nested = "function Outer() {\n  const Inner = () => {\n    return null;\n  };\n  return <Inner />;\n}\n";
      expect(definitionBody(nested, nested.indexOf("const Inner"))).toBe("const Inner = () => {\n    return null;\n  };");
    });
  });
});
