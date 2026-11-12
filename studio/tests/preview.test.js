"use strict";

const fs = require("fs");
const path = require("path");
const { cli, tmpRepo, read, exists } = require("./helpers/cli");
const { materialize } = require("./helpers/fixtures");

const TEMPLATE = path.join(__dirname, "..", "templates", "design", "tokens.css");
const GOLDEN = path.join(__dirname, "golden", "preview");

function golden(name, actual) {
  const file = path.join(GOLDEN, name);
  if (process.env.UPDATE_GOLDEN === "1") {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, actual);
  }
  expect(fs.existsSync(file)).toBe(true);
  expect(actual).toBe(fs.readFileSync(file, "utf8"));
}

describe("preview", () => {
  let root;
  beforeAll(() => {
    root = materialize("F3-installed", { branch: false });
  });

  test("writes design/.studio/preview.html on F3, matching the golden HTML", async () => {
    const r = await cli(["preview"], { root });
    expect(r.code).toBe(0);
    expect(r.stdout).toContain("wrote design/.studio/preview.html");
    expect(exists(root, "design/.studio/preview.html")).toBe(true);
    golden("F3-installed.html", read(root, "design/.studio/preview.html"));
  });

  test("--stdout prints the same page and writes nothing", async () => {
    const fresh = materialize("F3-installed", { branch: false });
    const r = await cli(["preview", "--stdout"], { root: fresh });
    expect(r.code).toBe(0);
    expect(exists(fresh, "design/.studio/preview.html")).toBe(false);
    expect(r.stdout + "\n").toBe(fs.readFileSync(path.join(GOLDEN, "F3-installed.html"), "utf8"));
  });

  test("the contrast numbers equal tokens lint's", async () => {
    const lint = await cli(["tokens", "lint", "--json"], { root });
    const prev = await cli(["preview", "--json", "--stdout"], { root });
    expect(prev.code).toBe(0);
    const strip = (p) => ({ fg: p.fg, bg: p.bg, theme: p.theme, ratio: p.ratio, ok: p.ok });
    expect(prev.json.pairs).toEqual(lint.json.pairs.map(strip));
    expect(prev.json.pairs).toHaveLength(16);
    const html = (await cli(["preview", "--stdout"], { root })).stdout;
    for (const p of lint.json.pairs) {
      expect(html).toContain(`<code>${p.fg}</code> on <code>${p.bg}</code></span><b>${p.ratio.toFixed(2)}</b>`);
    }
  });

  test("JSON lists roles in both themes and the reference tokens", async () => {
    const r = await cli(["preview", "--json"], { root });
    expect(r.json.file).toBe("design/.studio/preview.html");
    expect(r.json.roles.find((x) => x.token === "--primary")).toEqual({ token: "--primary", light: "#4f46e5", dark: "#a5b4fc" });
    expect(r.json.references.find((x) => x.token === "--ref-neutral-0")).toEqual({ token: "--ref-neutral-0", value: "#ffffff" });
    expect(r.json.roles).toHaveLength(17);
  });

  test("self-contained: no http(s) URL, no script, no external fetch", async () => {
    const html = (await cli(["preview", "--stdout"], { root })).stdout;
    expect(html).not.toMatch(/https?:\/\//i);
    expect(html).not.toMatch(/<script|<link|<img|<iframe|@import|url\(/i);
    expect(html).toMatch(/^<!doctype html>/);
    for (const section of ["Roles and contrast", "Reference tokens", "Type scale", "Radius", "Spacing", "Light", "Dark"]) expect(html).toContain(section);
  });

  test("a URL in a token value is never echoed into the page", async () => {
    const css = fs.readFileSync(TEMPLATE, "utf8").replace("--radius-lg: 12px;", "--radius-lg: url(https://example.com/x.png);").replace("--ref-blue-100: oklch(0.932 0.032 255.6);", '--ref-blue-100: url("http://example.com/a"); --ref-x: </style><script>');
    const r = await cli(["preview", "--stdout"], { root: tmpRepo({ "design/tokens.css": css }) });
    expect(r.code).toBe(0);
    expect(r.stdout).not.toMatch(/https?:\/\//i);
    expect(r.stdout).not.toMatch(/<script/i);
  });

  test("deterministic: the same tokens give the same bytes", async () => {
    const a = await cli(["preview", "--stdout"], { root });
    const b = await cli(["preview", "--stdout"], { root, now: new Date("2027-06-01T00:00:00Z") });
    expect(a.stdout).toBe(b.stdout);
  });

  test("the template's preview shows every pair passing", async () => {
    const r = await cli(["preview", "--stdout"], { root: tmpRepo({ "design/tokens.css": fs.readFileSync(TEMPLATE, "utf8") }) });
    expect(r.code).toBe(0);
    expect(r.stdout).not.toContain('<li class="fail">');
    expect(r.stdout.match(/<li class="pass">/g)).toHaveLength(16);
  });

  test("a failing pair shows its ratio and fail", async () => {
    const css = fs.readFileSync(TEMPLATE, "utf8").replace("--ref-neutral-600: oklch(0.439 0 0);", "--ref-neutral-600: #777777;");
    const r = await cli(["preview", "--stdout"], { root: tmpRepo({ "design/tokens.css": css }) });
    expect(r.stdout).toContain('<li class="fail"><span class="sample" style="color:rgb(119 119 119);background:rgb(255 255 255)">Aa</span><span><code>muted-foreground</code> on <code>background</code></span><b>4.48</b><em>fail</em></li>');
    expect(r.stdout).toContain("2 of 16 pairs fail AA.");
  });

  test("--out writes elsewhere; no token file is exit 1", async () => {
    const r = await cli(["preview", "--out", "out/p.html", "--json"], { root });
    expect(r.json.file).toBe("out/p.html");
    expect(exists(root, "out/p.html")).toBe(true);
    const none = await cli(["preview", "--json"], { root: tmpRepo() });
    expect(none.code).toBe(1);
    expect(none.json).toEqual({ ok: false, error: "no-tokens", file: "design/tokens.css" });
    expect((await cli(["preview", "--nope"], { root })).code).toBe(2);
  });
});
