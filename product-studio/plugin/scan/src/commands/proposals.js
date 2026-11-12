"use strict";

/**
 * proposals: improvement proposals in studio/proposals/P-NNN-<slug>.md.
 *
 *   proposals lint                         every proposal well formed
 *   proposals list [--status s]            id, title, target, kind, status, evidence
 *   proposals next-id                      the next P-NNN
 *   proposals decide <P-NNN> approve|decline --by "<name>" [--why "…"]
 *                                          a person in the roster rules (writes the frontmatter)
 *   proposals apply <P-NNN>                an Approved client proposal: eval, git apply, eval;
 *                                          reverts and marks Failed on any regression
 */

const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFileSync } = require("child_process");
const { parseArgs, last, problems } = require("../lib/args");
const { invoke } = require("../lib/invoke");
const P = require("../lib/proposals");
const runlog = require("../lib/runlog");
const { rel: L } = require("../lib/layout");

const USAGE = `
  Usage: proposals <lint|list|next-id|decide|apply> [--root <dir>] [--json]

    lint      every studio/proposals/P-NNN-<slug>.md well formed: frontmatter, evidence, sections,
              a diff for a client target and none for a plugin target. Exit 1 on a problem.
    list      the proposals (--status New|Approved|Shipped|Declined|Failed).
    next-id   the next free P-NNN.
    decide    decide <P-NNN> approve|decline --by "<name>" [--why "…"]: a holder or deputy in
              studio/loops/roster.md rules (the git user when there is no roster). Approving a
              plugin proposal prints the upstream issue draft; nothing is filed. Decline needs --why.
    apply     apply <P-NNN>: an Approved client proposal. Runs admin eval, git apply, admin eval;
              on any check that passed before and fails after it reverts (git apply -R) and marks
              Failed, otherwise Shipped. Records evals_before and evals_after.
`;

const ID = /^P-\d{3,}$/;
const relFile = (p) => `${L.proposals}/${p.name}`;

function needOne(ctx, json, root, id) {
  if (!id || !ID.test(id)) return { code: ctx.usage("name the proposal: P-NNN", USAGE) };
  const p = P.find(root, id);
  if (!p) {
    if (json) ctx.json({ ok: false, error: "no-such-proposal", id });
    return { code: ctx.fail(`no proposal ${id} in ${L.proposals}`) };
  }
  return { p };
}

async function decide(parsed, ctx, json) {
  const root = ctx.root;
  const [id, verdict] = parsed.positional;
  if (!["approve", "decline"].includes(verdict)) return ctx.usage("decide <P-NNN> approve|decline --by \"<name>\"", USAGE);
  const by = last(parsed, "--by");
  if (!by || !by.trim()) return ctx.usage("--by \"<name>\": the person who rules", USAGE);
  const why = last(parsed, "--why", null);
  if (verdict === "decline" && (!why || !why.trim())) return ctx.usage("a decline needs --why \"…\", in the person's words", USAGE);
  const got = needOne(ctx, json, root, id);
  if (!got.p) return got.code;
  const p = got.p;
  const lintProblems = P.problemsOf(p, null);
  if (lintProblems.length) {
    if (json) ctx.json({ ok: false, error: "invalid-proposal", id, problems: lintProblems });
    return ctx.fail(`${relFile(p)} does not lint: ${lintProblems[0]}`);
  }
  const who = P.mayRule(root, by);
  if (!who.ok) {
    if (json) ctx.json({ ok: false, error: "not-a-holder", by, may: who.names, source: who.source });
    return ctx.fail(`${by} is not in ${who.source}, so cannot rule. Who may: ${who.names.join(", ") || "nobody is named"}`);
  }
  if (p.data.status !== "New") {
    if (json) ctx.json({ ok: false, error: "already-decided", id, status: p.data.status });
    return ctx.fail(`${id} is ${p.data.status}, not New: it has been ruled on`);
  }
  const name = who.names.find((n) => n.trim().toLowerCase() === by.trim().toLowerCase()) || by.trim();
  const today = ctx.today();
  const status = verdict === "approve" ? "Approved" : "Declined";
  const note = why ? `## Decision\n\n${status} by ${name} on ${today}: ${why.trim()}\n` : "";
  const saved = P.save(p, { status, decided_by: name, decided_at: today }, note);
  const out = { ok: true, id, status, decided_by: name, decided_at: today, target: saved.data.target, file: relFile(saved) };
  if (verdict === "approve" && saved.data.target === "plugin") {
    const admin = require("./admin");
    const ev = await admin.evaluate(ctx);
    const d = P.draft(saved, runlog.read(root).rows, admin.passing(ev));
    out.draft = { title: d.title, body: d.body };
    if (d.problems) out.draftProblems = d.problems;
  }
  if (json) ctx.json(out);
  else {
    ctx.out(`  ${id} ${status} by ${name} on ${today}.`);
    if (out.draft) ctx.out(`\n  Upstream issue draft (nothing is filed):\n\n  ${out.draft.title}\n\n${out.draft.body.replace(/^/gm, "  ")}`);
    else if (status === "Approved") ctx.out(`  Apply it with: proposals apply ${id}`);
  }
  return 0;
}

/** `git apply` in root with the patch on a temp file. → { ok, error } */
function gitApply(root, patch, reverse = false, check = false) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "ps-patch-"));
  const f = path.join(tmp, "change.diff");
  fs.writeFileSync(f, patch);
  try {
    execFileSync("git", ["apply", ...(reverse ? ["-R"] : []), ...(check ? ["--check"] : []), "--whitespace=nowarn", f], { cwd: root, stdio: ["ignore", "pipe", "pipe"], encoding: "utf8" });
    return { ok: true };
  } catch (e) {
    const msg = String((e.stderr || e.message || "").split("\n").find((l) => l.trim()) || "git apply failed").trim();
    return { ok: false, error: msg.replace(/\S*ps-patch-\S*/g, "the patch") };
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

async function evalNow(ctx) {
  const r = await invoke(ctx, ["admin", "eval"]);
  const checks = (r.json && r.json.checks) || [];
  return { checks, passing: checks.filter((c) => c.ok && !c.skipped).length };
}

async function apply(parsed, ctx, json) {
  const root = ctx.root;
  const got = needOne(ctx, json, root, parsed.positional[0]);
  if (!got.p) return got.code;
  const p = got.p;
  const refuse = (error, msg) => {
    if (json) ctx.json({ ok: false, error, id: p.data.id, status: p.data.status });
    return ctx.fail(msg);
  };
  if (p.data.target !== "client") return refuse("not-client", `${p.data.id} is a plugin proposal: it becomes an upstream issue draft and is never applied here`);
  if (p.data.status !== "Approved") return refuse("not-approved", `${p.data.id} is ${p.data.status}: only an Approved proposal is applied (a person approves it with proposals decide)`);
  if (!p.diff) return refuse("no-diff", `${p.data.id} has no fenced diff in its Change section`);

  const before = await evalNow(ctx);
  const dry = gitApply(root, p.diff, false, true);
  if (!dry.ok) {
    P.save(p, { status: "Failed", evals_before: before.passing, evals_after: before.passing });
    const out = { status: "Failed", before: before.passing, after: before.passing, regressions: [{ name: "git-apply", detail: dry.error }] };
    if (json) ctx.json(out);
    else ctx.out(`  ✗ ${p.data.id} Failed: the diff does not apply (${dry.error}). Nothing changed.`);
    return 1;
  }
  const applied = gitApply(root, p.diff);
  if (!applied.ok) return refuse("apply-failed", `git apply failed: ${applied.error}`);
  const after = await evalNow(ctx);
  const was = new Map(before.checks.map((c) => [c.name, c]));
  const regressions = after.checks.filter((c) => !c.ok && !c.skipped && was.has(c.name) && was.get(c.name).ok).map((c) => ({ name: c.name, detail: c.detail }));
  let status = "Shipped";
  if (regressions.length) {
    const back = gitApply(root, p.diff, true);
    if (!back.ok) regressions.push({ name: "git-apply-reverse", detail: back.error });
    status = "Failed";
  }
  const fresh = P.load(p.file);
  P.save(fresh, { status, evals_before: before.passing, evals_after: after.passing });
  const out = { status, before: before.passing, after: after.passing, regressions };
  if (json) ctx.json(out);
  else if (status === "Shipped") ctx.out(`  ✓ ${p.data.id} Shipped: ${before.passing} checks passed before, ${after.passing} after.`);
  else {
    ctx.out(`  ✗ ${p.data.id} Failed and reverted: ${regressions.length} check${regressions.length === 1 ? "" : "s"} passed before and failed after.`);
    regressions.forEach((r) => ctx.out(`    ${r.name}: ${r.detail}`));
  }
  return status === "Shipped" ? 0 : 1;
}

async function run(argv, ctx) {
  const [sub, ...rest] = argv;
  const parsed = parseArgs(rest, { values: ["--status", "--by", "--why"] });
  if (!sub || sub === "help" || parsed.help) {
    ctx.out(USAGE);
    return 0;
  }
  const bad = problems(parsed);
  if (bad.length) return ctx.usage(bad.join("; "), USAGE);
  const root = ctx.rootFrom(last(parsed, "--root"));
  const json = parsed.bools.has("--json");

  if (sub === "lint") {
    const r = P.lint(root);
    if (json) ctx.json(r);
    else if (r.ok) ctx.out(`  ✓ ${r.proposals} proposal${r.proposals === 1 ? "" : "s"}, all well formed`);
    else r.problems.forEach((x) => ctx.err(`  ${x.file}: ${x.message}`));
    return r.ok ? 0 : 1;
  }

  if (sub === "list") {
    const status = last(parsed, "--status", null);
    if (status !== null && !P.STATUSES.includes(status)) return ctx.usage(`--status is one of ${P.STATUSES.join(", ")}`, USAGE);
    const proposals = P.files(root)
      .map(P.load)
      .map((p) => ({ id: p.data.id ?? null, title: p.data.title ?? null, target: p.data.target ?? null, kind: p.data.kind ?? null, status: p.data.status ?? null, evidence: Array.isArray(p.data.evidence) ? p.data.evidence.map(String) : [] }))
      .filter((p) => !status || p.status === status)
      .sort((a, b) => String(a.id).localeCompare(String(b.id)));
    if (json) ctx.json({ proposals });
    else if (!proposals.length) ctx.out(`  No proposals${status ? ` that are ${status}` : ""}.`);
    else proposals.forEach((p) => ctx.out(`  ${p.id}  ${String(p.status).padEnd(8)}  ${String(p.target).padEnd(6)}  ${String(p.kind).padEnd(8)}  ${p.title}`));
    return 0;
  }

  if (sub === "next-id") {
    const id = P.nextId(root);
    if (json) ctx.json({ id });
    else ctx.out(id);
    return 0;
  }

  if (sub === "decide") return decide(parsed, ctx, json);
  if (sub === "apply") return apply(parsed, ctx, json);
  return ctx.usage(`unknown proposals subcommand: ${sub}`, USAGE);
}

module.exports = { run, USAGE };
