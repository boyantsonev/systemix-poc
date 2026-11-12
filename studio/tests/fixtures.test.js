"use strict";

// The eval fixtures F0-F8 (SPEC.md § Fixtures): each one materializes, with every variant, into a
// git repo that holds the facts the skills, the goldens and the harness rely on.

const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const { materialize, listFixtures, spec, FIXTURES } = require("./helpers/fixtures");
const { cli, read, exists } = require("./helpers/cli");
const { frontmatter, cells } = require("../src/lib/md");

const IDS = ["F0-empty", "F1-ui-drift", "F2-css-vars", "F3-installed", "F4-loops", "F5-sources", "F6-runlog", "F7-surfaces", "F8-legacy"];
const REQUIRED_ROLES = "background foreground card card-foreground muted muted-foreground primary primary-foreground secondary secondary-foreground accent accent-foreground destructive destructive-foreground border input ring".split(" ");

const made = new Map();
const repo = (id, opts = {}) => {
  const key = `${id}:${opts.variant || ""}:${opts.branch === false ? "nobranch" : ""}`;
  if (!made.has(key)) made.set(key, materialize(id, opts));
  return made.get(key);
};
afterAll(() => {
  for (const dir of made.values()) fs.rmSync(dir, { recursive: true, force: true });
});

const git = (root, ...args) => execFileSync("git", args, { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
const hasRef = (root, ref) => {
  try {
    git(root, "rev-parse", "--verify", "--quiet", `${ref}^{commit}`);
    return true;
  } catch {
    return false;
  }
};
const walk = (dir, base = dir) =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    if (e.name === ".git") return [];
    const p = path.join(dir, e.name);
    return e.isDirectory() ? walk(p, base) : [path.relative(base, p).split(path.sep).join("/")];
  });
const tableRows = (text) =>
  text
    .split("\n")
    .map(cells)
    .filter((r) => r && r[0] && !/^:?-+/.test(r[0]) && r[0].toLowerCase() !== "id");

// WCAG 2.x contrast for hex colours, written independently of src/lib so the fixture is checked
// by a second implementation
const luminance = (hex) => {
  let h = hex.replace("#", "");
  if (h.length === 3) h = [...h].map((c) => c + c).join("");
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (a, b) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

/** { light: {--name: value}, dark: {…} } from a tokens.css with :root and .dark blocks. */
function themes(css) {
  const out = {};
  for (const m of css.replace(/\/\*[\s\S]*?\*\//g, "").matchAll(/(:root|\.dark)\s*\{([^}]*)\}/g)) {
    const vars = {};
    for (const d of m[2].matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) vars[d[1]] = d[2].trim();
    out[m[1] === ":root" ? "light" : "dark"] = vars;
  }
  return out;
}
const resolve = (vars, name) => {
  let v = vars[name];
  for (let i = 0; v && /^var\(/.test(v) && i < 10; i++) v = vars[v.slice(4, -1).trim()];
  return v;
};

function expectLayeredAA(css) {
  const t = themes(css);
  expect(Object.keys(t).sort()).toEqual(["dark", "light"]);
  for (const role of REQUIRED_ROLES) {
    expect(t.light).toHaveProperty(`--${role}`);
    expect(t.dark).toHaveProperty(`--${role}`);
  }
  for (const theme of ["light", "dark"]) {
    const vars = { ...t.light, ...(theme === "dark" ? t.dark : {}) };
    const roles = Object.keys(t[theme]).filter((k) => !k.startsWith("--ref-") && !/^--(font-size|radius|space)/.test(k));
    for (const k of roles) expect([k, vars[k]]).toEqual([k, expect.stringMatching(/^var\(--[\w-]+\)$/)]);
    const pairs = roles.filter((k) => k.endsWith("-foreground") && k !== "--foreground").map((k) => [k, k.replace(/-foreground$/, "")]);
    pairs.push(["--foreground", "--background"], ["--muted-foreground", "--background"]);
    for (const [fg, bg] of pairs) {
      const r = contrast(resolve(vars, fg), resolve(vars, bg));
      expect([theme, fg, bg, r >= 4.5]).toEqual([theme, fg, bg, true]);
    }
  }
}

describe("fixtures: every one exists and materializes", () => {
  test("F0 to F8 are the fixtures, each fixture.json well formed", () => {
    expect(listFixtures()).toEqual(IDS);
    for (const id of IDS) {
      const f = spec(id);
      expect(f.id).toBe(id);
      expect(typeof f.purpose).toBe("string");
      expect(f.purpose.length).toBeGreaterThan(20);
      expect(fs.existsSync(path.join(f.dir, "repo"))).toBe(true);
      if (f.branch) expect(fs.existsSync(path.join(f.dir, f.branch.overlay))).toBe(true);
      for (const v of Object.values(f.variants || {})) if (v.overlay) expect(fs.existsSync(path.join(f.dir, v.overlay))).toBe(true);
    }
  });

  const all = IDS.flatMap((id) => [[id, null], ...Object.keys(spec(id).variants || {}).map((v) => [id, v])]);
  test.each(all.map(([id, v]) => [`${id}${v ? ` (${v})` : ""}`, id, v]))("%s is a clean git repo with one commit per layer", (_label, id, variant) => {
    const root = repo(id, variant ? { variant } : {});
    expect(git(root, "status", "--porcelain")).toBe("");
    const f = spec(id);
    const v = variant ? f.variants[variant] : {};
    const branch = git(root, "rev-parse", "--abbrev-ref", "HEAD");
    expect(branch).toBe(f.branch ? f.branch.name : v.initialBranch || "main");
    expect(git(root, "log", "--format=%an <%ae>", "-1")).toBe("fixture <fixture@example.com>");
  });

  test("no fixture but F8 names the older install or a brand", () => {
    const banned = /systemix|hermes|hellobill|\bvero\b|\bvito\b|notion|localhost:|claude\.ai\/artifact|posthog|contract\/|experiments\/|guardrails\.mdx/i;
    for (const id of IDS.filter((x) => x !== "F8-legacy")) {
      const dir = path.join(FIXTURES, id);
      for (const f of walk(dir)) expect([id, f, banned.test(fs.readFileSync(path.join(dir, f), "utf8"))]).toEqual([id, f, false]);
    }
  });
});

describe("F0-empty", () => {
  test("a README and package.json, no UI and no design/", () => {
    const root = repo("F0-empty");
    expect(exists(root, "README.md")).toBe(true);
    expect(JSON.parse(read(root, "package.json")).name).toBeTruthy();
    expect(exists(root, "design")).toBe(false);
    expect(walk(root).filter((f) => /\.(tsx?|jsx?|css|scss|html|vue|svelte)$/.test(f))).toEqual([]);
  });
});

describe("F1-ui-drift", () => {
  const root = () => repo("F1-ui-drift");
  test("React and Tailwind, no design/, a Button in two folders", () => {
    const r = root();
    const pkg = JSON.parse(read(r, "package.json"));
    expect(pkg.dependencies.react).toBeTruthy();
    expect(pkg.devDependencies.tailwindcss).toBeTruthy();
    expect(exists(r, "tailwind.config.js")).toBe(true);
    expect(exists(r, "design")).toBe(false);
    expect(exists(r, "components/ui/Button.tsx")).toBe(true);
    expect(exists(r, "src/features/checkout/Button.tsx")).toBe(true);
  });

  test("the drift it must show: raw hex and px, arbitrary values, images without alt, #add, the CTA and the claim", () => {
    const r = root();
    const all = walk(r).map((f) => read(r, f)).join("\n");
    expect(read(r, "styles/globals.css")).toMatch(/:\s*#[0-9a-f]{3,6};/i);
    expect(read(r, "styles/globals.css")).toMatch(/font-size:\s*\d+px/);
    expect(read(r, "styles/globals.css")).toMatch(/^#add\s*\{/m);
    expect(all).toMatch(/bg-\[#[0-9a-f]{3,8}\]/i);
    expect(all).toContain("text-[13px]");
    expect(all).toMatch(/<img\b(?![^>]*\balt=)[^>]*>/);
    expect(all).toMatch(/<Image\b(?![^>]*\balt=)[^>]*>/);
    expect(all).toContain("Guaranteed results");
    expect(read(r, "src/features/checkout/CheckoutPage.tsx")).toMatch(/!!!/);
  });

  test("two primary buttons on the checkout screen", () => {
    const page = read(root(), "src/features/checkout/CheckoutPage.tsx");
    expect(page).toMatch(/variant="primary"/);
    expect(read(root(), "src/features/checkout/Button.tsx")).toMatch(/bg-\[#/);
    expect(page).toMatch(/<Button label=/);
  });

  test("tailwind.config.js holds a pair below 4.5:1", () => {
    const cfg = read(root(), "tailwind.config.js");
    const hint = /hint:\s*"(#[0-9a-f]{6})"/i.exec(cfg)[1];
    const surface = /surface:\s*"(#[0-9a-f]{6})"/i.exec(cfg)[1];
    expect(contrast(hint, surface)).toBeLessThan(4.5);
    expect(read(root(), "src/features/checkout/CheckoutPage.tsx")).toContain("text-hint bg-surface");
  });

  test("the starter rules catch T1, T2, T3, T4, A1, A3, V1 and L1, and not #add", async () => {
    const r = await cli(["rules", "check", ".", "--starter", "--json"], { root: root() });
    expect(r.code).toBe(1);
    const ids = new Set(r.json.findings.map((f) => f.id));
    for (const id of ["T1", "T2", "T3", "T4", "A1", "A3", "V1", "L1"]) expect(ids.has(id)).toBe(true);
    expect(r.json.findings.filter((f) => f.match === "#add")).toEqual([]);
  });
});

describe("F2-css-vars", () => {
  const root = () => repo("F2-css-vars");
  test("no Tailwind; a DTCG tokens.json and CSS custom properties", () => {
    const r = root();
    expect(exists(r, "tailwind.config.js")).toBe(false);
    expect(JSON.stringify(JSON.parse(read(r, "package.json")))).not.toMatch(/tailwind/);
    const t = JSON.parse(read(r, "tokens.json"));
    expect(t.color.primary.$value).toMatch(/^#/);
    expect(t.color.primary.$type).toBe("color");
    expect(read(r, "styles/theme.css")).toMatch(/:root\s*\{[\s\S]*--color-primary:/);
  });

  test("components live in src/widgets, not components/ui", () => {
    const r = root();
    expect(exists(r, "components/ui")).toBe(false);
    expect(exists(r, "src/components/ui")).toBe(false);
    expect(exists(r, "src/widgets/Button.tsx")).toBe(true);
    expect(read(r, "src/widgets/Button.tsx")).toMatch(/interface ButtonProps/);
  });

  test("a skeleton Button doc and a manifest that lists it", () => {
    const r = root();
    const doc = frontmatter(read(r, "docs/components/button.md")).data;
    expect(doc).toMatchObject({ name: "Button", slug: "button", status: "skeleton", source: "src/widgets/Button.tsx" });
    const m = JSON.parse(read(r, "docs/manifest.json"));
    expect(m.components.map((c) => [c.slug, c.doc, c.source])).toEqual([["button", "docs/components/button.md", "src/widgets/Button.tsx"]]);
  });
});

describe("F3-installed", () => {
  const base = () => repo("F3-installed", { branch: false });
  const branch = () => repo("F3-installed");

  test("design/ holds DESIGN.md, tokens.css, rules.md and rules/", () => {
    const r = base();
    for (const f of ["design/DESIGN.md", "design/tokens.css", "design/rules.md", "design/rules/review-cases.json", "design/rules/known-bad/T1-raw-hex.css", "design/rules/known-good/card.html"]) expect(exists(r, f)).toBe(true);
    expect(read(r, "design/rules.md")).toContain("Started 2026-01-10");
    expect(read(r, ".gitignore")).toContain("design/.studio/");
  });

  test("tokens.css is layered, has every required role in light and dark, and every pair passes AA", () => {
    const css = read(base(), "design/tokens.css");
    expect(css).toMatch(/REQUIRED ROLES:/);
    expect(css).toMatch(/--ref-[a-z]+-\d+:\s*#/);
    expectLayeredAA(css);
  });

  test("rules.md holds the starter rows plus V and L rows of its own; lint and eval pass", async () => {
    const r = base();
    const list = await cli(["rules", "list", "--json"], { root: r });
    const ids = list.json.list.map((x) => x.id);
    for (const id of ["T1", "T2", "T3", "T4", "C1", "C2", "A1", "A2", "A3", "V1", "V2", "V3", "V4", "L1", "L2", "B1"]) expect(ids).toContain(id);
    expect((await cli(["rules", "lint"], { root: r })).code).toBe(0);
    const ev = await cli(["rules", "eval", "--json"], { root: r });
    expect(ev.json.uncovered).toEqual([]);
    expect(ev.code).toBe(0);
  });

  test("the base commit is clean against its own rules", async () => {
    const r = await cli(["rules", "check", "src", "--json"], { root: base() });
    expect(r.json.findings).toEqual([]);
    expect(r.code).toBe(0);
  });

  test("feature/pricing-card touches design/tokens.css (a new role) and two components", () => {
    const r = branch();
    const changed = git(r, "diff", "--name-only", "main", "HEAD").split("\n").sort();
    expect(changed).toEqual(["design/tokens.css", "src/features/checkout/CheckoutSummary.tsx", "src/features/pricing/PricingCard.tsx", "src/features/pricing/pricing-card.css"]);
    const t = themes(read(r, "design/tokens.css"));
    expect(t.light["--highlight"]).toMatch(/^var\(--ref-/);
    expect(t.dark["--highlight"]).toMatch(/^var\(--ref-/);
    expect(themes(read(base(), "design/tokens.css")).light["--highlight"]).toBeUndefined();
    expectLayeredAA(read(r, "design/tokens.css"));
  });

  test("check --changed finds exactly one T1 block and one V1 flag, against main, none on tokens.css", async () => {
    const r = await cli(["rules", "check", "--changed", "--json"], { root: branch() });
    expect(r.code).toBe(1);
    expect(r.json.base).toBe("main");
    expect(r.json.result).toBe("fail");
    expect(r.json.files).not.toContain("design/tokens.css");
    expect(r.json.findings.map((f) => [f.id, f.severity, f.file])).toEqual([
      ["T1", "block", "src/features/pricing/pricing-card.css"],
      ["V1", "flag", "src/features/checkout/CheckoutSummary.tsx"],
    ]);
  });

  test("variant no-origin has no main: --changed must ask for --base", async () => {
    const r = repo("F3-installed", { variant: "no-origin" });
    expect(hasRef(r, "main")).toBe(false);
    expect(hasRef(r, "trunk")).toBe(true);
    const c = await cli(["rules", "check", "--changed", "--json"], { root: r });
    expect(c.code).toBe(1);
    expect(c.json.error).toMatch(/--base/);
    const withBase = await cli(["rules", "check", "--changed", "--base", "trunk", "--json"], { root: r });
    expect(withBase.json.base).toBe("trunk");
    expect(withBase.json.findings.map((f) => f.id)).toEqual(["T1", "V1"]);
  });
});

const GOAL_STEPS = { "G-001": "product.evals", "G-002": "product.design", "G-003": "build.plan", "G-004": "build.measure", "G-005": "product.learn" };
const DECISION = /^- \d{4}-\d{2}-\d{2} · (product|build)\.[a-z]+ · (approve|rework|drop) · by [^·]+ · brief: (B-\d{3}|none)( · note: .+)?$/;
const LEARNING = /^- \*\*L-\d{3}\*\* · (high|medium|low) · review-by \d{4}-\d{2}-\d{2} · [^·]+ · source: [^·]+( · used-by: G-\d{3}(, G-\d{3})*)?$/;

/** Steps of a loop file: [{id, gate}] and the paths it reads and writes. */
function loopFile(text) {
  const steps = [];
  const paths = [];
  let cur = null;
  for (const line of text.split("\n")) {
    const h = /^### (.+)$/.exec(line);
    if (h) {
      cur = { id: h[1].trim().toLowerCase(), gate: null };
      steps.push(cur);
      continue;
    }
    const kv = /^- (gate|reads|writes|kind|runs): (.+)$/.exec(line);
    if (cur && kv) {
      if (kv[1] === "gate") cur.gate = kv[2];
      if (kv[1] === "reads" || kv[1] === "writes") paths.push(...kv[2].split(",").map((s) => s.trim()));
      if (kv[1] === "kind") cur.kind = kv[2].trim();
    }
  }
  return { steps, paths };
}

describe("F4-loops", () => {
  const root = () => repo("F4-loops");

  test("F3's design/ plus the loop files", async () => {
    const r = root();
    for (const f of ["design/tokens.css", "design/DESIGN.md", "design/rules.md", "design/loops/product-loop.md", "design/loops/build-loop.md", "design/loops/joins.md", "design/loops/roster.md", "design/loops/README.md"]) expect(exists(r, f)).toBe(true);
    expect(read(r, "design/tokens.css")).toBe(read(repo("F3-installed", { branch: false }), "design/tokens.css"));
    expect((await cli(["rules", "eval"], { root: r })).code).toBe(0);
  });

  test("the loops name real steps, one decide step each, and every gate's context pack exists", () => {
    const r = root();
    const product = loopFile(read(r, "design/loops/product-loop.md"));
    const build = loopFile(read(r, "design/loops/build-loop.md"));
    expect(product.steps.map((s) => s.id)).toEqual(["goal", "evals", "design", "validate", "learn"]);
    expect(build.steps.map((s) => s.id)).toEqual(["plan", "code", "test", "ship", "measure"]);
    for (const loop of [product, build]) {
      expect(loop.steps.filter((s) => s.kind === "decide").length).toBe(1);
      for (const s of loop.steps.filter((x) => x.gate)) {
        const packs = /context (.+)$/.exec(s.gate)[1].split(",").map((p) => p.trim());
        for (const p of packs) expect(exists(r, `design/context/${p}.md`)).toBe(true);
      }
      for (const p of loop.paths) expect([p, exists(r, p)]).toEqual([p, true]);
    }
    const gated = [...product.steps.map((s) => ["product." + s.id, !!s.gate]), ...build.steps.map((s) => ["build." + s.id, !!s.gate])].filter((x) => x[1]).map((x) => x[0]);
    expect(gated).toEqual(["product.evals", "product.validate", "build.plan", "build.ship"]);
    for (const m of read(r, "design/loops/joins.md").matchAll(/^- carries: (.+)$/gm)) expect(exists(r, m[1].trim())).toBe(true);
  });

  test("the roster is solo, held by Ada Lovelace, with no deputy and no merge for the agent", () => {
    const roster = read(root(), "design/loops/roster.md");
    expect(frontmatter(roster).data.preset).toBe("solo");
    const holders = [...roster.matchAll(/^- holder: (.+)$/gm)].map((m) => m[1]);
    expect(holders.length).toBeGreaterThan(0);
    expect(new Set(holders)).toEqual(new Set(["Ada Lovelace"]));
    expect(roster).not.toMatch(/^- deputy:/m);
    expect(roster).not.toMatch(/holder: Claude/);
    expect(/- may: ([\s\S]*?)\n- never/.exec(roster)[1]).not.toMatch(/merge/);
  });

  test("variant team: Ada Lovelace and Grace Hopper hold the roles, with deputies", () => {
    const roster = read(repo("F4-loops", { variant: "team" }), "design/loops/roster.md");
    expect(frontmatter(roster).data.preset).toBe("team");
    expect(roster).toMatch(/holder: Ada Lovelace/);
    expect(roster).toMatch(/holder: Grace Hopper/);
    expect(roster).toMatch(/^- deputy:/m);
  });

  test("five goals parked at the steps SPEC names, each in the goal-folder shape", () => {
    const r = root();
    const dirs = fs.readdirSync(path.join(r, "design/goals")).filter((d) => /^G-\d{3}-/.test(d)).sort();
    expect(dirs.map((d) => d.slice(0, 5))).toEqual(Object.keys(GOAL_STEPS));
    for (const d of dirs) {
      const id = d.slice(0, 5);
      const g = frontmatter(read(r, `design/goals/${d}/goal.md`));
      expect(Object.keys(g.data)).toEqual(["id", "title", "status", "step", "opened"]);
      expect(g.data.id).toBe(id);
      expect(g.data.step).toBe(GOAL_STEPS[id]);
      expect(String(g.data.opened)).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      for (const h of ["## Success criteria", "## Kill if", "## Context"]) expect(g.body).toContain(h);
      const evals = tableRows(read(r, `design/goals/${d}/evals.md`));
      expect(evals.length).toBeGreaterThanOrEqual(5);
      expect(evals.length).toBeLessThanOrEqual(12);
      for (const row of evals) expect(row[0]).toMatch(/^E\d+$/);
      const lines = read(r, `design/goals/${d}/decisions.md`).split("\n").filter((l) => l.startsWith("- "));
      for (const l of lines) expect(l).toMatch(DECISION);
    }
    const decisions = (id) => read(r, `design/goals/${dirs.find((d) => d.startsWith(id))}/decisions.md`).split("\n").filter((l) => l.startsWith("- "));
    expect(decisions("G-001")).toEqual([]);
    expect(decisions("G-002").at(-1)).toMatch(/product\.evals · approve/);
    expect(decisions("G-003").at(-1)).toMatch(/product\.validate · approve/);
    expect(decisions("G-004").at(-1)).toMatch(/build\.ship · approve/);
    expect(decisions("G-005").at(-1)).toMatch(/build\.ship · approve/);
  });

  test("LEARNINGS.md holds two cited bullets in the learnings grammar", () => {
    const bullets = read(root(), "design/LEARNINGS.md").split("\n").filter((l) => l.startsWith("- "));
    expect(bullets.length).toBe(2);
    for (const b of bullets) expect(b).toMatch(LEARNING);
    for (const b of bullets) expect(exists(root(), /source: ([^·]+)/.exec(b)[1].trim())).toBe(true);
  });

  test("no placeholder is left under design/loops, design/goals or design/context", () => {
    const r = root();
    for (const d of ["design/loops", "design/goals", "design/context"]) for (const f of walk(path.join(r, d))) expect([f, read(path.join(r, d), f).includes("{{")]).toEqual([f, false]);
  });
});

describe("F5-sources", () => {
  const root = () => repo("F5-sources");
  test("F3's tokens.css and rules, plus four sources", async () => {
    const r = root();
    expect(read(r, "design/tokens.css")).toBe(read(repo("F3-installed", { branch: false }), "design/tokens.css"));
    expect((await cli(["rules", "eval"], { root: r })).code).toBe(0);
    for (const f of ["sources/export.html", "sources/variables.json", "sources/tokens.json", "sources/login.html"]) expect(exists(r, f)).toBe(true);
  });

  test("export.html is a Claude Design export with :root custom properties", () => {
    const html = read(root(), "sources/export.html");
    const style = /<style>:root\{([\s\S]*?)\}/.exec(html);
    expect(style).not.toBeNull();
    expect(style[1]).toMatch(/--primary:\s*#/);
    expect(style[1]).toMatch(/--highlight:/);
    expect(style[1]).toMatch(/--ink:\s*#000000/);
  });

  test("variables.json is the flat Collection/name map; tokens.json is DTCG", () => {
    const v = JSON.parse(read(root(), "sources/variables.json"));
    for (const [k, val] of Object.entries(v)) {
      expect(k).toMatch(/^[A-Z][\w ]*\/[\w-]+$/);
      expect(typeof val).toBe("string");
    }
    const t = JSON.parse(read(root(), "sources/tokens.json"));
    expect(t.color.primary).toEqual({ $type: "color", $value: expect.stringMatching(/^#/) });
  });

  test("login.html is a sign-in page with no tokens", () => {
    const html = read(root(), "sources/login.html");
    expect(html).toMatch(/Sign in/);
    expect(html).not.toMatch(/--[\w-]+\s*:/);
    expect(html).not.toMatch(/<style/);
  });
});

const RUN_ID = /^r-\d{8}-\d{6}-[0-9a-f]{4}$/;
const RESULTS = ["pass", "pass-with-flags", "pass-with-fixes", "fail", "proposed", "written", "stopped-at-gate", "error"];
const FIELDS = ["run", "at", "kind", "command", "args", "surface", "depth", "goal", "result", "blocks", "flags", "false_positives", "sources", "files_written", "duration_s", "rating", "note", "studio_version"];
const PRIVATE = /[\w.+-]+@[\w-]+\.[\w.]+|sk-|ghp_|xox[bap]-|[0-9a-f]{32,}|[A-Za-z0-9+/]{40,}|https?:\/\/\S+\?|\/Users\/\w|\/home\/\w/;

/** The SPEC run-log row schema, checked field by field. */
function rowProblems(r) {
  const p = [];
  const keys = Object.keys(r);
  const allowed = r.kind === "rating" ? [...FIELDS, "ref"] : FIELDS;
  for (const k of keys) if (!allowed.includes(k)) p.push(`unknown field ${k}`);
  for (const k of allowed) if (!keys.includes(k)) p.push(`missing ${k}`);
  const str = (v) => typeof v === "string";
  const strOrNull = (v) => v === null || str(v);
  if (!RUN_ID.test(r.run)) p.push("run");
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/.test(r.at)) p.push("at");
  if (!["run", "eval", "admin", "rating"].includes(r.kind)) p.push("kind");
  if (!["setup", "brief", "check", "loop", "admin"].includes(r.command)) p.push("command");
  if (!str(r.args)) p.push("args");
  if (!strOrNull(r.surface) || !strOrNull(r.depth)) p.push("surface/depth");
  if (!(r.goal === null || /^G-\d{3}$/.test(r.goal))) p.push("goal");
  if (!RESULTS.includes(r.result)) p.push("result");
  if (!Number.isInteger(r.blocks) || !Number.isInteger(r.flags)) p.push("blocks/flags");
  if (!Array.isArray(r.false_positives) || !r.false_positives.every((f) => Object.keys(f).sort().join() === "rule,where,why" && Object.values(f).every(str))) p.push("false_positives");
  if (!Array.isArray(r.sources) || !r.sources.every(str)) p.push("sources");
  if (!Array.isArray(r.files_written) || !r.files_written.every(str)) p.push("files_written");
  if (!(r.duration_s === null || typeof r.duration_s === "number")) p.push("duration_s");
  if (!["up", "down", "none"].includes(r.rating)) p.push("rating");
  if (!str(r.note) || r.note.length > 300) p.push("note");
  if (r.kind === "rating" && !RUN_ID.test(r.ref)) p.push("ref");
  if (!str(r.studio_version)) p.push("studio_version");
  for (const v of [r.note, r.args, ...r.sources, ...r.false_positives.map((f) => f.why)]) if (PRIVATE.test(v)) p.push(`private value in a row`);
  return p;
}

const runs = (root) => read(root, "design/.studio/runs.jsonl").split("\n").filter(Boolean);

describe("F6-runlog", () => {
  const root = () => repo("F6-runlog");

  test("runs.jsonl has 40 rows of valid JSON, each valid against the run-log schema", () => {
    const lines = runs(root());
    expect(lines.length).toBe(40);
    const rows = lines.map((l) => JSON.parse(l));
    for (const r of rows) expect([r.run, rowProblems(r)]).toEqual([r.run, []]);
    expect(new Set(rows.map((r) => r.run)).size).toBe(40);
    const ats = rows.map((r) => r.at);
    expect([...ats].sort()).toEqual(ats);
  });

  test("T1 dropped as a false positive 4 times, brief rated down on 3 of 6 runs, the same error twice", () => {
    const rows = runs(root()).map((l) => JSON.parse(l));
    expect(rows.filter((r) => r.false_positives.some((f) => f.rule === "T1")).length).toBe(4);
    expect(rows.flatMap((r) => r.false_positives).filter((f) => f.rule !== "T1")).toEqual([]);
    const briefs = rows.filter((r) => r.kind === "run" && r.command === "brief");
    expect(briefs.length).toBe(6);
    const ratings = rows.filter((r) => r.kind === "rating");
    expect(ratings.every((r) => r.rating === "down" && r.command === "brief")).toBe(true);
    expect(new Set(ratings.map((r) => r.ref)).size).toBe(3);
    for (const r of ratings) expect(briefs.map((b) => b.run)).toContain(r.ref);
    const errors = rows.filter((r) => r.result === "error");
    expect(errors.length).toBe(2);
    expect(new Set(errors.map((e) => e.note)).size).toBe(1);
    // no other signal: only brief is ever rated down, and no other command has a failing pattern of ratings
    expect(rows.filter((r) => r.kind === "run" && r.rating !== "none")).toEqual([]);
  });

  test("a check fail followed by a pass on the same args (blocks fixed)", () => {
    const rows = runs(root()).map((l) => JSON.parse(l)).filter((r) => r.kind === "run" && r.command === "check");
    const fixed = rows.filter((r, i) => r.result === "fail" && rows.slice(i + 1).find((n) => n.args === r.args && n.result !== "fail" && ["pass", "pass-with-flags"].includes(n.result)));
    expect(fixed.length).toBeGreaterThan(0);
  });

  test("evals/results/2026-01-14.json has one trigger miss", () => {
    const res = JSON.parse(read(root(), "evals/results/2026-01-14.json"));
    expect(Object.keys(res)).toEqual(["date", "cli_version", "claude_code_version", "triggers", "cases"]);
    expect(res.date).toBe("2026-01-14");
    const t = res.triggers;
    expect(t.total).toBe(t.positives.total + t.negatives.total);
    expect(t.misses).toEqual([{ ask: expect.any(String), expected: "check", got: null }]);
    expect(t.positives.total - t.positives.ok + t.negatives.total - t.negatives.ok).toBe(t.misses.length);
    expect(res.cases.length).toBeGreaterThan(0);
    for (const c of res.cases) expect(Object.keys(c)).toEqual(["id", "ok"]);
  });

  test("a roster for proposals decide, and the loop kit so every admin check can run", async () => {
    const r = root();
    expect(read(r, "design/loops/roster.md")).toMatch(/holder: Ada Lovelace/);
    expect(frontmatter(read(r, "design/loops/roster.md")).data.preset).toBe("solo");
    expect((await cli(["rules", "lint"], { root: r })).code).toBe(0);
    expect((await cli(["rules", "eval"], { root: r })).code).toBe(0);
    expectLayeredAA(read(r, "design/tokens.css"));
    for (const loop of ["design/loops/product-loop.md", "design/loops/build-loop.md"]) for (const p of loopFile(read(r, loop)).paths) expect([p, exists(r, p)]).toEqual([p, true]);
  });

  test("variant clean: 12 normal rows and no results file", () => {
    const r = repo("F6-runlog", { variant: "clean" });
    const rows = runs(r).map((l) => JSON.parse(l));
    expect(rows.length).toBe(12);
    for (const row of rows) expect(rowProblems(row)).toEqual([]);
    expect(rows.every((x) => x.kind === "run" && x.false_positives.length === 0 && x.result !== "error" && x.rating === "none")).toBe(true);
    expect(exists(r, "evals")).toBe(false);
  });

  test("variant vendored: the plugin under .claude/plugins/product-studio/", () => {
    const r = repo("F6-runlog", { variant: "vendored" });
    expect(JSON.parse(read(r, ".claude/plugins/product-studio/.claude-plugin/plugin.json")).name).toBe("product-studio");
    for (const s of ["setup", "brief", "check", "loop", "admin"]) expect(exists(r, `.claude/plugins/product-studio/skills/${s}/SKILL.md`)).toBe(true);
    expect(runs(r).length).toBe(40);
  });
});

describe("F7-surfaces", () => {
  const root = () => repo("F7-surfaces");
  test("rules.md has product, marketing and email rows; lint and eval pass", async () => {
    const r = root();
    const ids = async (surface) => (await cli(["rules", "list", "--surface", surface, "--json"], { root: r })).json.list.map((x) => x.id);
    const email = await ids("email");
    const marketing = await ids("marketing");
    const product = await ids("product");
    expect(email).toEqual(expect.arrayContaining(["E1", "E2", "T1", "L1"]));
    expect(email).not.toContain("M1");
    expect(email).not.toContain("C2");
    expect(marketing).toEqual(expect.arrayContaining(["M1", "M2", "L1"]));
    expect(marketing).not.toContain("E1");
    expect(product).toEqual(expect.arrayContaining(["C2", "V3"]));
    expect(product).not.toContain("M1");
    expect(product).not.toContain("E2");
    expect((await cli(["rules", "lint"], { root: r })).code).toBe(0);
    expect((await cli(["rules", "eval"], { root: r })).code).toBe(0);
  });

  test("two decisions, two goals, and an analytics source nobody can open", () => {
    const r = root();
    expect(fs.readdirSync(path.join(r, "design/decisions")).filter((f) => /^D-\d{3}-.+\.md$/.test(f)).length).toBe(2);
    const goals = fs.readdirSync(path.join(r, "design/goals")).filter((d) => /^G-\d{3}-/.test(d));
    expect(goals.length).toBe(2);
    for (const g of goals) expect(frontmatter(read(r, `design/goals/${g}/goal.md`)).data.id).toBe(g.slice(0, 5));
    const analytics = read(r, "design/context/analytics.md");
    expect(analytics).toMatch(/internal URL we can't open/);
    expect(analytics).not.toMatch(/https?:\/\//);
  });
});

describe("F8-legacy", () => {
  const root = () => repo("F8-legacy");
  test("guardrails.mdx has exactly 10 bullet rules", () => {
    const g = read(root(), "design/guardrails.mdx");
    expect(g.split("\n").filter((l) => /^- /.test(l)).length).toBe(10);
    expect(g).toMatch(/no raw hex/i);
    expect(g).toMatch(/One primary action/);
  });

  test("experiments/LEARNINGS.md has 3 bullets in the older grammar; experiments/goals has 2 files", () => {
    const r = root();
    const bullets = read(r, "experiments/LEARNINGS.md").split("\n").filter((l) => l.startsWith("- "));
    expect(bullets.length).toBe(3);
    for (const b of bullets) expect(b).not.toMatch(LEARNING);
    expect(bullets.filter((b) => /confidence \d/.test(b)).length).toBe(2);
    const goals = fs.readdirSync(path.join(r, "experiments/goals"));
    expect(goals.length).toBe(2);
    for (const g of goals) expect(frontmatter(read(r, `experiments/goals/${g}`)).data.type).toBe("goal");
  });

  test(".systemix state, the old evals folder, the docs, and no new layout yet", () => {
    const r = root();
    expect(Array.isArray(JSON.parse(read(r, ".systemix/queue.json")).cards)).toBe(true);
    expect(read(r, "design/evals/rules/known-bad/T1-raw-hex.css")).toMatch(/#[0-9a-f]{6}/);
    const m = JSON.parse(read(r, "docs/manifest.json"));
    expect(m.components.map((c) => c.slug).sort()).toEqual(["button", "card"]);
    for (const c of m.components) {
      expect(frontmatter(read(r, c.doc)).data.slug).toBe(c.slug);
      expect(exists(r, c.source)).toBe(true);
    }
    for (const f of ["design/rules.md", "design/LEARNINGS.md", "design/loops", "design/rules"]) expect(exists(r, f)).toBe(false);
  });
});
