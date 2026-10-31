/**
 * pricing.ts — every price the site shows, in one place.
 *
 * The quick report's price and checkout link come from settings, so a price change in
 * Lemon Squeezy needs a settings change and a redeploy, not a code change:
 *   NEXT_PUBLIC_QUICK_REPORT_PRICE         shown price, e.g. "€9.99" (default below)
 *   NEXT_PUBLIC_QUICK_REPORT_CHECKOUT_URL  the Lemon Squeezy checkout link; while unset the
 *                                          site says "coming soon" and the CLI says it is not on sale
 * The charge itself is whatever Lemon Squeezy is set to; keep the two in step.
 */

export const DEFAULT_QUICK_REPORT_PRICE = "€9.99";

type Env = Record<string, string | undefined>;

// literal process.env reads, so Next inlines them into client bundles
const publicEnv = (): Env => ({
  NEXT_PUBLIC_QUICK_REPORT_PRICE: process.env.NEXT_PUBLIC_QUICK_REPORT_PRICE,
  NEXT_PUBLIC_QUICK_REPORT_CHECKOUT_URL: process.env.NEXT_PUBLIC_QUICK_REPORT_CHECKOUT_URL,
});

export function quickReportPrice(env: Env = publicEnv()): string {
  return env.NEXT_PUBLIC_QUICK_REPORT_PRICE?.trim() || DEFAULT_QUICK_REPORT_PRICE;
}

/** The checkout link, or null while the report is not on sale. Only https links count. */
export function quickReportCheckoutUrl(env: Env = publicEnv()): string | null {
  const raw = env.NEXT_PUBLIC_QUICK_REPORT_CHECKOUT_URL?.trim();
  if (!raw) return null;
  try {
    return new URL(raw).protocol === "https:" ? raw : null;
  } catch {
    return null;
  }
}

export const FULL_AUDIT = { price: "€499", turnaround: "24h", turnaroundLong: "24 hours" } as const;

/** The design sprint: a fixed 3-day sprint (DSC-20). */
export const SPRINT = { price: "€990", length: "3 days" } as const;

/** The command that gets the free score: computed on the user's machine, nothing sent (DSC-22 D1). */
export const FREE_SCORE_COMMAND = "npx @getsystemix/cli audit report --dirs src";
