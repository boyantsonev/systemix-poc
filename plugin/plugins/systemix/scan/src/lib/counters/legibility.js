"use strict";

/**
 * legibility.js — agent legibility: what a coding agent can read at the root of
 * the repo to know how to work in it, and whether that reading still holds.
 * Facts only (does the file exist, how long, which paths it points at, which
 * skills it names, how old its dates are); whether it is *good* is not decided.
 *
 * Root instruction files (pinned): CLAUDE.md, AGENTS.md, .cursor/rules (a file,
 * or a directory of .mdc/.md/.mdx rule files) and .github/copilot-instructions.md.
 * Only the repo root is read; nested CLAUDE.md files are not. Names are matched
 * exactly (on a case-insensitive filesystem `claude.md` also satisfies CLAUDE.md).
 *
 * Text rules (pinned):
 *   • lines   = what `wc -l` counts (a last line without "\n" still counts)
 *   • headings = Markdown ATX headings (`#`..`######` + space) outside fenced
 *     code blocks and outside a leading YAML front-matter block; setext headings
 *     are not counted
 *   • "guardrails" mentions are case-INsensitive substring matches
 *   • ages are calendar days (UTC dates) to the HEAD commit date, never to today
 *   • "posthog" is counted two ways because the case rule changes the answer:
 *     case-insensitive (PostHog, POSTHOG_KEY, posthog-js) and lowercase-only
 *
 * Counter ids (API — keep stable). <f> is one of claude_md, agents_md,
 * cursor_rules, copilot_instructions:
 *   legibility.<f>.exists | .lines | .headings
 *   legibility.instructions.present          how many of the four exist
 *   legibility.instructions.imports          distinct solo-line `@path` imports
 *   legibility.guardrails.mentions | .files_mentioning
 *   legibility.machine_paths.matches         ~/ /Users/ /home/ references
 *   legibility.path_refs.distinct | .resolved | .unresolved   repo-relative pointers
 *   legibility.skills.slash_tokens_named | .named_with_skill_md_in_repo |
 *     .named_installed | .installed | .skill_dirs | .skill_md_in_repo
 *   legibility.freshness.newest_iso_date | .newest_iso_date_age_days |
 *     .status_heading_date | .status_heading_age_days
 *   legibility.config.exists | .top_level_keys | .autonomy | .self_improvement_mode |
 *     .design_block | .signals_enabled | .posthog_signal_enabled
 *   legibility.posthog.dependency_declared | .files_any_case | .files_lowercase
 *
 * Nothing here executes anything, and nothing reads through a symlink that
 * leaves the repo (the context refuses it, see context.js): an instruction file, rules
 * directory, config or skills directory that resolves outside the repo reads as
 * absent, with a note. A symlink that stays inside the repo (CLAUDE.md ->
 * AGENTS.md) is read normally. The posthog counters read the census files as the
 * context lists them (a symlinked audited dir is flagged by census.files.total).
 *
 * The repo-wide SKILL.md walk skips node_modules, .git, .next, dist, build, out
 * and coverage (the context's walk) plus .claude/worktrees (Claude Code's
 * per-task checkouts, each a full copy of the repo) and the dependency/build
 * directories vendor, .venv, venv, target, .yarn, .turbo and .vercel, so the
 * number does not move with the number of local worktrees. How many SKILL.md
 * files the skip list removed, and where the rest live, is in detail.
 */

const path = require("path");
const { counter, byString } = require("./counter");
const { cap, isPlainObject, isoDay, isoToMs, sortedList, trimTrailing, utcDay } = require("./util");

const GROUP = "legibility";
const FILES = [
  { key: "claude_md", label: "CLAUDE.md", rel: "CLAUDE.md", rules: false },
  { key: "agents_md", label: "AGENTS.md", rel: "AGENTS.md", rules: false },
  { key: "cursor_rules", label: ".cursor/rules", rel: ".cursor/rules", rules: true },
  { key: "copilot_instructions", label: ".github/copilot-instructions.md", rel: ".github/copilot-instructions.md", rules: false },
];
const RULE_EXTS = [".mdc", ".md", ".mdx"];
const LIST_CAP = 50;
const LINE_CAP = 20;

const FENCE_RE = /^ {0,3}(`{3,}|~{3,})/;
const HEADING_RE = /^ {0,3}#{1,6}(?=[ \t]|$)/;
const FRONT_MATTER_KEY_RE = /^[A-Za-z_][\w-]*[ \t]*:/;
const GUARDRAILS_RE = /guardrails/gi;
const MACHINE_PATH_RE = /(?<![\w./~-])(?:~|\/Users|\/home)\/[^\s"'`<>()[\]{},;]+/g;
const DATE_RE = /(?<![\w-])(\d{4}-\d{2}-\d{2})(?![\d-])/g;
const STATUS_RE = /\bstatus\b/i;
const CODE_SPAN_RE = /`([^`\n]{1,200})`/g;
const SLASH_TOKEN_RE = /^\/([a-z][a-z0-9-]{0,60})(?:[ \t].*)?$/;
const LINK_RE = /\[[^\]\n]{0,120}\]\(\s*<?([^)\s>]{1,300})>?(?:\s+"[^"\n]*")?\s*\)/g;
const IMPORT_RE = /^@([\w./~-]+)[ \t]*$/;
const PATH_CHARS_RE = /^[\w.@()[\]/-]+$/;
const HOSTLIKE_RE = /^(?:[a-z0-9-]+\.)+[a-z]{2,}$/i;
const SCHEME_RE = /^[a-z][a-z0-9+.-]*:/i;
const POSTHOG_ANY_RE = /posthog/gi;
const POSTHOG_LOWER_RE = /posthog/g;
const SKILL_NAME_RE = /^\.claude\/skills\/([^/]+)\/SKILL\.md$/;
const SKILL_WALK_SKIP = new Set(["vendor", ".venv", "venv", "target", ".yarn", ".turbo", ".vercel"]);
const SKILL_WALK_SKIP_TEXT = ".claude/worktrees, vendor, .venv, venv, target, .yarn, .turbo, .vercel";


// ── markdown ────────────────────────────────────────────────────────────────

/**
 * The lines that are prose: outside fenced code blocks and outside a leading
 * YAML front-matter block. Each keeps its 1-based line number.
 */
function proseLines(text) {
  const lines = text.split("\n");
  const out = [];
  let i = 0;
  if (lines[0] !== undefined && lines[0].trimEnd() === "---") {
    const end = lines.findIndex((l, idx) => idx > 0 && idx <= 40 && l.trimEnd() === "---");
    const firstBody = end > 1 ? lines.slice(1, end).find((l) => l.trim() !== "") : undefined;
    if (end !== -1 && firstBody !== undefined && FRONT_MATTER_KEY_RE.test(firstBody)) i = end + 1;
  }
  let fence = null;
  for (; i < lines.length; i++) {
    const line = lines[i];
    const m = FENCE_RE.exec(line);
    if (fence) {
      if (m && m[1][0] === fence.ch && m[1].length >= fence.len && line.slice(m[0].length).trim() === "") fence = null;
      continue;
    }
    if (m) { fence = { ch: m[1][0], len: m[1].length }; continue; }
    out.push({ no: i + 1, text: line });
  }
  return out;
}

// ── instruction files ───────────────────────────────────────────────────────

function gather(ctx, spec) {
  let rels = [];
  if (spec.rules) {
    if (ctx.isDirectory(spec.rel)) rels = ctx.listTree(spec.rel, { exts: RULE_EXTS }).map((f) => f.rel);
    else if (ctx.exists(spec.rel)) rels = [spec.rel];
  } else if (ctx.exists(spec.rel) && !ctx.isDirectory(spec.rel)) {
    rels = [spec.rel];
  }
  return rels.map((rel) => {
    const text = ctx.read(rel);
    return { rel, text, lines: text.split("\n"), prose: proseLines(text) };
  });
}

/** True when a repo-relative SKILL.md path sits under .claude/worktrees or a dependency/build directory. */
function inSkippedSkillDir(rel) {
  const segs = rel.split("/");
  for (let i = 0; i < segs.length - 1; i++) {
    if (SKILL_WALK_SKIP.has(segs[i])) return true;
    if (segs[i] === ".claude" && segs[i + 1] === "worktrees" && i + 1 < segs.length - 1) return true;
  }
  return false;
}

/** Per-line regex scan: [{no, match}] for every hit of the global `re`. */
function scanLines(lines, re) {
  const hits = [];
  for (let i = 0; i < lines.length; i++) {
    for (const m of lines[i].matchAll(re)) hits.push({ no: i + 1, match: m[0], groups: m.slice(1) });
  }
  return hits;
}

/** A repo-relative path pointer in `raw` (an inline-code span), or null when it is not path-shaped. */
function pointerOf(ctx, raw) {
  let t = raw.trim();
  if (!t || t.length > 200 || !PATH_CHARS_RE.test(t)) return null;
  t = t.replace(/^\.\//, "");
  if (t.startsWith("/") || t.startsWith("@") || !t.includes("/")) return null;
  const last = t.replace(/\/+$/, "").split("/").pop();
  if (!(t.endsWith("/") || /\.[A-Za-z0-9]{1,8}$/.test(last))) return null;
  const first = t.split("/")[0];
  if (HOSTLIKE_RE.test(first) && !ctx.exists(first)) return null;
  return t;
}

/** Repo-relative, normalised, no trailing slash; null when it climbs out of the repo. */
function normaliseInRepo(rel) {
  const n = path.posix.normalize(rel).replace(/\/+$/, "");
  if (!n || n === "." || n === ".." || n.startsWith("../")) return null;
  return n;
}

function decode(s) {
  try { return decodeURIComponent(s); } catch { return s; }
}

function run(ctx) {
  const out = [];
  const headMs = isoToMs(ctx.git && ctx.git.commitDate);
  const headDay = headMs === null ? null : utcDay(headMs);
  const noGitNote = "no git history, so there is no HEAD commit date to measure an age against (today's date is never used)";

  const found = FILES.map((spec) => ({ spec, files: gather(ctx, spec) }));
  const allFiles = found.flatMap((f) => f.files);

  // ── per instruction file: exists / lines / headings ──
  for (const { spec, files } of found) {
    const present = files.length > 0;
    const lines = files.reduce((n, f) => n + ctx.lineCount(f.text), 0);
    const headings = files.reduce((n, f) => n + f.prose.filter((l) => HEADING_RE.test(l.text)).length, 0);
    const where = spec.rules ? ".cursor/rules (a file, or every .mdc/.md/.mdx file under the directory)" : spec.rel;
    const left = ctx.leftRepoNotes([spec.rel]);
    const absent = present ? undefined : [left.length ? `${spec.label} is a symlink that resolves outside the repo and was ignored` : `${spec.label} not present`];
    const unread = present && lines === 0 ? [`${spec.label} is empty or over the 5 MB read limit (see warnings)`] : undefined;
    out.push(counter({
      id: `legibility.${spec.key}.exists`,
      group: GROUP,
      kind: "presence",
      unit: "boolean",
      value: present,
      definition: { summary: `${spec.label} exists at the repo root${spec.rules ? " (a directory counts only when it holds at least one rule file)" : ""}. A symlink that resolves outside the repo reads as absent`, regex: null, fileSet: where },
      detail: spec.rules ? { files: cap(files.map((f) => f.rel), LIST_CAP) } : undefined,
      notes: left.length ? [`${spec.label} is a symlink that resolves outside the repo and was ignored`] : undefined,
    }));
    out.push(counter({
      id: `legibility.${spec.key}.lines`,
      group: GROUP,
      kind: "mechanical",
      unit: "line",
      value: lines,
      definition: { summary: `Lines in ${spec.label} (\`wc -l\` rule: a last line without a newline still counts)`, regex: null, fileSet: where },
      perFile: new Map(files.map((f) => [f.rel, ctx.lineCount(f.text)])),
      notes: absent ?? unread,
    }));
    out.push(counter({
      id: `legibility.${spec.key}.headings`,
      group: GROUP,
      kind: "mechanical",
      unit: "line",
      value: headings,
      definition: {
        summary: `Markdown ATX headings in ${spec.label}, outside fenced code blocks and front matter; setext (underlined) headings are not counted`,
        regex: HEADING_RE,
        fileSet: where,
      },
      perFile: new Map(files.map((f) => [f.rel, f.prose.filter((l) => HEADING_RE.test(l.text)).length])),
      notes: absent,
    }));
  }
  out.push(counter({
    id: "legibility.instructions.present",
    group: GROUP,
    kind: "mechanical",
    unit: "number",
    value: found.filter((f) => f.files.length > 0).length,
    definition: { summary: "How many of the four root instruction files exist (CLAUDE.md, AGENTS.md, .cursor/rules, .github/copilot-instructions.md)", regex: null, fileSet: "the repo root" },
    detail: { present: found.filter((f) => f.files.length > 0).map((f) => f.spec.label) },
  }));

  // ── @path imports (solo lines, as in a CLAUDE.md that is just "@AGENTS.md") ──
  const imports = new Map();
  for (const f of allFiles) {
    for (const l of f.prose) {
      const m = IMPORT_RE.exec(l.text.trim());
      if (!m || !/[./]/.test(m[1])) continue; // "@username" alone is a mention, not an import
      const inRepo = !m[1].startsWith("/") && !m[1].startsWith("~");
      const target = inRepo ? normaliseInRepo(path.posix.join(path.posix.dirname(f.rel), m[1])) : null;
      imports.set(target ?? m[1], target !== null && ctx.exists(target));
    }
  }
  out.push(counter({
    id: "legibility.instructions.imports",
    group: GROUP,
    kind: "mechanical",
    unit: "distinct",
    value: imports.size,
    definition: {
      summary: "Distinct targets of `@path` import lines (a line that is only @path), resolved relative to the file that holds them",
      regex: IMPORT_RE,
      fileSet: "the root instruction files, outside code fences",
    },
    detail: {
      resolved: cap(sortedList([...imports].filter(([, ok]) => ok).map(([k]) => k)), LIST_CAP),
      unresolved: cap(sortedList([...imports].filter(([, ok]) => !ok).map(([k]) => k)), LIST_CAP),
    },
  }));

  // ── guardrails mentions ──
  const gMentions = new Map();
  const gLines = {};
  for (const f of allFiles) {
    const hits = scanLines(f.lines, GUARDRAILS_RE);
    if (!hits.length) continue;
    gMentions.set(f.rel, hits.length);
    gLines[f.rel] = [...new Set(hits.map((h) => h.no))].slice(0, LINE_CAP);
  }
  const gTotal = [...gMentions.values()].reduce((a, b) => a + b, 0);
  out.push(counter({
    id: "legibility.guardrails.mentions",
    group: GROUP,
    kind: "mechanical",
    unit: "match",
    value: gTotal,
    definition: {
      summary: "Case-insensitive occurrences of \"guardrails\" in the root instruction files. A mention is not an instruction: read the listed lines to see whether the file tells the agent to read the guardrails before UI work",
      regex: GUARDRAILS_RE,
      fileSet: "the root instruction files",
    },
    perFile: gMentions,
    detail: { lines: gLines },
    notes: allFiles.length ? undefined : ["no root instruction file present"],
  }));
  out.push(counter({
    id: "legibility.guardrails.files_mentioning",
    group: GROUP,
    kind: "mechanical",
    unit: "file",
    value: gMentions.size,
    definition: { summary: "Root instruction files that mention \"guardrails\" at least once (case-insensitive); perFile count = mentions in the file", regex: GUARDRAILS_RE, fileSet: "the root instruction files" },
    perFile: gMentions,
    notes: allFiles.length ? undefined : ["no root instruction file present"],
  }));

  // ── machine-local paths ──
  const machine = new Map();
  const machineLines = {};
  const byPrefix = { "/Users/": 0, "/home/": 0, "~/": 0 };
  const distinctPaths = new Set();
  for (const f of allFiles) {
    const hits = scanLines(f.lines, MACHINE_PATH_RE);
    if (!hits.length) continue;
    machine.set(f.rel, hits.length);
    machineLines[f.rel] = [...new Set(hits.map((h) => h.no))].slice(0, LINE_CAP);
    for (const h of hits) {
      const p = trimTrailing(h.match, ".:!?");
      distinctPaths.add(p);
      byPrefix[p.startsWith("~/") ? "~/" : p.startsWith("/Users/") ? "/Users/" : "/home/"]++;
    }
  }
  out.push(counter({
    id: "legibility.machine_paths.matches",
    group: GROUP,
    kind: "mechanical",
    unit: "match",
    value: [...machine.values()].reduce((a, b) => a + b, 0),
    definition: {
      summary: "References that start with ~/, /Users/ or /home/: paths that resolve on one person's machine, not in a fresh checkout. Whole text including code fences. A ~/ path may still be valid everywhere (e.g. ~/.claude/settings.json); that call is the reader's",
      regex: MACHINE_PATH_RE,
      fileSet: "the root instruction files",
    },
    perFile: machine,
    detail: { byPrefix, distinct: distinctPaths.size, lines: machineLines },
    notes: ["C:\\Users\\ style Windows paths and $HOME are not matched"],
  }));

  // ── repo-relative pointers ──
  const pointers = new Map();
  for (const f of allFiles) {
    const baseDir = path.posix.dirname(f.rel);
    for (const l of f.prose) {
      for (const m of l.text.includes("`") ? l.text.matchAll(CODE_SPAN_RE) : []) {
        const t = pointerOf(ctx, m[1]);
        if (!t) continue;
        const key = normaliseInRepo(t) ?? t.replace(/\/+$/, "");
        pointers.set(key, key.startsWith("../") ? false : ctx.exists(key));
      }
      for (const m of l.text.includes("](") ? l.text.matchAll(LINK_RE) : []) {
        let target = decode(m[1]).split(/[#?]/)[0];
        if (!target || SCHEME_RE.test(target) || target.startsWith("/") || target.startsWith("~")) continue;
        target = path.posix.join(baseDir, target);
        const key = normaliseInRepo(target) ?? target.replace(/\/+$/, "");
        pointers.set(key, key.startsWith("../") ? false : ctx.exists(key));
      }
    }
  }
  const resolved = sortedList([...pointers].filter(([, ok]) => ok).map(([k]) => k));
  const unresolved = sortedList([...pointers].filter(([, ok]) => !ok).map(([k]) => k));
  const pointerSet = "the root instruction files, outside code fences";
  const pointerRule =
    "inline-code spans made only of path characters with a \"/\" and either a trailing \"/\" or a file extension (no leading / or @, no URL-looking first segment) resolved from the repo root, plus relative markdown link targets resolved from the file's own directory";
  out.push(counter({
    id: "legibility.path_refs.distinct",
    group: GROUP,
    kind: "mechanical",
    unit: "distinct",
    value: pointers.size,
    definition: { summary: `Distinct repo-relative path pointers: ${pointerRule}`, regexes: [{ label: "a `code span`", regex: CODE_SPAN_RE }, { label: "its text must be path-shaped", regex: PATH_CHARS_RE }, { label: "or a markdown link", regex: LINK_RE }], fileSet: pointerSet },
    notes: ["bare file names (DESIGN.md) and directory names without a slash are not path-shaped, so they are not counted"],
  }));
  out.push(counter({
    id: "legibility.path_refs.resolved",
    group: GROUP,
    kind: "mechanical",
    unit: "distinct",
    value: resolved.length,
    definition: { summary: "Pointers (see legibility.path_refs.distinct) whose target exists in the working tree", regex: null, fileSet: pointerSet },
    detail: { paths: cap(resolved, LIST_CAP), total: resolved.length },
  }));
  out.push(counter({
    id: "legibility.path_refs.unresolved",
    group: GROUP,
    kind: "mechanical",
    unit: "distinct",
    value: unresolved.length,
    definition: { summary: "Pointers (see legibility.path_refs.distinct) whose target does not exist in the working tree, or that climb out of the repo with ../", regex: null, fileSet: pointerSet },
    detail: { paths: cap(unresolved, LIST_CAP), total: unresolved.length },
    notes: [
      "a path to a generated or git-ignored file that only exists after a build reads as unresolved",
      "inline-code pointers resolve from the repo root, so a short name that is relative to another directory (e.g. goals/ meant as design/goals/) reads as unresolved",
    ],
  }));

  // ── skills: named in the instructions vs installed ──
  const named = new Set();
  for (const f of allFiles) {
    for (const l of f.prose) {
      for (const m of l.text.includes("`") ? l.text.matchAll(CODE_SPAN_RE) : []) {
        const s = SLASH_TOKEN_RE.exec(m[1].trim());
        if (s) named.add(s[1]);
      }
    }
  }
  const skillTree = ctx.listTree(".claude/skills");
  const installed = new Set();
  const skillDirs = new Set();
  for (const f of skillTree) {
    const parts = f.rel.split("/");
    if (parts.length > 3) skillDirs.add(parts[2]);
    const m = SKILL_NAME_RE.exec(f.rel);
    if (m) { installed.add(m[1]); skillDirs.add(m[1]); }
  }
  const skillMdWalked = ctx.listTree(".", { exts: [".md"] }).filter((f) => path.posix.basename(f.rel) === "SKILL.md");
  const skillMdAnywhere = skillMdWalked.filter((f) => !inSkippedSkillDir(f.rel));
  const skillMdSkipped = skillMdWalked.length - skillMdAnywhere.length;
  const skillMdByTopDir = new Map();
  for (const f of skillMdAnywhere) {
    const top = f.rel.includes("/") ? f.rel.slice(0, f.rel.indexOf("/")) : "(root)";
    skillMdByTopDir.set(top, (skillMdByTopDir.get(top) ?? 0) + 1);
  }
  const skillNamesAnywhere = new Set(skillMdAnywhere.map((f) => path.posix.basename(path.posix.dirname(f.rel))));
  const namedSorted = sortedList(named);
  const namedInRepo = namedSorted.filter((n) => skillNamesAnywhere.has(n));
  const namedInstalled = namedSorted.filter((n) => installed.has(n));
  const namedNotInstalled = namedInRepo.filter((n) => !installed.has(n));
  const tokenRule = "`/name` inline-code spans in the root instruction files (name = lowercase letters, digits, hyphens; optional arguments after a space)";
  out.push(counter({
    id: "legibility.skills.slash_tokens_named",
    group: GROUP,
    kind: "mechanical",
    unit: "distinct",
    value: named.size,
    definition: { summary: `Distinct slash-command names written as ${tokenRule}. Includes built-ins (/clear) and site routes (/docs) that are not skills`, regexes: [{ label: "a `code span`", regex: CODE_SPAN_RE }, { label: "whose text starts with /name", regex: SLASH_TOKEN_RE }], fileSet: "the root instruction files, outside code fences" },
    detail: { names: cap(namedSorted, LIST_CAP) },
    notes: ["prose mentions outside backticks, plugin-namespaced names (/plugin:skill) and multi-segment routes (/for/x) are not matched"],
  }));
  out.push(counter({
    id: "legibility.skills.named_with_skill_md_in_repo",
    group: GROUP,
    kind: "mechanical",
    unit: "distinct",
    value: namedInRepo.length,
    definition: { summary: "Named slash tokens for which a <name>/SKILL.md exists somewhere in the repo (installed or shipped as a template): the tokens that are demonstrably skills", regex: null, fileSet: `every SKILL.md in the repo, found by a walk that skips node_modules, .git, .next, dist, build, out, coverage, ${SKILL_WALK_SKIP_TEXT}` },
    detail: { names: cap(namedInRepo, LIST_CAP), notInstalled: cap(namedNotInstalled, LIST_CAP) },
  }));
  out.push(counter({
    id: "legibility.skills.named_installed",
    group: GROUP,
    kind: "mechanical",
    unit: "distinct",
    value: namedInstalled.length,
    definition: { summary: "Named slash tokens with .claude/skills/<name>/SKILL.md installed in this repo", regex: SKILL_NAME_RE, fileSet: ".claude/skills/" },
    detail: { names: cap(namedInstalled, LIST_CAP) },
    notes: ["skills installed per-user (~/.claude/skills) or by a plugin are invisible to the repo and not counted"],
  }));
  out.push(counter({
    id: "legibility.skills.installed",
    group: GROUP,
    kind: "mechanical",
    unit: "file",
    value: installed.size,
    definition: { summary: "SKILL.md files exactly one directory below .claude/skills/ (the layout Claude Code discovers)", regex: SKILL_NAME_RE, fileSet: ".claude/skills/" },
    perFile: new Map([...installed].map((name) => [`.claude/skills/${name}/SKILL.md`, 1])),
    detail: { names: cap(sortedList(installed), LIST_CAP) },
  }));
  out.push(counter({
    id: "legibility.skills.skill_dirs",
    group: GROUP,
    kind: "mechanical",
    unit: "distinct",
    value: skillDirs.size,
    definition: { summary: "Directories directly under .claude/skills/ that hold at least one file, with or without a SKILL.md", regex: null, fileSet: ".claude/skills/" },
    detail: { names: cap(sortedList(skillDirs), LIST_CAP) },
  }));
  out.push(counter({
    id: "legibility.skills.skill_md_in_repo",
    group: GROUP,
    kind: "mechanical",
    unit: "file",
    value: skillMdAnywhere.length,
    definition: { summary: "Every SKILL.md in the repo: installed skills plus templates a package ships. Copies in Claude Code worktrees and in dependency/build directories are not counted", regex: null, fileSet: `the whole repo; node_modules, .git, .next, dist, build, out, coverage, ${SKILL_WALK_SKIP_TEXT} are skipped, other dot-directories are included` },
    perFile: new Map(skillMdAnywhere.map((f) => [f.rel, 1])),
    detail: {
      installedUnderClaudeSkills: skillMdAnywhere.filter((f) => f.rel.startsWith(".claude/skills/")).length,
      skippedBySkipList: skillMdSkipped,
      byTopDir: Object.fromEntries([...skillMdByTopDir].sort((a, b) => byString(a[0], b[0]))),
    },
    notes: skillMdSkipped ? [`${skillMdSkipped} more SKILL.md file(s) sit under ${SKILL_WALK_SKIP_TEXT} and are not counted`] : undefined,
  }));

  // ── freshness: ISO dates vs HEAD ──
  const perFileNewest = new Map();
  const perFileStatus = new Map();
  let datesAfterHead = 0;
  let newestMs = null;
  let statusMs = null;
  for (const f of allFiles) {
    let fileNewest = null;
    for (const h of scanLines(f.lines, DATE_RE)) {
      const ms = isoToMs(h.groups[0]);
      if (ms === null) continue;
      if (fileNewest === null || ms > fileNewest) fileNewest = ms;
      if (headMs !== null && utcDay(ms) > headDay) datesAfterHead++;
    }
    let fileStatus = null;
    for (const l of f.prose) {
      if (!HEADING_RE.test(l.text) || !STATUS_RE.test(l.text)) continue;
      for (const m of l.text.matchAll(DATE_RE)) {
        const ms = isoToMs(m[1]);
        if (ms !== null && (fileStatus === null || ms > fileStatus)) fileStatus = ms;
      }
    }
    perFileNewest.set(f.rel, fileNewest);
    perFileStatus.set(f.rel, fileStatus);
    if (fileNewest !== null && (newestMs === null || fileNewest > newestMs)) newestMs = fileNewest;
    if (fileStatus !== null && (statusMs === null || fileStatus > statusMs)) statusMs = fileStatus;
  }
  const dayOf = (ms) => (ms === null ? null : isoDay(ms));
  const byFile = (map) => Object.fromEntries(sortedList(map.keys()).map((k) => [k, dayOf(map.get(k))]));
  const dateRule = "valid YYYY-MM-DD dates (year 1900 or later) not glued to other word characters or hyphens";
  const ageOf = (ms) => (ms !== null && headDay !== null ? headDay - utcDay(ms) : null);
  const ageNotes = (ms, what) => {
    const n = [];
    if (!allFiles.length) n.push("no root instruction file present");
    else if (ms === null) n.push(what);
    else if (headDay === null) n.push(noGitNote);
    return n.length ? n : undefined;
  };
  out.push(counter({
    id: "legibility.freshness.newest_iso_date",
    group: GROUP,
    kind: "mechanical",
    unit: "date",
    value: dayOf(newestMs),
    definition: { summary: `The newest ISO date (${dateRule}) anywhere in the root instruction files, whole text`, regex: DATE_RE, fileSet: "the root instruction files" },
    detail: { byFile: byFile(perFileNewest) },
    notes: ageNotes(newestMs, "no ISO date in any root instruction file"),
  }));
  out.push(counter({
    id: "legibility.freshness.newest_iso_date_age_days",
    group: GROUP,
    kind: "mechanical",
    unit: "number",
    value: ageOf(newestMs),
    definition: { summary: "Calendar days (UTC dates) from the newest ISO date in the instruction files to the HEAD commit date. Negative when the newest date is in the future of HEAD, e.g. a planned date", regex: DATE_RE, fileSet: "the root instruction files + git HEAD commit date" },
    detail: { datesAfterHead, headCommitDay: headMs === null ? null : isoDay(headMs) },
    notes: ageNotes(newestMs, "no ISO date in any root instruction file"),
  }));
  out.push(counter({
    id: "legibility.freshness.status_heading_date",
    group: GROUP,
    kind: "mechanical",
    unit: "date",
    value: dayOf(statusMs),
    definition: { summary: "The newest ISO date inside a Markdown heading whose text contains the word \"status\" (case-insensitive), e.g. \"## Current Status (2026-07-09)\"", regexes: [{ label: "the word status in a heading", regex: STATUS_RE }, { label: "an ISO date in that heading", regex: DATE_RE }], fileSet: "the root instruction files, headings outside code fences" },
    detail: { byFile: byFile(perFileStatus) },
    notes: ageNotes(statusMs, "no status heading carries an ISO date"),
  }));
  out.push(counter({
    id: "legibility.freshness.status_heading_age_days",
    group: GROUP,
    kind: "mechanical",
    unit: "number",
    value: ageOf(statusMs),
    definition: { summary: "Calendar days (UTC dates) from the status-heading date to the HEAD commit date", regexes: [{ label: "the word status in a heading", regex: STATUS_RE }, { label: "an ISO date in that heading", regex: DATE_RE }], fileSet: "the root instruction files + git HEAD commit date" },
    detail: { headCommitDay: headMs === null ? null : isoDay(headMs) },
    notes: ageNotes(statusMs, "no status heading carries an ISO date"),
  }));

  // ── systemix.config.yaml ──
  const cfgExists = ctx.exists("systemix.config.yaml");
  const cfg = ctx.config();
  const cfgObj = isPlainObject(cfg) ? cfg : {};
  const cfgNote = !cfgExists ? [ctx.leftRepoNotes(["systemix.config.yaml"])[0] ?? "no systemix.config.yaml"] : !cfg ? ["systemix.config.yaml could not be parsed"] : undefined;
  const cfgSet = "systemix.config.yaml";
  const hermes = isPlainObject(cfgObj.hermes) ? cfgObj.hermes : {};
  const trust = isPlainObject(cfgObj.trust) ? cfgObj.trust : {};
  let autonomy = null;
  let autonomySource = null;
  if (typeof hermes.autonomy === "string" && hermes.autonomy) { autonomy = hermes.autonomy; autonomySource = "hermes.autonomy"; }
  else if (typeof cfgObj.autonomy === "string" && cfgObj.autonomy) { autonomy = cfgObj.autonomy; autonomySource = "autonomy"; }
  const tier = (v) => (typeof v === "number" && Number.isFinite(v) ? v : null);
  const selfMode = isPlainObject(cfgObj.self_improvement) && typeof cfgObj.self_improvement.mode === "string" ? cfgObj.self_improvement.mode : null;
  const signals = isPlainObject(cfgObj.signals) ? cfgObj.signals : {};
  const enabled = [];
  const disabled = [];
  for (const k of sortedList(Object.keys(signals))) {
    if (!isPlainObject(signals[k])) continue;
    if (signals[k].enabled === true) enabled.push(k);
    else if (signals[k].enabled === false) disabled.push(k);
  }
  const posthogSignal = isPlainObject(signals.posthog) && signals.posthog.enabled === true;
  const designBlock = Object.prototype.hasOwnProperty.call(cfgObj, "design") && cfgObj.design !== null && cfgObj.design !== "";
  out.push(counter({
    id: "legibility.config.exists",
    group: GROUP,
    kind: "presence",
    unit: "boolean",
    value: cfgExists,
    definition: { summary: "systemix.config.yaml exists at the repo root", regex: null, fileSet: cfgSet },
  }));
  out.push(counter({
    id: "legibility.config.top_level_keys",
    group: GROUP,
    kind: "mechanical",
    unit: "distinct",
    value: Object.keys(cfgObj).length,
    definition: { summary: "Top-level keys of systemix.config.yaml", regex: null, fileSet: cfgSet },
    detail: { keys: cap(sortedList(Object.keys(cfgObj)), LIST_CAP) },
    notes: cfgNote,
  }));
  out.push(counter({
    id: "legibility.config.autonomy",
    group: GROUP,
    kind: "mechanical",
    unit: "string",
    value: autonomy,
    definition: { summary: "The autonomy dial: hermes.autonomy, else a top-level autonomy", regex: null, fileSet: cfgSet },
    detail: { source: autonomySource, orchestratorTier: tier(trust.orchestrator_tier), hermesTier: tier(trust.hermes_tier) },
    notes: cfgNote ?? (autonomy === null ? ["no autonomy key (hermes.autonomy or autonomy)"] : undefined),
  }));
  out.push(counter({
    id: "legibility.config.self_improvement_mode",
    group: GROUP,
    kind: "mechanical",
    unit: "string",
    value: selfMode,
    definition: { summary: "self_improvement.mode", regex: null, fileSet: cfgSet },
    notes: cfgNote ?? (selfMode === null ? ["self_improvement.mode is not set"] : undefined),
  }));
  out.push(counter({
    id: "legibility.config.design_block",
    group: GROUP,
    kind: "presence",
    unit: "boolean",
    value: designBlock,
    definition: { summary: "A non-empty `design:` key (block or scalar) is present", regex: null, fileSet: cfgSet },
    notes: cfgNote,
  }));
  out.push(counter({
    id: "legibility.config.signals_enabled",
    group: GROUP,
    kind: "mechanical",
    unit: "distinct",
    value: enabled.length,
    definition: { summary: "Entries under `signals:` with `enabled: true`", regex: null, fileSet: cfgSet },
    detail: { enabled, disabled },
    notes: cfgNote,
  }));
  out.push(counter({
    id: "legibility.config.posthog_signal_enabled",
    group: GROUP,
    kind: "presence",
    unit: "boolean",
    value: posthogSignal,
    definition: { summary: "signals.posthog.enabled is true", regex: null, fileSet: cfgSet },
    notes: cfgNote,
  }));

  // ── posthog ──
  const pkg = ctx.readJson("package.json");
  const phDeps = {};
  if (isPlainObject(pkg)) {
    for (const section of ["dependencies", "devDependencies", "peerDependencies", "optionalDependencies"]) {
      if (!isPlainObject(pkg[section])) continue;
      for (const name of Object.keys(pkg[section])) {
        if (/posthog/i.test(name) && typeof pkg[section][name] === "string") phDeps[`${section}:${name}`] = pkg[section][name];
      }
    }
  }
  const phNames = sortedList(Object.keys(phDeps));
  out.push(counter({
    id: "legibility.posthog.dependency_declared",
    group: GROUP,
    kind: "presence",
    unit: "boolean",
    value: phNames.length > 0,
    definition: { summary: "A dependency whose name contains \"posthog\" (case-insensitive) in dependencies, devDependencies, peerDependencies or optionalDependencies", regex: POSTHOG_ANY_RE, fileSet: "package.json at the repo root (workspace packages are not read)" },
    detail: { declared: Object.fromEntries(phNames.map((k) => [k, phDeps[k]])) },
    notes: !ctx.exists("package.json") ? [ctx.leftRepoNotes(["package.json"])[0] ?? "no package.json at the repo root"] : !isPlainObject(pkg) ? ["package.json is not valid JSON"] : undefined,
  }));
  const phAny = new Map();
  const phLower = new Map();
  for (const f of ctx.census) {
    const text = ctx.read(f);
    const any = ctx.countMatches(text, POSTHOG_ANY_RE);
    if (!any) continue;
    phAny.set(f.rel, any);
    const lower = ctx.countMatches(text, POSTHOG_LOWER_RE);
    if (lower) phLower.set(f.rel, lower);
  }
  out.push(counter({
    id: "legibility.posthog.files_any_case",
    group: GROUP,
    kind: "mechanical",
    unit: "file",
    value: phAny.size,
    definition: { summary: "Census files that mention posthog in any case (PostHog, POSTHOG_KEY, posthog-js, ...). perFile counts are matches per file", regex: POSTHOG_ANY_RE, fileSet: "the census (ts, tsx, js, jsx, css, vue, svelte under the audited dirs, tests included)" },
    perFile: phAny,
  }));
  out.push(counter({
    id: "legibility.posthog.files_lowercase",
    group: GROUP,
    kind: "mechanical",
    unit: "file",
    value: phLower.size,
    definition: { summary: "Census files that contain the lowercase string posthog (case-sensitive: imports, posthog-js, posthog.capture; not the product name PostHog). perFile counts are matches per file", regex: POSTHOG_LOWER_RE, fileSet: "the census (ts, tsx, js, jsx, css, vue, svelte under the audited dirs, tests included)" },
    perFile: phLower,
  }));

  return out;
}

module.exports = { group: GROUP, run };
