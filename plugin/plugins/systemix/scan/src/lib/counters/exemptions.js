"use strict";

/**
 * exemptions.js — the exemptions a repo DECLARES in design/guardrails.mdx, resolved
 * to files. A block that says "exception(s)" / "exempt" / "except" / "excluded" /
 * "allow-list" contributes the backticked file, glob or directory references that
 * follow the word; a heading with one of those words opens a section whose every
 * reference counts. Nothing is inferred from file names (a file called *Mockups* is
 * NOT exempt unless the guardrails say so). Used by typography and scale, which split
 * their headline numbers with and without the exempt files.
 *
 * Negated mentions ("no exceptions", "never exempt", "Exceptions: none"), fenced code
 * and HTML / MDX comments declare nothing. At most MAX_REFS references are resolved and
 * glob matching stops at MATCH_BUDGET comparisons; what is left over is reported, not
 * guessed. Globs are matched by hand, never compiled to a regex, so a hostile file name
 * cannot backtrack.
 */

const { byString } = require("./counter");
const { cap, sum } = require("./util");

const UI_DIR_RE = /(^|\/)components\/ui\//;

// ── exemptions the repo itself declares ───────────────────────────────────

const GUARDRAIL_FILES = ["design/guardrails.mdx", "design/guardrails.md"];
// Group 1 names an exemption and can be negated ("no exceptions", "never exempt"); group 2 is a
// preposition ("no raw hex, except in `x.tsx`") whose lead-in negation belongs to the rule, not the exemption.
const EXEMPT_WORD_RE = /\b(?:(exceptions?|exempt(?:ed|ions?)?|exclude[sd]?|allow-?list(?:ed)?)|(excepting|except|excluding))\b/gi;
const NEGATOR_RE = /^(?:no|not|never|nothing|none|without|zero|nor|neither|cannot|can't|don't|doesn't|isn't|aren't|won't|shouldn't|mustn't)$/;
const NEGATION_REACH = 4; // words before the exemption word, inside the same clause
const CLAUSE_REACH = 120; // characters looked back for the clause
const NEGATED_AFTER_RE = /^\s*[:\-–—]?\s*(?:none|n\/a|nothing)\b/i;
const CLAUSE_BREAK_RE = /[.;:!?()—–\n]|\s-\s/;
const BACKTICK_RE = /`([^`\n]{1,200})`/g;
const FILE_TAIL_RE = /\.[A-Za-z0-9]{1,8}$/;
const BULLET_RE = /^ {0,1}(?:[-*+]|\d+[.)])\s/;
// [^\n]* rather than .*: a lone \r or U+2028 would stop `.` and make the closing `$` fail after every backtrack step
const FENCE_RE = /^ {0,3}(`{3,}|~{3,})([^\n]*)$/;
const COMMENT_FORMS = [["<!--", "-->"], ["{/*", "*/}"]];
const MAX_REFS = 200; // exemption references resolved per run; the rest are reported, not matched
const MATCH_BUDGET = 20000000; // glob comparison steps across all references (counted, never timed)

/**
 * The lines of a guardrails file with fenced code and HTML / MDX comments blanked
 * (line numbers are kept): an example inside a fence or a commented-out note is
 * not a rule. Lines before `from` (the front matter) are blanked too.
 */
function blankFencedAndComments(lines, from) {
  let fence = null;
  let close = null;
  return lines.map((line, n) => {
    if (n < from) return "";
    if (fence) {
      const f = FENCE_RE.exec(line);
      if (f && f[1][0] === fence[0] && f[1].length >= fence.length && !f[2].trim()) fence = null;
      return "";
    }
    if (!close) {
      const f = FENCE_RE.exec(line);
      if (f && !(f[1][0] === "`" && f[2].includes("`"))) { fence = f[1]; return ""; }
    }
    let out = "";
    let i = 0;
    const next = COMMENT_FORMS.map((f) => line.indexOf(f[0])); // searched again only once passed
    while (i < line.length) {
      if (close) {
        const end = line.indexOf(close, i);
        if (end === -1) break;
        i = end + close.length;
        close = null;
        out += " ";
        continue;
      }
      let open = -1;
      let form = null;
      COMMENT_FORMS.forEach((f, k) => {
        if (next[k] !== -1 && next[k] < i) next[k] = line.indexOf(f[0], i);
        if (next[k] !== -1 && (open === -1 || next[k] < open)) { open = next[k]; form = f; }
      });
      if (open === -1) { out += line.slice(i); break; }
      out += line.slice(i, open);
      i = open + form[0].length;
      close = form[1];
    }
    return out;
  });
}

/**
 * Index of the first exemption word in `text` that is not negated, or -1. A word is
 * negated by "no / never / without / not / none …" earlier in its clause, or by
 * "none" right after it ("Exceptions: none").
 */
function exemptionStart(text) {
  const masked = text.replace(/`[^`\n]*`/g, (m) => "x".repeat(m.length)).replace(/’/g, "'");
  for (const m of masked.matchAll(EXEMPT_WORD_RE)) {
    if (m[2] !== undefined) return m.index;
    const clause = masked.slice(Math.max(0, m.index - CLAUSE_REACH), m.index).split(CLAUSE_BREAK_RE).pop().toLowerCase();
    const words = clause.match(/[a-z']+/g) ?? [];
    if (words.slice(-NEGATION_REACH).some((w) => NEGATOR_RE.test(w))) continue;
    if (NEGATED_AFTER_RE.test(masked.slice(m.index + m[0].length, m.index + m[0].length + 40))) continue;
    return m.index;
  }
  return -1;
}

/** Markdown-ish blocks: headings, bullets (with their continuation lines) and paragraphs; code and comments excluded. */
function guardrailBlocks(text) {
  const raw = text.split("\n");
  let start = 0;
  if (raw[0] && raw[0].trim() === "---") {
    const end = raw.findIndex((l, n) => n > 0 && l.trim() === "---");
    if (end > 0) start = end + 1;
  }
  const lines = blankFencedAndComments(raw, start);
  let i = 0;
  const blocks = [];
  let cur = null;
  const flush = () => { if (cur) { blocks.push(cur); cur = null; } };
  for (; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) { flush(); continue; }
    const heading = /^(#{1,6})\s+([^\n]*)$/.exec(line);
    if (heading) {
      flush();
      blocks.push({ line: i + 1, heading: heading[1].length, text: heading[2] });
    } else if (!cur || BULLET_RE.test(line)) {
      flush();
      cur = { line: i + 1, heading: 0, text: line.trim() };
    } else {
      cur.text += " " + line.trim();
    }
  }
  flush();
  return blocks;
}

/** Backticked tokens that look like a file, a glob or a directory (`globals.css`, `src/ui/`, `**\/*.stories.tsx`). */
function fileRefs(text) {
  const refs = [];
  for (const m of text.matchAll(BACKTICK_RE)) {
    let t = m[1].trim();
    if (/^[@~]\//.test(t)) t = t.slice(2); // alias paths resolve by their tail (`@/components/legacy/` → components/legacy/)
    if (!t || /\s/.test(t) || t.length > 200) continue;
    if (/^[-:@#]/.test(t)) continue;
    if (t.startsWith(".") && !t.startsWith("./") && !t.includes("/") && !/^\.[\w-]+\.[A-Za-z0-9]{1,8}$/.test(t)) continue;
    if (t.startsWith("/") && !FILE_TAIL_RE.test(t)) continue;
    if (t.includes("(") && !t.includes("/")) continue;
    const dirLike = t.endsWith("/") || t.includes("/");
    if (FILE_TAIL_RE.test(t) || dirLike || t.includes("*")) refs.push(t);
  }
  return refs;
}

// Globs are matched by hand, segment by segment, never compiled to a regex: a chain of
// `[^/]*` groups backtracks polynomially on a long file name. `*` is any run of characters
// inside one path segment, `?` one character, and `**` as a WHOLE segment any number of
// segments; consecutive stars elsewhere collapse to one. Both matchers only ever fall back
// to the most recent star, so a pair costs at most (name length x pattern length).

/** One path segment against a segment pattern. `work.steps` counts the comparisons. */
function segmentMatch(pat, str, work) {
  let p = 0;
  let i = 0;
  let star = -1;
  let mark = 0;
  while (i < str.length) {
    work.steps++;
    if (p < pat.length && pat[p] === "*") { star = p++; mark = i; }
    else if (p < pat.length && (pat[p] === "?" || pat[p] === str[i])) { p++; i++; }
    else if (star !== -1) { p = star + 1; i = ++mark; }
    else return false;
  }
  while (p < pat.length && pat[p] === "*") p++;
  return p === pat.length;
}

/** A list of segment patterns (`**` = any number of segments) against a list of path segments. */
function pathMatch(pat, segs, work) {
  let p = 0;
  let i = 0;
  let star = -1;
  let mark = 0;
  while (i < segs.length) {
    work.steps++;
    if (p < pat.length && pat[p] === "**") { star = p++; mark = i; }
    else if (p < pat.length && segmentMatch(pat[p], segs[i], work)) { p++; i++; }
    else if (star !== -1) { p = star + 1; i = ++mark; }
    else return false;
  }
  while (p < pat.length && pat[p] === "**") p++;
  return p === pat.length;
}

const collapseStars = (seg) => (seg === "**" ? seg : seg.replace(/\*{2,}/g, "*"));

/**
 * A predicate over repo-relative paths for one backticked reference, or null when it is unusable.
 * @param {string} ref
 * @param {{steps:number}} work shared glob comparison counter (see MATCH_BUDGET)
 */
function refMatcher(ref, work) {
  const p = ref.replace(/\\/g, "/").replace(/^\.\//, "").replace(/^\/+/, "");
  if (!p || p.length > 200) return null;
  if (/[*?]/.test(p)) {
    const segs = p.split("/").map(collapseStars);
    if (segs.length === 1) {
      // no slash: the file name alone is matched, wherever the file sits
      return (rel) => segmentMatch(segs[0], rel.slice(rel.lastIndexOf("/") + 1), work);
    }
    // with a slash the pattern may start at any directory boundary
    const pat = segs[0] === "**" ? segs : ["**", ...segs];
    // a trailing `/**` means one or more segments below the directory
    if (pat[pat.length - 1] === "**") pat.splice(pat.length - 1, 1, "*", "**");
    return (rel) => pathMatch(pat, rel.split("/"), work);
  }
  if (p.endsWith("/") || (p.includes("/") && !FILE_TAIL_RE.test(p))) {
    const dir = p.replace(/\/+$/, "");
    if (!dir) return null;
    return (rel) => rel.startsWith(dir + "/") || rel.includes("/" + dir + "/");
  }
  if (p.includes("/")) return (rel) => rel === p || rel.endsWith("/" + p);
  return (rel) => rel.slice(rel.lastIndexOf("/") + 1) === p;
}


/**
 * The exemptions the repo DECLARES in design/guardrails.mdx, resolved to files.
 * A block that says "exception(s)" / "exempt" / "except" / "excluded" / "allow-list"
 * contributes the backticked file, glob or directory references that follow the
 * word; a heading with one of those words opens a section whose every reference
 * counts. Nothing is inferred from file names (a file called *Mockups* is NOT
 * exempt unless the guardrails say so).
 * Negated mentions ("no exceptions", "never exempt", "Exceptions: none"), fenced code and
 * HTML / MDX comments declare nothing. At most MAX_REFS references are resolved and glob
 * matching stops at MATCH_BUDGET comparisons; what is left over is reported, not guessed.
 * @returns {{source:string|null, refs:object[], exemptFiles:Set<string>, unmatched:string[], skipped:string[]}}
 */
function declaredExemptions(ctx) {
  return ctx.memo("exemptions", () => resolveExemptions(ctx));
}

function resolveExemptions(ctx) {
  const source = GUARDRAIL_FILES.find((f) => ctx.exists(f)) ?? null;
  const refs = [];
  if (source) {
    const seen = new Set();
    let sectionLevel = 0;
    for (const block of guardrailBlocks(ctx.read(source))) {
      if (block.heading) {
        if (sectionLevel && block.heading <= sectionLevel) sectionLevel = 0;
        if (exemptionStart(block.text) !== -1) sectionLevel = block.heading;
        continue;
      }
      let scope = null;
      if (sectionLevel) scope = block.text;
      else {
        const at = exemptionStart(block.text);
        if (at !== -1) scope = block.text.slice(at);
      }
      if (scope === null) continue;
      for (const ref of fileRefs(scope)) {
        if (seen.has(ref)) continue;
        seen.add(ref);
        refs.push({ ref, line: block.line });
      }
    }
  }

  const auditedRels = new Set(ctx.audited.map((f) => f.rel));
  const exemptFiles = new Set();
  const unmatched = [];
  const skipped = [];
  const work = { steps: 0 };
  for (const [n, r] of refs.entries()) {
    r.audited = [];
    r.outside = [];
    if (n >= MAX_REFS) { skipped.push(r.ref); continue; }
    const test = refMatcher(r.ref, work);
    let ran = true;
    if (test) {
      for (const f of ctx.census) {
        if (work.steps > MATCH_BUDGET) { ran = false; break; }
        if (!test(f.rel)) continue;
        (auditedRels.has(f.rel) ? r.audited : r.outside).push(f.rel);
      }
    }
    if (!ran) {
      r.audited = [];
      r.outside = [];
      skipped.push(r.ref);
      continue;
    }
    // a reference that resolves to the token source names the token source and nothing else
    // (two apps that each have a globals.css must not both become exempt because one is the source)
    if (test && ctx.tokenSource.rel && test(ctx.tokenSource.rel)) {
      r.audited = [];
      r.outside = [ctx.tokenSource.rel];
    }
    for (const rel of r.audited) exemptFiles.add(rel);
    if (!r.audited.length && !r.outside.length) unmatched.push(r.ref);
  }
  if (skipped.length) {
    ctx.warn(`${source}: ${skipped.length} exemption reference(s) were not resolved (limit ${MAX_REFS} references and ${MATCH_BUDGET} glob comparisons per run); files they name are NOT treated as exempt`);
  }
  const result = { source, refs, exemptFiles, unmatched, skipped };
  return result;
}

/** The `detail` rows describing the declared exemptions (shared by typography.exempt.files and scale). */
function exemptionDetail(ex) {
  return {
    source: ex.source,
    declared: cap(ex.refs.map((r) => ({
      reference: r.ref,
      line: r.line,
      auditedFiles: cap(r.audited, 10),
      alreadyOutsideAudit: cap(r.outside, 10),
    })), 50),
    files: cap([...ex.exemptFiles].sort(byString), 50),
    unmatched: cap([...ex.unmatched].sort(byString), 50),
    skippedCount: ex.skipped.length,
    skipped: cap(ex.skipped, 50),
  };
}

/** in-ui/ and exempt split of a { file → count } map. */
function scopeSplit(counts, ex) {
  let inUi = 0;
  let inExempt = 0;
  const total = sum(counts);
  const exemptHit = [];
  for (const [file, n] of counts) {
    if (UI_DIR_RE.test(file)) inUi += n;
    if (ex.exemptFiles.has(file)) { inExempt += n; exemptHit.push(file); }
  }
  const out = { ui: { pattern: UI_DIR_RE.source, inUi, outsideUi: total - inUi } };
  if (ex.exemptFiles.size) out.exempt = { files: exemptHit.sort(byString), inExemptFiles: inExempt, excludingExemptFiles: total - inExempt };
  return out;
}

/** Counts of a { file → count } map with the declared-exempt files removed. */
function withoutExempt(counts, ex) {
  const kept = new Map();
  for (const [file, n] of counts) if (!ex.exemptFiles.has(file)) kept.set(file, n);
  return kept;
}

module.exports = {
  BACKTICK_RE,
  EXEMPT_WORD_RE,
  MATCH_BUDGET,
  MAX_REFS,
  UI_DIR_RE,
  declaredExemptions,
  exemptionDetail,
  scopeSplit,
  withoutExempt,
};
