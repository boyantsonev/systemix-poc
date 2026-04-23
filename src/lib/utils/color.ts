/**
 * color.ts — hex ↔ oklch conversion utilities
 *
 * Algorithm: hex → sRGB → linear RGB → XYZ D65 → OKLab → OKLCH
 * Reference: Björn Ottosson's OKLab specification (bottosson.github.io/posts/oklab)
 */

// ── sRGB gamma ────────────────────────────────────────────────────────────────

function toLinear(c: number): number {
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

function toGamma(c: number): number {
  return c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
}

// ── hex → OKLCH ───────────────────────────────────────────────────────────────

export type OklchColor = { l: number; c: number; h: number };

export function hexToOklch(hex: string): OklchColor {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.slice(0, 2), 16) / 255;
  const g = parseInt(clean.slice(2, 4), 16) / 255;
  const b = parseInt(clean.slice(4, 6), 16) / 255;

  // sRGB → linear RGB
  const lr = toLinear(r);
  const lg = toLinear(g);
  const lb = toLinear(b);

  // Linear RGB → XYZ D65 (using OKLab's intermediate matrix)
  const x = 0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb;
  const y = 0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb;
  const z = 0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb;

  // XYZ → OKLab (cube root of cone responses)
  const l = Math.cbrt(0.8189330101 * x + 0.3618667424 * y - 0.1288597137 * z);
  const m = Math.cbrt(0.0329845436 * x + 0.9293118715 * y + 0.0361456387 * z);
  const s = Math.cbrt(0.0482003018 * x + 0.2643662691 * y + 0.6338517070 * z);

  const L = 0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s;
  const a = 1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s;
  const bv = 0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s;

  // OKLab → OKLCH
  const C = Math.sqrt(a * a + bv * bv);
  const hRaw = (Math.atan2(bv, a) * 180) / Math.PI;
  const H = hRaw < 0 ? hRaw + 360 : hRaw;

  return {
    l: Math.round(L * 1000) / 10,   // 0–100 with 1 decimal
    c: Math.round(C * 10000) / 10000, // 4 decimals
    h: Math.round(H * 10) / 10,      // 1 decimal
  };
}

/** Format an OklchColor as a CSS oklch() string */
export function formatOklch({ l, c, h }: OklchColor): string {
  return `oklch(${l}% ${c} ${h})`;
}

/** Convert a hex value and return the CSS oklch() string */
export function hexToOklchString(hex: string): string {
  return formatOklch(hexToOklch(hex));
}

// ── OKLCH → hex ───────────────────────────────────────────────────────────────

export function oklchToHex(l: number, c: number, h: number): string {
  const L = l / 100;
  const hRad = (h * Math.PI) / 180;
  const a = c * Math.cos(hRad);
  const b = c * Math.sin(hRad);

  // OKLab → cone responses
  const lp = L + 0.3963377774 * a + 0.2158037573 * b;
  const mp = L - 0.1055613458 * a - 0.0638541728 * b;
  const sp = L - 0.0894841775 * a - 1.2914855480 * b;

  const lc = lp * lp * lp;
  const mc = mp * mp * mp;
  const sc = sp * sp * sp;

  // Cone responses → linear RGB
  const lr =  4.0767416621 * lc - 3.3077115913 * mc + 0.2309699292 * sc;
  const lg = -1.2684380046 * lc + 2.6097574011 * mc - 0.3413193965 * sc;
  const lb = -0.0041960863 * lc - 0.7034186147 * mc + 1.7076147010 * sc;

  // Linear → sRGB → hex
  const r = Math.round(Math.max(0, Math.min(1, toGamma(lr))) * 255);
  const g = Math.round(Math.max(0, Math.min(1, toGamma(lg))) * 255);
  const bInt = Math.round(Math.max(0, Math.min(1, toGamma(lb))) * 255);

  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${bInt.toString(16).padStart(2, "0")}`;
}

// ── Delta E (perceptual distance) ─────────────────────────────────────────────

/**
 * Approximate perceptual distance between two hex colors via OKLab.
 * Returns 0 (identical) to ~1 (maximally different).
 * < 0.02 = nearly identical; < 0.05 = subtle; > 0.1 = clearly different.
 */
export function deltaE(hex1: string, hex2: string): number {
  const a = hexToOklch(hex1);
  const b = hexToOklch(hex2);
  const aL = a.l / 100, bL = b.l / 100;
  const aA = a.c * Math.cos((a.h * Math.PI) / 180);
  const aB = a.c * Math.sin((a.h * Math.PI) / 180);
  const bA = b.c * Math.cos((b.h * Math.PI) / 180);
  const bB = b.c * Math.sin((b.h * Math.PI) / 180);
  return Math.sqrt((aL - bL) ** 2 + (aA - bA) ** 2 + (aB - bB) ** 2);
}

/** Human-readable drift label from delta E */
export function driftLabel(de: number): string {
  if (de < 0.005) return "identical";
  if (de < 0.02)  return "nearly identical";
  if (de < 0.05)  return "subtle";
  if (de < 0.10)  return "noticeable";
  if (de < 0.20)  return "significant";
  return "critical";
}
