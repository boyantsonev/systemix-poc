"use client";

import { useState } from "react";
import { AppShell } from "@/components/systemix/AppShell";
import { CopyButton } from "@/components/pipeline/CopyButton";
import { skills } from "@/lib/data/pipeline";
import { ChevronDown, ChevronUp } from "lucide-react";
import type { AnchorItem } from "@/components/systemix/RightAnchorNav";

const anchorItems: AnchorItem[] = [
  { id: "dtc", label: "Design → Code" },
  { id: "ctd", label: "Code → Design" },
];

const DTC = ["/sync-tokens", "/generate-from-figma", "/apply-theme", "/drift-report", "/sync-docs", "/design-to-code"];
const CTD = ["/push-tokens", "/capture-to-figma", "/figma-inspect", "/sync ", "/figma ", "/tokens ", "/component ", "/storybook", "/deploy"];

const dtc = skills.filter(s => DTC.some(c => s.command.startsWith(c.trim())));
const ctd = skills.filter(s => CTD.some(c => s.command.startsWith(c.trim())));

function SkillRow({ skill }: { skill: typeof skills[0] }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border-b border-border last:border-0">
      {/* Summary row */}
      <div
        className="flex items-start gap-4 px-4 py-3 cursor-pointer select-none hover:bg-muted/30 transition-colors"
        onClick={() => setOpen(v => !v)}
      >
        <code className="flex-shrink-0 bg-muted px-1.5 py-0.5 rounded text-xs font-mono text-foreground whitespace-nowrap mt-0.5">
          {skill.command}
        </code>
        <p className="flex-1 text-xs text-muted-foreground leading-relaxed">
          {skill.description}
        </p>
        <div className="flex items-center gap-2 flex-shrink-0">
          <CopyButton text={skill.promptContent} label="Copy" />
          {open
            ? <ChevronUp size={13} className="text-muted-foreground" />
            : <ChevronDown size={13} className="text-muted-foreground" />}
        </div>
      </div>

      {/* Prompt content */}
      {open && (
        <div className="px-4 pb-4 bg-muted/20">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-mono text-muted-foreground/60">{skill.file}</span>
          </div>
          <pre className="text-xs font-mono text-foreground/80 leading-relaxed whitespace-pre-wrap bg-muted rounded-lg p-4 overflow-x-auto">
            {skill.promptContent}
          </pre>
        </div>
      )}
    </div>
  );
}

export default function SkillsPage() {
  return (
    <AppShell anchorItems={anchorItems}>

      <h1 className="text-2xl font-black text-foreground mb-1">Skills</h1>
      <p className="text-sm text-muted-foreground mb-6 max-w-prose">
        Each skill is a markdown file in{" "}
        <code className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded text-foreground">~/.claude/commands/</code>.
        Copy the prompt, save to the path shown, restart Claude Code.
      </p>

      <section id="dtc">
        <p className="text-[10px] font-black tracking-widest uppercase text-violet-500/70 mb-2">Design → Code</p>
        <div className="rounded-xl border border-border overflow-hidden mb-8">
          {dtc.map(s => <SkillRow key={s.command} skill={s} />)}
        </div>
      </section>

      <section id="ctd">
        <p className="text-[10px] font-black tracking-widest uppercase text-teal-500/70 mb-2">Code → Design</p>
        <div className="rounded-xl border border-border overflow-hidden">
          {ctd.map(s => <SkillRow key={s.command} skill={s} />)}
        </div>
      </section>

    </AppShell>
  );
}
