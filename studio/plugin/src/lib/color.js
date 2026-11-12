"use strict";

/**
 * color.js: parse a CSS colour into sRGB and measure WCAG 2.x contrast.
 *
 *   parse("#0f172a" | "rgb(…)" | "hsl(…)" | "oklch(…)" | "oklab(…)") → { r, g, b, a } (0..1, gamma-encoded sRGB) | null
 *   luminance(c)        WCAG relative luminance
 *   contrast(fg, bg)    WCAG contrast ratio, unrounded; a translucent fg is composited over bg
 *   round2(n)           the 2-decimal rounding every output uses
 *   toCss(c)            "rgb(r g b)" or "rgb(r g b / a)", for a swatch
 *
 * oklch and oklab go through the standard OKLab → linear sRGB matrices; a colour outside the
 * sRGB gamut is clamped per channel. Anything else (a name, a var(), color-mix()) is null:
 * an unparseable colour is reported, never guessed.
 */

const clamp01 = (x) => Math.min(1, Math.max(0, x));
const NAMED = { black: "#000000", white: "#ffffff", transparent: "#00000000" };

/** A number, a percentage (against `pct`), or `none` (0). NaN when unreadable. */
function num(s, pct = 1) {
  const t = String(s).trim().toLowerCase();
  if (t === "none") return 0;
  const m = /^([+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?)(%?)$/.exec(t);
  if (!m) return NaN;
  const v = Number(m[1]);
  return m[2] ? (v / 100) * pct : v;
}

/** An angle in degrees: bare, deg, grad, rad or turn. */
function hue(s) {
  const t = String(s).trim().toLowerCase();
  if (t === "none") return 0;
  const m = /^([+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?)(deg|grad|rad|turn)?$/.exec(t);
  if (!m) return NaN;
  const v = Number(m[1]);
  const unit = m[2] || "deg";
  const deg = unit === "deg" ? v : unit === "grad" ? v * 0.9 : unit === "rad" ? (v * 180) / Math.PI : v * 360;
  return ((deg % 360) + 360) % 360;
}

/** The arguments of a colour function: comma or space separated, with an optional `/ alpha`. */
function args(body) {
  const b = body.trim();
  let parts;
  let alpha = null;
  if (b.includes(",")) {
    parts = b.split(",").map((x) => x.trim());
    if (parts.length === 4) alpha = parts.pop();
  } else {
    const [main, a, extra] = b.split("/");
    if (extra !== undefined) return null;
    parts = main.trim().split(/\s+/);
    if (a !== undefined) alpha = a.trim();
  }
  if (parts.length !== 3 || parts.some((p) => p === "")) return null;
  return { parts, alpha };
}

const alphaOf = (s) => (s === null ? 1 : num(s, 1));

function fromHex(t) {
  const h = t.slice(1);
  if (!/^[0-9a-f]+$/i.test(h) || ![3, 4, 6, 8].includes(h.length)) return null;
  const full = h.length <= 4 ? [...h].map((c) => c + c).join("") : h;
  const n = (i) => parseInt(full.slice(i, i + 2), 16) / 255;
  return { r: n(0), g: n(2), b: n(4), a: full.length === 8 ? n(6) : 1 };
}

function hslToRgb(h, s, l) {
  const k = (n) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return { r: f(0), g: f(8), b: f(4) };
}

const encode = (x) => (x <= 0.0031308 ? 12.92 * x : 1.055 * Math.pow(x, 1 / 2.4) - 0.055);

/** OKLab → gamma-encoded sRGB, clamped to the gamut. */
function oklabToRgb(L, a, b) {
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;
  const l = l_ ** 3;
  const m = m_ ** 3;
  const s = s_ ** 3;
  const lr = 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
  const lg = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  const lb = -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s;
  return { r: clamp01(encode(clamp01(lr))), g: clamp01(encode(clamp01(lg))), b: clamp01(encode(clamp01(lb))) };
}

/** Parse a CSS colour. null when it is not one this module reads. */
function parse(input) {
  if (typeof input !== "string") return null;
  const t = input.trim().toLowerCase();
  if (NAMED[t]) return fromHex(NAMED[t]);
  if (t.startsWith("#")) return fromHex(t);
  const m = /^(rgba?|hsla?|oklch|oklab)\(([^()]*)\)$/.exec(t);
  if (!m) return null;
  const a = args(m[2]);
  if (!a) return null;
  const alpha = alphaOf(a.alpha);
  const [p0, p1, p2] = a.parts;
  let rgb;
  if (m[1].startsWith("rgb")) {
    const ch = (p) => num(p, 255) / 255;
    rgb = { r: ch(p0), g: ch(p1), b: ch(p2) };
  } else if (m[1].startsWith("hsl")) {
    const h = hue(p0);
    const s = num(p1, 100) / 100;
    const l = num(p2, 100) / 100;
    if ([h, s, l].some(Number.isNaN)) return null;
    rgb = hslToRgb(h, clamp01(s), clamp01(l));
  } else if (m[1] === "oklch") {
    const L = num(p0, 1);
    const C = num(p1, 0.4);
    const H = hue(p2);
    if ([L, C, H].some(Number.isNaN)) return null;
    const rad = (H * Math.PI) / 180;
    rgb = oklabToRgb(clamp01(L), Math.max(0, C) * Math.cos(rad), Math.max(0, C) * Math.sin(rad));
  } else {
    const L = num(p0, 1);
    const A = num(p1, 0.4);
    const B = num(p2, 0.4);
    if ([L, A, B].some(Number.isNaN)) return null;
    rgb = oklabToRgb(clamp01(L), A, B);
  }
  if ([rgb.r, rgb.g, rgb.b, alpha].some(Number.isNaN)) return null;
  return { r: clamp01(rgb.r), g: clamp01(rgb.g), b: clamp01(rgb.b), a: clamp01(alpha) };
}

const lin = (c) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));

/** WCAG 2.x relative luminance of an opaque colour. */
const luminance = (c) => 0.2126 * lin(c.r) + 0.7152 * lin(c.g) + 0.0722 * lin(c.b);

/** fg over bg (source-over). */
const over = (fg, bg) => ({ r: fg.r * fg.a + bg.r * (1 - fg.a), g: fg.g * fg.a + bg.g * (1 - fg.a), b: fg.b * fg.a + bg.b * (1 - fg.a), a: 1 });

const WHITE = { r: 1, g: 1, b: 1, a: 1 };

/** WCAG contrast ratio (1..21), unrounded. A translucent bg sits on white, a translucent fg on bg. */
function contrast(fg, bg) {
  const b = bg.a < 1 ? over(bg, WHITE) : bg;
  const f = fg.a < 1 ? over(fg, b) : fg;
  const l1 = luminance(f);
  const l2 = luminance(b);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

const round2 = (n) => Math.round(n * 100 + 1e-9) / 100;

const byte = (x) => Math.round(clamp01(x) * 255);

/** A safe CSS colour for a swatch: only digits, never the raw input. */
const toCss = (c) => (c.a < 1 ? `rgb(${byte(c.r)} ${byte(c.g)} ${byte(c.b)} / ${round2(c.a)})` : `rgb(${byte(c.r)} ${byte(c.g)} ${byte(c.b)})`);

/** Two colours equal at 8 bits per channel. */
const same = (x, y) => byte(x.r) === byte(y.r) && byte(x.g) === byte(y.g) && byte(x.b) === byte(y.b) && byte(x.a) === byte(y.a);

module.exports = { parse, luminance, contrast, round2, toCss, same };
