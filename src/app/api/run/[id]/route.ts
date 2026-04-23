// TASK 4 — BAST-161: GET /api/run/[id]
// Returns the run manifest JSON for a given run ID.

import { NextResponse } from "next/server";
import { existsSync, readFileSync } from "fs";
import path from "path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RUNS_DIR = path.join(process.cwd(), ".systemix", "runs");

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!id || typeof id !== "string") {
    return NextResponse.json(
      { error: "Missing run ID" },
      { status: 400, headers: CORS_HEADERS }
    );
  }

  // Sanitize: only allow UUID-shaped IDs to prevent path traversal
  if (!/^[0-9a-f-]{36}$/.test(id)) {
    return NextResponse.json(
      { error: "Invalid run ID format" },
      { status: 400, headers: CORS_HEADERS }
    );
  }

  const runFile = path.join(RUNS_DIR, `${id}.json`);

  if (!existsSync(runFile)) {
    return NextResponse.json(
      { error: "Run not found", runId: id },
      { status: 404, headers: CORS_HEADERS }
    );
  }

  try {
    const data = JSON.parse(readFileSync(runFile, "utf8"));
    return NextResponse.json(data, { headers: CORS_HEADERS });
  } catch {
    return NextResponse.json(
      { error: "Failed to read run manifest" },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}
