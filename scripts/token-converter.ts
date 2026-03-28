/**
 * token-converter.ts
 * Parses globals.css oklch tokens → converts to hex/rgba → writes tokens.bridge.json
 *
 * Usage: npx ts-node scripts/token-converter.ts
 *   or:  node --loader ts-node/esm scripts/token-converter.ts
 */

import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

// @ts-ignore — culori has full types but ts-node resolution can vary
import { parse as parseColor, formatHex, converter } from "culori";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, "..");

// ── Parse globals.css ──────────────────────────────────────────────────────

const css = readFileSync(join(ROOT, "src/app/globals.css"), "utf8");

/**
 * Extract all --var: value; pairs from a CSS block string.
 */
function extractVars(block: string): Record<string, string> {
  const result: Record<string, string> = {};
  const re = /--([a-zA-Z0-9_-]+)\s*:\s*([^;]+);/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(block)) !== null) {
    result[m[1].trim()] = m[2].trim();
  }
  return result;
}

/** Pull a CSS block by selector, matching "selector {" (not substring matches) */
function extractBlock(css: string, selector: string): string {
  // Match "selector {" or "selector\n{" to avoid false positives like .dark inside @custom-variant
  const re = new RegExp(selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\s*\\{");
  const match = re.exec(css);
  if (!match) return "";
  const start = match.index + match[0].length - 1; // position of "{"
  let depth = 0;
  let i = start;
  while (i < css.length) {
    if (css[i] === "{") depth++;
    else if (css[i] === "}") {
      depth--;
      if (depth === 0) return css.slice(start + 1, i);
    }
    i++;
  }
  return "";
}

const rootBlock = extractBlock(css, ":root");
const darkBlock = extractBlock(css, ".dark");

const lightVars = extractVars(rootBlock);
const darkVars = extractVars(darkBlock);

// ── Convert oklch → hex ────────────────────────────────────────────────────

const toRgb = converter("rgb");

interface FigmaRgba {
  r: number;
  g: number;
  b: number;
  a: number;
}

/**
 * Convert a CSS color string (oklch, hex, rgb, etc.) to hex + Figma rgba (0-1 floats).
 * Returns null for non-color values (calc(), var(), rem, etc.)
 */
function toFigmaColor(value: string): { hex: string; rgba: FigmaRgba } | null {
  // Skip non-color CSS values
  if (/^(calc|var|clamp|min|max)\(/.test(value)) return null;
  if (/^\d/.test(value) && !value.startsWith("oklch")) return null;
  if (/rem|px|em|%/.test(value) && !value.includes("oklch")) return null;

  // oklch with alpha channel e.g. oklch(1 0 0 / 10%)
  let colorStr = value;
  if (/oklch\([^)]+\//.test(colorStr)) {
    // parse alpha from "/ 10%"
    const alphaMatch = colorStr.match(/\/\s*([\d.]+)%?\s*\)/);
    const alpha = alphaMatch ? parseFloat(alphaMatch[1]) / (alphaMatch[0].includes("%") ? 100 : 1) : 1;
    colorStr = colorStr.replace(/\s*\/[^)]+\)/, ")");
    const parsed = parseColor(colorStr);
    if (!parsed) return null;
    const rgb = toRgb(parsed);
    if (!rgb) return null;
    const r = Math.max(0, Math.min(1, rgb.r));
    const g = Math.max(0, Math.min(1, rgb.g));
    const b = Math.max(0, Math.min(1, rgb.b));
    const hexWithoutAlpha = formatHex({ mode: "rgb", r, g, b });
    return {
      hex: hexWithoutAlpha + Math.round(alpha * 255).toString(16).padStart(2, "0"),
      rgba: { r: +r.toFixed(4), g: +g.toFixed(4), b: +b.toFixed(4), a: alpha },
    };
  }

  try {
    const parsed = parseColor(colorStr);
    if (!parsed) return null;
    const rgb = toRgb(parsed);
    if (!rgb) return null;
    const r = Math.max(0, Math.min(1, rgb.r));
    const g = Math.max(0, Math.min(1, rgb.g));
    const b = Math.max(0, Math.min(1, rgb.b));
    return {
      hex: formatHex({ mode: "rgb", r, g, b }),
      rgba: { r: +r.toFixed(4), g: +g.toFixed(4), b: +b.toFixed(4), a: 1 },
    };
  } catch {
    return null;
  }
}

// ── Build bridge structure ─────────────────────────────────────────────────

/**
 * Classify a CSS variable name into a Figma collection + semantic path.
 */
function classify(name: string): { collection: string; group: string; tokenName: string } {
  if (name.startsWith("status-")) {
    return { collection: "Status", group: "status", tokenName: name.replace("status-", "") };
  }
  if (name.startsWith("sidebar-")) {
    return { collection: "Semantic", group: "sidebar", tokenName: name.replace("sidebar-", "") };
  }
  if (name === "radius") {
    return { collection: "Spacing & Radius", group: "radius", tokenName: "base" };
  }
  return { collection: "Semantic", group: "color", tokenName: name };
}

interface BridgeToken {
  $type: string;
  $value: string;
  figma: {
    hex?: string;
    rgba?: FigmaRgba;
    variableName: string;
    collection: string;
    cssVar: string;
    syncStatus: "pending";
    dark?: {
      $value: string;
      hex?: string;
      rgba?: FigmaRgba;
    };
  };
}

const bridge: Record<string, Record<string, BridgeToken>> = {};

// Process light vars
for (const [name, value] of Object.entries(lightVars)) {
  const { collection, group, tokenName } = classify(name);
  const figmaColor = toFigmaColor(value);

  const isColor = figmaColor !== null || value.startsWith("oklch");
  const $type = isColor ? "color" : value.includes("rem") ? "dimension" : "other";

  if ($type === "other" && !isColor) continue; // skip non-color, non-dimension

  const darkValue = darkVars[name];
  const darkFigmaColor = darkValue ? toFigmaColor(darkValue) : null;

  const token: BridgeToken = {
    $type,
    $value: value,
    figma: {
      ...(figmaColor ? { hex: figmaColor.hex, rgba: figmaColor.rgba } : {}),
      variableName: `${group}/${tokenName}`,
      collection,
      cssVar: `--${name}`,
      syncStatus: "pending",
      ...(darkValue
        ? {
            dark: {
              $value: darkValue,
              ...(darkFigmaColor ? { hex: darkFigmaColor.hex, rgba: darkFigmaColor.rgba } : {}),
            },
          }
        : {}),
    },
  };

  if (!bridge[group]) bridge[group] = {};
  bridge[group][tokenName] = token;
}

// ── Write outputs ──────────────────────────────────────────────────────────

const SYSTEMIX_DIR = join(ROOT, ".systemix");
mkdirSync(SYSTEMIX_DIR, { recursive: true });

// tokens.bridge.json
const bridgeOutput = {
  $schema: "https://design-tokens.github.io/community-group/format/",
  _meta: {
    source: "src/app/globals.css",
    generatedAt: new Date().toISOString(),
    converter: "scripts/token-converter.ts",
    note: "DTCG-compatible bridge file. figma.hex/rgba are pre-converted for Figma Plugin API (RGB 0-1 floats).",
  },
  ...bridge,
};

writeFileSync(
  join(SYSTEMIX_DIR, "tokens.bridge.json"),
  JSON.stringify(bridgeOutput, null, 2),
  "utf8"
);
console.log("✓ Written .systemix/tokens.bridge.json");

// systemix.json manifest (initialize if not exists)
const manifestPath = join(SYSTEMIX_DIR, "systemix.json");
let manifest: object;
try {
  manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  console.log("✓ .systemix/systemix.json already exists — skipping init");
} catch {
  manifest = {
    version: "0.1.0",
    lastUpdated: new Date().toISOString(),
    activeRuns: [],
    hitlQueue: [],
    tokenChangeLog: [],
    componentRegistry: {},
    auditLog: [],
    figma: {
      fileKey: null,
      lastSync: null,
      collections: {
        Semantic: { modeIds: { light: null, dark: null }, variableIds: {} },
        Status: { modeIds: { light: null, dark: null }, variableIds: {} },
        "Spacing & Radius": { modeIds: { default: null }, variableIds: {} },
      },
    },
  };
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), "utf8");
  console.log("✓ Written .systemix/systemix.json (initial manifest)");
}

// Summary
const tokenCount = Object.values(bridge).reduce((sum, group) => sum + Object.keys(group).length, 0);
const groups = Object.keys(bridge);
console.log(`\nSummary: ${tokenCount} tokens across groups: ${groups.join(", ")}`);
