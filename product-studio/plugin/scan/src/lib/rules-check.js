"use strict";

/**
 * rules-check.js — check work against a product's studio/rules.md.
 *
 * rules.md holds every design, brand, voice and legal-copy rule as one table row:
 *
 *   | ID | Rule | Surface | Severity | Source | Test |
 *
 * A rule whose Test is `script: <where> /<pattern>/<flags>` is checked here; <where> is one of
 * copy (visible text), css (stylesheets, <style> blocks, style="" attributes), html (the raw
 * markup), code (the raw file) or any (all of them). A `review: <question>` Test is answered by
 * a person or the agent looking at the work. The pattern lives in the rule, so a brand changes its
 * rules by editing rules.md alone; no skill or script keeps its own copy of a rule.
 *
 * Severity is block (fix before review or publishing), flag (fix it or say why it is fine) or
 * retired (kept for history, never checked). Dependency-free: it ships in the plugin's scan.
 */

const fs = require("fs");
const path = require("path");
const { cells } = require("./md");

const SEVERITIES = new Set(["block", "flag", "retired"]);
const WHERE = new Set(["copy", "css", "html", "code", "any"]);
const ID = /^[A-Z]{1,3}\d{1,3}$/;

const strip = (s) => s.trim().replace(/^`+|`+$/g, "").trim();


/** Parse a `script:` test into { where, regex } or an error string. */
function parseScript(test) {
  const m = /^script:\s*(\w+)\s+(.+)$/s.exec(test);
  if (!m) return { error: "a script test reads `script: <copy|css|html|code|any> /pattern/flags`" };
  const where = m[1].toLowerCase();
  if (!WHERE.has(where)) return { error: `script target "${m[1]}" is not one of copy, css, html, code, any` };
  const body = strip(m[2]);
  const r = /^\/(.+)\/([a-z]*)$/s.exec(body);
  if (!r) return { error: "the pattern is written /pattern/flags" };
  try {
    const flags = r[2].includes("g") ? r[2] : r[2] + "g";
    return { where, regex: new RegExp(r[1], flags) };
  } catch (e) {
    return { error: `the pattern does not compile: ${e.message}` };
  }
}

/**
 * Read rules.md. Tables are found by their header row (ID … Severity … Test); other columns
 * may vary per table. Returns { rules, problems } with a file:line for every problem.
 */
function loadRules(file) {
  const rules = [];
  const problems = [];
  const lines = fs.readFileSync(file, "utf8").split(/\r?\n/);
  let cols = null;
  const seen = new Map();
  lines.forEach((line, i) => {
    if (/\{\{[A-Z_]+\}\}/.test(line)) problems.push({ file, line: i + 1, message: "an unfilled {{PLACEHOLDER}} is left in the file" });
    const row = cells(line);
    if (!row) {
      cols = null;
      return;
    }
    const lower = row.map((c) => c.toLowerCase());
    if (lower[0] === "id" && lower.includes("severity") && lower.includes("test")) {
      cols = { severity: lower.indexOf("severity"), test: lower.indexOf("test"), surface: lower.indexOf("surface"), rule: lower.indexOf("rule"), source: lower.indexOf("source") };
      return;
    }
    if (!cols || /^:?-+/.test(row[0]) || !ID.test(row[0])) return;
    const at = { file, line: i + 1 };
    const id = row[0];
    const severity = (row[cols.severity] || "").toLowerCase();
    const test = strip(row[cols.test] || "");
    const text = cols.rule >= 0 ? row[cols.rule] : row.filter((_, k) => k > 0 && !Object.values(cols).includes(k)).join(" → ");
    const surface = cols.surface >= 0 ? (row[cols.surface] || "all").split(/[,\s]+/).filter(Boolean).map((s) => s.toLowerCase()) : ["all"];
    if (seen.has(id)) problems.push({ ...at, message: `rule ${id} is defined twice (first on line ${seen.get(id)})` });
    seen.set(id, i + 1);
    if (!SEVERITIES.has(severity)) problems.push({ ...at, message: `rule ${id}: severity "${row[cols.severity] || ""}" is not block, flag or retired` });
    const rule = { id, text, surface, severity, test, line: i + 1, kind: null, where: null, regex: null };
    if (/^script:/i.test(test)) {
      const p = parseScript(test);
      if (p.error) problems.push({ ...at, message: `rule ${id}: ${p.error}` });
      else Object.assign(rule, { kind: "script", where: p.where, regex: p.regex });
    } else if (/^review:/i.test(test)) rule.kind = "review";
    else problems.push({ ...at, message: `rule ${id}: the test starts with script: or review:` });
    rules.push(rule);
  });
  if (!rules.length) problems.push({ file, line: 1, message: "no rules found: a table needs a header row with ID, Severity and Test" });
  return { rules, problems };
}

const decode = (s) =>
  s.replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'");

/** Split a file into its parts: copy, css, html and code, each with offsets kept line-accurate. */
function partsOf(file) {
  const raw = fs.readFileSync(file, "utf8");
  const ext = path.extname(file).toLowerCase();
  const blank = (s) => s.replace(/[^\n]/g, " ");
  if (ext === ".css" || ext === ".scss") return { raw, copy: "", css: raw, html: "", code: raw };
  if (ext === ".md" || ext === ".mdx" || ext === ".txt") return { raw, copy: raw, css: "", html: "", code: raw };
  // markup (html, vue, svelte, jsx, tsx): keep every part the length of the file so lines line up
  const css = raw.replace(/<style[^>]*>([\s\S]*?)<\/style>|style="([^"]*)"|[^]/gi, (m, block, attr) =>
    block !== undefined ? blank(m.slice(0, m.indexOf(block))) + block + blank(m.slice(m.indexOf(block) + block.length)) : attr !== undefined ? " ".repeat(7) + attr + " " : m === "\n" ? "\n" : " ",
  );
  // copy = the text nodes only: what sits between a tag's > and the next <, with {expressions}
  // blanked. Everything else is blanked, so a component body never hides or fakes its copy.
  const stripped = raw.replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, blank).replace(/<!--[\s\S]*?-->|\{\/\*[\s\S]*?\*\/\}/g, blank);
  const chars = blank(raw).split("");
  for (const m of stripped.matchAll(/>([^<>]+)</g)) {
    let text = m[1];
    for (let prev = null; prev !== text; ) {
      prev = text;
      text = text.replace(/\{[^{}]*\}/g, blank);
    }
    if (/=>|&&|\|\||\breturn\b|[{}]/.test(text)) continue; // code between a > and a <, not a text node
    const start = m.index + 1;
    for (let k = 0; k < text.length; k++) chars[start + k] = text[k];
  }
  const copy = chars.join("");
  const isMarkup = [".html", ".htm", ".vue", ".svelte"].includes(ext);
  return { raw, copy: isMarkup || [".jsx", ".tsx"].includes(ext) ? copy : "", css, html: isMarkup || [".jsx", ".tsx"].includes(ext) ? raw : "", code: raw };
}

const lineAt = (text, index) => text.slice(0, index).split("\n").length;

/** Every script rule that applies to the surface, run over the files. */
function check(rules, files, { surface = null } = {}) {
  const findings = [];
  const applies = (r) => r.kind === "script" && r.severity !== "retired" && (!surface || r.surface.includes("all") || r.surface.includes(surface));
  for (const file of files) {
    const parts = partsOf(file);
    for (const r of rules.filter(applies)) {
      const targets = r.where === "any" ? ["copy", "css", "html", "code"] : [r.where];
      const hits = new Map();
      for (const t of targets) {
        const text = parts[t];
        if (!text) continue;
        r.regex.lastIndex = 0;
        for (const m of text.matchAll(r.regex)) {
          const line = lineAt(text, m.index);
          if (!hits.has(line)) hits.set(line, decode(m[0]).trim().slice(0, 80));
        }
      }
      for (const [line, match] of hits) findings.push({ id: r.id, severity: r.severity, rule: r.text, file, line, match });
    }
  }
  findings.sort((a, b) => (a.severity === b.severity ? 0 : a.severity === "block" ? -1 : 1) || a.file.localeCompare(b.file) || a.line - b.line);
  const result = findings.some((f) => f.severity === "block") ? "fail" : findings.length ? "pass with flags" : "pass";
  const reviews = rules.filter((r) => r.kind === "review" && r.severity !== "retired" && (!surface || r.surface.includes("all") || r.surface.includes(surface)));
  return { result, findings, reviews: reviews.map((r) => ({ id: r.id, severity: r.severity, question: r.test.replace(/^review:\s*/i, "") })) };
}

/**
 * The rules eval (key-free). In <dir> (studio/rules):
 *   known-bad/<ID>-<what>.<ext>  must trip rule <ID>
 *   known-good/*                 must trip nothing
 *   review-cases.json            { "<ID>": { bad, good, expect } } for every review: rule
 * Every scripted rule needs a known-bad sample and every review rule a case; a rule without
 * one is listed in `uncovered` and fails the eval: nobody should rely on an untested rule.
 */
function evaluate(rules, dir) {
  const list = (d) => (fs.existsSync(d) ? fs.readdirSync(d).filter((f) => !f.startsWith(".")).sort().map((f) => path.join(d, f)) : []);
  const bad = list(path.join(dir, "known-bad"));
  const good = list(path.join(dir, "known-good"));
  const rows = [];
  for (const f of bad) {
    const id = path.basename(f).split(/[-.]/)[0];
    const rule = rules.find((r) => r.id === id);
    if (!rule) rows.push({ file: f, expect: id, ok: false, why: `no rule ${id} in rules.md` });
    else if (rule.kind !== "script") rows.push({ file: f, expect: id, ok: false, why: `rule ${id} has no script test` });
    else {
      const caught = check([rule], [f]).findings.length > 0;
      rows.push({ file: f, expect: id, ok: caught, why: caught ? "caught" : "missed" });
    }
  }
  for (const f of good) {
    const hits = check(rules, [f]).findings;
    rows.push({ file: f, expect: "nothing", ok: hits.length === 0, why: hits.length ? `tripped ${[...new Set(hits.map((h) => h.id))].join(", ")}` : "clean" });
  }
  const live = rules.filter((r) => r.severity !== "retired");
  const covered = new Set(bad.map((f) => path.basename(f).split(/[-.]/)[0]));
  const uncovered = live.filter((r) => r.kind === "script" && !covered.has(r.id)).map((r) => r.id);

  const casesFile = path.join(dir, "review-cases.json");
  let cases = {};
  const caseProblems = [];
  if (fs.existsSync(casesFile)) {
    try {
      cases = JSON.parse(fs.readFileSync(casesFile, "utf8"));
    } catch (e) {
      caseProblems.push(`review-cases.json does not parse: ${e.message}`);
    }
  }
  const reviewCases = live
    .filter((r) => r.kind === "review")
    .map((r) => {
      const c = cases[r.id];
      const ok = !!(c && typeof c.bad === "string" && c.bad && typeof c.good === "string" && c.good && typeof c.expect === "string" && c.expect);
      return { id: r.id, ok, why: ok ? "case present" : c ? "the case needs bad, good and expect" : "no case in review-cases.json" };
    });
  const ok = caseProblems.length === 0 && rows.every((r) => r.ok) && uncovered.length === 0 && reviewCases.every((c) => c.ok) && rows.length > 0;
  return { ok, rows, uncovered, reviewCases, problems: caseProblems };
}

module.exports = { loadRules, check, evaluate, partsOf, parseScript, cells };
