import fs from "node:fs";
import path from "node:path";

// Shared helpers for reading/writing hypothesis contract MDX files.
// Writes use manual string construction + line-targeted regex (NOT a YAML
// serializer) to stay byte-compatible with the queue route's write-back regex
// (src/app/api/queue/route.ts applyHypothesisDecision) and the detail page's
// parseVariants(). The detail page reads with gray-matter; both must agree.

export const HYPOTHESES_DIR = path.join(process.cwd(), "contract", "hypotheses");
const FRONTMATTER_RE = /^---[\r\n]+([\s\S]*?)[\r\n]+---[\r\n]*([\s\S]*)$/;
const VALID_SLUG = /^[a-z0-9][a-z0-9-]*$/;

export function hypothesisPath(slug: string): string {
  return path.join(HYPOTHESES_DIR, `${slug}.mdx`);
}

export function hypothesisExists(slug: string): boolean {
  return fs.existsSync(hypothesisPath(slug));
}

export function isValidSlug(s: string): boolean {
  return VALID_SLUG.test(s);
}

export function slugify(s: string): string {
  return s.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

/** A `\w+` variant key the detail page's parseVariants() can read. */
export function varKey(k: string): string {
  return slugify(k).replace(/-/g, "_") || "variant";
}

/** YAML double-quoted scalar, sanitised so parseVariants's `"?([^"]+)"?` stays intact. */
export function yamlStr(s: string): string {
  const clean = String(s)
    .replace(/\\/g, "\\\\")
    .replace(/"/g, "'")
    .replace(/\r?\n/g, " ")
    .trim();
  return `"${clean}"`;
}

export function splitFrontmatter(raw: string): { fm: string; body: string } | null {
  const m = raw.match(FRONTMATTER_RE);
  if (!m) return null;
  return { fm: m[1], body: m[2] };
}

export function writeFileAtomic(filePath: string, content: string): void {
  // Unique tmp name so concurrent writes to the same file don't clobber each
  // other's temp (last rename wins; no spurious ENOENT crash on the loser).
  const tmp = `${filePath}.tmp-${process.pid}-${Date.now()}-${Math.round(Math.random() * 1e9)}`;
  fs.writeFileSync(tmp, content, "utf8");
  fs.renameSync(tmp, filePath);
}

function escapeRe(s: string): string {
  return s.replace(/[-[\]/{}()*+?.\\^$|]/g, "\\$&");
}

/**
 * Replace (or append) a top-level scalar field within the frontmatter block.
 * Collapses an existing nested block (e.g. a populated `evidence-posthog:`) to a
 * single line, so editing never leaves orphaned indented children.
 */
export function setTopLevelField(fmBlock: string, key: string, value: string): string {
  const re = new RegExp(`^${escapeRe(key)}:.*(?:\\n[ \\t]+.*)*`, "m");
  const line = `${key}: ${value}`;
  return re.test(fmBlock) ? fmBlock.replace(re, line) : `${fmBlock.replace(/\s*$/, "")}\n${line}`;
}

/** Replace the whole `variants:` block with a fresh one (variants must stay a block). */
export function setVariantsBlock(fmBlock: string, variants: Record<string, string>): string {
  const block = [
    "variants:",
    ...Object.entries(variants).map(([k, v]) => `  ${varKey(k)}: ${yamlStr(v)}`),
  ].join("\n");
  const re = /^variants:[ \t]*\n(?:[ \t]+.*\n?)*/m;
  if (re.test(fmBlock)) return fmBlock.replace(re, block + "\n");
  return `${fmBlock.replace(/\s*$/, "")}\n${block}`;
}

export interface HypothesisInput {
  id: string;
  section?: string;
  hypothesis: string;
  icp?: string;
  status?: string;
  variants?: Record<string, string>;
  rationale?: string;
  evidencePosthog?: string | null;
  evidenceSocial?: string | null;
}

/** Build a complete, queue-compatible hypothesis MDX file from scratch. */
export function buildHypothesisMdx(input: HypothesisInput, createdDate: string): string {
  const variantsObj =
    input.variants && Object.keys(input.variants).length
      ? input.variants
      : { control: "", variant_b: "" };

  const variantLines = Object.entries(variantsObj)
    .map(([k, v]) => `  ${varKey(k)}: ${yamlStr(v)}`)
    .join("\n");

  const posthog = input.evidencePosthog ? yamlStr(input.evidencePosthog) : "null";
  const social = input.evidenceSocial ? yamlStr(input.evidenceSocial) : "null";

  const fm = [
    "---",
    "type: hypothesis",
    `id: ${input.id}`,
    `section: ${slugify(input.section || "general") || "general"}`,
    `hypothesis: ${yamlStr(input.hypothesis)}`,
    `icp: ${slugify(input.icp || "unspecified") || "unspecified"}`,
    `status: ${input.status || "running"}`,
    `created: ${createdDate}`,
    "variants:",
    variantLines,
    "result: null",
    "decision: null",
    "confidence: null",
    `evidence-posthog: ${posthog}`,
    `evidence-social: ${social}`,
    "---",
  ].join("\n");

  const body =
    input.rationale?.trim() ||
    [
      "## Why This Hypothesis",
      "",
      "Describe the reasoning behind this experiment — what you believe and why it matters.",
      "",
      "## Success Criteria",
      "",
      `- Primary metric: ${input.evidencePosthog || "define a PostHog event"}`,
      "- Threshold: define the win condition that promotes a variant.",
    ].join("\n");

  return `${fm}\n\n${body}\n`;
}
