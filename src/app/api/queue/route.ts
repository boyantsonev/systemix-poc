import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { applyExperimentDecisionToMdx, experimentPath, isValidSlug } from "@/lib/contract/experiment-mdx";
import { experimentGoalMap } from "@/lib/contract/goal-map";
import {
  appendMemoryEntry,
  titleFromExperiment,
  addDays,
} from "@/lib/contract/memory-mdx";
import { assertWriteAllowed } from "@/lib/contract/write-policy";
import { loadInstanceConfig } from "@/lib/state/instance-config";
import { rejectNonLocal } from "@/lib/local-request";
import { resolveProjectFile } from "@/lib/project-path";

export const dynamic = "force-dynamic";

const QUEUE_PATH = path.join(process.cwd(), ".systemix", "queue.json");

// What a resolution may touch: the actions the dashboard sends, the project files
// card-driven writes may land in, and the event-key charset (it's spliced into code).
const ACTIONS = new Set(["approved", "rejected", "deferred"]);
const INSTRUMENT_FILES = { roots: ["src"], exts: [".tsx", ".jsx"] };
const ENGAGEMENT_RECORDS = { roots: [path.join("contract", "engagement")], exts: [".mdx"] };
const DEFAULT_ENGAGEMENT_RECORD = path.join("contract", "engagement", "landing.mdx");
const EVENT_KEY = /^[\w .:/-]{1,100}$/;

// Blank slate — no demo cards. The queue renders real cards from .systemix/queue.json
// (written by close-experiment / the HITL flow); an empty instance shows an empty queue.
const DEMO_CARDS: Array<{ id: string; type: string; status: string; project?: string }> = [];

function readQueue() {
  if (!fs.existsSync(QUEUE_PATH)) return null;
  try {
    return JSON.parse(fs.readFileSync(QUEUE_PATH, "utf8"));
  } catch {
    return null;
  }
}

function writeQueue(data: unknown) {
  const dir = path.dirname(QUEUE_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const tmp = QUEUE_PATH + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
  fs.renameSync(tmp, QUEUE_PATH);
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const projectSlug = searchParams.get("project") ?? null;
  const experimentSlug = searchParams.get("experiment") ?? null;
  const goalSlug = searchParams.get("goal") ?? null;

  const queue = readQueue();
  if (!queue) {
    // Demo cards carry no experimentId or goal — a contract-scoped query has
    // no demo data (the proof surface must never render unlabeled samples).
    const cards = experimentSlug || goalSlug
      ? []
      : projectSlug
      ? DEMO_CARDS.filter(c => !("project" in c) || c.project === projectSlug)
      : DEMO_CARDS;
    return NextResponse.json({
      cards,
      pendingCount: cards.filter(c => c.status === "pending").length,
      isDemo: true,
    });
  }
  // Cards may carry an explicit goal; cards that only carry an experimentId are
  // scoped through the experiment frontmatter's goal: backlink.
  const goalMap = goalSlug ? experimentGoalMap() : {};
  const cards = (queue.cards ?? []).filter(
    (c: { project?: string; experimentId?: string; goal?: string }) =>
      (!projectSlug || !c.project || c.project === projectSlug) &&
      (!experimentSlug || c.experimentId === experimentSlug) &&
      (!goalSlug ||
        c.goal === goalSlug ||
        (!!c.experimentId && goalMap[c.experimentId] === goalSlug))
  );
  const pendingCount = cards.filter((c: { status: string }) => c.status === "pending").length;
  return NextResponse.json({ cards, pendingCount, isDemo: false });
}

type InstrumentationCard = {
  id: string;
  type: string;
  status: string;
  filePath?: string;
  posthogEventKey?: string;
  component?: string;
  resolvedAt?: string;
  resolution?: unknown;
};

type ExperimentCard = {
  id: string;
  type: string;
  status: string;
  experimentId?: string;
  context?: string;
  confidenceLevel?: number;
  _posthogData?: { fetched_at?: string; source?: string };
  resolvedAt?: string;
  resolution?: unknown;
};

function applyExperimentDecision(
  card: ExperimentCard,
  decision: "promote" | "kill",
): { ok: boolean; error?: string } {
  if (!card.experimentId) return { ok: false, error: "No experimentId on card" };
  const filePath = experimentPath(card.experimentId);
  if (!fs.existsSync(filePath)) return { ok: false, error: `Contract not found: ${filePath}` };

  const raw = fs.readFileSync(filePath, "utf8");
  const now = card._posthogData?.fetched_at ?? new Date().toISOString().slice(0, 10);
  const conf = card.confidenceLevel ?? 0;

  // Block-aware write-back: re-deciding the same experiment collapses the prior
  // evidence-posthog block instead of orphaning its nested keys.
  const updated = applyExperimentDecisionToMdx(raw, {
    decision,
    now,
    confidence: conf,
    source: card._posthogData?.source ?? "dashboard",
    context: card.context ?? "Decision recorded via dashboard.",
  });
  if (updated === null) return { ok: false, error: "Could not parse frontmatter" };

  const tmp = filePath + ".tmp";
  fs.writeFileSync(tmp, updated, "utf8");
  fs.renameSync(tmp, filePath);
  return { ok: true };
}

// When a decision is approved, record what was learned in the loop's ## Memory
// ledger (experiments/LEARNINGS.md) — provenance-bearing, newest first. This is the human
// executing their decision (the card was the proposal), so it is permitted at
// every tier; the write-policy guard documents + enforces the covenant for any
// future non-human path. Non-fatal: a missing index never fails the decision.
const LEARNINGS_PATH = path.join(process.cwd(), "experiments", "LEARNINGS.md");

function applyMemoryFromDecision(
  card: ExperimentCard & { hypothesis?: string; confidence?: number },
  decision: "promote" | "kill",
): void {
  if (!card.experimentId || !fs.existsSync(LEARNINGS_PATH)) return;
  const tier = loadInstanceConfig()?.trust?.hermes_tier ?? 0;
  assertWriteAllowed({ tier, artifact: "memory", humanApproved: true });

  const now = card._posthogData?.fetched_at ?? new Date().toISOString().slice(0, 10);
  const updated = appendMemoryEntry(fs.readFileSync(LEARNINGS_PATH, "utf8"), {
    date: now,
    title: titleFromExperiment(card.hypothesis, card.experimentId),
    experimentId: card.experimentId,
    decision,
    confidence: card.confidenceLevel ?? card.confidence ?? null,
    summary: card.context ?? "",
    reviewBy: addDays(now, 90),
  });
  if (updated === null) return;
  const tmp = LEARNINGS_PATH + ".tmp";
  fs.writeFileSync(tmp, updated, "utf8");
  fs.renameSync(tmp, LEARNINGS_PATH);
}

// Engagement snapshots write to a standalone engagement record (NOT the
// hypotheses dir): every resolution appends an entry to its ## Engagement Log.
function applyEngagementAck(
  card: { recordPath?: string },
  action: string,
  note?: string | null,
): { ok: boolean; error?: string } {
  const rel = card.recordPath ?? DEFAULT_ENGAGEMENT_RECORD;
  const filePath = resolveProjectFile(rel, ENGAGEMENT_RECORDS);
  if (!filePath) return { ok: false, error: "Engagement record path is not allowed" };
  if (!fs.existsSync(filePath)) return { ok: false, error: `Engagement record not found: ${rel}` };
  const verb =
    action === "approved" ? "acknowledged"
    : action === "deferred" ? "flagged-for-experiment"
    : "dismissed";
  const now = new Date().toISOString().slice(0, 10);
  const line = `- **${now}** ${verb}${note ? ` — ${note}` : ""} _(dashboard)_`;
  const raw = fs.readFileSync(filePath, "utf8");
  const updated = `${raw.replace(/\s+$/, "")}\n${line}\n`;
  const tmp = filePath + ".tmp";
  fs.writeFileSync(tmp, updated, "utf8");
  fs.renameSync(tmp, filePath);
  return { ok: true };
}

function applyInstrumentation(card: InstrumentationCard): { ok: boolean; error?: string } {
  if (!card.filePath) return { ok: false, error: "No filePath on card" };
  const absPath = resolveProjectFile(card.filePath, INSTRUMENT_FILES);
  if (!absPath) return { ok: false, error: "filePath is not an allowed project file" };
  if (!fs.existsSync(absPath)) return { ok: false, error: `File not found: ${card.filePath}` };

  let src = fs.readFileSync(absPath, "utf8");

  // Skip if already instrumented
  if (src.includes("component_render") || src.includes("posthog.capture")) {
    return { ok: true };
  }

  const eventKey = card.posthogEventKey ?? card.component ?? "unknown";

  // Add "use client" if not present
  if (!src.startsWith('"use client"') && !src.startsWith("'use client'")) {
    src = `"use client"\n\n${src}`;
  }

  // Add usePostHog import after existing imports
  const lastImportIdx = src.lastIndexOf("\nimport ");
  const insertAfter = lastImportIdx !== -1
    ? src.indexOf("\n", lastImportIdx + 1)
    : src.indexOf("\n");
  if (insertAfter === -1) return { ok: false, error: "Could not locate import block" };

  const phImport = `import { useEffect } from 'react'\nimport { usePostHog } from 'posthog-js/react'`;
  // Only add if not already imported
  if (!src.includes("posthog-js/react")) {
    src = src.slice(0, insertAfter + 1) + phImport + "\n" + src.slice(insertAfter + 1);
  }

  // Insert the hook call after the opening brace of the default exported function
  // Look for `function <Name>(...) {` or `export function <Name>(...) {`
  const fnMatch = src.match(/\bfunction\s+\w+\s*\([^)]*\)[^{]*\{/);
  if (!fnMatch || fnMatch.index === undefined) return { ok: false, error: "Could not locate component function body" };

  const insertAt = fnMatch.index + fnMatch[0].length;
  const hookCode = [
    ``,
    `  const posthog = usePostHog()`,
    `  useEffect(() => {`,
    `    posthog?.capture('component_render', {`,
    `      component_name: '${eventKey}',`,
    `      pathname: typeof window !== 'undefined' ? window.location.pathname : null,`,
    `    })`,
    `  }, [])`,
  ].join("\n");

  src = src.slice(0, insertAt) + hookCode + src.slice(insertAt);

  const tmp = absPath + ".tmp";
  fs.writeFileSync(tmp, src, "utf8");
  fs.renameSync(tmp, absPath);
  return { ok: true };
}

type HypothesisProposalCard = {
  id: string;
  type: string;
  status: string;
  experimentId?: string;
  citedLearnings?: string[];
  payload?: { id?: string } & Record<string, unknown>;
  resolvedAt?: string;
  resolution?: unknown;
};

// Hypothesis proposals (the engine's generate stage): approving converts the
// card's payload into a real contract — experiments/<id>.mdx via the same
// createExperiment every door uses — and backlinks the learnings it cited.
// Approval creates the CONTRACT only; variants + code still ship through
// /write-variants and a merged PR (the next human gates).
async function applyHypothesisProposal(
  card: HypothesisProposalCard,
): Promise<{ ok: boolean; error?: string }> {
  const payload = card.payload;
  if (!payload?.id) return { ok: false, error: "No payload.id on card" };
  const tier = loadInstanceConfig()?.trust?.hermes_tier ?? 0;
  assertWriteAllowed({ tier, artifact: "hypothesis", humanApproved: true });

  const mod = await import("../../../../packages/cli/src/lib/experiments.js");
  const exp = mod.default ?? mod; // CJS interop (Next vs Vitest)
  try {
    exp.createExperiment(process.cwd(), payload.id, payload);
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "createExperiment failed" };
  }
  // Backlink recall → loop: flip `Used by:` on each cited learning. Best-effort —
  // a missing bullet never fails the approval.
  for (const prior of card.citedLearnings ?? []) {
    try {
      exp.markLearningUsed(process.cwd(), prior, payload.id);
    } catch {
      /* best-effort */
    }
  }
  return { ok: true };
}

// Card fields that steer a write are checked before anything is written: paths
// must resolve to allowlisted project files, ids must be slugs, and strings that
// are spliced into generated code must stay inert.
const isSlug = (v: unknown): v is string => typeof v === "string" && isValidSlug(v);

function cardProblem(card: Record<string, unknown>, action: string): string | null {
  switch (card.type) {
    case "instrumentation-approval":
      if (action !== "approved") return null;
      if (!resolveProjectFile(card.filePath, INSTRUMENT_FILES)) return "filePath must be a .tsx/.jsx file under src/";
      return EVENT_KEY.test(String(card.posthogEventKey ?? card.component ?? "unknown")) ? null : "invalid event key";
    case "experiment-validation":
      return action === "deferred" || isSlug(card.experimentId) ? null : "invalid experimentId";
    case "hypothesis-proposal": {
      if (action !== "approved") return null;
      if (!isSlug((card.payload as { id?: unknown } | undefined)?.id)) return "invalid payload.id";
      const cited = card.citedLearnings ?? [];
      return Array.isArray(cited) && cited.every(isSlug) ? null : "invalid citedLearnings";
    }
    case "engagement-snapshot":
      return resolveProjectFile(card.recordPath ?? DEFAULT_ENGAGEMENT_RECORD, ENGAGEMENT_RECORDS)
        ? null
        : "recordPath must be an .mdx file under contract/engagement/";
    default:
      return null;
  }
}

export async function PATCH(req: NextRequest) {
  const denied = rejectNonLocal(req);
  if (denied) return denied;

  let body: { id?: unknown; action?: unknown; note?: unknown };
  try {
    body = (await req.json()) ?? {};
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const { id, action, note } = body;
  if (typeof id !== "string" || !id || typeof action !== "string" || !action) {
    return NextResponse.json({ error: "id and action required" }, { status: 400 });
  }
  if (!ACTIONS.has(action)) {
    return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
  }
  if (note != null && typeof note !== "string") {
    return NextResponse.json({ error: "note must be a string" }, { status: 400 });
  }
  const noteText = typeof note === "string" ? note : null;
  const queue = readQueue() ?? { cards: [] };
  const cards: InstrumentationCard[] = Array.isArray(queue.cards) ? queue.cards : [];
  const card = cards.find(c => c && c.id === id);
  if (!card) {
    return NextResponse.json({ error: "Card not found" }, { status: 404 });
  }
  const problem = cardProblem(card as unknown as Record<string, unknown>, action);
  if (problem) {
    return NextResponse.json({ error: `Malformed ${card.type} card: ${problem}` }, { status: 400 });
  }

  // For instrumentation approvals, write the code before updating the card
  if (action === "approved" && card.type === "instrumentation-approval") {
    const result = applyInstrumentation(card);
    if (!result.ok) {
      return NextResponse.json({ error: result.error ?? "Instrumentation failed" }, { status: 500 });
    }
  }

  // For experiment-validation: approved → promote, rejected → kill; deferred skips write-back
  if (card.type === "experiment-validation") {
    const decision = action === "approved" ? "promote" : action === "rejected" ? "kill" : null;
    if (decision) {
      const result = applyExperimentDecision(card as ExperimentCard, decision);
      if (!result.ok) {
        return NextResponse.json({ error: result.error ?? "Evidence write-back failed" }, { status: 500 });
      }
      // Record the learning in ## Memory — non-fatal if it can't be written.
      try {
        applyMemoryFromDecision(card as ExperimentCard, decision);
      } catch {
        /* memory write is best-effort; the decision still stands */
      }
      // Fire-and-forget: skill update after confirmed contract write
      void import("../../../../packages/cli/src/commands/skill-update.js")
        .then(({ update }) => update((card as ExperimentCard).experimentId!, decision, card))
        .catch(() => {});
    }
  }

  // Hypothesis proposals: approve scaffolds the contract; reject/defer just flip status.
  if (card.type === "hypothesis-proposal" && action === "approved") {
    const result = await applyHypothesisProposal(card as HypothesisProposalCard);
    if (!result.ok) {
      return NextResponse.json({ error: result.error ?? "Experiment scaffold failed" }, { status: 500 });
    }
  }

  // Engagement snapshots: every resolution appends to the engagement log.
  if (card.type === "engagement-snapshot") {
    const result = applyEngagementAck(card as { recordPath?: string }, action, noteText);
    if (!result.ok) {
      return NextResponse.json({ error: result.error ?? "Engagement write-back failed" }, { status: 500 });
    }
  }

  card.status = action;
  card.resolvedAt = new Date().toISOString();
  card.resolution = { action, note: noteText, resolvedBy: "dashboard" };
  writeQueue(queue);
  return NextResponse.json({ id, action, card });
}
