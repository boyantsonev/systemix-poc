// TASK 2 — BAST-159: POST /api/run
// Accepts a skill slug, spawns the child process, streams output to a log file,
// and returns a runId the caller can use to poll /api/run/[id] or stream /api/run/[id]/stream.

import { NextResponse } from "next/server";
import { spawn } from "child_process";
import { existsSync, writeFileSync, mkdirSync, appendFileSync } from "fs";
import path from "path";
import { getSkill, runnableAt, SKILL_MAP } from "@/lib/skill-map";
import { rejectNonLocal } from "@/lib/local-request";
import { loadInstanceConfig } from "@/lib/state/instance-config";
import { tierLabel } from "@/lib/contract/write-policy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RUNS_DIR = path.join(process.cwd(), ".systemix", "runs");

export async function POST(request: Request) {
  const denied = rejectNonLocal(request);
  if (denied) return denied;

  let body: { skill?: string; context?: Record<string, unknown> };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  // Skill runs spawn child processes and persist to .systemix/runs/ — neither
  // survives on Vercel serverless. The deployed demo degrades to a pointer at
  // the local app; the UI renders play buttons disabled off this same 503.
  if (process.env.VERCEL) {
    return NextResponse.json(
      { error: "Skill runs execute in the local app — npx @getsystemix/cli init" },
      { status: 503 }
    );
  }

  const { skill: skillSlug, context } = body;

  if (!skillSlug || typeof skillSlug !== "string") {
    return NextResponse.json(
      { error: "Missing required field: skill" },
      { status: 400 }
    );
  }

  const skillDef = getSkill(skillSlug);
  if (!skillDef) {
    return NextResponse.json(
      { error: `Unknown skill: ${skillSlug}`, available: Object.keys(SKILL_MAP) },
      { status: 404 }
    );
  }

  // The autonomy dial is enforced here, not only by which chips the UI shows.
  const configured = loadInstanceConfig()?.trust?.hermes_tier;
  const tier = typeof configured === "number" && Number.isFinite(configured) ? configured : 0;
  if (!runnableAt(skillDef, tier)) {
    return NextResponse.json(
      {
        error: `${skillDef.label} needs ${tierLabel(skillDef.minTier ?? 0)} autonomy (instance is ${tierLabel(tier)}).`,
      },
      { status: 403 }
    );
  }

  // Preflight: spawned skills resolve bare imports against <cwd>/node_modules.
  // In a git worktree without its own `npm install`, Node walks UP into the
  // parent repo's node_modules and fails with ERR_MODULE_NOT_FOUND against a
  // different checkout. Fail fast with the actual fix instead.
  if (!existsSync(path.join(process.cwd(), "node_modules", "next"))) {
    return NextResponse.json(
      {
        error:
          "This workspace has no installed dependencies (git worktree?). Run `npm install` in " +
          process.cwd() +
          " first — spawned skills resolve modules against this directory.",
      },
      { status: 503 }
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
    { status: 202 }
  );
}
