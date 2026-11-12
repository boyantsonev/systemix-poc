"use strict";

const fs = require("fs");
const path = require("path");
const { cli, tmpRepo, read } = require("./helpers/cli");
const { materialize } = require("./helpers/fixtures");

const doc = (name, slug, group, source, status = "skeleton") =>
  `---\nname: ${name}\nslug: ${slug}\ngroup: ${group}\nstatus: ${status}\nsource: ${source}\nreference: null\nplatforms: [web]\n---\n\n# ${name}\n`;

describe("docs sync", () => {
  test.each(["F2-css-vars", "F8-legacy"])("--check is clean on %s and writes nothing", async (id) => {
    const root = materialize(id);
    const before = read(root, "docs/manifest.json");
    const r = await cli(["docs", "sync", "--check", "--json"], { root });
    expect(r.code).toBe(0);
    expect(r.json.ok).toBe(true);
    expect(r.json.drift).toEqual([]);
    expect(r.json.problems).toEqual([]);
    expect(read(root, "docs/manifest.json")).toBe(before);
  });

  test("a doc added without the manifest is drift; sync fixes it, and then --check is clean", async () => {
    const root = materialize("F2-css-vars");
    fs.writeFileSync(path.join(root, "docs/components/text-field.md"), doc("TextField", "text-field", "inputs", "src/widgets/TextField.tsx"));
    const before = read(root, "docs/manifest.json");
    const r = await cli(["docs", "sync", "--check", "--json"], { root });
    expect(r.code).toBe(1);
    expect(r.json.ok).toBe(false);
    expect(r.json.drift).toEqual([{ slug: "text-field", change: "added", fields: [] }]);
    expect(r.json.problems[0]).toEqual({ file: "docs/manifest.json", message: "text-field has a doc but no manifest entry" });
    expect(read(root, "docs/manifest.json")).toBe(before);
    const text = await cli(["docs", "sync", "--check"], { root });
    expect(text.code).toBe(1);
    expect(text.stderr).toMatch(/out of step/);

    const w = await cli(["docs", "sync", "--json"], { root });
    expect(w.code).toBe(0);
    expect(w.json.written).toBe(true);
    const m = JSON.parse(read(root, "docs/manifest.json"));
    expect(m.count).toBe(2);
    expect(m.groups).toEqual(["actions", "inputs"]);
    expect(m.components.map((c) => c.doc)).toEqual(["docs/components/button.md", "docs/components/text-field.md"]);
    expect((await cli(["docs", "sync", "--check"], { root })).code).toBe(0);
    const again = await cli(["docs", "sync", "--json"], { root });
    expect(again.json.written).toBe(false);
  });

  test("a changed status and a removed doc are drift, named by slug and field", async () => {
    const root = materialize("F8-legacy");
    fs.unlinkSync(path.join(root, "docs/components/card.md"));
    fs.writeFileSync(path.join(root, "docs/components/button.md"), read(root, "docs/components/button.md").replace("status: ported", "status: deprecated"));
    const r = await cli(["docs", "sync", "--check", "--json"], { root });
    expect(r.code).toBe(1);
    expect(r.json.drift).toEqual([
      { slug: "button", change: "changed", fields: ["status"] },
      { slug: "card", change: "removed", fields: [] },
    ]);
  });

  test("a missing required key or a slug that doesn't match the file is a problem, and nothing is written", async () => {
    const root = tmpRepo({ "docs/components/chip.md": "---\nname: Chip\nslug: pill\ngroup: display\n---\n# Chip\n", "docs/components/_skeleton.md": "---\nname: X\n---\n" });
    const r = await cli(["docs", "sync", "--json"], { root });
    expect(r.code).toBe(1);
    expect(r.json.problems.map((p) => p.message)).toEqual(['missing required key "source"', 'slug "pill" does not match the file name "chip"']);
    expect(fs.existsSync(path.join(root, "docs/manifest.json"))).toBe(false);
  });

  test("no docs/components is a clear failure", async () => {
    const r = await cli(["docs", "sync", "--check", "--json"], { root: tmpRepo() });
    expect(r.code).toBe(1);
    expect(r.json.error).toBe("no-docs");
  });

  test("the bundled skeleton is a valid doc once named", async () => {
    const skeleton = fs.readFileSync(path.join(__dirname, "..", "templates", "docs", "components", "_skeleton.md"), "utf8");
    const root = tmpRepo({ "docs/components/component-name.md": skeleton });
    const r = await cli(["docs", "sync", "--json"], { root });
    expect(r.code).toBe(0);
    expect(JSON.parse(read(root, "docs/manifest.json")).components[0]).toEqual({
      name: "ComponentName",
      slug: "component-name",
      group: "general",
      status: "skeleton",
      source: "src/components/ComponentName.tsx",
      reference: null,
      platforms: ["web"],
      doc: "docs/components/component-name.md",
    });
  });
});

describe("docs props", () => {
  test("F2's Button: exactly the props its interface declares", async () => {
    const root = materialize("F2-css-vars");
    const r = await cli(["docs", "props", "src/widgets/Button.tsx", "--json"], { root });
    expect(r.code).toBe(0);
    expect(r.json).toEqual({
      component: "Button",
      file: "src/widgets/Button.tsx",
      props: [
        { name: "variant", type: '"primary" | "secondary"', required: false },
        { name: "size", type: '"sm" | "md"', required: false },
        { name: "disabled", type: "boolean", required: false },
        { name: "onClick", type: "() => void", required: false },
        { name: "children", type: "React.ReactNode", required: true },
      ],
    });
  });

  test("a type alias with multi-line unions, methods and an intersection", async () => {
    const root = tmpRepo({
      "Chip.tsx": [
        'import React from "react";',
        "type Base = { id: string };",
        "export type ChipProps = Base & {",
        "  /** the tone */",
        "  tone?:",
        '    | "neutral"',
        '    | "danger"',
        "  label: string",
        "  onRemove?(id: string): void",
        "  meta?: { count: number; max?: number }",
        "  [key: string]: unknown",
        "};",
        "export const Chip = ({ tone = \"neutral\", label }: ChipProps) => <span>{label}</span>;",
      ].join("\n"),
    });
    const r = await cli(["docs", "props", "Chip.tsx", "--json"], { root });
    expect(r.json.component).toBe("Chip");
    expect(r.json.props).toEqual([
      { name: "tone", type: '"neutral" | "danger"', required: false },
      { name: "label", type: "string", required: true },
      { name: "onRemove", type: "(id: string) => void", required: false },
      { name: "meta", type: "{ count: number; max?: number }", required: false },
      { name: "id", type: "string", required: true },
    ]);
  });

  test("an inline parameter type, and plain JS destructuring", async () => {
    const root = tmpRepo({
      "Badge.tsx": "export function Badge({ text, small }: { text: string; small?: boolean }) { return null; }\n",
      "Avatar.jsx": "export default function Avatar({ src, alt = \"\", size = 32, ...rest }) { return null; }\n",
    });
    let r = await cli(["docs", "props", "Badge.tsx", "--json"], { root });
    expect(r.json.props).toEqual([
      { name: "text", type: "string", required: true },
      { name: "small", type: "boolean", required: false },
    ]);
    r = await cli(["docs", "props", "Avatar.jsx", "--json"], { root });
    expect(r.json.component).toBe("Avatar");
    expect(r.json.props).toEqual([
      { name: "src", type: "unknown", required: true },
      { name: "alt", type: "unknown", required: false },
      { name: "size", type: "unknown", required: false },
    ]);
  });

  test("forwardRef with the props in its generic", async () => {
    const root = tmpRepo({
      "Input.tsx": "interface InputProps { value: string; invalid?: boolean }\nexport const Input = React.forwardRef<HTMLInputElement, InputProps>((props, ref) => <input ref={ref} />);\n",
    });
    const r = await cli(["docs", "props", "Input.tsx", "--json"], { root });
    expect(r.json.props.map((p) => p.name)).toEqual(["value", "invalid"]);
  });

  test("a missing file is exit 1; no file is a usage error", async () => {
    const root = tmpRepo();
    expect((await cli(["docs", "props", "Nope.tsx", "--json"], { root })).code).toBe(1);
    expect((await cli(["docs", "props"], { root })).code).toBe(2);
    expect((await cli(["docs", "nope"], { root })).code).toBe(2);
  });
});
