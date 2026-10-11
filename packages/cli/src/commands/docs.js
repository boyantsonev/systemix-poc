"use strict";

// `systemix docs …` — the component-docs contract (docs/).
// The docs ARE the inventory: docs/manifest.json is generated FROM the
// frontmatter of docs/components/*.md (no hand-maintained component list).
// This command owns the manifest + skeleton scaffolding only — it never
// touches doc bodies; filling bodies is the /document skill's job (HITL).

const fs = require("fs");
const path = require("path");
const matter = require("gray-matter");
const { isValidExperimentId } = require("../lib/experiments");

const TEMPLATES_DIR = path.join(__dirname, "..", "..", "templates", "docs");

const DOCS_HELP = `
  systemix docs — component docs as the design-system inventory (docs/)

  Usage:
    systemix docs sync [--check]     Rebuild docs/manifest.json from the frontmatter of docs/components/*.md
                                     (--check: exit 1 if the manifest is stale, write nothing)
    systemix docs new <Name> --group <group> [--source <path>] [--reference <path>]
                                     Scaffold docs/components/<slug>.md from the template, then sync
`;

const REQUIRED_KEYS = ["name", "slug", "group", "source"];

const kebabCase = (name) =>
  String(name)
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

function parseFlags(args) {
  const flags = {};
  const positional = [];
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a.startsWith("--")) {
      const key = a.slice(2);
      const next = args[i + 1];
      if (next === undefined || next.startsWith("--")) flags[key] = true;
      else { flags[key] = next; i++; }
    } else {
      positional.push(a);
    }
  }
  return { flags, positional };
}

const str = (v) => (typeof v === "string" ? v : undefined);

/**
 * Build the manifest object from the frontmatter of docs/components/*.md
 * (every .md except the _-prefixed template). Returns { manifest, errors };
 * errors non-empty ⇒ the frontmatter contract is violated and nothing should
 * be written. Ordering is deterministic: components sorted by group, then name.
 */
function buildManifest(root) {
  const dir = path.join(root, "docs", "components");
  const errors = [];
  const files = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".md") && !f.startsWith("_"))
    .sort();
  const components = [];
  for (const f of files) {
    const slugFromFile = f.replace(/\.md$/, "");
    let data;
    try {
      data = matter(fs.readFileSync(path.join(dir, f), "utf8")).data || {};
    } catch (e) {
      errors.push(`docs/components/${f}: unparseable frontmatter (${e.message})`);
      continue;
    }
    for (const k of REQUIRED_KEYS) {
      if (data[k] == null || data[k] === "") errors.push(`docs/components/${f}: missing required key "${k}"`);
    }
    if (data.slug != null && data.slug !== "" && String(data.slug) !== slugFromFile) {
      errors.push(`docs/components/${f}: slug "${data.slug}" does not match filename "${slugFromFile}"`);
    }
    components.push({
      name: data.name ?? null,
      slug: data.slug ?? slugFromFile,
      group: data.group ?? null,
      status: data.status ?? "skeleton",
      source: data.source ?? null,
      reference: data.reference ?? null,
      gallery: data.gallery ?? null,
      platforms: data.platforms ?? null,
      doc: `docs/components/${f}`,
    });
  }
  components.sort(
    (a, b) =>
      String(a.group).localeCompare(String(b.group)) || String(a.name).localeCompare(String(b.name))
  );
  const manifest = {
    $schema: "systemix-docs-manifest/v1",
    generatedBy: "systemix docs sync",
    count: components.length,
    groups: [...new Set(components.map((c) => c.group))],
    components,
  };
  return { manifest, errors };
}

const serialize = (manifest) => JSON.stringify(manifest, null, 2) + "\n";

/** sync: rebuild docs/manifest.json (or, with check, verify it's fresh). Returns true on success. */
function syncDocs(root, { check = false } = {}) {
  const componentsDir = path.join(root, "docs", "components");
  if (!fs.existsSync(componentsDir)) {
    console.error("  ✗  docs/components/ not found — nothing to sync.");
    console.log("     scaffold the first doc: `npx @getsystemix/cli docs new <Name> --group <group>`");
    console.log("     (it vendors docs/README.md + the _template.md contract from the CLI's templates/docs/)");
    return false;
  }
  const { manifest, errors } = buildManifest(root);
  if (errors.length) {
    console.error("  ✗  invalid doc frontmatter — fix these, then re-run `npx @getsystemix/cli docs sync`:");
    for (const e of errors) console.error(`     - ${e}`);
    return false;
  }
  const out = serialize(manifest);
  const manifestPath = path.join(root, "docs", "manifest.json");
  const prev = fs.existsSync(manifestPath) ? fs.readFileSync(manifestPath, "utf8") : null;
  if (check) {
    if (prev !== out) {
      console.error("  ✗  docs/manifest.json is stale — run npx @getsystemix/cli docs sync");
      return false;
    }
    console.log(`  ✓  docs/manifest.json up to date (${manifest.count} components)`);
    return true;
  }
  fs.writeFileSync(manifestPath, out, "utf8");
  console.log(
    `  ✓  docs/manifest.json ${prev === out ? "unchanged" : "written"} (${manifest.count} components, ${manifest.groups.length} groups)`
  );
  return true;
}

/** new: scaffold docs/components/<slug>.md from the template (+ docs/README.md on first use), then sync. */
function newDoc(root, name, { group, source, reference } = {}) {
  if (!name || !group) {
    console.log("  usage: systemix docs new <Name> --group <group> [--source <path>] [--reference <path>]");
    return false;
  }
  const slug = kebabCase(name);
  if (!isValidExperimentId(slug)) {
    console.error(`  ✗  ${JSON.stringify(name)} doesn't make a valid slug (a-z, 0-9, "-")`);
    return false;
  }
  const componentsDir = path.join(root, "docs", "components");
  const file = path.join(componentsDir, `${slug}.md`);
  if (fs.existsSync(file)) {
    console.error(`  ✗  docs/components/${slug}.md already exists — refusing to overwrite (fill it with /document instead)`);
    return false;
  }
  const template = fs.readFileSync(path.join(TEMPLATES_DIR, "components", "_template.md"), "utf8");
  const doc = template
    .replace(/^name: .*$/m, `name: ${name}`)
    .replace(/^slug: .*$/m, `slug: ${slug}`)
    .replace(/^group: .*$/m, `group: ${group}`)
    .replace(/^source: .*$/m, `source: ${source ?? `src/components/${name}.tsx`}`)
    .replace(/^reference: .*$/m, `reference: ${reference ?? "null"}`)
    .replace(/^gallery: .*$/m, "gallery: null")
    .replaceAll("ComponentName", name)
    .replaceAll("component-name", slug);
  fs.mkdirSync(componentsDir, { recursive: true });
  fs.writeFileSync(file, doc, "utf8");
  console.log(`  ✓  created docs/components/${slug}.md (status: skeleton — fill it with /document)`);

  const readme = path.join(root, "docs", "README.md");
  if (!fs.existsSync(readme)) {
    fs.copyFileSync(path.join(TEMPLATES_DIR, "README.md"), readme);
    console.log("  ✓  docs/README.md created (the consumption contract)");
  }
  return syncDocs(root, {});
}

async function docs(args = [], opts = {}) {
  const root = opts.projectRoot ?? process.cwd();
  const [sub, ...rest] = args;
  const { flags, positional } = parseFlags(rest);

  switch (sub) {
    case "sync": {
      if (!syncDocs(root, { check: flags.check === true })) process.exitCode = 1;
      break;
    }

    case "new": {
      const ok = newDoc(root, positional[0], {
        group: str(flags.group),
        source: str(flags.source),
        reference: str(flags.reference),
      });
      if (!ok) process.exitCode = 1;
      break;
    }

    case undefined:
      console.log(DOCS_HELP);
      break;

    default:
      console.log(`\n  Unknown docs subcommand: ${sub}`);
      console.log(DOCS_HELP);
      process.exitCode = 1;
  }
}

module.exports = {
  docs,
  DOCS_HELP,
  // internals exported for reuse/tests
  buildManifest,
  syncDocs,
  newDoc,
  kebabCase,
};
