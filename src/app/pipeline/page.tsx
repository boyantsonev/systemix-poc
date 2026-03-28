import { AppShell } from "@/components/systemix/AppShell";
import { PipelineBeam } from "@/components/pipeline/PipelineBeam";
import { PipelineActivityLog } from "@/components/pipeline/PipelineActivityLog";
import { CodeInline } from "@/components/docs/CodeInline";
import type { AnchorItem } from "@/components/systemix/RightAnchorNav";

const anchorItems: AnchorItem[] = [
  { id: "loop",    label: "The Loop"    },
  { id: "history", label: "Run History" },
];

const LOOP = [
  {
    dir: "Design → Code",
    color: "text-violet-500/70",
    rows: [
      { skill: "/sync-tokens",         desc: "Pull Figma variables, diff against CSS tokens, propose update." },
      { skill: "/generate-from-figma", desc: "Fetch design context, generate a React component mapped to tokens." },
      { skill: "/apply-theme",         desc: "Read brand Figma vars, write scoped CSS theme overrides." },
      { skill: "/drift-report",        desc: "Scan codebase for hardcoded values that diverged from the token system." },
    ],
  },
  {
    dir: "Code → Design",
    color: "text-teal-500/70",
    rows: [
      { skill: "/push-tokens",      desc: "Read the bridge file and create/update Figma Variables (light + dark) via Plugin API." },
      { skill: "/capture-to-figma", desc: "Extract live DOM from localhost and push editable Frame/Text layers onto the Figma canvas." },
      { skill: "/figma-inspect",    desc: "Inspect current Figma selection — tokens, layout, variants, Code Connect, drift flags." },
      { skill: "/sync",             desc: "Orchestrate the full loop: pull tokens, convert, push Variables, report drift — one HITL gate." },
    ],
  },
];

export default function PipelinePage() {
  return (
    <AppShell anchorItems={anchorItems}>

      <h1 className="text-2xl font-black text-foreground mb-1">How It Works</h1>
      <p className="text-sm text-muted-foreground mb-6 max-w-prose">
        A <strong className="text-foreground">skill</strong> is a slash command — a markdown file in{" "}
        <CodeInline>~/.claude/commands/</CodeInline> — that defines one complete workflow.
        It spawns a <strong className="text-foreground">sub-agent</strong> that reads files, calls MCP tools,
        and surfaces a diff for your approval before writing anything.
      </p>

      <section id="loop">
        <PipelineBeam />

        <div className="rounded-xl border border-border overflow-hidden mt-6">
          {LOOP.map(({ dir, color, rows }) => (
            <div key={dir}>
              <div className={`px-4 py-2 bg-muted/50 border-b border-border text-[10px] font-black tracking-widest uppercase ${color}`}>
                {dir}
              </div>
              {rows.map(({ skill, desc }) => (
                <div key={skill} className="flex items-start gap-4 px-4 py-3 border-b border-border last:border-0 bg-card">
                  <code className="flex-shrink-0 bg-muted px-1.5 py-0.5 rounded text-xs font-mono text-foreground whitespace-nowrap mt-0.5">{skill}</code>
                  <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
                </div>
              ))}
            </div>
          ))}
        </div>
      </section>

      <section id="history">
        <h2 className="text-sm font-semibold text-foreground mb-3">Run History</h2>
        <PipelineActivityLog />
      </section>

    </AppShell>
  );
}
