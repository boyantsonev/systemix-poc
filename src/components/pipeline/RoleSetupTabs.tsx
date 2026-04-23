"use client";

import { useState } from "react";
import { Code2, Palette, BarChart2, ExternalLink, Terminal, AlertTriangle, Info, MonitorCheck, Layers, Eye, CheckCircle2 } from "lucide-react";
import { SetupGuide } from "./SetupGuide";
import { Card, CardContent } from "@/components/ui/card";
import { CodeInline } from "@/components/docs/CodeInline";

// ── Shared primitives ─────────────────────────────────────────────────────────

function ExternalA({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-violet-600 dark:text-violet-400 underline underline-offset-2 hover:text-violet-500 inline-flex items-center gap-0.5"
    >
      {children}
      <ExternalLink size={10} className="inline flex-shrink-0 ml-0.5" />
    </a>
  );
}

function Note({ children, variant = "info" }: { children: React.ReactNode; variant?: "info" | "warn" }) {
  const styles = variant === "warn"
    ? "border-amber-500/30 bg-amber-500/5 text-amber-700 dark:text-amber-300"
    : "border-blue-500/30 bg-blue-500/5 text-blue-700 dark:text-blue-300";
  const Icon = variant === "warn" ? AlertTriangle : Info;
  return (
    <div className={`flex gap-2 rounded-lg border px-3 py-2.5 mt-3 ${styles}`}>
      <Icon size={13} className="flex-shrink-0 mt-0.5" />
      <p className="text-sm leading-relaxed">{children}</p>
    </div>
  );
}

function SetupStep({ id, number, icon, title, children, isLast: _isLast }: {
  id?: string;
  number: number;
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
  isLast?: boolean;
}) {
  return (
    <div id={id} className="flex items-start gap-3 py-3 border-b border-border/40 last:border-0 scroll-mt-8">
      <div className="size-5 rounded-full border border-border/60 flex items-center justify-center text-[10px] font-mono text-muted-foreground/60 shrink-0 mt-px">
        {number}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5">
          <span className="text-muted-foreground/60">{icon}</span>
          <h3 className="text-[13px] font-semibold text-foreground">{title}</h3>
        </div>
        <div className="text-[12px] text-muted-foreground mt-0.5 leading-relaxed space-y-2">
          {children}
        </div>
      </div>
    </div>
  );
}

// ── Designer Guide ────────────────────────────────────────────────────────────

function DesignerGuide() {
  return (
    <div className="space-y-0">
      <Card className="mb-8">
        <CardContent className="pt-5 pb-5">
          <p className="text-muted-foreground/60 text-xs font-black tracking-widest uppercase mb-3">
            What you need
          </p>
          <div className="flex flex-wrap gap-2">
            {[
              { label: "Figma Desktop App",           href: "https://www.figma.com/downloads/" },
              { label: "Figma account (Editor role)", href: "https://figma.com" },
              { label: "A file with Figma Variables", href: "https://help.figma.com/hc/en-us/articles/15339657135383-Guide-to-variables-in-Figma" },
            ].map(({ label, href }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 bg-muted border border-border text-muted-foreground hover:text-foreground hover:border-muted-foreground/40 text-sm px-2.5 py-1 rounded-full transition-colors"
              >
                {label}
                <ExternalLink size={9} />
              </a>
            ))}
          </div>
          <Note variant="info">
            You don&apos;t need to run any code. Your role is to keep Figma organised with proper variables
            and keep the Figma Desktop Bridge active while your team runs the workflow.
          </Note>
        </CardContent>
      </Card>

      <SetupStep id="des-step-1" number={1} icon={<MonitorCheck size={14} />} title="Install Figma Desktop">
        <p>
          The workflow needs{" "}
          <ExternalA href="https://www.figma.com/downloads/">Figma Desktop</ExternalA>{" "}
          (not the browser version) to expose your open file to Claude Code via the Desktop Bridge Plugin.
          The browser version is sandboxed and cannot open a local WebSocket server.
        </p>
        <div className="rounded-lg border border-border bg-muted/40 p-3 mt-2">
          <div className="flex items-center gap-3 flex-wrap">
            {["macOS", "Windows", "Linux"].map((os) => (
              <span key={os} className="text-sm text-foreground font-medium flex items-center gap-1.5">
                <CheckCircle2 size={11} className="text-emerald-600 dark:text-emerald-400" /> {os}
              </span>
            ))}
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            Download the correct installer from{" "}
            <ExternalA href="https://www.figma.com/downloads/">figma.com/downloads</ExternalA>.
            Sign in with your Figma account after installation.
          </p>
        </div>
      </SetupStep>

      <SetupStep id="des-step-2" number={2} icon={<Layers size={14} />} title="Install the Desktop Bridge Plugin">
        <p>
          The{" "}
          <ExternalA href="https://github.com/southleft/figma-console-mcp">Figma Console MCP</ExternalA>{" "}
          plugin by Southleft runs inside Figma Desktop and opens a local WebSocket that Claude Code
          connects to. Without it, the workflow can only access files via the REST API (read-only, slower).
        </p>
        <ol className="space-y-2.5 mt-2">
          {[
            <>Open Figma Desktop and navigate to any design file.</>,
            <>In the Figma menu: <strong className="text-foreground">Plugins → Development → Import plugin from manifest</strong>. If you don&apos;t see a Development menu, enable it via <strong className="text-foreground">Figma → Preferences → Show plugin dev options</strong>.</>,
            <>Get the plugin manifest from the <ExternalA href="https://github.com/southleft/figma-console-mcp">GitHub repo</ExternalA> and import it.</>,
            <>Run it via <strong className="text-foreground">Plugins → Development → [plugin name]</strong>. The panel shows <em>&quot;Bridge active&quot;</em> when ready.</>,
            <><strong className="text-foreground">Keep this panel open</strong> for the entire session. Closing it stops the bridge.</>,
          ].map((text, i) => (
            <li key={i} className="flex gap-2.5">
              <span className="w-5 h-5 rounded bg-muted border border-border text-xs font-black text-muted-foreground flex items-center justify-center flex-shrink-0 mt-0.5">
                {String.fromCharCode(97 + i)}
              </span>
              <span>{text}</span>
            </li>
          ))}
        </ol>
        <Note variant="warn">
          The plugin must run in <strong>Development mode</strong>. Published plugins are sandboxed and
          cannot open a local WebSocket. Always load via <strong>Plugins → Development</strong>.
        </Note>
      </SetupStep>

      <SetupStep id="des-step-3" number={3} icon={<Palette size={14} />} title="Structure your tokens as Figma Variables">
        <p>
          The workflow syncs your{" "}
          <ExternalA href="https://help.figma.com/hc/en-us/articles/15339657135383-Guide-to-variables-in-Figma">
            Figma Variables
          </ExternalA>{" "}
          directly to the codebase. The better organised your variable collections are, the cleaner
          the generated tokens will be.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-2">
          {[
            { layer: "Primitives", desc: "Raw values — all colours, all spacing steps, all font sizes. Prefixed with primitive/ or sys/.", eg: "primitive/blue-500, primitive/space-4" },
            { layer: "Semantic",   desc: "Role-based aliases that reference Primitives. These become your CSS variables.", eg: "color/background, color/text-primary" },
            { layer: "Component",  desc: "Per-component tokens that reference Semantic tokens. Optional but enables per-theme overrides.", eg: "button/bg-primary, card/border" },
          ].map(({ layer, desc, eg }) => (
            <div key={layer} className="rounded-lg border border-border bg-muted/40 p-2.5">
              <p className="text-xs font-black tracking-widest text-foreground uppercase mb-1">{layer}</p>
              <p className="text-sm text-muted-foreground leading-relaxed mb-1.5">{desc}</p>
              <code className="text-xs text-muted-foreground/60 font-mono">{eg}</code>
            </div>
          ))}
        </div>
        <Note>
          Use <strong>slash-separated names</strong> (<CodeInline>color/background</CodeInline>, not{" "}
          <CodeInline>colorBackground</CodeInline>). The token-sync agent converts slashes to CSS custom
          property notation: <CodeInline>--color-background</CodeInline>.
        </Note>
      </SetupStep>

      <SetupStep id="des-step-4" number={4} icon={<Eye size={14} />} title="Share your Figma file URL with the team">
        <p>
          When a developer or the workflow needs to sync from your file, they need the full Figma URL.
          You can find it in the browser address bar or via{" "}
          <strong className="text-foreground">Share → Copy link</strong> in Figma Desktop.
          The URL format is:
        </p>
        <div className="rounded-lg border border-border bg-muted p-3 mt-2 font-mono text-sm text-muted-foreground break-all">
          https://figma.com/design/<span className="text-violet-700 dark:text-violet-400">{"<fileKey>"}</span>/DesignSystemName?node-id=…
        </div>
        <p className="mt-2">
          The <strong className="text-foreground">fileKey</strong> (the path segment after{" "}
          <CodeInline>/design/</CodeInline>) is what the workflow uses. The node-id is optional —
          it scopes the command to a specific frame or component.
        </p>
      </SetupStep>

      <SetupStep id="des-step-5" number={5} icon={<CheckCircle2 size={14} />} title="What happens when the workflow runs" isLast>
        <p>
          When a developer runs <CodeInline>/tokens</CodeInline> or <CodeInline>/component</CodeInline>
          pointing at your file, here&apos;s what the workflow does — and what it does <em>not</em> do:
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
          <div className="rounded-lg border border-emerald-500/40 bg-emerald-50 dark:bg-emerald-950/20 p-3">
            <p className="text-xs font-black tracking-widest text-emerald-700 dark:text-emerald-400 uppercase mb-2">The workflow does</p>
            <ul className="space-y-1">
              {[
                "Read your variables and component structure",
                "Extract design tokens and map them to code",
                "Generate React components matching your spec",
                "Flag any drift between design and existing code",
                "Show a diff for human review before writing",
              ].map((s) => (
                <li key={s} className="text-sm text-muted-foreground flex gap-1.5">
                  <CheckCircle2 size={10} className="text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-1" />
                  {s}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-lg border border-border bg-muted/40 p-3">
            <p className="text-xs font-black tracking-widest text-muted-foreground/60 uppercase mb-2">The workflow does NOT</p>
            <ul className="space-y-1">
              {[
                "Modify your Figma file or variables",
                "Create or delete frames or components",
                "Change any styles or assets in Figma",
                "Require you to do anything in code",
                "Send your design data to any cloud service",
              ].map((s) => (
                <li key={s} className="text-sm text-muted-foreground flex gap-1.5">
                  <span className="text-muted-foreground/40 flex-shrink-0 text-xs mt-0.5">✕</span>
                  {s}
                </li>
              ))}
            </ul>
          </div>
        </div>
        <Note>
          All workflow reads are <strong>non-destructive</strong>. The Desktop Bridge Plugin has
          read-only access to your file contents. Write operations (creating components, modifying
          variables) are only triggered by explicit commands that require user confirmation first.
        </Note>
      </SetupStep>
    </div>
  );
}

// ── Product Guide ─────────────────────────────────────────────────────────────

function ProductGuide() {
  return (
    <div className="space-y-0">
      <Card className="mb-8">
        <CardContent className="pt-5 pb-5">
          <p className="text-muted-foreground/60 text-xs font-black tracking-widest uppercase mb-3">
            No installation required
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Your job is the <strong className="text-foreground">Run Queue</strong>. When a developer
            runs a skill, it pauses for your approval before writing anything to the codebase.
            No terminal, no config.
          </p>
          <Note variant="info">
            Systemix runs locally on your developer&apos;s machine. Ask them to deploy it or share
            the URL so you can access it.
          </Note>
        </CardContent>
      </Card>

      <SetupStep id="prod-step-1" number={1} icon={<CheckCircle2 size={14} />} title="Approve or reject changes in the Run Queue">
        <p>
          Every skill run that touches the codebase pauses for human review. Open the{" "}
          <a href="/queue" className="text-violet-700 dark:text-violet-400 underline underline-offset-2 hover:text-violet-500">
            Run Queue
          </a>{" "}
          to see pending approvals, expand any task to see the diff, then approve or reject.
        </p>
        <div className="space-y-2 mt-3">
          {[
            { skill: "/tokens",      color: "bg-teal-500",   desc: "Shows token additions, changes, and removals before writing globals.css." },
            { skill: "/component",   color: "bg-violet-500", desc: "Shows the generated component code before it is saved to the repo." },
            { skill: "/drift-report", color: "bg-amber-500", desc: "Lists every hardcoded value found — approve to write the report." },
            { skill: "/apply-theme", color: "bg-rose-500",   desc: "Shows the new theme CSS file before it is written." },
          ].map(({ skill, color, desc }) => (
            <div key={skill} className="flex items-start gap-2.5 rounded-md border border-border p-2.5 bg-muted/40">
              <span className={`w-1.5 h-1.5 rounded-full ${color} flex-shrink-0 mt-2`} />
              <div>
                <span className="text-sm font-semibold text-foreground font-mono">{skill}</span>
                <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
              </div>
            </div>
          ))}
        </div>
        <Note>
          <strong>Approve</strong> applies the change. <strong>Reject</strong> discards it —
          nothing is written without your sign-off.
        </Note>
      </SetupStep>

      <SetupStep id="prod-step-2" number={2} icon={<Eye size={14} />} title="Check token and drift health" isLast>
        <p>After skills run, two pages show the results:</p>
        <div className="grid grid-cols-1 gap-2 mt-2">
          {[
            { page: "Tokens",       path: "/design-system/tokens", desc: "Every Figma variable mapped to a CSS token. Flagged in orange where the codebase value doesn't match Figma." },
            { page: "Drift Report", path: "/drift",                desc: "Components audited for hardcoded values. Shows the file, line, and which token should replace it." },
          ].map(({ page, path, desc }) => (
            <div key={page} className="rounded-lg border border-border bg-muted/40 p-3 flex gap-3">
              <a href={path} className="text-xs font-black tracking-widest text-violet-700 dark:text-violet-400 uppercase whitespace-nowrap mt-0.5 hover:underline">{page}</a>
              <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </SetupStep>
    </div>
  );
}

// ── Role tabs ─────────────────────────────────────────────────────────────────

const ROLES = [
  {
    id:    "developer" as const,
    label: "Developer",
    icon:  Code2,
    sub:   "Full technical setup",
  },
  {
    id:    "designer" as const,
    label: "Designer",
    icon:  Palette,
    sub:   "Figma & token setup",
  },
  {
    id:    "product" as const,
    label: "Product",
    icon:  BarChart2,
    sub:   "Using Systemix",
  },
];

type RoleId = typeof ROLES[number]["id"];

type RoleSetupTabsProps = {
  onRoleChange?: (role: RoleId) => void;
};

export function RoleSetupTabs({ onRoleChange }: RoleSetupTabsProps) {
  const [role, setRole] = useState<RoleId>("developer");

  function handleRoleChange(newRole: RoleId) {
    setRole(newRole);
    onRoleChange?.(newRole);
  }

  return (
    <div>
      {/* Role selector */}
      <div className="grid grid-cols-3 gap-2 mb-8">
        {ROLES.map(({ id, label, icon: Icon, sub }) => {
          const active = role === id;
          return (
            <button
              key={id}
              onClick={() => handleRoleChange(id)}
              className={`flex flex-col items-start gap-0.5 rounded-xl border-2 px-4 py-3 text-left transition-all ${
                active
                  ? "border-violet-500 bg-violet-500/5 text-foreground"
                  : "border-border bg-muted/30 text-muted-foreground hover:border-muted-foreground/40 hover:text-foreground"
              }`}
            >
              <div className="flex items-center gap-2 mb-0.5">
                <Icon size={14} className={active ? "text-violet-700 dark:text-violet-400" : "text-muted-foreground"} />
                <span className="text-sm font-semibold">{label}</span>
              </div>
              <span className="text-xs text-muted-foreground">{sub}</span>
            </button>
          );
        })}
      </div>

      {/* Guide content */}
      {role === "developer" && <SetupGuide />}
      {role === "designer"  && <DesignerGuide />}
      {role === "product"   && <ProductGuide />}
    </div>
  );
}
