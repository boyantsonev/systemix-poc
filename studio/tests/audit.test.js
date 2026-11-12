"use strict";

const fs = require("fs");
const path = require("path");
const { cli, tmpRepo } = require("./helpers/cli");
const { materialize } = require("./helpers/fixtures");

const GOLDEN = path.join(__dirname, "golden", "audit");

/** The audit JSON with the temp root replaced, so goldens hold across machines. */
const stable = (json) => ({ ...json, root: "<root>" });

function golden(name, value) {
  const file = path.join(GOLDEN, `${name}.json`);
  const text = JSON.stringify(value, null, 2) + "\n";
  if (process.env.UPDATE_GOLDEN || !fs.existsSync(file)) {
    fs.mkdirSync(GOLDEN, { recursive: true });
    fs.writeFileSync(file, text);
  }
  expect(text).toBe(fs.readFileSync(file, "utf8"));
}

const audit = async (root, extra = []) => {
  const r = await cli(["audit", ...extra, "--json"], { root });
  expect(r.code).toBe(0);
  return r;
};

describe("audit", () => {
  const roots = {};
  beforeAll(() => {
    for (const id of ["F1-ui-drift", "F2-css-vars", "F3-installed"]) roots[id] = materialize(id);
  });

  test.each(["F1-ui-drift", "F2-css-vars", "F3-installed"])("golden audit --json on %s", async (id) => {
    const r = await audit(roots[id]);
    golden(id, stable(r.json));
  });

  test("F1: the duplicate Button, images without alt (<img> and <Image>), critical raw colours, fresh", async () => {
    const { json } = await audit(roots["F1-ui-drift"]);
    expect(json.setupClass).toBe("fresh");
    expect(json.tokenSource).toEqual({ file: null, kind: "none", count: 0 });
    expect(json.duplicates).toEqual([{ name: "Button", files: ["components/ui/Button.tsx", "src/features/checkout/Button.tsx"] }]);
    expect(json.primitives).toEqual([{ name: "Button", file: "components/ui/Button.tsx" }]);
    expect(json.images).toEqual({ total: 2, withoutAlt: 2 });
    const critical = json.drift.critical.map((f) => `${f.file}:${f.match}`);
    expect(critical).toEqual(
      expect.arrayContaining([
        "src/features/checkout/Button.tsx:bg-[#7c3aed]",
        'src/features/checkout/Button.tsx:"#ffffff"',
        "src/features/checkout/CheckoutPage.tsx:text-[#a8a29e]",
        "src/features/pricing/PricingHero.tsx:bg-[#f5f5f4]",
      ]),
    );
    expect(json.drift.critical.every((f) => /\.tsx$/.test(f.file))).toBe(true);
    // text-[13px] is a warning, the plain stylesheet's colours are info, and #add is never a colour
    expect(json.drift.warning.map((f) => f.match)).toContain("text-[13px]");
    expect(json.drift.info.every((f) => f.file === "styles/globals.css")).toBe(true);
    expect(JSON.stringify(json.drift)).not.toMatch(/#add/);
    // the Tailwind colours are palette input, so a proposal can cover them
    expect(json.palette.map((p) => p.value)).toEqual(expect.arrayContaining(["#6d28d9", "#c4c4c4", "#f5f5f4", "#1c1917"]));
    expect(json.openQuestions.some((q) => /Button is defined in 2 places/.test(q))).toBe(true);
  });

  test("F2: the DTCG tokens.json is the source and the setup class is computed", async () => {
    const { json } = await audit(roots["F2-css-vars"]);
    expect(json.tokenSource).toEqual({ file: "tokens.json", kind: "tokens-json", count: 11 });
    expect(["fresh", "partial", "mature"]).toContain(json.setupClass);
    expect(json.setupClass).not.toBe("fresh");
    expect(json.tokenCoverage.share).toBeGreaterThan(0);
    expect(json.primitives).toEqual([]);
    expect(json.openQuestions.some((q) => /2 token sources/.test(q))).toBe(true);
  });

  test("F3: design/tokens.css is the source; the branch's raw hex is the only drift", async () => {
    const { json } = await audit(roots["F3-installed"]);
    expect(json.tokenSource.file).toBe("design/tokens.css");
    expect(json.tokenSource.kind).toBe("css-vars");
    expect(json.drift.critical).toEqual([]);
    expect(json.drift.info.map((f) => `${f.file}:${f.line}`)).toEqual(["src/features/pricing/pricing-card.css:14"]);
    expect(json.primitives.map((p) => p.name)).toEqual(["Button", "Card", "TextField"]);
  });

  test("two runs are byte-identical", async () => {
    for (const id of Object.keys(roots)) {
      const a = await audit(roots[id]);
      const b = await audit(roots[id]);
      expect(b.stdout).toBe(a.stdout);
    }
  });

  test("tokenCoverage.share is colourRefs over all colour uses, to 2 decimals", async () => {
    const root = tmpRepo({
      "design/tokens.css": ":root { --primary: #112233; --surface: #ffffff; --ink: #000011; --line: #cccccc; --muted: #eeeeee; }\n",
      "src/a.css": ".a { color: var(--primary); background: var(--surface); }\n.b { color: #ff3366; }\n",
    });
    const { json } = await audit(root);
    expect(json.tokenCoverage).toEqual({ colourRefs: 2, literalColours: 1, share: 0.67 });
    expect(json.setupClass).toBe("mature");
  });

  test("a raw colour under a primitives path is critical, and --primitives replaces the paths", async () => {
    const root = tmpRepo({ "src/kit/button.css": ".b { color: #ff3366; }\n" });
    let { json } = await audit(root);
    expect(json.drift.info).toHaveLength(1);
    ({ json } = await audit(root, ["--primitives", "kit/"]));
    expect(json.drift.critical).toHaveLength(1);
  });

  test("dirs can be named; a missing folder is a usage error", async () => {
    const root = materialize("F1-ui-drift");
    const { json } = await audit(root, ["styles"]);
    expect(json.dirs).toEqual(["styles"]);
    expect(json.files.scanned).toBe(1);
    const r = await cli(["audit", "nope", "--json"], { root });
    expect(r.code).toBe(2);
  });

  test("an empty repo is fresh with nothing to report", async () => {
    const { json } = await audit(materialize("F0-empty"));
    expect(json.files).toEqual({ scanned: 0, ui: 0, styles: 0 });
    expect(json.setupClass).toBe("fresh");
    expect(json.tokenCoverage.share).toBe(0);
  });

  test("the text summary names the setup class and the open questions", async () => {
    const r = await cli(["audit"], { root: roots["F1-ui-drift"] });
    expect(r.code).toBe(0);
    expect(r.stdout).toMatch(/Setup class: fresh/);
    expect(r.stdout).toMatch(/Open questions for a person/);
  });
});
