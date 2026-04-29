"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Copy, Check } from "lucide-react";
import { pipelineSkills } from "@/lib/data/pipeline";
import type { Skill, SkillGroup } from "@/lib/types/skill";

const GROUP_META: Record<SkillGroup, { heading: string; subtitle: string }> = {
  "sync-loop": { heading: "Sync loop",  subtitle: "Run in sequence to keep Figma and code in sync" },
  "quality":   { heading: "Quality",    subtitle: "Detect drift, verify correctness, check parity"  },
  "output":    { heading: "Output",     subtitle: "Generate components, stories, and deploy"        },
  "utilities": { heading: "Utilities",  subtitle: "Lower-level helpers"                             },
};

const GROUP_ORDER: SkillGroup[] = ["sync-loop", "quality", "output", "utilities"];

function groupSkills(skills: typeof pipelineSkills): Record<SkillGroup, typeof pipelineSkills> {
  const groups: Record<SkillGroup, typeof pipelineSkills> = {
    "sync-loop": [], "quality": [], "output": [], "utilities": [],
  };
  for (const skill of skills) groups[skill.group].push(skill);
  return groups;
}

function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <button
      onClick={(e) => { e.stopPropagation(); copy(); }}
      className="inline-flex items-center gap-1 h-6 px-2 text-[10px] font-mono border border-border/60 rounded hover:bg-muted/60 transition-colors text-muted-foreground"
    >
      {copied ? <Check size={10} className="text-emerald-500" /> : <Copy size={10} />}
      {copied ? "copied" : "copy"}
    </button>
  );
}

function SkillRow({ skill, index, numbered }: { skill: Skill; index: number; numbered: boolean }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border-b border-border/40 last:border-0">
      <div
        className="flex items-start gap-4 px-4 py-3.5 cursor-pointer select-none hover:bg-muted/20 transition-colors"
        onClick={() => setOpen(v => !v)}
      >
        <div className="flex items-center gap-2 shrink-0 mt-0.5">
          {numbered && (
            <span className="text-[10px] text-muted-foreground/40 font-mono w-4 text-right">{index + 1}.</span>
          )}
          <code className="bg-muted/60 px-1.5 py-0.5 rounded text-[12px] font-mono text-foreground whitespace-nowrap">
            {skill.command}
          </code>
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-[13px] text-muted-foreground leading-relaxed">{skill.description}</p>
          <div className="flex items-center gap-2 flex-wrap mt-1.5">
            {skill.mcp?.required?.map(mcp => (
              <span key={mcp} className="text-[10px] font-mono px-1.5 py-0.5 rounded border border-border/50 text-muted-foreground/60">
                {mcp}
              </span>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <CopyBtn text={skill.promptContent} />
          {open
            ? <ChevronUp size={12} className="text-muted-foreground/50" />
            : <ChevronDown size={12} className="text-muted-foreground/50" />}
        </div>
      </div>

      {open && (
        <div className="px-4 pb-4 bg-muted/10 border-t border-border/30">
          <p className="text-[10px] font-mono text-muted-foreground/40 mt-3 mb-2">{skill.file}</p>
          <pre className="text-[12px] font-mono text-foreground/80 leading-relaxed whitespace-pre-wrap bg-muted/30 rounded-lg p-4 overflow-x-auto">
            {skill.promptContent}
          </pre>
        </div>
      )}
    </div>
  );
}

export default function SkillsPage() {
  const groups = groupSkills(pipelineSkills);

  return (
    <article>
      <p className="text-[13px] font-mono text-muted-foreground mb-3">Reference</p>
      <h1 className="text-[2rem] font-black tracking-tight leading-[1.15] mb-4">
        Skills library
      </h1>
      <p className="text-[16px] text-muted-foreground leading-relaxed mb-3">
        {pipelineSkills.length} Claude Code slash commands. Each is a markdown prompt file installed to{" "}
        <code className="font-mono text-[14px] bg-muted/60 px-1.5 py-0.5 rounded text-foreground">~/.claude/skills/</code>.
      </p>
      <p className="text-[14px] text-muted-foreground leading-relaxed mb-6">
        Install a skill with <code className="font-mono text-[13px] bg-muted/60 px-1.5 py-0.5 rounded text-foreground">npx systemix add figma</code>, or copy the prompt content below and save it as a <code className="font-mono text-[13px] bg-muted/60 px-1.5 py-0.5 rounded text-foreground">.md</code> file manually.
      </p>

      <div className="grid sm:grid-cols-2 gap-3 mb-10">
        <div className="rounded-xl border border-border/40 px-4 py-4 bg-muted/20">
          <p className="text-[11px] font-bold uppercase tracking-wide text-foreground/60 mb-1.5">Figma MCP</p>
          <p className="text-[12px] text-muted-foreground leading-relaxed">
            Figma write operations (token sync, image push) use the{" "}
            <span className="text-foreground font-medium">Figma Console MCP by TJ Pitre</span>.
            Read operations use the official Figma REST MCP.
          </p>
        </div>
        <div className="rounded-xl border border-border/40 px-4 py-4 bg-muted/20">
          <p className="text-[11px] font-bold uppercase tracking-wide text-foreground/60 mb-1.5">Hermes — local LLM author</p>
          <p className="text-[12px] text-muted-foreground leading-relaxed">
            <span className="text-foreground font-medium">Hermes</span> runs via Ollama (<code className="font-mono text-[11px] bg-muted/60 px-1 py-0.5 rounded text-foreground">hermes3</code>, local, no API key).
            It watches for CSS and Figma changes, authors MDX contract files, polls PostHog for experiment results, and writes evidence back into the contract. Skills are the manual trigger; <code className="font-mono text-[11px] bg-muted/60 px-1 py-0.5 rounded text-foreground">npx systemix watch</code> runs it continuously.
          </p>
        </div>
      </div>

      <hr className="border-border/40 mb-10" />

      {GROUP_ORDER.map(groupKey => {
        const meta = GROUP_META[groupKey];
        const skills = groups[groupKey];
        if (skills.length === 0) return null;
        const numbered = groupKey === "sync-loop";

        return (
          <section key={groupKey} className="mb-10">
            <h2 className="text-[1.1rem] font-bold tracking-tight mb-1">{meta.heading}</h2>
            <p className="text-[13px] text-muted-foreground mb-4">{meta.subtitle}</p>
            <div className="rounded-xl border border-border/40 overflow-hidden">
              {skills.map((skill, i) => (
                <SkillRow key={skill.command} skill={skill} index={i} numbered={numbered} />
              ))}
            </div>
          </section>
        );
      })}
    </article>
  );
}
