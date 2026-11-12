"use strict";

// Structural checks on the setup guides (plugin-src/skills/setup/**, shared/preview.md) and their
// eval cases (evals/cases/setup.json, first-run.json). SPEC.md is the contract they are read against.

const fs = require("fs");
const path = require("path");
const { frontmatter } = require("../src/lib/md");

const STUDIO = path.join(__dirname, "..");
const SKILLS = path.join(STUDIO, "plugin-src", "skills");
const SPEC = fs.readFileSync(path.join(STUDIO, "SPEC.md"), "utf8");

const OWN = [
  "setup/SKILL.md",
  "setup/references/from-code.md",
  "setup/references/interview.md",
  "setup/references/import.md",
  "setup/references/component-docs.md",
  "setup/references/migrate.md",
  "setup/references/analytics.md",
  "shared/preview.md",
  "shared/connectors.md",
];
const BUDGET = { "setup/references/from-code.md": 120, "shared/connectors.md": 120 };
const DEFAULT_BUDGET = 150;
const CASE_FILES = ["setup.json", "first-run.json"];
const FIXTURE_IDS = ["F0-empty", "F1-ui-drift", "F2-css-vars", "F3-installed", "F4-loops", "F5-sources", "F6-runlog", "F7-surfaces", "F8-legacy"];
const SKILL_NAMES = ["setup", "brief", "check", "loop", "admin"];

const text = (rel) => fs.readFileSync(path.join(SKILLS, rel), "utf8");

// --- SPEC: the command list, each command's subcommands and flags -------------------------------

function specSection(start, end) {
  const a = SPEC.indexOf(start);
  const b = SPEC.indexOf(end, a + 1);
  return SPEC.slice(a, b === -1 ? undefined : b);
}

function specCommands() {
  const body = specSection("\n## Commands", "\n## Templates");
  const parts = body.split(/\n### /).slice(1);
  const out = {};
  for (const part of parts) {
    const name = /^([a-z][a-z-]*)/.exec(part)[1];
    const subs = new Set();
    for (const m of part.matchAll(new RegExp("`" + name + " ([a-z][a-z-]*)", "g"))) subs.add(m[1]);
    const flags = new Set(["--root", "--json", "--help"]);
    for (const m of part.matchAll(/--[a-z][a-z-]*/g)) flags.add(m[0]);
    out[name] = { subs, flags };
  }
  return out;
}

const COMMANDS = specCommands();
const TEMPLATES_SECTION = specSection("\n## Templates", "\n## Fixtures");

/** Each `{{CLI}} …` call in a text: the rest of its line or backtick span, split into words. */
function cliCalls(t) {
  return [...t.matchAll(/\{\{CLI\}\}([^`\n]*)/g)].map((m) => m[1].trim().split(/\s+/).filter(Boolean)).filter((w) => w.length);
}

function callProblem(words) {
  const [cmd, maybeSub] = words;
  const c = COMMANDS[cmd];
  if (!c) return `unknown command "${cmd}"`;
  if (c.subs.size && !c.subs.has(maybeSub)) return `"${cmd} ${maybeSub}" is not a subcommand in SPEC`;
  const bad = words.filter((w) => /^--[a-z]/.test(w) && !c.flags.has(w.replace(/[.,;:)]+$/, "")));
  return bad.length ? `"${cmd}" has no flag ${bad.join(", ")} in SPEC` : null;
}

// --- banned words (lowercase), with the only guide files allowed to name them -----------------

const BANNED = [
  ["systemix", /^setup\/references\/migrate\.md$/],
  ["getsystemix", null],
  ["hermes", null],
  ["hellobill", null],
  ["--bill-", null],
  [/\bvero\b/, null],
  [/\bvito\b/, null],
  ["notion", /^shared\/connectors\.md$/],
  ["contract/", null],
  ["localhost:", null],
  ["claude.ai/artifact", null],
  ["experiments/", /^setup\/references\/migrate\.md$/],
  ["guardrails.mdx", /^setup\/(SKILL|references\/migrate)\.md$/],
  ["posthog", /^(setup\/references\/analytics|shared\/connectors)\.md$/],
  ["ghost", null],
  ["autonomy", null],
  ["queue card", null],
  ["dashboard", null],
  ["/config", null],
  ["/ingest", null],
];

function bannedIn(t, file) {
  const lower = t.toLowerCase();
  return BANNED.filter(([w, allowed]) => (typeof w === "string" ? lower.includes(w) : w.test(lower)) && !(allowed && file && allowed.test(file))).map(([w]) => String(w));
}

describe("setup guides", () => {
  test("every owned guide exists", () => {
    for (const f of OWN) expect(fs.existsSync(path.join(SKILLS, f))).toBe(true);
  });

  test("setup/SKILL.md frontmatter: name, a when-and-when-not description, an argument hint", () => {
    const raw = text("setup/SKILL.md");
    const fmBlock = /^---\n([\s\S]*?)\n---\n/.exec(raw);
    expect(fmBlock).not.toBeNull();
    const { data } = frontmatter(raw);
    expect(data.name).toBe("setup");
    expect(typeof data.description).toBe("string");
    const d = data.description;
    // a plain YAML scalar: no ": " or " #" inside, and it doesn't start with a quote or indicator
    expect(d).not.toMatch(/: | #/);
    expect(d).not.toMatch(/^["'[{>|*&!%@`]/);
    expect(d.length).toBeLessThanOrEqual(1024);
    expect(d).toMatch(/Use when/);
    expect(d).toMatch(/Not for/);
    expect(d).toMatch(/ux-copy/);
    expect(d).toMatch(/design-critique/);
    for (const phrase of ["set up a design system", "our colours are all over the place", "import our tokens from Figma"]) expect(d).toContain(phrase);
    expect(data["disable-model-invocation"]).not.toBe(true);
    expect(typeof data["argument-hint"]).toBe("string");
  });

  test("person-only commands (loop, admin) disable model invocation, where they exist", () => {
    for (const c of ["loop", "admin"]) {
      const p = path.join(SKILLS, c, "SKILL.md");
      if (!fs.existsSync(p)) continue;
      expect(frontmatter(fs.readFileSync(p, "utf8")).data["disable-model-invocation"]).toBe(true);
    }
  });

  test("references have no frontmatter of their own and stay within their line budgets", () => {
    for (const f of OWN) {
      const t = text(f);
      if (f !== "setup/SKILL.md") expect(t.startsWith("---")).toBe(false);
      const lines = t.split("\n").length - (t.endsWith("\n") ? 1 : 0);
      expect({ f, lines: lines <= (BUDGET[f] || DEFAULT_BUDGET) }).toEqual({ f, lines: true });
    }
  });

  test("only the three build placeholders are used, and no ../ path", () => {
    for (const f of OWN) {
      const t = text(f);
      const placeholders = [...t.matchAll(/\{\{([A-Za-z_]+)\}\}/g)].map((m) => m[1]);
      for (const p of placeholders) expect({ f, p, ok: ["PLUGIN", "CLI", "ROOT"].includes(p) }).toEqual({ f, p, ok: true });
      expect({ f, dotdot: /\.\.\//.test(t) }).toEqual({ f, dotdot: false });
    }
  });

  test("every {{ROOT}}/skills/… path named exists in plugin-src; every template named is in SPEC", () => {
    const missing = [];
    for (const f of OWN) {
      for (const m of text(f).matchAll(/\{\{ROOT\}\}\/([A-Za-z0-9_./-]+)/g)) {
        const p = m[1].replace(/[.,;:)]+$/, "");
        if (p.startsWith("skills/")) {
          if (!fs.existsSync(path.join(STUDIO, "plugin-src", p))) missing.push(`${f}: ${p}`);
        } else if (p.startsWith("templates/")) {
          const rest = p.slice("templates/".length);
          const base = path.basename(rest);
          if (!TEMPLATES_SECTION.includes(base) && !TEMPLATES_SECTION.includes(rest)) missing.push(`${f}: ${p} (not in SPEC templates)`);
        } else missing.push(`${f}: ${p} (neither skills/ nor templates/)`);
      }
    }
    expect(missing).toEqual([]);
  });

  test("SKILL.md dispatches to every setup reference, --loops names the loop reference, and it ends with the run log", () => {
    const t = text("setup/SKILL.md");
    for (const r of ["from-code", "interview", "import", "component-docs", "migrate", "analytics"]) {
      expect(t).toContain(`{{ROOT}}/skills/setup/references/${r}.md`);
    }
    expect(t).toContain("{{ROOT}}/skills/loop/references/status-and-setup.md");
    expect(t).toContain("{{ROOT}}/skills/shared/preview.md");
    expect(t).toContain("--connectors");
    expect(t).toContain("{{ROOT}}/skills/shared/connectors.md");
    const last = t.slice(t.lastIndexOf("\n## "));
    expect(last).toMatch(/run log/i);
    expect(last).toContain("{{ROOT}}/skills/shared/run-log.md");
    for (const finish of ["rules lint", "rules eval", "tokens lint", "Open questions for a person", "gitignore-snippet", "templates/ci/design-rules.yml", "templates/agents-block.md"]) {
      expect(t).toContain(finish);
    }
  });

  test("every {{CLI}} call names a command, subcommand and flags that SPEC lists", () => {
    const problems = [];
    let calls = 0;
    for (const f of OWN) {
      for (const words of cliCalls(text(f))) {
        calls++;
        const p = callProblem(words);
        if (p) problems.push(`${f}: {{CLI}} ${words.join(" ")}: ${p}`);
      }
    }
    expect(calls).toBeGreaterThan(10);
    expect(problems).toEqual([]);
  });

  test("no banned brand, product or retired words", () => {
    const hits = [];
    for (const f of OWN) for (const w of bannedIn(text(f), f)) hits.push(`${f}: ${w}`);
    expect(hits).toEqual([]);
  });

  test("the door guides promise no write before a yes and quote numbers from the CLI", () => {
    for (const f of ["setup/SKILL.md", "setup/references/from-code.md", "setup/references/interview.md", "setup/references/import.md", "setup/references/migrate.md"]) {
      const t = text(f);
      expect({ f, yes: /\byes\b/.test(t) }).toEqual({ f, yes: true });
    }
    expect(text("setup/references/import.md")).toContain("Figma not connected");
    expect(text("setup/references/import.md")).toContain("send me the export");
    expect(text("setup/references/interview.md")).toMatch(/At most 8 questions/);
    expect(text("setup/references/interview.md")).toMatch(/One question per turn/);
  });
});

describe("the connectors guide", () => {
  test("names the config, the rule, each connector's CLI text and tool, and the setup interview", () => {
    const t = text("shared/connectors.md");
    expect(t).toContain("studio/connectors.json");
    expect(t).toContain("{{CLI}} connectors check --json");
    for (const c of ["issue G-NNN", "comment G-NNN", "page measurement G-NNN", "page digest", "notice gate G-NNN", "notice digest"]) expect(t).toContain(`{{CLI}} connectors ${c} --json`);
    expect(t).toContain("{{CLI}} evidence check --json");
    expect(t).toMatch(/not connected/);
    expect(t).toMatch(/"post": "ask"/);
    expect(t).toMatch(/"post": "auto"/);
    expect(t).toContain("gh issue create --repo <repo> --label <label> --title");
    expect(t).toContain("--body-file <tmp>");
    expect(t).toContain("gh issue comment");
    expect(t).toContain("gh issue close");
    expect(t).toContain("issue: <n>");
    expect(t).toMatch(/notion-create-pages/);
    expect(t).toMatch(/One question per turn/);
  });
});

describe("setup eval cases", () => {
  const EXPECT_KEYS = ["skill_invoked", "must_include", "must_not_include", "no_repo_writes", "no_write_before_turn", "files_exist", "files_absent", "run_log_rows", "run_log_rows_min", "cli_after", "judge"];
  const CASE_KEYS = ["id", "skill", "fixture", "variant", "turns", "beta", "expect"];
  const strList = (v) => Array.isArray(v) && v.every((x) => typeof x === "string");

  function caseProblems(c) {
    const p = [];
    for (const k of Object.keys(c)) if (!CASE_KEYS.includes(k)) p.push(`unknown key ${k}`);
    if (typeof c.id !== "string" || !c.id) p.push("id");
    if (!SKILL_NAMES.includes(c.skill)) p.push("skill");
    if (!FIXTURE_IDS.includes(c.fixture)) p.push(`fixture ${c.fixture}`);
    if ("variant" in c && typeof c.variant !== "string") p.push("variant");
    if ("beta" in c && typeof c.beta !== "boolean") p.push("beta");
    if (!strList(c.turns) || !c.turns.length) p.push("turns");
    const e = c.expect;
    if (!e || typeof e !== "object") return [...p, "expect"];
    for (const k of Object.keys(e)) if (!EXPECT_KEYS.includes(k)) p.push(`unknown expect key ${k}`);
    if ("skill_invoked" in e && !(SKILL_NAMES.includes(e.skill_invoked) || (strList(e.skill_invoked) && e.skill_invoked.every((s) => SKILL_NAMES.includes(s))))) p.push("skill_invoked");
    for (const k of ["must_include", "must_not_include", "files_exist", "files_absent", "judge"]) if (k in e && !strList(e[k])) p.push(k);
    if ("no_repo_writes" in e && typeof e.no_repo_writes !== "boolean") p.push("no_repo_writes");
    if ("run_log_rows" in e && !(Number.isInteger(e.run_log_rows) && e.run_log_rows >= 0)) p.push("run_log_rows");
    if ("run_log_rows_min" in e && !(Number.isInteger(e.run_log_rows_min) && e.run_log_rows_min >= 1)) p.push("run_log_rows_min");
    if ("no_write_before_turn" in e) {
      const n = e.no_write_before_turn;
      if (!Number.isInteger(n) || n < 1 || n > c.turns.length || c.turns[n - 1] !== "{{yes}}") p.push("no_write_before_turn must point at a {{yes}} turn (1-based)");
    }
    if ("cli_after" in e) {
      if (!Array.isArray(e.cli_after)) p.push("cli_after");
      else for (const x of e.cli_after) {
        if (!strList(x.argv) || !Number.isInteger(x.code)) p.push("cli_after entry");
        else {
          const prob = callProblem(x.argv);
          if (prob) p.push(`cli_after ${x.argv.join(" ")}: ${prob}`);
        }
      }
    }
    // the write-before-yes promise is tested on every case
    if (!(e.no_repo_writes === true || "no_write_before_turn" in e)) p.push("needs no_repo_writes or no_write_before_turn");
    return p;
  }

  for (const file of CASE_FILES) {
    test(`${file} validates against the case schema`, () => {
      const cases = JSON.parse(fs.readFileSync(path.join(STUDIO, "evals", "cases", file), "utf8"));
      expect(Array.isArray(cases)).toBe(true);
      expect(cases.length).toBeGreaterThan(0);
      const ids = cases.map((c) => c.id);
      expect(new Set(ids).size).toBe(ids.length);
      const problems = cases.flatMap((c) => caseProblems(c).map((m) => `${c.id}: ${m}`));
      expect(problems).toEqual([]);
      for (const c of cases) {
        const said = [...c.turns, ...(c.expect.must_include || []), ...(c.expect.judge || [])].join("\n");
        // only a migrate case (F8) may name the older install's files
        const legacyOk = c.fixture === "F8-legacy" ? ["guardrails.mdx", "experiments/", "systemix"] : [];
        expect({ id: c.id, banned: bannedIn(said, null).filter((w) => !legacyOk.includes(w)) }).toEqual({ id: c.id, banned: [] });
      }
    });
  }

  test("setup.json covers every door named in the catalog", () => {
    const cases = JSON.parse(fs.readFileSync(path.join(STUDIO, "evals", "cases", "setup.json"), "utf8"));
    const fixtures = new Set(cases.map((c) => c.fixture));
    for (const f of ["F0-empty", "F1-ui-drift", "F2-css-vars", "F5-sources", "F8-legacy"]) expect(fixtures.has(f)).toBe(true);
    const all = JSON.stringify(cases);
    expect(all).toContain("Figma not connected");
    expect(all).toContain("send me the export");
    expect(all).toContain("Open questions for a person");
  });

  test("first-run gates the release: F1, check then setup, findings first, nothing written", () => {
    const [c] = JSON.parse(fs.readFileSync(path.join(STUDIO, "evals", "cases", "first-run.json"), "utf8"));
    expect(c.fixture).toBe("F1-ui-drift");
    expect(c.turns[0]).toBe("check my design");
    expect(c.expect.no_repo_writes).toBe(true);
    expect(c.expect.must_include).toEqual(expect.arrayContaining(["preview.html", "Open questions for a person"]));
  });
});
