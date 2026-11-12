"use strict";

// Improvement proposals, studio/proposals/P-NNN-<slug>.md: reading, linting, the roster check
// for who may rule, the decision write and the scrubbed upstream draft (SPEC.md § proposals).

const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const { frontmatter, stringifyFrontmatter } = require("./md");
const { rel: L } = require("./layout");
const runlog = require("./runlog");
const privacy = require("./privacy");

const TARGETS = ["client", "plugin"];
const KINDS = ["wording", "trigger", "rule-fix", "new-rule", "new-eval", "bug"];
const STATUSES = ["New", "Approved", "Shipped", "Declined", "Failed"];
const KEYS = ["id", "title", "target", "kind", "evidence", "status", "decided_by", "decided_at", "evals_before", "evals_after", "created"];
const FILE = /^(P-\d{3,})-([a-z0-9]+(?:-[a-z0-9]+)*)\.md$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const SECTIONS = ["Problem", "Change", "How it will be checked"];

const dir = (root) => path.join(root, L.proposals);

/** Every P-*.md file in studio/proposals (README.md and other files are not proposals). */
function files(root) {
  const d = dir(root);
  if (!fs.existsSync(d)) return [];
  return fs
    .readdirSync(d)
    .filter((f) => /^P-.*\.md$/.test(f))
    .sort()
    .map((f) => path.join(d, f));
}

/** The body's `## ` sections: { name: text }. */
function sections(body) {
  const out = {};
  let cur = null;
  let fence = false;
  for (const line of body.split(/\r?\n/)) {
    if (/^\s*```/.test(line)) fence = !fence;
    const h = !fence && /^##\s+(.+?)\s*$/.exec(line);
    if (h) {
      cur = h[1];
      out[cur] = [];
    } else if (cur) out[cur].push(line);
  }
  return Object.fromEntries(Object.entries(out).map(([k, v]) => [k, v.join("\n").trim()]));
}

/** The unified diff in a ```diff fence of the Change section, or null. */
function diffOf(change) {
  const m = /```diff[^\n]*\n([\s\S]*?)\n?```/.exec(change || "");
  return m ? m[1].replace(/\s*$/, "\n") : null;
}

/** load(file) → { file, name, data, body, sections, diff }. */
function load(file) {
  const text = fs.readFileSync(file, "utf8");
  const { data, body } = frontmatter(text);
  const s = sections(body);
  return { file, name: path.basename(file), data, body, sections: s, diff: diffOf(s.Change) };
}

const isNull = (v) => v === null || v === undefined;
const nonEmpty = (v) => typeof v === "string" && v.trim() !== "";

/** Problems of one proposal: [message]. `runIds` is the set of run ids in the log (or null when there is no log). */
function problemsOf(p, runIds) {
  const out = [];
  const d = p.data;
  const m = FILE.exec(p.name);
  if (!m) out.push("the file name must be P-NNN-<slug>.md (slug: lowercase words joined by -)");
  for (const k of Object.keys(d).sort()) if (!KEYS.includes(k)) out.push(`unknown frontmatter key "${k}"`);
  for (const k of KEYS) if (!Object.prototype.hasOwnProperty.call(d, k)) out.push(`frontmatter: ${k} is missing`);
  if (d.id !== undefined && !/^P-\d{3,}$/.test(String(d.id))) out.push("id must be P-NNN");
  else if (m && d.id !== m[1]) out.push(`id ${d.id} does not match the file name (${m[1]})`);
  if (d.title !== undefined && !nonEmpty(d.title)) out.push("title must be one line of text");
  if (d.target !== undefined && !TARGETS.includes(d.target)) out.push(`target must be ${TARGETS.join(" or ")}`);
  if (d.kind !== undefined && !KINDS.includes(d.kind)) out.push(`kind must be one of ${KINDS.join(", ")}`);
  if (d.evidence !== undefined) {
    if (!Array.isArray(d.evidence) || d.evidence.length === 0) out.push("evidence must list at least one run id or eval name");
    else
      for (const e of d.evidence) {
        if (typeof e !== "string" || !e) out.push("evidence: every item is a run id or an eval name");
        else if (/^r-/.test(e) && !runlog.RUN_ID.test(e)) out.push(`evidence: ${e} is not a run id (r-YYYYMMDD-HHMMSS-<4 hex>)`);
        else if (runlog.RUN_ID.test(e) && runIds && !runIds.has(e)) out.push(`evidence: run ${e} is not in ${L.runs}`);
      }
  }
  if (d.status !== undefined && !STATUSES.includes(d.status)) out.push(`status must be one of ${STATUSES.join(", ")}`);
  if (d.created !== undefined && !DATE.test(String(d.created))) out.push("created must be a date, YYYY-MM-DD");
  if (STATUSES.includes(d.status)) {
    if (d.status === "New") {
      for (const k of ["decided_by", "decided_at", "evals_before", "evals_after"]) if (!isNull(d[k])) out.push(`${k} must be null until a person rules`);
    } else {
      if (!nonEmpty(d.decided_by)) out.push(`decided_by: a ${d.status} proposal names who ruled`);
      if (!DATE.test(String(d.decided_at))) out.push(`decided_at: a ${d.status} proposal has the date of the ruling (YYYY-MM-DD)`);
    }
    if (d.status === "Shipped" || d.status === "Failed") {
      if (!Number.isInteger(d.evals_before)) out.push(`evals_before: a ${d.status} proposal records the passing checks before`);
      if (d.status === "Shipped" && !Number.isInteger(d.evals_after)) out.push("evals_after: a Shipped proposal records the passing checks after");
      if (d.target === "plugin") out.push(`a plugin proposal is never ${d.status} here: it becomes an upstream issue draft`);
    }
  }
  for (const s of SECTIONS) if (!nonEmpty(p.sections[s])) out.push(`body: the "## ${s}" section is missing or empty`);
  if (d.target === "client" && nonEmpty(p.sections.Change) && !p.diff) out.push("a client proposal's Change is a fenced ```diff unified diff");
  if (d.target === "client" && p.diff && !/^--- /m.test(p.diff)) out.push("the diff is not a unified diff (no --- / +++ header)");
  if (d.target === "plugin" && p.diff) out.push("a plugin proposal describes the change in words, with no diff");
  return out;
}

/** lint(root) → { ok, proposals, problems[{file, message}] }. */
function lint(root) {
  const log = runlog.read(root);
  const runIds = log.exists ? new Set(log.rows.map((r) => r.run)) : null;
  const all = files(root).map(load);
  const problems = [];
  const seen = new Map();
  for (const p of all) {
    const rel = `${L.proposals}/${p.name}`;
    for (const message of problemsOf(p, runIds)) problems.push({ file: rel, message });
    if (p.data.id) {
      if (seen.has(p.data.id)) problems.push({ file: rel, message: `id ${p.data.id} is also used by ${seen.get(p.data.id)}` });
      else seen.set(p.data.id, rel);
    }
  }
  return { ok: problems.length === 0, proposals: all.length, problems };
}

const num = (id) => Number(String(id).replace(/^P-/, ""));

/** The next id: one past the highest P-NNN among file names and ids. */
function nextId(root) {
  let max = 0;
  for (const f of files(root)) {
    const m = /^P-(\d+)/.exec(path.basename(f));
    if (m) max = Math.max(max, Number(m[1]));
    const { data } = frontmatter(fs.readFileSync(f, "utf8"));
    if (/^P-\d+$/.test(String(data.id || ""))) max = Math.max(max, num(data.id));
  }
  return `P-${String(max + 1).padStart(3, "0")}`;
}

/** The proposal with this id, or null. */
function find(root, id) {
  return files(root).map(load).find((p) => p.data.id === id) || null;
}

/** Rewrite the frontmatter (keys in schema order) and optionally append to the body. */
function save(p, changes, appendBody = "") {
  const data = { ...p.data, ...changes };
  const out = {};
  for (const k of KEYS) if (Object.prototype.hasOwnProperty.call(data, k)) out[k] = data[k];
  for (const k of Object.keys(data)) if (!KEYS.includes(k)) out[k] = data[k];
  let body = p.body;
  if (appendBody) body = body.replace(/\s*$/, "\n") + "\n" + appendBody;
  fs.writeFileSync(p.file, stringifyFrontmatter(out) + body);
  return { ...load(p.file) };
}

/** People who may rule: every holder and deputy in studio/loops/roster.md, or the git user when there is none. */
function rulers(root) {
  const f = path.join(root, L.roster);
  if (!fs.existsSync(f)) {
    let name = "";
    try {
      name = execFileSync("git", ["config", "user.name"], { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
    } catch {
      name = "";
    }
    return { source: "git config user.name", names: name ? [name] : [] };
  }
  // the same reading as a gate: every holder, and every person a deputy line names (a role's holders)
  const kit = require("./loopkit");
  const roster = kit.parseRoster(f);
  const names = new Set();
  for (const r of Object.values(roster.roles)) {
    if (r.name === "coding-agent") continue;
    for (const n of r.holders) if (n && !/\{\{/.test(n)) names.add(n);
    if (r.deputy) {
      const asRole = roster.roles[r.deputy];
      for (const n of asRole ? asRole.holders : r.deputy.split(/\s*,\s*/)) if (n && !/^(none|null|-|—)$/i.test(n) && !/\{\{/.test(n)) names.add(n);
    }
  }
  return { source: L.roster, names: [...names].sort() };
}

const norm = (s) => String(s).trim().replace(/\s+/g, " ").toLowerCase();
const mayRule = (root, name) => {
  const r = rulers(root);
  return { ...r, ok: !!name && r.names.some((n) => norm(n) === norm(name)) };
};

/** Strip anything path-like from a line for the upstream draft. */
const PATHY = /\S*[\\/]\S*|\S+\.(md|mdx|css|scss|tsx?|jsx?|json|html?|txt|ya?ml|vue|svelte)\b/gi;
const scrub = (s) => String(s || "").replace(PATHY, "[path]").replace(/\s+/g, " ").trim();

/**
 * The upstream issue draft for an approved plugin proposal: counts and evidence ids, no paths,
 * no notes. `evalsPassing` is the admin eval's passing-check count ({passing, total}) or null.
 */
function draft(p, rows, evals) {
  const d = p.data;
  const evidence = (d.evidence || []).map(String);
  const byId = new Map(merged(rows).map((r) => [r.run, r]));
  const runs = evidence.map((e) => byId.get(e)).filter(Boolean);
  const evalNames = evidence.filter((e) => !byId.has(e));
  const tally = (key) => {
    const t = {};
    for (const r of runs) t[r[key]] = (t[r[key]] || 0) + 1;
    return Object.keys(t)
      .sort()
      .map((k) => `${k} ${t[k]}`)
      .join(", ");
  };
  const fps = {};
  for (const r of runs) for (const fp of r.false_positives || []) fps[fp.rule] = (fps[fp.rule] || 0) + 1;
  const lines = [
    `Kind: ${d.kind}. Proposal ${d.id}, approved ${d.decided_at || "(not yet)"}.`,
    "",
    "Evidence",
    "",
    `- ${runs.length} run${runs.length === 1 ? "" : "s"} from a client's run log: ${runs.map((r) => r.run).join(", ") || "none"}`,
  ];
  if (runs.length) {
    lines.push(`- by command: ${tally("command")}`);
    lines.push(`- by result: ${tally("result")}`);
    lines.push(`- by rating: ${tally("rating")}`);
    if (Object.keys(fps).length)
      lines.push(
        `- false positives dropped: ${Object.keys(fps)
          .sort()
          .map((k) => `${k} ${fps[k]}`)
          .join(", ")}`,
      );
  }
  if (evalNames.length) lines.push(`- evals: ${evalNames.map(scrub).join(", ")}`);
  lines.push("", "Evals", "", `- admin eval: ${evals ? `${evals.passing} of ${evals.total} checks pass` : "not run"}`);
  lines.push("", "No paths, notes or repo text are included. Counts and ids only.");
  const title = `[${d.kind}] ${scrub(d.title)}`;
  const body = lines.join("\n") + "\n";
  const leaks = privacy.lint([
    ["title", title],
    ["body", body],
  ]);
  return { title, body, ...(leaks.length ? { problems: leaks } : {}) };
}

const merged = (rows) => runlog.merged(rows);

module.exports = { TARGETS, KINDS, STATUSES, KEYS, files, load, sections, diffOf, problemsOf, lint, nextId, find, save, rulers, mayRule, draft, scrub };
