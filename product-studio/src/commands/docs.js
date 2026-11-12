"use strict";

/**
 * docs: component docs in docs/components/*.md and the manifest built from them.
 *
 *   docs sync [--check]                 rebuild docs/manifest.json from each doc's frontmatter
 *                                        (--check writes nothing and exits 1 on drift)
 *   docs props <component-source-file>  the props a React TS/JS component declares
 *
 * The docs are the inventory: the manifest is generated from the frontmatter, never kept by hand.
 * This command owns the manifest only; it never touches a doc's body.
 */

const fs = require("fs");
const path = require("path");
const { parseArgs, last, problems } = require("../lib/args");
const { rel: L } = require("../lib/layout");
const { relTo } = require("../lib/ctx");
const { frontmatter } = require("../lib/md");

const USAGE = `
  Usage: docs <sync|props> [--root <dir>] [--json]

    sync [--check]   rebuild ${L.manifest} from the frontmatter of ${L.componentDocs}/*.md
                     (files starting with _ are templates and skipped). Required keys: name, slug,
                     group, source; slug matches the file name. --check writes nothing and exits 1
                     when the manifest is out of step.
    props <file>     the props a React component declares: an interface or type <Name>Props or
                     Props, an inline type on the first parameter, or the destructured parameters.
                     Prints {component, file, props[{name, type, required}]} in declaration order.
`;

// ------------------------------------------------------------------------------------------------ sync

const REQUIRED = ["name", "slug", "group", "source"];
const OPTIONAL = ["gallery", "related"];

/** The manifest the docs describe: { manifest, problems }. Components sorted by group, then name. */
function buildManifest(root) {
  const dir = path.join(root, L.componentDocs);
  const out = [];
  const bad = [];
  const files = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".md") && !f.startsWith("_"))
    .sort();
  for (const f of files) {
    const rel = `${L.componentDocs}/${f}`;
    const slugFromFile = f.replace(/\.md$/, "");
    const text = fs.readFileSync(path.join(dir, f), "utf8");
    const { data, lines } = frontmatter(text);
    if (!lines) {
      bad.push({ file: rel, line: 1, message: "no frontmatter (---) at the top" });
      continue;
    }
    for (const k of REQUIRED) if (data[k] === undefined || data[k] === null || data[k] === "") bad.push({ file: rel, line: 1, message: `missing required key "${k}"` });
    if (data.slug !== undefined && data.slug !== null && data.slug !== "" && String(data.slug) !== slugFromFile) {
      bad.push({ file: rel, line: 1, message: `slug "${data.slug}" does not match the file name "${slugFromFile}"` });
    }
    const c = {
      name: data.name ?? null,
      slug: data.slug ?? slugFromFile,
      group: data.group ?? null,
      status: data.status ?? "skeleton",
      source: data.source ?? null,
      reference: data.reference ?? null,
      platforms: data.platforms ?? null,
    };
    for (const k of OPTIONAL) if (data[k] !== undefined) c[k] = data[k];
    c.doc = rel;
    out.push(c);
  }
  out.sort((a, b) => cmp(String(a.group), String(b.group)) || cmp(String(a.name), String(b.name)) || cmp(a.doc, b.doc));
  const groups = [...new Set(out.map((c) => c.group))];
  return { manifest: { count: out.length, groups, components: out }, problems: bad };
}

const cmp = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
const serialize = (manifest) => JSON.stringify(manifest, null, 2) + "\n";

/** What differs between the manifest on disk and the one the docs describe. */
function driftOf(prevText, next) {
  if (prevText === null) return next.components.map((c) => ({ slug: c.slug, change: "added", fields: [] })).concat(next.components.length ? [] : [{ slug: null, change: "missing", fields: [] }]);
  let prev;
  try {
    prev = JSON.parse(prevText);
  } catch {
    return [{ slug: null, change: "unparseable", fields: [] }];
  }
  const before = new Map(((prev && prev.components) || []).map((c) => [c && c.slug, c]));
  const after = new Map(next.components.map((c) => [c.slug, c]));
  const drift = [];
  for (const [slug, c] of after) {
    if (!before.has(slug)) drift.push({ slug, change: "added", fields: [] });
    else {
      const b = before.get(slug) || {};
      const keys = [...new Set([...Object.keys(b), ...Object.keys(c)])].sort();
      const fields = keys.filter((k) => JSON.stringify(b[k]) !== JSON.stringify(c[k]));
      if (fields.length) drift.push({ slug, change: "changed", fields });
    }
  }
  for (const slug of before.keys()) if (!after.has(slug)) drift.push({ slug: slug === undefined ? null : slug, change: "removed", fields: [] });
  drift.sort((a, b) => cmp(String(a.slug), String(b.slug)) || cmp(a.change, b.change));
  if (!drift.length && prevText !== serialize(next)) drift.push({ slug: null, change: "format", fields: [] });
  return drift;
}

const driftMessage = (d) => {
  if (d.change === "added") return `${d.slug} has a doc but no manifest entry`;
  if (d.change === "removed") return `${d.slug} is in the manifest but has no doc`;
  if (d.change === "changed") return `${d.slug}: the manifest differs from the doc's frontmatter in ${d.fields.join(", ")}`;
  if (d.change === "missing") return "the manifest does not exist";
  if (d.change === "unparseable") return "the manifest is not valid JSON";
  return "the manifest's order or layout differs from what docs sync writes";
};

function sync(root, { check }) {
  const dir = path.join(root, L.componentDocs);
  if (!fs.existsSync(dir)) {
    return {
      code: 1,
      result: { ok: false, error: "no-docs", check, manifest: L.manifest, count: 0, groups: [], written: false, drift: [], problems: [{ file: L.componentDocs, message: `${L.componentDocs}/ not found: nothing to sync` }] },
    };
  }
  const { manifest, problems: bad } = buildManifest(root);
  const base = { check, manifest: L.manifest, count: manifest.count, groups: manifest.groups };
  if (bad.length) return { code: 1, result: { ok: false, ...base, written: false, drift: [], problems: bad } };
  const file = path.join(root, L.manifest);
  const prev = fs.existsSync(file) ? fs.readFileSync(file, "utf8") : null;
  const text = serialize(manifest);
  const drift = prev === text ? [] : driftOf(prev, manifest);
  if (check) {
    const probs = drift.map((d) => ({ file: L.manifest, message: driftMessage(d) }));
    return { code: drift.length ? 1 : 0, result: { ok: !drift.length, ...base, written: false, drift, problems: probs } };
  }
  const written = prev !== text;
  if (written) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, text);
  }
  return { code: 0, result: { ok: true, ...base, written, drift, problems: [] } };
}

// ------------------------------------------------------------------------------------------------ props

/** Blank out comments, keeping string contents and line breaks. */
function stripComments(src) {
  let out = "";
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    const n = src[i + 1];
    if (c === "/" && n === "/") {
      while (i < src.length && src[i] !== "\n") i++;
      out += "\n";
    } else if (c === "/" && n === "*") {
      i += 2;
      while (i < src.length && !(src[i] === "*" && src[i + 1] === "/")) {
        if (src[i] === "\n") out += "\n";
        i++;
      }
      i++;
    } else if (c === '"' || c === "'" || c === "`") {
      let j = i + 1;
      while (j < src.length && src[j] !== c) j += src[j] === "\\" ? 2 : 1;
      out += src.slice(i, j + 1);
      i = j;
    } else out += c;
  }
  return out;
}

const OPEN = { "{": "}", "(": ")", "[": "]", "<": ">" };
const CLOSE = new Set(["}", ")", "]", ">"]);

/** The index of the bracket that closes the one at `start`, skipping strings and `=>`. */
function matching(src, start) {
  let depth = 0;
  for (let i = start; i < src.length; i++) {
    const c = src[i];
    if (c === '"' || c === "'" || c === "`") {
      let j = i + 1;
      while (j < src.length && src[j] !== c) j += src[j] === "\\" ? 2 : 1;
      i = j;
    } else if (c === "=" && src[i + 1] === ">") i++;
    else if (OPEN[c] && (c !== "<" || src[start] === "<")) depth++;
    else if (CLOSE.has(c) && (c !== ">" || src[start] === "<")) {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

/** Split text on a separator at bracket depth 0. `newline: true` also ends a member at a line break that can't continue a type. */
function splitTop(body, { newline = false } = {}) {
  const parts = [];
  let cur = "";
  let depth = 0;
  const push = () => {
    if (cur.trim()) parts.push(cur.trim());
    cur = "";
  };
  for (let i = 0; i < body.length; i++) {
    const c = body[i];
    if (c === '"' || c === "'" || c === "`") {
      let j = i + 1;
      while (j < body.length && body[j] !== c) j += body[j] === "\\" ? 2 : 1;
      cur += body.slice(i, j + 1);
      i = j;
      continue;
    }
    if (c === "=" && body[i + 1] === ">") {
      cur += "=>";
      i++;
      continue;
    }
    if ("{([<".includes(c)) depth++;
    else if ("})]>".includes(c)) depth--;
    if (depth === 0 && (c === ";" || c === ",")) {
      push();
      continue;
    }
    if (depth === 0 && newline && c === "\n") {
      const t = cur.trim();
      const next = body.slice(i + 1).trimStart()[0];
      const open = !t || /[|&:=(,<]$|=>$/.test(t) || !/:/.test(t);
      if (!open && next !== "|" && next !== "&" && next !== "=" && next !== ")") {
        push();
        continue;
      }
    }
    cur += c;
  }
  push();
  return parts;
}

const squash = (s) => s.replace(/\s+/g, " ").trim();

/** Members of an object type body: [{name, type, required}]. Index signatures are skipped. */
function members(body) {
  const out = [];
  for (const m of splitTop(body, { newline: true })) {
    const t = m.replace(/^readonly\s+/, "");
    if (t.startsWith("[")) continue;
    let x = /^(['"]?)([A-Za-z_$][\w$-]*)\1(\?)?\s*\(([\s\S]*)\)\s*:\s*([\s\S]+)$/.exec(t);
    if (x && !/^\s*$/.test(x[5]) && t.indexOf("(") < (t.indexOf(":") < 0 ? Infinity : t.indexOf(":"))) {
      out.push({ name: x[2], type: squash(`(${x[4]}) => ${x[5]}`), required: !x[3] });
      continue;
    }
    x = /^(['"]?)([A-Za-z_$][\w$-]*)\1(\?)?\s*:\s*([\s\S]+)$/.exec(t);
    if (x) out.push({ name: x[2], type: squash(x[4]).replace(/^\|\s*/, ""), required: !x[3] });
  }
  return out;
}

/** The object body of `interface Name … {…}` or `type Name = {…}` (intersections: every literal part). */
function namedType(src, name) {
  const re = new RegExp(`\\b(?:interface\\s+${name}\\b[^{]*|type\\s+${name}\\b(?:\\s*<[^=]*>)?\\s*=\\s*)`, "g");
  const m = re.exec(src);
  if (!m) return null;
  let i = m.index + m[0].length;
  const isType = /^type\b/.test(m[0]);
  if (!isType) {
    const end = matching(src, i);
    return end < 0 ? null : [src.slice(i + 1, end)];
  }
  const bodies = [];
  const refs = [];
  while (i < src.length) {
    while (/\s/.test(src[i])) i++;
    if (src[i] === "{") {
      const end = matching(src, i);
      if (end < 0) break;
      bodies.push(src.slice(i + 1, end));
      i = end + 1;
    } else {
      const w = /^[A-Za-z_$][\w$.]*(<[^>]*>)?/.exec(src.slice(i));
      if (!w) break;
      refs.push(w[0].replace(/<.*$/, ""));
      i += w[0].length;
    }
    while (/[ \t]/.test(src[i])) i++;
    if (src[i] === "&") i++;
    else break;
  }
  for (const r of refs) if (r !== name && /^[A-Za-z_$][\w$]*$/.test(r)) bodies.push(...(namedType(src, r) || []));
  return bodies.length ? bodies : null;
}

/** The exported component a file declares: the one named like the file, else the first exported PascalCase one. */
function componentDecl(src, base) {
  const decls = [];
  const re = /\bexport\s+(?:default\s+)?(?:function\s+([A-Z][\w$]*)|(?:const|let)\s+([A-Z][\w$]*))|\bfunction\s+([A-Z][\w$]*)\s*\(|\b(?:const|let)\s+([A-Z][\w$]*)\s*(?::[^=]+)?=\s*(?:React\.)?(?:forwardRef|memo)?\s*(?:<[^>]*>)?\s*\(?\s*(?:function\s*[\w$]*\s*)?\(/g;
  let m;
  while ((m = re.exec(src))) decls.push({ name: m[1] || m[2] || m[3] || m[4], at: m.index, exported: /^export/.test(m[0]) });
  return decls.find((d) => d.name === base) || decls.find((d) => d.exported) || decls[0] || null;
}

/** Props from the first parameter after a declaration: { props, typeName } (props null when none found). */
function fromParams(src, at) {
  const open = src.indexOf("(", at);
  if (open < 0) return { props: null };
  const close = matching(src, open);
  if (close < 0) return { props: null };
  const params = src.slice(open + 1, close).trim();
  // the generic in forwardRef<Ref, Props>( … ) names the props type
  const generic = /forwardRef\s*<[^,>]+,\s*([A-Za-z_$][\w$]*)\s*>/.exec(src.slice(at, open + 1));
  if (!params) return { props: [], typeName: generic ? generic[1] : null };
  const first = splitTop(params)[0];
  let names = null;
  let rest = first;
  if (first.startsWith("{")) {
    const end = matching(first, 0);
    names = splitTop(first.slice(1, end)).filter((p) => !p.startsWith("...")).map((p) => {
      const n = /^([A-Za-z_$][\w$]*)/.exec(p);
      return { name: n ? n[1] : p, hasDefault: /=/.test(p.replace(/=>/g, "")) };
    });
    rest = first.slice(end + 1).trim();
  } else {
    rest = first.replace(/^[A-Za-z_$][\w$]*\s*\??/, "").trim();
  }
  let inline = null;
  let typeName = generic ? generic[1] : null;
  if (rest.startsWith(":")) {
    const t = rest.slice(1).trim();
    if (t.startsWith("{")) inline = t.slice(1, matching(t, 0));
    else {
      const w = /^(?:React\.)?(?:PropsWithChildren\s*<\s*)?([A-Za-z_$][\w$]*)/.exec(t);
      if (w) typeName = w[1];
    }
  }
  return { names, inline, typeName };
}

function props(file) {
  const raw = fs.readFileSync(file, "utf8");
  const src = stripComments(raw);
  const base = path.basename(file).replace(/\.[^.]+$/, "");
  const decl = componentDecl(src, base);
  const component = decl ? decl.name : base;
  const p = decl ? fromParams(src, decl.at) : { props: null };
  const declared = (bodies) => bodies.flatMap(members);
  let list = null;
  if (p.inline !== null && p.inline !== undefined) list = members(p.inline);
  if (!list && p.typeName) list = (namedType(src, p.typeName) && declared(namedType(src, p.typeName))) || null;
  if (!list) {
    for (const n of [`${component}Props`, "Props"]) {
      const b = namedType(src, n);
      if (b) {
        list = declared(b);
        break;
      }
    }
  }
  if (!list && p.names) list = p.names.map((n) => ({ name: n.name, type: "unknown", required: !n.hasDefault }));
  const seen = new Set();
  return { component, props: (list || []).filter((x) => (seen.has(x.name) ? false : seen.add(x.name))) };
}

// ------------------------------------------------------------------------------------------------ run

async function run(argv, ctx) {
  const [sub, ...rest] = argv;
  const parsed = parseArgs(rest, { bools: ["--check"] });
  if (!sub || sub === "help" || parsed.help) {
    ctx.out(USAGE);
    return 0;
  }
  const bad = problems(parsed);
  if (bad.length) return ctx.usage(bad.join("; "), USAGE);
  const root = ctx.rootFrom(last(parsed, "--root"));
  const json = parsed.bools.has("--json");

  if (sub === "sync") {
    if (parsed.positional.length) return ctx.usage(`docs sync takes no arguments, not ${parsed.positional.join(" ")}`, USAGE);
    const check = parsed.bools.has("--check");
    const { code, result: r } = sync(root, { check });
    if (json) ctx.json(r);
    else if (r.error === "no-docs") ctx.err(`  ✗ ${r.problems[0].message}`);
    else if (r.problems.length && !r.drift.length) {
      ctx.err(`  ✗ invalid doc frontmatter; fix these, then run docs sync again:`);
      r.problems.forEach((p) => ctx.err(`    - ${p.file}: ${p.message}`));
    } else if (check) {
      if (code) {
        ctx.err(`  ✗ ${L.manifest} is out of step with ${L.componentDocs}/ (run docs sync):`);
        r.problems.forEach((p) => ctx.err(`    - ${p.message}`));
      } else ctx.out(`  ✓ ${L.manifest} is up to date (${r.count} components)`);
    } else ctx.out(`  ✓ ${L.manifest} ${r.written ? "written" : "unchanged"} (${r.count} components, ${r.groups.length} groups)`);
    return code;
  }

  if (sub === "props") {
    const [target, ...extra] = parsed.positional;
    if (!target || extra.length) return ctx.usage("docs props takes one component source file", USAGE);
    const file = path.resolve(root, target);
    if (!fs.existsSync(file) || !fs.statSync(file).isFile()) {
      if (json) ctx.json({ ok: false, error: "no-such-file", file: relTo(root, file) });
      else ctx.err(`  ✗ no such file: ${relTo(root, file)}`);
      return 1;
    }
    const r = props(file);
    const out = { component: r.component, file: relTo(root, file), props: r.props };
    if (json) ctx.json(out);
    else {
      ctx.out(`  ${out.component} · ${out.props.length} props · ${out.file}`);
      out.props.forEach((x) => ctx.out(`    ${x.name}${x.required ? "" : "?"}: ${x.type}`));
    }
    return 0;
  }

  return ctx.usage(`unknown docs subcommand: ${sub}`, USAGE);
}

module.exports = { run, buildManifest, props, USAGE };
