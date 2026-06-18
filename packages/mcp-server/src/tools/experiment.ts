/**
 * experiment.ts — the MCP door onto the loop (experiments/).
 *
 * Re-elevates the file-first loop as a tool surface so ANY agent / MCP client /
 * AI service can drive it: experiment_list / get / new / measure / close /
 * learnings. Operates on the SAME files as the CLI `experiment` subcommands and
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
    if ((rawVal.startsWith('"') && rawVal.endsWith('"')) || (rawVal.startsWith("'") && rawVal.endsWith("'"))) {
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

function appendLearning(
  root: string,
  e: { id: string; title: string; decision: string | null; confidence: number | null; day: string; reviewBy: string }
): void {
  const file = path.join(root, LEARNINGS_REL);
  let text = fs.existsSync(file)
    ? fs.readFileSync(file, "utf8")
    : "# Learnings\n\n## Memory\n\n*No entries yet.*\n";
  if (!text.includes("## Memory")) text += "\n\n## Memory\n\n*No entries yet.*\n";

  const bullet =
    `- **${e.day} · ${e.title}** — confidence ${e.confidence ?? "—"} · from [${e.id}], ` +
    `decision: ${e.decision ?? "—"}. Review by: ${e.reviewBy}. Used by: —`;

  const lines = text.split("\n");
  const idx = lines.findIndex((l) => l.trim() === "## Memory");
  let insertAt = idx + 1;
  while (insertAt < lines.length && lines[insertAt].trim() === "") insertAt++;
  if (lines[insertAt] && lines[insertAt].includes("*No entries yet.*")) {
    lines.splice(insertAt, 1, bullet);
  } else {
    lines.splice(insertAt, 0, bullet, "");
  }
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, lines.join("\n"), "utf8");
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
      icp: { type: "string", description: "Who this targets." },
      section: { type: "string", description: "Surface/area, e.g. 'landing', 'pricing'." },
      metric: { type: "string", description: "Primary KPI, e.g. 'cta-click-rate'." },
      control: { type: "string", description: "Control variant copy/behaviour." },
      variant_b: { type: "string", description: "Proposed variant copy/behaviour." },
    },
    required: ["id"],
  },
};

export async function experimentNewHandler(
  args: { id: string; hypothesis?: string; icp?: string; section?: string; metric?: string; control?: string; variant_b?: string },
  projectRoot: string
): Promise<ToolResult> {
  const file = expPath(projectRoot, args.id);
  if (fs.existsSync(file)) return fail(`experiment already exists: ${EXPERIMENTS_DIR}/${args.id}.mdx`);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const mdx =
    `---\n` +
    `type: experiment\n` +
    `id: ${args.id}\n` +
    `section: ${q(args.section ?? "landing")}\n` +
    `hypothesis: ${q(args.hypothesis ?? "Replace with the assumption you are testing.")}\n` +
    `icp: ${args.icp ? q(args.icp) : "null"}\n` +
    `status: running\n` +
    `metric: ${args.metric ? q(args.metric) : "null"}\n` +
    `variants:\n` +
    `  control: ${q(args.control ?? "Current experience")}\n` +
    `  variant_b: ${q(args.variant_b ?? "The proposed change")}\n` +
    `posthog-event: null\n` +
    `result: null\n` +
    `decision: null\n` +
    `confidence: null\n` +
    `evidence-posthog: null\n` +
    `evidence-social: null\n` +
    `created: ${isoDay(new Date())}\n` +
    `review-by: null\n` +
    `---\n\n# ${args.id}\n\nWhy this hypothesis — fill in the assumption, the ICP, and the metric.\n`;
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
  const file = expPath(projectRoot, args.id);
  if (!fs.existsSync(file)) return fail(`experiment not found: ${EXPERIMENTS_DIR}/${args.id}.mdx`);
  let raw = fs.readFileSync(file, "utf8");
  raw = setFrontmatterField(raw, "posthog-event", q(args.event));
  if (args.metric) raw = setFrontmatterField(raw, "metric", q(args.metric));
  fs.writeFileSync(file, raw, "utf8");
  return ok(`${args.id}: posthog-event=${args.event}${args.metric ? ` metric=${args.metric}` : ""}`);
}

// --- experiment_close -------------------------------------------------------

export const experimentCloseDefinition: ToolDefinition = {
  name: "experiment_close",
  description:
    "Close an experiment: write status/result/decision/confidence/review-by into experiments/<id>.mdx, " +
    "append the learning to experiments/LEARNINGS.md (## Memory, newest-first, cites the experiment), and " +
    "push a decision card to .systemix/queue.json. The capture IS the loop.",
  inputSchema: {
    type: "object",
    properties: {
      id: { type: "string", description: "The experiment id." },
      result: { type: "string", description: "One-line result summary." },
      decision: { type: "string", description: "promote | iterate | kill | no-action." },
      confidence: { type: "number", description: "0.0–1.0." },
      learning: { type: "string", description: "Optional short title for the learning entry (defaults to result)." },
    },
    required: ["id"],
  },
};

export async function experimentCloseHandler(
  args: { id: string; result?: string; decision?: string; confidence?: number; learning?: string },
  projectRoot: string
): Promise<ToolResult> {
  const file = expPath(projectRoot, args.id);
  if (!fs.existsSync(file)) return fail(`experiment not found: ${EXPERIMENTS_DIR}/${args.id}.mdx`);
  const now = new Date();
  const day = isoDay(now);
  const reviewBy = isoDay(new Date(now.getTime() + REVIEW_DAYS * DAY_MS));

  let raw = fs.readFileSync(file, "utf8");
  raw = setFrontmatterField(raw, "status", "complete");
  if (args.result != null) raw = setFrontmatterField(raw, "result", q(args.result));
  if (args.decision != null) raw = setFrontmatterField(raw, "decision", args.decision);
  if (args.confidence != null) raw = setFrontmatterField(raw, "confidence", String(args.confidence));
  raw = setFrontmatterField(raw, "review-by", reviewBy);
  fs.writeFileSync(file, raw, "utf8");

  appendLearning(projectRoot, {
    id: args.id,
    title: args.learning || args.result || args.id,
    decision: args.decision ?? null,
    confidence: args.confidence ?? null,
    day,
    reviewBy,
  });
  pushQueueCard(projectRoot, {
    id: args.id,
    decision: args.decision ?? null,
    confidence: args.confidence ?? null,
    summary: args.result ?? null,
    now,
  });

  return ok(`closed ${args.id}; learning → ${LEARNINGS_REL}; decision card → ${QUEUE_REL}`);
}

// --- experiment_learnings ---------------------------------------------------

export const experimentLearningsDefinition: ToolDefinition = {
  name: "experiment_learnings",
  description: "Return the synthesized loop memory (experiments/LEARNINGS.md) — the earned, cited learnings.",
  inputSchema: { type: "object", properties: {} },
};

export async function experimentLearningsHandler(_args: Record<string, unknown>, projectRoot: string): Promise<ToolResult> {
  const file = path.join(projectRoot, LEARNINGS_REL);
  if (!fs.existsSync(file)) return ok("(no LEARNINGS.md yet — close an experiment to write the first learning)");
  return ok(fs.readFileSync(file, "utf8"));
}
