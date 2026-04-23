import { Card, CardContent } from "@/components/ui/card";
import { CodeInline } from "@/components/docs/CodeInline";
import {
  Terminal, Key, Puzzle, Bot, Play,
  MonitorCheck, AlertTriangle, Info, ExternalLink, Plug, Layers, Heart,
} from "lucide-react";

// ── Primitives ────────────────────────────────────────────────────────────

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

function CodeBlock({ code, label, lang = "bash" }: { code: string; label?: string; lang?: string }) {
  return (
    <div className="mt-2">
      {label && (
        <div className="flex items-center gap-1.5 mb-1">
          <Terminal size={10} className="text-muted-foreground/40" />
          <span className="text-[10px] font-mono text-muted-foreground/50">{label}</span>
          {lang !== "bash" && (
            <span className="ml-auto text-[10px] text-muted-foreground/40">{lang}</span>
          )}
        </div>
      )}
      <pre className="bg-muted rounded-md px-3 py-2 text-[11px] font-mono border border-border/60 overflow-x-auto leading-relaxed whitespace-pre">
        {code}
      </pre>
    </div>
  );
}

type SetupStepProps = {
  id?: string;
  number: number;
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
  isLast?: boolean;
};

function SetupStep({ id, number, icon, title, children, isLast }: SetupStepProps) {
  return (
    <div id={id} className={`flex items-start gap-3 py-3 border-b border-border/40 last:border-0 scroll-mt-8 ${isLast ? "" : ""}`}>
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

// ── Attribution banner ────────────────────────────────────────────────────

function SouthleftAttribution() {
  return (
    <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3.5 mb-8">
      <div className="flex items-start gap-3">
        <Heart size={14} className="text-emerald-400 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-foreground mb-1">
            Powered by the Figma Console MCP — built by{" "}
            <ExternalA href="https://southleft.com">Southleft</ExternalA>
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Southleft is a boutique front-end development agency based in New Orleans, LA, specialising in
            AI-powered design tooling and design system automation. Their open-source{" "}
            <ExternalA href="https://github.com/southleft/figma-console-mcp">figma-console-mcp</ExternalA>{" "}
            package provides 56+ MCP tools for extracting, creating, and debugging Figma design systems from
            any AI assistant.{" "}
            Full documentation at{" "}
            <ExternalA href="https://docs.figma-console-mcp.southleft.com">
              docs.figma-console-mcp.southleft.com
            </ExternalA>.
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Architecture callout ───────────────────────────────────────────────────

function ArchitectureDiagram() {
  return (
    <div className="rounded-xl border border-border bg-muted/40 p-4 my-4">
      <p className="text-[10px] font-black tracking-widest text-muted-foreground/60 uppercase mb-3">
        How the Figma Console MCP bridge works
      </p>
      <div className="flex items-center gap-2 flex-wrap text-xs">
        {[
          { label: "Claude Code",         sub: "MCP client",                color: "bg-violet-500/10 border-violet-500/30 text-violet-400" },
          { arrow: true },
          { label: "figma-console-mcp",   sub: "npx figma-console-mcp",     color: "bg-teal-500/10 border-teal-500/30 text-teal-400" },
          { arrow: true },
          { label: "Desktop Bridge",      sub: "WebSocket bridge plugin",   color: "bg-amber-500/10 border-amber-500/30 text-amber-400" },
          { arrow: true },
          { label: "Figma Desktop",       sub: "open file, plugin running", color: "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" },
        ].map((item, i) =>
          "arrow" in item ? (
            <span key={i} className="text-muted-foreground/40 font-mono">↔</span>
          ) : (
            <div key={i} className={`rounded-lg border px-2.5 py-1.5 ${item.color}`}>
              <p className="font-semibold text-xs">{item.label}</p>
              {item.sub && <p className="text-[10px] font-mono opacity-70 mt-0.5">{item.sub}</p>}
            </div>
          )
        )}
      </div>
      <p className="text-sm text-muted-foreground/60 mt-3 leading-relaxed">
        The MCP server (<CodeInline>figma-console-mcp</CodeInline>) is a local Node.js process that Claude Code
        spawns on demand. It communicates with the Figma Desktop app via the{" "}
        <strong className="text-muted-foreground">Desktop Bridge Plugin</strong> — a Figma plugin that runs
        inside the desktop app and exposes a local WebSocket server. Both sides must be active simultaneously.
        No cloud relay, no data leaves your machine.
      </p>
    </div>
  );
}

// ── Two-mode comparison ───────────────────────────────────────────────────

function ModeComparison() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 my-4">
      <div className="rounded-lg border-2 border-teal-500/40 bg-teal-500/5 p-3">
        <p className="text-[10px] font-black tracking-widest text-teal-400 uppercase mb-1.5">
          Local Mode (recommended)
        </p>
        <ul className="space-y-1">
          {[
            "56+ tools including write/create",
            "Real-time console log streaming",
            "Variable creation & batch updates",
            "Design creation via Plugin API",
            "Requires Figma Desktop + Bridge Plugin",
            "Auth via Personal Access Token",
          ].map((l) => (
            <li key={l} className="text-sm text-muted-foreground flex gap-1.5">
              <span className="text-teal-400 flex-shrink-0">✓</span>{l}
            </li>
          ))}
        </ul>
      </div>
      <div className="rounded-lg border border-border bg-muted/40 p-3">
        <p className="text-[10px] font-black tracking-widest text-muted-foreground/60 uppercase mb-1.5">
          Remote SSE (read-only)
        </p>
        <ul className="space-y-1">
          {[
            "22 read-only tools",
            "No local install needed",
            "No Figma Desktop required",
            "OAuth via browser",
            "Cannot create or modify designs",
            "Good for quick exploration",
          ].map((l) => (
            <li key={l} className="text-sm text-muted-foreground flex gap-1.5">
              <span className="text-muted-foreground/40 flex-shrink-0">·</span>{l}
            </li>
          ))}
        </ul>
        <p className="text-[10px] font-mono text-muted-foreground/50 mt-2 break-all">
          https://figma-console-mcp.southleft.com/sse
        </p>
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────

export function SetupGuide() {
  return (
    <div className="space-y-0">

      {/* Attribution */}
      <SouthleftAttribution />

      {/* Prerequisites */}
      <Card className="mb-8">
        <CardContent className="pt-5 pb-5">
          <p className="text-muted-foreground/60 text-[10px] font-black tracking-widest uppercase mb-3">
            Prerequisites
          </p>
          <div className="flex flex-wrap gap-2">
            {[
              { label: "Claude Code CLI",              href: "https://claude.ai/code"                                          },
              { label: "Figma Desktop App",            href: "https://www.figma.com/downloads/"                                },
              { label: "Figma account (Editor role)",  href: "https://figma.com"                                               },
              { label: "Node.js 18+",                  href: "https://nodejs.org"                                              },
              { label: "figma-console-mcp docs",       href: "https://docs.figma-console-mcp.southleft.com"                   },
            ].map(({ label, href }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 bg-muted border border-border text-muted-foreground hover:text-foreground hover:border-muted-foreground/40 text-xs px-2.5 py-1 rounded-full transition-colors"
              >
                {label}
                <ExternalLink size={9} />
              </a>
            ))}
          </div>
          <Note variant="warn">
            The <strong>Figma Desktop app</strong> is required for Local Mode (all 56+ tools). The browser
            version of Figma cannot host the Desktop Bridge Plugin. If you only need read access
            and don&apos;t want to install anything, use Remote SSE mode instead.
          </Note>
        </CardContent>
      </Card>

      {/* Step 1 */}
      <SetupStep id="dev-step-1" number={1} icon={<Terminal size={14} />} title="Install Claude Code">
        <p>
          Install the Claude Code CLI globally. This is the AI coding assistant that hosts MCP servers,
          runs skills as slash commands, and spawns agents. Authenticate with your{" "}
          <ExternalA href="https://console.anthropic.com">Anthropic account</ExternalA> after installation.
          Requires a paid plan or active{" "}
          <ExternalA href="https://claude.ai">claude.ai</ExternalA> Pro/Team subscription.
        </p>
        <CodeBlock
          label="terminal"
          code={`npm install -g @anthropic-ai/claude-code

# Authenticate — opens a browser window
claude

# Confirm the install
claude --version`}
        />
        <Note>
          Claude Code runs entirely locally. Your code, designs, and tokens never leave your machine
          unless you explicitly call an external API (like Figma&apos;s REST API).
        </Note>
      </SetupStep>

      {/* Step 2 */}
      <SetupStep id="dev-step-2" number={2} icon={<MonitorCheck size={14} />} title="Install Figma Desktop & the Desktop Bridge Plugin">
        <p>
          The Figma Console MCP by Southleft uses a <strong className="text-foreground">Desktop Bridge Plugin</strong>{" "}
          that runs inside the Figma Desktop app and exposes a local WebSocket server. The MCP server
          connects to this bridge to read your open file in real-time. Without the plugin running,
          the MCP server falls back to REST API only (no live canvas access).
        </p>

        <ArchitectureDiagram />

        <ModeComparison />

        <p className="font-medium text-foreground text-sm">Setting up the Desktop Bridge Plugin:</p>
        <ol className="space-y-2.5 mt-2">
          {[
            <>
              Download and install{" "}
              <ExternalA href="https://www.figma.com/downloads/">Figma Desktop</ExternalA>{" "}
              for your platform (macOS, Windows, Linux).
            </>,
            <>
              Open Figma Desktop and navigate to any design file. The plugin only works inside
              an open file — it cannot run from the home screen.
            </>,
            <>
              In the Figma menu: <strong className="text-foreground">Menu → Plugins → Browse plugins in Community</strong>,
              then search for <strong className="text-foreground">&quot;Figma Console MCP&quot;</strong> by Southleft,
              or visit the plugin directly via the{" "}
              <ExternalA href="https://github.com/southleft/figma-console-mcp">
                GitHub repository
              </ExternalA>{" "}
              for the plugin manifest link.
            </>,
            <>
              Run the plugin from{" "}
              <strong className="text-foreground">Plugins → Development → [plugin name]</strong>.
              It must be loaded via the Development menu to have permission to open a local
              WebSocket server — published plugins are sandboxed and cannot do this.
            </>,
            <>
              The plugin panel will display a confirmation when the bridge is active.
              <strong className="text-foreground"> Keep this panel open</strong> for the
              entire Claude Code session. Closing it stops the bridge.
            </>,
          ].map((text, i) => (
            <li key={i} className="flex gap-2.5">
              <span className="w-5 h-5 rounded bg-muted border border-border text-[10px] font-black text-muted-foreground flex items-center justify-center flex-shrink-0 mt-0.5">
                {String.fromCharCode(97 + i)}
              </span>
              <span>{text}</span>
            </li>
          ))}
        </ol>
        <Note variant="warn">
          The plugin must run in <strong>Development mode</strong> (not as a published plugin install)
          because it needs to open a WebSocket server on localhost. Figma&apos;s plugin sandbox
          prevents published plugins from doing this. Always load it via{" "}
          <strong>Plugins → Development</strong>.
        </Note>
      </SetupStep>

      {/* Step 3 */}
      <SetupStep id="dev-step-3" number={3} icon={<Key size={14} />} title="Get a Figma Personal Access Token">
        <p>
          The MCP server uses a{" "}
          <ExternalA href="https://www.figma.com/developers/api#access-tokens">
            Figma Personal Access Token
          </ExternalA>{" "}
          (PAT) to authenticate REST API calls — fetching file data by URL, reading variables,
          getting component metadata. This is separate from the Desktop Bridge (which uses the
          desktop app&apos;s own session).
        </p>
        <ol className="space-y-1 mt-2">
          {[
            "Log in to figma.com in your browser",
            "Click your avatar (top-left) → Settings",
            'Scroll to "Personal access tokens" → Generate new token',
            'Name it "Claude Code MCP" and grant full read access',
            "Copy the token — it starts with figd_ and is shown only once",
          ].map((s, i) => (
            <li key={i} className="flex gap-2 text-sm">
              <span className="text-muted-foreground/40 flex-shrink-0">{i + 1}.</span>
              <span>{s}</span>
            </li>
          ))}
        </ol>
      </SetupStep>

      {/* Step 4 */}
      <SetupStep id="dev-step-4" number={4} icon={<Plug size={14} />} title="Add figma-console-mcp to Claude Code">
        <p>
          Southleft&apos;s{" "}
          <ExternalA href="https://github.com/southleft/figma-console-mcp">figma-console-mcp</ExternalA>{" "}
          is installed as an MCP server that Claude Code launches on demand via{" "}
          <CodeInline>npx</CodeInline>. The easiest way is the one-liner below — it writes the
          config to <CodeInline>~/.claude.json</CodeInline> automatically.
        </p>

        <p className="font-medium text-foreground text-sm">Option A — one-liner (recommended):</p>
        <CodeBlock
          label="terminal"
          code={`claude mcp add figma-console -s user \\
  -e FIGMA_ACCESS_TOKEN=figd_YOUR_TOKEN_HERE \\
  -e ENABLE_MCP_APPS=true \\
  -- npx -y figma-console-mcp@latest`}
        />

        <p className="font-medium text-foreground text-sm mt-4">Option B — manual config:</p>
        <CodeBlock
          label="~/.claude.json  (Claude Code config)"
          lang="json"
          code={`{
  "mcpServers": {
    "figma-console": {
      "command": "npx",
      "args": ["-y", "figma-console-mcp@latest"],
      "env": {
        "FIGMA_ACCESS_TOKEN": "figd_YOUR_TOKEN_HERE",
        "ENABLE_MCP_APPS": "true"
      }
    }
  }
}`}
        />

        <Note variant="warn">
          The env var is <CodeInline>FIGMA_ACCESS_TOKEN</CodeInline> (not{" "}
          <CodeInline>FIGMA_PERSONAL_ACCESS_TOKEN</CodeInline>). The token must start with{" "}
          <CodeInline>figd_</CodeInline>. Setting <CodeInline>ENABLE_MCP_APPS=true</CodeInline> enables
          the full tool suite including write operations.
        </Note>
      </SetupStep>

      {/* Step 5 */}
      <SetupStep id="dev-step-5" number={5} icon={<MonitorCheck size={14} />} title="Verify the connection">
        <p>
          With Figma Desktop open (Bridge Plugin running) and the MCP configured, test end-to-end
          before installing skills. Start a Claude Code session and check the MCP status.
        </p>
        <CodeBlock
          label="claude code"
          code={`# Open Claude Code in any directory
claude

# Check MCP server status
/mcp
# → figma-console should show: connected

# Quick end-to-end test — paste any Figma file URL:
# "Use figma_get_variables to get the variables from this file:
#  https://figma.com/design/<fileKey>/MyDesignSystem"

# If the Desktop Bridge is active you'll get structured variable data.
# If only the PAT is working you'll get file metadata but not live canvas data.`}
        />
        <Note variant="warn">
          Common issues: (1) <CodeInline>figma-console</CodeInline> shows &quot;error&quot; →
          Figma Desktop is not open, or the Bridge Plugin is not running.
          (2) Variables return empty → file has no Figma variables defined.
          (3) Authentication error → token is wrong, expired, or missing the{" "}
          <CodeInline>figd_</CodeInline> prefix. Regenerate at figma.com → Settings → Personal access tokens.
        </Note>
      </SetupStep>

      {/* Step 6 */}
      <SetupStep id="dev-step-6" number={6} icon={<Puzzle size={14} />} title="Install the Skills">
        <p>
          Skills are markdown prompt files stored in{" "}
          <CodeInline>~/.claude/skills/[name]/SKILL.md</CodeInline>. Claude Code loads them on
          startup as <CodeInline>/name</CodeInline> slash commands. Copy each prompt from the{" "}
          <a href="/skills" className="text-violet-400 underline underline-offset-2 hover:text-violet-300">
            Skills page
          </a>{" "}
          and save to the paths below.
        </p>
        <CodeBlock
          label="terminal"
          code={`# Create the skills directory
mkdir -p ~/.claude/skills

# Workflow skills (5-step figma-to-code flow):
mkdir -p ~/.claude/skills/figma      # /figma     — extract design context + tokens
mkdir -p ~/.claude/skills/tokens     # /tokens    — sync Figma variables → globals.css
mkdir -p ~/.claude/skills/component  # /component — generate React component + stories
mkdir -p ~/.claude/skills/storybook  # /storybook — verify + fix Storybook stories
mkdir -p ~/.claude/skills/deploy     # /deploy    — build + deploy to Vercel

# Tool skills (on-demand utilities):
mkdir -p ~/.claude/skills/sync-to-figma    # /sync-to-figma     — push tokens → Figma variables
mkdir -p ~/.claude/skills/drift-report     # /drift-report      — audit codebase for token drift
mkdir -p ~/.claude/skills/apply-theme      # /apply-theme       — generate client theme override
mkdir -p ~/.claude/skills/figma-inspect    # /figma-inspect     — inspect any Figma node
mkdir -p ~/.claude/skills/figma-push       # /figma-push        — screenshot URL → Figma frame
mkdir -p ~/.claude/skills/sync             # /sync              — full bidirectional sync
mkdir -p ~/.claude/skills/design-to-code   # /design-to-code    — end-to-end workflow
mkdir -p ~/.claude/skills/connect          # /connect           — link components to Figma
mkdir -p ~/.claude/skills/check-parity     # /check-parity      — detect design-code drift
mkdir -p ~/.claude/skills/deploy-annotate  # /deploy-annotate   — post deploy URL to Figma

# Restart Claude Code, then type / to see all skills in autocomplete`}
        />
        <Note>
          Skills use <CodeInline>$ARGUMENTS</CodeInline> to capture what you type after the command.
          If no argument is given the skill will ask interactively. Skills that read from Figma
          need the Official Figma MCP; skills that write back to Figma need{" "}
          <CodeInline>figma-console-mcp</CodeInline> with the Desktop Bridge active.
        </Note>
      </SetupStep>

      {/* Step 7 */}
      <SetupStep id="dev-step-7" number={7} icon={<Layers size={14} />} title="Configure Agents (optional but recommended)">
        <p>
          Agents are specialist Claude instances in{" "}
          <CodeInline>~/.claude/agents/</CodeInline> — each with a focused system prompt, curated
          tools, and a persistent memory directory. Skills spawn them via the{" "}
          <CodeInline>Task</CodeInline> tool. Without agent files the skills still work, but you
          lose specialist isolation, memory persistence, and parallel execution.
        </p>
        <CodeBlock
          label="terminal"
          code={`mkdir -p ~/.claude/agents
mkdir -p ~/.claude/agent-memory/{figma,tokens,component,drift-report,apply-theme}`}
        />
        <CodeBlock
          label="~/.claude/agents/token-sync.md  (example)"
          lang="markdown"
          code={`---
name: token-sync
description: >
  Syncs Figma variables to codebase token files using the Figma Console MCP
  by Southleft (figma-console-mcp). Diffs variables against CSS/Tailwind/TS
  token files and writes changes after user confirmation.
tools:
  - Read
  - Write
  - Edit
  - Glob
  - Grep
  - Bash
  - mcp__figma-console__figma_get_variables
  - mcp__figma-console__figma_get_design_system_kit
---

You are the token-sync agent. Keep Figma variables and codebase token files in sync.

Always show a clear diff (Added / Changed / Removed) before writing any file.
Never remove tokens without explicit user confirmation.
Preserve file comments and structure. Write a session summary to memory after each run.`}
        />
        <Note>
          After a few runs, each agent builds project memory — it learns your token file paths,
          naming conventions, and confirmed mappings. This makes subsequent runs significantly faster.
        </Note>
      </SetupStep>

      {/* Step 8 */}
      <SetupStep id="dev-step-8" number={8} icon={<Play size={14} />} title="Run your first workflow" isLast>
        <p>
          Open Claude Code in your project root. The 5-step workflow runs sequentially — each skill
          hands off to the next. You can also run any skill individually.
        </p>
        <CodeBlock
          label="claude code — terminal"
          code={`cd /path/to/your/project
claude

# ── 5-step workflow: Figma URL → deployed component ──────────
/figma https://figma.com/design/<fileKey>/MyDesignSystem?node-id=15-892
# → /tokens → /component → /storybook → /deploy  (chain manually or use /design-to-code)

# ── Or run the full workflow in one command ───────────────────
/design-to-code https://figma.com/design/<fileKey>/DS?node-id=15-892

# ── Individual tool skills ────────────────────────────────────
/tokens https://figma.com/design/<fileKey>/MyDesignSystem
/drift-report
/drift-report src/components/ui/button.tsx
/apply-theme acme https://figma.com/design/<fileKey>/AcmeBrand
/sync-to-figma
/check-parity https://figma.com/design/<fileKey>/MyDesignSystem`}
        />
        <Note>
          Skills with an <strong>HITL gate</strong> pause before writing and show a diff in your terminal.
          Type <CodeInline>approve</CodeInline> to apply or <CodeInline>reject</CodeInline> to discard —
          nothing is written without your sign-off.
        </Note>
      </SetupStep>
    </div>
  );
}
