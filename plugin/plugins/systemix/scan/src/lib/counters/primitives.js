"use strict";

/**
 * primitives.js — raw interactive elements vs the design system's primitives.
 * How many `<button>`/`<input>` are written by hand, how many `<Button>`,
 * `<Input>`, `<Badge>`, `<Card>` are used, where each primitive is DEFINED, and
 * whether the `<Badge>` a file renders is the canonical one or a local copy.
 * Every count is a regex tally over source text; nothing here judges whether a
 * raw element is "hand-styled" or a primitive is "adopted" — the inputs to that
 * judgement are exposed as separate counters (focus-visible, buttonVariants,
 * rounded-full, shared class strings) and the call is left to a reader.
 *
 * Tags. `<name` followed by anything but a name character, `.`, `:` or `-`
 * (so `<Button` does not match `<ButtonGroup` or `<Button.Root`). Matched over
 * the raw text of audited tsx/jsx/js/vue/svelte files. .js files are included
 * because Create React App, many Next.js projects and Babel setups keep JSX in
 * them; .ts files are not, since TypeScript cannot parse JSX there. The regex
 * also sees tags inside comments, string literals and docs code samples, and
 * generic arguments such as `Array<Button>`: it is a tally of text, not of
 * rendered elements (and a plain .js utility that builds HTML in a string is
 * counted the same way).
 *
 * "Inside" / "outside" `components/ui/`: a `components/ui/` path segment. A repo
 * that keeps its primitives elsewhere (src/ui, design/…) sees them as "outside".
 *
 * The opening tag. For raw `<button` / `<input` the text from `<` to the `>`
 * that closes the tag (JSX braces, strings and template literals are skipped, so
 * `=>` and `a > b` inside an attribute do not end it; capped at 4000 chars and
 * at the next tag of the same name, so unclosed tags cost one pass over the
 * file) is searched for `focus-visible`, `rounded-full`, `buttonVariants` and a literal
 * `className="…"` / `class="…"`. Classes supplied by a variable or a helper are
 * not followed, so a missing `focus-visible` means "not in the tag text".
 *
 * Definitions. `(function|const) Name` at a statement start (optionally after
 * `export` / `export default` / `async`) in audited tsx/jsx/js files, for the
 * primitives and — to find copy-pasted components — for every PascalCase name
 * (a name with at least one lowercase letter). A definition's BODY is its text
 * from the `function|const` keyword to the end of the declaration, found on the
 * same token stream the reachability counters use (reachability.lex), so a
 * string, a template literal, a comment, a regex or JSX text can never end it:
 *   • `function` — the `}` that closes the body (generics, parameters and a
 *     return type, object types included, are skipped as bracket groups);
 *   • `const Name = …` — the first `;` outside any bracket, the end of the
 *     enclosing block, or a line break after a finished expression that the next
 *     line does not continue (the rule JavaScript's automatic semicolons use).
 * Bodies are compared as text, byte for byte (CRLF is already normalised). A
 * definition whose keyword is not code (it sits in a comment, a string or JSX
 * text), whose end cannot be found (unbalanced brackets) or that is beyond a
 * file's slicing budget (16 times its size, at least 1 MiB) is left out of
 * primitives.definitions.identical_groups and counted in its detail.uncompared.
 *
 * Which definition does a tag render? For a tag in a file outside
 * components/ui/: the file's own `(function|const) Name` ⇒ "local"; else the
 * file's `import … Name … from` is resolved with the reachability resolver
 * (aliases, index files) and followed through `export … from` / `export *`
 * chains to the file that defines the name ⇒ "ui" when that file is under
 * components/ui/, else "other"; a package import ⇒ "package"; anything else
 * (global, namespace import, unresolvable) ⇒ "unresolved".
 *
 * "Canonical user" = a file outside components/ui/ with at least one tag that
 * renders the ui definition; whether such a file has a static importer comes
 * from the reachability import graph (live-code reuse is 0 if none does).
 *
 * Counter ids (API — keep stable). <raw> is button|input, <p> is
 * button|input|badge|card (the tag `<Button` … `<Card`):
 *   primitives.<raw>.raw.total                       raw tags anywhere (match)
 *   primitives.<raw>.raw.files_total                 files holding a raw tag, inside or outside ui (file)
 *   primitives.<raw>.raw.inside_ui / .outside_ui     raw tags by zone (match; outside has perFile)
 *   primitives.<raw>.raw.files_outside_ui            files holding an outside raw tag (file)
 *   primitives.<raw>.raw.outside_ui.with_focus_visible   outside raw tags whose opening tag has focus-visible
 *   primitives.button.raw.outside_ui.rounded_full    outside raw buttons whose tag has rounded-full
 *   primitives.button.raw.outside_ui.with_button_variants  …whose tag mentions buttonVariants
 *   primitives.button.raw.outside_ui.shared_class_literal  …whose literal class string another raw button shares
 *   primitives.<p>.tags.total / .inside_ui / .outside_ui   component tags (match)
 *   primitives.<p>.tags.files_outside_ui             files holding an outside component tag (file)
 *   primitives.<p>.tags.files_total                  files holding a component tag, inside or outside ui (file)
 *   primitives.<p>.definitions.total                 `(function|const) Name` definitions (match)
 *   primitives.<p>.resolved.to_ui_definition         outside tags that render the components/ui definition (match)
 *   primitives.<p>.resolved.to_local_definition      outside tags that render a copy defined in their own file (match)
 *   primitives.<p>.canonical_users.files             files outside ui with a tag rendering the ui definition (file)
 *   primitives.<p>.canonical_users.no_importer_files …of which no other file imports (file)
 *   primitives.<button|input>.reuse_ratio.outside_ui canonical ÷ (canonical + local copy + raw element) (ratio)
 *   primitives.badge.reuse_ratio.outside_ui          canonical ÷ (canonical + local copy) (ratio)
 *   primitives.definitions.identical_groups          (name, body) groups defined byte-identically in >= 2 files (distinct)
 */

const path = require("path");
const { counter, byString, round4 } = require("./counter");
const { buildGraph, hasImporter } = require("./graph");
const { bodyReader, tagEnd } = require("./tags");
const { bump, sum } = require("./util");

const GROUP = "primitives";

const MARKUP_EXTS = new Set([".tsx", ".jsx", ".js", ".vue", ".svelte"]);
const DEF_EXTS = new Set([".tsx", ".jsx", ".js"]);
const UI_RE = /(?:^|\/)components\/ui\//;
const NAME_END = "(?![\\w$.:-])";
const COMPONENTS = [["Button", "button"], ["Input", "input"], ["Badge", "badge"], ["Card", "card"]];
const RAW = ["button", "input"];
const DEF_RE = /^([ \t]*)(?:export[ \t]+(?:default[ \t]+)?)?((?:async[ \t]+)?(?:function\*?|const))[ \t]+([A-Z][A-Za-z0-9]*)\b/gm;
const DEFAULT_EXPORT_RE = /^[ \t]*export[ \t]+default\b/m;
// right-hand side of `const Name` that makes it a component rather than a polymorphic tag variable
// (`const Comp = asChild ? Slot : "a"`): an arrow/function expression, forwardRef/memo/lazy
const FUNCTION_VALUE_RE = /\s*(?::[^=\n]*)?=\s*(?:async\s+)?(?:\(|function\b|(?:React\.)?(?:forwardRef|memo|lazy)\b|[A-Za-z_$][\w$]*\s*=>)/y;
const CLASS_LITERAL_RE = /\b(?:className|class)\s*=\s*(?:"([^"]*)"|'([^']*)')/;

const tagRe = (name) => new RegExp(`<${name}${NAME_END}`, "g");
const FILES = "audited tsx/jsx/js/vue/svelte files (tests, .d.ts files and the token source are not audited)";
const DEF_FILES = "audited tsx/jsx/js files (tests, .d.ts files and the token source are not audited)";
const TEXT_TALLY_NOTE = "a regex tally of opening-tag text: it also counts tags in comments, strings, docs code samples and generic arguments such as Array<Button>";

/** The file that defines `name`, following re-exports from `rel`; null when none is found. */
function findDefinition(g, defs, rel, name, seen = new Set(), depth = 0) {
  const key = `${rel}\0${name}`;
  if (depth > 8 || seen.has(key)) return null;
  seen.add(key);
  const own = defs.names.get(rel);
  if (name === "default" ? defs.defaultExport.has(rel) : own && own.has(name)) return rel;
  const info = g.files.get(rel);
  if (!info) return null;
  for (const r of info.refs) {
    if (r.kind !== "export_from" || !r.target) continue;
    for (const nm of r.names) {
      if (nm.exported !== name) continue;
      const hit = findDefinition(g, defs, r.target, nm.local, seen, depth + 1);
      if (hit) return hit;
    }
  }
  for (const le of info.localExports) {
    if (le.exported !== name) continue;
    if (own && own.has(le.local)) return rel;
    const imp = info.refs.find((r) => r.kind === "import" && r.target && r.bindings.some((b) => b.local === le.local));
    if (!imp) continue;
    const hit = findDefinition(g, defs, imp.target, imp.bindings.find((b) => b.local === le.local).imported, seen, depth + 1);
    if (hit) return hit;
  }
  for (const r of info.refs) {
    if (r.kind !== "export_star" || !r.target || r.ns) continue;
    const hit = findDefinition(g, defs, r.target, name, seen, depth + 1);
    if (hit) return hit;
  }
  return null;
}

/** Which definition does `<name` render in `file`? → "ui" | "local" | "other" | "package" | "unresolved" */
function classifyTag(g, defs, file, name) {
  if (defs.names.get(file)?.has(name)) return "local";
  const info = g.files.get(file);
  const imp = info && info.refs.find((r) => r.kind === "import" && r.bindings.some((b) => b.local === name));
  if (!imp) return "unresolved";
  if (imp.res === "package") return "package";
  if (imp.res !== "file") return "unresolved";
  const imported = imp.bindings.find((b) => b.local === name).imported;
  const def = findDefinition(g, defs, imp.target, imported) ?? imp.target;
  return UI_RE.test(def) ? "ui" : "other";
}

/* ---------------------------------------------------------------- counters */

const merged = (a, b) => {
  const out = new Map(a);
  for (const [k, n] of b) bump(out, k, n);
  return out;
};

function mk(id, unit, value, definition, extra = {}) {
  return counter({ id, group: GROUP, kind: "mechanical", unit, value, definition, ...extra });
}

function ratio(id, numerator, denominator, definition, notes) {
  return counter({
    id,
    group: GROUP,
    kind: "mechanical",
    unit: "ratio",
    value: denominator ? round4(numerator / denominator) : null,
    definition,
    detail: { numerator, denominator },
    notes: denominator ? notes : [...(notes ?? []), "denominator is 0, so there is no ratio (value null)"],
  });
}

function run(ctx) {
  const g = buildGraph(ctx);
  const markup = ctx.audited.filter((f) => MARKUP_EXTS.has(path.posix.extname(f.rel)));

  const raw = {};
  for (const r of RAW) {
    raw[r] = { inside: 0, filesInside: 0, insideFiles: new Map(), outside: new Map(), focus: new Map(), pill: new Map(), variants: new Map(), literals: new Map(), literalTags: 0 };
  }
  const tags = {};
  for (const [name] of COMPONENTS) tags[name] = { inside: 0, filesInside: 0, insideFiles: new Map(), outside: new Map() };
  const defs = { names: new Map(), defaultExport: new Set() };
  const defsByName = new Map();

  for (const f of markup) {
    const text = ctx.read(f.rel);
    if (!text) continue;
    const inUi = UI_RE.test(f.rel);

    for (const r of RAW) {
      const acc = raw[r];
      const starts = [];
      for (const m of text.matchAll(tagRe(r))) starts.push(m.index);
      if (inUi) {
        acc.inside += starts.length;
        if (starts.length) { acc.filesInside++; bump(acc.insideFiles, f.rel, starts.length); }
        continue;
      }
      for (let s = 0; s < starts.length; s++) {
        bump(acc.outside, f.rel);
        const tag = text.slice(starts[s], tagEnd(text, starts[s] + 1 + r.length, starts[s + 1]) + 1);
        if (tag.includes("focus-visible")) bump(acc.focus, f.rel);
        if (r === "button") {
          if (tag.includes("rounded-full")) bump(acc.pill, f.rel);
          if (tag.includes("buttonVariants")) bump(acc.variants, f.rel);
          const lit = CLASS_LITERAL_RE.exec(tag);
          if (lit) {
            const cls = lit[1] ?? lit[2];
            acc.literalTags++;
            if (!acc.literals.has(cls)) acc.literals.set(cls, []);
            acc.literals.get(cls).push(f.rel);
          }
        }
      }
    }

    for (const [name] of COMPONENTS) {
      let n = 0;
      for (const _ of text.matchAll(tagRe(name))) n++; // eslint-disable-line no-unused-vars
      if (!n) continue;
      if (inUi) { tags[name].inside += n; tags[name].filesInside++; bump(tags[name].insideFiles, f.rel, n); }
      else bump(tags[name].outside, f.rel, n);
    }

    if (DEF_EXTS.has(path.posix.extname(f.rel))) {
      if (DEFAULT_EXPORT_RE.test(text)) defs.defaultExport.add(f.rel);
      for (const m of text.matchAll(DEF_RE)) {
        const name = m[3];
        if (!/[a-z]/.test(name)) continue;
        const kw = m.index + m[0].indexOf(m[2], m[1].length);
        FUNCTION_VALUE_RE.lastIndex = m.index + m[0].length;
        const like = m[2].includes("function") || FUNCTION_VALUE_RE.test(text);
        if (!defs.names.has(f.rel)) defs.names.set(f.rel, new Set());
        defs.names.get(f.rel).add(name);
        if (!defsByName.has(name)) defsByName.set(name, []);
        defsByName.get(name).push({ file: f.rel, kw, like });
      }
    }
  }

  const out = [];

  /* raw elements */
  for (const r of RAW) {
    const acc = raw[r];
    const outside = sum(acc.outside);
    const re = tagRe(r);
    const rawDef = (summary) => ({ summary, regex: re, fileSet: FILES });
    out.push(
      mk(`primitives.${r}.raw.total`, "match", acc.inside + outside,
        rawDef(`Raw <${r}> opening tags anywhere, inside and outside components/ui/`),
        { perFile: merged(acc.insideFiles, acc.outside), notes: [TEXT_TALLY_NOTE] }),
      mk(`primitives.${r}.raw.files_total`, "file", acc.filesInside + acc.outside.size,
        rawDef(`Files, inside or outside components/ui/, that hold at least one raw <${r}> tag (perFile count = tags in the file)`),
        { perFile: merged(acc.insideFiles, acc.outside) }),
      mk(`primitives.${r}.raw.inside_ui`, "match", acc.inside,
        rawDef(`Raw <${r}> tags in files under components/ui/ (where the primitive itself is built)`),
        { perFile: acc.insideFiles }),
      mk(`primitives.${r}.raw.outside_ui`, "match", outside,
        rawDef(`Raw <${r}> tags in files outside components/ui/`),
        { perFile: acc.outside, detail: { files: acc.outside.size }, notes: [TEXT_TALLY_NOTE] }),
      mk(`primitives.${r}.raw.files_outside_ui`, "file", acc.outside.size,
        rawDef(`Files outside components/ui/ that hold at least one raw <${r}> tag (perFile count = tags in the file)`),
        { perFile: acc.outside }),
      mk(`primitives.${r}.raw.outside_ui.with_focus_visible`, "match", sum(acc.focus),
        rawDef(`Raw <${r}> tags outside components/ui/ whose opening tag text contains "focus-visible"`),
        {
          perFile: acc.focus,
          detail: { files: acc.focus.size, of: outside },
          notes: ["tag text only: classes that come from a variable, cn() helper or buttonVariants() are not followed, so 0 means \"not written in the tag\", not \"no focus ring\""],
        }),
    );
    if (r !== "button") continue;

    const groups = [...acc.literals.entries()].filter(([, files]) => files.length >= 2);
    const shared = new Map();
    let largest = 0;
    for (const [, files] of groups) {
      largest = Math.max(largest, files.length);
      for (const file of files) bump(shared, file);
    }
    out.push(
      mk("primitives.button.raw.outside_ui.rounded_full", "match", sum(acc.pill),
        rawDef("Raw <button> tags outside components/ui/ whose opening tag text contains the class \"rounded-full\" (a pill shape, as a class match only)"),
        { perFile: acc.pill }),
      mk("primitives.button.raw.outside_ui.with_button_variants", "match", sum(acc.variants),
        rawDef("Raw <button> tags outside components/ui/ whose opening tag text mentions buttonVariants (the shared button styles applied to a raw element)"),
        { perFile: acc.variants }),
      mk("primitives.button.raw.outside_ui.shared_class_literal", "match", sum(shared),
        {
          summary: "Raw <button> tags outside components/ui/ whose literal className=\"…\" / class=\"…\" string is byte-identical to the string on at least one other raw button (same file or another)",
          regex: CLASS_LITERAL_RE,
          fileSet: FILES,
        },
        {
          perFile: shared,
          detail: { groups: groups.length, largestGroup: largest, tagsWithLiteral: acc.literalTags, of: outside },
          notes: ["only a literal class string is compared; classes built with template literals or helpers are not"],
        }),
    );
  }

  /* component tags, definitions, resolution */
  for (const [name, lower] of COMPONENTS) {
    const t = tags[name];
    const tagTotalOutside = sum(t.outside);
    const re = tagRe(name);
    const tagDef = (summary) => ({ summary, regex: re, fileSet: FILES });
    const defList = defsByName.get(name) ?? [];
    const defInside = defList.filter((d) => UI_RE.test(d.file)).length;
    const defPerFile = new Map();
    for (const d of defList) bump(defPerFile, d.file);

    const resolved = { ui: new Map(), local: new Map(), other: new Map(), package: new Map(), unresolved: new Map() };
    for (const [file, n] of t.outside) bump(resolved[classifyTag(g, defs, file, name)], file, n);
    const breakdown = {
      to_ui_definition: sum(resolved.ui),
      to_local_definition: sum(resolved.local),
      to_other_file: sum(resolved.other),
      to_package: sum(resolved.package),
      unresolved: sum(resolved.unresolved),
    };
    const canonicalUsers = [...resolved.ui.keys()].sort(byString);
    const canonicalNoImporter = canonicalUsers.filter((file) => !hasImporter(g, file));
    const resolveDef = (summary) => ({
      summary,
      regex: re,
      fileSet: `${FILES}, outside components/ui/; the import is resolved with the reachability resolver`,
    });
    const resolveNotes = [
      "a tag is matched to its definition through the file's own definition or its import of the same local name; namespace imports (<UI.Badge>) and globals are \"unresolved\"",
    ];

    out.push(
      mk(`primitives.${lower}.tags.total`, "match", t.inside + tagTotalOutside,
        tagDef(`<${name}> opening tags anywhere, inside and outside components/ui/`),
        { perFile: merged(t.insideFiles, t.outside), notes: [TEXT_TALLY_NOTE] }),
      mk(`primitives.${lower}.tags.files_total`, "file", t.filesInside + t.outside.size,
        tagDef(`Files, inside or outside components/ui/, that hold at least one <${name}> tag (perFile count = tags in the file)`),
        { perFile: merged(t.insideFiles, t.outside) }),
      mk(`primitives.${lower}.tags.inside_ui`, "match", t.inside,
        tagDef(`<${name}> tags in files under components/ui/`),
        { perFile: t.insideFiles }),
      mk(`primitives.${lower}.tags.outside_ui`, "match", tagTotalOutside,
        tagDef(`<${name}> tags in files outside components/ui/`),
        { perFile: t.outside, detail: { files: t.outside.size }, notes: [TEXT_TALLY_NOTE] }),
      mk(`primitives.${lower}.tags.files_outside_ui`, "file", t.outside.size,
        tagDef(`Files outside components/ui/ that hold at least one <${name}> tag (perFile count = tags in the file)`),
        { perFile: t.outside }),
      mk(`primitives.${lower}.definitions.total`, "match", defList.length,
        {
          summary: `Definitions of a component named ${name}: a statement-start (function|const) ${name}`,
          regex: DEF_RE,
          fileSet: DEF_FILES,
        },
        {
          perFile: defPerFile,
          detail: { inside_ui: defInside, outside_ui: defList.length - defInside },
          notes: ["definitions are counted anywhere in the file at a statement start, including nested helper components and text inside comments or template-literal code samples (a regex tally of text)"],
        }),
      mk(`primitives.${lower}.resolved.to_ui_definition`, "match", breakdown.to_ui_definition,
        resolveDef(`<${name}> tags outside components/ui/ that render the ${name} defined under components/ui/`),
        { perFile: resolved.ui, detail: breakdown, notes: resolveNotes }),
      mk(`primitives.${lower}.resolved.to_local_definition`, "match", breakdown.to_local_definition,
        resolveDef(`<${name}> tags outside components/ui/ that render a ${name} defined in their own file (a local copy)`),
        { perFile: resolved.local, detail: breakdown, notes: resolveNotes }),
      mk(`primitives.${lower}.canonical_users.files`, "file", canonicalUsers.length,
        resolveDef(`Files outside components/ui/ with at least one <${name}> that renders the components/ui definition`),
        { perFile: new Map(canonicalUsers.map((f) => [f, resolved.ui.get(f)])) }),
      mk(`primitives.${lower}.canonical_users.no_importer_files`, "file", canonicalNoImporter.length,
        {
          summary: `Canonical ${name} users (files above) that no other census file imports and that are not entry points: live-code reuse of the primitive is the share of canonical users that have an importer`,
          regex: null,
          fileSet: `${FILES}, outside components/ui/; importers from the reachability import graph (tests count as importers)`,
        },
        {
          perFile: new Map(canonicalNoImporter.map((f) => [f, resolved.ui.get(f)])),
          detail: { of: canonicalUsers.length },
          notes: ["see reachability.* for what static analysis cannot see; a file loaded by a string-built path or a framework convention is reported here as unimported"],
        }),
    );

    if (lower === "button" || lower === "input") {
      const rawOutside = sum(raw[lower].outside);
      out.push(ratio(`primitives.${lower}.reuse_ratio.outside_ui`, breakdown.to_ui_definition, breakdown.to_ui_definition + breakdown.to_local_definition + rawOutside,
        {
          summary: `<${name}> tags that render the components/ui ${name} ÷ (those + <${name}> tags that render a ${name} defined in their own file + raw <${lower}> tags), all outside components/ui/ — canonical reuse against its equivalents written by hand`,
          regexes: [{ label: `a <${name} tag`, regex: tagRe(name) }, { label: `a raw <${lower} tag`, regex: tagRe(lower) }],
          fileSet: `${FILES}, outside components/ui/; the import is resolved with the reachability resolver`,
        },
        [`a <${name}> from a package (MUI, Radix, …), from another project file or that cannot be resolved is in neither the numerator nor the denominator: it is not known to be the canonical ${name}, and it is not written by hand`]));
    } else if (lower === "badge") {
      out.push(ratio("primitives.badge.reuse_ratio.outside_ui", breakdown.to_ui_definition, breakdown.to_ui_definition + breakdown.to_local_definition,
        {
          summary: "<Badge> tags that render the components/ui Badge ÷ (those + <Badge> tags that render a Badge defined in their own file), outside components/ui/ — the raw equivalent of a Badge is a local copy",
          regex: tagRe("Badge"),
          fileSet: `${FILES}, outside components/ui/`,
        },
        ["tags that render neither (package, other file, unresolved) are in neither the numerator nor the denominator"]));
    }
  }

  /* identical component definitions: every PascalCase name defined in >= 2 files */
  const wanted = new Map();
  for (const [name, list] of defsByName) {
    const candidates = list.filter((d) => d.like);
    if (new Set(candidates.map((d) => d.file)).size < 2) continue;
    for (const d of candidates) {
      if (!wanted.has(d.file)) wanted.set(d.file, []);
      wanted.get(d.file).push({ name, kw: d.kw });
    }
  }
  const bodies = new Map(); // name → body → files
  const uncompared = { not_code: 0, extent: 0, budget: 0 };
  for (const file of [...wanted.keys()].sort(byString)) {
    const bodyAt = bodyReader(ctx.read(file));
    for (const { name, kw } of wanted.get(file)) {
      const r = bodyAt(kw);
      if (r.skip) { uncompared[r.skip]++; continue; }
      if (!bodies.has(name)) bodies.set(name, new Map());
      const byBody = bodies.get(name);
      if (!byBody.has(r.body)) byBody.set(r.body, new Set());
      byBody.get(r.body).add(file);
    }
  }
  const groups = [];
  const inGroups = new Map();
  for (const [name, byBody] of [...bodies.entries()].sort((a, b) => byString(a[0], b[0]))) {
    for (const [body, files] of byBody) {
      if (files.size < 2) continue;
      const sorted = [...files].sort(byString);
      groups.push({ name, files: sorted, lines: body.split("\n").length });
      for (const f of sorted) bump(inGroups, f);
    }
  }
  groups.sort((a, b) => b.files.length - a.files.length || byString(a.name, b.name) || byString(a.files[0], b.files[0]));
  out.push(mk("primitives.definitions.identical_groups", "distinct", groups.length,
    {
      summary: "Distinct (name, body) pairs of a PascalCase component definition — `function Name`, or `const Name =` an arrow/function expression, forwardRef, memo or lazy — whose body is byte-identical in two or more different files: copy-pasted components. The body is the declaration from its keyword to the end of its closing brace or statement, found on the token stream (strings, template literals, comments, regexes and JSX text cannot end it early)",
      regex: DEF_RE,
      fileSet: DEF_FILES,
    },
    {
      perFile: inGroups,
      detail: {
        files: inGroups.size,
        groups: groups.slice(0, 20).map((x) => ({ name: x.name, lines: x.lines, filesTotal: x.files.length, files: x.files.slice(0, 5) })),
        uncompared,
      },
      notes: [
        "perFile count = identical groups the file takes part in; detail.groups lists the 20 largest, with bodyless one-liners included — read `lines` before drawing a conclusion",
        "a framework convention can make identical bodies legitimate (for example a route component named Page in many files)",
        "bodies are compared as text, comments and whitespace included; a definition whose keyword is not code (inside a comment, a string or JSX text), whose end cannot be found, or that is beyond the file's slicing budget (16 times its size) is left out and counted in detail.uncompared",
      ],
    }));
  return out;
}

module.exports = { group: GROUP, run };
