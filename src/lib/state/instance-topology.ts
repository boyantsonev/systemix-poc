// The live instance loop as graph data (ADR-021). A pure, file-backed read of
// instance state → { nodes, edges, activeIds } for the /config force graph.
//
// Shows EVERYTHING the instance has: sources · skills (slash commands) · agents ·
// experiments (artifacts) · infra · surfaces (concept) · tools. Edges trace the
// loop (source → experiment → measure → Hermes → decide). "active" = available /
// in play; only sources that aren't wired dim (the honest "no signal" state) —
// dimmed nodes stay visible (the onboarding map).

import fs from "node:fs";
import path from "node:path";
import { signalStatus, type InstanceConfig } from "./instance-config";
import type { SystemNode, SystemLink, NodeType } from "@/lib/data/system-graph";

export type SourceKind = "wired" | "mcp" | "manual";

/** Card payload for a source node (consumed by NodeCardPanel). */
export interface SourceCard {
  kind: SourceKind;
  /** posthog-style wiring; null when not knowable from the app env. */
  wired: boolean | null;
}

/** A graph node plus the data its detail card needs. */
export type TopoNode = SystemNode & { card?: { source?: SourceCard } };

export interface InstanceTopology {
  nodes: TopoNode[];
  links: SystemLink[];
  /** ids rendered at full color (available / in play); all others dim. */
  activeIds: string[];
}

/** Stable node id for a configured source. */
export const sourceNodeId = (signalId: string) => `source:${signalId}`;

// Infer a source's kind until `signals.<source>.type` is a real field (ADR-021
// slice 3). Honour an explicit `type:` if present; else: social = manual entry,
// everything else = a wired API source.
function sourceKind(cfg: InstanceConfig | null, id: string): SourceKind {
  const explicit = cfg?.signals?.[id]?.type;
  if (explicit === "wired" || explicit === "mcp" || explicit === "manual") return explicit;
  return id === "social" ? "manual" : "wired";
}

// A source counts as live only when data can actually flow: a wired/mcp source
// whose key is present. Manual + unknowable (null) wiring stay dimmed until there
// is evidence to read.
const isSourceLive = (c: SourceCard) => c.kind !== "manual" && c.wired === true;

function readJSON(p: string): unknown {
  try {
    return JSON.parse(fs.readFileSync(p, "utf8"));
  } catch {
    return null;
  }
}

function listFiles(dir: string): string[] {
  try {
    return fs.readdirSync(dir);
  } catch {
    return [];
  }
}

export function buildInstanceTopology(cfg: InstanceConfig | null): InstanceTopology {
  const root = process.cwd();
  const nodes: TopoNode[] = [];
  const links: SystemLink[] = [];
  const active = new Set<string>();
  const ids = new Set<string>();

  const add = (n: TopoNode, live = true) => {
    nodes.push(n);
    ids.add(n.id);
    if (live) active.add(n.id);
  };
  const link = (a: string, b: string) => {
    if (ids.has(a) && ids.has(b)) links.push({ source: a, target: b });
  };

  // ── Sources (from configured signals) — live only when wired ────────────────
  const sources = signalStatus(cfg).filter((s) => s.enabled);
  for (const s of sources) {
    const kind = sourceKind(cfg, s.id);
    add(
      {
        id: sourceNodeId(s.id),
        label: s.id,
        sub: kind,
        type: "source",
        size: "md",
        card: { source: { kind, wired: s.wired } },
      },
      isSourceLive({ kind, wired: s.wired }),
    );
  }

  // ── Skills (the loop slash-commands, from the vendored pipeline manifest) ────
  const manifest = readJSON(
    path.join(root, "packages/cli/pipelines/hypothesis-validation/manifest.json"),
  ) as { skills?: string[] } | null;
  for (const sk of manifest?.skills ?? []) {
    add({ id: `skill:${sk}`, label: `/${sk}`, sub: "slash command", type: "skill", size: "sm" });
  }

  // ── Agents (instance vocabulary) ────────────────────────────────────────────
  const agents = Object.entries(cfg?.atlas?.agents ?? {});
  for (const [key, val] of agents) {
    add({
      id: `agent:${key}`,
      label: (val as { label?: string })?.label ?? key,
      sub: "agent",
      type: "agent",
      size: key === "hermes" ? "md" : "sm",
    });
  }

  // ── Artifacts (the experiments) ─────────────────────────────────────────────
  const experiments = listFiles(path.join(root, "experiments")).filter(
    (f) => f.endsWith(".mdx") && f !== "LEARNINGS.md",
  );
  for (const f of experiments) {
    const slug = f.replace(/\.mdx$/, "");
    add({ id: `experiment:${slug}`, label: slug, sub: "experiment", type: "artifact", size: "lg" });
  }

  // ── Infra (the instance plumbing) ───────────────────────────────────────────
  add({ id: "infra:contract", label: "contract", sub: "systemix.config.yaml", type: "infra", size: "sm" });
  add({ id: "infra:queue", label: "HITL queue", sub: ".systemix/queue.json", type: "infra", size: "sm" });

  // ── Surfaces under test (concept / UI) ──────────────────────────────────────
  for (const surf of cfg?.surfaces ?? []) {
    add({ id: `surface:${surf}`, label: surf, sub: "surface", type: "concept", size: "sm" });
  }

  // ── Tools (the engine + the MCP) ────────────────────────────────────────────
  add({ id: "tool:claude-code", label: "Claude Code", sub: "engine", type: "tool", size: "md" });
  add({ id: "tool:mcp", label: "systemix MCP", sub: "experiment_* tools", type: "tool", size: "sm" });

  // ── Edges — the loop around each experiment ─────────────────────────────────
  const experimentIds = nodes.filter((n) => n.type === "artifact").map((n) => n.id);
  const loopSkills = ["init-experiment", "write-variants", "measure", "growth-audit", "close-experiment"];
  for (const exp of experimentIds) {
    for (const s of sources) link(sourceNodeId(s.id), exp); // evidence in
    for (const sk of loopSkills) link(`skill:${sk}`, exp); // the loop acts on it
    link("agent:hermes", exp); // Hermes synthesises
    link(exp, "infra:queue"); // decision out
  }
  for (const s of sources) link("skill:connect-signal", sourceNodeId(s.id)); // wires sources
  link("skill:systemix-init", "infra:contract");
  link("tool:claude-code", "agent:hermes"); // the engine runs Hermes
  link("agent:hermes", "infra:queue"); // Hermes writes decision cards
  link("tool:mcp", "infra:contract");

  return { nodes, links, activeIds: [...active] };
}
