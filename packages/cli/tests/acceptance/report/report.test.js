"use strict";

/**
 * The readiness report: the deterministic builder (quick-report.js), path redaction (kept for the
 * report service until it is removed), and `systemix audit report`, which computes the whole report
 * on this machine and sends nothing (DSC-23).
 */

const fs = require("fs");
const os = require("os");
const path = require("path");
const { build, redactPaths, payloadSummary, RECOMMENDATIONS } = require("../../../src/lib/quick-report");
const { validateReport } = require("../../../src/lib/counters/counter");
const { loadRubric, DEFAULT_SKILLS_DIR } = require("../../../src/lib/rubric-eval");
const { audit } = require("../../../src/commands/audit");
const { makeRepo, removeRepo } = require("../counters/helpers");

const FIXTURE = path.join(__dirname, "..", "skills", "fixtures", "systemix-poc-986a92fca0cb.counters.json");
const counters = () => {
  const c = JSON.parse(fs.readFileSync(FIXTURE, "utf8"));
  delete c.fixture;
  for (const k of c.counters) k.definition ??= { summary: "fixture", regex: null, fileSet: "fixture" };
  return c;
};

const quiet = async (fn) => {
  const spies = ["log", "error", "warn"].map((m) => jest.spyOn(console, m).mockImplementation(() => {}));
  const out = jest.spyOn(process.stdout, "write").mockImplementation(() => true);
  try {
    return await fn();
  } finally {
    spies.forEach((s) => s.mockRestore());
    out.mockRestore();
  }
};

describe("quick report builder", () => {
  test("is deterministic and scores like the skills' evaluator", () => {
    const a = build(counters());
    const b = build(counters());
    expect(a.markdown).toBe(b.markdown);
    expect(a.scored).toBe(true);
    expect(a.overall).toBe(53);
    expect(a.areas).toHaveLength(6);
    expect(a.markdown).toMatch(/^# Quick design-system report/);
    expect(a.markdown).toContain("No source code was sent");
  });

  test("lists caveats by weighted lost points and gives one recommendation each", () => {
    const r = build(counters());
    const weights = r.caveats.map((c) => c.weight);
    expect([...weights].sort((x, y) => y - x)).toEqual(weights);
    for (const c of r.caveats) expect(c.points).toBeLessThan(c.max);
    expect(r.markdown.match(/^\d+\. [A-Z]/gm).length).toBeGreaterThan(r.caveats.length - 1);
  });

  test("has a recommendation for every rubric item and none for unknown ones", () => {
    const ids = loadRubric(DEFAULT_SKILLS_DIR)["readiness-audit"].dimensions.flatMap((d) => d.items.map((i) => i.id));
    expect(Object.keys(RECOMMENDATIONS).sort()).toEqual([...ids].sort());
  });

  test("the free score has the scores and the caveat count, but no caveats or recommendations", () => {
    const full = build(counters());
    const free = build(counters(), { preview: true, buyUrl: "https://shop.example/buy/1" });
    expect(free).toMatchObject({ scored: true, preview: true, overall: full.overall, caveats: [], caveatCount: full.caveatCount });
    expect(free.areas).toEqual(full.areas);
    expect(free.markdown).toContain(`## Score: ${full.overall} / 100`);
    expect(free.markdown).toContain(`lists the ${full.caveatCount} caveats`);
    expect(free.markdown).toContain("https://shop.example/buy/1");
    expect(free.markdown).not.toContain("## Caveats");
    expect(free.markdown).not.toContain("## Recommendations");
    for (const c of full.caveats) if (c.recommendation) expect(free.markdown).not.toContain(c.recommendation);
    expect(build(counters(), { preview: true }).markdown).toContain("not on sale yet");
  });

  test("an incomplete (sliced) report gets no score", () => {
    const c = counters();
    c.slice = { brief: true, ids: [], definitions: true, perFile: true, counters: 10, of: 354 };
    c.counters = c.counters.slice(0, 10);
    const r = build(c);
    expect(r.scored).toBe(false);
    expect(r.markdown).toContain("No score.");
  });
});

describe("path redaction", () => {
  test("hashes every path, keeps the report valid and the score identical", () => {
    const c = counters();
    const red = redactPaths(c);
    expect(validateReport(red)).toEqual([]);
    expect(payloadSummary(c).paths).toBeGreaterThan(50);
    expect(payloadSummary(red)).toMatchObject({ paths: 0, redacted: true });
    expect(build(red).overall).toBe(build(c).overall);
    expect(JSON.stringify(red)).not.toMatch(/src\/components\//);
    expect(red.schema).toBe(c.schema);
  });
});

describe("systemix audit report", () => {
  let root;
  let outDir;
  beforeEach(() => {
    root = makeRepo({
      "src/app/globals.css": ":root { --a: #000; --b: #111; --c: #222; --d: #333; --e: #444; }\n",
      "src/components/Hero.tsx": "export const Hero = () => <button className=\"text-[13px] bg-[#ff0000]\">Hi</button>;\n",
    });
    outDir = fs.mkdtempSync(path.join(os.tmpdir(), "sx-report-"));
  });
  afterEach(() => {
    removeRepo(root);
    fs.rmSync(outDir, { recursive: true, force: true });
    process.exitCode = 0;
  });

  test("computes the whole report here, caveats and recommendations included, and sends nothing (DSC-23)", async () => {
    const fetch = jest.spyOn(globalThis, "fetch").mockImplementation(async () => {
      throw new Error("no network in this test");
    });
    const written = [];
    const out = jest.spyOn(process.stdout, "write").mockImplementation((c) => written.push(String(c)) && true);
    const spy = jest.spyOn(console, "error").mockImplementation(() => {});
    let r;
    try {
      r = await audit(["report", "--dirs", "src"], { projectRoot: root });
    } finally {
      out.mockRestore();
      spy.mockRestore();
      fetch.mockRestore();
    }
    expect(fetch).not.toHaveBeenCalled();
    expect(r).toMatchObject({ scored: true, preview: false, local: true });
    expect(r.caveats.length).toBeGreaterThan(0);
    const md = written.join("");
    expect(md).toMatch(/## Score: \d+ \/ 100[\s\S]*## Caveats[\s\S]*## Recommendations, in this order/);
    expect(md).toContain("Computed on this machine; nothing was sent.");
  });

  test("--out writes the report; the old paid flags are refused", async () => {
    const file = path.join(outDir, "report.md");
    const r = await quiet(() => audit(["report", "--dirs", "src", "--out", file], { projectRoot: root }));
    expect(fs.readFileSync(file, "utf8")).toBe(r.markdown);
    for (const flag of [["--key", "ABCD"], ["--yes"], ["--redact-paths"], ["--dry-run"]]) {
      process.exitCode = 0;
      expect(await quiet(() => audit(["report", "--dirs", "src", ...flag], { projectRoot: root }))).toBeNull();
      expect(process.exitCode).toBe(1);
    }
  });
});
