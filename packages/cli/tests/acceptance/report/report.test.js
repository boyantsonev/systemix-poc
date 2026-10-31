"use strict";

/**
 * The paid quick report: the deterministic builder (quick-report.js), path redaction,
 * and `systemix audit report`, which sends only the counters JSON and only with --yes.
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

  const env = { SYSTEMIX_REPORT_SERVICE: "https://reports.example.test" };

  test("with a key, sends nothing without --yes", async () => {
    const fetch = jest.fn();
    const r = await quiet(() => audit(["report", "--dirs", "src", "--key", "ABCD-1234"], { projectRoot: root, env, fetch }));
    expect(r).toBeNull();
    expect(fetch).not.toHaveBeenCalled();
  });

  test("--dry-run writes the exact payload and sends nothing", async () => {
    const fetch = jest.fn();
    const file = path.join(outDir, "payload.json");
    await quiet(() => audit(["report", "--dirs", "src", "--dry-run", "--yes", "--payload-out", file], { projectRoot: root, env, fetch }));
    expect(fetch).not.toHaveBeenCalled();
    const payload = JSON.parse(fs.readFileSync(file, "utf8"));
    expect(payload.schema).toBe("systemix.audit-counters/1");
    expect(JSON.stringify(payload)).not.toContain("bg-[#ff0000]\">Hi"); // no source text
  });

  test("with --yes posts only the counters and the key, and writes the report", async () => {
    const fetch = jest.fn(async () => ({ ok: true, status: 200, json: async () => ({ scored: true, overall: 40, markdown: "# Quick design-system report\n" }) }));
    const out = path.join(outDir, "report.md");
    const r = await quiet(() => audit(["report", "--dirs", "src", "--yes", "--key", "ABCD-1234", "--out", out, "--redact-paths"], { projectRoot: root, env, fetch }));
    expect(r.overall).toBe(40);
    expect(fs.readFileSync(out, "utf8")).toBe("# Quick design-system report\n");
    const [url, init] = fetch.mock.calls[0];
    expect(url).toBe("https://reports.example.test/api/report");
    const sent = JSON.parse(init.body);
    expect(Object.keys(sent).sort()).toEqual(["counters", "licenseKey"]);
    expect(sent.licenseKey).toBe("ABCD-1234");
    expect(payloadSummary(sent.counters)).toMatchObject({ paths: 0, redacted: true });
  });

  test("a refused key is an error that names the buy link", async () => {
    const fetch = jest.fn(async () => ({ ok: false, status: 402, json: async () => ({ error: "this license key has been used", buyUrl: "https://shop.example/buy/1" }) }));
    const errors = [];
    const spy = jest.spyOn(console, "error").mockImplementation((...a) => errors.push(a.join(" ")));
    let r;
    try {
      r = await audit(["report", "--dirs", "src", "--yes", "--key", "ABCD-1234"], { projectRoot: root, env, fetch });
    } finally {
      spy.mockRestore();
    }
    expect(r).toBeNull();
    expect(process.exitCode).toBe(1);
    expect(errors.join("\n")).toContain("https://shop.example/buy/1");
  });

  test("without a key, the free score is computed here and nothing is sent, even with --yes (G-003 E9)", async () => {
    const fetch = jest.fn(async () => {
      throw new Error("no network in this test");
    });
    const errors = [];
    const written = [];
    const spy = jest.spyOn(console, "error").mockImplementation((...a) => errors.push(a.join(" ")));
    const out = jest.spyOn(process.stdout, "write").mockImplementation((c) => written.push(String(c)) && true);
    let r;
    try {
      r = await audit(["report", "--dirs", "src", "--yes"], { projectRoot: root, env, fetch });
    } finally {
      spy.mockRestore();
      out.mockRestore();
    }
    expect(fetch).not.toHaveBeenCalled();
    expect(r).toMatchObject({ scored: true, preview: true, local: true, caveats: [] });
    expect(written.join("")).toMatch(/## Score: \d+ \/ 100[\s\S]*Computed on this machine; nothing was sent\./);
    expect(written.join("")).not.toContain("only counts and file names");
    expect(errors.join("\n")).toMatch(/nothing was sent[\s\S]*getsystemix\.vercel\.app\/report/);
  });

  test("refuses a non-https service", async () => {
    const fetch = jest.fn();
    await quiet(() => audit(["report", "--yes"], { projectRoot: root, env: { SYSTEMIX_REPORT_SERVICE: "http://evil.example" }, fetch }));
    expect(fetch).not.toHaveBeenCalled();
    expect(process.exitCode).toBe(1);
  });
});
