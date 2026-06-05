"use strict";
/**
 * contract.ts — SYSTMIX-210
 *
 * MDX contract indexer: reads contract/tokens/ and contract/components/,
 * parses frontmatter, and answers 4 queries:
 *   contract_get_token(name)
 *   contract_list_drifted()
 *   contract_get_component(name)
 *   contract_get_quality_score()
 *
 * Intentionally no gray-matter dep — a small inline parser handles the
 * flat YAML frontmatter used by generate-contracts.ts.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.contractGetQualityScoreHandler = exports.contractGetQualityScoreDefinition = exports.contractWriteHypothesisResultHandler = exports.contractWriteHypothesisResultDefinition = exports.contractListHypothesesHandler = exports.contractListHypothesesDefinition = exports.contractGetHypothesisHandler = exports.contractGetHypothesisDefinition = exports.contractWriteEvidenceHandler = exports.contractWriteEvidenceDefinition = exports.contractGetEvidenceHandler = exports.contractGetEvidenceDefinition = exports.contractGetComponentHandler = exports.contractGetComponentDefinition = exports.contractListDriftedHandler = exports.contractListDriftedDefinition = exports.contractGetTokenHandler = exports.contractGetTokenDefinition = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const TOKEN_DIR = "contract/tokens";
const COMP_DIR = "contract/components";
// ---------------------------------------------------------------------------
// Inline frontmatter parser (flat YAML only — no nested objects/arrays)
// ---------------------------------------------------------------------------
function parseFrontmatter(raw) {
    const match = raw.match(/^---[\r\n]+([\s\S]*?)[\r\n]+---[\r\n]*([\s\S]*)$/);
    if (!match)
        return { data: {}, content: raw };
    const data = {};
    for (const line of match[1].split(/\r?\n/)) {
        const colon = line.indexOf(":");
        if (colon === -1)
            continue;
        const key = line.slice(0, colon).trim();
        const rawVal = line.slice(colon + 1).trim();
        if (rawVal === "true") {
            data[key] = true;
            continue;
        }
        if (rawVal === "false") {
            data[key] = false;
            continue;
        }
        if (rawVal === "null" || rawVal === "~" || rawVal === "") {
            data[key] = null;
            continue;
        }
        // Quoted string
        if ((rawVal.startsWith('"') && rawVal.endsWith('"')) ||
            (rawVal.startsWith("'") && rawVal.endsWith("'"))) {
            data[key] = rawVal.slice(1, -1);
            continue;
        }
        const num = Number(rawVal);
        data[key] = isNaN(num) ? rawVal : num;
    }
    return { data, content: match[2].trim() };
}
function readTokens(tokenDir) {
    if (!fs.existsSync(tokenDir))
        return [];
    return fs.readdirSync(tokenDir)
        .filter((f) => f.endsWith(".mdx"))
        .map((f) => {
        const raw = fs.readFileSync(path.join(tokenDir, f), "utf8");
        const { data: fm, content } = parseFrontmatter(raw);
        const slug = f.replace(/\.mdx$/, "");
        return {
            slug,
            token: String(fm.token ?? slug),
            value: fm.value != null ? String(fm.value) : null,
            figmaValue: fm["figma-value"] != null ? String(fm["figma-value"]) : null,
            status: String(fm.status ?? "unknown"),
            resolved: fm.resolved === true,
            collection: fm.collection != null ? String(fm.collection) : null,
            source: fm.source != null ? String(fm.source) : null,
            lastUpdated: fm["last-updated"] != null ? String(fm["last-updated"]) : null,
            resolveDecision: fm["resolve-decision"] != null ? String(fm["resolve-decision"]) : null,
            prose: content,
        };
    });
}
function readComponents(compDir) {
    if (!fs.existsSync(compDir))
        return [];
    return fs.readdirSync(compDir)
        .filter((f) => f.endsWith(".mdx"))
        .map((f) => {
        const raw = fs.readFileSync(path.join(compDir, f), "utf8");
        const { data: fm, content } = parseFrontmatter(raw);
        const slug = f.replace(/\.mdx$/, "");
        return {
            slug,
            component: String(fm.component ?? slug),
            parity: String(fm.parity ?? "unknown"),
            path: fm.path != null ? String(fm.path) : null,
            posthogEventKey: fm["posthog-event-key"] != null ? String(fm["posthog-event-key"]) : null,
            figmaNode: fm["figma-node"] != null ? String(fm["figma-node"]) : null,
            storybookStory: fm["storybook-story"] != null ? String(fm["storybook-story"]) : null,
            storybookDrift: fm["storybook-drift"] != null ? String(fm["storybook-drift"]) : null,
            storybookDriftDetail: fm["storybook-drift-detail"] != null ? String(fm["storybook-drift-detail"]) : null,
            evidenceStorybook: fm["evidence-storybook"] != null ? String(fm["evidence-storybook"]) : null,
            lastUpdated: fm["last-updated"] != null ? String(fm["last-updated"]) : null,
            prose: content,
        };
    });
}
function computeScore(tokens, components) {
    const totalT = tokens.length;
    const cleanT = tokens.filter((t) => t.status === "clean").length;
    const driftedUnresolved = tokens.filter((t) => t.status === "drifted" && !t.resolved).length;
    const missingInFigma = tokens.filter((t) => t.status === "missing-in-figma").length;
    const totalC = components.length;
    const cleanC = components.filter((c) => c.parity === "clean").length;
    const tBase = totalT > 0 ? cleanT / totalT : 1;
    const tScore = tBase - driftedUnresolved * 0.05 - missingInFigma * 0.03;
    const cScore = totalC > 0 ? cleanC / totalC : 1;
    const combined = totalC > 0 ? (tScore + cScore) / 2 : tScore;
    return Math.max(0, Math.round(combined * 100));
}
// ---------------------------------------------------------------------------
// contract_get_token
// ---------------------------------------------------------------------------
exports.contractGetTokenDefinition = {
    name: "contract_get_token",
    description: "Retrieve a single token contract from contract/tokens/ by slug or CSS variable name. " +
        "Returns frontmatter fields (value, figma-value, status, resolved, collection, resolve-decision) " +
        "plus the Hermes prose body. Returns an error if the token is not found.",
    inputSchema: {
        type: "object",
        properties: {
            name: {
                type: "string",
                description: "Token slug (e.g. 'color-primary') or CSS variable name (e.g. '--color-primary').",
            },
        },
        required: ["name"],
    },
};
const contractGetTokenHandler = async (args, projectRoot) => {
    const slug = args.name.replace(/^--/, "").replace(/\//g, "-");
    const tokens = readTokens(path.join(projectRoot, TOKEN_DIR));
    const token = tokens.find((t) => t.slug === slug || t.token === slug);
    if (!token) {
        return {
            content: [{ type: "text", text: `Token not found: ${args.name}. Run \`npm run generate-contracts\` to create contracts from tokens.bridge.json.` }],
            isError: true,
        };
    }
    return {
        content: [{ type: "text", text: JSON.stringify(token, null, 2) }],
    };
};
exports.contractGetTokenHandler = contractGetTokenHandler;
// ---------------------------------------------------------------------------
// contract_list_drifted
// ---------------------------------------------------------------------------
exports.contractListDriftedDefinition = {
    name: "contract_list_drifted",
    description: "List all token contracts that require attention: status is 'drifted' or 'missing-in-figma'. " +
        "Optionally filter to only unresolved items. Returns slug, status, value, figma-value, and resolved flag.",
    inputSchema: {
        type: "object",
        properties: {
            unresolvedOnly: {
                type: "boolean",
                description: "When true, only return tokens where resolved is false. Defaults to false (return all drifted).",
            },
        },
    },
};
const contractListDriftedHandler = async (args, projectRoot) => {
    const tokens = readTokens(path.join(projectRoot, TOKEN_DIR));
    let drifted = tokens.filter((t) => t.status === "drifted" || t.status === "missing-in-figma");
    if (args.unresolvedOnly) {
        drifted = drifted.filter((t) => !t.resolved);
    }
    const summary = drifted.map((t) => ({
        slug: t.slug,
        status: t.status,
        value: t.value,
        figmaValue: t.figmaValue,
        resolved: t.resolved,
        collection: t.collection,
    }));
    return {
        content: [{
                type: "text",
                text: drifted.length === 0
                    ? "No drifted tokens found."
                    : JSON.stringify({ count: drifted.length, tokens: summary }, null, 2),
            }],
    };
};
exports.contractListDriftedHandler = contractListDriftedHandler;
// ---------------------------------------------------------------------------
// contract_get_component
// ---------------------------------------------------------------------------
exports.contractGetComponentDefinition = {
    name: "contract_get_component",
    description: "Retrieve a single component contract from contract/components/ by slug or component name. " +
        "Returns frontmatter fields (parity, path, figma-node, storybook-story, storybook-drift, " +
        "storybook-drift-detail, evidence-storybook, posthog-event-key) plus the Hermes prose body.",
    inputSchema: {
        type: "object",
        properties: {
            name: {
                type: "string",
                description: "Component slug or name (e.g. 'Button' or 'button').",
            },
        },
        required: ["name"],
    },
};
const contractGetComponentHandler = async (args, projectRoot) => {
    const slug = args.name.toLowerCase().replace(/\s+/g, "-");
    const components = readComponents(path.join(projectRoot, COMP_DIR));
    const comp = components.find((c) => c.slug === slug ||
        c.slug === args.name ||
        c.component.toLowerCase() === args.name.toLowerCase());
    if (!comp) {
        return {
            content: [{ type: "text", text: `Component not found: ${args.name}. Run \`/check-parity\` to generate component contracts.` }],
            isError: true,
        };
    }
    return {
        content: [{ type: "text", text: JSON.stringify(comp, null, 2) }],
    };
};
exports.contractGetComponentHandler = contractGetComponentHandler;
function countLeadingSpaces(s) {
    let n = 0;
    while (n < s.length && s[n] === " ")
        n++;
    return n;
}
function parseEvidenceBlock(rawMdx) {
    const fmMatch = rawMdx.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    if (!fmMatch)
        return null;
    const fmLines = fmMatch[1].split(/\r?\n/);
    const startIdx = fmLines.findIndex((l) => l === "evidence-posthog:");
    if (startIdx === -1)
        return null;
    const result = { totalRenders: 0, topVariant: null, variants: {}, topPages: [] };
    let i = startIdx + 1;
    while (i < fmLines.length) {
        const line = fmLines[i];
        if (!line.trim()) {
            i++;
            continue;
        }
        const indent = countLeadingSpaces(line);
        if (indent === 0)
            break; // left evidence-posthog block
        if (indent === 2) {
            const content = line.trimStart();
            if (content.startsWith("total-renders:")) {
                result.totalRenders = parseInt(content.slice("total-renders:".length).trim()) || 0;
                i++;
            }
            else if (content.startsWith("top-variant:")) {
                const v = content.slice("top-variant:".length).trim();
                result.topVariant = v === "null" ? null : v;
                i++;
            }
            else if (content === "variants:") {
                i++;
                while (i < fmLines.length) {
                    const vl = fmLines[i];
                    if (!vl.trim()) {
                        i++;
                        continue;
                    }
                    const vi = countLeadingSpaces(vl);
                    if (vi < 4)
                        break;
                    if (vi === 4 && vl.trimStart().endsWith(":")) {
                        const varName = vl.trimStart().slice(0, -1);
                        const variant = { renders: 0, uniqueUsers: 0, pages: [] };
                        i++;
                        while (i < fmLines.length) {
                            const pl = fmLines[i];
                            if (!pl.trim()) {
                                i++;
                                continue;
                            }
                            const pi = countLeadingSpaces(pl);
                            if (pi < 6)
                                break;
                            const pc = pl.trimStart();
                            if (pc.startsWith("renders:")) {
                                variant.renders = parseInt(pc.slice("renders:".length).trim()) || 0;
                                i++;
                            }
                            else if (pc.startsWith("unique-users:")) {
                                variant.uniqueUsers = parseInt(pc.slice("unique-users:".length).trim()) || 0;
                                i++;
                            }
                            else if (pc === "pages:") {
                                i++;
                                while (i < fmLines.length && countLeadingSpaces(fmLines[i]) >= 8) {
                                    const item = fmLines[i].trimStart();
                                    if (item.startsWith("- "))
                                        variant.pages.push(item.slice(2));
                                    i++;
                                }
                            }
                            else {
                                i++;
                            }
                        }
                        result.variants[varName] = variant;
                    }
                    else {
                        i++;
                    }
                }
            }
            else if (content === "top-pages-by-renders:") {
                i++;
                let curPage = "";
                while (i < fmLines.length) {
                    const tl = fmLines[i];
                    if (!tl.trim()) {
                        i++;
                        continue;
                    }
                    if (countLeadingSpaces(tl) < 4)
                        break;
                    const tc = tl.trimStart();
                    if (tc.startsWith("- page:")) {
                        curPage = tc.slice("- page:".length).trim();
                        i++;
                    }
                    else if (tc.startsWith("renders:")) {
                        result.topPages.push({ page: curPage, renders: parseInt(tc.slice("renders:".length).trim()) || 0 });
                        i++;
                    }
                    else {
                        i++;
                    }
                }
            }
            else {
                i++;
            }
        }
        else {
            i++;
        }
    }
    return result;
}
function serializeEvidenceBlock(ev) {
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
            d.pages.slice(0, 5).forEach((p) => lines.push(`        - ${p}`));
        }
    }
    lines.push(`  top-pages-by-renders:`);
    ev.topPages.forEach(({ page, renders }) => {
        lines.push(`    - page: ${page}`);
        lines.push(`      renders: ${renders}`);
    });
    return lines.join("\n");
}
function patchEvidenceFrontmatter(content, totalRenders, evidence) {
    const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
    if (!match)
        return content;
    const [, yaml, body] = match;
    const lines = yaml.split("\n");
    const out = [];
    let i = 0;
    let wroteUsage = false;
    let wroteEvidence = false;
    while (i < lines.length) {
        const line = lines[i];
        if (line.startsWith("usage-count-30d:")) {
            out.push(`usage-count-30d: ${totalRenders}`);
            wroteUsage = true;
            i++;
            continue;
        }
        if (line.startsWith("evidence-posthog:")) {
            i++;
            while (i < lines.length && /^[ \t]/.test(lines[i]))
                i++;
            out.push("evidence-posthog:");
            out.push(serializeEvidenceBlock(evidence));
            wroteEvidence = true;
            continue;
        }
        out.push(line);
        i++;
    }
    if (!wroteUsage)
        out.push(`usage-count-30d: ${totalRenders}`);
    if (!wroteEvidence) {
        out.push("evidence-posthog:");
        out.push(serializeEvidenceBlock(evidence));
    }
    return `---\n${out.join("\n")}\n---\n${body}`;
}
// ---------------------------------------------------------------------------
// contract_get_evidence
// ---------------------------------------------------------------------------
exports.contractGetEvidenceDefinition = {
    name: "contract_get_evidence",
    description: "Read cached PostHog production evidence from a component's MDX contract. " +
        "Returns total renders, top variant, per-variant breakdown, and top pages " +
        "from the last 30-day window written by `systemix watch`.",
    inputSchema: {
        type: "object",
        properties: {
            name: {
                type: "string",
                description: "Component name or slug (e.g. 'Button' or 'button').",
            },
        },
        required: ["name"],
    },
};
const contractGetEvidenceHandler = async (args, projectRoot) => {
    const slug = args.name.toLowerCase().replace(/\s+/g, "-");
    const compDir = path.join(projectRoot, COMP_DIR);
    const components = readComponents(compDir);
    const comp = components.find((c) => c.slug === slug ||
        c.slug === args.name ||
        c.component.toLowerCase() === args.name.toLowerCase());
    if (!comp) {
        return {
            content: [{ type: "text", text: `Component not found: ${args.name}.` }],
            isError: true,
        };
    }
    const filePath = path.join(compDir, `${comp.slug}.mdx`);
    const raw = fs.readFileSync(filePath, "utf8");
    const evidence = parseEvidenceBlock(raw);
    const { data: fm } = parseFrontmatter(raw);
    const usageCount30d = fm["usage-count-30d"] != null ? Number(fm["usage-count-30d"]) : null;
    if (!evidence) {
        return {
            content: [{
                    type: "text",
                    text: JSON.stringify({
                        component: comp.component,
                        usageCount30d,
                        evidencePosthog: null,
                        message: "No evidence-posthog block found. Run `systemix watch` to populate.",
                    }, null, 2),
                }],
        };
    }
    return {
        content: [{
                type: "text",
                text: JSON.stringify({ component: comp.component, usageCount30d, evidencePosthog: evidence }, null, 2),
            }],
    };
};
exports.contractGetEvidenceHandler = contractGetEvidenceHandler;
// ---------------------------------------------------------------------------
// contract_write_evidence
// ---------------------------------------------------------------------------
exports.contractWriteEvidenceDefinition = {
    name: "contract_write_evidence",
    description: "Write PostHog production evidence back into a component's MDX contract frontmatter. " +
        "Updates usage-count-30d and the evidence-posthog block in place, preserving the Hermes prose body. " +
        "Called by Hermes after gathering PostHog data to complete the evidence loop.",
    inputSchema: {
        type: "object",
        properties: {
            name: {
                type: "string",
                description: "Component name or slug (e.g. 'Button').",
            },
            totalRenders: {
                type: "number",
                description: "Total render count in the last 30 days.",
            },
            topVariant: {
                type: "string",
                description: "Most-used variant name, or null.",
            },
            variants: {
                type: "object",
                description: "Per-variant stats: { [name]: { renders: number, uniqueUsers: number, pages?: string[] } }.",
            },
            topPages: {
                type: "array",
                description: "Top pages by render count: [{ page: string, renders: number }].",
                items: {
                    type: "object",
                    properties: {
                        page: { type: "string" },
                        renders: { type: "number" },
                    },
                },
            },
        },
        required: ["name", "totalRenders"],
    },
};
const contractWriteEvidenceHandler = async (args, projectRoot) => {
    const slug = args.name.toLowerCase().replace(/\s+/g, "-");
    const compDir = path.join(projectRoot, COMP_DIR);
    const components = readComponents(compDir);
    const comp = components.find((c) => c.slug === slug ||
        c.slug === args.name ||
        c.component.toLowerCase() === args.name.toLowerCase());
    if (!comp) {
        return {
            content: [{ type: "text", text: `Component not found: ${args.name}.` }],
            isError: true,
        };
    }
    const filePath = path.join(compDir, `${comp.slug}.mdx`);
    const original = fs.readFileSync(filePath, "utf8");
    const variants = {};
    for (const [k, v] of Object.entries(args.variants ?? {})) {
        variants[k] = { renders: v.renders ?? 0, uniqueUsers: v.uniqueUsers ?? 0, pages: v.pages ?? [] };
    }
    const evidence = {
        totalRenders: args.totalRenders,
        topVariant: args.topVariant ?? null,
        variants,
        topPages: args.topPages ?? [],
    };
    const patched = patchEvidenceFrontmatter(original, args.totalRenders, evidence);
    if (patched === original) {
        return {
            content: [{ type: "text", text: `No changes — evidence for ${comp.component} is already up to date.` }],
        };
    }
    const tmp = filePath + ".tmp";
    fs.writeFileSync(tmp, patched, "utf8");
    fs.renameSync(tmp, filePath);
    return {
        content: [{
                type: "text",
                text: JSON.stringify({
                    updated: comp.component,
                    file: path.relative(projectRoot, filePath),
                    totalRenders: args.totalRenders,
                    variantCount: Object.keys(variants).length,
                    topPages: evidence.topPages.length,
                }, null, 2),
            }],
    };
};
exports.contractWriteEvidenceHandler = contractWriteEvidenceHandler;
// ---------------------------------------------------------------------------
// Hypothesis contracts — types + reader
// ---------------------------------------------------------------------------
const HYPOTHESIS_DIR = "contract/hypotheses";
function parseVariants(raw) {
    // Flat YAML: variants are single-level under the "variants:" key
    const result = {};
    const lines = raw.split(/\r?\n/);
    let inVariants = false;
    for (const line of lines) {
        if (line.trim() === "variants:") {
            inVariants = true;
            continue;
        }
        if (inVariants) {
            if (/^\S/.test(line)) {
                inVariants = false;
                continue;
            }
            const m = line.match(/^\s{2}(\w+):\s+"?([^"]+)"?\s*$/);
            if (m)
                result[m[1]] = m[2];
        }
    }
    return result;
}
function readHypotheses(hypDir) {
    if (!fs.existsSync(hypDir))
        return [];
    return fs.readdirSync(hypDir)
        .filter((f) => f.endsWith(".mdx"))
        .map((f) => {
        const raw = fs.readFileSync(path.join(hypDir, f), "utf8");
        const { data: fm, content } = parseFrontmatter(raw);
        const slug = f.replace(/\.mdx$/, "");
        return {
            slug,
            id: String(fm.id ?? slug),
            section: fm.section != null ? String(fm.section) : null,
            hypothesis: String(fm.hypothesis ?? ""),
            icp: fm.icp != null ? String(fm.icp) : null,
            status: String(fm.status ?? "running"),
            created: fm.created != null ? String(fm.created) : null,
            variants: parseVariants(raw),
            result: fm.result != null ? String(fm.result) : null,
            decision: fm.decision != null ? String(fm.decision) : null,
            confidence: fm.confidence != null ? Number(fm.confidence) : null,
            prose: content,
        };
    });
}
// ---------------------------------------------------------------------------
// contract_get_hypothesis
// ---------------------------------------------------------------------------
exports.contractGetHypothesisDefinition = {
    name: "contract_get_hypothesis",
    description: "Retrieve a single hypothesis contract from contract/hypotheses/ by id or slug. " +
        "Returns all frontmatter fields (id, section, hypothesis, icp, status, variants, result, decision, confidence) " +
        "plus the Hermes rationale prose body.",
    inputSchema: {
        type: "object",
        properties: {
            id: {
                type: "string",
                description: "Hypothesis id or file slug (e.g. 'hero-vp-icp-match-2026-04').",
            },
        },
        required: ["id"],
    },
};
const contractGetHypothesisHandler = async (args, projectRoot) => {
    const hypotheses = readHypotheses(path.join(projectRoot, HYPOTHESIS_DIR));
    const hyp = hypotheses.find((h) => h.id === args.id || h.slug === args.id);
    if (!hyp) {
        return {
            content: [{ type: "text", text: `Hypothesis not found: ${args.id}. Check contract/hypotheses/ for available files.` }],
            isError: true,
        };
    }
    return {
        content: [{ type: "text", text: JSON.stringify(hyp, null, 2) }],
    };
};
exports.contractGetHypothesisHandler = contractGetHypothesisHandler;
// ---------------------------------------------------------------------------
// contract_list_hypotheses
// ---------------------------------------------------------------------------
exports.contractListHypothesesDefinition = {
    name: "contract_list_hypotheses",
    description: "List all hypothesis contracts in contract/hypotheses/. " +
        "Optionally filter by status ('running', 'complete', 'archived'). " +
        "Returns id, section, status, icp, decision, and confidence for each.",
    inputSchema: {
        type: "object",
        properties: {
            status: {
                type: "string",
                description: "Filter by status: 'running', 'complete', or 'archived'. Omit to return all.",
            },
        },
    },
};
const contractListHypothesesHandler = async (args, projectRoot) => {
    let hypotheses = readHypotheses(path.join(projectRoot, HYPOTHESIS_DIR));
    if (args.status) {
        hypotheses = hypotheses.filter((h) => h.status === args.status);
    }
    const summary = hypotheses.map((h) => ({
        id: h.id,
        section: h.section,
        status: h.status,
        icp: h.icp,
        hypothesis: h.hypothesis.slice(0, 120) + (h.hypothesis.length > 120 ? "…" : ""),
        decision: h.decision,
        confidence: h.confidence,
    }));
    return {
        content: [{
                type: "text",
                text: hypotheses.length === 0
                    ? `No hypotheses found${args.status ? ` with status '${args.status}'` : ""}.`
                    : JSON.stringify({ count: hypotheses.length, hypotheses: summary }, null, 2),
            }],
    };
};
exports.contractListHypothesesHandler = contractListHypothesesHandler;
// ---------------------------------------------------------------------------
// contract_write_hypothesis_result
// ---------------------------------------------------------------------------
exports.contractWriteHypothesisResultDefinition = {
    name: "contract_write_hypothesis_result",
    description: "Write an experiment result back into a hypothesis contract. " +
        "Updates status, result, decision, and confidence in the MDX frontmatter in place. " +
        "Called by Hermes after PostHog evidence confirms a winner, or by a HITL decision.",
    inputSchema: {
        type: "object",
        properties: {
            id: {
                type: "string",
                description: "Hypothesis id or slug.",
            },
            status: {
                type: "string",
                enum: ["running", "complete", "archived"],
                description: "New status.",
            },
            result: {
                type: "string",
                description: "Human-readable result summary (e.g. 'Variant B: +34% signups, p=0.02').",
            },
            decision: {
                type: "string",
                enum: ["promote", "iterate", "kill", "no-action"],
                description: "Action to take based on the result.",
            },
            confidence: {
                type: "number",
                description: "Statistical or heuristic confidence 0–1 (e.g. 0.95).",
            },
        },
        required: ["id", "status", "decision"],
    },
};
const contractWriteHypothesisResultHandler = async (args, projectRoot) => {
    const hypDir = path.join(projectRoot, HYPOTHESIS_DIR);
    const hypotheses = readHypotheses(hypDir);
    const hyp = hypotheses.find((h) => h.id === args.id || h.slug === args.id);
    if (!hyp) {
        return {
            content: [{ type: "text", text: `Hypothesis not found: ${args.id}.` }],
            isError: true,
        };
    }
    const filePath = path.join(hypDir, `${hyp.slug}.mdx`);
    let content = fs.readFileSync(filePath, "utf8");
    // Patch frontmatter fields in place
    const patchField = (src, key, value) => {
        const re = new RegExp(`^(${key}:).*$`, "m");
        const replacement = value === null ? `${key}: null` : `${key}: ${value}`;
        return re.test(src) ? src.replace(re, replacement) : src;
    };
    content = patchField(content, "status", args.status);
    content = patchField(content, "result", args.result ? `"${args.result}"` : null);
    content = patchField(content, "decision", args.decision);
    content = patchField(content, "confidence", args.confidence != null ? String(args.confidence) : null);
    const tmp = filePath + ".tmp";
    fs.writeFileSync(tmp, content, "utf8");
    fs.renameSync(tmp, filePath);
    return {
        content: [{
                type: "text",
                text: JSON.stringify({
                    updated: hyp.id,
                    file: path.relative(projectRoot, filePath),
                    status: args.status,
                    decision: args.decision,
                    confidence: args.confidence ?? null,
                }, null, 2),
            }],
    };
};
exports.contractWriteHypothesisResultHandler = contractWriteHypothesisResultHandler;
// ---------------------------------------------------------------------------
// contract_get_quality_score
// ---------------------------------------------------------------------------
exports.contractGetQualityScoreDefinition = {
    name: "contract_get_quality_score",
    description: "Compute and return the current design system quality score (0–100). " +
        "Reads all contract/tokens/ and contract/components/ MDX files. " +
        "Score formula: tokens ratio minus unresolved drift penalties, averaged with components ratio. " +
        "< 60 = critical, 60–80 = needs attention, ≥ 80 = clean.",
    inputSchema: {
        type: "object",
        properties: {},
    },
};
const contractGetQualityScoreHandler = async (_args, projectRoot) => {
    const tokens = readTokens(path.join(projectRoot, TOKEN_DIR));
    const components = readComponents(path.join(projectRoot, COMP_DIR));
    const score = computeScore(tokens, components);
    const totalT = tokens.length;
    const cleanT = tokens.filter((t) => t.status === "clean").length;
    const driftedT = tokens.filter((t) => t.status === "drifted").length;
    const missingT = tokens.filter((t) => t.status === "missing-in-figma").length;
    const unresolvedT = tokens.filter((t) => (t.status === "drifted" || t.status === "missing-in-figma") && !t.resolved).length;
    const totalC = components.length;
    const cleanC = components.filter((c) => c.parity === "clean").length;
    const driftedC = components.filter((c) => c.parity === "drifted").length;
    const state = score >= 80 ? "clean" : score >= 60 ? "needs-attention" : "critical";
    return {
        content: [{
                type: "text",
                text: JSON.stringify({
                    score,
                    state,
                    tokens: { total: totalT, clean: cleanT, drifted: driftedT, missingInFigma: missingT, unresolvedOpen: unresolvedT },
                    components: { total: totalC, clean: cleanC, drifted: driftedC },
                }, null, 2),
            }],
    };
};
exports.contractGetQualityScoreHandler = contractGetQualityScoreHandler;
//# sourceMappingURL=contract.js.map