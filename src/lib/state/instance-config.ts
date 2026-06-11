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
  // Signals may carry extra scalar settings (e.g. posthog region/host); the
  // serializer must round-trip them or a UI save silently strips the yaml.
  [key: string]: unknown;
}

/** Instance vocabulary for the Workflow Atlas (consumed by `npx systemix atlas build`
 * and the /atlas surface). Not editable in the Config UI — round-tripped verbatim. */
export interface InstanceAtlas {
  personas?: string[];
  agents?: Record<string, { label: string }>;
  surfaces?: string[];
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
  // Top-level blocks not modelled as typed knobs above (e.g. atlas) must still
  // survive a Config-layer save; serializeInstanceConfig round-trips atlas verbatim.
  atlas?: InstanceAtlas;
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

// ── Write-back (Config layer) ──────────────────────────────────────────────────

const AUTONOMY_VALUES = ["ghost", "conservative", "balanced", "aggressive"];
const SELF_IMPROVEMENT_MODES = ["off", "audit", "active"];

/** Whitelisted, validated merge of an editable patch onto the on-disk config.
 * Only known knobs are trusted — everything else is preserved from `base`, so a
 * malformed or hostile patch can never forge or drop fields. */
export function applyConfigPatch(base: InstanceConfig, patch: unknown): InstanceConfig {
  const p = (patch ?? {}) as Record<string, unknown>;
  const clampTier = (v: unknown, fallback: number) =>
    typeof v === "number" && Number.isFinite(v) ? Math.max(0, Math.min(3, Math.round(v))) : fallback;

  // surfaces — keep only strings
  const surfaces = Array.isArray(p.surfaces)
    ? (p.surfaces.filter((s) => typeof s === "string") as string[])
    : base.surfaces;

  // signals — only the `enabled` flag of existing signals is editable
  const signals: Record<string, InstanceSignal> = {};
  const patchSignals = (p.signals ?? {}) as Record<string, { enabled?: unknown }>;
  for (const [name, sig] of Object.entries(base.signals ?? {})) {
    const next = patchSignals[name];
    signals[name] = {
      ...sig,
      enabled: typeof next?.enabled === "boolean" ? next.enabled : sig.enabled,
    };
  }

  const patchHermes = (p.hermes ?? {}) as Record<string, unknown>;
  const autonomy =
    typeof patchHermes.autonomy === "string" && AUTONOMY_VALUES.includes(patchHermes.autonomy)
      ? patchHermes.autonomy
      : base.hermes.autonomy;

  const patchSelf = (p.self_improvement ?? {}) as Record<string, unknown>;
  const mode =
    typeof patchSelf.mode === "string" && SELF_IMPROVEMENT_MODES.includes(patchSelf.mode)
      ? patchSelf.mode
      : base.self_improvement.mode;

  const patchTrust = (p.trust ?? {}) as Record<string, unknown>;

  return {
    ...base,
    surfaces,
    signals,
    hermes: { ...base.hermes, autonomy },
    self_improvement: { ...base.self_improvement, mode },
    trust: {
      orchestrator_tier: clampTier(patchTrust.orchestrator_tier, base.trust.orchestrator_tier),
      hermes_tier: clampTier(patchTrust.hermes_tier, base.trust.hermes_tier),
    },
    // atlas vocab is not editable in the Config UI — carry it from base untouched
    // so a save can never forge or drop it (same footgun class as PR #53's signals).
    atlas: base.atlas,
  };
}

/** Emit a parsed YAML subtree — nested maps, scalar sequences, and scalars — at
 * `indent` spaces. Mirrors what parseInstanceConfig understands, so blocks not
 * modelled as typed fields (e.g. `atlas:`) round-trip through a save verbatim
 * instead of being silently dropped. */
function serializeNode(value: unknown, indent: number): string[] {
  const pad = " ".repeat(indent);
  if (Array.isArray(value)) {
    return value.map((item) => `${pad}- ${item}`);
  }
  if (value && typeof value === "object") {
    const out: string[] = [];
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (v !== null && typeof v === "object") {
        out.push(`${pad}${k}:`);
        out.push(...serializeNode(v, indent + 2));
      } else {
        out.push(`${pad}${k}: ${v}`);
      }
    }
    return out;
  }
  return [];
}

/** Serialize back to the systemix.config.yaml subset the parser above understands. */
export function serializeInstanceConfig(cfg: InstanceConfig): string {
  const lines: string[] = [
    "# systemix.config.yaml — your instance topology. Committed; contains NO secrets.",
    "# Secrets (Figma/PostHog keys) live in ~/.systemix/config.json or env vars.",
    "# Edit in the Config layer (/config) or re-run `npx systemix init` to regenerate.",
    `version: ${cfg.version ?? 1}`,
    "surfaces:",
    ...(cfg.surfaces ?? []).map((s) => `  - ${s}`),
    "signals:",
  ];
  for (const [name, sig] of Object.entries(cfg.signals ?? {})) {
    lines.push(`  ${name}:`);
    lines.push(`    enabled: ${!!sig.enabled}`);
    if (sig.poll_interval_sec != null) lines.push(`    poll_interval_sec: ${sig.poll_interval_sec}`);
    // Round-trip any extra scalar signal settings (e.g. posthog region/host).
    for (const [k, v] of Object.entries(sig)) {
      if (k === "enabled" || k === "poll_interval_sec") continue;
      if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") {
        lines.push(`    ${k}: ${v}`);
      }
    }
  }
  lines.push("hermes:");
  lines.push(`  model: ${cfg.hermes.model}`);
  lines.push(`  endpoint: ${cfg.hermes.endpoint}`);
  lines.push(`  autonomy: ${cfg.hermes.autonomy}`);
  lines.push("  thresholds:");
  lines.push(`    high: ${cfg.hermes.thresholds.high}`);
  lines.push(`    medium: ${cfg.hermes.thresholds.medium}`);
  lines.push("self_improvement:");
  lines.push(`  mode: ${cfg.self_improvement.mode}`);
  if (cfg.self_improvement.meta_contract) lines.push(`  meta_contract: ${cfg.self_improvement.meta_contract}`);
  if (cfg.self_improvement.audit_window_days != null)
    lines.push(`  audit_window_days: ${cfg.self_improvement.audit_window_days}`);
  lines.push("trust:");
  lines.push(`  orchestrator_tier: ${cfg.trust.orchestrator_tier}`);
  lines.push(`  hermes_tier: ${cfg.trust.hermes_tier}`);
  if (cfg.atlas && typeof cfg.atlas === "object") {
    lines.push("atlas:");
    lines.push(...serializeNode(cfg.atlas, 2));
  }
  return lines.join("\n") + "\n";
}

/** Persist an edited config to disk (server-only). */
export function writeInstanceConfig(cfg: InstanceConfig, projectRoot?: string): void {
  const p = path.join(projectRoot || process.cwd(), CONFIG_FILE);
  fs.writeFileSync(p, serializeInstanceConfig(cfg), "utf8");
}
