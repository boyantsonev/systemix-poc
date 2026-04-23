// TASK 2 — BAST-159: POST /api/run
// Accepts a skill slug, spawns the child process, streams output to a log file,
// and returns a runId the caller can use to poll /api/run/[id] or stream /api/run/[id]/stream.

import { NextResponse } from "next/server";
import { spawn } from "child_process";
import { writeFileSync, mkdirSync, appendFileSync } from "fs";
import path from "path";
import { getSkill, SKILL_MAP } from "@/lib/skill-map";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RUNS_DIR = path.join(process.cwd(), ".systemix", "runs");

// CORS headers for Figma plugin iframe (different origin)
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

export async function POST(request: Request) {
  let body: { skill?: string; context?: Record<string, unknown> };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400, headers: CORS_HEADERS }
    );
  }

  const { skill: skillSlug, context } = body;

  if (!skillSlug || typeof skillSlug !== "string") {
    return NextResponse.json(
      { error: "Missing required field: skill" },
      { status: 400, headers: CORS_HEADERS }
    );
  }

  const skillDef = getSkill(skillSlug);
  if (!skillDef) {
    return NextResponse.json(
      { error: `Unknown skill: ${skillSlug}`, available: Object.keys(SKILL_MAP) },
      { status: 404, headers: CORS_HEADERS }
    );
  }

  // Generate a unique run ID
  const runId = crypto.randomUUID();
  const startedAt = new Date().toISOString();

  // Ensure runs directory exists
  mkdirSync(RUNS_DIR, { recursive: true });

  const runFile = path.join(RUNS_DIR, `${runId}.json`);
  const logFile = path.join(RUNS_DIR, `${runId}.log`);

  // Write initial run manifest
  const runManifest = {
    runId,
    skill: skillSlug,
    label: skillDef.label,
    status: "running",
    startedAt,
    pid: null as number | null,
    context: context ?? null,
  };
  writeFileSync(runFile, JSON.stringify(runManifest, null, 2), "utf8");

  // Spawn child process (non-blocking)
  const child = spawn(skillDef.command, skillDef.args ?? [], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      ...(skillDef.env ?? {}),
    },
    shell: false,
    detached: false,
  });

  // Update manifest with PID
  runManifest.pid = child.pid ?? null;
  writeFileSync(runFile, JSON.stringify(runManifest, null, 2), "utf8");

  // Collect last non-empty stdout line for summary
  let lastStdoutLine = "";

  // Stream stdout to log file
  child.stdout?.on("data", (chunk: Buffer) => {
    const text = chunk.toString();
    appendFileSync(logFile, text, "utf8");
    const lines = text.split("\n").filter((l) => l.trim() !== "");
    if (lines.length > 0) {
      lastStdoutLine = lines[lines.length - 1];
    }
  });

  // Stream stderr to same log file
  child.stderr?.on("data", (chunk: Buffer) => {
    const text = chunk.toString();
    appendFileSync(logFile, text, "utf8");
  });

  // On process exit: update manifest with final status
  child.on("close", (exitCode: number | null) => {
    const completedAt = new Date().toISOString();
    const status = exitCode === 0 ? "success" : "error";

    const finalManifest = {
      ...runManifest,
      status,
      completedAt,
      exitCode: exitCode ?? -1,
      summary: lastStdoutLine || `Process exited with code ${exitCode ?? -1}`,
    };

    try {
      writeFileSync(runFile, JSON.stringify(finalManifest, null, 2), "utf8");
    } catch {
      // Best-effort — if the write fails we don't crash the server
    }
  });

  child.on("error", (err: Error) => {
    const completedAt = new Date().toISOString();
    const finalManifest = {
      ...runManifest,
      status: "error",
      completedAt,
      exitCode: -1,
      summary: err.message,
    };

    try {
      writeFileSync(runFile, JSON.stringify(finalManifest, null, 2), "utf8");
      appendFileSync(logFile, `\nProcess error: ${err.message}\n`, "utf8");
    } catch {
      // Best-effort
    }
  });

  // Return immediately — client polls /api/run/[id] or streams /api/run/[id]/stream
  return NextResponse.json(
    {
      runId,
      skill: skillSlug,
      label: skillDef.label,
      status: "started",
      startedAt,
    },
    { status: 202, headers: CORS_HEADERS }
  );
}
