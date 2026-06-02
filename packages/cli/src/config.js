"use strict";

/**
 * Loads and validates systemix.config.yaml — the instance topology written by
 * `npx systemix init` (ADR-008). This is the Orchestrator's boot read: surfaces,
 * signals, Hermes autonomy/thresholds, self-improvement mode, and trust tiers.
 *
 * The config is a small, fixed YAML subset (2-space nested maps + simple scalar
 * sequences + scalars), so we parse it directly rather than pull in a YAML dep.
 */

const fs = require("fs");
const path = require("path");

const CONFIG_FILE = "systemix.config.yaml";
const REQUIRED_KEYS = ["version", "surfaces", "signals", "hermes", "self_improvement", "trust"];

// ── YAML subset parser ──────────────────────────────────────────────────────

function coerce(raw) {
  const s = raw.trim();
  if (s === "" || s === "null" || s === "~") return s === "" ? "" : null;
  if (s === "true") return true;
  if (s === "false") return false;
  if (/^-?\d+$/.test(s)) return parseInt(s, 10);
  if (/^-?\d*\.\d+$/.test(s)) return parseFloat(s);
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    return s.slice(1, -1);
  }
  return s;
}

// Strip a trailing ` # comment` that is outside quotes. Our values never contain '#'.
function stripInlineComment(line) {
  let inS = false, inD = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === "'" && !inD) inS = !inS;
    else if (c === '"' && !inS) inD = !inD;
    else if (c === "#" && !inS && !inD && (i === 0 || line[i - 1] === " " || line[i - 1] === "\t")) {
      return line.slice(0, i);
    }
  }
  return line;
}

const indentOf = (l) => l.length - l.replace(/^ +/, "").length;

/**
 * Parse the systemix.config.yaml subset into a plain object.
 * Supports: nested maps (indentation), scalar sequences (`- item`), scalars,
 * full-line and inline `#` comments.
 */
function parseSimpleYaml(text) {
  const lines = text
    .split(/\r?\n/)
    .map(stripInlineComment)
    .filter((l) => l.trim().length > 0);

  let i = 0;
  function parseBlock(minIndent) {
    let result = null;
    while (i < lines.length) {
      const line = lines[i];
      const indent = indentOf(line);
      if (indent < minIndent) break;
      const content = line.trim();

      if (content.startsWith("- ")) {
        if (result === null) result = [];
        result.push(coerce(content.slice(2)));
        i++;
        continue;
      }

      if (result === null) result = {};
      const idx = content.indexOf(":");
      if (idx === -1) { i++; continue; } // malformed line — skip defensively
      const key = content.slice(0, idx).trim();
      const rest = content.slice(idx + 1).trim();
      i++;

      if (rest === "") {
        const next = lines[i];
        if (next && indentOf(next) > indent) {
          result[key] = parseBlock(indentOf(next));
        } else {
          result[key] = null;
        }
      } else {
        result[key] = coerce(rest);
      }
    }
    return result;
  }

  return parseBlock(0) || {};
}

// ── public API ──────────────────────────────────────────────────────────────

function configPath(projectRoot) {
  return path.join(projectRoot || process.cwd(), CONFIG_FILE);
}

function validateConfig(cfg) {
  const missing = REQUIRED_KEYS.filter((k) => !(k in cfg));
  if (missing.length) {
    throw new Error(
      `${CONFIG_FILE} is missing required key(s): ${missing.join(", ")}. ` +
      `Re-run \`npx systemix init\` to regenerate it.`
    );
  }
  if (!Array.isArray(cfg.surfaces)) throw new Error(`${CONFIG_FILE}: "surfaces" must be a list.`);
  return cfg;
}

/**
 * Load + validate the instance config. Throws a helpful error if the file is
 * absent (not initialised) or malformed.
 */
function loadConfig(projectRoot) {
  const p = configPath(projectRoot);
  if (!fs.existsSync(p)) {
    throw new Error(`No ${CONFIG_FILE} found in this repo. Run \`npx systemix init\` to create an instance.`);
  }
  const cfg = parseSimpleYaml(fs.readFileSync(p, "utf8"));
  return validateConfig(cfg);
}

module.exports = { loadConfig, validateConfig, parseSimpleYaml, configPath, CONFIG_FILE };
