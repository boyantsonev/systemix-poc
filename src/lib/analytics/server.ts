/**
 * server.ts — anonymous, aggregate events from the report service to PostHog.
 *
 * Only bands and flags: the score band, the size band, whether paths were redacted, the
 * mode, the CLI version. Never a path, a repo name, a token name, a license key or an IP
 * (PostHog's GeoIP is turned off per event). No person profile is created. Without
 * NEXT_PUBLIC_POSTHOG_KEY nothing is sent.
 */

type Env = Record<string, string | undefined>;
type Fetch = (url: string, init: RequestInit) => Promise<Response>;

const CAPTURE_URL = "https://eu.i.posthog.com/i/v0/e/";

/** 0–19 → "0-19", …, 80–100 → "80-100"; null when there is no score. */
export function scoreBand(score: number | null | undefined): string | null {
  if (typeof score !== "number" || !Number.isFinite(score)) return null;
  const lo = Math.min(80, Math.max(0, Math.floor(score / 20) * 20));
  return lo === 80 ? "80-100" : `${lo}-${lo + 19}`;
}

/** Audited file count, banded so a repo can't be recognised by its size. */
export function filesBand(n: unknown): string | null {
  if (typeof n !== "number" || !Number.isFinite(n) || n < 0) return null;
  if (n < 50) return "<50";
  if (n < 200) return "50-199";
  if (n < 1000) return "200-999";
  return "1000+";
}

export type ServerEvent = "score_served" | "report_delivered" | "report_refused";

export async function captureServer(
  event: ServerEvent,
  properties: Record<string, string | number | boolean | null>,
  env: Env = process.env,
  fetchImpl: Fetch = fetch,
): Promise<boolean> {
  const key = env.NEXT_PUBLIC_POSTHOG_KEY?.trim();
  if (!key) return false;
  try {
    const res = await fetchImpl(CAPTURE_URL, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        api_key: key,
        event,
        distinct_id: "systemix-report-service",
        properties: { ...properties, source: "report-service", $process_person_profile: false, $geoip_disable: true },
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}
