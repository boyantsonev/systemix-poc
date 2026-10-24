import { NextResponse } from "next/server";
import { accessMode, consumeLicense, validateLicense } from "@/lib/report-access";

/**
 * POST /api/report — the paid quick report.
 *
 * Body: { counters: <the `audit counters` JSON>, licenseKey?: string }. The client's own
 * machine ran the scan; this route sees counts, counter definitions, file paths and short
 * identifiers, never source code. It stores nothing and logs nothing from the body.
 * Deterministic: the report is a pure function of the counters (no model call).
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BYTES = 3_000_000;

const err = (status: number, error: string) => NextResponse.json({ error }, { status });

export async function POST(req: Request) {
  const mode = accessMode();
  if (mode === "disabled") return err(503, "the quick-report service is not open yet");

  const declared = Number(req.headers.get("content-length") ?? 0);
  if (declared > MAX_BYTES) return err(413, "the results file is too large");
  const text = await req.text();
  if (Buffer.byteLength(text) > MAX_BYTES) return err(413, "the results file is too large");

  let body: { counters?: unknown; licenseKey?: unknown };
  try {
    body = JSON.parse(text);
  } catch {
    return err(400, "the body is not JSON");
  }
  if (!body || typeof body !== "object" || !body.counters || typeof body.counters !== "object") {
    return err(400, "send { counters: <the audit counters JSON> }");
  }

  const { validateReport } = await import("../../../../packages/cli/src/lib/counters/counter.js");
  const problems: string[] = validateReport(body.counters);
  if (problems.length) return err(400, `the results file is not a valid counters report: ${problems.slice(0, 3).join("; ")}`);

  if (mode === "lemonsqueezy") {
    const check = await validateLicense(body.licenseKey);
    if (!check.ok) return err(check.status, check.error);
  }

  const { build } = await import("../../../../packages/cli/src/lib/quick-report.js");
  let report: { scored: boolean; overall: number | null; markdown: string };
  try {
    report = build(body.counters);
  } catch {
    return err(422, "the results file could not be scored (is it from a supported CLI version?)");
  }

  // charge only for a report that was actually produced
  if (mode === "lemonsqueezy" && report.scored) {
    const used = await consumeLicense(String(body.licenseKey));
    if (!used.ok) return err(used.status, used.error);
  }

  return NextResponse.json({ scored: report.scored, overall: report.overall, markdown: report.markdown });
}
