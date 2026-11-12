#!/usr/bin/env node
// The maintainer's behavioural eval harness (layers 2 and 3). It needs Claude Code and a key,
// costs money and is not part of CI. Every case runs in a fresh nested session on a throwaway
// copy of its fixture, with the built plugin loaded and a narrow tool allowlist.
//
//   node evals/run.mjs --list
//   node evals/run.mjs --triggers [--limit N]
//   node evals/run.mjs --cases check,brief | --case <id>[,<id>…] [--samples N]
//   options: --concurrency N (4) · --max-cost-usd X (25) · --out <file> · --keep · --no-judge
//            --model sonnet|opus (sonnet) · --with-installed (also load this machine's other plugins)
//
// Scoring is in evals/lib/score.cjs (unit-tested). Results go to evals/results/<date>.json,
// the file `admin eval` reads.

import { spawn, execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const HERE = path.dirname(fileURLToPath(import.meta.url));
const STUDIO = path.resolve(HERE, "..");
const PLUGIN = path.join(STUDIO, "plugin");
const ns = require(path.join(STUDIO, "namespace.json"));
const pkg = require(path.join(STUDIO, "package.json"));
const score = require("./lib/score.cjs");
const { materialize, spec } = require(path.join(STUDIO, "tests", "helpers", "fixtures.js"));

const STUDIO_SKILLS = ["setup", "brief", "check", "loop", "admin"];
const YES = "Yes, go ahead.";
const TOOLS = ["Bash", "Read", "Write", "Edit", "Glob", "Grep", "Skill"];
// Bash is limited to the commands the guides use; everything else is denied, never prompted.
const ALLOWED = [
  "Read", "Write", "Edit", "Glob", "Grep", "Skill",
  "Bash(node:*)", "Bash(git:*)", "Bash(mktemp:*)", "Bash(ls:*)", "Bash(cat:*)", "Bash(mkdir:*)",
  "Bash(cp:*)", "Bash(diff:*)", "Bash(head:*)", "Bash(wc:*)", "Bash(grep:*)", "Bash(test:*)", "Bash(echo:*)",
];

// ── args ────────────────────────────────────────────────────────────────────
const argv = process.argv.slice(2);
const flag = (n) => argv.includes(n);
const val = (n, d) => (argv.includes(n) ? argv[argv.indexOf(n) + 1] : d);
const opts = {
  list: flag("--list"),
  triggers: flag("--triggers"),
  cases: val("--cases", null),
  caseId: val("--case", null),
  samples: Number(val("--samples", 1)),
  concurrency: Number(val("--concurrency", 4)),
  maxCost: Number(val("--max-cost-usd", 25)),
  limit: val("--limit", null) === null ? Infinity : Number(val("--limit")),
  out: val("--out", path.join(STUDIO, "evals", "results", `${new Date().toISOString().slice(0, 10)}.json`)),
  keep: flag("--keep"),
  judge: !flag("--no-judge"),
  maxTurns: Number(val("--max-turns", 40)),
  // Sonnet by default (about a quarter of Opus's price); --model opus for a final check
  model: val("--model", "sonnet"),
  // only the studio is loaded; --with-installed keeps this machine's other plugins (for collisions)
  withInstalled: flag("--with-installed"),
};

const loadCases = () =>
  fs.readdirSync(path.join(STUDIO, "evals", "cases")).filter((f) => f.endsWith(".json")).sort()
    .flatMap((f) => JSON.parse(fs.readFileSync(path.join(STUDIO, "evals", "cases", f), "utf8")).map((c) => ({ ...c, file: f })));
const triggers = JSON.parse(fs.readFileSync(path.join(STUDIO, "evals", "triggers.json"), "utf8"));

// ── one nested session turn ─────────────────────────────────────────────────
let spent = 0;
let skipped = 0;

function claude(prompt, { cwd, resume = null, plugin = true, tools = TOOLS, allowed = ALLOWED, maxTurns = opts.maxTurns }) {
  const args = ["-p", prompt, "--output-format", "stream-json", "--verbose", "--max-turns", String(maxTurns), "--strict-mcp-config", "--permission-mode", "acceptEdits", "--add-dir", os.tmpdir()];
  args.push("--model", opts.model);
  if (!opts.withInstalled) args.push("--setting-sources", "project");
  if (plugin) args.push("--plugin-dir", PLUGIN);
  args.push("--tools", tools.length ? tools.join(",") : "");
  if (allowed.length) args.push("--allowedTools", ...allowed);
  if (resume) args.push("--resume", resume);
  return new Promise((resolve) => {
    const child = spawn("claude", args, { cwd, env: { ...process.env, CLAUDE_CODE_DISABLE_TELEMETRY: "1" }, stdio: ["ignore", "pipe", "pipe"] });
    let buf = "";
    let err = "";
    const events = [];
    child.stdout.on("data", (d) => {
      buf += d;
      let i;
      while ((i = buf.indexOf("\n")) >= 0) {
        const line = buf.slice(0, i).trim();
        buf = buf.slice(i + 1);
        if (!line) continue;
        try {
          events.push(JSON.parse(line));
        } catch {
          /* not JSON */
        }
      }
    });
    child.stderr.on("data", (d) => (err += d));
    child.on("close", (code) => {
      const result = events.find((e) => e.type === "result") || {};
      const texts = events.filter((e) => e.type === "assistant").flatMap((e) => (e.message.content || []).filter((c) => c.type === "text").map((c) => c.text));
      const cost = Number(result.total_cost_usd || 0);
      spent += cost;
      resolve({ code, events, text: result.result || texts.join("\n\n"), sessionId: result.session_id || (events.find((e) => e.session_id) || {}).session_id, cost, stderr: err.slice(-2000) });
    });
  });
}

// ── repo snapshots ──────────────────────────────────────────────────────────
function snapshot(root) {
  const out = {};
  const walk = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      if (e.name === ".git") continue;
      const p = path.join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else out[path.relative(root, p).split(path.sep).join("/")] = crypto.createHash("sha1").update(fs.readFileSync(p)).digest("hex");
    }
  };
  walk(root);
  return out;
}

const runLogRows = (root) => {
  const f = path.join(root, "studio", ".state", "runs.jsonl");
  // run and admin rows only: a rating (or a skipped rating) is a second row about the same run
  if (!fs.existsSync(f)) return 0;
  return fs.readFileSync(f, "utf8").split("\n").filter((l) => {
    try {
      return JSON.parse(l).kind !== "rating";
    } catch {
      return false;
    }
  }).length;
};

function cliCode(root, a) {
  try {
    execFileSync("node", [path.join(PLUGIN, "scan", `${ns.bin}.js`), ...a, "--root", root], { cwd: root, stdio: "ignore" });
    return 0;
  } catch (e) {
    return e.status ?? 1;
  }
}

// ── the judge: a separate session with no plugin and no tools ──────────────
async function judge(c, turns) {
  const purpose = (() => {
    try {
      return spec(c.fixture).purpose || "";
    } catch {
      return "";
    }
  })();
  const transcript = turns.map((t, i) => `### Turn ${i + 1}: the person wrote\n${t.prompt}\n\n### The studio's CLI output in this turn\n${score.cliOutputs(t.events, ns.bin).join("\n\n") || "(none)"}\n\n### The assistant replied\n${t.text}`).join("\n\n");
  const prompt = `You are grading one transcript of a coding assistant against fixed criteria. You see only the criteria, what the test repo is, and the transcript. Judge strictly: a criterion passes only if the transcript clearly meets it. Quote the passage that decides each one.

Test repo: ${purpose}

The product may make three automatic writes without asking: appending to studio/.state/runs.jsonl (the run log), writing studio/.state/preview.html, and writing proposal files under studio/proposals/ during an admin run. These never count as "writing to the repo". A number counts as quoted from the CLI when it appears in the CLI output shown for that turn.

Criteria:
${c.expect.judge.map((j, i) => `${i + 1}. ${j}`).join("\n")}

Transcript:
${transcript}

Reply with JSON only: {"criteria":[{"criterion":"<text>","pass":true|false,"quote":"<short quote or why>"}]}`;
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ps-judge-"));
  const r = await claude(prompt, { cwd: dir, plugin: false, tools: [], allowed: [], maxTurns: 1 });
  fs.rmSync(dir, { recursive: true, force: true });
  return score.parseJudge(r.text);
}

// ── one sample of one case ──────────────────────────────────────────────────
async function runCase(c) {
  const root = materialize(c.fixture, { variant: c.variant || null });
  const before = snapshot(root);
  const logBefore = runLogRows(root);
  const turns = [];
  let session = null;
  for (const t of c.turns) {
    const prompt = t === "{{yes}}" ? YES : t;
    const r = await claude(prompt, { cwd: root, resume: session });
    session = r.sessionId || session;
    turns.push({ prompt, text: r.text, events: r.events, snapshotAfter: snapshot(root), cost: r.cost, code: r.code, stderr: r.stderr });
    if (r.code !== 0 && !r.text) break;
  }
  const run = { turns, snapshotBefore: before, runLogRows: runLogRows(root), runLogRowsBefore: logBefore, cliAfter: (c.expect.cli_after || []).map((x) => ({ argv: x.argv, code: cliCode(root, x.argv) })), plugin: ns.plugin };
  // a usage limit ends the nested session mid-case: report it as not run, never as a failure
  const limited = turns.some((t) => /hit your .{0,20}limit|usage limit reached|rate limit/i.test(t.text || ""));
  if (limited) {
    if (!opts.keep) fs.rmSync(root, { recursive: true, force: true });
    return { ok: false, limited: true, checks: [], judge: null, skills: [], cost: turns.reduce((s, t) => s + t.cost, 0), final: turns.map((t) => (t.text || "").slice(0, 300)) };
  }
  const det = score.scoreCase(c.expect, run);
  let verdict = null;
  if (opts.judge && c.expect.judge && c.expect.judge.length) verdict = await judge(c, turns);
  const ok = det.ok && (!c.expect.judge || !c.expect.judge.length || !opts.judge || score.judgeOk(verdict));
  if (!opts.keep) fs.rmSync(root, { recursive: true, force: true });
  return {
    ok,
    checks: det.checks,
    judge: verdict,
    skills: score.skillsInvoked(turns.flatMap((t) => [{ type: "prompt", text: t.prompt }, ...t.events]), ns.plugin),
    cost: turns.reduce((s, t) => s + t.cost, 0),
    final: turns.map((t) => t.text.slice(0, 1500)),
    ...(opts.keep ? { root } : {}),
  };
}

async function runTrigger(t) {
  const root = materialize("F3-installed", { branch: false });
  const r = await claude(t.ask, { cwd: root, maxTurns: 3 });
  if (!opts.keep) fs.rmSync(root, { recursive: true, force: true });
  return { ask: t.ask, expect: t.expect, got: score.triggerGot(r.events, ns.plugin, STUDIO_SKILLS), all: score.skillsInvoked(r.events, ns.plugin), cost: r.cost };
}

// ── a pool with a cost ceiling ──────────────────────────────────────────────
async function pool(items, fn) {
  const out = new Array(items.length).fill(null);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const i = next++;
      if (spent >= opts.maxCost) {
        skipped++;
        continue;
      }
      out[i] = await fn(items[i], i);
      process.stderr.write(`  · ${i + 1}/${items.length}  $${spent.toFixed(2)}\n`);
    }
  };
  await Promise.all(Array.from({ length: Math.max(1, opts.concurrency) }, worker));
  return out;
}

// ── main ────────────────────────────────────────────────────────────────────
async function main() {
  const cases = loadCases();
  if (opts.list) {
    for (const c of cases) console.log(`${c.id.padEnd(40)} ${c.skill.padEnd(7)} ${c.fixture}${c.variant ? ` (${c.variant})` : ""}${c.beta ? "  beta" : ""}`);
    console.log(`\n${cases.length} cases, ${triggers.length} trigger asks`);
    return;
  }
  if (!fs.existsSync(path.join(PLUGIN, ".claude-plugin", "plugin.json"))) throw new Error("no built plugin: run node scripts/build-plugin.js");
  const ccVersion = (() => {
    try {
      return execFileSync("claude", ["--version"], { encoding: "utf8" }).trim();
    } catch {
      return null;
    }
  })();
  const results = { date: new Date().toISOString().slice(0, 10), cli_version: pkg.version, claude_code_version: ccVersion, samples: opts.samples, triggers: null, cases: [], cost_usd: 0, skipped: 0 };

  if (opts.triggers) {
    const asks = triggers.slice(0, opts.limit);
    const rows = (await pool(asks, runTrigger)).filter(Boolean);
    results.triggers = { ...score.triggerSummary(rows), rows };
    console.log("\nTriggers");
    for (const r of rows) console.log(`  ${r.got === r.expect ? "✓" : "✗"} ${String(r.expect).padEnd(6)} got ${String(r.got).padEnd(6)} ${r.ask}`);
    console.log(`  positives ${results.triggers.positives.ok}/${results.triggers.positives.total} · negatives ${results.triggers.negatives.ok}/${results.triggers.negatives.total}`);
  }

  const wanted = opts.caseId ? cases.filter((c) => opts.caseId.split(",").includes(c.id)) : opts.cases ? cases.filter((c) => opts.cases.split(",").map((s) => s.trim().replace(/\.json$/, "")).includes(c.file.replace(/\.json$/, ""))) : [];
  if ((opts.caseId || opts.cases) && !wanted.length) throw new Error(`no case matched (${opts.caseId || opts.cases}); try --list`);
  const jobs = wanted.flatMap((c) => Array.from({ length: opts.samples }, (_, s) => ({ c, s })));
  const samples = await pool(jobs, (j) => runCase(j.c));
  for (const c of wanted) {
    const mine = jobs.map((j, i) => (j.c === c ? samples[i] : undefined)).filter((x) => x !== undefined);
    const ran = mine.filter((x) => x && !x.limited);
    const limitedRuns = mine.filter((x) => x && x.limited).length;
    results.cases.push({ id: c.id, skill: c.skill, fixture: c.fixture, beta: !!c.beta, ok: ran.length > 0 && score.majority(ran.map((r) => r.ok)), notRun: ran.length === 0 && limitedRuns > 0 ? "usage limit" : undefined, samples: ran });
  }
  if (wanted.length) {
    console.log("\nCases");
    for (const c of results.cases) {
      if (c.notRun) {
        console.log(`  ⚠ ${c.id}  not run: the nested session hit a ${c.notRun}; run it again later`);
        continue;
      }
      console.log(`  ${c.ok ? "✓" : "✗"} ${c.id}${c.beta ? " (beta)" : ""}  ${c.samples.filter((s) => s.ok).length}/${c.samples.length}`);
      for (const s of c.samples) {
        for (const k of s.checks.filter((x) => !x.ok)) console.log(`      ✗ ${k.name}${k.detail ? `: ${k.detail}` : ""}`);
        if (s.judge) for (const k of s.judge.criteria.filter((x) => !x.pass)) console.log(`      ✗ judge: ${k.criterion} (${k.quote})`);
        else if (opts.judge && s.judge === null && c.samples.length) {
          /* no judge criteria, or the judge reply did not parse */
        }
      }
    }
  }
  results.cost_usd = Number(spent.toFixed(4));
  results.skipped = skipped;
  fs.mkdirSync(path.dirname(opts.out), { recursive: true });
  fs.writeFileSync(opts.out, JSON.stringify(results, null, 2) + "\n");
  console.log(`\n  cost $${spent.toFixed(2)}${skipped ? ` · ${skipped} runs skipped at the $${opts.maxCost} ceiling` : ""} · results: ${path.relative(process.cwd(), opts.out)}`);
}

main().catch((e) => {
  console.error(`  ✗ ${e.message}`);
  process.exitCode = 1;
});
