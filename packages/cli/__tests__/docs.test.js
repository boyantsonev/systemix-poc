"use strict";

/**
 * Acceptance tests — the docs contract (`systemix docs`).
 * The docs ARE the inventory: docs/manifest.json is generated FROM the
 * frontmatter of docs/components/*.md. Real filesystem (tmp dirs), same
 * pattern as the experiments loop tests.
 */

const fs = require("fs");
const os = require("os");
const path = require("path");
const matter = require("gray-matter");

const { docs, buildManifest, kebabCase } = require("../src/commands/docs");

function tmpRoot() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "systemix-docs-"));
}

function writeDoc(root, slug, fm, body = `# ${fm.name ?? slug}\n`) {
  const dir = path.join(root, "docs", "components");
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, `${slug}.md`), matter.stringify(body, fm), "utf8");
}

const readManifest = (root) =>
  JSON.parse(fs.readFileSync(path.join(root, "docs", "manifest.json"), "utf8"));

const FM = (name, slug, group, extra = {}) => ({
  name,
  slug,
  group,
  status: "skeleton",
  source: `src/components/${name}.tsx`,
  reference: null,
  gallery: null,
  platforms: ["web"],
  ...extra,
});

describe("docs sync — the manifest is built FROM doc frontmatter", () => {
  let root;
  beforeEach(() => { root = tmpRoot(); });
  afterEach(() => {
    fs.rmSync(root, { recursive: true, force: true });
    process.exitCode = 0;
  });

  it("builds docs/manifest.json from docs/components/*.md frontmatter", async () => {
    writeDoc(root, "button", FM("Button", "button", "buttons", { status: "ported", reference: "reference/Button.jsx" }));
    writeDoc(root, "input", FM("Input", "input", "forms"));
    await docs(["sync"], { projectRoot: root });

    const m = readManifest(root);
    expect(m.$schema).toBe("systemix-docs-manifest/v1");
    expect(m.generatedBy).toBe("systemix docs sync");
    expect(m.count).toBe(2);
    expect(m.groups).toEqual(["buttons", "forms"]);
    expect(m.components.map((c) => c.slug)).toEqual(["button", "input"]);
    expect(m.components[0]).toMatchObject({
      name: "Button",
      slug: "button",
      group: "buttons",
      status: "ported",
      source: "src/components/Button.tsx",
      reference: "reference/Button.jsx",
      doc: "docs/components/button.md",
    });
    expect(process.exitCode ?? 0).toBe(0);
  });

  it("ordering is deterministic (group, then name) with a trailing newline", async () => {
    writeDoc(root, "zeta", FM("Zeta", "zeta", "forms"));
    writeDoc(root, "alert", FM("Alert", "alert", "feedback"));
    writeDoc(root, "alpha", FM("Alpha", "alpha", "forms"));
    await docs(["sync"], { projectRoot: root });

    const raw = fs.readFileSync(path.join(root, "docs", "manifest.json"), "utf8");
    expect(raw.endsWith("\n")).toBe(true);
    const m = JSON.parse(raw);
    expect(m.components.map((c) => c.slug)).toEqual(["alert", "alpha", "zeta"]);
    expect(m.groups).toEqual(["feedback", "forms"]);
  });

  it("excludes the _template.md contract from the inventory", async () => {
    writeDoc(root, "_template", FM("ComponentName", "component-name", "general"));
    writeDoc(root, "badge", FM("Badge", "badge", "data-display"));
    await docs(["sync"], { projectRoot: root });
    expect(readManifest(root).components.map((c) => c.slug)).toEqual(["badge"]);
  });

  it("fails with a helpful ✗ when docs/components/ doesn't exist", async () => {
    const errors = [];
    const spy = jest.spyOn(console, "error").mockImplementation((...a) => errors.push(a.join(" ")));
    await docs(["sync"], { projectRoot: root });
    spy.mockRestore();
    expect(process.exitCode).toBe(1);
    expect(errors.join("\n")).toContain("docs/components/ not found");
    expect(fs.existsSync(path.join(root, "docs", "manifest.json"))).toBe(false);
  });
});

describe("docs sync — frontmatter validation", () => {
  let root;
  beforeEach(() => { root = tmpRoot(); });
  afterEach(() => {
    fs.rmSync(root, { recursive: true, force: true });
    process.exitCode = 0;
  });

  it("catches a slug/filename mismatch and writes nothing", async () => {
    writeDoc(root, "button", FM("Button", "not-button", "buttons"));
    const errors = [];
    const spy = jest.spyOn(console, "error").mockImplementation((...a) => errors.push(a.join(" ")));
    await docs(["sync"], { projectRoot: root });
    spy.mockRestore();
    expect(process.exitCode).toBe(1);
    expect(errors.join("\n")).toMatch(/button\.md: slug "not-button" does not match filename "button"/);
    expect(fs.existsSync(path.join(root, "docs", "manifest.json"))).toBe(false);
  });

  it("catches missing required keys (name, slug, group, source), listing every offender", () => {
    writeDoc(root, "broken", { status: "skeleton" }); // no name/slug/group/source
    writeDoc(root, "half", { name: "Half", slug: "half", group: "forms" }); // no source
    const { errors } = buildManifest(root);
    const text = errors.join("\n");
    for (const k of ["name", "slug", "group", "source"]) {
      expect(text).toContain(`broken.md: missing required key "${k}"`);
    }
    expect(text).toContain('half.md: missing required key "source"');
  });
});

describe("docs sync --check — the CI guard", () => {
  let root;
  beforeEach(() => { root = tmpRoot(); });
  afterEach(() => {
    fs.rmSync(root, { recursive: true, force: true });
    process.exitCode = 0;
  });

  it("passes when the manifest is fresh", async () => {
    writeDoc(root, "button", FM("Button", "button", "buttons"));
    await docs(["sync"], { projectRoot: root });
    await docs(["sync", "--check"], { projectRoot: root });
    expect(process.exitCode ?? 0).toBe(0);
  });

  it("exits 1 on stale without writing", async () => {
    writeDoc(root, "button", FM("Button", "button", "buttons"));
    await docs(["sync"], { projectRoot: root });
    const before = fs.readFileSync(path.join(root, "docs", "manifest.json"), "utf8");

    writeDoc(root, "input", FM("Input", "input", "forms")); // new doc ⇒ manifest now stale
    const errors = [];
    const spy = jest.spyOn(console, "error").mockImplementation((...a) => errors.push(a.join(" ")));
    await docs(["sync", "--check"], { projectRoot: root });
    spy.mockRestore();

    expect(process.exitCode).toBe(1);
    expect(errors.join("\n")).toContain("stale — run npx @getsystemix/cli docs sync");
    expect(fs.readFileSync(path.join(root, "docs", "manifest.json"), "utf8")).toBe(before); // no write
  });

  it("exits 1 when the manifest is missing entirely", async () => {
    writeDoc(root, "button", FM("Button", "button", "buttons"));
    await docs(["sync", "--check"], { projectRoot: root });
    expect(process.exitCode).toBe(1);
    expect(fs.existsSync(path.join(root, "docs", "manifest.json"))).toBe(false);
  });
});

describe("docs new — scaffold from the template", () => {
  let root;
  beforeEach(() => { root = tmpRoot(); });
  afterEach(() => {
    fs.rmSync(root, { recursive: true, force: true });
    process.exitCode = 0;
  });

  it("kebab-cases the slug and substitutes name/slug/group/source/reference", async () => {
    await docs(
      ["new", "IconButton", "--group", "buttons", "--source", "src/ui/IconButton.tsx", "--reference", "ref/IconButton.jsx"],
      { projectRoot: root }
    );
    const file = path.join(root, "docs", "components", "icon-button.md");
    expect(fs.existsSync(file)).toBe(true);
    const { data, content } = matter(fs.readFileSync(file, "utf8"));
    expect(data).toMatchObject({
      name: "IconButton",
      slug: "icon-button",
      group: "buttons",
      status: "skeleton",
      source: "src/ui/IconButton.tsx",
      reference: "ref/IconButton.jsx",
    });
    expect(content).toContain("# IconButton"); // ComponentName placeholders substituted
    expect(content).not.toContain("ComponentName");
  });

  it("creates docs/README.md (the consumption contract) on first use and runs sync", async () => {
    await docs(["new", "Badge", "--group", "data-display"], { projectRoot: root });
    const readme = fs.readFileSync(path.join(root, "docs", "README.md"), "utf8");
    expect(readme).toContain("npx @getsystemix/cli docs sync");
    const m = readManifest(root); // sync ran
    expect(m.count).toBe(1);
    expect(m.components[0]).toMatchObject({ slug: "badge", group: "data-display", status: "skeleton" });
  });

  it("refuses to overwrite an existing doc", async () => {
    await docs(["new", "Badge", "--group", "data-display"], { projectRoot: root });
    process.exitCode = 0;
    const written = fs.readFileSync(path.join(root, "docs", "components", "badge.md"), "utf8");

    const errors = [];
    const spy = jest.spyOn(console, "error").mockImplementation((...a) => errors.push(a.join(" ")));
    await docs(["new", "Badge", "--group", "other"], { projectRoot: root });
    spy.mockRestore();

    expect(process.exitCode).toBe(1);
    expect(errors.join("\n")).toContain("already exists");
    expect(fs.readFileSync(path.join(root, "docs", "components", "badge.md"), "utf8")).toBe(written);
  });

  it("requires a name and --group", async () => {
    await docs(["new"], { projectRoot: root });
    expect(process.exitCode).toBe(1);
    process.exitCode = 0;
    await docs(["new", "Badge"], { projectRoot: root });
    expect(process.exitCode).toBe(1);
  });

  it("kebabCase handles PascalCase, spaces, and underscores", () => {
    expect(kebabCase("IconButton")).toBe("icon-button");
    expect(kebabCase("Agent Avatar")).toBe("agent-avatar");
    expect(kebabCase("tool_steps")).toBe("tool-steps");
    expect(kebabCase("button")).toBe("button");
  });
});
