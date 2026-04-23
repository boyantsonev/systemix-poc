/**
 * code.ts — Systemix Figma Plugin (sandbox)
 *
 * Runs inside Figma's sandboxed JS environment.
 * Has access to the Figma Plugin API but NO Node.js, no external fetch.
 * Communicates with the UI iframe via figma.ui.postMessage / figma.ui.onmessage.
 */

import type { ExtractedCollection, ExtractedVariable, UIMessage, PluginSettings } from "./types";

// ── Plugin init ───────────────────────────────────────────────────────────────

figma.showUI(__html__, {
  width: 440,
  height: 640,
  title: "Systemix Figma Plugin",
  themeColors: true,
});

// ── Color conversion ──────────────────────────────────────────────────────────

function rgbaToHex({ r, g, b }: RGB): string {
  const h = (n: number) => Math.round(n * 255).toString(16).padStart(2, "0");
  return `#${h(r)}${h(g)}${h(b)}`;
}

// ── Variable naming convention ────────────────────────────────────────────────
//
// verolab / shadcn kit uses "base/accent" → "--accent"
// General rule: strip the group prefix, use the last segment as the CSS var name
// "base/accent"           → "--accent"
// "color/foreground"      → "--foreground"
// "spacing/4"             → "--spacing-4"
// "radius/base"           → "--radius-base"

function toCssName(figmaName: string): string {
  const parts = figmaName.split("/");
  return "--" + parts[parts.length - 1];
}

function toGroup(figmaName: string): string {
  return figmaName.split("/")[0] ?? "other";
}

// ── Variable value resolver ───────────────────────────────────────────────────

function resolveValue(
  variable: Variable,
  modeId: string,
  allVariables: Variable[],
): string | null {
  const raw = variable.valuesByMode[modeId];
  if (raw === undefined) return null;

  // Alias — resolve recursively
  if (typeof raw === "object" && "type" in raw && (raw as VariableAlias).type === "VARIABLE_ALIAS") {
    const alias = raw as VariableAlias;
    const target = allVariables.find((v) => v.id === alias.id);
    if (!target) return null;
    // Use the same mode if available, otherwise first mode
    const targetModeId = target.valuesByMode[modeId] !== undefined
      ? modeId
      : Object.keys(target.valuesByMode)[0];
    return resolveValue(target, targetModeId!, allVariables);
  }

  // Color
  if (variable.resolvedType === "COLOR") {
    const c = raw as RGBA;
    return rgbaToHex(c);
  }

  // Float / dimension
  if (variable.resolvedType === "FLOAT") {
    return String(raw as number);
  }

  // String / boolean
  return String(raw);
}

// ── Core extraction ───────────────────────────────────────────────────────────

async function extractCollections(): Promise<ExtractedCollection[]> {
  const collections = figma.variables.getLocalVariableCollections();
  const allVariables = figma.variables.getLocalVariables();

  const result: ExtractedCollection[] = [];

  for (const collection of collections) {
    const modes = collection.modes.map((m) => m.name);
    const variables: ExtractedVariable[] = [];

    for (const varId of collection.variableIds) {
      const variable = allVariables.find((v) => v.id === varId);
      if (!variable) continue;

      const values: Record<string, string> = {};
      for (const mode of collection.modes) {
        const resolved = resolveValue(variable, mode.modeId, allVariables);
        if (resolved !== null) {
          values[mode.name] = resolved;
        }
      }

      variables.push({
        figmaName: variable.name,
        cssName: toCssName(variable.name),
        group: toGroup(variable.name),
        type: variable.resolvedType as ExtractedVariable["type"],
        values,
      });
    }

    result.push({ name: collection.name, modes, variables });
  }

  return result;
}

// ── Message handlers ──────────────────────────────────────────────────────────

figma.ui.onmessage = async (msg: UIMessage) => {
  switch (msg.type) {
    case "extract": {
      try {
        figma.ui.postMessage({ type: "status", message: "Scanning variables…" });
        const collections = await extractCollections();
        const totalCount = collections.reduce((n, c) => n + c.variables.length, 0);
        figma.ui.postMessage({ type: "collections", payload: collections, totalCount });
      } catch (err) {
        figma.ui.postMessage({
          type: "error",
          message: err instanceof Error ? err.message : "Unknown error during extraction",
        });
      }
      break;
    }

    case "notify": {
      figma.notify(msg.message, { error: msg.error ?? false });
      break;
    }

    case "resize": {
      figma.ui.resize(msg.width, msg.height);
      break;
    }

    case "close": {
      figma.closePlugin();
      break;
    }

    case "open-url": {
      figma.openExternal(msg.url);
      break;
    }

    case "save-settings": {
      await figma.clientStorage.setAsync("plugin-settings", msg.settings);
      figma.notify("Settings saved ✓");
      break;
    }

    case "load-settings": {
      const s = (await figma.clientStorage.getAsync("plugin-settings")) as PluginSettings | undefined;
      figma.ui.postMessage({ type: "settings", settings: s ?? {} });
      break;
    }
  }
};

// ── Auto-extract on open ──────────────────────────────────────────────────────

figma.ui.postMessage({ type: "ready" });

// Slight delay so the UI has time to mount before receiving data
setTimeout(async () => {
  try {
    figma.ui.postMessage({ type: "status", message: "Scanning variables…" });
    const collections = await extractCollections();
    const totalCount = collections.reduce((n, c) => n + c.variables.length, 0);
    figma.ui.postMessage({ type: "collections", payload: collections, totalCount });
    const s = (await figma.clientStorage.getAsync("plugin-settings")) as PluginSettings | undefined;
    figma.ui.postMessage({ type: "settings", settings: s ?? {} });
  } catch (err) {
    figma.ui.postMessage({
      type: "error",
      message: err instanceof Error ? err.message : "Extraction failed",
    });
  }
}, 100);
