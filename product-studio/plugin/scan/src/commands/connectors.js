"use strict";

/**
 * connectors: the optional outward connectors, as data. This command never posts, never calls the
 * network and never reads a secret: it checks studio/connectors.json and prints the exact text a
 * guide shows a person before anything is posted (an issue, a comment, a page, a notice).
 *
 *   connectors check                         which connectors are configured and ready, and why not
 *   connectors issue <G-NNN>                 {title, body, labels[]} for the goal's tracker issue
 *   connectors comment <G-NNN>               {body, close} for the goal's latest ruling
 *   connectors page digest [--since d]       {title, markdown} from admin digest and the proposals
 *   connectors page measurement <G-NNN>      {title, markdown} from the goal's studio/evaluations.md rows
 *   connectors notice gate <G-NNN>           {text}: whose ruling the goal waits on
 *   connectors notice digest [--since d]     {text}: the digest in one paragraph
 *
 * studio/connectors.json is committed and holds no secrets (every key optional):
 *   { "tracker":   { "kind": "github", "repo": "owner/name", "label": "studio", "post": "ask"|"auto" },
 *     "notion":    { "digests": "<parent page id or url>", "measurements": "<…>", "post": "ask"|"auto" },
 *     "slack":     { "channel": "#name", "post": "ask"|"auto" },
 *     "analytics": { "source": "posthog"|"other", "hostEnv", "keyEnv", "projectEnv" } }
 * "post": "auto" is a standing yes a person wrote into the file; "ask" (the default) means every
 * outward post waits for a yes.
 */

const fs = require("fs");
const path = require("path");
const kit = require("../lib/loopkit");
const evidence = require("./evidence");
const { parseArgs, last, problems } = require("../lib/args");
const { invoke } = require("../lib/invoke");
const { cells } = require("../lib/md");
const { rel: L, ns } = require("../lib/layout");

const FILE = L.connectors;
const NAMES = ["tracker", "notion", "slack", "analytics"];
const POSTS = ["ask", "auto"];
const DEFAULT_LABEL = "studio";
const GOAL_ID = /^G-\d{3,}$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const REPO = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;
const PAGE_ID = /^(?:[0-9a-f]{32}|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i;
const PAGE_URL = /^https:\/\/\S+$/;
const CHANNEL = /^(?:#[a-z0-9][a-z0-9._-]{0,79}|[CG][A-Z0-9]{8,})$/;
const LABEL = /^[^\n\r,]{1,50}$/;

const USAGE = `
  Usage: connectors <check|issue|comment|page|notice> [--root <dir>] [--json]

    check                        validate ${FILE} (optional, committed, no secrets) and say which
                                 connectors are configured and ready. No network. Exit 0, or 1 when
                                 the file is malformed.
    issue <G-NNN>                the tracker issue for a goal: {title, body, labels[]}
    comment <G-NNN>              the goal's latest ruling as a comment, and whether to close: {body, close}
    page digest [--since d]      a page from admin digest and the proposals: {title, markdown}
    page measurement <G-NNN>     a page from the goal's ${L.evaluations} rows: {title, markdown}
    notice gate <G-NNN>          a one-paragraph notice of whose ruling the goal waits on: {text}
    notice digest [--since d]    the digest as a one-paragraph notice: {text}

  Nothing here posts. A guide shows the text to a person and posts it after a yes, or straight
  away only when the connector's "post" is "auto" in ${FILE}.
`;

// ------------------------------------------------------------------------------------------------ config

const notConnected = () => ({ configured: false, ready: false, post: null, problems: [] });

function postOf(section, where, out) {
  if (!("post" in section)) return "ask";
  if (!POSTS.includes(section.post)) {
    out.push(`${where}: post is ask or auto, not ${JSON.stringify(section.post)}`);
    return "ask";
  }
  return section.post;
}

function unknownKeys(section, known, where, out) {
  for (const k of Object.keys(section).sort()) if (!known.includes(k)) out.push(`${where}: unknown field ${k} (only ${known.join(", ")}; secrets never go in this file)`);
}

function checkTracker(s) {
  const where = `${FILE} tracker`;
  const out = [];
  unknownKeys(s, ["kind", "repo", "label", "post"], where, out);
  if (s.kind !== "github") out.push(`${where}: kind is github (the one tracker built), not ${s.kind === undefined ? "missing" : JSON.stringify(s.kind)}`);
  if (typeof s.repo !== "string" || !REPO.test(s.repo)) out.push(`${where}: repo is owner/name, not ${s.repo === undefined ? "missing" : JSON.stringify(s.repo)}`);
  if ("label" in s && (typeof s.label !== "string" || !LABEL.test(s.label))) out.push(`${where}: label is one label name (no commas, 50 characters or fewer)`);
  const post = postOf(s, where, out);
  return { configured: true, ready: out.length === 0, post, problems: out, repo: typeof s.repo === "string" ? s.repo : null, label: typeof s.label === "string" && LABEL.test(s.label) ? s.label : DEFAULT_LABEL };
}

function checkNotion(s) {
  const where = `${FILE} notion`;
  const out = [];
  unknownKeys(s, ["digests", "measurements", "post"], where, out);
  const parents = {};
  for (const k of ["digests", "measurements"]) {
    if (!(k in s)) continue;
    if (typeof s[k] !== "string" || !(PAGE_ID.test(s[k]) || PAGE_URL.test(s[k]))) out.push(`${where}: ${k} is a parent page id or an https link to the parent page`);
    else parents[k] = s[k];
  }
  if (!("digests" in s) && !("measurements" in s)) out.push(`${where}: name a parent page for digests, measurements or both`);
  const post = postOf(s, where, out);
  return { configured: true, ready: out.length === 0, post, problems: out, parents };
}

function checkSlack(s) {
  const where = `${FILE} slack`;
  const out = [];
  unknownKeys(s, ["channel", "post"], where, out);
  if (typeof s.channel !== "string" || !CHANNEL.test(s.channel)) out.push(`${where}: channel is #name (lowercase) or a channel id, not ${s.channel === undefined ? "missing" : JSON.stringify(s.channel)}`);
  const post = postOf(s, where, out);
  return { configured: true, ready: out.length === 0, post, problems: out, channel: typeof s.channel === "string" ? s.channel : null };
}

function checkAnalytics(root, env) {
  if (evidence.locate(root).none) return notConnected();
  const r = evidence.check(root, env);
  return { configured: true, ready: r.connected, post: null, problems: r.problems, source: r.source, config: r.config };
}

/** Read and validate studio/connectors.json: { file, exists, malformed, problems[], connectors{} }. */
function load(root, env) {
  const file = path.join(root, FILE);
  const base = { file: FILE, exists: fs.existsSync(file), malformed: false, problems: [], connectors: {} };
  const empty = () => Object.fromEntries(NAMES.map((n) => [n, notConnected()]));
  if (!base.exists) {
    base.connectors = { ...empty(), analytics: checkAnalytics(root, env) };
    return base;
  }
  let cfg;
  try {
    cfg = JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return { ...base, malformed: true, problems: [`${FILE} is not valid JSON`], connectors: empty() };
  }
  if (!cfg || typeof cfg !== "object" || Array.isArray(cfg)) return { ...base, malformed: true, problems: [`${FILE} must be a JSON object`], connectors: empty() };
  const top = [];
  for (const k of Object.keys(cfg).sort()) if (!NAMES.includes(k)) top.push(`${FILE}: unknown connector ${k} (only ${NAMES.join(", ")})`);
  for (const n of NAMES) if (n in cfg && (!cfg[n] || typeof cfg[n] !== "object" || Array.isArray(cfg[n]))) top.push(`${FILE}: ${n} must be an object`);
  if (top.length) return { ...base, malformed: true, problems: top, connectors: empty() };
  const connectors = {
    tracker: cfg.tracker ? checkTracker(cfg.tracker) : notConnected(),
    notion: cfg.notion ? checkNotion(cfg.notion) : notConnected(),
    slack: cfg.slack ? checkSlack(cfg.slack) : notConnected(),
    analytics: checkAnalytics(root, env),
  };
  return { ...base, connectors };
}

// ------------------------------------------------------------------------------------------------ goals

function goalOf(root, id) {
  const dir = kit.findGoal(root, id);
  const g = dir && kit.readGoal(dir);
  if (!g) return null;
  const dirRel = `${L.goals}/${path.basename(dir)}`;
  const issue = g.data.issue === undefined || g.data.issue === null || g.data.issue === "" ? null : Number(String(g.data.issue).replace(/^#/, ""));
  return {
    id,
    dir,
    dirRel,
    title: g.data.title === undefined ? id : String(g.data.title),
    status: g.data.status === undefined ? null : String(g.data.status),
    step: g.data.step === undefined ? null : String(g.data.step),
    issue: Number.isInteger(issue) && issue > 0 ? issue : null,
    lines: g.lines,
  };
}

/** The lines under `## <name>` in goal.md, trimmed of blank edges. */
function section(lines, name) {
  const i = lines.findIndex((l) => l.trim() === `## ${name}`);
  if (i < 0) return [];
  const out = [];
  for (const l of lines.slice(i + 1)) {
    if (/^## /.test(l)) break;
    out.push(l.replace(/\s+$/, ""));
  }
  while (out.length && !out[0]) out.shift();
  while (out.length && !out[out.length - 1]) out.pop();
  return out;
}

const fileLines = (file) => (fs.existsSync(file) ? fs.readFileSync(file, "utf8").replace(/\r\n/g, "\n").split("\n") : []);

/** The first markdown table in a file, verbatim. */
function tableLines(lines) {
  const start = lines.findIndex((l) => /^\|.*\|\s*$/.test(l));
  if (start < 0) return [];
  const out = [];
  for (const l of lines.slice(start)) {
    if (!/^\|.*\|\s*$/.test(l)) break;
    out.push(l.replace(/\s+$/, ""));
  }
  return out;
}

/** The goal's decision lines, in file order. */
const goalDecisions = (g) => fileLines(path.join(g.dir, "decisions.md")).map(kit.parseDecisionLine).filter(Boolean);

const closed = (status) => status === "shipped" || status === "dropped";

function issue(root, id, cfg) {
  const g = goalOf(root, id);
  if (!g) return { fail: { error: "no-such-goal", id, message: `no goal ${id} in ${L.goals}/` } };
  const tracker = cfg.connectors.tracker;
  const crit = section(g.lines, "Success criteria");
  const kill = section(g.lines, "Kill if");
  const evals = tableLines(fileLines(path.join(g.dir, "evals.md")));
  const decisions = goalDecisions(g).map((d) => kit.decisionLine(d));
  const body = [
    g.title,
    "",
    `- Step: \`${g.step || "none"}\` (status: ${g.status || "none"})`,
    `- Goal folder: \`${g.dirRel}/\``,
    "",
    "## Success criteria",
    ...(crit.length ? crit : ["None written yet."]),
    "",
    "## Kill if",
    ...(kill.length ? kill : ["None written yet."]),
    "",
    "## Evals",
    ...(evals.length > 2 ? evals : ["None written yet: they are drafted before the first gate."]),
    "",
    "## Decisions",
    ...(decisions.length ? decisions : ["None yet."]),
    "",
    "---",
    `Opened by ${ns.plugin}. The goal's folder in the repo is the source of truth: a ruling is recorded there by a person, never in this issue.`,
    "",
  ].join("\n");
  return {
    result: {
      id,
      title: `${id} · ${g.title}`,
      body,
      labels: [tracker.configured && tracker.label ? tracker.label : DEFAULT_LABEL],
      repo: tracker.configured ? tracker.repo : null,
      issue: g.issue,
    },
  };
}

function comment(root, id, cfg) {
  const g = goalOf(root, id);
  if (!g) return { fail: { error: "no-such-goal", id, message: `no goal ${id} in ${L.goals}/` } };
  const all = goalDecisions(g);
  const d = all[all.length - 1];
  if (!d) return { fail: { error: "no-decision", id, message: `${id} has no decision line yet; nothing to comment` } };
  const close = closed(g.status);
  const where = close ? `${id} is now ${g.status}: the issue can close.` : `${id} is now at \`${g.step || "none"}\` (status: ${g.status || "none"}).`;
  const body = [
    `**${d.gate} · ${d.ruling}** by ${d.by} on ${d.date} (brief: ${d.brief})`,
    ...(d.note ? [`> ${d.note}`] : []),
    "",
    where,
    "",
    `Recorded in \`${g.dirRel}/decisions.md\` by ${ns.plugin}.`,
    "",
  ].join("\n");
  const tracker = cfg.connectors.tracker;
  return {
    result: {
      id,
      line: kit.decisionLine(d),
      body,
      close,
      reason: close ? (g.status === "shipped" ? "completed" : "not planned") : null,
      repo: tracker.configured ? tracker.repo : null,
      issue: g.issue,
    },
  };
}

// ------------------------------------------------------------------------------------------------ pages

const esc = (s) => String(s).replace(/\|/g, "\\|");
const row = (xs) => `| ${xs.map(esc).join(" | ")} |`;
const table = (head, rows) => [row(head), `|${head.map(() => "---").join("|")}|`, ...rows.map(row)];

/** studio/evaluations.md rows as objects keyed by the header's names. */
function evaluationRows(root) {
  const t = tableLines(fileLines(path.join(root, L.evaluations)));
  if (t.length < 2) return [];
  const head = cells(t[0]).map((h) => h.toLowerCase());
  return t
    .slice(1)
    .map(cells)
    .filter((c) => c && !c.every((x) => /^:?-{3,}:?$/.test(x)))
    .map((c) => Object.fromEntries(head.map((h, i) => [h, c[i] === undefined ? "" : c[i]])));
}

/** E<n> → its "must be true" from the goal's evals.md. */
function evalTexts(g) {
  const t = tableLines(fileLines(path.join(g.dir, "evals.md")));
  const out = {};
  for (const l of t.slice(2)) {
    const c = cells(l);
    if (c && c[0]) out[c[0]] = c[1] || "";
  }
  return out;
}

function measurement(root, id) {
  const g = goalOf(root, id);
  if (!g) return { fail: { error: "no-such-goal", id, message: `no goal ${id} in ${L.goals}/` } };
  const rows = evaluationRows(root).filter((r) => r.goal === id);
  if (!rows.length) return { fail: { error: "no-measurements", id, message: `${L.evaluations} has no row for ${id}; build.measure writes one first` } };
  const texts = evalTexts(g);
  const latest = rows.map((r) => r.date || "").sort().slice(-1)[0];
  const kill = section(g.lines, "Kill if");
  const markdown = [
    `What build.measure measured for ${id}, "${g.title}" (step \`${g.step || "none"}\`, status: ${g.status || "none"}). A row that could not be measured says so and why.`,
    "",
    ...table(
      ["date", "eval", "must be true", "measured", "bar", "result", "source"],
      rows.map((r) => [r.date || "", r.eval || "", texts[r.eval] || "", r.measured || "", r.bar || "", r.result || "", r.source || ""]),
    ),
    "",
    "## Kill if",
    ...(kill.length ? kill : ["None written."]),
    "",
    `Sources: \`${L.evaluations}\`, \`${g.dirRel}/evals.md\`, \`${g.dirRel}/goal.md\`. Written by ${ns.plugin}; every number is the row's own.`,
    "",
  ].join("\n");
  return { result: { id, title: `${id} · ${g.title} · measured ${latest}`, markdown, rows: rows.length } };
}

async function digestData(ctx, since) {
  const d = await invoke(ctx, ["admin", "digest", ...(since ? ["--since", since] : [])]);
  if (!d.json || d.code !== 0) return { fail: { error: "digest-failed", message: (d.stderr || d.stdout || "admin digest gave no JSON").split("\n")[0].replace(/^\s*✗\s*/, "") } };
  const p = await invoke(ctx, ["proposals", "list"]);
  const proposals = p.json && Array.isArray(p.json.proposals) ? p.json.proposals : [];
  return { digest: d.json, proposals };
}

async function digestPage(ctx, since) {
  const r = await digestData(ctx, since);
  if (r.fail) return r;
  const { digest: d, proposals } = r;
  const fromWhen = d.since ? d.since.slice(0, 10) : "the start of the log";
  const lines = [`What the studio did from ${fromWhen} to ${ctx.today()}: ${d.runs} run${d.runs === 1 ? "" : "s"}. Counts only, from \`admin digest\`; no notes beyond the run log's own.`, ""];
  lines.push("## Runs by command", "");
  const cmds = Object.entries(d.byCommand);
  lines.push(...(cmds.length ? table(["command", "runs", "up", "down", "down share"], cmds.map(([c, x]) => [c, x.runs, x.up, x.down, x.downShare])) : ["No runs in this window."]), "");
  lines.push("## Rules caught", "");
  const caught = Object.entries(d.rulesCaught);
  lines.push(...(caught.length ? table(["surface", "blocks", "flags"], caught.map(([s, x]) => [s, x.blocks, x.flags])) : ["No checks in this window."]), "");
  lines.push(`Blocks fixed: ${d.blocksFixed}.`, "");
  const fps = Object.entries(d.falsePositives);
  if (fps.length) lines.push("## False positives", "", ...table(["rule", "dropped"], fps), "");
  const errs = Object.entries(d.errors);
  if (errs.length) lines.push("## Errors", "", ...table(["message", "times"], errs.map(([m, n]) => [m, n])), "");
  lines.push("## Signals", "");
  lines.push(
    ...(d.signals.length
      ? table(["kind", "subject", "count", "threshold", "proposal", "evidence"], d.signals.map((s) => [s.kind, s.subject, s.count, s.threshold, s.top ? "yes" : "no", s.evidence.join(", ")]))
      : ["Nothing crossed a threshold."]),
    "",
  );
  lines.push(`At most ${d.proposalsCap} proposals per admin run.`, "");
  lines.push("## Proposals", "");
  lines.push(...(proposals.length ? table(["id", "title", "target", "kind", "status"], proposals.map((p) => [p.id, p.title, p.target, p.kind, p.status])) : ["None."]), "");
  lines.push(`A person rules on each proposal in the repo (\`/${ns.plugin}:admin approve|decline P-NNN\`), never on this page. Written by ${ns.plugin}.`, "");
  return { result: { title: `Studio digest · ${ctx.today()}`, markdown: lines.join("\n"), since: d.since } };
}

// ------------------------------------------------------------------------------------------------ notices

function noticeGate(root, id, cfg) {
  const g = goalOf(root, id);
  if (!g) return { fail: { error: "no-such-goal", id, message: `no goal ${id} in ${L.goals}/` } };
  const row = kit.status(kit.load(root)).find((x) => x.id === id);
  const w = row && row.waitsOn;
  if (!w) return { fail: { error: "not-at-gate", id, step: g.step, message: `${id} is at ${g.step || "no step"} (status: ${g.status || "none"}) and waits on nobody; no notice to send` } };
  const tracker = cfg.connectors.tracker;
  const ref = g.issue && tracker.configured && tracker.repo ? ` Tracked in ${tracker.repo}#${g.issue}.` : "";
  const text =
    `${id} "${g.title}" waits on a person at the ${g.step} gate: ${w.holder || "nobody yet"} holds it (${w.role})` +
    `${w.deputy ? `, deputy ${w.deputy}` : ""}. To rule: /${ns.plugin}:loop gate approve|rework|drop ${id}, or /${ns.plugin}:loop decide ${id} for a brief first.${ref}`;
  return { result: { id, text, waitsOn: w } };
}

async function noticeDigest(ctx, since) {
  const r = await digestData(ctx, since);
  if (r.fail) return r;
  const { digest: d, proposals } = r;
  const waiting = proposals.filter((p) => p.status === "New").map((p) => p.id);
  const top = d.signals.filter((s) => s.top).map((s) => `${s.kind} ${s.subject} (${s.count})`);
  const fromWhen = d.since ? d.since.slice(0, 10) : "the start of the log";
  const text =
    `Studio digest from ${fromWhen} to ${ctx.today()}: ${d.runs} run${d.runs === 1 ? "" : "s"}, ${d.blocksFixed} block${d.blocksFixed === 1 ? "" : "s"} fixed, ` +
    `${d.signals.length} signal${d.signals.length === 1 ? "" : "s"} over a threshold${top.length ? ` (top: ${top.join("; ")})` : ""}. ` +
    `Proposals waiting for a ruling: ${waiting.length ? waiting.join(", ") : "none"}. To rule: /${ns.plugin}:admin approve|decline P-NNN.`;
  return { result: { text, since: d.since } };
}

// ------------------------------------------------------------------------------------------------ run

function printCheck(ctx, r) {
  ctx.out(`  ${r.file}${r.exists ? "" : " (none: every connector is optional)"}`);
  for (const p of r.problems) ctx.err(`  ✗ ${p}`);
  for (const n of NAMES) {
    const c = r.connectors[n];
    const what =
      n === "tracker" && c.configured ? `github ${c.repo || "?"}, label ${c.label}` :
      n === "notion" && c.configured ? Object.keys(c.parents).join(" and ") || "no parent page" :
      n === "slack" && c.configured ? c.channel || "no channel" :
      n === "analytics" && c.configured ? `${c.source || "?"} (${c.config})` : "";
    if (!c.configured) ctx.out(`  - ${n.padEnd(9)} not connected`);
    else ctx.out(`  ${c.ready ? "✓" : "✗"} ${n.padEnd(9)} ${what}${c.post ? `, post: ${c.post}` : ""}${c.ready ? "" : ": not ready"}`);
    for (const p of c.configured ? c.problems : []) ctx.out(`      - ${p}`);
  }
}

async function run(argv, ctx) {
  const [sub, ...rest] = argv;
  const parsed = parseArgs(rest, { values: ["--since"] });
  if (!sub || sub === "help" || parsed.help) {
    ctx.out(USAGE);
    return 0;
  }
  const bad = problems(parsed);
  if (bad.length) return ctx.usage(bad.join("; "), USAGE);
  const root = ctx.rootFrom(last(parsed, "--root"));
  const json = parsed.bools.has("--json");
  const since = last(parsed, "--since", null);
  if (since !== null && !DATE.test(since)) return ctx.usage("--since takes a date, YYYY-MM-DD", USAGE);
  const pos = parsed.positional;
  const refuse = (obj) => {
    if (json) ctx.json({ ok: false, ...obj });
    else ctx.err(`  ✗ ${obj.message || obj.error}`);
    return 1;
  };
  const needGoal = (id, what) => (GOAL_ID.test(id || "") ? null : ctx.usage(`${what} needs a goal id (G-NNN), not ${id || "nothing"}`, USAGE));
  const noSince = () => (since !== null ? ctx.usage(`--since belongs to page digest and notice digest only`, USAGE) : null);
  const cfg = load(root, ctx.env || {});

  if (sub === "check") {
    if (pos.length) return ctx.usage(`connectors check takes no arguments, not ${pos.join(" ")}`, USAGE);
    const u = noSince();
    if (u !== null) return u;
    const strip = (c) => ({ configured: c.configured, ready: c.ready, post: c.post, problems: c.problems });
    const out = { file: cfg.file, exists: cfg.exists, ok: !cfg.malformed, problems: cfg.problems, connectors: Object.fromEntries(NAMES.map((n) => [n, strip(cfg.connectors[n])])) };
    if (json) ctx.json(out);
    else printCheck(ctx, cfg);
    return cfg.malformed ? 1 : 0;
  }

  if (sub === "issue" || sub === "comment") {
    const u = needGoal(pos[0], `connectors ${sub}`) ?? noSince() ?? (pos.length > 1 ? ctx.usage(`connectors ${sub} takes one goal id`, USAGE) : null);
    if (u !== null) return u;
    const r = sub === "issue" ? issue(root, pos[0], cfg) : comment(root, pos[0], cfg);
    if (r.fail) return refuse(r.fail);
    if (json) ctx.json(r.result);
    else if (sub === "issue") {
      ctx.out(`  ${r.result.title}`);
      ctx.out(`  labels: ${r.result.labels.join(", ")}${r.result.issue ? ` · already filed as #${r.result.issue}` : ""}\n`);
      ctx.out(r.result.body);
    } else {
      ctx.out(r.result.body);
      ctx.out(`  close: ${r.result.close ? `yes (${r.result.reason})` : "no"}`);
    }
    return 0;
  }

  if (sub === "page") {
    const [kind, id] = pos;
    let r;
    if (kind === "digest") {
      if (pos.length > 1) return ctx.usage("connectors page digest takes no goal id", USAGE);
      r = await digestPage(ctx, since);
    } else if (kind === "measurement") {
      const u = needGoal(id, "connectors page measurement") ?? noSince() ?? (pos.length > 2 ? ctx.usage("connectors page measurement takes one goal id", USAGE) : null);
      if (u !== null) return u;
      r = measurement(root, id);
    } else return ctx.usage(`connectors page is digest or measurement, not ${kind || "nothing"}`, USAGE);
    if (r.fail) return refuse(r.fail);
    if (json) ctx.json(r.result);
    else {
      ctx.out(`# ${r.result.title}\n`);
      ctx.out(r.result.markdown);
    }
    return 0;
  }

  if (sub === "notice") {
    const [kind, id] = pos;
    let r;
    if (kind === "gate") {
      const u = needGoal(id, "connectors notice gate") ?? noSince() ?? (pos.length > 2 ? ctx.usage("connectors notice gate takes one goal id", USAGE) : null);
      if (u !== null) return u;
      r = noticeGate(root, id, cfg);
    } else if (kind === "digest") {
      if (pos.length > 1) return ctx.usage("connectors notice digest takes no goal id", USAGE);
      r = await noticeDigest(ctx, since);
    } else return ctx.usage(`connectors notice is gate or digest, not ${kind || "nothing"}`, USAGE);
    if (r.fail) return refuse(r.fail);
    if (json) ctx.json(r.result);
    else ctx.out(r.result.text);
    return 0;
  }

  return ctx.usage(`unknown connectors subcommand: ${sub}`, USAGE);
}

module.exports = { run, load, FILE, NAMES, USAGE };
