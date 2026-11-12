/**
 * pricing.ts — what the site offers (DSC-23): the plugin is free, and we set it up for a
 * client's product, priced per product.
 *
 * The setup's starting price comes from a setting, so naming or changing it needs a settings
 * change and a redeploy, not a code change:
 *   NEXT_PUBLIC_SETUP_FROM   a figure such as "€N": the site then says "from €N"; while unset it
 *                            says "priced per product"
 */

type Env = Record<string, string | undefined>;

// a literal process.env read, so Next inlines it into client bundles
const publicEnv = (): Env => ({ NEXT_PUBLIC_SETUP_FROM: process.env.NEXT_PUBLIC_SETUP_FROM });

/** "from <the figure>" once a starting price is set, else "Priced per product". */
export function setupPrice(env: Env = publicEnv()): string {
  const from = env.NEXT_PUBLIC_SETUP_FROM?.trim();
  return from ? `from ${from}` : "Priced per product";
}

/** The sponsor page (GitHub Sponsors). */
export const SPONSOR_URL = "https://github.com/sponsors/boyantsonev";

/** Where a setup conversation starts. */
export const SETUP_EMAIL = "boyan.works@gmail.com";
export const SETUP_MAILTO = `mailto:${SETUP_EMAIL}?subject=Systemix%20setup%20for%20our%20product`;
