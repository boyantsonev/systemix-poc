"use strict";

/**
 * npx systemix social-signal
 *
 * Log a social post's engagement metrics into PostHog and append them to the
 * linked hypothesis contract so growth-audit can include them in evidence summaries.
 *
 * Usage:
 *   npx systemix social-signal \
 *     --platform linkedin \
 *     --url https://linkedin.com/posts/... \
 *     --hypothesis hero-vp-icp-match-2026-04 \
 *     --impressions 2400 --clicks 47 --likes 83 --replies 12
 *
 * If flags are omitted, the command prompts interactively.
 */

const fs       = require("fs");
const path     = require("path");
const os       = require("os");
const https    = require("https");
const readline = require("readline");

const HYPOTHESIS_DIR  = path.join(process.cwd(), "contract", "hypotheses");
const USER_CONFIG     = path.join(os.homedir(), ".systemix", "config.json");
const POSTHOG_HOST    = (process.env.POSTHOG_HOST ?? "https://app.posthog.com").replace(/\/$/, "");
const PLATFORMS       = ["linkedin", "x", "reddit", "threads", "other"];

// ── helpers ───────────────────────────────────────────────────────────────────

function ask(rl, question) {
  return new Promise((resolve) => rl.question(question, resolve));
}

function parseArgs(args) {
  const out = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith("--")) {
      const key = args[i].slice(2);
      out[key] = args[i + 1] && !args[i + 1].startsWith("--") ? args[++i] : true;
    }
  }
  return out;
}

function readUserConfig() {
  try { return JSON.parse(fs.readFileSync(USER_CONFIG, "utf8")); } catch { return {}; }
}

function postToPostHog(apiKey, hypothesisId, platform, postUrl, metrics) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({
      api_key:     apiKey,
      event:       "hypothesis_social_signal",
      distinct_id: "systemix-cli",
      timestamp:   new Date().toISOString(),
      properties: {
        hypothesis_id: hypothesisId,
        platform,
        post_url:      postUrl,
        ...metrics,
      },
    });

    const url     = new URL(`${POSTHOG_HOST}/capture/`);
    const options = {
      hostname: url.hostname,
      port:     url.port || 443,
      path:     url.pathname,
      method:   "POST",
      headers:  { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(payload) },
    };

    const req = https.request(options, (res) => {
      res.resume();
      res.on("end", () => {
        if (res.statusCode >= 200 && res.statusCode < 300) resolve();
        else reject(new Error(`PostHog returned ${res.statusCode}`));
      });
    });
    req.on("error", reject);
    req.write(payload);
    req.end();
  });
}

/**
 * Append one social signal entry to the hypothesis MDX frontmatter.
 * Handles three cases for the evidence-social field:
 *   - missing        → add after evidence-posthog
 *   - `null`         → replace with list
 *   - existing list  → append new entry
 */
function patchHypothesisMdx(filePath, entry) {
  const raw   = fs.readFileSync(filePath, "utf8");
  const lines = raw.split("\n");

  const yamlEntry = [
    `  - platform: ${entry.platform}`,
    `    url: "${entry.url}"`,
    `    recorded_at: "${entry.recorded_at}"`,
    ...(entry.impressions != null ? [`    impressions: ${entry.impressions}`] : []),
    ...(entry.clicks      != null ? [`    clicks: ${entry.clicks}`]           : []),
    ...(entry.likes       != null ? [`    likes: ${entry.likes}`]             : []),
    ...(entry.replies     != null ? [`    replies: ${entry.replies}`]         : []),
    ...(entry.shares      != null ? [`    shares: ${entry.shares}`]           : []),
  ].join("\n");

  // Case 1: field already exists
  const socialIdx = lines.findIndex((l) => l.startsWith("evidence-social:"));
  if (socialIdx !== -1) {
    const val = lines[socialIdx].replace("evidence-social:", "").trim();
    if (val === "null" || val === "") {
      // Replace the null line with the new list
      lines[socialIdx] = `evidence-social:\n${yamlEntry}`;
    } else {
      // Field is a list — find the end of its entries and append
      let insertAt = socialIdx + 1;
      while (insertAt < lines.length && (lines[insertAt].startsWith("  ") || lines[insertAt] === "")) {
        insertAt++;
      }
      lines.splice(insertAt, 0, yamlEntry);
    }
  } else {
    // Case 2: field missing — insert after evidence-posthog
    const phIdx = lines.findIndex((l) => l.startsWith("evidence-posthog:"));
    const insertAt = phIdx !== -1 ? phIdx + 1 : lines.findIndex((l) => l === "---", 1);
    lines.splice(insertAt, 0, `evidence-social:\n${yamlEntry}`);
  }

  const tmp = filePath + ".tmp";
  fs.writeFileSync(tmp, lines.join("\n"), "utf8");
  fs.renameSync(tmp, filePath);
}

// ── main ──────────────────────────────────────────────────────────────────────

async function socialSignal(args) {
  const flags = parseArgs(args);

  console.log("\n  systemix social-signal — log social post evidence\n");

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  // ── collect inputs ────────────────────────────────────────────────────────

  const platform = flags.platform
    ? flags.platform.toLowerCase()
    : (await ask(rl, `  Platform (${PLATFORMS.join(" / ")}): `)).toLowerCase().trim() || "other";

  const postUrl = flags.url
    ? flags.url
    : (await ask(rl, "  Post URL: ")).trim();

  // list available hypothesis IDs
  let hypothesisId = flags.hypothesis;
  if (!hypothesisId) {
    const available = fs.existsSync(HYPOTHESIS_DIR)
      ? fs.readdirSync(HYPOTHESIS_DIR).filter((f) => f.endsWith(".mdx")).map((f) => f.replace(".mdx", ""))
      : [];
    if (available.length > 0) {
      console.log(`\n  Running experiments:\n${available.map((id) => `    ${id}`).join("\n")}\n`);
    }
    hypothesisId = (await ask(rl, "  Hypothesis ID: ")).trim();
  }

  // optional numeric metrics
  const num = (flag, prompt) =>
    flags[flag] != null
      ? Number(flags[flag])
      : ask(rl, `  ${prompt} (Enter to skip): `).then((v) => (v.trim() ? Number(v.trim()) : null));

  const impressions = await num("impressions", "Impressions");
  const clicks      = await num("clicks",      "Clicks");
  const likes       = await num("likes",       "Likes / reactions");
  const replies     = await num("replies",     "Comments / replies");
  const shares      = await num("shares",      "Shares / reposts");

  rl.close();
  console.log();

  // ── validate hypothesis file ──────────────────────────────────────────────

  const hypothesisFile = path.join(HYPOTHESIS_DIR, `${hypothesisId}.mdx`);
  if (!fs.existsSync(hypothesisFile)) {
    console.error(`  ✗  Hypothesis not found: ${hypothesisFile}`);
    console.error(`     Run /init-experiment ${hypothesisId} to create it first.\n`);
    process.exit(1);
  }

  const metrics     = { impressions, clicks, likes, replies, shares };
  const cleanMetrics = Object.fromEntries(Object.entries(metrics).filter(([, v]) => v != null));
  const recordedAt  = new Date().toISOString().slice(0, 10);

  // ── PostHog capture ───────────────────────────────────────────────────────

  const cfg    = readUserConfig();
  const apiKey = process.env.POSTHOG_API_KEY ?? cfg.posthogKey;

  if (apiKey) {
    try {
      await postToPostHog(apiKey, hypothesisId, platform, postUrl, cleanMetrics);
      console.log(`  ✓  Sent hypothesis_social_signal event to PostHog`);
    } catch (err) {
      console.warn(`  ⚠  PostHog capture failed: ${err.message}`);
      console.warn(`     Signal still written to contract.\n`);
    }
  } else {
    console.log("  -  POSTHOG_API_KEY not set — skipping PostHog capture.");
    console.log("     Run `npx systemix init` or set POSTHOG_API_KEY to enable.\n");
  }

  // ── patch hypothesis MDX ──────────────────────────────────────────────────

  patchHypothesisMdx(hypothesisFile, {
    platform,
    url:         postUrl,
    recorded_at: recordedAt,
    ...cleanMetrics,
  });

  const metricSummary = Object.entries(cleanMetrics)
    .map(([k, v]) => `${k}: ${v.toLocaleString()}`)
    .join("  ·  ");

  console.log(`  ✓  Updated contract/hypotheses/${hypothesisId}.mdx`);
  if (metricSummary) console.log(`     ${metricSummary}`);

  console.log(`\n  Run /growth-audit to include this signal in the evidence brief.\n`);
}

module.exports = { socialSignal };
