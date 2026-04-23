// TASK 3 — BAST-160: GET /api/run/[id]/stream
// SSE endpoint. Tails the log file for the given run ID, streaming new lines
// as they arrive. Sends a final 'done' event when the process exits.

import { NextRequest } from "next/server";
import { existsSync, readFileSync, statSync, watchFile, unwatchFile } from "fs";
import path from "path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RUNS_DIR = path.join(process.cwd(), ".systemix", "runs");
const POLL_INTERVAL_MS = 200;

const SSE_HEADERS = {
  "Content-Type": "text/event-stream",
  "Cache-Control": "no-cache, no-transform",
  "Connection": "keep-alive",
  "X-Accel-Buffering": "no",
  // CORS for Figma plugin iframe
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: SSE_HEADERS });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // Sanitize ID to prevent path traversal
  if (!id || !/^[0-9a-f-]{36}$/.test(id)) {
    return new Response(
      `data: ${JSON.stringify({ type: "error", message: "Invalid run ID" })}\n\n`,
      { status: 400, headers: SSE_HEADERS }
    );
  }

  const runFile = path.join(RUNS_DIR, `${id}.json`);
  const logFile = path.join(RUNS_DIR, `${id}.log`);

  if (!existsSync(runFile)) {
    return new Response(
      `data: ${JSON.stringify({ type: "error", message: "Run not found" })}\n\n`,
      { status: 404, headers: SSE_HEADERS }
    );
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      function enqueue(payload: Record<string, unknown>) {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
        } catch {
          // Controller may already be closed if client disconnected
        }
      }

      function close() {
        try {
          controller.close();
        } catch {
          // Already closed
        }
      }

      // Track byte offset into the log file so we only emit new lines
      let logOffset = 0;

      function readNewLogLines() {
        if (!existsSync(logFile)) return;
        try {
          const stat = statSync(logFile);
          const fileSize = stat.size;

          if (fileSize <= logOffset) return;

          const fullContent = readFileSync(logFile, "utf8");
          const newContent = fullContent.slice(logOffset);
          logOffset = Buffer.byteLength(fullContent, "utf8");

          const lines = newContent.split("\n");
          for (const line of lines) {
            if (line.trim() === "") continue;
            enqueue({ type: "log", line, ts: Date.now() });
          }
        } catch {
          // Skip read errors
        }
      }

      function readRunManifest(): {
        status: string;
        exitCode?: number;
        summary?: string;
      } | null {
        try {
          return JSON.parse(readFileSync(runFile, "utf8"));
        } catch {
          return null;
        }
      }

      // Check if the run is already completed before we start polling
      const initial = readRunManifest();
      if (!initial) {
        enqueue({ type: "error", message: "Failed to read run manifest" });
        close();
        return;
      }

      // If already finished: flush the full log then send done
      if (initial.status === "success" || initial.status === "error") {
        readNewLogLines();
        enqueue({
          type: "done",
          exitCode: initial.exitCode ?? (initial.status === "success" ? 0 : -1),
          summary: initial.summary ?? "",
        });
        close();
        return;
      }

      // Still running: poll the log file for new content
      const interval = setInterval(() => {
        readNewLogLines();

        const manifest = readRunManifest();
        if (!manifest) return;

        if (manifest.status === "success" || manifest.status === "error") {
          // Drain any remaining log lines written before the status flip
          readNewLogLines();

          enqueue({
            type: "done",
            exitCode: manifest.exitCode ?? (manifest.status === "success" ? 0 : -1),
            summary: manifest.summary ?? "",
          });

          clearInterval(interval);
          close();
        }
      }, POLL_INTERVAL_MS);

      // Clean up on client disconnect
      request.signal.addEventListener("abort", () => {
        clearInterval(interval);
        close();
      });
    },
  });

  return new Response(stream, { headers: SSE_HEADERS });
}
