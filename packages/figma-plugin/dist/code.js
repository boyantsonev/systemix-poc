"use strict";
(() => {
  // src/code.ts
  figma.showUI(__html__, {
    width: 440,
    height: 640,
    title: "Systemix Figma Plugin",
    themeColors: true
  });
  function rgbaToHex({ r, g, b }) {
    const h = (n) => Math.round(n * 255).toString(16).padStart(2, "0");
    return `#${h(r)}${h(g)}${h(b)}`;
  }
  function toCssName(figmaName) {
    const parts = figmaName.split("/");
    return "--" + parts[parts.length - 1];
  }
  function toGroup(figmaName) {
    var _a;
    return (_a = figmaName.split("/")[0]) != null ? _a : "other";
  }
  function resolveValue(variable, modeId, allVariables) {
    const raw = variable.valuesByMode[modeId];
    if (raw === void 0)
      return null;
    if (typeof raw === "object" && "type" in raw && raw.type === "VARIABLE_ALIAS") {
      const alias = raw;
      const target = allVariables.find((v) => v.id === alias.id);
      if (!target)
        return null;
      const targetModeId = target.valuesByMode[modeId] !== void 0 ? modeId : Object.keys(target.valuesByMode)[0];
      return resolveValue(target, targetModeId, allVariables);
    }
    if (variable.resolvedType === "COLOR") {
      const c = raw;
      return rgbaToHex(c);
    }
    if (variable.resolvedType === "FLOAT") {
      return String(raw);
    }
    return String(raw);
  }
  async function extractCollections() {
    const collections = figma.variables.getLocalVariableCollections();
    const allVariables = figma.variables.getLocalVariables();
    const result = [];
    for (const collection of collections) {
      const modes = collection.modes.map((m) => m.name);
      const variables = [];
      for (const varId of collection.variableIds) {
        const variable = allVariables.find((v) => v.id === varId);
        if (!variable)
          continue;
        const values = {};
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
          type: variable.resolvedType,
          values
        });
      }
      result.push({ name: collection.name, modes, variables });
    }
    return result;
  }
  figma.ui.onmessage = async (msg) => {
    var _a;
    switch (msg.type) {
      case "extract": {
        try {
          figma.ui.postMessage({ type: "status", message: "Scanning variables\u2026" });
          const collections = await extractCollections();
          const totalCount = collections.reduce((n, c) => n + c.variables.length, 0);
          figma.ui.postMessage({ type: "collections", payload: collections, totalCount });
        } catch (err) {
          figma.ui.postMessage({
            type: "error",
            message: err instanceof Error ? err.message : "Unknown error during extraction"
          });
        }
        break;
      }
      case "notify": {
        figma.notify(msg.message, { error: (_a = msg.error) != null ? _a : false });
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
        figma.notify("Settings saved \u2713");
        break;
      }
      case "load-settings": {
        const s = await figma.clientStorage.getAsync("plugin-settings");
        figma.ui.postMessage({ type: "settings", settings: s != null ? s : {} });
        break;
      }
    }
  };
  figma.ui.postMessage({ type: "ready" });
  setTimeout(async () => {
    try {
      figma.ui.postMessage({ type: "status", message: "Scanning variables\u2026" });
      const collections = await extractCollections();
      const totalCount = collections.reduce((n, c) => n + c.variables.length, 0);
      figma.ui.postMessage({ type: "collections", payload: collections, totalCount });
      const s = await figma.clientStorage.getAsync("plugin-settings");
      figma.ui.postMessage({ type: "settings", settings: s != null ? s : {} });
    } catch (err) {
      figma.ui.postMessage({
        type: "error",
        message: err instanceof Error ? err.message : "Extraction failed"
      });
    }
  }, 100);
})();
