"use strict";

/**
 * preview: one self-contained HTML page of the tokens, for a person to look at before a gate.
 *
 *   preview [--tokens <file>] [--out <file>] [--stdout]
 *
 * Swatches for the roles (light and dark side by side) and the reference tokens, every role pair
 * with its contrast ratio and pass or fail (the numbers tokens lint computes), the type scale,
 * radius and spacing. Inline CSS, no script, no external fetch, no clock: the same tokens give
 * the same bytes. Writes design/.studio/preview.html (an automatic write) unless --stdout.
 */

const fs = require("fs");
const path = require("path");
const color = require("../lib/color");
const ct = require("../lib/css-tokens");
const { analyse, AA } = require("./tokens");
const { parseArgs, last, problems } = require("../lib/args");
const { rel: L } = require("../lib/layout");
const { relTo } = require("../lib/ctx");

const USAGE = `
  Usage: preview [--tokens <file>] [--out <file>] [--stdout] [--root <dir>] [--json]

    Renders the tokens as one self-contained HTML page: role swatches in light and dark, every
    role pair with its contrast ratio (the tokens lint numbers), the reference tokens, the type
    scale, radius and spacing. Writes ${L.preview} unless --stdout prints it instead.
`;

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
/** A value shown as text: a URL is never echoed into the page. */
const label = (v) => String(v).replace(/url\([^)]*\)?/gi, "(a URL, not shown)").replace(/[a-z][a-z0-9+.-]*:\/\/\S*/gi, "(a URL, not shown)");
/** A length safe to put in a style attribute, or null. */
const safeLength = (v) => (/^-?\d*\.?\d+(px|rem|em|%)?$/.test(v.trim()) ? v.trim() : null);

function resolved(tokens, theme, name) {
  const r = ct.resolveToken(tokens, theme, name);
  if (r.error) return { text: r.error, css: null };
  const c = color.parse(r.value);
  return { text: r.value, css: c ? color.toCss(c) : null };
}

function swatch(name, v) {
  const chip = v.css ? `<span class="chip" style="background:${v.css}"></span>` : `<span class="chip none">?</span>`;
  return `<li>${chip}<code>--${esc(name)}</code><small>${esc(label(v.text))}</small></li>`;
}

function pairRow(p, tokens) {
  const fg = resolved(tokens, p.theme, `--${p.fg}`);
  const bg = resolved(tokens, p.theme, `--${p.bg}`);
  const sample = fg.css && bg.css ? `<span class="sample" style="color:${fg.css};background:${bg.css}">Aa</span>` : `<span class="sample">?</span>`;
  return `<li class="${p.ok ? "pass" : "fail"}">${sample}<span><code>${esc(p.fg)}</code> on <code>${esc(p.bg)}</code></span><b>${p.ratio.toFixed(2)}</b><em>${p.ok ? "pass" : "fail"}</em></li>`;
}

const STYLE = `
*{box-sizing:border-box}
body{margin:0;padding:24px;font:14px/1.5 system-ui,-apple-system,"Segoe UI",sans-serif;background:#f6f6f6;color:#1a1a1a}
h1{font-size:20px;margin:0 0 4px}h2{font-size:16px;margin:24px 0 8px}h3{font-size:14px;margin:0 0 8px}
p.meta{margin:0;color:#555}
.themes{display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:16px}
.theme{border:1px solid #d4d4d4;border-radius:8px;padding:16px;background:#fff}
.theme.dark{background:#161616;color:#ededed;border-color:#333}
ul{list-style:none;margin:0 0 16px;padding:0}
li{display:flex;align-items:center;gap:8px;padding:3px 0}
.chip{display:inline-block;width:28px;height:28px;border-radius:6px;border:1px solid rgb(128 128 128 / 0.4);flex:none;text-align:center;line-height:26px}
code{font:12px ui-monospace,Menlo,Consolas,monospace}
small{color:inherit;opacity:.7;font:12px ui-monospace,Menlo,Consolas,monospace;margin-left:auto}
.sample{display:inline-block;width:44px;padding:4px 0;text-align:center;border-radius:6px;border:1px solid rgb(128 128 128 / 0.4);font-weight:600;flex:none}
.pairs li b{margin-left:auto;font-variant-numeric:tabular-nums}
.pairs li em{font-style:normal;font-size:12px;width:36px;text-align:right}
.pairs li.fail em{color:#b00020;font-weight:700}
.theme.dark .pairs li.fail em{color:#ff8a80}
.scale li{gap:16px}
.box{display:inline-block;width:48px;height:48px;background:#c8c8c8;flex:none}
.bar{display:inline-block;height:12px;background:#9a9a9a;flex:none}
.summary{padding:8px 12px;border-radius:6px;background:#fff;border:1px solid #d4d4d4;margin-top:12px}
.summary.fail{border-color:#b00020}
`;

function render(name, a) {
  const tokens = a.tokens;
  const themes = ["light", ...(tokens.hasDark ? ["dark"] : [])];
  const failing = a.pairs.filter((p) => !p.ok).length;
  const ok = a.ok;
  const parts = [];
  parts.push("<!doctype html>");
  parts.push('<html lang="en">');
  parts.push('<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">');
  parts.push(`<title>Token preview</title><style>${STYLE.trim()}</style></head>`);
  parts.push("<body>");
  parts.push(`<h1>Token preview</h1><p class="meta">From <code>${esc(name)}</code>. ${a.roles.length} roles, ${a.references.length} reference tokens, ${a.pairs.length} pairs checked against WCAG AA (${AA}:1).</p>`);
  const summary = ok
    ? "Every required role is set in light and dark, every role holds a reference, and every pair passes AA."
    : [
        failing ? `${failing} of ${a.pairs.length} pairs fail AA.` : "",
        a.missing.light.length ? `Missing in light: ${a.missing.light.join(", ")}.` : "",
        a.missing.dark.length ? `Missing in dark: ${a.missing.dark.join(", ")}.` : "",
        a.raw.length ? `${a.raw.length} roles hold a raw value.` : "",
        ...a.problems.map((p) => `${p}.`),
      ]
        .filter(Boolean)
        .join(" ");
  parts.push(`<p class="summary${ok ? "" : " fail"}">${esc(label(summary))}</p>`);

  parts.push("<h2>Roles and contrast</h2>");
  parts.push('<div class="themes">');
  for (const theme of themes) {
    parts.push(`<section class="theme ${theme}"><h3>${theme === "light" ? "Light" : "Dark"}</h3>`);
    parts.push('<ul class="roles">');
    for (const r of a.roles) {
      if (!ct.env(tokens, theme).has(`--${r}`)) continue;
      parts.push(swatch(r, resolved(tokens, theme, `--${r}`)));
    }
    parts.push("</ul>");
    parts.push('<ul class="pairs">');
    for (const p of a.pairs.filter((x) => x.theme === theme)) parts.push(pairRow(p, tokens));
    parts.push("</ul></section>");
  }
  parts.push("</div>");

  parts.push("<h2>Reference tokens</h2>");
  parts.push('<ul class="references">');
  for (const r of a.references) parts.push(swatch(r, resolved(tokens, "light", `--${r}`)));
  parts.push("</ul>");

  const scale = (prefix) => [...tokens.light.keys()].filter((n) => prefix.test(n));
  const value = (n) => {
    const r = ct.resolveToken(tokens, "light", n);
    return r.error ? r.error : r.value;
  };
  parts.push("<h2>Type scale</h2>");
  parts.push('<ul class="scale type">');
  for (const n of scale(/^--font-size-/)) {
    const len = safeLength(value(n));
    parts.push(`<li><code>${esc(n)}</code><small>${esc(label(value(n)))}</small></li><li><span${len ? ` style="font-size:${len}"` : ""}>The quick brown fox jumps over the lazy dog</span></li>`);
  }
  parts.push("</ul>");
  parts.push("<h2>Radius</h2>");
  parts.push('<ul class="scale radius">');
  for (const n of scale(/^--radius/)) {
    const len = safeLength(value(n));
    parts.push(`<li><span class="box"${len ? ` style="border-radius:${len}"` : ""}></span><code>${esc(n)}</code><small>${esc(label(value(n)))}</small></li>`);
  }
  parts.push("</ul>");
  parts.push("<h2>Spacing</h2>");
  parts.push('<ul class="scale space">');
  for (const n of scale(/^--space-/)) {
    const len = safeLength(value(n));
    parts.push(`<li><span class="bar"${len ? ` style="width:${len}"` : ""}></span><code>${esc(n)}</code><small>${esc(label(value(n)))}</small></li>`);
  }
  parts.push("</ul>");
  parts.push("</body>");
  parts.push("</html>");
  return parts.join("\n") + "\n";
}

async function run(argv, ctx) {
  const parsed = parseArgs(argv, { values: ["--tokens", "--out"], bools: ["--stdout"] });
  if (parsed.help || parsed.positional[0] === "help") {
    ctx.out(USAGE);
    return 0;
  }
  const bad = [...problems(parsed), ...parsed.positional.map((p) => `unexpected argument ${p}`)];
  if (bad.length) return ctx.usage(bad.join("; "), USAGE);
  const root = ctx.rootFrom(last(parsed, "--root"));
  const json = parsed.bools.has("--json");
  const tokensFile = path.resolve(root, last(parsed, "--tokens", L.tokens));
  const name = relTo(root, tokensFile);
  if (!fs.existsSync(tokensFile)) {
    if (json) ctx.json({ ok: false, error: "no-tokens", file: name });
    return ctx.fail(`no token file at ${name}`);
  }
  const a = analyse(fs.readFileSync(tokensFile, "utf8"));
  const html = render(name, a);
  const stdout = parsed.bools.has("--stdout");
  let outName = null;
  if (!stdout) {
    const outFile = path.resolve(root, last(parsed, "--out", L.preview));
    fs.mkdirSync(path.dirname(outFile), { recursive: true });
    fs.writeFileSync(outFile, html);
    outName = relTo(root, outFile);
  }
  if (json) {
    const roles = a.roles.map((r) => {
      const row = { token: `--${r}` };
      for (const t of ["light", "dark"]) {
        const v = ct.env(a.tokens, t).has(`--${r}`) ? ct.resolveToken(a.tokens, t, `--${r}`) : { error: "missing" };
        row[t] = v.error ? null : v.value;
      }
      return row;
    });
    const references = a.references.map((r) => {
      const v = ct.resolveToken(a.tokens, "light", `--${r}`);
      return { token: `--${r}`, value: v.error ? null : v.value };
    });
    ctx.json({ file: outName, tokens: name, roles, references, pairs: a.pairs.map((p) => ({ fg: p.fg, bg: p.bg, theme: p.theme, ratio: p.ratio, ok: p.ok })) });
  } else if (stdout) ctx.out(html.replace(/\n$/, ""));
  else ctx.out(`  ✓ wrote ${outName}: ${a.roles.length} roles, ${a.pairs.length} pairs (${a.pairs.filter((p) => !p.ok).length} failing AA). Open it in a browser.`);
  return 0;
}

module.exports = { run, render, USAGE };
