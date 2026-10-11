import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { applyExperimentDecisionToMdx, experimentPath } from "@/lib/contract/experiment-mdx";
import { experimentGoalMap } from "@/lib/contract/goal-map";
import {
  appendMemoryEntry,
  titleFromExperiment,
  addDays,
} from "@/lib/contract/memory-mdx";
import { assertWriteAllowed } from "@/lib/contract/write-policy";
import { loadInstanceConfig } from "@/lib/state/instance-config";

export const dynamic = "force-dynamic";

const QUEUE_PATH = path.join(process.cwd(), ".systemix", "queue.json");

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
  const rel = card.recordPath ?? path.join("contract", "engagement", "landing.mdx");
  const filePath = path.join(process.cwd(), rel);
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

// A card's filePath comes from .systemix/queue.json, so only a .tsx/.jsx file
// under the repo's src/ is accepted — resolved (and symlinks followed) before
// the check, so `../` or a link can't point the rewrite outside the repo.
function instrumentableFile(rel: string): string | null {
  const srcRoot = path.resolve(process.cwd(), "src");
  const inSrc = (abs: string) => {
    const r = path.relative(srcRoot, abs);
    return r !== "" && !r.startsWith("..") && !path.isAbsolute(r);
  };
  const abs = path.resolve(process.cwd(), rel);
  if (!inSrc(abs) || !/\.(tsx|jsx)$/.test(abs)) return null;
  if (fs.existsSync(abs) && !inSrc(fs.realpathSync(abs))) return null;
  return abs;
}

// The event key is emitted into the component's source as a string literal —
// only a conservative identifier-ish key, never one that can close the quote.
const EVENT_KEY_RE = /^[A-Za-z0-9_.:-]+$/;

function applyInstrumentation(card: InstrumentationCard): { ok: boolean; error?: string } {
  if (!card.filePath) return { ok: false, error: "No filePath on card" };
  const absPath = instrumentableFile(card.filePath);
  if (!absPath) {
    return {
      ok: false,
      error: `Invalid filePath on card: ${JSON.stringify(card.filePath)} — expected a .tsx/.jsx file under src/`,
    };
  }
  if (!fs.existsSync(absPath)) return { ok: false, error: `File not found: ${card.filePath}` };

  let src = fs.readFileSync(absPath, "utf8");

  // Skip if already instrumented
  if (src.includes("component_render") || src.includes("posthog.capture")) {
    return { ok: true };
  }

  const eventKey = card.posthogEventKey ?? card.component ?? "unknown";
  if (!EVENT_KEY_RE.test(eventKey)) {
    return { ok: false, error: `Invalid event key on card: ${JSON.stringify(eventKey)}` };
  }

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

export async function PATCH(req: NextRequest) {
  const { id, action, note } = await req.json();
  if (!id || !action) {
    return NextResponse.json({ error: "id and action required" }, { status: 400 });
  }
  const queue = readQueue() ?? { cards: [] };
  const card = (queue.cards as InstrumentationCard[]).find(c => c.id === id);
  if (!card) {
    return NextResponse.json({ error: "Card not found" }, { status: 404 });
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
    const result = applyEngagementAck(card as { recordPath?: string }, action, note);
    if (!result.ok) {
      return NextResponse.json({ error: result.error ?? "Engagement write-back failed" }, { status: 500 });
    }
  }

  card.status = action;
  card.resolvedAt = new Date().toISOString();
  card.resolution = { action, note: note ?? null, resolvedBy: "dashboard" };
  writeQueue(queue);
  return NextResponse.json({ id, action, card });
}
