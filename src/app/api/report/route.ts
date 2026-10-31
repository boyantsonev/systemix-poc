import { NextResponse, after } from "next/server";
import { accessMode, consumeLicense, validateLicense } from "@/lib/report-access";
import { quickReportCheckoutUrl, quickReportPrice } from "@/lib/pricing";
import { captureServer, filesBand, scoreBand, type ServerEvent } from "@/lib/analytics/server";

/**
 * POST /api/report — the free score and the paid quick report.
 *
 * In lemonsqueezy mode a request without a license key gets the free score (overall and
 * area scores, plus how many caveats the full report holds); with a key it gets the full
 * report and uses one activation. Open mode always returns the full report.
 *
 * Body: { counters: <the `audit counters` JSON>, licenseKey?: string }. The client's own
 * machine ran the scan; this route sees counts, counter definitions, file paths and short
 * identifiers, never source code. It keeps no copy of the file and logs nothing from it.
 * Deterministic: the report is a pure function of the counters (no model call).
 * Analytics: one anonymous event per request (score band, size band, mode; see
 * src/lib/analytics/server.ts), never a path, name or key.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BYTES = 3_000_000;

const err = (status: number, error: string) => NextResponse.json({ error }, { status });

/** Send an anonymous aggregate event after the response (outside a request, e.g. in tests, fire and forget). */
function track(event: ServerEvent, props: Record<string, string | number | boolean | null>) {
  const send = () => captureServer(event, props).then(() => undefined);
  try {
    after(send);
  } catch {
    void send();
  }
}

type Counters = { toolVersion?: unknown; scope?: { tokenSource?: { path?: unknown } }; counters?: { id?: unknown; value?: unknown }[] };

/** The bands an event may carry: nothing that names a file, a token or the repo. */
function bandsOf(counters: Counters) {
  const audited = Array.isArray(counters.counters) ? counters.counters.find((c) => c && c.id === "census.files.audited")?.value : null;
  const tokenPath = counters.scope?.tokenSource?.path;
  return {
    files_band: filesBand(audited),
    redacted: typeof tokenPath === "string" && tokenPath.startsWith("path-"),
    cli_version: typeof counters.toolVersion === "string" ? counters.toolVersion.slice(0, 20) : null,
  };
}

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

  // no key in paid mode → the free score (no payment provider call); a key → the full report
  const hasKey = typeof body.licenseKey === "string" && body.licenseKey.trim() !== "";
  const preview = mode === "lemonsqueezy" && !hasKey;
  const buyUrl = quickReportCheckoutUrl();

  if (mode === "lemonsqueezy" && !preview) {
    const check = await validateLicense(body.licenseKey);
    if (!check.ok) {
      track("report_refused", { status: check.status, mode, ...bandsOf(body.counters as Counters) });
      return NextResponse.json({ error: check.error, buyUrl }, { status: check.status });
    }
  }

  const { build } = await import("../../../../packages/cli/src/lib/quick-report.js");
  let report: { scored: boolean; preview?: boolean; overall: number | null; markdown: string };
  try {
    report = build(body.counters, { preview, buyUrl });
  } catch {
    return err(422, "the results file could not be scored (is it from a supported CLI version?)");
  }

  // charge only for a full report that was actually produced
  if (mode === "lemonsqueezy" && !preview && report.scored) {
    const used = await consumeLicense(String(body.licenseKey));
    if (!used.ok) {
      track("report_refused", { status: used.status, mode, ...bandsOf(body.counters as Counters) });
      return NextResponse.json({ error: used.error, buyUrl }, { status: used.status });
    }
  }

  // report_delivered is the paid outcome only; open mode's full reports count as scores
  const paid = mode === "lemonsqueezy" && !preview;
  track(paid ? "report_delivered" : "score_served", {
    mode,
    full: !report.preview,
    scored: report.scored,
    score_band: scoreBand(report.overall),
    for_sale: Boolean(buyUrl),
    price: quickReportPrice(),
    ...bandsOf(body.counters as Counters),
  });

  return NextResponse.json({
    scored: report.scored,
    preview: Boolean(report.preview),
    overall: report.overall,
    markdown: report.markdown,
    buyUrl,
    price: quickReportPrice(),
  });
}
