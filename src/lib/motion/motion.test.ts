import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

// G-002 PR 2: the motion layer follows the design system (E6) and keeps the transitions.dev
// license (E8). E3 (no JavaScript), E4 (reduced motion) and E7 (phone width) are checked in a
// browser; see design/goals/G-002-pitch-landing/plan.md.

const root = path.resolve(__dirname, "../../..");
const read = (rel: string) => fs.readFileSync(path.join(root, rel), "utf8");
const walk = (dir: string): string[] =>
  fs.existsSync(path.join(root, dir))
    ? fs.readdirSync(path.join(root, dir), { withFileTypes: true }).flatMap((e) =>
        e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)],
      )
    : [];
const stripComments = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"])\/\/.*$/gm, "$1");

const MOTION_CODE = [
  "src/styles/motion.css",
  ...walk("src/components/motion"),
  ...walk("src/lib/motion").filter((f) => !f.endsWith(".test.ts")),
];

describe("motion follows the design system (E6)", () => {
  it.each(MOTION_CODE)("%s carries no raw duration or easing", (rel) => {
    const code = stripComments(read(rel));
    expect(code.match(/\b\d+(\.\d+)?m?s\b(?![\w-])/g) ?? []).toEqual([]);
    expect(code.match(/cubic-bezier\(\s*[\d.]/g) ?? []).toEqual([]);
  });

  it("every motion token the layer reads is defined in globals.css", () => {
    const globals = read("src/app/globals.css");
    const used = new Set(MOTION_CODE.flatMap((f) => [...read(f).matchAll(/--motion-[a-z-]+/g)].map((m) => m[0])));
    for (const t of used) expect([t, globals.includes(`${t}:`)]).toEqual([t, true]);
  });
});

describe("the transitions.dev license is kept (E8)", () => {
  it("no transitions.dev code is in the kit we ship (plugin/, packages/cli/templates/)", () => {
    const kit = [...walk("plugin"), ...walk("packages/cli/templates")].filter((f) => /\.(js|ts|tsx|css|md|mdx|html)$/.test(f));
    const hits = kit.filter((f) => /transitions\.dev|t-stagger|t-digit|t-donut|t-morph|t-acc-|t-think|ui-generation/.test(read(f)));
    expect(hits).toEqual([]);
  });

  it("motion.css names the license, and each snippet keeps its transitions.dev comment", () => {
    const css = read("src/styles/motion.css");
    expect(css).toContain("Transitions.dev License");
    for (const name of ["Texts reveal", "Skeleton loader and reveal", "UI generation", "Number pop-in", "Donut chart", "Text morph", "Accordion expand", "Thinking states"]) {
      expect(css).toContain(`transitions.dev / ${name}`);
    }
  });

  it("the vendored runtime is unchanged in its headers and ships with its license", () => {
    expect(read("src/vendor/transitions/LICENSE.txt")).toContain("Transitions.dev License");
    expect(read("src/vendor/transitions/ui-generation.js").slice(0, 200)).toContain("transitions.dev");
    expect(read("src/vendor/transitions/ui-generation.css").slice(0, 200)).toContain("transitions.dev");
  });
});
