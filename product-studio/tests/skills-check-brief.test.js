"use strict";

// Structural checks on the check and brief guides, the shared context-pack and run-log
// references, their eval cases and the trigger asks. No model, no network.

const fs = require("fs");
const path = require("path");
const { frontmatter } = require("../src/lib/md");

const STUDIO = path.join(__dirname, "..");
const SRC = path.join(STUDIO, "plugin-src");
const SKILLS = path.join(SRC, "skills");
const read = (rel) => fs.readFileSync(path.join(STUDIO, rel), "utf8");

const GUIDES = {
  "plugin-src/skills/check/SKILL.md": 150,
  "plugin-src/skills/check/references/rules-check.md": 150,
  "plugin-src/skills/check/references/score.md": 80,
  "plugin-src/skills/brief/SKILL.md": 150,
  "plugin-src/skills/shared/context-pack.md": 150,
  "plugin-src/skills/shared/run-log.md": 150,
};
const SKILL_MDS = ["check", "brief"];
const OWNED_DATA = ["evals/triggers.json", "evals/cases/check.json", "evals/cases/brief.json"];
const BANNED = ["systemix", "getsystemix", "hermes", "hellobill", "--bill-", "vero", "vito", "contract/", ".systemix", "experiments/", "guardrails.mdx", "localhost:", "posthog", "notion", "claude.ai/artifact"];

/** Commands and their subcommands, read from SPEC.md's "## Commands" section. */
function specCommands() {
  const spec = read("SPEC.md");
  const section = spec.split(/^## Commands$/m)[1].split(/^## /m)[0];
  const out = {};
  for (const block of section.split(/^### /m).slice(1)) {
    const name = /^([a-z][a-z-]*)/.exec(block)[1];
    const subs = new Set();
    for (const m of block.matchAll(/`([^`]+)`/g)) {
      const words = m[1].trim().split(/\s+/);
      if (words[0] === name && words[1] && /^[a-z][a-z-]*$/.test(words[1])) subs.add(words[1]);
    }
    out[name] = { subs, text: block };
  }
  return out;
}

/** Every `{{CLI}} <command> [<sub>] …` call in a guide: { command, sub, flags[], line }. */
function cliCalls(text) {
  const calls = [];
  for (const m of text.matchAll(/\{\{CLI\}\}\s+([a-z][a-z-]*)([^\n`]*)/g)) {
    const rest = m[2].trim().split(/\s+/).filter(Boolean);
    const sub = rest[0] && /^[a-z][a-z-]*$/.test(rest[0]) ? rest[0] : null;
    calls.push({ command: m[1], sub, flags: [...m[2].matchAll(/(?:^|[\s[])(--[a-z][a-z-]*)/g)].map((f) => f[1]), line: m[0] });
  }
  return calls;
}

describe("check and brief guides", () => {
  const spec = specCommands();

  test("SPEC parsing finds the commands the guides rely on", () => {
    for (const c of ["rules", "audit", "score", "runs", "learnings", "loops"]) expect(spec[c]).toBeDefined();
    expect([...spec.rules.subs]).toEqual(expect.arrayContaining(["check", "list", "lint", "eval"]));
    expect([...spec.runs.subs]).toEqual(expect.arrayContaining(["log", "rate", "should-ask"]));
  });

  test.each(Object.entries(GUIDES))("%s exists and stays within its line budget", (rel, budget) => {
    const text = read(rel);
    expect(text.split("\n").length).toBeLessThanOrEqual(budget);
  });

  test.each(SKILL_MDS)("%s/SKILL.md has valid frontmatter", (name) => {
    const { data } = frontmatter(read(`plugin-src/skills/${name}/SKILL.md`));
    expect(data.name).toBe(name);
    expect(typeof data.description).toBe("string");
    expect(data.description.length).toBeGreaterThan(80);
    expect(data.description.length).toBeLessThanOrEqual(1024);
    expect(data.description).toMatch(/\bUse when\b/);
    expect(data.description).toMatch(/\bNot for\b/);
    expect(data.description).toMatch(/ux-copy skill/);
    expect(data.description).toMatch(/design-critique skill/);
    expect(data["disable-model-invocation"]).toBeUndefined();
    expect(typeof data["argument-hint"]).toBe("string");
  });

  test("check and brief use designer phrasing", () => {
    expect(frontmatter(read("plugin-src/skills/check/SKILL.md")).data.description).toMatch(/check my design|review my design|on-brand/);
    expect(frontmatter(read("plugin-src/skills/brief/SKILL.md")).data.description).toMatch(/what colours should I use here/);
  });

  test("loop and admin, when present, are person-only", () => {
    for (const c of ["loop", "admin"]) {
      const p = path.join(SKILLS, c, "SKILL.md");
      if (fs.existsSync(p)) expect(frontmatter(fs.readFileSync(p, "utf8")).data["disable-model-invocation"]).toBe(true);
    }
  });

  test.each(Object.keys(GUIDES))("%s names only plugin paths that exist, never ../", (rel) => {
    const text = read(rel);
    expect(text).not.toMatch(/(^|[\s(`"'])\.\.\//m);
    for (const m of text.matchAll(/\{\{ROOT\}\}\/([A-Za-z0-9_./-]+)/g)) {
      const p = m[1].replace(/[.,;:)]+$/, "");
      const onDisk = p.startsWith("skills/") ? path.join(SRC, p) : path.join(STUDIO, p);
      expect({ path: p, exists: fs.existsSync(onDisk) }).toEqual({ path: p, exists: true });
    }
    expect(text).not.toMatch(/\{\{(?!PLUGIN\}\}|CLI\}\}|ROOT\}\})[A-Za-z_]+\}\}/);
  });

  test.each(Object.keys(GUIDES))("%s calls only CLI commands, subcommands and flags SPEC.md defines", (rel) => {
    for (const call of cliCalls(read(rel))) {
      const cmd = spec[call.command];
      expect({ call: call.line, known: Boolean(cmd) }).toEqual({ call: call.line, known: true });
      if (cmd.subs.size) expect({ call: call.line, sub: cmd.subs.has(call.sub) }).toEqual({ call: call.line, sub: true });
      for (const f of call.flags) {
        const defined = f === "--json" || f === "--root" || cmd.text.includes(f);
        expect({ call: call.line, flag: f, defined }).toEqual({ call: call.line, flag: f, defined: true });
      }
    }
  });

  test("every owned file is brand-neutral", () => {
    for (const rel of [...Object.keys(GUIDES), ...OWNED_DATA]) {
      const lower = read(rel).toLowerCase();
      for (const w of BANNED) expect({ rel, word: w, found: lower.includes(w) }).toEqual({ rel, word: w, found: false });
    }
  });

  test.each(SKILL_MDS)("%s/SKILL.md ends by naming the shared run-log step", (name) => {
    const text = read(`plugin-src/skills/${name}/SKILL.md`);
    const lastSection = text.split(/^## /m).pop();
    expect(lastSection).toMatch(/^\d+ · Log the run/);
    expect(lastSection).toContain("{{ROOT}}/skills/shared/run-log.md");
  });

  test("run-log appends through a quoted heredoc and asks only when should-ask says so", () => {
    const text = read("plugin-src/skills/shared/run-log.md");
    expect(text).toMatch(/\{\{CLI\}\} runs log --json - <<'ROW'/);
    expect(text).toContain("{{CLI}} runs should-ask --json");
    expect(text).toContain("Logged this run.");
    expect(text).toMatch(/person's own words/);
    for (const field of ["kind", "command", "args", "surface", "depth", "goal", "result", "blocks", "flags", "false_positives", "sources", "files_written", "duration_s", "rating", "note"]) {
      expect(text).toContain(`\`${field}\``);
    }
    const row = JSON.parse(/<<'ROW'\n(.*)\nROW/.exec(text)[1]);
    expect(Object.keys(row).sort()).toEqual(["args", "blocks", "command", "depth", "duration_s", "false_positives", "files_written", "flags", "goal", "kind", "note", "rating", "result", "sources", "surface"]);
  });

  test("context-pack has the three depths and the fixed block", () => {
    const text = read("plugin-src/skills/shared/context-pack.md");
    for (const d of ["**quick**", "**light**", "**full**"]) expect(text).toContain(d);
    const block = /```\nWhat we already know\n([\s\S]*?)```/.exec(text)[1];
    const labels = [...block.matchAll(/^- ([A-Z][a-z' ]+):/gm)].map((m) => m[1]);
    expect(labels).toEqual(["Decided", "Built", "In flight", "Tried before", "Signals", "Conflicts", "Couldn't read"]);
    expect(block).toMatch(/^Sources:/m);
    expect(text).toContain("{{CLI}} learnings list --json");
    expect(text).toContain("{{CLI}} loops status --json");
    expect(text).toContain("studio/decisions/");
  });

  test("brief prints the four fixed headings in order and reads the shared pack", () => {
    const text = read("plugin-src/skills/brief/SKILL.md");
    const at = ["Rules that apply", "Start from", "What we already know", "Checked against"].map((h) => text.indexOf(`\n${h}\n`));
    expect(at.every((i) => i > 0)).toBe(true);
    expect([...at].sort((a, b) => a - b)).toEqual(at);
    expect(text).toContain("{{CLI}} rules list --surface <surface> --json");
    expect(text).toContain("{{ROOT}}/skills/shared/context-pack.md");
  });

  test("check states the base, never falls back to HEAD~1, and labels review answers", () => {
    const text = read("plugin-src/skills/check/references/rules-check.md");
    expect(text).toMatch(/Always state the\s+base/);
    expect(text).toMatch(/never fall back to\s+`HEAD~1`/);
    expect(text).toContain("--base <ref>");
    expect(text).toContain("agent reading");
    expect(text).toContain("--starter");
    expect(text).toContain("{{CLI}} audit --json");
    for (const v of ["fail", "pass with flags", "pass with fixes"]) expect(text).toContain(`**${v}**`);
  });

  test("score is beta, read-only, and says withheld when withheld", () => {
    const text = read("plugin-src/skills/check/references/score.md");
    expect(text).toContain("{{CLI}} score --json");
    expect(text).toMatch(/beta/);
    expect(text).toMatch(/withheld/);
    expect(text).toContain("Open questions for a person");
  });
});

describe("check and brief evals", () => {
  const EXPECT_KEYS = {
    skill_invoked: "string",
    must_include: "strings",
    must_not_include: "strings",
    no_repo_writes: "boolean",
    no_write_before_turn: "integer",
    files_exist: "strings",
    files_absent: "strings",
    run_log_rows: "integer",
    cli_after: "cli",
    judge: "strings",
  };
  const fixtures = [...read("SPEC.md").matchAll(/^- (F\d-[a-z-]+):/gm)].map((m) => m[1]);
  const isStrings = (v) => Array.isArray(v) && v.every((s) => typeof s === "string" && s.length > 0);

  test("SPEC names the fixtures F0 to F8", () => {
    expect(fixtures.length).toBe(9);
  });

  test.each(["check", "brief"])("cases/%s.json validates against the case schema", (skill) => {
    const cases = JSON.parse(read(`evals/cases/${skill}.json`));
    expect(Array.isArray(cases)).toBe(true);
    expect(cases.length).toBe(skill === "check" ? 8 : 6);
    expect(new Set(cases.map((c) => c.id)).size).toBe(cases.length);
    for (const c of cases) {
      expect(Object.keys(c).filter((k) => !["id", "skill", "fixture", "variant", "turns", "beta", "expect"].includes(k))).toEqual([]);
      expect(c.skill).toBe(skill);
      expect(fixtures).toContain(c.fixture);
      if (c.variant !== undefined) expect(typeof c.variant).toBe("string");
      if (c.beta !== undefined) expect(typeof c.beta).toBe("boolean");
      expect(isStrings(c.turns) && c.turns.length > 0).toBe(true);
      for (const [k, v] of Object.entries(c.expect)) {
        const type = EXPECT_KEYS[k];
        expect({ id: c.id, key: k, known: Boolean(type) }).toEqual({ id: c.id, key: k, known: true });
        const ok =
          type === "string" ? typeof v === "string" :
          type === "boolean" ? typeof v === "boolean" :
          type === "integer" ? Number.isInteger(v) && v >= 0 :
          type === "strings" ? isStrings(v) :
          Array.isArray(v) && v.every((x) => isStrings(x.argv) && Number.isInteger(x.code) && Object.keys(x).length === 2);
        expect({ id: c.id, key: k, ok }).toEqual({ id: c.id, key: k, ok: true });
      }
      expect(c.expect.skill_invoked).toBe(skill);
      expect(c.expect.run_log_rows).toBe(1);
    }
  });

  test("check cases cover F1 and F3, the first run, the no-origin variant and the score", () => {
    const cases = JSON.parse(read("evals/cases/check.json"));
    expect(new Set(cases.map((c) => c.fixture))).toEqual(new Set(["F1-ui-drift", "F3-installed"]));
    expect(cases.some((c) => c.fixture === "F1-ui-drift" && c.turns[0] === "check my design" && c.expect.no_repo_writes)).toBe(true);
    expect(cases.some((c) => c.variant === "no-origin")).toBe(true);
    expect(cases.some((c) => c.beta === true)).toBe(true);
  });

  test("brief cases cover F3 and F7 with the headings, Sources and couldn't read", () => {
    const cases = JSON.parse(read("evals/cases/brief.json"));
    expect(new Set(cases.map((c) => c.fixture))).toEqual(new Set(["F3-installed", "F7-surfaces"]));
    expect(cases.every((c) => c.expect.must_include.includes("Sources"))).toBe(true);
    expect(cases.some((c) => c.fixture === "F7-surfaces" && c.expect.must_include.includes("Couldn't read"))).toBe(true);
  });

  test("triggers.json: 30 asks, positives for setup, brief and check, collisions and person-only asks expect null", () => {
    const asks = JSON.parse(read("evals/triggers.json"));
    expect(asks.length).toBe(30);
    expect(new Set(asks.map((a) => a.ask.toLowerCase())).size).toBe(30);
    for (const a of asks) {
      expect(Object.keys(a).filter((k) => !["ask", "expect", "note"].includes(k))).toEqual([]);
      expect(typeof a.ask).toBe("string");
      expect(["setup", "brief", "check", null]).toContain(a.expect);
      if (a.note !== undefined) expect(typeof a.note).toBe("string");
      if (/\b(loop|admin)\b/i.test(a.ask)) expect(a.expect).toBeNull();
    }
    const positives = asks.filter((a) => a.expect);
    expect(positives.length).toBeGreaterThanOrEqual(16);
    expect(positives.length).toBeLessThanOrEqual(20);
    for (const s of ["setup", "brief", "check"]) expect(asks.filter((a) => a.expect === s).length).toBeGreaterThanOrEqual(4);
    const negatives = asks.filter((a) => a.expect === null).map((a) => a.ask.toLowerCase());
    for (const c of ["critique this mockup", "design a logo", "write a blog post", "accessibility review of this figma"]) {
      expect(negatives.some((n) => n.includes(c))).toBe(true);
    }
    expect(negatives.some((n) => /\bloop\b/.test(n))).toBe(true);
    expect(negatives.some((n) => /\badmin\b/.test(n))).toBe(true);
  });
});
