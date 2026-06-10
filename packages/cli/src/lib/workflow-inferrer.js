"use strict";

const fs = require("fs");
const path = require("path");
const matter = require("gray-matter");

// ── Pattern classification ─────────────────────────────────────────────────

function classifyPattern(steps) {
  if (steps.some((s) => s.kind === "parallel")) return "parallelization";
  if (steps.some((s) => s.kind === "router")) return "routing";
  if (steps.filter((s) => s.kind === "agent").length >= 2) return "orchestration";
  return "chain";
}

// ── Skill discovery ────────────────────────────────────────────────────────

/** Parse a free-form .claude/skills/*.md file — first heading + first paragraph. */
function parseFreeskill(content, filename) {
  const headingMatch = content.match(/^#\s+\/?(\S+)/m);
  const name = headingMatch ? headingMatch[1].replace(/^\//, "") : filename.replace(/\.md$/, "");

  // Description: first paragraph before the first --- divider or double newline
  const afterHeading = content.replace(/^#[^\n]*\n/, "").trimStart();
  const descMatch = afterHeading.match(/^(.+?)(?:\n\n|\n---)/s);
  const description = descMatch ? descMatch[1].trim().replace(/\n/g, " ") : name;

  return { name, description };
}

// Discover skills from both .claude/skills/*.md and packages/cli/pipelines/*/*/SKILL.md
function discoverSkills(projectRoot) {
  const results = [];

  // Source A: .claude/skills/*.md (free-form)
  const skillsDir = path.join(projectRoot, ".claude", "skills");
  if (fs.existsSync(skillsDir)) {
    for (const f of fs.readdirSync(skillsDir).filter((f) => f.endsWith(".md"))) {
      const content = fs.readFileSync(path.join(skillsDir, f), "utf8");
      const { name, description } = parseFreeskill(content, f);
      if (name) results.push({ name, description, raw: content, source: "skills-dir" });
    }
  }

  // Source B: packages/cli/pipelines/**/SKILL.md (structured frontmatter)
  const pipelinesDir = path.join(projectRoot, "packages", "cli", "pipelines");
  if (fs.existsSync(pipelinesDir)) {
    function walk(dir) {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) { walk(full); continue; }
        if (entry.name !== "SKILL.md") continue;
        const content = fs.readFileSync(full, "utf8");
        let fm;
        try { fm = matter(content).data; } catch { continue; }
        if (fm && fm.name && fm.description) {
          results.push({ name: fm.name, description: fm.description, raw: content, source: "pipelines" });
        }
      }
    }
    walk(pipelinesDir);
  }

  return results;
}

// ── API route discovery ────────────────────────────────────────────────────

function discoverApiRoutes(projectRoot) {
  const apiDir = path.join(projectRoot, "src", "app", "api");
  if (!fs.existsSync(apiDir)) return [];

  const routes = [];
  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) { walk(full); continue; }
      if (entry.name !== "route.ts" && entry.name !== "route.js") continue;

      const rel = path.relative(path.join(projectRoot, "src", "app"), dir);
      const routePath = "/" + rel.replace(/\\/g, "/").replace(/\([^)]+\)\//g, "");
      const content = fs.readFileSync(full, "utf8");
      const methods = ["GET", "POST", "PUT", "PATCH", "DELETE"].filter((m) =>
        new RegExp(`export\\s+async\\s+function\\s+${m}|export\\s+function\\s+${m}`).test(content),
      );
      if (methods.length) routes.push({ path: routePath, methods });
    }
  }
  walk(apiDir);
  return routes;
}

// ── Workflow inference ─────────────────────────────────────────────────────

function inferPersona(skill, vocab) {
  const text = (skill.name + " " + skill.description).toLowerCase();
  for (const p of vocab.personas) {
    if (text.includes(p)) return p;
  }
  if (/figma|design|token|sync|drift|parity|component/.test(text)) return "designer";
  if (/deploy|build|test|code|ship|hermes|storybook/.test(text)) return "engineer";
  return vocab.personas[0] ?? "founder";
}

function inferSurface(skill, vocab) {
  const text = (skill.name + " " + skill.description).toLowerCase();
  if (/phone|mobile/.test(text) && vocab.surfaces.includes("phone")) return "phone";
  if (/tablet/.test(text) && vocab.surfaces.includes("tablet")) return "tablet";
  return vocab.surfaces.find((s) => s === "desktop") ?? vocab.surfaces[0] ?? "desktop";
}

function findReferencedRoutes(skillRaw, routes) {
  return routes.filter((r) => skillRaw.includes(r.path) || skillRaw.includes(r.path.replace(/\/$/, "")));
}

function inferAgentFromSkill(skill, vocab) {
  const text = (skill.name + " " + skill.description).toLowerCase();
  if (/hermes|hypothesis|evidence|growth/.test(text) && vocab.agents.includes("hermes")) return "hermes";
  if (/scout|drift|parity|audit/.test(text) && vocab.agents.includes("scout")) return "scout";
  if (/flux|token|sync|figma|deploy/.test(text) && vocab.agents.includes("flux")) return "flux";
  return vocab.agents[0] ?? "hermes";
}

/**
 * Infer one workflow per skill.
 * @param {object[]} skills
 * @param {object[]} routes
 * @param {{ personas: string[], agents: string[], surfaces: string[] }} vocab
 * @param {number} [limit=10]
 * @returns {object[]}
 */
function inferWorkflows(skills, routes, vocab, limit = 10) {
  return skills.slice(0, limit).map((skill) => {
    const persona = inferPersona(skill, vocab);
    const surface = inferSurface(skill, vocab);
    const agent = inferAgentFromSkill(skill, vocab);
    const referenced = findReferencedRoutes(skill.raw, routes);

    const steps = [
      { id: "trigger", label: "Trigger", kind: "input", note: `Invoke /${skill.name}` },
    ];

    for (const route of referenced.slice(0, 2)) {
      const stepId = "api" + route.path.replace(/\W+/g, "-").replace(/-$/, "");
      steps.push({
        id: stepId,
        label: route.methods[0] + " " + route.path,
        kind: "tool",
        note: `Calls ${route.path}`,
      });
    }

    steps.push({ id: "process", label: "Process", kind: "agent", agent, note: skill.description.slice(0, 80) || "Execute skill logic" });
    steps.push({ id: "output", label: "Done", kind: "output", note: "Skill complete" });

    const edges = steps.slice(0, -1).map((s, i) => ({ from: s.id, to: steps[i + 1].id }));

    return {
      id: `scan-${skill.name.replace(/[^a-z0-9]/gi, "-").toLowerCase()}`,
      persona,
      title: skill.description.slice(0, 60) || skill.name,
      pattern: classifyPattern(steps),
      surface,
      problem: skill.description,
      steps,
      edges,
      _skill: skill.name,
    };
  });
}

module.exports = { discoverSkills, discoverApiRoutes, inferWorkflows, classifyPattern };
