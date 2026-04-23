const fs = require("fs");
const path = require("path");
const os = require("os");
const net = require("net");

const SKILLS_DIR = path.join(os.homedir(), ".claude", "skills");
const CLAUDE_JSON = path.join(os.homedir(), ".claude.json");

const REQUIRED_SKILLS = [
  "figma", "tokens", "component", "storybook", "deploy",
  "sync-to-figma", "figma-push", "figma-inspect", "sync",
  "design-to-code", "drift-report", "apply-theme", "connect",
  "check-parity", "deploy-annotate"
];

function checkTcpPort(host, port, timeoutMs = 1500) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let settled = false;

    const done = (open) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolve(open);
    };

    socket.setTimeout(timeoutMs);
    socket.on("connect", () => done(true));
    socket.on("timeout", () => done(false));
    socket.on("error", () => done(false));
    socket.connect(port, host);
  });
}

function formatDate(date) {
  return date.toISOString().slice(0, 10);
}

function daysSince(mtime) {
  return Math.floor((Date.now() - mtime) / (1000 * 60 * 60 * 24));
}

async function doctor() {
  const results = []; // { icon, label, detail, level: "ok"|"warn"|"error" }

  // 1. .systemix/ directory
  const systemixDir = path.join(process.cwd(), ".systemix");
  if (fs.existsSync(systemixDir) && fs.statSync(systemixDir).isDirectory()) {
    results.push({ icon: "✅", label: ".systemix/ directory", level: "ok" });
  } else {
    results.push({ icon: "❌", label: ".systemix/ directory — not found, run: npx systemix init", level: "error" });
  }

  // 2. project-context.json with figma.fileKey
  const projectContextPath = path.join(systemixDir, "project-context.json");
  let fileKey = null;
  if (fs.existsSync(projectContextPath)) {
    try {
      const ctx = JSON.parse(fs.readFileSync(projectContextPath, "utf8"));
      fileKey = ctx?.figma?.fileKey || null;
    } catch (_) {}
  }
  if (fileKey) {
    results.push({ icon: "✅", label: `project-context.json (fileKey: ${fileKey})`, level: "ok" });
  } else if (fs.existsSync(projectContextPath)) {
    results.push({ icon: "❌", label: "project-context.json — missing figma.fileKey, run: npx systemix init", level: "error" });
  } else {
    results.push({ icon: "❌", label: "project-context.json — not found, run: npx systemix init", level: "error" });
  }

  // 3. tokens.bridge.json exists + is fresh (<7 days)
  const tokensBridgePath = path.join(systemixDir, "tokens.bridge.json");
  if (fs.existsSync(tokensBridgePath)) {
    const mtime = fs.statSync(tokensBridgePath).mtimeMs;
    const age = daysSince(mtime);
    if (age < 7) {
      results.push({ icon: "✅", label: "tokens.bridge.json", level: "ok" });
    } else {
      results.push({ icon: "⚠️ ", label: `tokens.bridge.json — ${age} days old, run: npm run tokens`, level: "warn" });
    }
  } else {
    results.push({ icon: "❌", label: "tokens.bridge.json — not found, run: npm run tokens", level: "error" });
  }

  // 4. Official Figma MCP in ~/.claude.json
  let claudeConfig = null;
  if (fs.existsSync(CLAUDE_JSON)) {
    try { claudeConfig = JSON.parse(fs.readFileSync(CLAUDE_JSON, "utf8")); } catch (_) {}
  }

  const hasFigmaMcp = (() => {
    if (!claudeConfig) return false;
    // Check mcpServers object keys for "claude.ai Figma" or "figma" with claude.ai prefix
    const servers = claudeConfig.mcpServers || {};
    if (Object.keys(servers).some(k => k === "claude.ai Figma" || k.toLowerCase().includes("figma") && k.toLowerCase().includes("claude"))) return true;
    // Check for mcp__claude_ai_Figma__ prefixed keys anywhere in config
    const configStr = JSON.stringify(claudeConfig);
    if (configStr.includes("mcp__claude_ai_Figma__") || configStr.includes("claude.ai Figma")) return true;
    return false;
  })();

  if (hasFigmaMcp) {
    results.push({ icon: "✅", label: "Official Figma MCP", level: "ok" });
  } else {
    results.push({ icon: "❌", label: "Official Figma MCP — not configured, add MCP config", level: "error" });
  }

  // 5. figma-console-mcp in ~/.claude.json (optional)
  const hasFigmaConsoleMcp = (() => {
    if (!claudeConfig) return false;
    const servers = claudeConfig.mcpServers || {};
    if (Object.keys(servers).some(k => k === "figma-console" || k.toLowerCase().includes("figma-console"))) return true;
    const configStr = JSON.stringify(claudeConfig);
    if (configStr.includes("mcp__figma-console__") || configStr.includes("figma-console")) return true;
    return false;
  })();

  if (hasFigmaConsoleMcp) {
    results.push({ icon: "✅", label: "figma-console-mcp", level: "ok" });
  } else {
    results.push({ icon: "❌", label: "figma-console-mcp — not configured (needed for write ops), add MCP config", level: "error" });
  }

  // 6. Figma Desktop running on port 3845
  const figmaDesktopUp = await checkTcpPort("localhost", 3845);
  if (figmaDesktopUp) {
    results.push({ icon: "✅", label: "Figma Desktop (port 3845)", level: "ok" });
  } else {
    results.push({ icon: "❌", label: "Figma Desktop — not reachable on port 3845 (needed for write ops), open Figma Desktop", level: "error" });
  }

  // 7. All 15 skills installed
  const installedSkills = REQUIRED_SKILLS.filter(skill => {
    const skillDir = path.join(SKILLS_DIR, skill);
    const skillMd = path.join(skillDir, "SKILL.md");
    return fs.existsSync(skillDir) && fs.statSync(skillDir).isDirectory() && fs.existsSync(skillMd);
  });
  const missingSkills = REQUIRED_SKILLS.filter(s => !installedSkills.includes(s));

  if (installedSkills.length === REQUIRED_SKILLS.length) {
    results.push({ icon: "✅", label: `${REQUIRED_SKILLS.length}/${REQUIRED_SKILLS.length} skills installed`, level: "ok" });
  } else if (installedSkills.length > 0) {
    results.push({
      icon: "⚠️ ",
      label: `${installedSkills.length}/${REQUIRED_SKILLS.length} skills installed — missing: ${missingSkills.join(", ")}, run: npx systemix add figma-to-code`,
      level: "warn"
    });
  } else {
    results.push({ icon: "❌", label: `0/${REQUIRED_SKILLS.length} skills installed — run: npx systemix add figma-to-code`, level: "error" });
  }

  // 8. Node.js version >= 18
  const nodeVersion = process.version; // e.g. "v20.11.0"
  const nodeMajor = parseInt(nodeVersion.slice(1).split(".")[0], 10);
  if (nodeMajor >= 18) {
    results.push({ icon: "✅", label: `Node.js ${nodeVersion}`, level: "ok" });
  } else {
    results.push({ icon: "❌", label: `Node.js ${nodeVersion} — version must be >= 18, upgrade Node`, level: "error" });
  }

  // --- Print output ---
  const today = formatDate(new Date());
  console.log(`\nSystemix Doctor — ${today}\n`);

  for (const r of results) {
    console.log(`${r.icon}  ${r.label}`);
  }

  const errors = results.filter(r => r.level === "error").length;
  const warnings = results.filter(r => r.level === "warn").length;

  console.log("\n──────────────────────────");
  const parts = [];
  if (errors > 0) parts.push(`${errors} error${errors !== 1 ? "s" : ""}`);
  if (warnings > 0) parts.push(`${warnings} warning${warnings !== 1 ? "s" : ""}`);
  if (parts.length === 0) {
    console.log("All checks passed\n");
  } else {
    console.log(parts.join(", ") + "\n");
  }

  if (errors > 0) process.exit(1);
}

module.exports = { doctor };
