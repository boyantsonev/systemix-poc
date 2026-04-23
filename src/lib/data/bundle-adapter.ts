/**
 * bundle-adapter.ts
 *
 * Converts ExtractedCollection[] from the /api/bundle response into
 * DesignToken[] for the workspace variables UI.
 *
 * Rules:
 * - codeValue = "—"  (not read from CSS yet)
 * - figmaValue = first mode value (Light preferred, else first key)
 * - drift = "pending"
 * - group is derived from the collection name + variable name
 */

import type { DesignToken, TokenGroup, TokenType } from "./variables";

// These types mirror packages/figma-plugin/src/types.ts
export interface ExtractedVariable {
  figmaName: string;
  cssName: string;
  group: string;
  type: "COLOR" | "FLOAT" | "STRING" | "BOOLEAN";
  values: Record<string, string>;
}

export interface ExtractedCollection {
  name: string;
  modes: string[];
  variables: ExtractedVariable[];
}

export interface BundlePayload {
  savedAt: string;
  collections: ExtractedCollection[];
}

// Map a Figma variable type to the DesignToken TokenType
function mapType(figmaType: ExtractedVariable["type"]): TokenType {
  switch (figmaType) {
    case "COLOR":
      return "color";
    case "FLOAT":
      return "dimension";
    case "STRING":
    case "BOOLEAN":
      return "string";
  }
}

// Derive the TokenGroup from the collection name and variable cssName.
// Unknown collection names fall back to "semantic".
function mapGroup(
  collectionName: string,
  cssName: string,
  figmaType: ExtractedVariable["type"]
): TokenGroup {
  const lower = collectionName.toLowerCase();

  if (lower === "semantic") return "semantic";
  if (lower === "status") return "status";

  if (lower.includes("spacing") || lower.includes("radius")) {
    // Split spacing/radius variables by type and name
    if (figmaType === "FLOAT") {
      const varLower = cssName.toLowerCase();
      if (varLower.includes("radius")) return "radius";
      return "spacing";
    }
    // Non-FLOAT inside a spacing/radius collection — best-effort
    return "spacing";
  }

  // Best-effort fallback: strip "--" and use first segment before "-"
  const stripped = cssName.startsWith("--") ? cssName.slice(2) : cssName;
  const firstSegment = stripped.split("-")[0];

  const SEGMENT_MAP: Record<string, TokenGroup> = {
    sidebar: "sidebar",
    agent: "agent",
    font: "typography",
    space: "spacing",
    radius: "radius",
    duration: "animation",
    shadow: "shadow",
  };

  return SEGMENT_MAP[firstSegment] ?? "semantic";
}

// Pick the first mode value to use as figmaValue.
// Prefer "Light" mode when present; otherwise take the first key.
function pickFirstModeValue(
  values: Record<string, string>,
  modes: string[]
): string | null {
  if (Object.keys(values).length === 0) return null;

  const lightMode = modes.find((m) => m.toLowerCase() === "light");
  if (lightMode && values[lightMode] !== undefined) return values[lightMode];

  // Fall back to first key in the values object
  const firstKey = Object.keys(values)[0];
  return values[firstKey] ?? null;
}

// Convert a single ExtractedVariable into a DesignToken
function adaptVariable(
  variable: ExtractedVariable,
  collectionName: string,
  modes: string[]
): DesignToken {
  const name = variable.cssName.startsWith("--")
    ? variable.cssName.slice(2)
    : variable.cssName;

  return {
    name,
    group: mapGroup(collectionName, variable.cssName, variable.type),
    type: mapType(variable.type),
    codeValue: "—",
    figmaValue: pickFirstModeValue(variable.values, modes),
    figmaName: variable.figmaName,
    drift: "pending",
  };
}

/**
 * Convert an array of ExtractedCollection (from /api/bundle) into a flat
 * DesignToken[] array suitable for the workspace variables table.
 */
export function adaptBundleToTokens(
  collections: ExtractedCollection[]
): DesignToken[] {
  return collections.flatMap((collection) =>
    collection.variables.map((variable) =>
      adaptVariable(variable, collection.name, collection.modes)
    )
  );
}
