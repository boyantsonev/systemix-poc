/**
 * ui.ts — Systemix Figma Plugin UI
 *
 * Runs inside the plugin's iframe (full browser APIs available).
 * Receives extracted variable data from code.ts via postMessage.
 */

import type { ExtractedCollection, ExtractedVariable, BridgeJSON, PluginMessage, UIMessage } from "./types";
import { createRoot, type Root } from "react-dom/client";
import { createElement } from "react";
import { WorkflowCanvas } from "./WorkflowCanvas";
import type { Workflow } from "./workflow-types";

// ── State ─────────────────────────────────────────────────────────────────────

let collections: ExtractedCollection[] = [];
let activeMode: Record<string, string> = {}; // collectionName → modeName
let activeTab = "tokens";
let pluginSettings: { workspaceUrl?: string; storybookUrl?: string; vercelUrl?: string } = {};

// ── Helpers ───────────────────────────────────────────────────────────────────

function send(msg: UIMessage) {
  parent.postMessage({ pluginMessage: msg }, "*");
}

// navigator.clipboard is blocked inside Figma's sandboxed iframe.
// Use a hidden textarea + execCommand as the universal fallback.
function copyText(text: string): void {
  const ta = document.createElement("textarea");
  ta.value = text;
  ta.style.cssText = "position:fixed;top:0;left:0;opacity:0;pointer-events:none";
  document.body.appendChild(ta);
  ta.focus();
  ta.select();
  try { document.execCommand("copy"); } catch { /* silent */ }
  document.body.removeChild(ta);
}

function el<T extends HTMLElement>(id: string): T {
  return document.getElementById(id) as T;
}

function setStatus(state: "spin" | "ok" | "warn" | "error", text: string, count?: string) {
  const dot = el("status-dot");
  dot.className = `status-dot ${state}`;
  el("status-text").textContent = text;
  el("status-count").textContent = count ?? "";
}

// ── Hex → rgba for swatch display ─────────────────────────────────────────────

function isHex(v: string): boolean {
  return /^#[0-9a-fA-F]{3,8}$/.test(v);
}

// ── Bridge JSON generation ────────────────────────────────────────────────────

function toBridgeJSON(cols: ExtractedCollection[]): BridgeJSON {
  const out: BridgeJSON = {};
  for (const col of cols) {
    for (const v of col.variables) {
      const mode = activeMode[col.name] ?? col.modes[0] ?? "Default";
      const value = v.values[mode] ?? Object.values(v.values)[0] ?? "";
      const typeMap = { COLOR: "color", FLOAT: "dimension", STRING: "string", BOOLEAN: "boolean" } as const;
      out[v.cssName] = {
        $type: typeMap[v.type] ?? "string",
        $value: value,
        $figmaName: v.figmaName,
        $collection: col.name,
        $mode: mode,
      };
    }
  }
  return out;
}

// ── CSS snippet generation ────────────────────────────────────────────────────

function toCssSnippet(cols: ExtractedCollection[]): string {
  const lines: string[] = [":root {"];
  for (const col of cols) {
    const mode = activeMode[col.name] ?? col.modes[0] ?? "Default";
    lines.push(`  /* ${col.name} */`);
    for (const v of col.variables) {
      const value = v.values[mode] ?? Object.values(v.values)[0] ?? "";
      if (v.type === "COLOR") {
        lines.push(`  ${v.cssName}: ${value};`);
      } else if (v.type === "FLOAT") {
        const num = parseFloat(value);
        lines.push(`  ${v.cssName}: ${isNaN(num) ? value : num + "px"};`);
      } else {
        lines.push(`  ${v.cssName}: ${value};`);
      }
    }
  }
  lines.push("}");
  return lines.join("\n");
}

// ── Render: token list ────────────────────────────────────────────────────────

function renderTokens() {
  const list = el("tokens-list");
  const empty = el("tokens-empty");

  if (collections.length === 0) {
    list.style.display = "none";
    empty.style.display = "flex";
    return;
  }

  empty.style.display = "none";
  list.style.display = "block";
  list.innerHTML = "";

  for (const col of collections) {
    const currentMode = activeMode[col.name] ?? col.modes[0] ?? "Default";

    const colEl = document.createElement("div");
    colEl.className = "collection";

    // Header
    const header = document.createElement("div");
    header.className = "collection-header";
    header.innerHTML = `
      <svg class="chevron" width="10" height="10" viewBox="0 0 10 10" fill="none">
        <path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>
      </svg>
      <span class="collection-name">${col.name}</span>
      <span class="collection-count">${col.variables.length}</span>
    `;
    header.addEventListener("click", () => {
      colEl.classList.toggle("collapsed");
    });

    // Body
    const body = document.createElement("div");
    body.className = "collection-body";

    // Mode tabs (only if multiple modes)
    if (col.modes.length > 1) {
      const modeTabs = document.createElement("div");
      modeTabs.className = "mode-tabs";
      for (const mode of col.modes) {
        const t = document.createElement("button");
        t.className = "mode-tab" + (mode === currentMode ? " active" : "");
        t.textContent = mode;
        t.addEventListener("click", () => {
          activeMode[col.name] = mode;
          renderTokens();
          renderExport();
        });
        modeTabs.appendChild(t);
      }
      body.appendChild(modeTabs);
    }

    // Variable rows
    for (const v of col.variables) {
      const value = v.values[currentMode] ?? Object.values(v.values)[0] ?? "—";
      const row = document.createElement("div");
      row.className = "var-row";

      // Swatch (color) or type icon
      const swatchEl = document.createElement("div");
      if (v.type === "COLOR" && isHex(value)) {
        swatchEl.className = "swatch";
        swatchEl.style.background = value;
      } else {
        swatchEl.className = "swatch";
        swatchEl.style.background = "transparent";
        swatchEl.style.border = "1px dashed var(--border-bright)";
      }

      const nameEl = document.createElement("div");
      nameEl.style.overflow = "hidden";
      nameEl.innerHTML = `
        <div class="var-name">${v.figmaName}</div>
        <div class="var-css">${v.cssName}</div>
      `;

      const valueEl = document.createElement("div");
      valueEl.className = "var-value";
      valueEl.textContent = value.length > 16 ? value.slice(0, 14) + "…" : value;
      valueEl.title = value;

      row.appendChild(swatchEl);
      row.appendChild(nameEl);
      row.appendChild(valueEl);
      body.appendChild(row);
    }

    colEl.appendChild(header);
    colEl.appendChild(body);
    list.appendChild(colEl);
  }
}

// ── Render: export panel ──────────────────────────────────────────────────────

function renderExport() {
  if (collections.length === 0) return;

  const bridge = toBridgeJSON(collections);
  const css = toCssSnippet(collections);
  const count = Object.keys(bridge).length;

  // JSON preview (first 15 entries)
  const entries = Object.entries(bridge).slice(0, 15);
  const jsonLines = ["{"];
  for (const [k, v] of entries) {
    jsonLines.push(`  <span class="key">"${k}"</span>: {`);
    jsonLines.push(`    "$type": <span class="str">"${v.$type}"</span>,`);
    jsonLines.push(`    "$value": <span class="val">"${v.$value}"</span>`);
    jsonLines.push(`  },`);
  }
  if (Object.keys(bridge).length > 15) {
    jsonLines.push(`  <span style="color:var(--text-dim)">// … ${Object.keys(bridge).length - 15} more</span>`);
  }
  jsonLines.push("}");
  el("export-preview").innerHTML = jsonLines.join("\n");

  // CSS preview (first 20 lines)
  const cssLines = css.split("\n").slice(0, 20);
  if (css.split("\n").length > 20) cssLines.push("  /* … */");
  cssLines.push("}");
  el("export-css").textContent = cssLines.join("\n");

  el("export-meta").textContent = `${count} tokens`;

  // Wire copy buttons
  el("btn-copy-json").onclick = () => {
    copyText(JSON.stringify(bridge, null, 2));
    send({ type: "notify", message: `Copied ${count} tokens as bridge JSON` });
    el("btn-copy-json").textContent = "✓ Copied";
    setTimeout(() => { el("btn-copy-json").textContent = "Copy JSON"; }, 2000);
  };

  el("btn-copy-css").onclick = () => {
    copyText(css);
    send({ type: "notify", message: `Copied ${count} CSS custom properties` });
    el("btn-copy-css").textContent = "✓ Copied";
    setTimeout(() => { el("btn-copy-css").textContent = "Copy CSS"; }, 2000);
  };
}

// ── Auto-persist bundle to workspace ─────────────────────────────────────────

async function autoPersistBundle(cols: ExtractedCollection[]) {
  // Only persist if we have a connection (dev or prod)
  const connDot = el<HTMLElement>("conn-dot");
  if (!connDot.classList.contains("online")) return;

  const base = getConnectedBase();

  try {
    const res = await fetch(`${base}/api/bundle`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(cols),
    });

    if (res.ok) {
      const data = await res.json() as { tokens: number; savedAt: string };
      // Show a subtle indicator in the status bar (non-blocking)
      const statusCount = el("status-count");
      const prev = statusCount.textContent;
      statusCount.textContent = `${data.tokens} tokens synced ✓`;
      setTimeout(() => { statusCount.textContent = prev; }, 3000);
    }
  } catch {
    // Silent fail — bundle persistence is best-effort, never block the user
  }
}

// ── Tab switching ─────────────────────────────────────────────────────────────

function switchTab(tab: string) {
  activeTab = tab;
  document.querySelectorAll(".tab").forEach((t) => {
    t.classList.toggle("active", (t as HTMLElement).dataset.tab === tab);
  });
  document.querySelectorAll(".panel").forEach((p) => {
    p.classList.toggle("active", p.id === `panel-${tab}`);
  });
}

// ── Message handler ───────────────────────────────────────────────────────────

window.onmessage = (event) => {
  const msg = event.data?.pluginMessage as PluginMessage | undefined;
  if (!msg) return;

  switch (msg.type) {
    case "ready":
      setStatus("spin", "Scanning variables…");
      break;

    case "status":
      setStatus("spin", msg.message);
      break;

    case "collections":
      collections = msg.payload;
      const total = msg.totalCount;

      if (total === 0) {
        setStatus("warn", "No local variables found in this file");
      } else {
        setStatus("ok", `${collections.length} collection${collections.length !== 1 ? "s" : ""} extracted`, `${total} tokens`);
      }

      // Set default mode for each collection
      for (const col of collections) {
        if (!activeMode[col.name]) {
          activeMode[col.name] = col.modes[0] ?? "Default";
        }
      }

      renderTokens();
      renderExport();
      autoPersistBundle(collections);
      if (total > 0) updateFirstRunStep("extract", true);
      break;

    case "error":
      setStatus("error", msg.message);
      break;

    case "settings":
      pluginSettings = msg.settings ?? {};
      applySettings(pluginSettings);
      break;
  }
};

// ── Settings helpers ──────────────────────────────────────────────────────────

function applySettings(s: typeof pluginSettings) {
  const wsInput = document.getElementById("setting-workspace") as HTMLInputElement | null;
  const sbInput = document.getElementById("setting-storybook") as HTMLInputElement | null;
  const vcInput = document.getElementById("setting-vercel") as HTMLInputElement | null;
  if (wsInput && s.workspaceUrl) wsInput.value = s.workspaceUrl;
  if (sbInput && s.storybookUrl) sbInput.value = s.storybookUrl;
  if (vcInput && s.vercelUrl) vcInput.value = s.vercelUrl;
}

// ── Workflows: connection ping ────────────────────────────────────────────────

const DEV_URL = "http://localhost:3001";
const PROD_URL = "https://systemix-alpha.vercel.app";

async function pingConnection() {
  const connDot = el<HTMLElement>("conn-dot");
  const connLabel = el<HTMLElement>("conn-label");
  const connUrl = el<HTMLElement>("conn-url");

  // Try dev server first
  try {
    const r = await fetch(`${DEV_URL}/api/ping`, {
      signal: AbortSignal.timeout(2000),
    });
    if (r.ok) {
      connDot.className = "conn-dot online";
      connLabel.textContent = "Workspace connected";
      connUrl.textContent = "localhost:3001";
      setRunButtonsState(true);
      updateFirstRunStep("server", true);
      return;
    }
  } catch {
    // fall through to prod check
  }

  // Try prod
  try {
    const r = await fetch(`${PROD_URL}/api/ping`, {
      signal: AbortSignal.timeout(4000),
    });
    if (r.ok) {
      connDot.className = "conn-dot online";
      connLabel.textContent = "Workspace connected";
      connUrl.textContent = "systemix-alpha.vercel.app";
      setRunButtonsState(true);
      updateFirstRunStep("server", true);
      return;
    }
  } catch {
    // no connection
  }

  connDot.className = "conn-dot offline";
  connLabel.textContent = "Workspace offline — developers: run npm run dev";
  connUrl.textContent = "";
  setRunButtonsState(false);
  updateFirstRunStep("server", false);
}

function setRunButtonsState(enabled: boolean) {
  const runBtn = document.getElementById("canvas-run") as HTMLButtonElement | null;
  if (runBtn) runBtn.disabled = !enabled;
}

// ── First-run banner ──────────────────────────────────────────────────────────

let firstRunDismissed = false;

function updateFirstRunStep(step: "extract" | "server", done: boolean) {
  if (firstRunDismissed) return;
  const banner = document.getElementById("firstrun-banner");
  if (!banner) return;
  banner.classList.add("visible");

  if (step === "extract") {
    const li = document.getElementById("fr-step-extract");
    if (li) {
      li.classList.toggle("done", done);
      const num = li.querySelector(".step-num");
      if (num) num.textContent = done ? "✓" : "2";
    }
  }
  if (step === "server") {
    const li = document.getElementById("fr-step-server");
    if (li) {
      li.classList.toggle("done", done);
      const num = li.querySelector(".step-num");
      if (num) num.textContent = done ? "✓" : "3";
      const txt = document.getElementById("fr-server-text");
      if (txt) txt.textContent = done
        ? "Workspace running — you're ready to go!"
        : "Workspace offline — ask your developer to run npm run dev";
    }
  }
}

// ── (legacy card state machine kept for SSE streaming reuse) ─────────────────

function setCardState(
  card: HTMLElement,
  state: "idle" | "running" | "success" | "error",
  message?: string,
) {
  card.dataset.state = state;
  const progress = card.querySelector<HTMLElement>(".wf-progress");
  const runBtn = card.querySelector<HTMLButtonElement>(".btn-run");

  if (!progress) return;

  if (state === "idle") {
    progress.innerHTML = "";
    if (runBtn) { runBtn.innerHTML = "Run ▸"; runBtn.disabled = false; }
  } else if (state === "running") {
    progress.innerHTML = '<span class="wf-spinner"></span> Starting…';
    if (runBtn) { runBtn.innerHTML = '<span class="wf-spinner"></span>'; runBtn.disabled = true; }
  } else if (state === "success") {
    progress.textContent = `✓ ${message ?? "Done"}`;
    if (runBtn) { runBtn.innerHTML = "Run ▸"; runBtn.disabled = false; }
    setTimeout(() => setCardState(card, "idle"), 5000);
  } else if (state === "error") {
    progress.innerHTML = `✕ ${message ?? "Failed"} <button class="btn btn-sm" style="margin-left:8px" data-retry>Retry</button>`;
    const retryBtn = progress.querySelector<HTMLButtonElement>("[data-retry]");
    if (retryBtn) {
      retryBtn.addEventListener("click", () => {
        const runBtnMain = card.querySelector<HTMLButtonElement>("[data-skill]");
        if (runBtnMain) runBtnMain.click();
      });
    }
    if (runBtn) { runBtn.innerHTML = "Run ▸"; runBtn.disabled = false; }
  }
}

function appendProgressLine(card: HTMLElement, line: string) {
  const progress = card.querySelector<HTMLElement>(".wf-progress");
  if (!progress) return;
  const lines = progress.querySelectorAll(".wf-log-line");
  if (lines.length >= 3) lines[0].remove(); // keep max 3 lines
  const span = document.createElement("div");
  span.className = "wf-log-line";
  span.textContent = line.length > 60 ? line.slice(0, 58) + "…" : line;
  progress.appendChild(span);
}

// ── Workflows: helper to determine base URL ───────────────────────────────────

function getConnectedBase(): string {
  if (pluginSettings.workspaceUrl) return pluginSettings.workspaceUrl;
  const urlEl = el<HTMLElement>("conn-url");
  return urlEl.textContent?.includes("localhost") ? DEV_URL : PROD_URL;
}

// ── Workflows: SSE streaming ──────────────────────────────────────────────────

function startProgressStream(card: HTMLElement, runId: string, base: string) {
  const es = new EventSource(`${base}/api/run/${runId}/stream`);
  const startTime = Date.now();

  es.onmessage = (e) => {
    const msg = JSON.parse(e.data) as { type: string; line?: string; exitCode?: number; summary?: string };
    if (msg.type === "log" && msg.line) {
      // Filter out empty lines and npm noise
      const line = msg.line.trim();
      if (line && !line.startsWith("npm warn") && !line.startsWith(">")) {
        appendProgressLine(card, line);
      }
    } else if (msg.type === "done") {
      es.close();
      const duration = ((Date.now() - startTime) / 1000).toFixed(1);
      if (msg.exitCode === 0) {
        setCardState(card, "success", `${msg.summary ?? "Done"} · ${duration}s`);
      } else {
        setCardState(card, "error", msg.summary ?? "Process exited with error");
      }
    }
  };

  es.onerror = () => {
    es.close();
    setCardState(card, "error", "Connection to dev server lost");
  };
}

// ── Workflow canvas data ──────────────────────────────────────────────────────

// Types imported from workflow-types.ts (shared with WorkflowCanvas.tsx)
type WfStep    = import("./workflow-types").WfStep;
type LinearWf  = import("./workflow-types").LinearWf;
type ParallelWf = import("./workflow-types").ParallelWf;
type OrchWf    = import("./workflow-types").OrchWf;
type SnapshotWf = import("./workflow-types").SnapshotWf;

let canvasRoot: Root | null = null;

const WORKFLOWS: Workflow[] = [
  // ── LINEAR ──
  { id: "token-sync", name: "Token Sync", type: "linear", skill: "tokens",
    page: "/workspace/variables", mcps: ["figma", "console"], layout: "linear",
    steps: [{ label: "Extract", cmd: "/figma" }, { label: "Convert", cmd: "/tokens" }, { label: "Push", cmd: "/sync-to-figma" }, { label: "Verify", cmd: "/drift-report" }],
    desc: "Pull Figma vars → globals.css → push back → confirm drift cleared." },
  { id: "design-to-code", name: "Design → Code", type: "linear", skill: "design-to-code",
    page: "/workspace/combobox", mcps: ["figma"], layout: "linear",
    steps: [{ label: "Inspect", cmd: "/figma" }, { label: "Generate", cmd: "/component" }, { label: "Preview", cmd: "/storybook" }, { label: "Commit", cmd: "/deploy" }],
    desc: "Figma node → React component → Storybook preview → deploy." },
  { id: "deploy-pipeline", name: "Deploy Pipeline", type: "linear", skill: "deploy",
    page: "/workspace", mcps: ["cli"], layout: "linear",
    steps: [{ label: "Build", cmd: "npm run build" }, { label: "Test", cmd: "npm test" }, { label: "Deploy", cmd: "/deploy" }, { label: "Annotate", cmd: "/deploy-annotate" }],
    desc: "Build, test, deploy to Vercel, and annotate Figma with the preview URL." },
  { id: "drift-fix", name: "Drift Fix", type: "linear", skill: "drift-report",
    page: "/workspace/variables", mcps: ["figma", "console"], layout: "linear",
    keywords: ["drift", "mismatch", "out of sync", "different", "wrong value"],
    steps: [{ label: "Detect", cmd: "/drift-report" }, { label: "Propose", cmd: "/tokens" }, { label: "Apply", cmd: "/sync-to-figma" }, { label: "Confirm", cmd: "/check-parity" }],
    desc: "Detect token drift, propose fixes, apply to Figma, and verify parity." },
  // ── PARALLEL ──
  { id: "full-audit", name: "Full Audit", type: "parallel", skill: "drift-report",
    page: "/workspace/variables", mcps: ["figma", "cli"], layout: "parallel",
    tracks: [[{ label: "Variables", cmd: "/drift-report" }, { label: "Parity", cmd: "/check-parity" }], [{ label: "Components", cmd: "/component" }, { label: "Stories", cmd: "/storybook" }]],
    desc: "Audit tokens and components simultaneously, then merge results." },
  { id: "multi-collection", name: "Multi-Collection Sync", type: "parallel", skill: "sync-to-figma",
    page: "/workspace/variables", mcps: ["console"], layout: "parallel",
    tracks: [[{ label: "Semantic", cmd: "/tokens" }], [{ label: "Status", cmd: "/tokens" }], [{ label: "Spacing", cmd: "/tokens" }]],
    desc: "Push all token collections to Figma at the same time." },
  { id: "cross-platform", name: "Cross-Platform Push", type: "parallel", skill: "sync",
    page: "/workspace", mcps: ["figma", "console"], layout: "parallel",
    tracks: [[{ label: "Figma", cmd: "/sync-to-figma" }], [{ label: "Storybook", cmd: "/storybook" }], [{ label: "Deploy", cmd: "/deploy" }]],
    desc: "Push tokens and components to Figma, Storybook, and Vercel simultaneously." },
  // ── ORCHESTRATION ──
  { id: "ds-refresh", name: "Design System Refresh", type: "orchestration", skill: "sync",
    page: "/workspace", mcps: ["figma", "console", "cli"], layout: "orchestration",
    coordinator: "Claude", agents: ["token-writer", "figma-reader", "code-gen", "drift-monitor"],
    desc: "Coordinator delegates to specialized agents for a full design system refresh." },
  { id: "component-library", name: "Component Library", type: "orchestration", skill: "component",
    page: "/workspace/combobox", mcps: ["figma"], layout: "orchestration",
    coordinator: "Claude", agents: ["figma-reader", "component-gen", "storybook-writer", "code-connect"],
    desc: "Build a component library from Figma — one agent per component type." },
  { id: "theme-migration", name: "Theme Migration", type: "orchestration", skill: "apply-theme",
    page: "/workspace/variables", mcps: ["console", "cli"], layout: "orchestration",
    coordinator: "Claude", agents: ["token-analyzer", "theme-writer", "preview-agent", "drift-checker"],
    desc: "Migrate to a new theme using coordinated token analysis and application agents." },
  // ── REVIEW ──
  { id: "token-push-review", name: "Token Push Review", type: "review", skill: "sync-to-figma",
    page: "/workspace/variables", mcps: ["console"], layout: "review",
    steps: [{ label: "Propose", cmd: "/sync-to-figma --dry-run" }, { label: "Diff", cmd: "/drift-report" }, { label: "✓ Approve", cmd: "human", review: true }, { label: "Push", cmd: "/sync-to-figma" }],
    desc: "Preview exactly which tokens will change in Figma before pushing." },
  { id: "component-review", name: "Component Review", type: "review", skill: "component",
    page: "/workspace/combobox", mcps: ["figma"], layout: "review",
    steps: [{ label: "Generate", cmd: "/component" }, { label: "Preview", cmd: "/storybook" }, { label: "✓ Accept", cmd: "human", review: true }, { label: "Commit", cmd: "git commit" }],
    desc: "Generate a React component from Figma, preview it, then commit after approval." },
  // ── SNAPSHOT ──
  { id: "system-health", name: "System Health", type: "snapshot", skill: "drift-report",
    page: "/workspace/variables", mcps: ["figma", "cli"], layout: "snapshot",
    checks: ["Variables", "Components", "Build", "Deploy"],
    desc: "Read-only audit across the full stack — drift, parity, build, deploy status." },
  { id: "token-inventory", name: "Token Inventory", type: "snapshot", skill: "drift-report",
    page: "/workspace/variables", mcps: ["figma"], layout: "snapshot",
    checks: ["Extract All", "Classify", "Count Drifted", "Export Report"],
    desc: "Extract all Figma variables and classify them into a structured inventory." },
  // ── REVIEW: Token Source Audit ──
  { id: "token-source-audit", name: "Token Source Audit", type: "review", skill: "token-source-audit",
    page: "/workspace/variables", mcps: ["figma", "console"], layout: "review",
    keywords: ["hardcoded", "hex", "oklch", "tailwind", "reference", "color value", "raw color", "not pointing", "hardcode", "theme", "variable reference", "drift", "wrong color", "should be", "convert"],
    steps: [
      { label: "Extract Vars", cmd: "/figma" },
      { label: "Find Hardcoded", cmd: "audit" },
      { label: "Map → Tailwind", cmd: "map" },
      { label: "✓ Approve Diff", cmd: "human", review: true },
      { label: "Apply", cmd: "/sync-to-figma" },
    ],
    desc: "Detect hardcoded hex values in Figma Theme variables → map to Tailwind aliases or convert to oklch()." },
];


// ── Workflows: canvas wiring ──────────────────────────────────────────────────

let activeWf: Workflow | null = null;
let canvasRunId: string | null = null;

function setCanvasState(state: "idle" | "running" | "success" | "error", message?: string) {
  const canvas = document.getElementById("wf-canvas")!;
  const runBtn = document.getElementById("canvas-run") as HTMLButtonElement;
  const progress = document.getElementById("canvas-progress")!;
  canvas.dataset.state = state;

  if (state === "idle") {
    progress.innerHTML = "";
    runBtn.innerHTML = "Run ▸"; runBtn.disabled = false;
  } else if (state === "running") {
    progress.innerHTML = '<span class="wf-spinner"></span> Starting…';
    runBtn.innerHTML = '<span class="wf-spinner"></span>'; runBtn.disabled = true;
  } else if (state === "success") {
    progress.textContent = `✓ ${message ?? "Done"}`;
    runBtn.innerHTML = "Run ▸"; runBtn.disabled = false;
    setTimeout(() => setCanvasState("idle"), 5000);
  } else if (state === "error") {
    progress.innerHTML = `✕ ${message ?? "Failed"} <button class="btn btn-sm" style="margin-left:8px" id="canvas-retry">Retry</button>`;
    document.getElementById("canvas-retry")?.addEventListener("click", () => {
      if (activeWf) triggerCanvasRun(activeWf);
    });
    runBtn.innerHTML = "Run ▸"; runBtn.disabled = false;
  }
}

function appendCanvasLog(line: string) {
  const progress = document.getElementById("canvas-progress")!;
  const lines = progress.querySelectorAll(".wf-log-line");
  if (lines.length >= 3) lines[0].remove();
  const span = document.createElement("div");
  span.className = "wf-log-line";
  span.textContent = line.length > 60 ? line.slice(0, 58) + "…" : line;
  progress.appendChild(span);
}

function startCanvasStream(runId: string, base: string) {
  const es = new EventSource(`${base}/api/run/${runId}/stream`);
  const t0 = Date.now();
  es.onmessage = (e) => {
    const msg = JSON.parse(e.data) as { type: string; line?: string; exitCode?: number; summary?: string };
    if (msg.type === "log" && msg.line) {
      const line = msg.line.trim();
      if (line && !line.startsWith("npm warn") && !line.startsWith(">")) appendCanvasLog(line);
    } else if (msg.type === "done") {
      es.close();
      const dur = ((Date.now() - t0) / 1000).toFixed(1);
      if (msg.exitCode === 0) setCanvasState("success", `${msg.summary ?? "Done"} · ${dur}s`);
      else setCanvasState("error", msg.summary ?? "Process exited with error");
    }
  };
  es.onerror = () => { es.close(); setCanvasState("error", "Connection to dev server lost"); };
}

const CLI_SKILLS = ["tokens", "sync-to-figma", "drift-report", "deploy", "build"];

async function triggerCanvasRun(wf: Workflow) {
  const base = pluginSettings.workspaceUrl?.replace(/\/$/, "") || getConnectedBase();
  const page = wf.page;

  if (!CLI_SKILLS.includes(wf.skill)) {
    send({ type: "open-url", url: `${base}${page}?run=${wf.skill}` } as UIMessage);
    return;
  }
  setCanvasState("running");
  try {
    const res = await fetch(`${base}/api/run`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ skill: wf.skill }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({})) as { error?: string };
      setCanvasState("error", err.error ?? `Server error ${res.status}`);
      return;
    }
    const data = await res.json() as { runId: string };
    canvasRunId = data.runId;
    startCanvasStream(data.runId, base);
  } catch {
    setCanvasState("error", "Could not reach dev server");
  }
}

function selectWorkflow(wf: Workflow) {
  activeWf = wf;

  // Update tile selection
  document.querySelectorAll<HTMLElement>(".wf-tile").forEach((t) => {
    t.classList.toggle("selected", t.dataset.id === wf.id);
  });

  // Populate canvas header
  const nameEl = document.getElementById("canvas-name")!;
  const badgeEl = document.getElementById("canvas-badge")!;
  nameEl.textContent = wf.name;
  badgeEl.textContent = wf.type.charAt(0).toUpperCase() + wf.type.slice(1);
  badgeEl.className = `wf-tile-badge ${wf.type}`;

  // Render React Flow canvas island
  const stage = document.getElementById("canvas-stage")!;
  if (canvasRoot) {
    canvasRoot.render(createElement(WorkflowCanvas, { workflow: wf }));
  } else {
    canvasRoot = createRoot(stage);
    canvasRoot.render(createElement(WorkflowCanvas, { workflow: wf }));
  }

  // Description
  document.getElementById("canvas-desc")!.textContent = wf.desc;

  // MCP badges
  const mcpsEl = document.getElementById("canvas-mcps")!;
  mcpsEl.innerHTML = "";
  wf.mcps.forEach((mcp) => {
    const badge = document.createElement("span");
    badge.className = `canvas-mcp ${mcp}`;
    badge.textContent = mcp === "cli" ? "CLI" : mcp === "figma" ? "Figma MCP" : mcp === "console" ? "Console MCP" : mcp;
    mcpsEl.appendChild(badge);
  });

  // Show canvas
  const canvas = document.getElementById("wf-canvas")!;
  canvas.style.display = "";
  setCanvasState("idle");
}

function matchWorkflowByDescription(text: string): Workflow | null {
  const words = text.toLowerCase().split(/[\s,]+/).filter(Boolean);
  let best: Workflow | null = null;
  let bestScore = 0;
  WORKFLOWS.forEach((wf) => {
    const kws = (wf.keywords ?? []).map((k) => k.toLowerCase());
    let score = 0;
    words.forEach((w) => {
      kws.forEach((k) => { if (k.includes(w) || w.includes(k)) score++; });
      // also match against name and desc
      if (wf.name.toLowerCase().includes(w)) score += 0.5;
      if (wf.desc.toLowerCase().includes(w)) score += 0.3;
    });
    if (score > bestScore) { bestScore = score; best = wf; }
  });
  return bestScore > 0 ? best : null;
}

function initSettings() {
  const overlay = document.getElementById("settings-overlay")!;
  const openBtn = document.getElementById("btn-settings")!;
  const closeBtn = document.getElementById("settings-close")!;
  const saveBtn = document.getElementById("settings-save")!;

  openBtn.addEventListener("click", () => {
    overlay.classList.add("open");
    send({ type: "load-settings" });
  });
  closeBtn.addEventListener("click", () => overlay.classList.remove("open"));

  saveBtn.addEventListener("click", () => {
    const ws = (document.getElementById("setting-workspace") as HTMLInputElement).value.trim();
    const sb = (document.getElementById("setting-storybook") as HTMLInputElement).value.trim();
    const vc = (document.getElementById("setting-vercel") as HTMLInputElement).value.trim();
    pluginSettings = { workspaceUrl: ws || undefined, storybookUrl: sb || undefined, vercelUrl: vc || undefined };
    send({ type: "save-settings", settings: pluginSettings });
    overlay.classList.remove("open");
  });

  // Test buttons
  async function testUrl(inputId: string, statusId: string) {
    const url = (document.getElementById(inputId) as HTMLInputElement).value.trim();
    const status = document.getElementById(statusId)!;
    if (!url) { status.textContent = "Enter a URL first"; status.className = "settings-status err"; return; }
    status.textContent = "Testing…"; status.className = "settings-status";
    try {
      await fetch(url, { signal: AbortSignal.timeout(3000), mode: "no-cors" });
      status.textContent = "✓ Reachable"; status.className = "settings-status ok";
    } catch {
      status.textContent = "✕ Not reachable"; status.className = "settings-status err";
    }
  }

  document.getElementById("setting-workspace-test")?.addEventListener("click", () => testUrl("setting-workspace", "setting-workspace-status"));
  document.getElementById("setting-storybook-test")?.addEventListener("click", () => testUrl("setting-storybook", "setting-storybook-status"));

  // MCP config copy buttons
  const figmaMcpConfig = `{
  "mcpServers": {
    "figma": {
      "command": "npx",
      "args": ["-y", "@figma/mcp-server"]
    }
  }
}`;
  const consoleMcpConfig = `{
  "mcpServers": {
    "figma-console": {
      "command": "npx",
      "args": ["-y", "figma-console-mcp@1.15.5"]
    }
  }
}`;
  const vercelMcpConfig = `{
  "mcpServers": {
    "vercel": {
      "command": "npx",
      "args": ["-y", "@vercel/mcp-adapter"],
      "env": { "VERCEL_API_TOKEN": "your-token-here" }
    }
  }
}`;

  document.getElementById("copy-figma-mcp-config")?.addEventListener("click", () => {
    copyText(figmaMcpConfig);
    const b = document.getElementById("copy-figma-mcp-config")!;
    b.textContent = "✓ Copied"; setTimeout(() => { b.textContent = "Copy MCP config"; }, 2000);
  });
  document.getElementById("copy-console-mcp-config")?.addEventListener("click", () => {
    copyText(consoleMcpConfig);
    const b = document.getElementById("copy-console-mcp-config")!;
    b.textContent = "✓ Copied"; setTimeout(() => { b.textContent = "Copy config"; }, 2000);
  });
  document.getElementById("copy-vercel-mcp-config")?.addEventListener("click", () => {
    copyText(vercelMcpConfig);
    const b = document.getElementById("copy-vercel-mcp-config")!;
    b.textContent = "✓ Copied"; setTimeout(() => { b.textContent = "Copy config"; }, 2000);
  });
}

function initWorkflows() {
  const tileGrid = document.getElementById("wf-tile-grid")!;
  const typeBar = document.getElementById("wf-type-bar")!;
  const describeInput = document.getElementById("describe-input") as HTMLInputElement;
  const describeFind = document.getElementById("describe-find")!;
  const describeHint = document.getElementById("describe-hint")!;
  let activeFilter = "all";

  function renderTiles() {
    tileGrid.innerHTML = "";
    const filtered = activeFilter === "all" ? WORKFLOWS : WORKFLOWS.filter((w) => w.type === activeFilter);
    filtered.forEach((wf) => {
      const tile = document.createElement("div");
      tile.className = "wf-tile";
      tile.dataset.id = wf.id;
      tile.dataset.type = wf.type;

      const stepCount = wf.layout === "linear" || wf.layout === "review"
        ? (wf as LinearWf).steps.length
        : wf.layout === "parallel"
          ? (wf as ParallelWf).tracks.reduce((s, t) => s + t.length, 0)
          : wf.layout === "snapshot"
            ? (wf as SnapshotWf).checks.length
            : (wf as OrchWf).agents.length;

      tile.innerHTML = `
        <div class="wf-tile-name">${wf.name}</div>
        <div class="wf-tile-meta">
          <span class="wf-tile-badge ${wf.type}">${wf.type === "orchestration" ? "Orch" : wf.type.charAt(0).toUpperCase() + wf.type.slice(1)}</span>
          <span class="wf-tile-steps">${stepCount} steps</span>
        </div>`;

      tile.addEventListener("click", () => selectWorkflow(wf));
      tileGrid.appendChild(tile);
    });

    // Select first tile by default if none selected, or keep active
    if (activeWf) {
      const match = filtered.find((w) => w.id === activeWf!.id);
      if (match) selectWorkflow(match);
      else if (filtered.length > 0) selectWorkflow(filtered[0]);
      else { document.getElementById("wf-canvas")!.style.display = "none"; activeWf = null; }
    } else if (filtered.length > 0) {
      selectWorkflow(filtered[0]);
    }
  }

  typeBar.querySelectorAll<HTMLButtonElement>(".wf-pill").forEach((pill) => {
    pill.addEventListener("click", () => {
      typeBar.querySelectorAll(".wf-pill").forEach((p) => p.classList.remove("active"));
      pill.classList.add("active");
      activeFilter = pill.dataset.filter ?? "all";
      renderTiles();
    });
  });

  // Canvas run button
  document.getElementById("canvas-run")!.addEventListener("click", () => {
    if (activeWf) triggerCanvasRun(activeWf);
  });

  // Canvas copy button
  document.getElementById("canvas-copy")!.addEventListener("click", () => {
    if (!activeWf) return;
    const cmd = `/${activeWf.skill}`;
    copyText(cmd);
    const btn = document.getElementById("canvas-copy")!;
    const orig = btn.textContent;
    btn.textContent = "✓";
    setTimeout(() => { btn.textContent = orig; }, 1500);
  });

  // Describe-problem input
  function runDescribe() {
    const text = describeInput.value.trim();
    if (!text) return;
    const match = matchWorkflowByDescription(text);
    if (match) {
      // Show hint banner
      describeHint.innerHTML = `⬡ Matched: <strong>${match.name}</strong> — ${match.desc.slice(0, 60)}…`;
      describeHint.className = "describe-match-hint visible";
      // Reset filter to all so the tile is visible
      activeFilter = "all";
      typeBar.querySelectorAll(".wf-pill").forEach((p) => {
        p.classList.toggle("active", (p as HTMLElement).dataset.filter === "all");
      });
      renderTiles();
      selectWorkflow(match);
    } else {
      describeHint.textContent = "No matching workflow found — try different keywords.";
      describeHint.className = "describe-match-hint visible";
      describeHint.style.color = "var(--text-dim)";
    }
  }

  describeFind.addEventListener("click", runDescribe);
  describeInput.addEventListener("keydown", (e) => { if (e.key === "Enter") runDescribe(); });

  renderTiles();
}

// ── Init ──────────────────────────────────────────────────────────────────────

document.querySelectorAll(".tab").forEach((t) => {
  t.addEventListener("click", () => {
    const tab = (t as HTMLElement).dataset.tab ?? "tokens";
    switchTab(tab);
    if (tab === "workflows") pingConnection();
    if (tab === "preview") initPreview();
  });
});

el("btn-refresh").addEventListener("click", () => {
  collections = [];
  renderTokens();
  setStatus("spin", "Scanning variables…");
  send({ type: "extract" });
});

initWorkflows();
initSettings();

// ── First-run banner wiring ───────────────────────────────────────────────────

document.getElementById("firstrun-dismiss")?.addEventListener("click", () => {
  firstRunDismissed = true;
  const banner = document.getElementById("firstrun-banner");
  if (banner) banner.classList.remove("visible");
});

document.getElementById("offline-copy-cmd")?.addEventListener("click", () => {
  copyText("npm run dev");
  const btn = document.getElementById("offline-copy-cmd")!;
  const orig = btn.textContent;
  btn.textContent = "✓ Copied";
  setTimeout(() => { btn.textContent = orig; }, 2000);
});

// Show first-run banner on first load (no variables yet)
updateFirstRunStep("server", false);

// ── Preview tab ───────────────────────────────────────────────────────────────

const PREVIEW_PAGES = [
  "/workspace/combobox",
  "/workspace/variables",
  "/workspace/token-guard",
  "/pipeline",
];
let previewPageIndex = 0;

function initPreview() {
  const frame = el<HTMLIFrameElement>("preview-frame");
  const offline = el<HTMLElement>("preview-offline");
  const pill = el<HTMLElement>("preview-url-pill");

  // Determine base — same logic as workflows
  const connDot = el<HTMLElement>("conn-dot");
  const isOnline = connDot.classList.contains("online");
  const base = isOnline ? getConnectedBase() : null;

  if (!base) {
    frame.style.display = "none";
    offline.style.display = "flex";
    return;
  }

  offline.style.display = "none";
  frame.style.display = "block";

  const page = PREVIEW_PAGES[previewPageIndex] ?? PREVIEW_PAGES[0];
  const url = `${base}${page}`;
  if (frame.src !== url) frame.src = url;
  pill.textContent = url.replace("http://", "").replace("https://", "");

  // Toolbar controls
  el("preview-back").onclick = () => {
    previewPageIndex = (previewPageIndex - 1 + PREVIEW_PAGES.length) % PREVIEW_PAGES.length;
    initPreview();
  };
  el("preview-fwd").onclick = () => {
    previewPageIndex = (previewPageIndex + 1) % PREVIEW_PAGES.length;
    initPreview();
  };
  el("preview-reload").onclick = () => { frame.src = frame.src; };
  el("preview-open").onclick = () => { send({ type: "open-url", url }); };
}
