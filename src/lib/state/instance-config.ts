import fs from "fs";
import path from "path";

/**
 * Reads systemix.config.yaml — the instance topology written by `npx systemix init`
 * (ADR-008). Server-only (uses fs). Mirrors the CLI parser in packages/cli/src/config.js;
 * the file is a small, fixed YAML subset so we parse it directly rather than add a dep.
 */

export interface InstanceSignal {
  enabled: boolean;
  poll_interval_sec?: number;
}

export interface InstanceConfig {
  version: number;
  surfaces: string[];
  signals: Record<string, InstanceSignal>;
  hermes: {
    model: string;
    endpoint: string;
    autonomy: string;
    thresholds: { high: number; medium: number };
  };
  self_improvement: { mode: string; meta_contract?: string; audit_window_days?: number };
  trust: { orchestrator_tier: number; hermes_tier: number };
}

const CONFIG_FILE = "systemix.config.yaml";

function coerce(raw: string): unknown {
  const s = raw.trim();
  if (s === "") return "";
  if (s === "null" || s === "~") return null;
  if (s === "true") return true;
  if (s === "false") return false;
  if (/^-?\d+$/.test(s)) return parseInt(s, 10);
  if (/^-?\d*\.\d+$/.test(s)) return parseFloat(s);
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    return s.slice(1, -1);
  }
  return s;
}

function stripInlineComment(line: string): string {
  let inS = false;
  let inD = false;
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

const indentOf = (l: string) => l.length - l.replace(/^ +/, "").length;

/** Parse the systemix.config.yaml subset: nested maps + scalar sequences + scalars. */
export function parseInstanceConfig(text: string): Record<string, unknown> {
  const lines = text
    .split(/\r?\n/)
    .map(stripInlineComment)
    .filter((l) => l.trim().length > 0);

  let i = 0;
  function parseBlock(minIndent: number): unknown {
    let result: unknown = null;
    while (i < lines.length) {
      const line = lines[i];
      const indent = indentOf(line);
      if (indent < minIndent) break;
      const content = line.trim();

      if (content.startsWith("- ")) {
        if (result === null) result = [];
        (result as unknown[]).push(coerce(content.slice(2)));
        i++;
        continue;
      }

      if (result === null) result = {};
      const idx = content.indexOf(":");
      if (idx === -1) { i++; continue; }
      const key = content.slice(0, idx).trim();
      const rest = content.slice(idx + 1).trim();
      i++;

      const obj = result as Record<string, unknown>;
      if (rest === "") {
        const next = lines[i];
        obj[key] = next && indentOf(next) > indent ? parseBlock(indentOf(next)) : null;
      } else {
        obj[key] = coerce(rest);
      }
    }
    return result;
  }

  return (parseBlock(0) as Record<string, unknown>) || {};
}

/** Load the instance config from the project root. Returns null if not initialised. */
export function loadInstanceConfig(projectRoot?: string): InstanceConfig | null {
  const p = path.join(projectRoot || process.cwd(), CONFIG_FILE);
  if (!fs.existsSync(p)) return null;
  try {
    return parseInstanceConfig(fs.readFileSync(p, "utf8")) as unknown as InstanceConfig;
  } catch {
    return null;
  }
}
