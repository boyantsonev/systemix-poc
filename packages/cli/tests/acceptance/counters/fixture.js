"use strict";

/**
 * fixture.js — one small repo that makes (almost) every counter group report
 * something, for the cross-cutting tests (consistency.test.js) and for the id
 * table in src/lib/counters/README.md. Not a test file. Hand-written, never a
 * copy of any real repo; it is committed to a throwaway git repository with a
 * fixed author and date, so the commit is the same on every machine.
 */

const fs = require("fs");
const { execFileSync } = require("child_process");
const { makeRepo } = require("./helpers");

const COMMIT_DATE = "2026-09-15T12:00:00Z";

const RICH_FILES = {
  "package.json": JSON.stringify({
    name: "rich",
    dependencies: { next: "15.0.0", react: "19.0.0", "lucide-react": "1.0.0", "@radix-ui/react-icons": "1.0.0", "posthog-js": "1.0.0" },
    scripts: { build: "next build" },
  }, null, 2) + "\n",
  "tsconfig.json": '{\n  // comments are normal in tsconfig\n  "compilerOptions": { "paths": { "@/*": ["./src/*"], }, },\n}\n',
  "systemix.config.yaml": [
    "autonomy: ghost",
    "signals:",
    "  posthog:",
    "    enabled: true",
    "design:",
    "  source: src/app/globals.css",
    "",
  ].join("\n"),
  "CLAUDE.md": [
    "# Rich — agent briefing",
    "",
    "## Status (2026-09-01)",
    "- Read `design/guardrails.mdx` before UI work. See `docs/plan.md` and `~/notes/plan.md`.",
    "- Tokens are oklch. Skills: `/design-audit` `/drift-report` `/missing-skill`.",
    "",
  ].join("\n"),
  "design/DESIGN.md": [
    "---",
    "name: Rich",
    "colors:",
    '  primary: "#ccddee"',
    '  surface: "#000000"',
    "---",
    "# Rich design",
    "## Tokens",
    "`src/app/globals.css` is the single source of truth for tokens.",
    "## Type",
    "Role fonts only.",
    "",
  ].join("\n"),
  "design/guardrails.mdx": [
    "---",
    "title: Guardrails",
    "---",
    "## Color",
    "- ★ **No raw hex.** Exceptions: the token source (`globals.css`) and mockups (`Mockup.tsx`).",
    "- Body text `#112233` on `#ffffff` at 16.1:1.",
    "## Type & shape",
    "- Font sizes are tokens.",
    "## Accessibility",
    "- Body text ≥ 4.5:1.",
    "",
  ].join("\n"),
  "decisions/ADR.md": [
    "## ADR-001: Use tokens",
    "Status: Accepted",
    "Date: 2026-04-01",
    "We chose oklch and guardrails.",
    "## ADR-002: Second",
    "Status: Proposed",
    "Date: 2026-05-02",
    "",
  ].join("\n"),
  "contract/tokens/color-primary.mdx": [
    "---",
    "token: --primary",
    'value: "#112233"',
    "status: clean",
    "---",
    "# Primary",
    "## Drift",
    "None recorded",
    "",
  ].join("\n"),
  "contract/tokens/radius.mdx": ["---", "token: --radius", 'value: "0.5rem"', "status: clean", "---", "# Radius", "## Drift", "None recorded", ""].join("\n"),
  "contract/components/button.mdx": "---\npath: src/components/ui/button.tsx\n---\n# Button\n",
  "src/app/globals.css": [
    ":root {",
    "  --primary: #112233;",
    "  --background: #ffffff;",
    "  --font-size-sm: 12px;",
    "  --font-size-md: 14px;",
    "  --space-1: 4px;",
    "  --radius: 4px;",
    "}",
    ".dark {",
    "  --primary: #ccddee;",
    "  --background: #000000;",
    "}",
    "@theme inline {",
    "  --color-primary: var(--primary);",
    "}",
    "",
  ].join("\n"),
  "src/app/layout.tsx": "export default function Layout({ children }) { return <html>{children}</html>; }\n",
  "src/app/page.tsx": [
    'import { Button } from "@/components/ui/button";',
    'import { Card } from "@/components/ui/card";',
    'import { Input } from "@/components/ui/input";',
    'import { Panel } from "@/components/Panel";',
    'import { Check } from "lucide-react";',
    'import { Cross2Icon } from "@radix-ui/react-icons";',
    "export default function Page() {",
    "  return (",
    '    <main className="bg-red-500 text-[11px] leading-[1.2] tracking-[0.1em] rounded-[14px] shadow-md p-[13px]" style={{ color: "#112233", background: "rgba(0,0,0,0.5)" }}>',
    '      <button className="rounded-full px-2 text-[13px]">raw</button>',
    "      <input />",
    "      <Button>ok</Button>",
    "      <Badge>x</Badge>",
    "      <Card />",
    "      <Input />",
    "      <Panel />",
    "      <Check /><Cross2Icon />",
    "      &#123; entity",
    "    </main>",
    "  );",
    "}",
    'function Badge() { return <span className="text-[0.8rem] text-white">b</span>; }',
    "",
  ].join("\n"),
  "src/components/ui/button.tsx": 'export function Button(props) { return <button className="rounded-md text-sm">{props.children}</button>; }\n',
  "src/components/ui/badge.tsx": 'export function Badge(props) { return <span className="rounded-md text-xs">{props.children}</span>; }\n',
  "src/components/ui/card.tsx": 'export function Card(props) { return <div className="rounded-lg shadow-sm">{props.children}</div>; }\n',
  "src/components/ui/input.tsx": 'export function Input(props) { return <input className="rounded-md text-sm" {...props} />; }\n',
  "src/components/Panel.tsx": [
    'import { Badge } from "./ui/badge";',
    'export function Panel() { return <div className="rounded-[var(--radius)] shadow-sm text-xs"><Badge>c</Badge></div>; }',
    "",
  ].join("\n"),
  "src/lib/track.ts": 'import posthog from "posthog-js";\nexport const track = () => posthog.capture("x");\n',
  "src/components/Orphan.tsx": 'export function Orphan() { return <i className="text-[11px] border-blue-300">x</i>; }\n',
  "src/components/Mockup.tsx": 'export const M = () => <div className="text-[9px]" style={{ color: "#abcdef" }} />;\n',
  "src/lib/util.test.ts": "export {};\n",
  "src/types.d.ts": "export type T = string;\n",
  "scripts/drift-report.ts": [
    "const EXCLUDE = [/globals\\.css$/, /secret\\.ts$/];",
    "// Exit code 0 always: drift is a report, not a gate",
    "if (process.argv.length > 99) process.exit(1);",
    "process.exit(0);",
    "",
  ].join("\n"),
  ".github/workflows/ci.yml": "name: ci\non: push\njobs:\n  drift:\n    runs-on: ubuntu-latest\n    steps:\n      - run: npm run drift\n",
  ".systemix/drift-history.json": JSON.stringify({
    snapshots: [{ runAt: "2026-07-08T18:47:17.141Z", triggeredBy: "manual", score: 68, critical: 7, warnings: 4, componentsAudited: 182, topOffenders: [] }],
  }, null, 2) + "\n",
  ".claude/skills/design-audit/SKILL.md": "# design-audit\n",
};

/** Initialise `root` as a git repo with one commit, the same commit on every machine. */
function commitAll(root, date = COMMIT_DATE) {
  const env = { ...process.env, GIT_AUTHOR_DATE: date, GIT_COMMITTER_DATE: date, GIT_AUTHOR_NAME: "t", GIT_AUTHOR_EMAIL: "t@example.com", GIT_COMMITTER_NAME: "t", GIT_COMMITTER_EMAIL: "t@example.com" };
  const git = (...args) => execFileSync("git", ["-c", "commit.gpgsign=false", "-c", "core.autocrlf=false", ...args], { cwd: root, env, stdio: "ignore" });
  git("init", "-q");
  git("add", "-A");
  git("commit", "-q", "-m", "fixture");
}

/** A temp repo holding RICH_FILES (plus `extra`), committed. Returns its root. */
function makeRichRepo(extra = {}) {
  const root = makeRepo({ ...RICH_FILES, ...extra });
  commitAll(root);
  return root;
}

/** Copy a repo, history included, to a new temp dir, to prove a report does not depend on where the repo lives. */
function copyTree(from) {
  const to = makeRepo({});
  fs.cpSync(from, to, { recursive: true });
  return to;
}

module.exports = { RICH_FILES, COMMIT_DATE, makeRichRepo, commitAll, copyTree };
