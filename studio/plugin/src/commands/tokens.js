"use strict";

/**
 * tokens: the tokens in design/tokens.css, checked, and a design source's changes against them.
 *
 *   tokens lint [--tokens <file>]                 every required role in light and dark, roles hold
 *                                                 only var(), every fg/bg pair passes WCAG AA (4.5)
 *   tokens diff --from <file> [--tokens <file>]   a source's tokens (css, html export, DTCG tokens.json,
 *                                                 flat json, Figma variables) as new|changed|same|conflicts-rule
 *
 * Read-only. The contrast numbers come from here alone; preview reuses analyse().
 */

const fs = require("fs");
const path = require("path");
const color = require("../lib/color");
const ct = require("../lib/css-tokens");
const rc = require("../lib/rules-check");
const { parseArgs, last, problems } = require("../lib/args");
const { rel: L } = require("../lib/layout");
const { relTo } = require("../lib/ctx");

const REQUIRED = "background foreground card card-foreground muted muted-foreground primary primary-foreground secondary secondary-foreground accent accent-foreground destructive destructive-foreground border input ring".split(" ");
const THEMES = ["light", "dark"];
const AA = 4.5;

const USAGE = `
  Usage: tokens <lint|diff> [--tokens <file>] [--root <dir>] [--json]

    lint    every required role (the REQUIRED ROLES header) is set in light (:root) and dark
            (.dark, [data-theme="dark"] or a prefers-color-scheme: dark :root), every role holds
            only var(--ref-…) or var(--<role>), and every X-foreground on X, foreground on
            background and muted-foreground on background passes WCAG AA (4.5). Exit 1 otherwise.
    diff    --from <file>: the tokens in a design source (css, an html export, a DTCG tokens.json,
            a flat json, Figma variables) against design/tokens.css, each new, changed, same or
            conflicts-rule (it breaks a non-T rule in design/rules.md). Exit 1 on a conflict.
`;

const isRef = (n) => /^--ref-/.test(n);
const isScale = (n) => /^--(font-size-|radius|space-)/.test(n);
const bare = (n) => n.replace(/^--/, "");
const isVarOnly = (v) => /^var\(\s*--[A-Za-z0-9_-]+\s*\)$/.test(v);

/** Required roles: the built-in list plus any the file's REQUIRED ROLES header adds. */
function requiredRoles(text) {
  const m = /REQUIRED ROLES:\s*([\s\S]*?)(?:\n\s*\*?\s*\n|\*\/)/.exec(text);
  const listed = m ? m[1].replace(/\*/g, " ").split(/\s+/).filter((w) => /^[a-z][a-z0-9-]*$/.test(w)) : [];
  return [...new Set([...REQUIRED, ...listed])];
}

/** Everything lint reports, for a token file's text. */
function analyse(text) {
  const tokens = ct.readTokens(text);
  const required = requiredRoles(text);
  const lightEnv = ct.env(tokens, "light");
  const out = { themes: THEMES, missing: { light: [], dark: [] }, raw: [], pairs: [], problems: [] };
  if (!tokens.light.size) out.problems.push("no light theme: no custom properties in :root");
  if (!tokens.hasDark) out.problems.push('no dark theme: add .dark, [data-theme="dark"] or @media (prefers-color-scheme: dark) { :root {…} }');

  // roles: the required ones plus any other non-reference, non-scale token that is a colour
  const names = [...new Set([...tokens.light.keys(), ...tokens.dark.keys()])];
  const isColourToken = (n) => {
    const r = ct.resolve(lightEnv.get(n) ?? tokens.dark.get(n).value, ct.env(tokens, tokens.light.has(n) ? "light" : "dark"));
    return !r.error && color.parse(r.value) !== null;
  };
  const roles = [...new Set([...required.map((r) => `--${r}`), ...names.filter((n) => !isRef(n) && !isScale(n) && isColourToken(n))])].sort();
  out.roles = roles.map(bare);
  out.references = names.filter(isRef).sort().map(bare);

  out.missing.light = required.filter((r) => !tokens.light.has(`--${r}`)).sort();
  out.missing.dark = required.filter((r) => !tokens.dark.has(`--${r}`)).sort();

  for (const theme of THEMES) {
    const decl = tokens[theme];
    for (const n of roles) {
      const d = decl.get(n);
      if (d && !isVarOnly(d.value)) out.raw.push({ token: n, theme, value: d.value, line: d.line });
    }
  }
  out.raw.sort((a, b) => a.line - b.line || a.token.localeCompare(b.token));

  for (const theme of THEMES) {
    if (theme === "dark" && !tokens.hasDark) continue;
    const e = ct.env(tokens, theme);
    // every role resolves to a colour, whether or not it is in a pair
    for (const n of roles) {
      if (!e.has(n)) continue;
      const r = ct.resolve(e.get(n), e, [n]);
      if (r.error) out.problems.push(`${theme} ${n}: ${r.error}`);
      else if (!color.parse(r.value)) out.problems.push(`${theme} ${n}: "${r.value}" is not a colour this can read (hex, rgb(), hsl(), oklch(), oklab())`);
    }
    const want = new Map();
    const add = (fg, bg) => {
      if (e.has(`--${fg}`) && e.has(`--${bg}`)) want.set(`${fg}|${bg}`, [fg, bg]);
    };
    add("foreground", "background");
    add("muted-foreground", "background");
    for (const r of out.roles) if (r.endsWith("-foreground")) add(r, r.slice(0, -"-foreground".length));
    const list = [...want.values()].sort((a, b) => a[0].localeCompare(b[0]) || a[1].localeCompare(b[1]));
    for (const [fg, bg] of list) {
      const vals = [fg, bg].map((n) => {
        const r = ct.resolve(e.get(`--${n}`), e, [`--${n}`]);
        if (r.error) {
          out.problems.push(`${theme} --${n}: ${r.error}`);
          return null;
        }
        const c = color.parse(r.value);
        if (!c) {
          out.problems.push(`${theme} --${n}: "${r.value}" is not a colour this can read (hex, rgb(), hsl(), oklch(), oklab())`);
          return null;
        }
        return { value: r.value, c };
      });
      if (!vals[0] || !vals[1]) continue;
      const ratio = color.contrast(vals[0].c, vals[1].c);
      out.pairs.push({ fg, bg, theme, fgValue: vals[0].value, bgValue: vals[1].value, ratio: color.round2(ratio), ok: ratio >= AA });
    }
  }
  out.problems = [...new Set(out.problems)];
  out.ok = !out.missing.light.length && !out.missing.dark.length && !out.raw.length && !out.problems.length && out.pairs.every((p) => p.ok);
  out.tokens = tokens;
  return out;
}

// ── diff ────────────────────────────────────────────────────────────────

const kebab = (s) =>
  "--" +
  String(s)
    .replace(/^--/, "")
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/[\s_./]+/g, "-")
    .replace(/[^A-Za-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();

const scalar = (v) => (typeof v === "string" || typeof v === "number" ? String(v) : null);

function detectKind(file, text) {
  const ext = path.extname(file).toLowerCase();
  if (ext === ".css" || ext === ".scss") return { kind: "css" };
  if (ext === ".html" || ext === ".htm") return { kind: "html" };
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    return { error: `${path.basename(file)} is not css, html or valid json` };
  }
  if (!data || typeof data !== "object" || Array.isArray(data)) return { error: "a json source is an object of tokens" };
  const hasValue = (o) => o && typeof o === "object" && (Object.prototype.hasOwnProperty.call(o, "$value") || Object.values(o).some(hasValue));
  if (hasValue(data)) return { kind: "dtcg", data };
  const vals = Object.entries(data);
  if (vals.every(([, v]) => scalar(v) !== null)) return { kind: vals.some(([k]) => k.includes("/")) ? "figma-variables" : "flat-json", data };
  return { error: "the json has neither $value tokens (DTCG) nor flat name: value pairs" };
}

/** Custom properties of a stylesheet's light theme, resolved inside the source where they can be. */
function fromCss(text) {
  const t = ct.readTokens(text);
  const e = ct.env(t, "light");
  return [...t.light.keys()].map((n) => {
    const r = ct.resolve(e.get(n), e, [n]);
    return { token: n, value: r.error ? e.get(n) : r.value };
  });
}

function fromDtcg(data) {
  const leaves = [];
  const walk = (o, trail) => {
    for (const [k, v] of Object.entries(o)) {
      if (k.startsWith("$")) continue;
      if (v && typeof v === "object" && Object.prototype.hasOwnProperty.call(v, "$value")) leaves.push({ trail: [...trail, k], value: v.$value });
      else if (v && typeof v === "object") walk(v, [...trail, k]);
    }
  };
  walk(data, []);
  const byPath = new Map(leaves.map((l) => [l.trail.join("."), l.value]));
  const valueOf = (v, seen = []) => {
    if (typeof v === "string") {
      const ref = /^\{([^}]+)\}$/.exec(v.trim());
      if (ref && byPath.has(ref[1]) && !seen.includes(ref[1])) return valueOf(byPath.get(ref[1]), [...seen, ref[1]]);
      return v;
    }
    if (typeof v === "number") return String(v);
    if (v && typeof v === "object" && "value" in v) return `${v.value}${v.unit || ""}`;
    return JSON.stringify(v);
  };
  const count = new Map();
  for (const l of leaves) count.set(l.trail[l.trail.length - 1], (count.get(l.trail[l.trail.length - 1]) || 0) + 1);
  return leaves.map((l) => {
    const leaf = l.trail[l.trail.length - 1];
    return { token: kebab(count.get(leaf) > 1 ? l.trail.join("-") : leaf), value: valueOf(l.value) };
  });
}

function fromFigma(data) {
  return Object.entries(data).map(([k, v]) => {
    const token = kebab(k.split("/").pop());
    let value = String(v).trim();
    if (isScale(token) && /^-?\d+(\.\d+)?$/.test(value)) value = value === "0" ? "0" : `${value}px`;
    return { token, value };
  });
}

const fromFlat = (data) => Object.entries(data).map(([k, v]) => ({ token: kebab(k), value: String(v).trim() }));

const norm = (v) => String(v).trim().replace(/\s+/g, " ").toLowerCase();

function equal(a, b) {
  const ca = color.parse(a);
  const cb = color.parse(b);
  if (ca && cb) return color.same(ca, cb);
  return norm(a) === norm(b);
}

/** The non-T scripted rules a `--token: value;` line could trip (css, code or any). */
function conflictRules(root) {
  const file = path.join(root, L.rules);
  if (!fs.existsSync(file)) return [];
  const { rules } = rc.loadRules(file);
  return rules.filter((r) => r.kind === "script" && r.severity !== "retired" && !/^T/.test(r.id) && ["css", "code", "any"].includes(r.where)).sort((a, b) => a.id.localeCompare(b.id, "en", { numeric: true }));
}

function diff(root, fromFile, tokensFile) {
  const text = fs.readFileSync(fromFile, "utf8");
  const k = detectKind(fromFile, text);
  if (k.error) return { error: k.error };
  let proposed;
  if (k.kind === "css") proposed = fromCss(text);
  else if (k.kind === "html") {
    const styles = [...text.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)].map((m) => m[1]).join("\n");
    proposed = fromCss(styles);
  } else if (k.kind === "dtcg") proposed = fromDtcg(k.data);
  else if (k.kind === "figma-variables") proposed = fromFigma(k.data);
  else proposed = fromFlat(k.data);

  const latest = new Map();
  for (const p of proposed) if (p.token !== "--") latest.set(p.token, p.value);

  const current = fs.existsSync(tokensFile) ? ct.readTokens(fs.readFileSync(tokensFile, "utf8")) : { light: new Map(), dark: new Map() };
  const e = ct.env(current, "light");
  const rules = conflictRules(root);
  const rows = [...latest.keys()].sort().map((token) => {
    const value = latest.get(token);
    let cur = null;
    if (e.has(token)) {
      const r = ct.resolve(e.get(token), e, [token]);
      cur = r.error ? e.get(token) : r.value;
    }
    let status = cur === null ? "new" : equal(cur, value) ? "same" : "changed";
    const row = { token, current: cur, proposed: value, status };
    if (status !== "same") {
      const line = `${token}: ${value};`;
      const hit = rules.find((r) => {
        r.regex.lastIndex = 0;
        return r.regex.test(line);
      });
      if (hit) Object.assign(row, { status: "conflicts-rule", rule: hit.id });
    }
    return row;
  });
  const counts = { new: 0, changed: 0, same: 0, conflicts: 0 };
  for (const r of rows) counts[r.status === "conflicts-rule" ? "conflicts" : r.status]++;
  return { from: relTo(root, fromFile), kind: k.kind, rows, counts };
}

function table(rows) {
  const head = ["TOKEN", "CURRENT", "PROPOSED", "STATUS"];
  const body = rows.map((r) => [r.token, r.current === null ? "-" : r.current, r.proposed, r.status === "conflicts-rule" ? `conflicts-rule ${r.rule}` : r.status]);
  const w = head.map((h, i) => Math.max(h.length, ...body.map((b) => b[i].length)));
  const fmt = (cols) => ("  " + cols.map((c, i) => (i === cols.length - 1 ? c : c.padEnd(w[i]))).join("  ")).replace(/\s+$/, "");
  return [fmt(head), ...body.map(fmt)];
}

// ── run ─────────────────────────────────────────────────────────────────

async function run(argv, ctx) {
  const [sub, ...rest] = argv;
  const parsed = parseArgs(rest, { values: ["--tokens", "--from"] });
  if (!sub || sub === "help" || sub === "--help" || parsed.help) {
    ctx.out(USAGE);
    return 0;
  }
  const bad = problems(parsed);
  if (bad.length) return ctx.usage(bad.join("; "), USAGE);
  const root = ctx.rootFrom(last(parsed, "--root"));
  const json = parsed.bools.has("--json");
  const tokensFile = path.resolve(root, last(parsed, "--tokens", L.tokens));
  const tokensName = relTo(root, tokensFile);

  if (sub === "lint") {
    if (!fs.existsSync(tokensFile)) {
      if (json) ctx.json({ ok: false, error: "no-tokens", file: tokensName });
      return ctx.fail(`no token file at ${tokensName}`);
    }
    const a = analyse(fs.readFileSync(tokensFile, "utf8"));
    const lowest = a.pairs.length ? a.pairs.reduce((m, p) => (p.ratio < m.ratio ? p : m)) : null;
    const out = { ok: a.ok, file: tokensName, themes: a.themes, missing: a.missing, raw: a.raw, pairs: a.pairs, lowest: lowest ? { fg: lowest.fg, bg: lowest.bg, theme: lowest.theme, ratio: lowest.ratio } : null, problems: a.problems };
    if (json) ctx.json(out);
    else if (a.ok) {
      const low = a.pairs.reduce((m, p) => Math.min(m, p.ratio), Infinity);
      ctx.out(`  ✓ ${tokensName}: ${a.roles.length} roles in light and dark, ${a.pairs.length} pairs pass AA${a.pairs.length ? ` (lowest ${low.toFixed(2)})` : ""}`);
    } else {
      ctx.out(`  ✗ ${tokensName}`);
      for (const t of THEMES) if (a.missing[t].length) ctx.out(`    missing in ${t}: ${a.missing[t].join(" ")}`);
      for (const r of a.raw) ctx.out(`    raw value: ${r.token} (${r.theme}) = ${r.value} on line ${r.line}; a role holds only var(--ref-…) or var(--<role>)`);
      for (const p of a.pairs.filter((x) => !x.ok)) ctx.out(`    contrast: ${p.fg} on ${p.bg} (${p.theme}) ${p.ratio.toFixed(2)} < ${AA} (${p.fgValue} on ${p.bgValue})`);
      for (const p of a.problems) ctx.out(`    problem: ${p}`);
    }
    return a.ok ? 0 : 1;
  }

  if (sub === "diff") {
    const from = last(parsed, "--from");
    if (!from) return ctx.usage("name the source with --from <file>", USAGE);
    const fromFile = path.resolve(root, from);
    if (!fs.existsSync(fromFile)) {
      if (json) ctx.json({ ok: false, error: "no-source", from });
      return ctx.fail(`no such file: ${from}`);
    }
    const d = diff(root, fromFile, tokensFile);
    if (d.error) {
      if (json) ctx.json({ ok: false, error: d.error, from });
      return ctx.fail(d.error);
    }
    if (json) ctx.json(d);
    else {
      ctx.out(`  tokens diff: ${d.from} (${d.kind}) against ${tokensName}`);
      if (!d.rows.length) ctx.out(`  No tokens found in ${d.from}.`);
      else table(d.rows).forEach((l) => ctx.out(l));
      ctx.out(`  ${d.rows.length} tokens: ${d.counts.new} new, ${d.counts.changed} changed, ${d.counts.same} same, ${d.counts.conflicts} conflicts-rule`);
    }
    return d.counts.conflicts ? 1 : 0;
  }

  return ctx.usage(`unknown tokens subcommand: ${sub}`, USAGE);
}

module.exports = { run, analyse, diff, detectKind, requiredRoles, REQUIRED, AA, USAGE };
