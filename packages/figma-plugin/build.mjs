/**
 * Build script — bundles code.ts and inlines ui.ts into ui.html
 * Run: node build.mjs [--watch]
 */

import esbuild from "esbuild";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const watch = process.argv.includes("--watch");

// Ensure dist/ exists
fs.mkdirSync(path.join(__dirname, "dist"), { recursive: true });

// ── Build code.ts → dist/code.js ─────────────────────────────────────────────

const codeCtx = await esbuild.context({
  entryPoints: ["src/code.ts"],
  bundle: true,
  outfile: "dist/code.js",
  platform: "browser",
  target: "es2017",
  format: "iife",
  logLevel: "info",
});

// ── Build ui.ts + WorkflowCanvas.tsx → inline into dist/ui.html ──────────────

async function buildUI() {
  const result = await esbuild.build({
    entryPoints: ["src/ui.ts"],
    bundle: true,
    write: false,
    platform: "browser",
    target: "es2020",
    format: "iife",
    jsx: "automatic",
    logLevel: "silent",
    minify: true,
  });

  const uiJs = result.outputFiles[0].text;

  // Inline React Flow CSS as a <style> block
  const rfCss = fs.readFileSync(
    path.join(__dirname, "node_modules/@xyflow/react/dist/style.css"),
    "utf-8"
  );

  const uiHtml = fs.readFileSync("src/ui.html", "utf-8");
  let output = uiHtml.replace("/* __UI_SCRIPT__ */", uiJs);
  // Inject React Flow CSS before </style> of the first style block
  output = output.replace("/* __REACTFLOW_CSS__ */", rfCss);
  fs.writeFileSync("dist/ui.html", output);
  console.log("[build] dist/ui.html updated");
}

if (watch) {
  await codeCtx.watch();

  // Simple watch for UI files
  const watchers = ["src/ui.ts", "src/ui.html", "src/types.ts", "src/WorkflowCanvas.tsx", "src/workflow-types.ts"];
  for (const f of watchers) {
    fs.watchFile(f, { interval: 300 }, async () => {
      await buildUI().catch(console.error);
    });
  }
  await buildUI();
  console.log("[watch] Watching for changes…");
} else {
  await codeCtx.rebuild();
  await codeCtx.dispose();
  await buildUI();
  console.log("[build] Done.");
}
