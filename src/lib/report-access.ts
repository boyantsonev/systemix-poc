/**
 * report-access.ts — who may get a quick report from /api/report.
 *
 * SYSTEMIX_REPORT_ACCESS picks the mode:
 *   (unset)        disabled: the service answers 503 (safe default; nothing is open by accident)
 *   open           no payment check (local development, a free promotion)
 *   lemonsqueezy   a Lemon Squeezy license key is required. A purchase of the quick-report
 *                  product issues a key; each report uses one activation, so the product's
 *                  activation limit is the number of reports a purchase buys. Needs
 *                  LEMONSQUEEZY_STORE_ID and LEMONSQUEEZY_PRODUCT_ID, so keys from any other
 *                  store or product are refused. The license API needs no secret.
 */

export type AccessMode = "disabled" | "open" | "lemonsqueezy";

export function accessMode(env: Record<string, string | undefined> = process.env): AccessMode {
  const m = (env.SYSTEMIX_REPORT_ACCESS ?? "").trim().toLowerCase();
  return m === "open" || m === "lemonsqueezy" ? m : "disabled";
}

export type LicenseCheck = { ok: true } | { ok: false; status: number; error: string };

type Fetch = (url: string, init: RequestInit) => Promise<Response>;

const LS_API = "https://api.lemonsqueezy.com/v1/licenses";
const INSTANCE = "systemix-quick-report";

async function call(fetchImpl: Fetch, action: "validate" | "activate", fields: Record<string, string>) {
  const res = await fetchImpl(`${LS_API}/${action}`, {
    method: "POST",
    headers: { accept: "application/json", "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(fields).toString(),
  });
  let json: Record<string, unknown> | null = null;
  try {
    json = (await res.json()) as Record<string, unknown>;
  } catch {
    json = null;
  }
  return { status: res.status, json };
}

const KEY_SHAPE = /^[A-Za-z0-9-]{8,80}$/;

/** Step 1, before any work: the key exists, belongs to our store and product, and has an activation left. Consumes nothing. */
export async function validateLicense(
  key: unknown,
  env: Record<string, string | undefined> = process.env,
  fetchImpl: Fetch = fetch,
): Promise<LicenseCheck> {
  const storeId = env.LEMONSQUEEZY_STORE_ID?.trim();
  const productId = env.LEMONSQUEEZY_PRODUCT_ID?.trim();
  if (!storeId || !productId) return { ok: false, status: 503, error: "the report service is not configured for payments yet" };
  if (typeof key !== "string" || !KEY_SHAPE.test(key)) return { ok: false, status: 402, error: "a license key is required: buy a quick report, then pass --key" };
  let r;
  try {
    r = await call(fetchImpl, "validate", { license_key: key });
  } catch {
    return { ok: false, status: 503, error: "the payment provider could not be reached; try again shortly" };
  }
  const j = r.json ?? {};
  const meta = (j.meta ?? {}) as Record<string, unknown>;
  const lk = (j.license_key ?? {}) as Record<string, unknown>;
  if (j.valid !== true) return { ok: false, status: 403, error: "this license key is not valid" };
  if (String(meta.store_id) !== storeId || String(meta.product_id) !== productId) {
    return { ok: false, status: 403, error: "this license key is not for the Systemix quick report" };
  }
  if (lk.status === "disabled" || lk.status === "expired") return { ok: false, status: 403, error: `this license key is ${lk.status}` };
  const limit = typeof lk.activation_limit === "number" ? lk.activation_limit : null;
  const usage = typeof lk.activation_usage === "number" ? lk.activation_usage : 0;
  if (limit !== null && usage >= limit) return { ok: false, status: 402, error: "this license key has been used for all the reports it buys" };
  return { ok: true };
}

/** Step 2, only after the report was built: use one activation. */
export async function consumeLicense(key: string, fetchImpl: Fetch = fetch): Promise<LicenseCheck> {
  let r;
  try {
    r = await call(fetchImpl, "activate", { license_key: key, instance_name: INSTANCE });
  } catch {
    return { ok: false, status: 503, error: "the payment provider could not be reached; try again shortly" };
  }
  if (r.json && r.json.activated === true) return { ok: true };
  return { ok: false, status: 402, error: "this license key has been used for all the reports it buys" };
}
