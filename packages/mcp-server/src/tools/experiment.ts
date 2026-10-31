/**
 * experiment.ts — the MCP door onto the loop (experiments/).
 *
 * Re-elevates the file-first loop as a tool surface so ANY agent / MCP client /
 * AI service can drive it: experiment_list / get / new / measure /
 * learnings (no close: a person closes). Operates on the SAME files as the CLI `experiment` subcommands and
 * the .claude/skills (the "three doors"). v6: the loop is the core; this surface
 * is general (not design-bound) and reads/writes experiments/ + LEARNINGS.md +
 * .systemix/queue.json.
 *
 * No gray-matter dep — a small inline parser handles the flat top-level
 * frontmatter (the nested `variants:` block is written verbatim and never needs
 * parsing here; only top-level fields are read/edited).
 */

import * as fs from "fs";
import * as path from "path";
import type { ToolDefinition, ToolResult } from "../types.js";

const EXPERIMENTS_DIR = "experiments";
const LEARNINGS_REL = "experiments/LEARNINGS.md";
const QUEUE_REL = ".systemix/queue.json";
const REVIEW_DAYS = 90;
const DAY_MS = 24 * 60 * 60 * 1000;

// --- small helpers ----------------------------------------------------------

const isoDay = (d: Date): string => d.toISOString().slice(0, 10);
const q = (s: string): string => JSON.stringify(String(s)); // YAML-safe double-quoted scalar
const ok = (text: string): ToolResult => ({ content: [{ type: "text", text }] });
const fail = (text: string): ToolResult => ({ content: [{ type: "text", text }], isError: true });

const expPath = (root: string, id: string) => path.join(root, EXPERIMENTS_DIR, `${id}.mdx`);

// An experiment id becomes a file name (experiments/<id>.mdx), so it must be a
// plain kebab-case slug — no path separators, no "..", nothing that resolves
// outside experiments/. Same pattern as the CLI door (packages/cli/src/lib/
// experiments.js EXPERIMENT_ID_RE); doors-agree.test.js keeps the two in sync.
const EXPERIMENT_ID_RE = /^[a-z0-9][a-z0-9-]{0,80}$/;

/** A clear tool error for a missing or unsafe id; null when the id is valid. */
function invalidId(id: unknown): ToolResult | null {
  if (id == null || id === "") return fail("an experiment id is required");
  if (typeof id === "string" && EXPERIMENT_ID_RE.test(id)) return null;
  return fail(
    `invalid experiment id ${JSON.stringify(id)} — use lowercase letters, digits and hyphens, ` +
      "starting with a letter or digit (max 81 characters), e.g. landing-hero-2026-07"
  );
}

/** Flat-only frontmatter parser (top-level keys; nested blocks are ignored). */
function parseFrontmatter(raw: string): { data: Record<string, unknown>; content: string } {
  const match = raw.match(/^---[\r\n]+([\s\S]*?)[\r\n]+---[\r\n]*([\s\S]*)$/);
  if (!match) return { data: {}, content: raw };
  const data: Record<string, unknown> = {};
  for (const line of match[1].split(/\r?\n/)) {
    if (/^\s/.test(line)) continue; // skip indented (nested) lines, e.g. under variants:
    const colon = line.indexOf(":");
    if (colon === -1) continue;
    const key = line.slice(0, colon).trim();
    const rawVal = line.slice(colon + 1).trim();
    if (rawVal === "true") { data[key] = true; continue; }
    if (rawVal === "false") { data[key] = false; continue; }
    if (rawVal === "null" || rawVal === "~" || rawVal === "") { data[key] = null; continue; }
    if (rawVal.startsWith("'") && rawVal.endsWith("'")) {
      // YAML single-quoted style escapes apostrophes by doubling them.
      data[key] = rawVal.slice(1, -1).replace(/''/g, "'");
      continue;
    }
    if (rawVal.startsWith('"') && rawVal.endsWith('"')) {
      data[key] = rawVal.slice(1, -1);
      continue;
    }
    const num = Number(rawVal);
    data[key] = isNaN(num) ? rawVal : num;
  }
  return { data, content: match[2].trim() };
}

/** Set/replace a TOP-LEVEL frontmatter key (leaves nested blocks untouched). */
function setFrontmatterField(raw: string, key: string, value: string): string {
  const m = raw.match(/^---[\r\n]+([\s\S]*?)[\r\n]+---[\r\n]*([\s\S]*)$/);
  if (!m) return raw;
  const lines = m[1].split(/\r?\n/);
  const keyRe = new RegExp("^" + key.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&") + "\\s*:");
  let found = false;
  for (let i = 0; i < lines.length; i++) {
    if (keyRe.test(lines[i])) { lines[i] = `${key}: ${value}`; found = true; break; }
  }
  if (!found) lines.push(`${key}: ${value}`);
  return `---\n${lines.join("\n")}\n---\n\n${m[2].trim()}\n`;
}

/**
 * Append a learning bullet. The template is shared (by convention, not import —
 * separate packages) with the CLI writer (packages/cli/src/lib/experiments.js
 * `appendLearning`) and the app writer (src/lib/contract/memory-mdx.ts
 * `renderMemoryLine`). Keep all three byte-identical so the one reader
 * (parseLearnings) reads every writer. Confidence ALWAYS present; summary optional.
 */
function appendLearning(
  root: string,
  e: { id: string; title: string; decision: string | null; confidence: number | null; summary?: string; day: string; reviewBy: string }
): void {
  const file = path.join(root, LEARNINGS_REL);
  let text = fs.existsSync(file)
    ? fs.readFileSync(file, "utf8")
    : "# Learnings\n\n## Memory\n\n*No entries yet.*\n";
  if (!text.includes("## Memory")) text += "\n\n## Memory\n\n*No entries yet.*\n";

  const s = (e.summary ?? "").trim().replace(/\s+/g, " ");
  const reason = s ? ` ${s}${/[.!?]$/.test(s) ? "" : "."}` : "";
  const bullet =
    `- **${e.day} · ${e.title}** — confidence ${e.confidence ?? "—"} · from [${e.id}], ` +
    `decision: ${e.decision ?? "—"}.${reason} Review by: ${e.reviewBy}. Used by: —`;

  const lines = text.split("\n");
  const idx = lines.findIndex((l) => l.trim() === "## Memory");
  let end = lines.findIndex((l, i) => i > idx && l.startsWith("## "));
  if (end === -1) end = lines.length;
  const section = lines.slice(idx + 1, end);

  // Intro = leading prose before the first bullet or the placeholder (kept
  // verbatim); stops at whichever comes first, so neither the placeholder nor
  // an already-written bullet is ever mistaken for intro text.
  let i = 0;
  while (i < section.length && section[i].trim() === "") i++;
  const intro: string[] = [];
  while (
    i < section.length &&
    section[i].trim() !== "" &&
    !section[i].startsWith("- ") &&
    !section[i].includes("*No entries yet.*")
  ) {
    intro.push(section[i]);
    i++;
  }

  // Existing entries — the placeholder paragraph and any other prose are dropped.
  const existing = section.filter((l) => l.startsWith("- "));

  const rebuilt = ["## Memory", "", ...(intro.length ? [...intro, ""] : []), bullet, ...existing, ""];
  const out = [...lines.slice(0, idx), ...rebuilt, ...lines.slice(end)].join("\n");

  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, out, "utf8");
}

function pushQueueCard(
  root: string,
  e: { id: string; decision: string | null; confidence: number | null; summary: string | null; now: Date }
): Record<string, unknown> {
  const file = path.join(root, QUEUE_REL);
  let queue: { cards: unknown[] } = { cards: [] };
  if (fs.existsSync(file)) {
    try { queue = JSON.parse(fs.readFileSync(file, "utf8")); } catch { /* keep default */ }
  }
  if (!Array.isArray(queue.cards)) queue.cards = [];
  const card = {
    id: `decision-${e.id}-${e.now.getTime()}`,
    type: "decision",
    experimentId: e.id,
    decision: e.decision,
    confidence: e.confidence,
    summary: e.summary,
    status: "pending",
    requestedAt: e.now.toISOString(),
  };
  queue.cards.push(card);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(queue, null, 2) + "\n", "utf8");
  return card;
}

// --- experiment_list --------------------------------------------------------

export const experimentListDefinition: ToolDefinition = {
  name: "experiment_list",
  description:
    "List experiments in experiments/ (the loop). Returns id, status, section, metric, hypothesis, " +
    "decision, confidence, posthog-event for each. Optionally filter by status (running|complete).",
  inputSchema: {
    type: "object",
    properties: {
      status: { type: "string", description: "Optional filter: 'running' or 'complete'." },
    },
  },
};

export async function experimentListHandler(args: { status?: string }, projectRoot: string): Promise<ToolResult> {
  const dir = path.join(projectRoot, EXPERIMENTS_DIR);
  if (!fs.existsSync(dir)) return ok("[]");
  const items = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".mdx") && !f.startsWith("_"))
    .map((f) => {
      const { data } = parseFrontmatter(fs.readFileSync(path.join(dir, f), "utf8"));
      return {
        id: String(data.id ?? f.replace(/\.mdx$/, "")),
        status: String(data.status ?? "unknown"),
        section: data.section ?? null,
        metric: data.metric ?? null,
        hypothesis: data.hypothesis ?? null,
        decision: data.decision ?? null,
        confidence: data.confidence ?? null,
        "posthog-event": data["posthog-event"] ?? null,
      };
    })
    .filter((e) => (args.status ? e.status === args.status : true))
    .sort((a, b) => a.id.localeCompare(b.id));
  return ok(JSON.stringify(items, null, 2));
}

// --- experiment_get ---------------------------------------------------------

export const experimentGetDefinition: ToolDefinition = {
  name: "experiment_get",
  description:
    "Read one experiment (experiments/<id>.mdx): top-level frontmatter fields plus the prose body " +
    "(the body carries the variants and rationale). Errors if the experiment is not found.",
  inputSchema: {
    type: "object",
    properties: { id: { type: "string", description: "The experiment id (file name without .mdx)." } },
    required: ["id"],
  },
};

export async function experimentGetHandler(args: { id: string }, projectRoot: string): Promise<ToolResult> {
  const bad = invalidId(args.id);
  if (bad) return bad;
  const file = expPath(projectRoot, args.id);
  if (!fs.existsSync(file)) return fail(`experiment not found: ${EXPERIMENTS_DIR}/${args.id}.mdx`);
  const { data, content } = parseFrontmatter(fs.readFileSync(file, "utf8"));
  return ok(JSON.stringify({ id: args.id, frontmatter: data, body: content }, null, 2));
}

// --- experiment_new ---------------------------------------------------------

export const experimentNewDefinition: ToolDefinition = {
  name: "experiment_new",
  description:
    "Create a new experiment at experiments/<id>.mdx (status: running) — the first step of the loop. " +
    "Errors if it already exists.",
  inputSchema: {
    type: "object",
    properties: {
      id: { type: "string", description: "Experiment id, e.g. 'hero-cta-2026-06'." },
      hypothesis: { type: "string", description: "If we [X], then [Y], measured by [Z]." },
      icp: { type: "string", description: "Who this targets, e.g. 'pre-pmf-founder'." },
      jtbd: { type: "string", description: "The job-to-be-done this ICP is hiring the product for." },
      goal: { type: "string", description: "The goal this experiment serves, e.g. 'consultancy-leads'." },
      section: { type: "string", description: "Surface/area, e.g. 'landing', 'hero', 'pricing'." },
      metric: { type: "string", description: "Primary KPI, e.g. 'cta-click-rate'." },
      control: { type: "string", description: "Control variant copy/behaviour." },
      variant_b: { type: "string", description: "Proposed variant copy/behaviour." },
      given: { type: "string", description: "The situation the visitor/user is in when the bet is tested." },
      conclusion: { type: "string", description: "The win-state in plain words." },
      "review-by": { type: "string", description: "When the evidence is worth reading (YYYY-MM-DD)." },
    },
    required: ["id"],
  },
};

export async function experimentNewHandler(
  args: {
    id: string; hypothesis?: string; icp?: string; jtbd?: string; goal?: string;
    section?: string; metric?: string; control?: string; variant_b?: string;
    given?: string; conclusion?: string; "review-by"?: string;
  },
  projectRoot: string
): Promise<ToolResult> {
  const bad = invalidId(args.id);
  if (bad) return bad;
  const file = expPath(projectRoot, args.id);
  if (fs.existsSync(file)) return fail(`experiment already exists: ${EXPERIMENTS_DIR}/${args.id}.mdx`);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const nullable = (v?: string) => (v ? q(v) : "null"); // quoted scalar, or bare null
  // Field order mirrors the CLI door (src/lib/experiments.js createExperiment) so
  // the three doors write byte-comparable scaffolds; the skill enriches workflow +
  // the prose body afterwards.
  const mdx =
    `---\n` +
    `type: experiment\n` +
    `id: ${args.id}\n` +
    `section: ${q(args.section ?? "landing")}\n` +
    `icp: ${nullable(args.icp)}\n` +
    `jtbd: ${nullable(args.jtbd)}\n` +
    `goal: ${nullable(args.goal)}\n` +
    `hypothesis: ${q(args.hypothesis ?? "Replace with the assumption you are testing.")}\n` +
    `given: ${nullable(args.given)}\n` +
    `conclusion: ${nullable(args.conclusion)}\n` +
    `status: running\n` +
    `metric: ${nullable(args.metric)}\n` +
    `variants:\n` +
    `  control: ${q(args.control ?? "Current experience")}\n` +
    `  variant_b: ${q(args.variant_b ?? "The proposed change")}\n` +
    `workflow: null\n` +
    `posthog-event: null\n` +
    `result: null\n` +
    `decision: null\n` +
    `confidence: null\n` +
    `evidence-posthog: null\n` +
    `evidence-social: null\n` +
    `created: ${isoDay(new Date())}\n` +
    `review-by: ${nullable(args["review-by"])}\n` +
    `---\n\n# ${args.id}\n\nWhy this hypothesis — the ICP + job-to-be-done, the given (prompt/context), the AI workflow you are testing, the conclusion (win-state), and the metric that proves it.\n`;
  fs.writeFileSync(file, mdx, "utf8");
  return ok(`created ${EXPERIMENTS_DIR}/${args.id}.mdx (status: running)`);
}

// --- experiment_measure -----------------------------------------------------

export const experimentMeasureDefinition: ToolDefinition = {
  name: "experiment_measure",
  description:
    "Attach what to measure to an experiment: set its posthog-event (and optionally metric). " +
    "The code instrumentation itself is done by the /measure skill; this records the contract.",
  inputSchema: {
    type: "object",
    properties: {
      id: { type: "string", description: "The experiment id." },
      event: { type: "string", description: "PostHog event name the experiment is measured by." },
      metric: { type: "string", description: "Optional primary metric override." },
    },
    required: ["id", "event"],
  },
};

export async function experimentMeasureHandler(
  args: { id: string; event: string; metric?: string },
  projectRoot: string
): Promise<ToolResult> {
  const bad = invalidId(args.id);
  if (bad) return bad;
  const file = expPath(projectRoot, args.id);
  if (!fs.existsSync(file)) return fail(`experiment not found: ${EXPERIMENTS_DIR}/${args.id}.mdx`);
  let raw = fs.readFileSync(file, "utf8");
  raw = setFrontmatterField(raw, "posthog-event", q(args.event));
  if (args.metric) raw = setFrontmatterField(raw, "metric", q(args.metric));
  fs.writeFileSync(file, raw, "utf8");
  return ok(`${args.id}: posthog-event=${args.event}${args.metric ? ` metric=${args.metric}` : ""}`);
}

// --- experiment_close: removed ---------------------------------------------
// Humans close experiments (CLAUDE.md: "it never closes; humans close"). A person
// types `systemix experiment close <id> …`; the agent can only queue a close card.

// --- experiment_learnings ---------------------------------------------------

interface LearningEntry {
  date: string | null; title: string | null; confidence: string | null; id: string | null;
  decision: string | null; reviewBy: string | null; usedBy: string[]; raw: string;
}

/**
 * Parse the `## Memory` bullets into structured entries (file order = newest-first).
 * Mirrors the CLI lib (packages/cli/src/lib/experiments.js) so the doors stay in parity.
 * A line is an entry iff it's a `-` bullet citing an experiment (`from [<id>]`).
 */
function parseLearnings(raw: string): LearningEntry[] {
  const lines = raw.split("\n");
  const anchor = lines.findIndex((l) => l.trim() === "## Memory");
  const scope = anchor === -1 ? lines : lines.slice(anchor + 1);
  const entries: LearningEntry[] = [];
  for (const line of scope) {
    const l = line.trim();
    if (!l.startsWith("- ") || !l.includes("from [")) continue;
    const pick = (re: RegExp): string | null => { const m = l.match(re); return m ? m[1] : null; };
    const usedByRaw = (pick(/Used by:\s*(.+)$/) ?? "—").trim();
    entries.push({
      date: pick(/\*\*(\d{4}-\d{2}-\d{2})\s*·/),
      title: pick(/·\s*([^*]+?)\s*\*\*/),
      confidence: pick(/confidence\s+(\S+?)\s*·/),
      id: pick(/from \[([^\]]+)\]/),
      decision: pick(/decision:\s*([A-Za-z][\w-]*)/),
      reviewBy: pick(/Review by:\s*(\d{4}-\d{2}-\d{2})/),
      usedBy: usedByRaw === "—" ? [] : (usedByRaw.match(/\[([^\]]+)\]/g) ?? []).map((s) => s.slice(1, -1)),
      raw: l,
    });
  }
  return entries;
}

export const experimentLearningsDefinition: ToolDefinition = {
  name: "experiment_learnings",
  description:
    "Return the synthesized loop memory (experiments/LEARNINGS.md) — the earned, cited learnings. " +
    "Scope it for context-efficient recall: 'recent' (the N newest) or 'for' (one experiment's lineage). " +
    "No args returns the full ledger.",
  inputSchema: {
    type: "object",
    properties: {
      recent: { type: "number", description: "Return only the N newest learnings (curated recall)." },
      for: { type: "string", description: "Return only learnings in this experiment id's lineage (authored by it, or marked Used by it)." },
    },
  },
};

export async function experimentLearningsHandler(
  args: { recent?: number; for?: string },
  projectRoot: string
): Promise<ToolResult> {
  const file = path.join(projectRoot, LEARNINGS_REL);
  if (!fs.existsSync(file)) return ok("(no LEARNINGS.md yet — close an experiment to write the first learning)");
  const raw = fs.readFileSync(file, "utf8");
  if (args.recent == null && args.for == null) return ok(raw); // full ledger
  let entries = parseLearnings(raw);
  if (args.for != null) entries = entries.filter((e) => e.id === args.for || e.usedBy.includes(args.for!));
  if (args.recent != null) entries = entries.slice(0, Number(args.recent));
  if (!entries.length) return ok("(no matching learnings yet)");
  return ok(entries.map((e) => e.raw).join("\n"));
}
