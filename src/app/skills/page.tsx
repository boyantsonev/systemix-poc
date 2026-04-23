"use client";

import { useState } from "react";
import { AppShell } from "@/components/systemix/AppShell";
import { CopyButton } from "@/components/pipeline/CopyButton";
import { pipelineSkills } from "@/lib/data/pipeline";
import type { Skill, SkillGroup } from "@/lib/types/skill";
import { ChevronDown, ChevronUp } from "lucide-react";
import type { AnchorItem } from "@/components/systemix/RightAnchorNav";

const anchorItems: AnchorItem[] = [
  { id: "sync-loop",  label: "Sync Loop"  },
  { id: "quality",    label: "Quality"    },
  { id: "output",     label: "Output"     },
  { id: "utilities",  label: "Utilities"  },
];

const GROUP_META: Record<SkillGroup, { heading: string; subtitle: string; numbered: boolean }> = {
  "sync-loop": { heading: "Sync Loop",  subtitle: "Keep Figma and code in sync",   numbered: true  },
  "quality":   { heading: "Quality",    subtitle: "Detect and verify correctness",  numbered: false },
  "output":    { heading: "Output",     subtitle: "Produce artifacts",              numbered: false },
  "utilities": { heading: "Utilities",  subtitle: "Lower-level helpers",            numbered: false },
};

const GROUP_ORDER: SkillGroup[] = ["sync-loop", "quality", "output", "utilities"];

function groupSkills(skills: typeof pipelineSkills): Record<SkillGroup, typeof pipelineSkills> {
  const groups: Record<SkillGroup, typeof pipelineSkills> = {
    "sync-loop": [],
    "quality":   [],
    "output":    [],
    "utilities": [],
  };
  for (const skill of skills) {
    groups[skill.group].push(skill);
  }
  return groups;
}

// ── CopyCommandButton (BAST-99) ───────────────────────────────────────────────

function CopyCommandButton({ command }: { command: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(command);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <button
      onClick={(e) => { e.stopPropagation(); copy(); }}
      className="h-6 px-2 text-[10px] font-mono border border-border/60 rounded hover:bg-muted/60 transition-colors inline-flex items-center gap-1"
      title="Copy command"
    >
      {copied ? "✓" : "copy"}
    </button>
  );
}

// ── SkillRow ──────────────────────────────────────────────────────────────────

function SkillRow({ skill, stepNumber }: { skill: Skill; stepNumber?: number }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border-b border-border last:border-0">
      <div
        className="flex items-start gap-4 px-4 py-3 cursor-pointer select-none hover:bg-muted/30 transition-colors"
        onClick={() => setOpen(v => !v)}
      >
        {/* Command badge + copy button */}
        <div className="flex items-center gap-1.5 flex-shrink-0 mt-0.5">
          {stepNumber !== undefined && (
            <span className="text-[10px] text-muted-foreground/50 font-mono w-4 text-right flex-shrink-0">
              {stepNumber}.
            </span>
          )}
          <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono text-foreground whitespace-nowrap">
            {skill.command}
          </code>
          <CopyCommandButton command={skill.command} />
        </div>

        {/* Description + badges (BAST-98) */}
        <div className="flex-1 min-w-0">
          <p className="text-xs text-muted-foreground leading-relaxed">
            {skill.description}
          </p>
          {/* Agent + MCP badges */}
          <div className="flex items-center gap-2 flex-wrap mt-1">
            {skill.triggersAgent && (
              <span
                className="text-[10px] font-medium"
                style={{ color: `var(--agent-${skill.triggersAgent.toLowerCase()})` }}
              >
                {skill.triggersAgent}
              </span>
            )}
            {skill.mcp?.required?.length > 0 && skill.mcp.required.map(mcp => (
              <span key={mcp} className="text-[10px] font-mono px-1.5 py-0.5 rounded border border-border/60 bg-muted text-muted-foreground">
                {mcp}
              </span>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <CopyButton text={skill.promptContent} label="Copy prompt" />
          {open
            ? <ChevronUp size={13} className="text-muted-foreground" />
            : <ChevronDown size={13} className="text-muted-foreground" />}
        </div>
      </div>

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

// ── Page ──────────────────────────────────────────────────────────────────────

export default function SkillsPage() {
  const groups = groupSkills(pipelineSkills);

  return (
    <AppShell anchorItems={anchorItems}>

      <h1 className="text-2xl font-black text-foreground mb-1">Skills</h1>
      <p className="text-sm text-muted-foreground mb-1 max-w-prose">
        15 Claude Code skills — each is a markdown file installed to{" "}
        <code className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded text-foreground">~/.claude/skills/</code>.
      </p>
      <p className="text-xs text-muted-foreground mb-6 max-w-prose">
        Install with <code className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded text-foreground">npx systemix add figma</code> or copy the prompt below and save it manually.
      </p>

      {GROUP_ORDER.map(groupKey => {
        const meta = GROUP_META[groupKey];
        const skills = groups[groupKey];
        if (skills.length === 0) return null;
        return (
          <section key={groupKey} id={groupKey}>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/60 mb-2 mt-6">
              {meta.heading}
            </p>
            <p className="text-xs text-muted-foreground mb-3">{meta.subtitle}</p>
            <div className="rounded-xl border border-border overflow-hidden mb-8">
              {skills.map((s, i) => (
                <SkillRow
                  key={s.command}
                  skill={s}
                  stepNumber={meta.numbered ? i + 1 : undefined}
                />
              ))}
            </div>
          </section>
        );
      })}

    </AppShell>
  );
}
