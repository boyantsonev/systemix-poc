/**
 * context.ts — systemix_get_context / systemix_set_context / systemix_get_agent_state
 *
 * Reads and writes .systemix/project-context.json and .systemix/agent-state.json.
 * This is the primary state file for all Systemix skills.
 */

import * as fs from "fs";
import * as path from "path";
import type { ToolDefinition, ToolHandler, ProjectContext } from "../types.js";
import { emitEventHandler } from "./events.js";

const CONTEXT_FILE = ".systemix/project-context.json";
const AGENT_STATE_FILE = ".systemix/agent-state.json";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Deep-merge `patch` into `base`. Arrays are replaced (not concatenated).
 * Both arguments must be plain objects at the top level.
 */
function deepMerge(
  base: Record<string, unknown>,
  patch: Record<string, unknown>
): Record<string, unknown> {
  const result: Record<string, unknown> = { ...base };
  for (const [key, patchValue] of Object.entries(patch)) {
    const baseValue = base[key];
    if (
      patchValue !== null &&
      typeof patchValue === "object" &&
      !Array.isArray(patchValue) &&
      baseValue !== null &&
      typeof baseValue === "object" &&
      !Array.isArray(baseValue)
    ) {
      result[key] = deepMerge(
        baseValue as Record<string, unknown>,
        patchValue as Record<string, unknown>
      );
    } else {
      result[key] = patchValue;
    }
  }
  return result;
}

/**
 * Resolve a dot-notation key path (e.g. "figma.fileKey") against an object.
 * Returns `undefined` if any segment is missing.
 */
function getByDotPath(
  obj: Record<string, unknown>,
  dotPath: string
): unknown {
  const segments = dotPath.split(".");
  let current: unknown = obj;
  for (const seg of segments) {
    if (current === null || typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[seg];
  }
  return current;
}

/**
 * Collect all dot-notation leaf paths present in an object.
 */
function collectLeafPaths(
  obj: Record<string, unknown>,
  prefix = ""
): string[] {
  const paths: string[] = [];
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (
      value !== null &&
      typeof value === "object" &&
      !Array.isArray(value)
    ) {
      paths.push(...collectLeafPaths(value as Record<string, unknown>, fullKey));
    } else {
      paths.push(fullKey);
    }
  }
  return paths;
}

// ---------------------------------------------------------------------------
// systemix_get_context
// ---------------------------------------------------------------------------

export const getProjectContextDefinition: ToolDefinition = {
  name: "systemix_get_context",
  description:
    "Read the current Systemix project context from .systemix/project-context.json. " +
    "Pass optional dot-notation key paths (e.g. ['figma.fileKey', 'codebase.srcDir']) to " +
    "return only the requested subset. Omit keys (or pass an empty array) to return the full " +
    "context. Returns {} gracefully if the file does not exist yet.",
  inputSchema: {
    type: "object",
    properties: {
      keys: {
        type: "array",
        items: { type: "string" },
        description:
          "Optional dot-notation key paths to return, e.g. ['figma.fileKey', 'codebase.srcDir']. " +
          "Omit or pass [] for the full context.",
      },
    },
  },
};

export const getProjectContextHandler: ToolHandler<{ keys?: string[] }> =
  async (args, projectRoot) => {
    const filePath = path.join(projectRoot, CONTEXT_FILE);

    if (!fs.existsSync(filePath)) {
      return {
        content: [{ type: "text", text: JSON.stringify({}, null, 2) }],
      };
    }

    const raw = fs.readFileSync(filePath, "utf-8");
    const context = JSON.parse(raw) as Record<string, unknown>;

    if (!args.keys || args.keys.length === 0) {
      return {
        content: [{ type: "text", text: JSON.stringify(context, null, 2) }],
      };
    }

    // Build a subset keyed by the requested dot-paths.
    const subset: Record<string, unknown> = {};
    for (const dotPath of args.keys) {
      subset[dotPath] = getByDotPath(context, dotPath);
    }

    return {
      content: [{ type: "text", text: JSON.stringify(subset, null, 2) }],
    };
  };

// ---------------------------------------------------------------------------
// systemix_set_context
// ---------------------------------------------------------------------------

export const setProjectContextDefinition: ToolDefinition = {
  name: "systemix_set_context",
  description:
    "Deep-merge a patch into .systemix/project-context.json and write atomically. " +
    "Nested objects are recursively merged — only the keys you provide are changed. " +
    "After writing, a context-updated event is emitted to the Systemix dashboard. " +
    "Returns { updated, newValues } showing which dot-notation paths changed.",
  inputSchema: {
    type: "object",
    properties: {
      updates: {
        type: "object",
        description:
          "Partial project context to deep-merge. Any depth is supported, e.g. " +
          "{ figma: { fileKey: 'abc' } } updates only figma.fileKey.",
      },
    },
    required: ["updates"],
  },
};

export const setProjectContextHandler: ToolHandler<{
  updates: Partial<ProjectContext>;
}> = async (args, projectRoot) => {
  const filePath = path.join(projectRoot, CONTEXT_FILE);
  const tmpPath = filePath + ".tmp";

  const defaultContext: Record<string, unknown> = {
    version: "1.0",
    project: { name: "", description: "" },
    figma: {
      fileKey: null,
      fileName: null,
      fileUrl: null,
      modeIds: null,
      variableIds: null,
    },
    codebase: {
      root: ".",
      srcDir: "src",
      componentsDir: "src/components",
      stylesFile: "src/app/globals.css",
      tokensFile: ".systemix/tokens.bridge.json",
      manifestFile: ".systemix/systemix.json",
    },
    brand: { defaultSlug: "default", themesDir: "src/styles/themes" },
    pipeline: {
      skillsDir: "~/.claude/skills",
      handoffsDir: ".systemix/handoffs",
      cacheDir: ".systemix/cache",
      runsDir: ".systemix/runs",
    },
    deploy: { previewUrl: "", devUrl: "http://localhost:3001" },
  };

  const existing: Record<string, unknown> = fs.existsSync(filePath)
    ? (JSON.parse(fs.readFileSync(filePath, "utf-8")) as Record<string, unknown>)
    : defaultContext;

  const merged = deepMerge(existing, args.updates as Record<string, unknown>);

  // Collect changed dot-notation paths and their new values.
  const patchPaths = collectLeafPaths(args.updates as Record<string, unknown>);
  const changed = patchPaths.filter(
    (p) =>
      JSON.stringify(getByDotPath(existing, p)) !==
      JSON.stringify(getByDotPath(merged, p))
  );
  const newValues: Record<string, unknown> = {};
  for (const p of changed) {
    newValues[p] = getByDotPath(merged, p);
  }

  // Atomic write: tmp → rename.
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(tmpPath, JSON.stringify(merged, null, 2) + "\n", "utf-8");
  fs.renameSync(tmpPath, filePath);

  // Emit context-updated event (best-effort — don't fail the tool if it errors).
  try {
    await emitEventHandler(
      {
        type: "tool_call",
        agent: "systemix_set_context",
        data: { updated: changed, newValues, summary: `Project context updated: ${changed.length} key(s) changed` },
      },
      projectRoot
    );
  } catch {
    // Ignore event emission errors.
  }

  const response = { updated: changed, newValues };

  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(response, null, 2),
      },
    ],
  };
};

// ---------------------------------------------------------------------------
// systemix_get_agent_state
// ---------------------------------------------------------------------------

export const getAgentStateDefinition: ToolDefinition = {
  name: "systemix_get_agent_state",
  description:
    "Read agent state from .systemix/agent-state.json. " +
    "Pass an optional agent name to return only that agent's state. " +
    "Returns the full file if no agent is specified, or {} if the file does not exist.",
  inputSchema: {
    type: "object",
    properties: {
      agent: {
        type: "string",
        description:
          "Optional agent name to filter (e.g. 'sync-to-figma'). " +
          "Omit to return all agent states.",
      },
    },
  },
};

export const getAgentStateHandler: ToolHandler<{ agent?: string }> =
  async (args, projectRoot) => {
    const filePath = path.join(projectRoot, AGENT_STATE_FILE);

    if (!fs.existsSync(filePath)) {
      return {
        content: [{ type: "text", text: JSON.stringify({}, null, 2) }],
      };
    }

    const raw = fs.readFileSync(filePath, "utf-8");
    const state = JSON.parse(raw) as Record<string, unknown>;

    if (args.agent) {
      const agentState = state[args.agent] ?? {};
      return {
        content: [
          { type: "text", text: JSON.stringify(agentState, null, 2) },
        ],
      };
    }

    return {
      content: [{ type: "text", text: JSON.stringify(state, null, 2) }],
    };
  };
