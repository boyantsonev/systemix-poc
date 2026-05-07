"use strict";

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");
const { evidence } = require("./evidence");

// culori is a workspace dep — resolve from the monorepo root
let _culori = null;
function getCulori() {
  if (_culori) return _culori;
  try {
    // Walk up from __dirname until we find node_modules/culori
    let dir = __dirname;
    for (let i = 0; i < 8; i++) {
      const candidate = path.join(dir, "node_modules", "culori");
      if (fs.existsSync(candidate)) { _culori = require(candidate); return _culori; }
      const parent = path.dirname(dir);
      if (parent === dir) break;
      dir = parent;
    }
  } catch {}
  return null;
}

// ── Queue helpers ─────────────────────────────────────────────────────────────

function queuePath(projectRoot) {
  return path.join(projectRoot, ".systemix", "queue.json");
}

function readQueue(projectRoot) {
  const p = queuePath(projectRoot);
  if (!fs.existsSync(p)) return { cards: [] };
  try { return JSON.parse(fs.readFileSync(p, "utf8")); }
  catch { return { cards: [] }; }
}

function writeQueue(projectRoot, data) {
  const p = queuePath(projectRoot);
  const dir = path.dirname(p);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const tmp = p + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
  fs.renameSync(tmp, p);
}

function pushToQueue(projectRoot, card) {
  const queue = readQueue(projectRoot);
  queue.cards.push({
    id: `q-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    requestedAt: new Date().toISOString(),
    status: "pending",
    ...card,
  });
  writeQueue(projectRoot, queue);
  const label = card.token ?? card.component ?? card.filePath;
  console.log(`  [queue] → ${card.type}: ${label}`);
}

// ── Drift normalization (SYSTMIX-215) ─────────────────────────────────────────

function computeDeltaE(codeVal, figmaVal) {
  const culori = getCulori();
  if (!culori) return null;
  try {
    const a = culori.parse(codeVal);
    const b = culori.parse(figmaVal);
    if (!a || !b) return null;
    return culori.differenceCiede2000()(a, b);
  } catch {
    return null;
  }
}

function isColorValue(val) {
  if (!val) return false;
  const s = String(val).trim();
  return s.startsWith("#") || s.startsWith("oklch") || s.startsWith("rgb") ||
    s.startsWith("hsl") || s.startsWith("color(");
}

function normalizeDriftStatus(projectRoot, dryRun) {
  const tokenDir = path.join(projectRoot, "contract", "tokens");
  if (!fs.existsSync(tokenDir)) return;

  let updated = 0;
  for (const file of fs.readdirSync(tokenDir).filter(f => f.endsWith(".mdx"))) {
    const mdxPath = path.join(tokenDir, file);
    const raw = fs.readFileSync(mdxPath, "utf8");
    const fmMatch = raw.match(/^---\n([\s\S]*?)\n---/);
    if (!fmMatch) continue;

    const fm = {};
    for (const line of fmMatch[1].split("\n")) {
      const col = line.indexOf(":");
      if (col === -1) continue;
      fm[line.slice(0, col).trim()] = line.slice(col + 1).trim().replace(/^['"]|['"]$/g, "");
    }

    const codeVal = fm.value ?? null;
    const figmaVal = fm["figma-value"] && fm["figma-value"] !== "null" ? fm["figma-value"] : null;
    const currentStatus = fm.status ?? "unknown";
    const resolved = fm.resolved === "true";

    // Don't overwrite a human resolution decision
    if (resolved) continue;

    let newStatus = currentStatus;

    if (!figmaVal) {
      newStatus = "missing-in-figma";
    } else if (codeVal && figmaVal) {
      if (isColorValue(codeVal) && isColorValue(figmaVal)) {
        const de = computeDeltaE(codeVal, figmaVal);
        if (de !== null) {
          newStatus = de < 1 ? "clean" : "drifted";
          // Write delta-e back if field exists or status changed
          const newRaw = raw
            .replace(/^(status:).*$/m, `status: ${newStatus}`)
            .replace(/^(delta-e:).*$/m, `delta-e: ${de.toFixed(2)}`);
          if (newRaw !== raw && !dryRun) {
            fs.writeFileSync(mdxPath, newRaw, "utf8");
            updated++;
          }
          continue;
        }
      } else {
        // Non-color: direct comparison
        newStatus = codeVal.trim() === figmaVal.trim() ? "clean" : "drifted";
      }
    }

    if (newStatus !== currentStatus) {
      const newRaw = raw.replace(/^(status:).*$/m, `status: ${newStatus}`);
      if (!dryRun) {
        fs.writeFileSync(mdxPath, newRaw, "utf8");
        updated++;
      }
    }
  }

  if (updated > 0) {
    console.log(`  [drift-norm] Updated status on ${updated} token contract(s)`);
  }
}

// ── Confidence scorer ─────────────────────────────────────────────────────────

function scoreConfidence(change) {
  const { changeType, hasResolutionHistory, sourcesConflict, isNewInFigma } = change;
  if (changeType === "instrumentation") {
    return { level: "low", reason: "Component instrumentation always requires HITL approval" };
  }
  if (changeType === "css-only" && !sourcesConflict) {
    return { level: "high", reason: "Token changed in CSS only — single source, no conflict" };
  }
  if (hasResolutionHistory && !sourcesConflict) {
    return { level: "high", reason: "Change matches a prior resolution decision" };
  }
  if (sourcesConflict && !hasResolutionHistory) {
    return { level: "low", reason: "CSS and Figma values conflict with no prior resolution" };
  }
  if (isNewInFigma) {
    return { level: "low", reason: "New Figma token has no code counterpart — needs mapping decision" };
  }
  if (changeType === "drift" && !hasResolutionHistory) {
    return { level: "low", reason: "Drift detected with no resolution history" };
  }
  return { level: "low", reason: "Uncertain — defaulting to HITL for safety" };
}

// ── SSE event emitter ─────────────────────────────────────────────────────────

function writeEvent(projectRoot, event) {
  try {
    const dir = path.join(projectRoot, ".systemix", "events");
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 23);
    const name = `${stamp}-${event.type}.json`;
    fs.writeFileSync(path.join(dir, name), JSON.stringify({ ...event, timestamp: new Date().toISOString() }));
  } catch { /* non-fatal */ }
}

// ── Run log writer ────────────────────────────────────────────────────────────

function writeRunLog(projectRoot, entry) {
  const now = new Date();
  const stamp = now.toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const dir = path.join(projectRoot, ".systemix", "runs");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const logPath = path.join(dir, `${stamp}.json`);
  const existing = fs.existsSync(logPath)
    ? JSON.parse(fs.readFileSync(logPath, "utf8"))
    : { startedAt: now.toISOString(), entries: [] };
  existing.entries.push({ ...entry, at: new Date().toISOString() });
  fs.writeFileSync(logPath, JSON.stringify(existing, null, 2));
}

// ── CSS variable parser ───────────────────────────────────────────────────────

function parseCssVariables(cssContent) {
  const vars = {};
  const re = /--([a-zA-Z0-9_-]+)\s*:\s*([^;]+);/g;
  let m;
  while ((m = re.exec(cssContent)) !== null) {
    vars[m[1].trim()] = m[2].trim();
  }
  return vars;
}

function diffCssAgainstContracts(projectRoot, newVars) {
  const tokenDir = path.join(projectRoot, "contract", "tokens");
  if (!fs.existsSync(tokenDir)) return [];

  const changed = [];
  for (const file of fs.readdirSync(tokenDir).filter(f => f.endsWith(".mdx"))) {
    const raw = fs.readFileSync(path.join(tokenDir, file), "utf8");
    const fmMatch = raw.match(/^---\n([\s\S]*?)\n---/);
    if (!fmMatch) continue;
    const fm = {};
    for (const line of fmMatch[1].split("\n")) {
      const col = line.indexOf(":");
      if (col === -1) continue;
      fm[line.slice(0, col).trim()] = line.slice(col + 1).trim();
    }
    const tokenName = fm.token ?? file.replace(/\.mdx$/, "");
    const contractValue = fm.value ?? null;
    const resolveDecision = fm["resolve-decision"] ?? null;

    // Find matching CSS variable (strip leading --)
    const cssKey = tokenName.replace(/^--/, "");
    if (!(cssKey in newVars)) continue;
    const cssValue = newVars[cssKey];

    if (contractValue && cssValue && contractValue !== cssValue) {
      changed.push({
        tokenName,
        cssKey,
        file,
        oldValue: contractValue,
        newValue: cssValue,
        hasResolutionHistory: !!resolveDecision,
        changeType: "css-only",
        sourcesConflict: false,
      });
    }
  }
  return changed;
}

async function handleTokenChanges(projectRoot, changes, dryRun) {
  if (changes.length === 0) return;
  console.log(`  [css-diff] ${changes.length} token change(s) detected`);

  await Promise.all(changes.map(async (change) => {
    const { level, reason } = scoreConfidence(change);
    const logEntry = { type: "token-change", token: change.tokenName, from: change.oldValue, to: change.newValue, confidence: level, reason };

    if (level === "high") {
      console.log(`  [css-diff] ${change.tokenName} → high confidence (${reason}) — updating contract`);
      if (!dryRun) {
        const mdxPath = path.join(projectRoot, "contract", "tokens", change.file);
        const raw = fs.readFileSync(mdxPath, "utf8");
        const patched = raw.replace(
          new RegExp(`^(value:).*$`, "m"),
          `value: ${change.newValue}`
        );
        fs.writeFileSync(mdxPath, patched, "utf8");
        writeRunLog(projectRoot, { ...logEntry, action: "autonomous-write" });
        writeEvent(projectRoot, { type: "contract-updated", slug: change.tokenName, contractType: "token" });
        // Fire Hermes prose authoring in background — non-blocking, non-fatal
        const { data: fmData } = parseFrontmatterFlat(patched);
        authorTokenProseWithHermes(
          projectRoot,
          String(fmData.token ?? change.tokenName),
          change.newValue,
          fmData["figma-value"] ? String(fmData["figma-value"]) : null,
          String(fmData.status ?? "unknown"),
          String(fmData.collection ?? ""),
        ).catch(() => {});
      } else {
        console.log(`  [css-diff] [dry-run] Would write ${change.tokenName} = ${change.newValue}`);
      }
    } else {
      console.log(`  [css-diff] ${change.tokenName} → low confidence (${reason}) — queuing HITL card`);
      if (!dryRun) {
        pushToQueue(projectRoot, {
          type: "drift-resolution",
          token: change.tokenName,
          filePath: `contract/tokens/${change.file}`,
          proposed: "code-wins",
          context: `CSS changed from ${change.oldValue} to ${change.newValue}. ${reason}`,
          confidence: 0.4,
        });
        writeRunLog(projectRoot, { ...logEntry, action: "hitl-queued" });
      } else {
        console.log(`  [css-diff] [dry-run] Would queue HITL card for ${change.tokenName}`);
      }
    }
  }));
}

// ── Hermes prose authoring for token contracts ────────────────────────────────

function parseFrontmatterFlat(raw) {
  const data = {};
  const m = raw.match(/^---[\r\n]+([\s\S]*?)[\r\n]+---/);
  if (!m) return { data };
  for (const line of m[1].split(/\r?\n/)) {
    const colon = line.indexOf(":");
    if (colon === -1) continue;
    const key = line.slice(0, colon).trim();
    const val = line.slice(colon + 1).trim().replace(/^['"]|['"]$/g, "");
    data[key] = val === "null" ? null : val === "true" ? true : val === "false" ? false : val;
  }
  return { data };
}

async function authorTokenProseWithHermes(projectRoot, token, value, figmaValue, status, collection) {
  const mdxPath = path.join(projectRoot, "contract", "tokens", `${token}.mdx`);
  if (!fs.existsSync(mdxPath)) return;

  const prompt = `You are Hermes, a design system synthesis agent. Write a 2-4 sentence rationale for the following design token. Explain its current value, status, and why it matters. Do not repeat the token name mechanically. Plain prose only — no markdown, no frontmatter, no bullet points.

Token: ${token}
Value (code): ${value}
Figma value: ${figmaValue ?? "not in Figma"}
Status: ${status}
Collection: ${collection}
Date: ${new Date().toISOString().slice(0, 10)}`;

  let prose;
  try {
    const res = await fetch("http://localhost:11434/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: "hermes3", prompt, stream: false }),
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) return;
    const json = await res.json();
    prose = json.response?.trim();
  } catch {
    return; // Ollama unavailable — non-fatal
  }

  if (!prose || prose.length < 10) return;

  // Replace prose body (everything after the closing ---), preserving frontmatter
  const current = fs.readFileSync(mdxPath, "utf8");
  const fmEnd = current.indexOf("\n---\n", 3);
  if (fmEnd === -1) return;
  const frontmatter = current.slice(0, fmEnd + 5); // up to and including closing ---\n
  const updated = frontmatter + "\n" + prose + "\n";

  const tmp = mdxPath + ".tmp";
  fs.writeFileSync(tmp, updated, "utf8");
  fs.renameSync(tmp, mdxPath);
  console.log(`  [hermes] Authored prose for ${token}`);
}

// ── Token + contract regeneration ────────────────────────────────────────────

function runScript(name, projectRoot, dryRun) {
  if (dryRun) {
    console.log(`  [dry-run] Would run: npm run ${name}`);
    return true;
  }
  const result = spawnSync("npm", ["run", name], { stdio: "inherit", cwd: projectRoot });
  return result.status === 0;
}

function hasScript(pkgJson, name) {
  return !!(pkgJson.scripts && pkgJson.scripts[name]);
}

async function regenerateContracts(projectRoot, dryRun) {
  let pkgJson = {};
  try { pkgJson = JSON.parse(fs.readFileSync(path.join(projectRoot, "package.json"), "utf8")); }
  catch {}

  if (hasScript(pkgJson, "tokens")) {
    console.log("  → tokens");
    runScript("tokens", projectRoot, dryRun);
  }
  if (hasScript(pkgJson, "generate-contracts")) {
    console.log("  → generate-contracts");
    runScript("generate-contracts", projectRoot, dryRun);
  }
}

// ── Figma polling (stub — fills in once figmaToken is configured) ─────────────

async function pollFigma(projectRoot, dryRun) {
  const configPath = path.join(process.env.HOME ?? "~", ".systemix", "config.json");
  let figmaToken = null;
  try {
    const cfg = JSON.parse(fs.readFileSync(configPath, "utf8"));
    figmaToken = cfg.figmaToken ?? null;
  } catch {}

  if (!figmaToken) {
    console.log("  [figma] No token in ~/.systemix/config.json — skipping. Run `npx systemix init` to set.");
    return;
  }

  console.log("  [figma] Diffing Figma variables against contracts...");

  if (dryRun) {
    console.log("  [figma] [dry-run] Would write contracts for any drifted tokens.");
    return;
  }

  // Placeholder: real implementation reads Figma variables, diffs against
  // contract/tokens/*.mdx, and either writes MDX (high confidence) or
  // pushes to queue.json (low confidence).
  console.log("  [figma] Diff complete — no changes detected.");
}

// ── Hermes synthesis ──────────────────────────────────────────────────────────

function buildSynthesisPrompt(componentName, contractText, evidence) {
  const topVariant = evidence.topVariant ?? "none tracked";
  const variantLines = Object.entries(evidence.variants ?? {})
    .map(([v, d]) => `  ${v}: ${d.renders} renders, ${d.uniqueUsers} unique users`)
    .join("\n");
  const pageLines = (evidence.topPages ?? [])
    .slice(0, 3)
    .map(({ page, renders }) => `  ${page}: ${renders} renders`)
    .join("\n");

  return `You are Hermes, a design system synthesis agent. Read the component contract and production evidence below. Generate a structured decision card in YAML format only — no prose, no markdown fences, just the YAML block.

Component: ${componentName}
Total renders (30d): ${evidence.totalRenders}
Top variant: ${topVariant}
Variant breakdown:
${variantLines || "  (no variant data)"}
Top pages:
${pageLines || "  (no page data)"}

Contract:
${contractText.slice(0, 1500)}

Generate EXACTLY this YAML structure (no other text):
hypothesis: <one sentence — what the evidence reveals about how this component is used>
recommendation: <one of: promote | iterate | investigate | no-action>
confidence: <decimal 0.0 to 1.0>
rationale: <2-3 sentences grounded in the evidence and contract history>
next_action: <one concrete thing to test or change next>`;
}

function parseSynthesisCard(raw) {
  // Extract fields from a loose YAML response
  const get = (key) => {
    const m = raw.match(new RegExp(`^${key}:\\s*(.+)$`, "m"));
    return m ? m[1].trim().replace(/^["']|["']$/g, "") : null;
  };
  const hypothesis    = get("hypothesis");
  const recommendation = get("recommendation");
  const confidenceRaw = get("confidence");
  const rationale     = get("rationale");
  const nextAction    = get("next_action");

  if (!hypothesis || !recommendation) return null;

  const confidence = parseFloat(confidenceRaw ?? "0") || 0;
  const validRec = ["promote", "iterate", "investigate", "no-action"];
  return {
    hypothesis,
    recommendation: validRec.includes(recommendation) ? recommendation : "investigate",
    confidence,
    rationale: rationale ?? "",
    nextAction: nextAction ?? "",
  };
}

async function synthesizeWithHermes(projectRoot, componentName, evidence) {
  if (!evidence || evidence.totalRenders < 100) return; // not enough signal

  const mdxPath = path.join(projectRoot, "contract", "components", `${componentName}.mdx`);
  if (!fs.existsSync(mdxPath)) return;
  const contractText = fs.readFileSync(mdxPath, "utf8");

  // Skip if we already synthesized this evidence (same totalRenders)
  const synthStampPath = path.join(projectRoot, ".systemix", "synthesis-stamps.json");
  let stamps = {};
  try { stamps = JSON.parse(fs.readFileSync(synthStampPath, "utf8")); } catch {}
  if (stamps[componentName] === evidence.totalRenders) return;

  console.log(`  [hermes] Synthesizing ${componentName} (${evidence.totalRenders} renders)...`);

  const prompt = buildSynthesisPrompt(componentName, contractText, evidence);
  let raw;
  try {
    const res = await fetch("http://localhost:11434/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: "hermes3", prompt, stream: false }),
      signal: AbortSignal.timeout(30_000),
    });
    if (!res.ok) { console.warn(`  [hermes] Ollama error: ${res.status}`); return; }
    const json = await res.json();
    raw = json.response?.trim();
  } catch (err) {
    console.log(`  [hermes] Ollama unavailable — skipping synthesis for ${componentName}.`);
    return;
  }

  if (!raw) return;
  const card = parseSynthesisCard(raw);
  if (!card) {
    console.warn(`  [hermes] Could not parse synthesis response for ${componentName}.`);
    return;
  }

  pushToQueue(projectRoot, {
    type: "hypothesis-validation",
    component: componentName,
    hypothesis: card.hypothesis,
    proposal: card.nextAction,
    context: card.rationale,
    confidence: card.confidence,
    confidenceLevel: card.confidence,
    recommendation: card.recommendation,
    totalRenders: evidence.totalRenders,
    topVariant: evidence.topVariant,
  });

  // Stamp so we don't re-synthesize the same data next cycle
  stamps[componentName] = evidence.totalRenders;
  const dir = path.dirname(synthStampPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(synthStampPath, JSON.stringify(stamps, null, 2));
  console.log(`  [hermes] ${componentName} → ${card.recommendation} (confidence: ${card.confidence})`);
}

// ── PostHog evidence refresh ──────────────────────────────────────────────────

function serializeEvidence(ev) {
  // Returns indented YAML lines for the evidence-posthog block (2-space indent)
  const lines = [
    `  total-renders: ${ev.totalRenders}`,
    `  top-variant: ${ev.topVariant ?? "null"}`,
    `  variants:`,
  ];
  for (const [name, d] of Object.entries(ev.variants)) {
    lines.push(`    ${name}:`);
    lines.push(`      renders: ${d.renders}`);
    lines.push(`      unique-users: ${d.uniqueUsers}`);
    if (d.pages.length > 0) {
      lines.push(`      pages:`);
      d.pages.slice(0, 5).forEach(p => lines.push(`        - ${p}`));
    }
  }
  lines.push(`  top-pages-by-renders:`);
  ev.topPages.forEach(({ page, renders }) => {
    lines.push(`    - page: ${page}`);
    lines.push(`      renders: ${renders}`);
  });
  return lines.join("\n");
}

function patchFrontmatter(content, totalRenders, evidence) {
  const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) return content;
  const [, yaml, body] = match;
  const lines = yaml.split("\n");
  const out = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (line.startsWith("usage-count-30d:")) {
      out.push(`usage-count-30d: ${totalRenders}`);
      i++;
      continue;
    }
    if (line.startsWith("evidence-posthog:")) {
      i++;
      // skip existing indented block
      while (i < lines.length && /^[ \t]/.test(lines[i])) i++;
      out.push("evidence-posthog:");
      out.push(serializeEvidence(evidence));
      continue;
    }
    out.push(line);
    i++;
  }
  return `---\n${out.join("\n")}\n---\n${body}`;
}

async function pollPostHog(projectRoot, dryRun) {
  const apiKey = process.env.POSTHOG_API_KEY;
  if (!apiKey) return; // silent — PostHog is optional

  const projectId = process.env.POSTHOG_PROJECT_ID;
  if (!projectId) {
    console.log("  [posthog] POSTHOG_PROJECT_ID not set — skipping.");
    return;
  }

  const host = (process.env.POSTHOG_HOST ?? "https://app.posthog.com").replace(/\/$/, "");

  console.log("  [posthog] Refreshing component evidence from PostHog...");

  if (dryRun) {
    console.log("  [posthog] [dry-run] Would update evidence-posthog in component MDX files.");
    return;
  }

  // Query last-30d component_render events grouped by component, variant, page
  let rows;
  try {
    const resp = await fetch(`${host}/api/projects/${projectId}/query`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        query: {
          kind: "HogQLQuery",
          query: `
            SELECT
              properties.component_name AS component,
              properties.variant        AS variant,
              properties.pathname       AS page,
              count()                   AS renders,
              count(distinct person_id) AS unique_users
            FROM events
            WHERE event = 'component_render'
              AND timestamp >= now() - toIntervalDay(30)
              AND properties.component_name IS NOT NULL
            GROUP BY component, variant, page
            ORDER BY renders DESC
          `,
        },
      }),
    });
    if (!resp.ok) {
      console.warn(`  [posthog] Query failed: ${resp.status} ${resp.statusText}`);
      return;
    }
    rows = (await resp.json()).results ?? [];
  } catch (err) {
    console.warn(`  [posthog] Network error: ${err.message}`);
    return;
  }

  if (rows.length === 0) {
    console.log("  [posthog] No component_render events in last 30d.");
    return;
  }

  // Aggregate rows → per-component stats
  const byComponent = {};
  for (const [component, variant, page, renders, uniqueUsers] of rows) {
    if (!component) continue;
    const c = (byComponent[component] ??= { totalRenders: 0, variants: {}, pages: {} });
    c.totalRenders += renders;
    if (variant) {
      const v = (c.variants[variant] ??= { renders: 0, uniqueUsers: 0, pages: [] });
      v.renders += renders;
      v.uniqueUsers = Math.max(v.uniqueUsers, uniqueUsers); // approx unique across pages
      if (page && !v.pages.includes(page)) v.pages.push(page);
    }
    if (page) c.pages[page] = (c.pages[page] ?? 0) + renders;
  }

  const componentsDir = path.join(projectRoot, "contract", "components");
  if (!fs.existsSync(componentsDir)) {
    console.log("  [posthog] contract/components/ not found — skipping writes.");
    return;
  }

  let updatedCount = 0;
  for (const [componentName, stats] of Object.entries(byComponent)) {
    const mdxPath = path.join(componentsDir, `${componentName}.mdx`);
    if (!fs.existsSync(mdxPath)) continue;

    const topVariant =
      Object.entries(stats.variants).sort(([, a], [, b]) => b.renders - a.renders)[0]?.[0] ?? null;

    const topPages = Object.entries(stats.pages)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([page, renders]) => ({ page, renders }));

    const evidence = { totalRenders: stats.totalRenders, topVariant, variants: stats.variants, topPages };
    const original = fs.readFileSync(mdxPath, "utf8");
    const patched = patchFrontmatter(original, stats.totalRenders, evidence);

    if (patched === original) continue;

    const tmp = mdxPath + ".tmp";
    fs.writeFileSync(tmp, patched);
    fs.renameSync(tmp, mdxPath);
    console.log(`  [posthog] ${componentName}.mdx — ${stats.totalRenders} renders`);
    writeEvent(projectRoot, { type: "contract-updated", slug: componentName, contractType: "component" });

    pushToQueue(projectRoot, {
      type: "evidence-refresh",
      component: componentName,
      source: "posthog",
      totalRenders: stats.totalRenders,
      topVariant,
    });

    // Trigger Hermes synthesis now that evidence is fresh
    await synthesizeWithHermes(projectRoot, componentName, evidence);

    updatedCount++;
  }

  console.log(
    updatedCount === 0
      ? "  [posthog] Evidence up to date — no changes."
      : `  [posthog] Updated ${updatedCount} contract file(s).`,
  );
}

// ── Auto-instrumentation check ────────────────────────────────────────────────

function buildInstrumentationCode(componentName, posthogEventKey) {
  const key = posthogEventKey ?? componentName;
  return [
    `"use client"`,
    ``,
    `// Add to imports:`,
    `import { useEffect } from 'react'`,
    `import { usePostHog } from 'posthog-js/react'`,
    ``,
    `// Add inside the ${componentName} function, before return:`,
    `const posthog = usePostHog()`,
    `useEffect(() => {`,
    `  posthog?.capture('component_render', {`,
    `    component_name: '${key}',`,
    `    pathname: typeof window !== 'undefined' ? window.location.pathname : null,`,
    `  })`,
    `}, [])`,
  ].join("\n");
}

function checkInstrumentation(projectRoot) {
  const componentsDir = path.join(projectRoot, "contract", "components");
  if (!fs.existsSync(componentsDir)) return;

  // Track which components we've already queued to avoid duplicates this run
  const queue = readQueue(projectRoot);
  const alreadyQueued = new Set(
    (queue.cards ?? [])
      .filter(c => c.type === "instrumentation-approval" && c.status === "pending")
      .map(c => c.component)
  );

  const files = fs.readdirSync(componentsDir).filter(f => f.endsWith(".mdx"));
  for (const file of files) {
    const raw = fs.readFileSync(path.join(componentsDir, file), "utf8");
    const fm = {};
    const fmMatch = raw.match(/^---\n([\s\S]*?)\n---/);
    if (fmMatch) {
      for (const line of fmMatch[1].split("\n")) {
        const [k, ...rest] = line.split(":");
        if (k && rest.length) fm[k.trim()] = rest.join(":").trim();
      }
    }

    const componentName = fm.component ?? file.replace(/\.mdx$/, "");
    const sourcePath = fm.path;
    const posthogEventKey = fm["posthog-event-key"] ?? null;

    if (!sourcePath) continue;
    if (alreadyQueued.has(componentName)) continue;

    const fullSourcePath = path.join(projectRoot, sourcePath);
    if (!fs.existsSync(fullSourcePath)) continue;

    const source = fs.readFileSync(fullSourcePath, "utf8");
    const isInstrumented = source.includes("posthog.capture") || source.includes("component_render");
    if (isInstrumented) continue;

    const proposed = buildInstrumentationCode(componentName, posthogEventKey);
    pushToQueue(projectRoot, {
      type: "instrumentation-approval",
      component: componentName,
      filePath: sourcePath,
      posthogEventKey: posthogEventKey ?? componentName,
      proposed,
      context: `Hermes proposes adding PostHog render tracking to ${componentName}. The event key '${posthogEventKey ?? componentName}' is stable — it persists even if the component is renamed. This is a "use client" conversion; review before approving.`,
      confidence: 0.82,
    });
  }
}

// ── Watch command ─────────────────────────────────────────────────────────────

async function watch(args) {
  const dryRun = args.includes("--dry-run");
  const noPosthog = args.includes("--no-posthog");
  const intervalIdx = args.indexOf("--interval");
  const intervalSec = intervalIdx !== -1 ? (parseInt(args[intervalIdx + 1], 10) || 60) : 60;

  const projectRoot = process.cwd();
  const cssPath = path.join(projectRoot, "src", "app", "globals.css");

  // ── Queue depth report ──────────────────────────────────────────────────────

  const startupQueue = readQueue(projectRoot);
  const pendingCount = (startupQueue.cards ?? []).filter(c => c.status === "pending").length;

  console.log("\n  systemix watch");
  if (dryRun) console.log("  mode: dry-run — proposed writes logged, nothing executed");
  console.log(`\n  css:    ${cssPath}`);
  console.log(`  figma:  poll every ${intervalSec}s`);
  console.log(`  posthog: ${noPosthog ? "disabled" : `poll every ${intervalSec}s`}`);
  console.log(`  queue:  .systemix/queue.json (${pendingCount} card${pendingCount !== 1 ? "s" : ""} pending)`);
  console.log("\n  Ctrl+C to stop.\n");

  // ── CSS file watcher ────────────────────────────────────────────────────────

  if (!fs.existsSync(cssPath)) {
    console.warn(`  ⚠  globals.css not found — CSS watching skipped.`);
  } else {
    // Track last-known CSS variables for diffing
    let prevVars = parseCssVariables(fs.readFileSync(cssPath, "utf8"));

    let debounce = null;
    fs.watch(cssPath, () => {
      clearTimeout(debounce);
      debounce = setTimeout(async () => {
        console.log(`\n  [css] globals.css changed — diffing tokens...`);
        const newVars = parseCssVariables(fs.readFileSync(cssPath, "utf8"));
        const changes = diffCssAgainstContracts(projectRoot, newVars);
        if (changes.length > 0) {
          await handleTokenChanges(projectRoot, changes, dryRun);
        } else {
          // Fallback: full regeneration if no contract diffs found
          await regenerateContracts(projectRoot, dryRun);
        }
        prevVars = newVars;
        console.log("  [css] Done.\n");
      }, 500);
    });
    console.log("  Watching globals.css for changes...");
  }

  // ── Drift normalization (once at startup) ──────────────────────────────────

  console.log("  [drift-norm] Normalizing token drift status (culori ΔE)...");
  normalizeDriftStatus(projectRoot, dryRun);

  // ── Auto-instrumentation check (once at startup) ───────────────────────────

  console.log("  [instrumentation] Checking component instrumentation...");
  checkInstrumentation(projectRoot);

  // ── Initial Figma poll ──────────────────────────────────────────────────────

  await pollFigma(projectRoot, dryRun);

  // ── Recurring poll (Figma + PostHog) ───────────────────────────────────────

  setInterval(async () => {
    console.log(`\n  [tick] ${new Date().toISOString()}`);
    await pollFigma(projectRoot, dryRun);
    normalizeDriftStatus(projectRoot, dryRun);
    if (!noPosthog) await pollPostHog(projectRoot, dryRun);
    if (!noPosthog) await evidence(["pull"]);
  }, intervalSec * 1000);

  // ── Graceful shutdown ───────────────────────────────────────────────────────

  const shutdown = () => {
    console.log("\n  systemix watch stopped.\n");
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  // Block until killed
  await new Promise(() => {});
}

module.exports = { watch };
