import { NextResponse } from "next/server";

// The local app's mutating routes write the repo and spawn skills, so they only
// answer same-origin requests addressed to a loopback host. The body must be
// JSON: a browser can't send that cross-site without a CORS preflight, and these
// routes never grant one. Non-browser callers (curl, scripts) send no Origin.

const LOOPBACK = new Set(["localhost", "127.0.0.1", "[::1]"]);

/** "localhost:3001" → "localhost", "[::1]:3001" → "[::1]". */
function hostname(host: string): string {
  const m = /^(\[[^\]]*\]|[^:]*)(?::\d*)?$/.exec(host.trim().toLowerCase());
  return m ? m[1] : "";
}

function deny(status: number, error: string) {
  return NextResponse.json({ ok: false, error }, { status });
}

/** null when the request may proceed, else the 403/415 response to return. */
export function rejectNonLocal(
  req: Request,
  { json = true }: { json?: boolean } = {},
): NextResponse | null {
  // a deployed site is never local, whatever Host a request claims
  if (process.env.VERCEL) return deny(403, "This route only answers on localhost.");
  const host = (req.headers.get("host") ?? new URL(req.url).host).toLowerCase();
  if (!LOOPBACK.has(hostname(host))) return deny(403, "This route only answers on localhost.");

  const origin = req.headers.get("origin");
  if (origin !== null) {
    let originHost = "";
    try {
      originHost = new URL(origin).host;
    } catch {
      // "null" (sandboxed/opaque origins) or garbage — never same-origin
    }
    if (originHost !== host) return deny(403, "Cross-origin requests are not allowed.");
  }

  const site = req.headers.get("sec-fetch-site");
  if (site !== null && site !== "same-origin" && site !== "none") {
    return deny(403, "Cross-origin requests are not allowed.");
  }

  if (json) {
    const type = (req.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
    if (type !== "application/json") return deny(415, "Expected Content-Type: application/json.");
  }
  return null;
}
