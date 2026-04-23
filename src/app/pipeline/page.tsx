import { AppShell } from "@/components/systemix/AppShell";
import { PipelineBeam } from "@/components/pipeline/PipelineBeam";
import { PipelineActivityLog } from "@/components/pipeline/PipelineActivityLog";
import { AgentStatusCards } from "@/components/pipeline/AgentStatusCards";
import { HitlBanner } from "@/components/pipeline/HitlBanner";
import { SkillTriggerStrip } from "@/components/pipeline/SkillTriggerStrip";
import type { AnchorItem } from "@/components/systemix/RightAnchorNav";

const anchorItems: AnchorItem[] = [
  { id: "agents", label: "Agents" },
  { id: "run", label: "Run Skills" },
  { id: "pipeline", label: "Workflow" },
  { id: "history", label: "History" },
];

const PIPELINE_STEPS = [
  { step: 1, skill: "/figma",     desc: "Extract design context — tokens, layout, variants — from any Figma URL." },
  { step: 2, skill: "/tokens",    desc: "Compare Figma variables against your CSS token file. Adds new, updates changed, flags removed." },
  { step: 3, skill: "/component", desc: "Generate a production-ready React component + Storybook story from the Figma node." },
  { step: 4, skill: "/storybook", desc: "Read, verify, and update stories via Storybook MCP. Screenshots compared against Figma spec." },
  { step: 5, skill: "/deploy",    desc: "Build Storybook and deploy a shareable preview. Optionally posts the preview URL as a Figma comment if a node target is configured." },
];

export default function PipelinePage() {
  return (
    <AppShell anchorItems={anchorItems}>

      <h1 className="text-2xl font-black tracking-tight mb-6">The Workflow</h1>

      {/* Zone 1 — HITL Banner + Agent Status (above fold) */}
      <HitlBanner />

      <section id="agents" className="mb-8">
        <h2 className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/60 mb-3">Agent Status</h2>
        <AgentStatusCards />
      </section>

      {/* Zone 2 — Skill trigger strip */}
      <section id="run" className="mb-8">
        <SkillTriggerStrip />
      </section>

      {/* Zone 3 — Pipeline diagram + history */}
      <section id="pipeline" className="mb-8">
        <h2 className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/60 mb-3">Workflow</h2>

        {/* Mobile step list — shown only on small screens */}
        <div className="md:hidden mb-6">
          <div className="rounded-lg border border-border/60 divide-y divide-border/40">
            {[
              { step: 1, command: "/figma", name: "Extract from Figma", description: "Read design context, tokens, and screenshot" },
              { step: 2, command: "/tokens", name: "Sync Tokens", description: "Convert and push CSS variables to Figma" },
              { step: 3, command: "/component", name: "Generate Component", description: "Create React component from Figma node" },
              { step: 4, command: "/storybook", name: "Verify Stories", description: "Read and verify Storybook coverage" },
              { step: 5, command: "/deploy", name: "Build & Deploy", description: "Deploy preview to Vercel" },
            ].map(({ step, command, name, description }) => (
              <div key={command} className="flex items-center gap-3 px-3 py-2.5">
                <span className="text-[10px] font-mono text-muted-foreground/40 w-4 shrink-0">{step}</span>
                <code className="text-[11px] font-mono font-semibold text-foreground shrink-0">{command}</code>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-medium truncate">{name}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="hidden md:block">
          <PipelineBeam />
        </div>

        <div className="rounded-lg border border-border/60 overflow-hidden mt-6">
          <div className="px-4 py-2 bg-muted/50 border-b border-border/60 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/60">
            Steps
          </div>
          {PIPELINE_STEPS.map(({ step, skill, desc }) => (
            <div key={skill} className="flex items-start gap-4 px-4 py-3 border-b border-border/40 last:border-0 bg-card">
              <span className="flex-shrink-0 text-[10px] font-black text-muted-foreground/30 tabular-nums mt-1 w-3 text-right">{step}</span>
              <code className="flex-shrink-0 bg-muted px-1.5 py-0.5 rounded text-[11px] font-mono text-foreground whitespace-nowrap mt-0.5">{skill}</code>
              <p className="text-[12px] text-muted-foreground leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="history" className="mb-8">
        <h2 className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/60 mb-3">Run History</h2>
        <PipelineActivityLog />
      </section>

    </AppShell>
  );
}
