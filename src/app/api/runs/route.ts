// TASK 4 — BAST-161: GET /api/runs
// Returns the last 50 run manifests, sorted by startedAt descending.

import { NextResponse } from "next/server";
import { existsSync, readdirSync, readFileSync } from "fs";
import path from "path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RUNS_DIR = path.join(process.cwd(), ".systemix", "runs");
const MAX_RUNS = 50;

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

export async function GET() {
  if (!existsSync(RUNS_DIR)) {
    return NextResponse.json({ runs: [], total: 0 }, { headers: CORS_HEADERS });
  }

  let files: string[];
  try {
    files = readdirSync(RUNS_DIR).filter((f) => f.endsWith(".json"));
  } catch {
    return NextResponse.json(
      { error: "Failed to list runs" },
      { status: 500, headers: CORS_HEADERS }
    );
  }

  const runs: Record<string, unknown>[] = [];

  for (const file of files) {
    try {
      const content = readFileSync(path.join(RUNS_DIR, file), "utf8");
      const manifest = JSON.parse(content);
      runs.push(manifest);
    } catch {
      // Skip malformed run files
    }
  }

  // Sort by startedAt descending (most recent first)
  runs.sort((a, b) => {
    const aTime = a.startedAt ? new Date(a.startedAt as string).getTime() : 0;
    const bTime = b.startedAt ? new Date(b.startedAt as string).getTime() : 0;
    return bTime - aTime;
  });

  const limited = runs.slice(0, MAX_RUNS);

  return NextResponse.json(
    { runs: limited, total: runs.length },
    { headers: CORS_HEADERS }
  );
}
