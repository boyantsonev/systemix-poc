/**
 * generate-contracts.ts
 *
 * Walks .systemix/tokens.bridge.json and contract/components/*.mdx,
 * then creates or updates MDX contract files in:
 *   contract/tokens/{slug}.mdx
 *   contract/components/{slug}.mdx
 *
 * For each missing file: calls Hermes (hermes3 via Ollama) to author prose,
 * then writes the full MDX. If Ollama is unavailable, writes a placeholder body.
 *
 * For each existing file whose status has changed: updates frontmatter only,
 * preserving the Hermes prose body.
 *
 * Usage:
 *   npm run generate-contracts
 *   npm run generate-contracts -- --dry-run
 *   npm run generate-contracts -- --no-hermes    (skip Ollama, write placeholders)
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import matter from "gray-matter";

const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);
const ROOT        = join(__dirname, "..");
const BRIDGE_PATH = join(ROOT, ".systemix/tokens.bridge.json");
const TOKEN_DIR   = join(ROOT, "contract/tokens");
const COMP_DIR    = join(ROOT, "contract/components");

const DRY_RUN     = process.argv.includes("--dry-run");
const NO_HERMES   = process.argv.includes("--no-hermes");

// ── Helpers ─────────────────────────────────────────────────────────────────

function slugify(cssVar: string): string {
  return cssVar.replace(/^--/, "").replace(/\//g, "-");
}

async function callHermes(prompt: string): Promise<string | null> {
  if (NO_HERMES) return null;
  try {
    const res = await fetch("http://localhost:11434/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: "hermes3", prompt, stream: false }),
      signal: AbortSignal.timeout(30_000),
    });
    if (!res.ok) return null;
    const json = await res.json() as { response?: string };
    return json.response?.trim() ?? null;
  } catch {
    return null;
  }
}

function buildTokenPrompt(name: string, value: string, figmaValue: string | null, collection: string, status: string): string {
  const drift = figmaValue && figmaValue !== value
    ? `The Figma design file has this token set to \`${figmaValue}\`, which differs from the code value. The current status is "${status}".`
    : `The code and Figma values are in sync.`;

  return `You are a design system documentation writer. Write 2-3 concise paragraphs documenting the design token \`${name}\`.

Token details:
- CSS variable: --${name}
- Current code value: ${value}
- Collection: ${collection}
- ${drift}

Cover: what this token represents semantically, when and where it should be used, and any important notes about the current state or drift context. Be direct and factual. No markdown headers, no bullet points — just clean prose paragraphs.`;
}

function buildComponentPrompt(name: string, path: string, parity: string): string {
  return `You are a design system documentation writer. Write 2-3 concise paragraphs documenting the UI component \`${name}\`.

Component details:
- Name: ${name}
- Source path: ${path || "unknown"}
- Parity status: ${parity}

Cover: what this component does, when to use it, any important props or variants, and any known parity issues if status is "drifted". Be direct and factual. No markdown headers, no bullet points — just clean prose paragraphs.`;
}

function placeholderProse(type: "token" | "component", name: string): string {
  return type === "token"
    ? `No documentation yet. Run \`/tokens\` in Claude Code or Cursor to have Hermes write this page.`
    : `No documentation yet. Run \`/component\` in Claude Code or Cursor to have Hermes write this page.`;
}

function writeMdx(filePath: string, frontmatter: Record<string, unknown>, body: string): void {
  const content = matter.stringify(body, frontmatter);
  if (DRY_RUN) {
    console.log(`  [dry-run] would write: ${filePath}`);
    return;
  }
  mkdirSync(dirname(filePath), { recursive: true });
  writeFileSync(filePath, content, "utf8");
}

function updateFrontmatter(filePath: string, updates: Record<string, unknown>): void {
  const raw = readFileSync(filePath, "utf8");
  const { data: fm, content } = matter(raw);
  Object.assign(fm, updates);
  if (DRY_RUN) {
    console.log(`  [dry-run] would update frontmatter: ${filePath}`);
    return;
  }
  writeFileSync(filePath, matter.stringify(content, fm), "utf8");
}

// ── Token contracts ──────────────────────────────────────────────────────────

interface BridgeToken {
  $type: string;
  $value: string;
  figma?: {
    cssVar?: string;
    collection?: string;
    hex?: string;
    variableName?: string;
    syncStatus?: string;
    figmaValue?: string;
  };
}

function flattenBridgeTokens(obj: Record<string, unknown>, out: BridgeToken[] = []): BridgeToken[] {
  for (const [key, value] of Object.entries(obj)) {
    if (key === "_meta" || key === "$schema") continue;
    if (value && typeof value === "object") {
      const entry = value as Record<string, unknown>;
      if ("$type" in entry) {
        out.push(entry as unknown as BridgeToken);
      } else {
        flattenBridgeTokens(entry, out);
      }
    }
  }
  return out;
}

async function generateTokenContracts(): Promise<void> {
  if (!existsSync(BRIDGE_PATH)) {
    console.log("⚠  .systemix/tokens.bridge.json not found. Run `npm run tokens` first.");
    return;
  }

  const bridge = JSON.parse(readFileSync(BRIDGE_PATH, "utf8")) as Record<string, unknown>;
  const tokens = flattenBridgeTokens(bridge);

  let created = 0, updated = 0, skipped = 0;

  for (const token of tokens) {
    const cssVar    = token.figma?.cssVar;
    if (!cssVar) continue;

    const slug       = slugify(cssVar);
    const name       = slug;
    const value      = token.$value;
    const collection = token.figma?.collection ?? "Semantic";
    const filePath   = join(TOKEN_DIR, `${slug}.mdx`);

    if (existsSync(filePath)) {
      // File exists — check if we need to update frontmatter
      const { data: fm } = matter(readFileSync(filePath, "utf8"));
      const status = fm.status as string ?? "unknown";

      // For now, only update `last-updated` if value changed
      if (fm.value !== value) {
        updateFrontmatter(filePath, {
          value,
          "last-updated": new Date().toISOString().slice(0, 10),
        });
        console.log(`  ~ updated value: ${slug}`);
        updated++;
      } else {
        skipped++;
      }
      continue;
    }

    // New file — determine status
    // Without a Figma comparison run, default to "missing-in-figma" since we
    // only have CSS values in the bridge (no Figma value to compare against)
    const figmaHex   = token.figma?.hex ?? null;
    const status     = "missing-in-figma";

    const fm: Record<string, unknown> = {
      token:          name,
      value,
      "figma-value":  figmaHex,
      status,
      resolved:       false,
      collection,
      source:         "css",
      "last-updated": new Date().toISOString().slice(0, 10),
      "last-resolver": null,
      "resolve-decision": null,
    };

    console.log(`  + generating: ${slug}...`);

    let prose = await callHermes(buildTokenPrompt(name, value, figmaHex, collection, status));
    if (!prose) {
      console.log(`    ↳ Ollama unavailable — writing placeholder`);
      prose = placeholderProse("token", name);
    }

    writeMdx(filePath, fm, "\n" + prose + "\n");
    created++;
  }

  console.log(`\nTokens: ${created} created, ${updated} updated, ${skipped} unchanged`);
}

// ── Component contracts ──────────────────────────────────────────────────────

interface ComponentFrontmatter {
  component?: string;
  parity?: string;
  path?: string;
  "figma-node"?: string | null;
  "evidence-storybook"?: string | null;
  "last-updated"?: string;
}

async function generateComponentContracts(): Promise<void> {
  // Components are seeded by /check-parity skill which writes MDX files.
  // Here we scan existing component MDX files and fill in missing prose.
  if (!existsSync(COMP_DIR)) {
    console.log("  No contract/components/ directory — skipping component contracts.");
    return;
  }

  const entries = readdirSync(COMP_DIR).filter(e => e.endsWith(".mdx"));
  let proseFilled = 0, skipped = 0;

  for (const entry of entries) {
    const filePath = join(COMP_DIR, entry);
    const raw = readFileSync(filePath, "utf8");
    const { data: fm, content } = matter(raw) as { data: ComponentFrontmatter; content: string };
    if (!fm.component) continue;

    if (content.trim().length > 0) {
      skipped++;
      continue;
    }

    // Prose is empty — ask Hermes to write it
    console.log(`  + generating prose: ${fm.component}...`);
    let prose = await callHermes(buildComponentPrompt(
      fm.component,
      fm.path ?? "",
      fm.parity ?? "unknown"
    ));
    if (!prose) {
      console.log(`    ↳ Ollama unavailable — writing placeholder`);
      prose = placeholderProse("component", fm.component);
    }

    if (!DRY_RUN) {
      writeFileSync(filePath, matter.stringify("\n" + prose + "\n", fm as Record<string, unknown>), "utf8");
    } else {
      console.log(`  [dry-run] would write prose to: ${filePath}`);
    }
    proseFilled++;
  }

  console.log(`Components: ${proseFilled} prose filled, ${skipped} already documented`);
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  if (DRY_RUN) console.log("🔍 Dry run — no files will be written\n");
  if (NO_HERMES) console.log("⚡ Hermes disabled — placeholders will be written\n");

  console.log("── Token contracts ──────────────────────────");
  await generateTokenContracts();

  console.log("\n── Component contracts ──────────────────────");
  await generateComponentContracts();

  console.log("\n✓ Done. Run `npm run dev` and open /design-system to see the results.");
}

main().catch(err => {
  console.error("Error:", err);
  process.exit(1);
});
