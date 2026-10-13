/**
 * scale.test.js — acceptance tests for the `scale` counter group. Every
 * expectation is hand-computed from a tiny temp repo (never from the live
 * repo): radius var vs hardcoded vs named (class and inline), a zero radius,
 * shadow utilities and their lookalikes, arbitrary spacing, icon-library and
 * competing-UI-library imports, ui/ in and out, a declared exemption, CRLF.
 */

"use strict";

const { makeRepo, removeRepo, run, get, val } = require("./helpers");

const roots = [];
const repo = (files) => { const r = makeRepo(files); roots.push(r); return r; };
afterAll(() => roots.forEach(removeRepo));

const scale = (root, dirs = ["src"]) => run(root, { dirs, groups: ["scale"] });
const perFile = (report, id) => get(report, id).perFile;

// CRLF on purpose: line numbers in `sites` must still be the editor's line numbers.
const RADIUS_SRC = [
  'export const a = "rounded-md rounded-t-lg rounded-full rounded rounded-none rounded-[var(--radius-screen)] rounded-[14px] rounded-(--radius-card)";',
  'export const s = { borderRadius: 4, borderRadius: "8px", borderRadius: "var(--r)", borderRadius: shape.radius, borderRadius: 0 };',
  "export const t = `border-radius: 5px; border-top-left-radius: var(--tl); border-radius: 0; border-radius: 50%`;",
  'export const u = "rounded-[inherit] rounded-[0.5rem] rounded-[0] hover:rounded-xl";',
  "",
].join("\r\n");

describe("scale: radius", () => {
  let report;
  beforeAll(() => {
    report = scale(repo({
      "src/r.tsx": RADIUS_SRC,
      "src/r.test.tsx": 'export const x = "rounded-[3px]";\n',
      "src/styles.css": ".a { border-radius: 7px; } .b { border-radius: var(--r); }\n",
    }));
  });

  test("var uses: classes and inline declarations, each its own occurrence", () => {
    // class: rounded-[var(--radius-screen)], rounded-(--radius-card) · inline: "var(--r)", border-top-left-radius: var(--tl)
    expect(val(report, "scale.radius.var_uses")).toBe(4);
    const d = get(report, "scale.radius.var_uses").detail;
    expect(d.class).toBe(2);
    expect(d.inline).toBe(2);
    expect(d.byProperty).toEqual({ "--r": 1, "--radius-card": 1, "--radius-screen": 1, "--tl": 1 });
  });

  test("hardcoded uses: class + inline, px and rem, a zero radius and an expression are not hardcoded", () => {
    // class: 14px, 0.5rem · inline: borderRadius 4 (React px), "8px", border-radius: 5px
    expect(val(report, "scale.radius.hardcoded_uses")).toBe(5);
    expect(val(report, "scale.radius.hardcoded_files")).toBe(1);
    const d = get(report, "scale.radius.hardcoded_uses").detail;
    expect(d.class).toBe(2);
    expect(d.inline).toBe(3);
    expect(d.byValue).toEqual({ "0.5rem": 1, "14px": 1, "4px": 1, "5px": 1, "8px": 1 });
    expect(d.sites).toEqual([
      { file: "src/r.tsx", line: 1, form: "class", value: "14px" },
      { file: "src/r.tsx", line: 2, form: "inline", value: "4px" },
      { file: "src/r.tsx", line: 2, form: "inline", value: "8px" },
      { file: "src/r.tsx", line: 3, form: "inline", value: "5px" },
      { file: "src/r.tsx", line: 4, form: "class", value: "0.5rem" },
    ]);
  });

  test("stylesheet radii are reported apart (detail.inAuditedCss) and never folded into the value", () => {
    expect(get(report, "scale.radius.hardcoded_uses").detail.inAuditedCss).toBe(1);
    expect(get(report, "scale.radius.var_uses").detail.inAuditedCss).toBe(1);
  });

  test("named classes count the scale; arbitrary brackets that are neither var nor length are their own counter", () => {
    // rounded-md rounded-t-lg rounded-full rounded rounded-none (line 1) · hover:rounded-xl (line 4)
    expect(val(report, "scale.radius.named_classes")).toBe(6);
    expect(get(report, "scale.radius.named_classes").detail.byClass).toEqual({
      rounded: 1, "rounded-full": 1, "rounded-md": 1, "rounded-none": 1, "rounded-t-lg": 1, "rounded-xl": 1,
    });
    // rounded-[inherit], rounded-[0]
    expect(val(report, "scale.radius.arbitrary_other")).toBe(2);
  });

  test("the share is (named + var) / (named + var + hardcoded) with its numerator and denominator on record", () => {
    const share = get(report, "scale.radius.named_or_var_share");
    expect(share.value).toBe(0.6667); // 10 / 15
    expect(share.detail).toMatchObject({ numerator: 10, denominator: 15, named: 6, var: 4, hardcoded: 5 });
  });

  test("tests are not audited", () => {
    expect(perFile(report, "scale.radius.hardcoded_uses")).toEqual([{ file: "src/r.tsx", count: 5 }]);
  });

  test("no radius at all: the share is null (0 of 0 is no ratio) with a note, not NaN", () => {
    const empty = scale(repo({ "src/a.tsx": "export const a = 1;\n" }));
    expect(val(empty, "scale.radius.named_or_var_share")).toBeNull();
    expect(get(empty, "scale.radius.named_or_var_share").notes.join(" ")).toMatch(/no radius utilities/);
  });
});

describe("scale: shadows", () => {
  let report;
  beforeAll(() => {
    report = scale(repo({
      "src/components/ui/card.tsx": 'export const c = "shadow-sm shadow-md hover:shadow-lg";\n',
      "src/s.tsx": [
        'export const a = "shadow-xs shadow-xl shadow-none shadow-2xl shadow-inner";',
        'export const b = "shadow-[var(--shadow-panel)] shadow-[0_0_8px_var(--x)] shadow-(--glow)";',
        'export const c = "inset-shadow-sm drop-shadow-lg text-shadow-md"; // a drop shadow, --shadow-sm: 1px;',
        "",
      ].join("\n"),
    }));
  });

  test("named utilities, with the ui/ split in detail; inset-/drop-/text-shadow and --shadow-* tokens are other things", () => {
    expect(val(report, "scale.shadow_utility.matches")).toBe(5); // sm md lg (ui) + xs xl
    expect(val(report, "scale.shadow_utility.files")).toBe(2);
    const d = get(report, "scale.shadow_utility.matches").detail;
    expect(d.bySize).toEqual({ lg: 1, md: 1, sm: 1, xl: 1, xs: 1 });
    expect(d.ui).toMatchObject({ inUi: 3, outsideUi: 2 });
  });

  test("shadow-none / 2xl / inner are counted apart; the bare word shadow is not a utility", () => {
    expect(val(report, "scale.shadow_utility.other_named_matches")).toBe(3);
    expect(get(report, "scale.shadow_utility.other_named_matches").detail.byClass).toEqual({
      "shadow-2xl": 1, "shadow-inner": 1, "shadow-none": 1,
    });
  });

  test("arbitrary shadows: a lone var() is a token use, anything else is composite", () => {
    expect(val(report, "scale.shadow_arbitrary.matches")).toBe(3);
    expect(get(report, "scale.shadow_arbitrary.matches").detail).toMatchObject({ varOnly: 2, composite: 1 });
  });
});

describe("scale: arbitrary spacing", () => {
  test("padding, margin, gap and space-x/y with a bracket value; sizing, offsets and lookalikes are out", () => {
    const report = scale(repo({
      "src/sp.tsx": 'export const a = "p-[3px] -mt-[10px] gap-[var(--g)] px-[calc(1rem+2px)] space-y-[0.5rem] m-[2em] w-[100px] top-[3px] hover:pl-[11rem] p-4 foo-p-[3px]";\n',
      "src/sp.test.tsx": 'export const a = "p-[99px]";\n',
    }));
    // p-[3px] -mt-[10px] gap-[var(--g)] px-[calc(1rem+2px)] space-y-[0.5rem] m-[2em] pl-[11rem]
    expect(val(report, "scale.spacing_arbitrary.matches")).toBe(7);
    // length literals: p, -mt, space-y, m (em), pl (rem)
    expect(val(report, "scale.spacing_arbitrary.length_literal_matches")).toBe(5);
    expect(val(report, "scale.spacing_arbitrary.files")).toBe(1);
    const d = get(report, "scale.spacing_arbitrary.matches").detail;
    expect(d.byKind).toEqual({ length: 5, other: 1, var: 1 });
    expect(d.byUtility).toEqual({ gap: 1, m: 1, mt: 1, p: 1, pl: 1, px: 1, "space-y": 1 });
  });
});

describe("scale: icon libraries", () => {
  const files = {
    "package.json": JSON.stringify({
      dependencies: { "lucide-react": "1", react: "18", "@mui/material": "5" },
      devDependencies: { "@radix-ui/react-icons": "1", antd: "5" },
    }),
    "src/i1.tsx": 'import { A } from "lucide-react";\nimport { B } from "@radix-ui/react-icons";\n',
    "src/i2.tsx": 'import X from "lucide-react/dynamic";\nconst y = require("react-icons/fa");\nconst z = await import("@phosphor-icons/react");\n',
    "src/i3.tsx": 'import "./local";\nimport a from "@/lib/x";\nimport c from "react";\nimport d from "node:fs";\n',
    "src/i4.ts": 'export * from "@icons-pack/react-simple-icons";\n',
    "src/i5.test.tsx": 'import { T } from "lucide-react";\n',
  };

  test("one file counter per named library; an import in two libraries counts once in any_files", () => {
    const report = scale(repo(files));
    expect(val(report, "scale.icon_library.lucide_files")).toBe(2); // i1, i2 (a deep path still counts)
    expect(val(report, "scale.icon_library.radix_icons_files")).toBe(1);
    expect(val(report, "scale.icon_library.simple_icons_files")).toBe(1);
    expect(val(report, "scale.icon_library.other_files")).toBe(1); // i2: react-icons + phosphor, one file
    expect(val(report, "scale.icon_library.any_files")).toBe(3); // i1, i2, i4; the test file is not audited
    expect(val(report, "scale.icon_library.distinct_libraries")).toBe(5);
    expect(get(report, "scale.icon_library.any_files").detail.byLibrary).toEqual({
      lucide: 2, phosphor: 1, radix_icons: 1, react_icons: 1, simple_icons: 1,
    });
  });

  test("declared libraries come from package.json, imported or not", () => {
    const report = scale(repo(files));
    expect(val(report, "scale.icon_library.declared_libraries")).toBe(2);
    expect(get(report, "scale.icon_library.declared_libraries").detail.libraries).toEqual(["lucide", "radix_icons"]);
    expect(get(report, "scale.icon_library.declared_libraries").detail.manifests).toEqual(["package.json"]);
  });

  test("no package.json: nothing declared, with a note", () => {
    const report = scale(repo({ "src/a.tsx": 'import { A } from "lucide-react";\n' }));
    expect(val(report, "scale.icon_library.declared_libraries")).toBe(0);
    expect(val(report, "scale.icon_library.lucide_files")).toBe(1);
    expect(get(report, "scale.icon_library.declared_libraries").notes.join(" ")).toMatch(/no readable package\.json/);
  });
});

describe("scale: competing UI libraries", () => {
  test("declared in package.json and imported, per library", () => {
    const report = scale(repo({
      "package.json": JSON.stringify({ dependencies: { "@mui/material": "5" }, devDependencies: { antd: "5" } }),
      "src/ui1.tsx": 'import Button from "@mui/material/Button";\nimport { Button as B } from "antd";\n',
      "src/ui2.tsx": 'import { MantineProvider } from "@mantine/core";\n',
    }));
    expect(val(report, "scale.competing_ui_library.declared")).toBe(2); // MUI, Ant Design
    expect(val(report, "scale.competing_ui_library.imported_files")).toBe(2);
    expect(val(report, "scale.competing_ui_library.present")).toBe(true);
    const rows = get(report, "scale.competing_ui_library.declared").detail.libraries;
    expect(rows).toEqual([
      { library: "MUI", declared: ["@mui/material"], importFiles: 1 },
      { library: "Chakra UI", declared: [], importFiles: 0 },
      { library: "Ant Design", declared: ["antd"], importFiles: 1 },
      { library: "Mantine", declared: [], importFiles: 1 },
    ]);
  });

  test("declared but never imported still counts as present", () => {
    const report = scale(repo({ "package.json": JSON.stringify({ dependencies: { "@chakra-ui/react": "2" } }), "src/a.tsx": "export const a = 1;\n" }));
    expect(val(report, "scale.competing_ui_library.declared")).toBe(1);
    expect(val(report, "scale.competing_ui_library.imported_files")).toBe(0);
    expect(val(report, "scale.competing_ui_library.present")).toBe(true);
  });

  test("none declared, none imported: false, not an error", () => {
    const report = scale(repo({
      "package.json": JSON.stringify({ dependencies: { react: "18", "@radix-ui/react-dialog": "1" } }),
      "src/a.tsx": 'import * as D from "@radix-ui/react-dialog";\n',
    }));
    expect(val(report, "scale.competing_ui_library.present")).toBe(false);
    expect(val(report, "scale.competing_ui_library.declared")).toBe(0);
  });

  test("a malformed package.json is skipped, not fatal", () => {
    const report = scale(repo({ "package.json": "{ not json", "src/a.tsx": "export const a = 1;\n" }));
    expect(val(report, "scale.competing_ui_library.present")).toBe(false);
    expect(get(report, "scale.competing_ui_library.declared").notes.join(" ")).toMatch(/no readable package\.json/);
  });

  test("a package.json inside an audited dir is read too (monorepo layout)", () => {
    const report = scale(repo({
      "package.json": JSON.stringify({ name: "root" }),
      "packages/web/package.json": JSON.stringify({ dependencies: { "@mantine/core": "7" } }),
      "packages/web/src/a.tsx": "export const a = 1;\n",
    }), ["packages"]);
    expect(val(report, "scale.competing_ui_library.declared")).toBe(1);
    expect(get(report, "scale.competing_ui_library.declared").detail.manifests).toEqual(["package.json", "packages/web/package.json"]);
  });
});

describe("scale: the exemptions the repo declares", () => {
  test("every split counter carries the exempt split when the guardrails declare an exemption, and omits it otherwise", () => {
    const files = {
      "src/Mockups.tsx": 'export const m = "rounded-[var(--radius-screen)] shadow-sm p-[3px]";\n',
      "src/a.tsx": 'export const a = "rounded-[var(--radius-screen)] rounded-[4px] shadow-sm shadow-md";\n',
    };
    const declared = scale(repo({
      ...files,
      "design/guardrails.mdx": "- No raw hex. Exceptions: product mockups (`src/Mockups.tsx`).\n",
    }));
    expect(get(declared, "scale.radius.var_uses").detail.exempt).toEqual({ files: ["src/Mockups.tsx"], inExemptFiles: 1, excludingExemptFiles: 1 });
    expect(get(declared, "scale.shadow_utility.matches").detail.exempt).toEqual({ files: ["src/Mockups.tsx"], inExemptFiles: 1, excludingExemptFiles: 2 });
    expect(get(declared, "scale.spacing_arbitrary.matches").detail.exempt).toEqual({ files: ["src/Mockups.tsx"], inExemptFiles: 1, excludingExemptFiles: 0 });

    const none = scale(repo(files));
    expect(get(none, "scale.radius.var_uses").detail.exempt).toBeUndefined();
    expect(val(none, "scale.radius.var_uses")).toBe(2);
  });
});

describe("scale: robustness", () => {
  test("an empty repo yields zeros, false and a null ratio, never an error", () => {
    const report = scale(repo({}));
    for (const c of report.counters) {
      if (c.unit === "boolean") expect(c.value).toBe(false);
      else if (c.unit === "ratio") expect(c.value).toBeNull(); // 0 of 0 is no ratio
      else expect(c.value).toBe(0);
    }
  });

  test("a one-line minified file and non-UTF-8 bytes are survivable", () => {
    const min = Array.from({ length: 400 }, () => "rounded-[3px] shadow-sm p-[2px]").join(" ");
    const report = scale(repo({
      "src/min.js": `var a="${min}";`,
      "src/bad.tsx": Buffer.concat([Buffer.from('"rounded-[var(--x)] '), Buffer.from([0xff, 0xfe]), Buffer.from('"\n')]),
    }));
    expect(val(report, "scale.radius.hardcoded_uses")).toBe(400);
    expect(val(report, "scale.shadow_utility.matches")).toBe(400);
    expect(val(report, "scale.radius.var_uses")).toBe(1);
  });

  test("a pathological whitespace run after `import` stays linear (no regex backtracking blow-up)", () => {
    const started = Date.now();
    const report = scale(repo({
      "src/pad.tsx": "import" + " ".repeat(400000) + "\nexport const a = \"rounded-md\";\n",
      "src/ok.tsx": 'import { A } from "lucide-react";\n',
    }));
    expect(Date.now() - started).toBeLessThan(3000);
    expect(val(report, "scale.icon_library.lucide_files")).toBe(1);
    expect(val(report, "scale.radius.named_classes")).toBe(1);
  });

  test("deterministic output and valid ids", () => {
    const root = repo({ "src/a.tsx": 'export const a = "rounded-md shadow-sm p-[3px]";\n' });
    expect(JSON.stringify(scale(root))).toBe(JSON.stringify(scale(root)));
    const ids = scale(root).counters.map((c) => c.id);
    expect(ids.every((id) => id.startsWith("scale."))).toBe(true);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

// ── review follow-ups: which package.json files are read, linear line numbers, mutation survivors ──

const deps = (d, extra = {}) => JSON.stringify({ dependencies: d, ...extra });

describe("scale: which package.json files are read", () => {
  const ROOT = { "package.json": deps({ react: "18" }), "src/a.tsx": "export const a = 1;\n" };
  const SAMPLES = {
    "src/__fixtures__/legacy-app/package.json": deps({ "@mui/material": "5", "react-icons": "4" }),
    "src/templates/starter/package.json": deps({ antd: "5" }),
  };

  test("fixture and template manifests inside the audited dirs are samples, not the project", () => {
    const report = scale(repo({ ...ROOT, ...SAMPLES }));
    const declared = get(report, "scale.competing_ui_library.declared");
    expect(declared.value).toBe(0);
    expect(val(report, "scale.competing_ui_library.present")).toBe(false);
    expect(val(report, "scale.icon_library.declared_libraries")).toBe(0);
    expect(declared.detail.manifests).toEqual(["package.json"]);
    expect(declared.detail.manifestsSkipped).toEqual([
      { path: "src/__fixtures__/legacy-app/package.json", reason: "fixture, template, example or test directory" },
      { path: "src/templates/starter/package.json", reason: "fixture, template, example or test directory" },
    ]);
    expect(declared.notes.join(" ")).toMatch(/2 package\.json file\(s\) were NOT read/);
  });

  test("a sample directory stays a sample when it holds audited source, whatever its case", () => {
    const report = scale(repo({
      ...ROOT,
      "src/Examples/shop/package.json": deps({ "@chakra-ui/react": "2" }),
      "src/Examples/shop/index.tsx": 'import { Box } from "@chakra-ui/react";\n',
      "src/__tests__/app/package.json": deps({ antd: "5" }),
      "src/__tests__/app/x.ts": "export const x = 1;\n",
    }));
    expect(val(report, "scale.competing_ui_library.declared")).toBe(0);
    expect(get(report, "scale.competing_ui_library.declared").detail.manifestsSkipped.map((m) => m.path)).toEqual([
      "src/Examples/shop/package.json",
      "src/__tests__/app/package.json",
    ]);
    // the import is still a fact about an audited file; only the manifest is not the project's
    expect(val(report, "scale.competing_ui_library.imported_files")).toBe(1);
  });

  test("a workspace manifest is read when an audited file belongs to it, and listed as skipped when none does", () => {
    const report = scale(repo({
      "package.json": JSON.stringify({ name: "root" }),
      "packages/web/package.json": deps({ "@mantine/core": "7" }),
      "packages/web/src/a.tsx": "export const a = 1;\n",
      "packages/empty/package.json": deps({ antd: "5" }),
    }), ["packages"]);
    const declared = get(report, "scale.competing_ui_library.declared");
    expect(declared.value).toBe(1);
    expect(declared.detail.manifests).toEqual(["package.json", "packages/web/package.json"]);
    expect(declared.detail.manifestsSkipped).toEqual([
      { path: "packages/empty/package.json", reason: "no audited file belongs to this package" },
    ]);
  });

  test("auditing a nested folder reads the package.json above it", () => {
    const report = scale(repo({
      "package.json": deps({ react: "18" }),
      "web/package.json": deps({ "@chakra-ui/react": "2" }),
      "web/src/a.tsx": "export const a = 1;\n",
      "other/package.json": deps({ antd: "5" }),
    }), ["web/src"]);
    const declared = get(report, "scale.competing_ui_library.declared");
    expect(declared.value).toBe(1);
    expect(declared.detail.manifests).toEqual(["package.json", "web/package.json"]);
  });

  test("auditing a sample directory directly still reads its own manifest", () => {
    const report = scale(repo({
      "examples/app/package.json": deps({ antd: "5" }),
      "examples/app/src/a.tsx": "export const a = 1;\n",
    }), ["examples/app"]);
    expect(get(report, "scale.competing_ui_library.declared").detail.manifests).toEqual(["examples/app/package.json"]);
    expect(val(report, "scale.competing_ui_library.declared")).toBe(1);
  });

  test("a manifest that is not valid JSON is listed with its reason", () => {
    const report = scale(repo({ "package.json": "{ not json", "src/a.tsx": "export const a = 1;\n" }));
    expect(get(report, "scale.competing_ui_library.declared").detail.manifestsSkipped).toEqual([{ path: "package.json", reason: "not valid JSON" }]);
  });

  test("all four dependency fields are read", () => {
    const report = scale(repo({
      "package.json": JSON.stringify({
        dependencies: { "@mui/material": "5" },
        devDependencies: { "@chakra-ui/react": "2" },
        peerDependencies: { antd: "5" },
        optionalDependencies: { "@mantine/core": "7" },
      }),
      "src/a.tsx": "export const a = 1;\n",
    }));
    expect(val(report, "scale.competing_ui_library.declared")).toBe(4);
  });
});

describe("scale: competing and icon libraries beyond the common spellings", () => {
  test("imported but never declared still counts as present", () => {
    const report = scale(repo({ "src/a.tsx": 'import { Box } from "@chakra-ui/react";\n' }));
    expect(val(report, "scale.competing_ui_library.declared")).toBe(0);
    expect(val(report, "scale.competing_ui_library.imported_files")).toBe(1);
    expect(val(report, "scale.competing_ui_library.present")).toBe(true);
  });

  test("the legacy @material-ui scope is MUI", () => {
    const report = scale(repo({
      "package.json": deps({ "@material-ui/core": "4" }),
      "src/a.tsx": 'import Button from "@material-ui/core/Button";\n',
    }));
    expect(val(report, "scale.competing_ui_library.declared")).toBe(1);
    expect(get(report, "scale.competing_ui_library.declared").detail.libraries[0]).toEqual({ library: "MUI", declared: ["@material-ui/core"], importFiles: 1 });
  });

  test("simple-icons has three package names; lucide has eight siblings and no lookalikes", () => {
    const names = ["simple-icons", "react-simple-icons", "@icons-pack/react-simple-icons"];
    const lucide = ["lucide", "lucide-react", "lucide-react-native", "lucide-vue-next", "lucide-svelte", "lucide-solid", "lucide-preact", "lucide-angular"];
    const files = {};
    names.forEach((n, i) => { files[`src/s${i}.tsx`] = `import { A } from "${n}";\n`; });
    lucide.forEach((n, i) => { files[`src/l${i}.tsx`] = `import { A } from "${n}";\n`; });
    files["src/no1.tsx"] = 'import { A } from "lucide-foo";\n';
    files["src/no2.tsx"] = 'import { A } from "lucide-react-extra";\n';
    const report = scale(repo(files));
    expect(val(report, "scale.icon_library.simple_icons_files")).toBe(3);
    expect(val(report, "scale.icon_library.lucide_files")).toBe(8);
  });
});

describe("scale: file types and class spellings beyond the common ones", () => {
  test("jsx, vue and svelte files are audited code files", () => {
    const report = scale(repo({
      "src/a.jsx": 'export const a = "rounded-[3px] shadow-sm";\n',
      "src/b.vue": '<script>\nimport { X } from "lucide-vue-next";\n</script>\n<div class="rounded-[4px] p-[2px]"></div>\n',
      "src/c.svelte": '<p class="rounded-[5px]"></p>\n',
    }));
    expect(val(report, "scale.radius.hardcoded_uses")).toBe(3);
    expect(val(report, "scale.radius.hardcoded_files")).toBe(3);
    expect(val(report, "scale.shadow_utility.matches")).toBe(1);
    expect(val(report, "scale.spacing_arbitrary.matches")).toBe(1);
    expect(val(report, "scale.icon_library.lucide_files")).toBe(1);
  });

  test("rounded-3xl and rounded-4xl are on the named scale; gap-x and gap-y are spacing", () => {
    const report = scale(repo({ "src/a.tsx": 'export const a = "rounded-3xl rounded-4xl gap-y-[3px] gap-x-[2px] gap-[var(--g)]";\n' }));
    expect(get(report, "scale.radius.named_classes").detail.byClass).toEqual({ "rounded-3xl": 1, "rounded-4xl": 1 });
    expect(get(report, "scale.spacing_arbitrary.matches").detail.byUtility).toEqual({ gap: 1, "gap-x": 1, "gap-y": 1 });
  });

  test("a zero radius, with a unit or inline, is not counted as hardcoded, var or arbitrary", () => {
    const report = scale(repo({
      "src/z.tsx": [
        'export const a = "rounded-[0px] rounded-[0rem] rounded-[0.0px]";',
        'export const b = { borderRadius: "0px", borderRadius: 0, borderRadius: "0rem" };',
        "export const c = `border-radius: 0px; border-radius: 0rem`;",
        "",
      ].join("\n"),
    }));
    expect(val(report, "scale.radius.hardcoded_uses")).toBe(0);
    expect(val(report, "scale.radius.hardcoded_files")).toBe(0);
    expect(val(report, "scale.radius.var_uses")).toBe(0);
    expect(val(report, "scale.radius.arbitrary_other")).toBe(0);
  });
});

describe("scale: line numbers are linear", () => {
  test("a single-line file with 200k hardcoded radii finishes well under 2 s (was 10 s at 2 MB)", () => {
    const root = repo({ "src/min.js": `${"rounded-[3px] ".repeat(200000)}\n` });
    const started = Date.now();
    const report = scale(root);
    expect(Date.now() - started).toBeLessThan(2000);
    expect(val(report, "scale.radius.hardcoded_uses")).toBe(200000);
    const sites = get(report, "scale.radius.hardcoded_uses").detail.sites;
    expect(sites.every((s) => s.line === 1)).toBe(true);
  });
});
