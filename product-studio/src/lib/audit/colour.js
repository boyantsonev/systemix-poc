"use strict";

// Literal colours as the audit counts them: found in text, normalized to one spelling so the same
// colour written two ways counts once. Hex, rgb()/rgba() and hsl()/hsla() become lowercase hex
// (#rrggbb, or #rrggbbaa when not opaque); oklch() and oklab() stay as lowercase strings.

const HEX = "#[0-9a-fA-F]{8}\\b|#[0-9a-fA-F]{6}\\b|#[0-9a-fA-F]{4}\\b|#[0-9a-fA-F]{3}\\b";
const FN = "(?:rgba?|hsla?|oklch|oklab)\\([^()]*\\)";
/** One literal colour anywhere in a string (use with a fresh regex: it has the g flag). */
const colourRe = () => new RegExp(`(${HEX}|${FN})`, "gi");
const isColour = (s) => new RegExp(`^(?:${HEX}|${FN})$`, "i").test(String(s).trim());

const h2 = (n) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, "0");

function num(s, scale) {
  const t = String(s).trim();
  if (t.endsWith("%")) return (parseFloat(t) / 100) * scale;
  return parseFloat(t);
}

function hslToRgb(h, s, l) {
  const k = (n) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return [f(0) * 255, f(8) * 255, f(4) * 255];
}

const withAlpha = (rgb, alpha) => "#" + rgb.map(h2).join("") + (alpha === undefined || alpha >= 1 ? "" : h2(alpha * 255));

/** The normalized spelling, or null when the text is not a colour the audit reads. */
function normalize(raw) {
  const s = String(raw).trim().toLowerCase();
  if (s.startsWith("#")) {
    let hex = s.slice(1);
    if (!/^[0-9a-f]+$/.test(hex) || ![3, 4, 6, 8].includes(hex.length)) return null;
    if (hex.length <= 4) hex = [...hex].map((c) => c + c).join("");
    if (hex.length === 8 && hex.endsWith("ff")) hex = hex.slice(0, 6);
    return "#" + hex;
  }
  const m = /^(rgba?|hsla?|oklch|oklab)\(([^()]*)\)$/.exec(s);
  if (!m) return null;
  const fn = m[1];
  const parts = m[2].replace(/[,/]/g, " ").split(/\s+/).filter(Boolean);
  if (fn === "oklch" || fn === "oklab") return `${fn}(${m[2].replace(/\s*\/\s*/g, " / ").replace(/\s*,\s*/g, " ").replace(/\s+/g, " ").trim()})`;
  if (parts.length < 3) return null;
  const alpha = parts[3] !== undefined ? num(parts[3], 1) : undefined;
  if (fn.startsWith("rgb")) {
    const rgb = parts.slice(0, 3).map((p) => num(p, 255));
    if (rgb.some((v) => !Number.isFinite(v))) return null;
    return withAlpha(rgb, alpha);
  }
  const h = parseFloat(parts[0]);
  const sat = num(parts[1], 1);
  const light = num(parts[2], 1);
  if (![h, sat, light].every(Number.isFinite)) return null;
  const norm = (v) => (v > 1 ? v / 100 : v); // hsl(200 50 40) without % means percent
  return withAlpha(hslToRgb(((h % 360) + 360) % 360, norm(sat), norm(light)), alpha);
}

module.exports = { colourRe, isColour, normalize };
