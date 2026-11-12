"use strict";

/**
 * learnings: the learnings ledger in studio/LEARNINGS.md, one cited bullet per learning.
 *
 *   learnings add --text "…" --confidence high|medium|low --review-by YYYY-MM-DD --source "…"
 *   learnings used <L-NNN> --by <G-NNN>        mark a goal that built on a learning (idempotent)
 *   learnings list [--recent n]                every learning, newest first, with stale = review-by < today
 *
 * - **L-NNN** · <high|medium|low> · review-by <YYYY-MM-DD> · <one sentence> · source: <…> [· used-by: G-NNN, …]
 */

const fs = require("fs");
const path = require("path");
const { parseArgs, last, problems } = require("../lib/args");
const { rel: L } = require("../lib/layout");
const { validDate } = require("../lib/loopkit");

const TEMPLATE = path.join(__dirname, "..", "..", "templates", "studio", "LEARNINGS.md");
const CONFIDENCE = ["high", "medium", "low"];
const MAX_TEXT = 300;
const BULLET = /^- \*\*(L-\d{3,})\*\* · (high|medium|low) · review-by (\d{4}-\d{2}-\d{2}) · (.+?) · source: (.+?)(?: · used-by: (G-\d{3,}(?:, G-\d{3,})*))?\s*$/;

const USAGE = `
  Usage: learnings <add|used|list> [--root <dir>] [--json]

    add     --text "<one sentence>" --confidence high|medium|low --review-by YYYY-MM-DD --source "<goal id,
            decision, or evaluation>": append one cited bullet to studio/LEARNINGS.md (made with a header
            if missing). Refuses a missing field, a bad date or confidence, and text over ${MAX_TEXT} characters.
    used    <L-NNN> --by <G-NNN>: add the goal to the learning's used-by. Running it twice changes nothing.
    list    every learning, newest first, stale when review-by is before today. --recent n keeps the newest n.
`;

const parseBullet = (line) => {
  const m = BULLET.exec(line);
  if (!m) return null;
  return { id: m[1], confidence: m[2], reviewBy: m[3], text: m[4], source: m[5], usedBy: m[6] ? m[6].split(", ") : [] };
};

const bulletLine = (b) =>
  `- **${b.id}** · ${b.confidence} · review-by ${b.reviewBy} · ${b.text} · source: ${b.source}${b.usedBy.length ? ` · used-by: ${b.usedBy.join(", ")}` : ""}`;

const idNum = (id) => Number(id.slice(2));

function read(root) {
  const file = path.join(root, L.learnings);
  if (!fs.existsSync(file)) return { file, exists: false, lines: [], bullets: [], problems: [] };
  const lines = fs.readFileSync(file, "utf8").replace(/\r\n/g, "\n").split("\n");
  const bullets = [];
  const bad = [];
  lines.forEach((l, i) => {
    if (!/^- \*\*L-/.test(l)) return;
    const b = parseBullet(l);
    if (b) bullets.push({ ...b, line: i + 1 });
    else bad.push({ file: L.learnings, line: i + 1, message: "a learning that does not parse: - **L-NNN** · high|medium|low · review-by YYYY-MM-DD · <sentence> · source: <…>[ · used-by: G-NNN, …]" });
  });
  return { file, exists: true, lines, bullets, problems: bad };
}

/** Reasons a field is unusable inside a bullet: empty, multi-line, or carrying the · separator. */
const fieldProblem = (name, v) => {
  if (v === undefined || String(v).trim() === "") return `--${name} is missing`;
  if (/[\r\n]/.test(v)) return `--${name} is one line`;
  if (/\s·\s|^·|·$/.test(v.trim())) return `--${name} may not contain " · " (it separates the fields)`;
  return null;
};

function add(ctx, root, parsed) {
  const text = last(parsed, "--text");
  const confidence = last(parsed, "--confidence");
  const reviewBy = last(parsed, "--review-by");
  const source = last(parsed, "--source");
  const bad = [];
  for (const [n, v] of [["text", text], ["confidence", confidence], ["review-by", reviewBy], ["source", source]]) {
    const p = fieldProblem(n, v);
    if (p) bad.push(p);
  }
  if (confidence !== undefined && confidence.trim() && !CONFIDENCE.includes(confidence.trim())) bad.push(`--confidence is high, medium or low, not ${confidence}`);
  if (reviewBy !== undefined && reviewBy.trim() && !validDate(reviewBy.trim())) bad.push(`--review-by is a YYYY-MM-DD date, not ${reviewBy}`);
  if (text !== undefined && text.trim().length > MAX_TEXT) bad.push(`--text is ${text.trim().length} characters (${MAX_TEXT} or fewer)`);
  if (text !== undefined && text.includes("{{")) bad.push("--text has an unfilled {{");
  if (bad.length) return { bad };

  const led = read(root);
  const max = led.bullets.reduce((m, b) => Math.max(m, idNum(b.id)), 0);
  const b = { id: `L-${String(max + 1).padStart(3, "0")}`, confidence: confidence.trim(), reviewBy: reviewBy.trim(), text: text.trim(), source: source.trim(), usedBy: [] };
  const line = bulletLine(b);
  let before = led.exists ? fs.readFileSync(led.file, "utf8") : fs.readFileSync(TEMPLATE, "utf8");
  if (before && !before.endsWith("\n")) before += "\n";
  fs.mkdirSync(path.dirname(led.file), { recursive: true });
  fs.writeFileSync(led.file, `${before}${line}\n`);
  return { result: { id: b.id, line } };
}

function used(root, id, by) {
  const led = read(root);
  const b = led.bullets.find((x) => x.id === id);
  if (!b) return { fail: { error: "no-such-learning", id, message: `no ${id} in ${L.learnings}` } };
  const changed = !b.usedBy.includes(by);
  const usedBy = changed ? [...b.usedBy, by] : b.usedBy;
  const line = bulletLine({ ...b, usedBy });
  if (changed) {
    led.lines[b.line - 1] = line;
    fs.writeFileSync(led.file, led.lines.join("\n"));
  }
  return { result: { id, usedBy, changed, line } };
}

async function run(argv, ctx) {
  const [sub, ...rest] = argv;
  const parsed = parseArgs(rest, { values: ["--text", "--confidence", "--review-by", "--source", "--by", "--recent"] });
  if (!sub || sub === "help" || parsed.help) {
    ctx.out(USAGE);
    return 0;
  }
  const bad = problems(parsed);
  if (bad.length) return ctx.usage(bad.join("; "), USAGE);
  const root = ctx.rootFrom(last(parsed, "--root"));
  const json = parsed.bools.has("--json");

  if (sub === "add") {
    const r = add(ctx, root, parsed);
    if (r.bad) {
      if (json) ctx.json({ ok: false, problems: r.bad });
      else r.bad.forEach((p) => ctx.err(`  ✗ ${p}`));
      return 1;
    }
    if (json) ctx.json(r.result);
    else ctx.out(`  ${r.result.line}`);
    return 0;
  }

  if (sub === "used") {
    const [id] = parsed.positional;
    const by = last(parsed, "--by");
    if (!/^L-\d{3,}$/.test(id || "")) return ctx.usage(`used needs a learning id (L-NNN), not ${id || "nothing"}`, USAGE);
    if (!/^G-\d{3,}$/.test(by || "")) return ctx.usage(`--by takes a goal id (G-NNN), not ${by || "nothing"}`, USAGE);
    const r = used(root, id, by);
    if (r.fail) {
      if (json) ctx.json({ ok: false, ...r.fail });
      else ctx.err(`  ✗ ${r.fail.message}`);
      return 1;
    }
    if (json) ctx.json(r.result);
    else ctx.out(r.result.changed ? `  ${id} is now used by ${r.result.usedBy.join(", ")}` : `  ${id} already lists ${by}; nothing changed`);
    return 0;
  }

  if (sub === "list") {
    const recentRaw = last(parsed, "--recent");
    if (recentRaw !== undefined && !/^[1-9]\d*$/.test(recentRaw)) return ctx.usage(`--recent takes a whole number, not ${recentRaw}`, USAGE);
    const led = read(root);
    const today = ctx.today();
    let all = led.bullets
      .map(({ id, confidence, reviewBy, text, source, usedBy }) => ({ id, confidence, reviewBy, text, source, usedBy, stale: reviewBy < today }))
      .sort((a, b) => idNum(b.id) - idNum(a.id));
    if (recentRaw !== undefined) all = all.slice(0, Number(recentRaw));
    if (json) ctx.json({ learnings: all, problems: led.problems });
    else {
      if (!led.exists) ctx.out(`  No ${L.learnings} yet.`);
      else if (!all.length) ctx.out("  No learnings yet.");
      for (const x of all) ctx.out(`  ${x.id} · ${x.confidence}${x.stale ? " · stale" : ""} · ${x.text} (source: ${x.source}${x.usedBy.length ? `; used by ${x.usedBy.join(", ")}` : ""})`);
      led.problems.forEach((p) => ctx.err(`  ✗ ${p.file}:${p.line}: ${p.message}`));
    }
    return 0;
  }

  return ctx.usage(`unknown learnings subcommand: ${sub}`, USAGE);
}

module.exports = { run, USAGE, parseBullet };
