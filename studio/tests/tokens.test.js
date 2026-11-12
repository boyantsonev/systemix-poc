"use strict";

const fs = require("fs");
const path = require("path");
const { cli, tmpRepo } = require("./helpers/cli");
const { materialize } = require("./helpers/fixtures");
const color = require("../src/lib/color");
const ct = require("../src/lib/css-tokens");

const TEMPLATE = path.join(__dirname, "..", "templates", "design", "tokens.css");
const GOLDEN = path.join(__dirname, "golden", "tokens");

/** Compare with a golden file; UPDATE_GOLDEN=1 rewrites it. */
function golden(name, actual) {
  const file = path.join(GOLDEN, name);
  if (process.env.UPDATE_GOLDEN === "1") {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, actual);
  }
  expect(fs.existsSync(file)).toBe(true);
  expect(actual).toBe(fs.readFileSync(file, "utf8"));
}

const template = () => fs.readFileSync(TEMPLATE, "utf8");
const withTokens = (css) => tmpRepo({ "design/tokens.css": css });
const ratio = (a, b) => color.round2(color.contrast(color.parse(a), color.parse(b)));

describe("color", () => {
  test("contrast of known pairs", () => {
    expect(ratio("#000", "#fff")).toBe(21);
    expect(ratio("#ffffff", "#000000")).toBe(21);
    expect(ratio("#777", "#fff")).toBe(4.48);
    expect(ratio("#777777", "#ffffff")).toBeCloseTo(4.48, 2);
    expect(ratio("#fff", "#fff")).toBe(1);
  });

  test("parses hex, rgb, hsl, oklch and oklab to the same sRGB", () => {
    const blue = color.parse("#2563eb");
    expect(color.same(color.parse("rgb(37, 99, 235)"), blue)).toBe(true);
    expect(color.same(color.parse("rgb(37 99 235 / 100%)"), blue)).toBe(true);
    expect(color.same(color.parse("hsl(0 0% 100%)"), color.parse("#fff"))).toBe(true);
    expect(color.same(color.parse("hsla(120, 100%, 25%, 1)"), color.parse("#008000"))).toBe(true);
    expect(color.toCss(color.parse("oklch(0.546 0.215 262.9)"))).toBe("rgb(37 99 235)");
    expect(color.toCss(color.parse("oklch(1 0 0)"))).toBe("rgb(255 255 255)");
    expect(color.toCss(color.parse("oklab(0 0 0)"))).toBe("rgb(0 0 0)");
    expect(color.parse("#11223344").a).toBeCloseTo(0x44 / 255, 5);
    expect(color.parse("#abcd").a).toBeCloseTo(0xdd / 255, 5);
  });

  test("an out-of-gamut oklch is clamped, not rejected", () => {
    const c = color.parse("oklch(0.7 0.5 150)");
    for (const k of ["r", "g", "b"]) expect(c[k]).toBeGreaterThanOrEqual(0);
    for (const k of ["r", "g", "b"]) expect(c[k]).toBeLessThanOrEqual(1);
  });

  test("an unparseable colour is null, never a guess", () => {
    for (const s of ["rebeccapurple", "var(--x)", "#12", "#ggg", "rgb(1 2)", "color-mix(in oklch, red, blue)", "oklch(a b c)", ""]) expect(color.parse(s)).toBeNull();
  });
});

describe("css-tokens", () => {
  test("reads :root, .dark, [data-theme=dark] and the prefers-color-scheme dark :root", () => {
    const t = ct.readTokens(`:root { --a: #fff; --b: var(--a); }
@media (prefers-color-scheme: dark) { :root { --a: #000; } }
[data-theme='dark'] { --c: #111; }
.dark { --d: #222 }
.card { --ignored: #333; }`);
    expect([...t.light.keys()]).toEqual(["--a", "--b"]);
    expect([...t.dark.keys()].sort()).toEqual(["--a", "--c", "--d"]);
    expect(t.hasDark).toBe(true);
    expect(ct.resolveToken(t, "light", "--b")).toEqual({ value: "#fff" });
    expect(ct.resolveToken(t, "dark", "--b")).toEqual({ value: "#000" });
    expect(t.light.get("--b").line).toBe(1);
    expect(t.dark.get("--d").line).toBe(4);
  });

  test("var() chains resolve, fallbacks apply, cycles are reported", () => {
    const e = new Map([
      ["--a", "var(--b)"],
      ["--b", "var(--c)"],
      ["--c", "#123456"],
      ["--x", "var(--y)"],
      ["--y", "var(--x)"],
      ["--f", "var(--nope, var(--c))"],
    ]);
    expect(ct.resolve("var(--a)", e)).toEqual({ value: "#123456" });
    expect(ct.resolve("var(--f)", e)).toEqual({ value: "#123456" });
    expect(ct.resolve("var(--x)", e).error).toMatch(/cycle: --x → --y → --x/);
    expect(ct.resolve("var(--nope)", e).error).toMatch(/--nope is not defined/);
  });
});

describe("tokens lint", () => {
  test("the template tokens.css passes", async () => {
    const r = await cli(["tokens", "lint", "--json"], { root: withTokens(template()) });
    expect(r.code).toBe(0);
    expect(r.json.ok).toBe(true);
    expect(r.json.themes).toEqual(["light", "dark"]);
    expect(r.json.missing).toEqual({ light: [], dark: [] });
    expect(r.json.raw).toEqual([]);
    expect(r.json.problems).toEqual([]);
    expect(r.json.pairs).toHaveLength(16);
    expect(r.json.pairs.every((p) => p.ok && p.ratio >= 4.5)).toBe(true);
  });

  test("the template header lists the required roles", () => {
    const { REQUIRED, requiredRoles } = require("../src/commands/tokens");
    expect(requiredRoles(template())).toEqual(REQUIRED);
    expect(template()).toMatch(/REQUIRED ROLES: background foreground card/);
  });

  test("F3's tokens pass", async () => {
    const root = materialize("F3-installed", { branch: false });
    const r = await cli(["tokens", "lint", "--json"], { root });
    expect(r.code).toBe(0);
    expect(r.json.file).toBe("design/tokens.css");
    expect(r.json.pairs.find((p) => p.theme === "light" && p.fg === "foreground")).toEqual({ fg: "foreground", bg: "background", theme: "light", fgValue: "#0f172a", bgValue: "#ffffff", ratio: 17.85, ok: true });
  });

  test("F3's branch adds a highlight pair that is checked and passes", async () => {
    const root = materialize("F3-installed");
    const r = await cli(["tokens", "lint", "--json"], { root });
    expect(r.code).toBe(0);
    expect(r.json.pairs.filter((p) => p.fg === "highlight-foreground").map((p) => p.theme)).toEqual(["light", "dark"]);
  });

  test("a raw value in a role fails", async () => {
    const css = template().replace("--primary: var(--ref-blue-600);", "--primary: #2563eb;");
    const r = await cli(["tokens", "lint", "--json"], { root: withTokens(css) });
    expect(r.code).toBe(1);
    expect(r.json.ok).toBe(false);
    const line = css.split("\n").findIndex((l) => l.includes("--primary: #2563eb;")) + 1;
    expect(r.json.raw).toEqual([{ token: "--primary", theme: "light", value: "#2563eb", line }]);
    const text = await cli(["tokens", "lint"], { root: withTokens(css) });
    expect(text.stdout).toContain(`raw value: --primary (light) = #2563eb on line ${line}`);
  });

  test("a fallback inside var() is a raw value too", async () => {
    const css = template().replace("--accent: var(--ref-blue-100);", "--accent: var(--ref-blue-100, #dbeafe);");
    const r = await cli(["tokens", "lint", "--json"], { root: withTokens(css) });
    expect(r.code).toBe(1);
    expect(r.json.raw.map((x) => x.token)).toEqual(["--accent"]);
  });

  test("a role missing in dark fails", async () => {
    const css = template().replace(/\n {2}--ring: var\(--primary\);\n\}\s*$/, "\n}\n");
    expect(css).not.toBe(template());
    const r = await cli(["tokens", "lint", "--json"], { root: withTokens(css) });
    expect(r.code).toBe(1);
    expect(r.json.missing).toEqual({ light: [], dark: ["ring"] });
    expect((await cli(["tokens", "lint"], { root: withTokens(css) })).stdout).toContain("missing in dark: ring");
  });

  test("no dark theme at all fails with every role missing in dark", async () => {
    const css = template().replace(/\.dark \{[\s\S]*\}\s*$/, "");
    const r = await cli(["tokens", "lint", "--json"], { root: withTokens(css) });
    expect(r.code).toBe(1);
    expect(r.json.missing.dark).toHaveLength(17);
    expect(r.json.problems[0]).toMatch(/no dark theme/);
  });

  test("a sub-AA pair fails with the exact ratio", async () => {
    const css = template().replace("--ref-neutral-600: oklch(0.439 0 0);", "--ref-neutral-600: #777777;");
    const r = await cli(["tokens", "lint", "--json"], { root: withTokens(css) });
    expect(r.code).toBe(1);
    const failing = r.json.pairs.filter((p) => !p.ok);
    expect(failing).toEqual([{ fg: "muted-foreground", bg: "background", theme: "light", fgValue: "#777777", bgValue: "oklch(1 0 0)", ratio: 4.48, ok: false }, expect.objectContaining({ fg: "muted-foreground", bg: "muted", theme: "light", ok: false })]);
    const text = await cli(["tokens", "lint"], { root: withTokens(css) });
    expect(text.code).toBe(1);
    expect(text.stdout).toContain("contrast: muted-foreground on background (light) 4.48 < 4.5");
  });

  test("an unparseable colour is a problem, not a guess", async () => {
    const css = template().replace("--ref-blue-600: oklch(0.546 0.215 262.9);", "--ref-blue-600: rebeccapurple;");
    const r = await cli(["tokens", "lint", "--json"], { root: withTokens(css) });
    expect(r.code).toBe(1);
    expect(r.json.problems).toContain('light --primary: "rebeccapurple" is not a colour this can read (hex, rgb(), hsl(), oklch(), oklab())');
    expect(r.json.pairs.find((p) => p.theme === "light" && p.fg === "primary-foreground")).toBeUndefined();
  });

  test("a var() cycle is a problem", async () => {
    const css = template().replace("--ring: var(--primary);\n\n", "--ring: var(--ring-alias);\n  --ring-alias: var(--ring);\n\n");
    const r = await cli(["tokens", "lint", "--json"], { root: withTokens(css) });
    expect(r.code).toBe(1);
    expect(r.json.problems).toContain("light --ring: var() cycle: --ring → --ring-alias → --ring");
  });

  test("the dark theme can come from prefers-color-scheme or data-theme", async () => {
    for (const open of ["@media (prefers-color-scheme: dark) {\n  :root {", '[data-theme="dark"] {']) {
      const css = template().replace(/\.dark \{([\s\S]*)\}\s*$/, (m, body) => (open.startsWith("@") ? `${open}${body}}\n}\n` : `${open}${body}}\n`));
      const r = await cli(["tokens", "lint", "--json"], { root: withTokens(css) });
      expect(r.json.missing.dark).toEqual([]);
      expect(r.code).toBe(0);
    }
  });

  test("no token file is exit 1 with an error", async () => {
    const r = await cli(["tokens", "lint", "--json"], { root: tmpRepo() });
    expect(r.code).toBe(1);
    expect(r.json).toEqual({ ok: false, error: "no-tokens", file: "design/tokens.css" });
  });

  test("an unknown subcommand or flag is a usage error", async () => {
    expect((await cli(["tokens", "nope"], { root: tmpRepo() })).code).toBe(2);
    expect((await cli(["tokens", "lint", "--nope"], { root: tmpRepo() })).code).toBe(2);
    expect((await cli(["tokens", "diff"], { root: tmpRepo() })).code).toBe(2);
  });
});

describe("tokens diff", () => {
  let root;
  beforeAll(() => {
    root = materialize("F5-sources");
  });

  for (const [source, kind] of [
    ["export.html", "html"],
    ["variables.json", "figma-variables"],
    ["tokens.json", "dtcg"],
  ]) {
    test(`F5 ${source} against F3's tokens: byte-exact golden text and JSON`, async () => {
      const text = await cli(["tokens", "diff", "--from", `sources/${source}`], { root });
      const json = await cli(["tokens", "diff", "--from", `sources/${source}`, "--json"], { root });
      expect(json.json.kind).toBe(kind);
      expect(json.json.from).toBe(`sources/${source}`);
      expect(text.code).toBe(json.code);
      golden(`F5-${source}.txt`, text.stdout + "\n");
      golden(`F5-${source}.json`, json.stdout + "\n");
    });
  }

  test("F5's tokens.css is F3's", () => {
    const f3 = materialize("F3-installed", { branch: false });
    expect(fs.readFileSync(path.join(root, "design/tokens.css"), "utf8")).toBe(fs.readFileSync(path.join(f3, "design/tokens.css"), "utf8"));
  });

  test("the export's pure black ink conflicts with rule B1, and the diff exits 1", async () => {
    const r = await cli(["tokens", "diff", "--from", "sources/export.html", "--json"], { root });
    expect(r.code).toBe(1);
    expect(r.json.rows.find((x) => x.token === "--ink")).toEqual({ token: "--ink", current: null, proposed: "#000000", status: "conflicts-rule", rule: "B1" });
    expect(r.json.rows.find((x) => x.token === "--primary")).toEqual({ token: "--primary", current: "#4f46e5", proposed: "#4338ca", status: "changed" });
    expect(r.json.rows.find((x) => x.token === "--highlight")).toEqual({ token: "--highlight", current: null, proposed: "#fef3c7", status: "new" });
    expect(r.json.counts).toEqual({ new: 2, changed: 2, same: 11, conflicts: 1 });
    const tokens = r.json.rows.map((x) => x.token);
    expect(tokens).toEqual([...tokens].sort());
  });

  test("T rows never make a conflict: a raw hex is what a source proposes", async () => {
    const r = await cli(["tokens", "diff", "--from", "sources/variables.json", "--json"], { root });
    expect(r.code).toBe(0);
    expect(r.json.counts.conflicts).toBe(0);
    expect(r.json.rows.find((x) => x.token === "--radius-lg")).toEqual({ token: "--radius-lg", current: "12px", proposed: "16px", status: "changed" });
  });

  test("the sign-in stub has no tokens", async () => {
    const r = await cli(["tokens", "diff", "--from", "sources/login.html", "--json"], { root });
    expect(r.code).toBe(0);
    expect(r.json).toEqual({ from: "sources/login.html", kind: "html", rows: [], counts: { new: 0, changed: 0, same: 0, conflicts: 0 } });
    expect((await cli(["tokens", "diff", "--from", "sources/login.html"], { root })).stdout).toContain("No tokens found in sources/login.html.");
  });

  test("css and flat json sources; same colours in another notation are same", async () => {
    const r0 = withTokens(template());
    fs.writeFileSync(path.join(r0, "theme.css"), ":root { --background: #fff; --brand-blue: rgb(37 99 235); }\n.dark { --background: #000; }\n");
    fs.writeFileSync(path.join(r0, "flat.json"), JSON.stringify({ background: "#ffffff", "--foreground": "#000000", brandBlue: "#2563eb" }));
    const css = await cli(["tokens", "diff", "--from", "theme.css", "--json"], { root: r0 });
    expect(css.json.kind).toBe("css");
    expect(css.json.rows).toEqual([
      { token: "--background", current: "oklch(1 0 0)", proposed: "#fff", status: "same" },
      { token: "--brand-blue", current: null, proposed: "rgb(37 99 235)", status: "new" },
    ]);
    const flat = await cli(["tokens", "diff", "--from", "flat.json", "--json"], { root: r0 });
    expect(flat.json.kind).toBe("flat-json");
    expect(flat.json.rows.map((x) => [x.token, x.status])).toEqual([
      ["--background", "same"],
      ["--brand-blue", "new"],
      ["--foreground", "changed"],
    ]);
  });

  test("a missing source is exit 1; diff is read-only", async () => {
    const before = fs.readFileSync(path.join(root, "design/tokens.css"), "utf8");
    const r = await cli(["tokens", "diff", "--from", "sources/nope.json", "--json"], { root });
    expect(r.code).toBe(1);
    expect(r.json.error).toBe("no-source");
    await cli(["tokens", "diff", "--from", "sources/export.html"], { root });
    expect(fs.readFileSync(path.join(root, "design/tokens.css"), "utf8")).toBe(before);
    expect(fs.existsSync(path.join(root, "design/.studio"))).toBe(false);
  });
});
