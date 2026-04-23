// POST /api/bundle — accepts ExtractedCollection[] from the Figma plugin, saves to .systemix/bundle.json
// GET /api/bundle — returns the saved bundle or 404 if not yet saved

import { NextResponse } from "next/server";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import path from "path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// CORS headers — plugin iframe is a different origin
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const SYSTEMIX_DIR = path.join(process.cwd(), ".systemix");
const BUNDLE_FILE = path.join(SYSTEMIX_DIR, "bundle.json");

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

export async function GET() {
  if (!existsSync(BUNDLE_FILE)) {
    return NextResponse.json(
      { error: "No bundle yet. Extract variables from the Figma plugin first." },
      { status: 404, headers: CORS_HEADERS }
    );
  }

  try {
    const raw = readFileSync(BUNDLE_FILE, "utf8");
    const bundle = JSON.parse(raw);
    return NextResponse.json(bundle, { headers: CORS_HEADERS });
  } catch {
    return NextResponse.json(
      { error: "Bundle file is corrupt" },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400, headers: CORS_HEADERS }
    );
  }

  // Basic validation: must be an array of collections
  if (!Array.isArray(body)) {
    return NextResponse.json(
      { error: "Body must be an array of ExtractedCollection objects" },
      { status: 400, headers: CORS_HEADERS }
    );
  }

  mkdirSync(SYSTEMIX_DIR, { recursive: true });

  const bundle = {
    savedAt: new Date().toISOString(),
    collections: body,
  };

  writeFileSync(BUNDLE_FILE, JSON.stringify(bundle, null, 2), "utf8");

  const totalTokens = (body as Array<{ variables?: unknown[] }>).reduce(
    (n, col) => n + (col.variables?.length ?? 0),
    0
  );

  return NextResponse.json(
    { ok: true, savedAt: bundle.savedAt, collections: body.length, tokens: totalTokens },
    { status: 200, headers: CORS_HEADERS }
  );
}
