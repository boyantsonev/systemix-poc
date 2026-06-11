import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { applyHypothesisDecisionToMdx } from "@/lib/contract/hypothesis-mdx";
import { hypothesisGoalMap } from "@/lib/contract/goal-map";
import {
  appendMemoryEntry,
  titleFromHypothesis,
  addDays,
} from "@/lib/contract/memory-mdx";
import { assertWriteAllowed } from "@/lib/contract/write-policy";
import { loadInstanceConfig } from "@/lib/state/instance-config";

export const dynamic = "force-dynamic";

const QUEUE_PATH = path.join(process.cwd(), ".systemix", "queue.json");

const DEMO_CARDS = [
  // ── Hypothesis validation (systemix-landing UAT) ──────────────────────────
  {
    id: "demo-hyp-1",
    type: "hypothesis-validation",
    project: "systemix-landing",
    hypothesis: "Hero framing: 'Memory Layer' vs 'Evidence Layer'",
    metric: "CTA click rate",
    baselineRate: 0.032,
    variantRate: 0.047,
    confidenceLevel: 0.87,
    sessions: 1240,
    proposal: "Promote variant B: update hero tagline to 'The Evidence Layer for design systems'. Reframe the page around production evidence written back into the contract. Update contract rationale.",
    context: "Hermes synthesis — 'Memory Layer' overlaps with Knapsack's 'Living System of Record' (a competing enterprise category). 'Evidence Layer' names the uncontested wedge: production results written back into the component contract. Variant B outperforms across all scroll depths; confidence high.",
    requestedAt: "2026-04-27T08:00:00.000Z",
    status: "pending",
  },
  // ── Standard drift / instrumentation cards ────────────────────────────────
  {
    id: "demo-1",
    type: "drift-resolution",
    project: "finova",
    token: "color.primary.500",
    filePath: "contract/tokens/color-primary-500.mdx",
    proposed: "code-wins",
    context: "Code #0063c4 vs Figma #0052a3 — ΔE 7.2, Tier 3 (obvious). Code reflects the Q1 brand refresh.",
    requestedAt: "2026-04-27T07:30:00.000Z",
    confidence: 0.91,
    status: "pending",
  },
  {
    id: "demo-2",
    type: "instrumentation-approval",
    project: "systemix-landing",
    component: "Button",
    filePath: "src/components/ui/button.tsx",
    proposed: "posthog.capture('button_click', { variant, size, label })",
    context: "Hermes wants to add PostHog instrumentation to capture Button interaction events.",
    requestedAt: "2026-04-27T07:00:00.000Z",
    confidence: 0.84,
    status: "pending",
  },
  {
    id: "demo-3",
    type: "new-token",
    project: "finova",
    token: "color.accent.violet",
    filePath: "contract/tokens/color-accent-violet.mdx",
    proposed: "Add to Figma variable library as Semantic/color.accent.violet",
    context: "Token #7c3aed exists in globals.css but has no Figma counterpart. Missing-in-Figma.",
    requestedAt: "2026-04-26T18:00:00.000Z",
    confidence: 0.88,
    status: "pending",
  },
];

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
  const hypothesisSlug = searchParams.get("hypothesis") ?? null;
  const goalSlug = searchParams.get("goal") ?? null;

  const queue = readQueue();
  if (!queue) {
    // Demo cards carry no hypothesisId or goal — a contract-scoped query has
    // no demo data (the proof surface must never render unlabeled samples).
    const cards = hypothesisSlug || goalSlug
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
  // Cards may carry an explicit goal; cards that only carry a hypothesisId are
  // scoped through the hypothesis frontmatter's goal: backlink.
  const goalMap = goalSlug ? hypothesisGoalMap() : {};
  const cards = (queue.cards ?? []).filter(
    (c: { project?: string; hypothesisId?: string; goal?: string }) =>
      (!projectSlug || !c.project || c.project === projectSlug) &&
      (!hypothesisSlug || c.hypothesisId === hypothesisSlug) &&
      (!goalSlug ||
        c.goal === goalSlug ||
        (!!c.hypothesisId && goalMap[c.hypothesisId] === goalSlug))
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

type HypothesisCard = {
  id: string;
  type: string;
  status: string;
  hypothesisId?: string;
  context?: string;
  confidenceLevel?: number;
  _posthogData?: { fetched_at?: string; source?: string };
  resolvedAt?: string;
  resolution?: unknown;
};

const HYPOTHESES_DIR = path.join(process.cwd(), "contract", "hypotheses");

function applyHypothesisDecision(
  card: HypothesisCard,
  decision: "promote" | "kill",
): { ok: boolean; error?: string } {
  if (!card.hypothesisId) return { ok: false, error: "No hypothesisId on card" };
  const filePath = path.join(HYPOTHESES_DIR, `${card.hypothesisId}.mdx`);
  if (!fs.existsSync(filePath)) return { ok: false, error: `Contract not found: ${filePath}` };

  const raw = fs.readFileSync(filePath, "utf8");
  const now = card._posthogData?.fetched_at ?? new Date().toISOString().slice(0, 10);
  const conf = card.confidenceLevel ?? 0;

  // Block-aware write-back: re-deciding the same hypothesis collapses the prior
  // evidence-posthog block instead of orphaning its nested keys.
  const updated = applyHypothesisDecisionToMdx(raw, {
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

// When a hypothesis decision is approved, record what was learned in the root
// contract's ## Memory — provenance-bearing, newest first. This is the human
// executing their decision (the card was the proposal), so it is permitted at
// every tier; the write-policy guard documents + enforces the covenant for any
// future non-human path. Non-fatal: a missing index never fails the decision.
const INDEX_PATH = path.join(process.cwd(), "contract", "index.mdx");

function applyMemoryFromDecision(
  card: HypothesisCard & { hypothesis?: string; confidence?: number },
  decision: "promote" | "kill",
): void {
  if (!card.hypothesisId || !fs.existsSync(INDEX_PATH)) return;
  const tier = loadInstanceConfig()?.trust?.hermes_tier ?? 0;
  assertWriteAllowed({ tier, artifact: "memory", humanApproved: true });

  const now = card._posthogData?.fetched_at ?? new Date().toISOString().slice(0, 10);
  const updated = appendMemoryEntry(fs.readFileSync(INDEX_PATH, "utf8"), {
    date: now,
    title: titleFromHypothesis(card.hypothesis, card.hypothesisId),
    experimentId: card.hypothesisId,
    decision,
    confidence: card.confidenceLevel ?? card.confidence ?? null,
    summary: card.context ?? "",
    reviewBy: addDays(now, 90),
  });
  if (updated === null) return;
  const tmp = INDEX_PATH + ".tmp";
  fs.writeFileSync(tmp, updated, "utf8");
  fs.renameSync(tmp, INDEX_PATH);
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

function applyInstrumentation(card: InstrumentationCard): { ok: boolean; error?: string } {
  if (!card.filePath) return { ok: false, error: "No filePath on card" };
  const absPath = path.join(process.cwd(), card.filePath);
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

  // For hypothesis-validation: approved → promote, rejected → kill; deferred skips write-back
  if (card.type === "hypothesis-validation") {
    const decision = action === "approved" ? "promote" : action === "rejected" ? "kill" : null;
    if (decision) {
      const result = applyHypothesisDecision(card as HypothesisCard, decision);
      if (!result.ok) {
        return NextResponse.json({ error: result.error ?? "Evidence write-back failed" }, { status: 500 });
      }
      // Record the learning in ## Memory — non-fatal if it can't be written.
      try {
        applyMemoryFromDecision(card as HypothesisCard, decision);
      } catch {
        /* memory write is best-effort; the decision still stands */
      }
      // Fire-and-forget: skill update after confirmed contract write
      void import("../../../../packages/cli/src/commands/skill-update.js")
        .then(({ update }) => update((card as HypothesisCard).hypothesisId!, decision, card))
        .catch(() => {});
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
