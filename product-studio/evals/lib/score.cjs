"use strict";

// Pure scoring for the behavioural evals (evals/run.mjs). No I/O here, so Jest tests it
// (tests/harness.test.js) on synthetic transcripts.

// Writes the studio makes on its own; they never count as a write to the repo (SPEC § layout).
const AUTOMATIC = [/^studio\/\.state\//, /^studio\/proposals\/P-\d{3}/];
const isAutomatic = (rel) => AUTOMATIC.some((r) => r.test(rel));

/** The skill names a transcript invoked, in order, without the plugin prefix: ["check", "setup"].
 *  A turn typed as `/<plugin>:<skill> …` invokes that skill directly (no Skill tool call), so the
 *  prompts are read too: pass them as { type: "prompt", text } events in turn order. */
function skillsInvoked(events, plugin) {
  const out = [];
  const slash = new RegExp(`^\\s*/${plugin.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}:([a-z][a-z-]*)\\b`);
  for (const e of events) {
    if (e.type === "prompt") {
      const m = slash.exec(e.text || "");
      if (m) out.push(m[1]);
      continue;
    }
    if (e.type !== "assistant" || !e.message || !Array.isArray(e.message.content)) continue;
    for (const c of e.message.content) {
      if (c.type === "tool_use" && c.name === "Skill" && c.input && typeof c.input.skill === "string") {
        const s = c.input.skill;
        out.push(s.startsWith(`${plugin}:`) ? s.slice(plugin.length + 1) : s);
      }
    }
  }
  return out;
}

/** Files that changed between two snapshots ({rel: hash}), automatic writes left out. */
function changed(before, after) {
  const files = new Set([...Object.keys(before), ...Object.keys(after)]);
  return [...files].filter((f) => before[f] !== after[f] && !isAutomatic(f)).sort();
}

/**
 * Score one run of a case.
 *   run = { turns: [{ text, snapshotAfter, events }], snapshotBefore, runLogRows, cliAfter: [{argv, code}], plugin }
 * Returns { ok, checks: [{ name, ok, detail }] } for the deterministic checks only (the judge is separate).
 */
function scoreCase(expect, run) {
  const checks = [];
  const add = (name, ok, detail) => checks.push({ name, ok: !!ok, detail });
  const allText = run.turns.map((t) => t.text || "").join("\n\n");
  const lower = allText.toLowerCase();
  const events = run.turns.flatMap((t) => [{ type: "prompt", text: t.prompt || "" }, ...(t.events || [])]);

  if (expect.skill_invoked !== undefined) {
    const want = Array.isArray(expect.skill_invoked) ? expect.skill_invoked : [expect.skill_invoked];
    const got = skillsInvoked(events, run.plugin).filter((s, i, a) => a.indexOf(s) === i);
    const studio = got.filter((s) => want.includes(s) || !s.includes(":"));
    const ok = want.every((w, i) => studio[i] === w);
    add("skill_invoked", ok, `want ${JSON.stringify(want)}, got ${JSON.stringify(got)}`);
  }
  for (const s of expect.must_include || []) add(`must_include ${s}`, lower.includes(String(s).toLowerCase()), null);
  for (const s of expect.must_not_include || []) add(`must_not_include ${s}`, !lower.includes(String(s).toLowerCase()), null);

  const snaps = [run.snapshotBefore, ...run.turns.map((t) => t.snapshotAfter)];
  if (expect.no_repo_writes) {
    const c = changed(run.snapshotBefore, snaps[snaps.length - 1]);
    add("no_repo_writes", c.length === 0, c.length ? `wrote ${c.join(", ")}` : null);
  }
  if (expect.no_write_before_turn) {
    // 1-based index of the approval turn: nothing may be written in the turns before it
    const upTo = Math.min(expect.no_write_before_turn - 1, run.turns.length);
    const c = changed(run.snapshotBefore, snaps[upTo]);
    add("no_write_before_turn", c.length === 0, c.length ? `wrote before turn ${expect.no_write_before_turn}: ${c.join(", ")}` : null);
  }
  const final = snaps[snaps.length - 1];
  // a path names a file, or a folder when any file sits under it
  const present = (f) => Object.prototype.hasOwnProperty.call(final, f) || Object.keys(final).some((k) => k.startsWith(f.replace(/\/?$/, "/")));
  for (const f of expect.files_exist || []) add(`files_exist ${f}`, present(f), null);
  for (const f of expect.files_absent || []) add(`files_absent ${f}`, !present(f), null);
  if (expect.run_log_rows !== undefined) {
    // rows this run added: a fixture may ship a run log already
    const added = run.runLogRows - (run.runLogRowsBefore || 0);
    add("run_log_rows", added === expect.run_log_rows, `want ${expect.run_log_rows} new, got ${added}`);
  }
  for (const [i, c] of (expect.cli_after || []).entries()) {
    const got = (run.cliAfter || [])[i];
    add(`cli_after ${c.argv.join(" ")}`, got && got.code === c.code, got ? `exit ${got.code}${got.code === c.code ? "" : `, want ${c.code}`}` : "not run");
  }
  return { ok: checks.every((c) => c.ok), checks };
}

/** A judge verdict passes when every criterion passed. */
const judgeOk = (verdict) => !!verdict && Array.isArray(verdict.criteria) && verdict.criteria.length > 0 && verdict.criteria.every((c) => c.pass === true);

/** Pass on a strict majority of samples. */
const majority = (oks) => oks.filter(Boolean).length * 2 > oks.length;

/** The first studio skill a trigger session fired, or null. */
function triggerGot(events, plugin, studioSkills) {
  const first = skillsInvoked(events, plugin).find((s) => studioSkills.includes(s));
  return first || null;
}

/** Aggregate trigger rows [{ask, expect, got}] into the results-file shape. */
function triggerSummary(rows) {
  const pos = rows.filter((r) => r.expect !== null);
  const neg = rows.filter((r) => r.expect === null);
  return {
    total: rows.length,
    positives: { ok: pos.filter((r) => r.got === r.expect).length, total: pos.length },
    negatives: { ok: neg.filter((r) => r.got === null).length, total: neg.length },
    misses: rows.filter((r) => r.got !== r.expect).map((r) => ({ ask: r.ask, expected: r.expect, got: r.got })),
  };
}

/** Parse the judge's reply: the first {...} block that is valid JSON with a criteria list. */
function parseJudge(text) {
  const s = String(text || "");
  for (let i = s.indexOf("{"); i >= 0; i = s.indexOf("{", i + 1)) {
    for (let j = s.lastIndexOf("}"); j > i; j = s.lastIndexOf("}", j - 1)) {
      try {
        const v = JSON.parse(s.slice(i, j + 1));
        if (v && Array.isArray(v.criteria)) return v;
      } catch {
        /* keep looking */
      }
    }
  }
  return null;
}

module.exports = { skillsInvoked, changed, scoreCase, judgeOk, majority, triggerGot, triggerSummary, parseJudge, isAutomatic };

/** The studio CLI's commands and outputs in a turn, each trimmed, for the judge. */
function cliOutputs(events, bin, max = 4000) {
  const calls = new Map();
  const out = [];
  for (const e of events) {
    const content = (e.message && Array.isArray(e.message.content) && e.message.content) || [];
    for (const c of content) {
      if (e.type === "assistant" && c.type === "tool_use" && c.name === "Bash" && c.input && String(c.input.command || "").includes(`${bin}.js`)) calls.set(c.id, c.input.command);
      if (e.type === "user" && c.type === "tool_result" && calls.has(c.tool_use_id)) {
        const body = Array.isArray(c.content) ? c.content.map((x) => x.text || "").join("") : String(c.content || "");
        out.push(`$ ${calls.get(c.tool_use_id).slice(0, 300)}\n${body.slice(0, max)}`);
      }
    }
  }
  return out;
}
module.exports.cliOutputs = cliOutputs;
