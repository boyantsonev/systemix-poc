import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

// G-003 E1–E3: what the public site may publish and answer. Reads the sources, so a
// change that widens any of these fails here before it reaches production.
const root = process.cwd();
const read = (p: string) => fs.readFileSync(path.join(root, p), "utf8");

describe("the public site", () => {
  it("publishes only the design system's public files from design/ (never the loops' notes)", () => {
    const config = read("source.config.ts");
    expect(config).toMatch(/const DESIGN_PUBLIC_FILES = \["index\.mdx", "DESIGN\.md", "guardrails\.mdx", "tokens\.mdx"\]/);
    expect(config).toMatch(/dir: "design",\s*docs: \{ schema: recordSchema, files: DESIGN_PUBLIC_FILES \}/);
  });

  it("sells no retired offer: /kit redirects, and no page or doc carries an old price", () => {
    expect(read("next.config.ts")).toMatch(/source: "\/kit",\s*destination: "\/#services",\s*permanent: true/);
    expect(fs.existsSync(path.join(root, "src/app/kit"))).toBe(false);
    expect(read("src/app/sitemap.ts")).not.toContain('"/kit"');
    const files = (dir: string): string[] =>
      fs.readdirSync(path.join(root, dir), { withFileTypes: true }).flatMap((e) =>
        e.isDirectory() ? files(path.join(dir, e.name)) : /\.(tsx?|mdx?)$/.test(e.name) && !/\.test\./.test(e.name) ? [path.join(dir, e.name)] : [],
      );
    const hits = [...files("src"), ...files("content")].filter((f) => /€(99|249|490)\b|Learning Kit\]\(\/kit\)/.test(read(f).replace(/\/\/.*$/gm, "")));
    expect(hits).toEqual([]);
  });

  it("has no endpoint that logs visitors' emails", () => {
    expect(fs.existsSync(path.join(root, "src/app/api/subscribe"))).toBe(false);
  });

  it("never returns a server path from the skills endpoint", () => {
    expect(read("src/app/api/skills/[name]/route.ts")).not.toMatch(/path: found\.path/);
  });
});
