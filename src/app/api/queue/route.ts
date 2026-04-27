import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

const QUEUE_PATH = path.join(process.cwd(), ".systemix", "queue.json");

// Demo cards shown when queue.json doesn't exist yet
const DEMO_CARDS = [
  {
    id: "demo-1",
    type: "drift-resolution",
    token: "color.primary.500",
    filePath: "contract/tokens/color-primary-500.mdx",
    proposed: "code-wins",
    context: "Code #0063c4 vs Figma #0052a3 — ΔE 7.2, Tier 3 (obvious). Code reflects the Q1 brand refresh.",
    requestedAt: "2026-04-27T08:00:00.000Z",
    confidence: 0.91,
    status: "pending",
  },
  {
    id: "demo-2",
    type: "instrumentation-approval",
    component: "Button",
    filePath: "src/components/ui/button.tsx",
    proposed: "posthog.capture('button_click', { variant, size, label })",
    context: "Hermes wants to add PostHog instrumentation to capture Button interaction events.",
    requestedAt: "2026-04-27T07:30:00.000Z",
    confidence: 0.84,
    status: "pending",
  },
  {
    id: "demo-3",
    type: "new-token",
    token: "color.accent.violet",
    filePath: "contract/tokens/color-accent-violet.mdx",
    proposed: "Add to Figma variable library as Semantic/color.accent.violet",
    context: "Token #7c3aed exists in globals.css but has no Figma counterpart. Missing-in-Figma.",
    requestedAt: "2026-04-27T07:00:00.000Z",
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

export async function GET() {
  const queue = readQueue();
  if (!queue) {
    return NextResponse.json({
      cards: DEMO_CARDS,
      pendingCount: DEMO_CARDS.length,
      isDemo: true,
    });
  }
  const cards = queue.cards ?? [];
  const pendingCount = cards.filter((c: { status: string }) => c.status === "pending").length;
  return NextResponse.json({ cards, pendingCount, isDemo: false });
}

export async function PATCH(req: NextRequest) {
  const { id, action, note } = await req.json();
  if (!id || !action) {
    return NextResponse.json({ error: "id and action required" }, { status: 400 });
  }
  const queue = readQueue() ?? { cards: [] };
  const card = (queue.cards as Array<{ id: string; status: string; resolvedAt?: string; resolution?: unknown }>)
    .find(c => c.id === id);
  if (!card) {
    return NextResponse.json({ error: "Card not found" }, { status: 404 });
  }
  card.status = action;
  card.resolvedAt = new Date().toISOString();
  card.resolution = { action, note: note ?? null, resolvedBy: "dashboard" };
  writeQueue(queue);
  return NextResponse.json({ id, action, card });
}
