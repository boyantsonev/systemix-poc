"use strict";

// Structural checks on the loop and admin guides and their eval cases. No model, no network.

const fs = require("fs");
const path = require("path");
const { frontmatter } = require("../src/lib/md");

const STUDIO = path.join(__dirname, "..");
const SRC = path.join(STUDIO, "plugin-src");
const read = (rel) => fs.readFileSync(path.join(STUDIO, rel), "utf8");

const LOOP_REFS = ["status-and-setup", "open", "next", "gate", "decide", "jobs"];
const GUIDES = {
  "plugin-src/skills/loop/SKILL.md": 150,
  ...Object.fromEntries(LOOP_REFS.map((r) => [`plugin-src/skills/loop/references/${r}.md`, 150])),
  "plugin-src/skills/admin/SKILL.md": 150,
  "plugin-src/skills/admin/references/admin.md": 150,
};
const SKILL_MDS = ["loop", "admin"];
const CASES = ["loop", "admin"];
const OWNED_DATA = CASES.map((c) => `evals/cases/${c}.json`);
const BANNED = ["systemix", "getsystemix", "hermes", "hellobill", "--bill-", "vero", "vito", "contract/", ".systemix", "experiments/", "guardrails.mdx", "localhost:", "posthog", "notion", "claude.ai/artifact"];
const PLACEHOLDERS = ["PLUGIN", "CLI", "ROOT", "REPO"];

/** Commands and their subcommands, read from SPEC.md's "## Commands" section. */
function specCommands() {
  const spec = read("SPEC.md");
  const section = spec.split(/^## Commands$/m)[1].split(/^## /m)[0].replace(/^```[\s\S]*?^```$/gm, "");
  const out = {};
  for (const block of section.split(/^### /m).slice(1)) {
    const name = /^([a-z][a-z-]*)/.exec(block)[1];
    const subs = new Set();
    for (const m of block.matchAll(new RegExp("`" + name + " ([a-z][a-z-]*)(?=[\\s`])", "g"))) subs.add(m[1]);
    out[name] = { subs, text: block };
  }
  return out;
}

/** Every `{{CLI}} <command> [<sub>] …` call in a guide. */
function cliCalls(text) {
  const calls = [];
  for (const m of text.matchAll(/\{\{CLI\}\}\s+([a-z][a-z-]*)([^\n`]*)/g)) {
    const rest = m[2].trim().split(/\s+/).filter(Boolean);
    const sub = rest[0] && /^[a-z][a-z-]*$/.test(rest[0]) ? rest[0] : null;
    const flags = [...m[2].matchAll(/(?:^|[\s[])(--[a-z][a-z-]*)/g)].map((f) => f[1]);
    calls.push({ command: m[1], sub, flags, line: m[0] });
  }
  return calls;
}

describe("loop and admin guides", () => {
  const spec = specCommands();

  test("SPEC parsing finds the commands these guides rely on", () => {
    expect([...spec.loops.subs]).toEqual(expect.arrayContaining(["init", "check", "status", "goal", "gate", "decisions"]));
    expect([...spec.learnings.subs]).toEqual(expect.arrayContaining(["add", "used", "list"]));
    expect([...spec.runs.subs]).toEqual(expect.arrayContaining(["rate", "list"]));
    expect([...spec.proposals.subs]).toEqual(expect.arrayContaining(["lint", "list", "next-id", "decide", "apply"]));
    expect([...spec.admin.subs]).toEqual(expect.arrayContaining(["eval", "digest"]));
  });

  test.each(Object.entries(GUIDES))("%s exists and stays within its line budget", (rel, budget) => {
    expect(read(rel).split("\n").length).toBeLessThanOrEqual(budget);
  });

  test.each(SKILL_MDS)("%s/SKILL.md has valid frontmatter and is person-only", (name) => {
    const text = read(`plugin-src/skills/${name}/SKILL.md`);
    expect(text.startsWith("---\n")).toBe(true);
    const { data } = frontmatter(text);
    expect(data.name).toBe(name);
    expect(typeof data.description).toBe("string");
    expect(data.description.length).toBeGreaterThan(80);
    expect(data.description.length).toBeLessThanOrEqual(1024);
    expect(data.description).toMatch(/\bUse when\b/);
    expect(data.description).toMatch(/\bNot for\b/);
    expect(data.description).toMatch(/ux-copy skill/);
    expect(data.description).toMatch(/design-critique skill/);
    expect(data["disable-model-invocation"]).toBe(true);
    expect(text).toMatch(/^disable-model-invocation: true$/m);
    expect(typeof data["argument-hint"]).toBe("string");
  });

  test.each(Object.keys(GUIDES))("%s names only plugin paths that exist, never ../", (rel) => {
    const text = read(rel);
    expect(text).not.toMatch(/(^|[\s(`"'])\.\.\//m);
    for (const m of text.matchAll(/\{\{ROOT\}\}\/([A-Za-z0-9_./-]+)/g)) {
      const p = m[1].replace(/[.,;:)]+$/, "");
      expect(p.startsWith("skills/")).toBe(true);
      expect({ path: p, exists: fs.existsSync(path.join(SRC, p)) }).toEqual({ path: p, exists: true });
    }
    for (const m of text.matchAll(/\{\{([A-Za-z_]+)\}\}/g)) expect(PLACEHOLDERS).toContain(m[1]);
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
    const last = read(`plugin-src/skills/${name}/SKILL.md`).split(/^## /m).pop();
    expect(last).toMatch(/^\d+ · Log the run/);
    expect(last).toContain("{{ROOT}}/skills/shared/run-log.md");
    expect(last).toContain(`command: "${name}"`);
  });

  test("the loop router dispatches every subcommand by explicit path and glosses its words", () => {
    const text = read("plugin-src/skills/loop/SKILL.md");
    for (const r of LOOP_REFS) expect(text).toContain(`{{ROOT}}/skills/loop/references/${r}.md`);
    for (const w of ["status", "setup", "open", "next", "gate", "decide"]) expect(text).toContain(`\`${w}`);
    for (const w of ["**gate**", "**roster**", "**holder**", "**deputy**", "**join**"]) expect(text).toContain(w);
    expect(text).toContain("{{CLI}} loops check --json");
    expect(text).toMatch(/never merges/);
  });

  test("status and setup: solo by default, team opt-in, no placeholders, draft to agreed, first goal", () => {
    const text = read("plugin-src/skills/loop/references/status-and-setup.md");
    expect(text).toContain("{{CLI}} loops status --json");
    expect(text).toContain("{{CLI}} loops init --dry-run --json");
    expect(text).toContain("--preset team");
    expect(text).toMatch(/Solo is the default/);
    expect(text).toMatch(/status: draft/);
    expect(text).toMatch(/status: agreed/);
    expect(text).toMatch(/fix one small visible drift/);
    expect(text).toMatch(/never touch/i);
  });

  test("open: last check from the run log, goal new, 5 to 12 evals, hard stop, jobs offered", () => {
    const text = read("plugin-src/skills/loop/references/open.md");
    expect(text).toContain("{{CLI}} runs list --command check --json");
    expect(text).toContain('{{CLI}} loops goal new <slug> --title "<the sentence>" --json');
    expect(text).toMatch(/5 to 12/);
    expect(text).toMatch(/Hard stop/);
    expect(text).toContain("{{ROOT}}/skills/loop/references/jobs.md");
    expect(text).toMatch(/No subagents/);
    expect(text.indexOf("Write G-<next>")).toBeLessThan(text.indexOf("{{CLI}} loops goal new"));
    expect(text).toContain("{{CLI}} connectors issue G-NNN --json");
    expect(text).toContain("{{ROOT}}/skills/shared/connectors.md");
  });

  test("gate: the CLI writes the line, refuses a non-holder, brief none, goal-folder-only changes", () => {
    const text = read("plugin-src/skills/loop/references/gate.md");
    expect(text).toMatch(/\{\{CLI\}\} loops gate G-NNN approve --by "<name>"/);
    expect(text).toContain("- <today> · <gate> · <approve|rework|drop> · by <name> · brief: <B-NNN|none>[ · note: <note>]");
    expect(text).toContain('{error:"not-a-holder"}');
    expect(text).toContain("--brief none");
    expect(text).toMatch(/weak on a\s+shared machine/);
    expect(text).toMatch(/only files inside the goal's own folder/);
    expect(text).toContain("{{CLI}} connectors comment G-NNN --json");
    expect(text).toContain("{{CLI}} connectors notice gate G-NNN --json");
    expect(text).toContain("{{ROOT}}/skills/shared/connectors.md");
  });

  test("next: the playbook rows as the catalog sets them", () => {
    const text = read("plugin-src/skills/loop/references/next.md");
    expect(text).toMatch(/2 to 3 variants in real code/);
    expect(text).toMatch(/At most 3 rounds/);
    expect(text).toMatch(/a person picks/);
    expect(text).toContain("{{CLI}} rules check <its files> --json");
    expect(text).toContain("{{CLI}} preview --json");
    expect(text).toMatch(/event name equals the metric/);
    expect(text).toMatch(/every capture is\s+tagged `variant`/);
    expect(text).toMatch(/not measured/);
    expect(text).toContain("studio/evaluations.md");
    expect(text).toContain("{{CLI}} evidence check --json");
    expect(text).toContain("{{CLI}} connectors page measurement G-NNN --json");
    expect(text).toContain("{{CLI}} learnings add --text");
    expect(text).toContain("{{CLI}} learnings used L-NNN --by G-NNN --json");
    expect(text).toMatch(/never open it/);
    expect(text).toMatch(/engineering-lead/);
    expect(text).toMatch(/Never merge/);
    expect(text).not.toMatch(/\bhub\b|parity|VERSION/);
  });

  test("decide: the five sections, never decides, pack questions proposed only", () => {
    const text = read("plugin-src/skills/loop/references/decide.md");
    for (const s of ["**Question**", "**Options**", "**What we already know**", "**Sources**", "**Who rules**"]) expect(text).toContain(s);
    expect(text).toContain("studio/briefs/README.md");
    expect(text).toContain("{{ROOT}}/skills/shared/context-pack.md");
    expect(text).toMatch(/never decides/);
    expect(text).toMatch(/only after a yes/);
  });

  test("jobs: beta, by hand, jobs check named as not built, estimated tags, hands back to open", () => {
    const text = read("plugin-src/skills/loop/references/jobs.md");
    expect(text).toMatch(/beta/);
    expect(text).toMatch(/`jobs check` command[^\n]*\n?[^\n]*NOT YET BUILT/);
    expect(text).not.toMatch(/\{\{CLI\}\} jobs/);
    expect(text).toContain("estimated: true");
    expect(text).toMatch(/8 to 15/);
    expect(text).toMatch(/Minimize\|Increase/);
    expect(text).toMatch(/Never open a\s+goal from here/);
  });

  test("admin: every subcommand's CLI call and the guardrails", () => {
    const text = read("plugin-src/skills/admin/references/admin.md");
    for (const c of [
      "{{CLI}} runs rate last down",
      "{{CLI}} runs list --since YYYY-MM-DD --json",
      "{{CLI}} admin eval --json",
      "{{CLI}} admin digest --json",
      "{{CLI}} proposals next-id --json",
      "{{CLI}} proposals lint --json",
      '{{CLI}} proposals decide P-NNN approve --by "<name>" --json',
      "{{CLI}} proposals apply P-NNN --json",
      "{{CLI}} connectors page digest --json",
      "{{CLI}} connectors notice digest --json",
      '{{CLI}} proposals decide P-NNN decline --by "<name>" --why "<why>" --json',
    ]) expect(text).toContain(c);
    expect(text).toContain("gh issue create --repo {{REPO}}");
    expect(text).toContain("https://github.com/{{REPO}}/issues/new");
    for (const k of ["id:", "title:", "target:", "kind:", "evidence:", "status: New", "decided_by: null", "decided_at: null", "evals_before: null", "evals_after: null", "created:"]) expect(text).toContain(k);
    for (const h of ["## Problem", "## Change", "## How it will be checked"]) expect(text).toContain(h);
    for (const t of ["3 or more times", "5 or more runs", "0.30 or more", "2 or more times"]) expect(text).toContain(t);
    expect(text).toMatch(/write nothing outside `studio\/proposals\/` and `studio\/\.state\/`/);
    expect(text).toMatch(/Admin cannot change its thresholds/);
    expect(text).toMatch(/never approves its\s+own proposal/);
    expect(text).toMatch(/No proposals this run/);
    const admin = read("plugin-src/skills/admin/SKILL.md");
    expect(admin).toContain("{{ROOT}}/skills/admin/references/admin.md");
    expect(admin).toMatch(/never edits skills, rules or plugin files/);
    expect(admin).toContain('kind: "admin"');
  });
});

describe("loop and admin evals", () => {
  const EXPECT_KEYS = {
    skill_invoked: "string",
    must_include: "strings",
    must_not_include: "strings",
    no_repo_writes: "boolean",
    no_write_before_turn: "integer",
    files_exist: "strings",
    files_absent: "strings",
    run_log_rows: "integer",
    run_log_rows_min: "integer",
    cli_after: "cli",
    judge: "strings",
  };
  const fixtures = [...read("SPEC.md").matchAll(/^- (F\d-[a-z-]+):/gm)].map((m) => m[1]);
  const isStrings = (v) => Array.isArray(v) && v.every((s) => typeof s === "string" && s.length > 0);
  const load = (skill) => JSON.parse(read(`evals/cases/${skill}.json`));

  test.each(CASES)("cases/%s.json validates against the case schema", (skill) => {
    const cases = load(skill);
    expect(Array.isArray(cases) && cases.length >= 6).toBe(true);
    expect(new Set(cases.map((c) => c.id)).size).toBe(cases.length);
    for (const c of cases) {
      expect(Object.keys(c).filter((k) => !["id", "skill", "fixture", "variant", "turns", "beta", "expect"].includes(k))).toEqual([]);
      expect(c.skill).toBe(skill);
      expect(c.id.startsWith(`${skill}-`)).toBe(true);
      expect(fixtures).toContain(c.fixture);
      if (c.variant !== undefined) expect(typeof c.variant).toBe("string");
      if (c.beta !== undefined) expect(typeof c.beta).toBe("boolean");
      expect(isStrings(c.turns) && c.turns.length > 0).toBe(true);
      expect(c.turns[0].startsWith(`/product-studio:${skill}`)).toBe(true);
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
      expect((Number.isInteger(c.expect.run_log_rows) && c.expect.run_log_rows >= 1) || (Number.isInteger(c.expect.run_log_rows_min) && c.expect.run_log_rows_min >= 1)).toBe(true);
      if (c.expect.no_write_before_turn !== undefined) {
        expect(c.expect.no_write_before_turn).toBeLessThanOrEqual(c.turns.length);
        expect(c.turns[c.expect.no_write_before_turn - 1]).toBe("{{yes}}");
      }
    }
  });

  test("loop cases: the scripted F4 walk, loops check at every stop, refusal and the 3-variant cap", () => {
    const cases = load("loop");
    for (const c of cases.filter((x) => !x.beta && !x.expect.no_repo_writes)) {
      expect(c.expect.cli_after.some((a) => a.argv.join(" ") === "loops check --json" && a.code === 0)).toBe(true);
    }
    const walk = cases.find((c) => c.id === "loop-walk-f4");
    const verbs = walk.turns.filter((t) => t.startsWith("/product-studio:loop")).map((t) => t.split(" ")[1]);
    expect(verbs).toEqual(["open", "gate", "next", "decide", "gate"]); // the brief is for the validate gate, while a person waits there
    expect(walk.expect.run_log_rows).toBe(walk.turns.length); // one row per turn that ends a run (SPEC)
    expect(cases.some((c) => c.id === "loop-gate-refuses-non-roster")).toBe(true);
    expect(cases.some((c) => (c.expect.judge || []).some((j) => /at most 3 variants/.test(j)))).toBe(true);
    expect(cases.some((c) => c.expect.must_include && c.expect.must_include.includes("not measured"))).toBe(true);
    for (const goal of ["G-002", "G-003", "G-004", "G-005"]) expect(cases.some((c) => c.turns[0] === `/product-studio:loop next ${goal}`)).toBe(true);
  });

  test("admin cases: F6 run, clean log gives none, plugin approve is a draft only, apply and decline", () => {
    const cases = load("admin");
    expect(cases.every((c) => c.fixture === "F6-runlog")).toBe(true);
    expect(cases.some((c) => c.turns.length === 1 && c.turns[0] === "/product-studio:admin run" && !c.variant)).toBe(true);
    const clean = cases.find((c) => c.variant === "clean" && c.turns[0] === "/product-studio:admin run");
    expect(clean.expect.no_repo_writes).toBe(true);
    expect(clean.expect.must_include).toContain("No proposals");
    expect(cases.some((c) => c.variant === "vendored" && c.turns.some((t) => /approve P-\d{3}/.test(t)))).toBe(true);
    for (const sub of ["rate", "runs", "approve", "decline"]) {
      expect(cases.some((c) => c.turns.some((t) => t.startsWith(`/product-studio:admin ${sub}`)))).toBe(true);
    }
  });
});
