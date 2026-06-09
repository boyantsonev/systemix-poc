import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { hypothesisPath, isValidSlug } from "@/lib/contract/hypothesis-mdx";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const QUEUE_PATH = path.join(process.cwd(), ".systemix", "queue.json");

// Local copies of the queue read/write helpers (mirrors src/app/api/queue/route.ts —
// those are not exported; the codebase duplicates small fs helpers by convention).
function readQueue(): { cards?: unknown[] } | null {
  if (!fs.existsSync(QUEUE_PATH)) return null;
  try {
    return JSON.parse(fs.readFileSync(QUEUE_PATH, "utf8"));
  } catch {
    return null;
  }
}

function writeQueue(data: unknown): void {
  const dir = path.dirname(QUEUE_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const tmp = QUEUE_PATH + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
  fs.renameSync(tmp, QUEUE_PATH);
}

type QueueCard = {
  id: string;
  type: string;
  hypothesisId?: string;
  status?: string;
};

// POST /api/hermes/run — synthesize a decision card for one hypothesis and queue it.
// Phase 4: synthetic synthesis (no Ollama). Produces a `hypothesis-validation` card
// the existing HitlQueue renders and whose approval writes back to the contract.
export async function POST(req: NextRequest) {
  let slug: string | undefined;
  try {
    ({ slug } = await req.json());
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }
  if (!slug) return NextResponse.json({ error: "slug required" }, { status: 400 });
  if (!isValidSlug(slug)) return NextResponse.json({ error: "invalid slug" }, { status: 400 });

  const file = hypothesisPath(slug);
  if (!fs.existsSync(file)) {
    return NextResponse.json({ error: "hypothesis not found" }, { status: 404 });
  }

  const { data: fm } = matter(fs.readFileSync(file, "utf8"));
  // Guard against malformed MDX (e.g. nested YAML under `hypothesis:`) so we
  // never interpolate "[object Object]" into the card / context.
  const hypothesis = typeof fm.hypothesis === "string" && fm.hypothesis.trim() ? fm.hypothesis : slug;
  const icp = fm.icp ? String(fm.icp) : "unspecified";
  const status = String(fm.status ?? "running");
  const variants =
    fm.variants && typeof fm.variants === "object" ? Object.keys(fm.variants as object) : [];
  const posthog = typeof fm["evidence-posthog"] === "string" ? (fm["evidence-posthog"] as string) : null;

  const { context, proposal, confidence } = synthesize({ hypothesis, icp, status, variants, posthog });

  const queue = readQueue() ?? { cards: [] };
  const existing = (Array.isArray(queue.cards) ? queue.cards : []) as QueueCard[];
  // Supersede any prior *pending* synthesis for this hypothesis so the latest wins.
  const kept = existing.filter(
    (c) => !(c.type === "hypothesis-validation" && c.hypothesisId === slug && c.status === "pending"),
  );

  const card = {
    id: `hermes-${slug}-${Date.now()}`,
    type: "hypothesis-validation",
    project: "systemix",
    hypothesisId: slug,
    hypothesis,
    context,
    proposal,
    confidenceLevel: confidence,
    requestedAt: new Date().toISOString(),
    status: "pending",
  };

  writeQueue({ ...queue, cards: [card, ...kept] });
  return NextResponse.json({ ok: true, cardId: card.id });
}

function synthesize(args: {
  hypothesis: string;
  icp: string;
  status: string;
  variants: string[];
  posthog: string | null;
}): { context: string; proposal: string; confidence: number } {
  const { hypothesis, icp, status, variants, posthog } = args;
  const n = variants.length;

  // Deterministic pseudo-confidence from the text (reproducible — no randomness).
  let h = 0;
  for (let i = 0; i < hypothesis.length; i++) h = (h * 31 + hypothesis.charCodeAt(i)) >>> 0;
  const confidence = Math.round((0.6 + (h % 30) / 100) * 100) / 100; // 0.60–0.89

  const evidenceClause = posthog
    ? `Signal source \`${posthog}\` is attached but not yet wired to a live readout — this remains a qualitative read.`
    : `No measurement target is set; attach a PostHog event to upgrade this from a qualitative read to evidence.`;

  const context =
    `Hermes re-read the contract for ICP "${icp}". With ${n} variant${n === 1 ? "" : "s"} in play ` +
    `and status \`${status}\`, the framing — "${hypothesis}" — is internally coherent. ${evidenceClause}`;

  const proposal = posthog
    ? `Run longer to accumulate \`${posthog}\`; revisit once the leading variant clears ~1k sessions.`
    : `Define a success metric and ship the variant, then re-run Hermes once evidence lands.`;

  return { context, proposal, confidence };
}
