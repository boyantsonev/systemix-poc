"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Copy, Check } from "lucide-react";
import { pipelineSkills } from "@/lib/data/pipeline";
import type { Skill, SkillGroup } from "@/lib/types/skill";

const GROUP_META: Record<SkillGroup, { heading: string; subtitle: string }> = {
  "the-loop":     { heading: "The loop",      subtitle: "Hypothesis validation — from idea to measured decision. The primary workflow. Install: npx systemix workflow add hypothesis-validation"  },
  "design-system":{ heading: "Design system", subtitle: "Figma↔code sync for founders who want drift detection alongside hypothesis validation"             },
  "deploy":       { heading: "Deploy",        subtitle: "Build, deploy, and annotate experiments on Vercel"                 },
  "utilities":    { heading: "Utilities",     subtitle: "Lower-level helpers for contract management and PostHog querying"                                     },
};

const GROUP_ORDER: SkillGroup[] = ["the-loop", "design-system", "deploy", "utilities"];

const LOOP_STEPS = ["/hypothesis", "/measure", "/experiment", "/evidence", "/hermes"] as const;

type Tab = "all" | SkillGroup;

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

function LoopStepBar() {
  return (
    <div className="mb-5 flex items-center gap-1.5 flex-wrap">
      {LOOP_STEPS.map((cmd, i) => (
        <div key={cmd} className="flex items-center gap-1.5">
          <code className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded text-[11px] font-mono font-bold">
            {cmd}
          </code>
          {i < LOOP_STEPS.length - 1 && (
            <span className="text-muted-foreground/40 text-[11px]">→</span>
          )}
        </div>
      ))}
    </div>
  );
}

function SkillSection({ groupKey, skills }: { groupKey: SkillGroup; skills: Skill[] }) {
  if (skills.length === 0) return null;
  const meta = GROUP_META[groupKey];
  const numbered = groupKey === "the-loop";

  return (
    <section className="mb-10">
      <h2 className="text-[1.1rem] font-bold tracking-tight mb-1">{meta.heading}</h2>
      <p className="text-[13px] text-muted-foreground mb-4">{meta.subtitle}</p>
      {groupKey === "the-loop" && <LoopStepBar />}
      <div className="rounded-xl border border-border/40 overflow-hidden">
        {skills.map((skill, i) => (
          <SkillRow key={skill.command} skill={skill} index={i} numbered={numbered} />
        ))}
      </div>
    </section>
  );
}

export default function SkillsPage() {
  const [activeTab, setActiveTab] = useState<Tab>("the-loop");

  const byGroup = GROUP_ORDER.reduce<Record<SkillGroup, Skill[]>>((acc, g) => {
    acc[g] = pipelineSkills.filter(s => s.group === g);
    return acc;
  }, { "the-loop": [], "design-system": [], "deploy": [], "utilities": [] });

  const tabs: { id: Tab; label: string; count: number }[] = [
    { id: "the-loop",      label: "The loop",      count: byGroup["the-loop"].length      },
    { id: "design-system", label: "Design system", count: byGroup["design-system"].length },
    { id: "deploy",        label: "Deploy",         count: byGroup["deploy"].length        },
    { id: "utilities",     label: "Utilities",      count: byGroup["utilities"].length     },
    { id: "all",           label: "All",            count: pipelineSkills.length           },
  ];

  return (
    <article>
      <p className="text-[13px] font-mono text-muted-foreground mb-3">Reference</p>
      <h1 className="text-[2rem] font-black tracking-tight leading-[1.15] mb-4">
        Skills library
      </h1>
      <p className="text-[16px] text-muted-foreground leading-relaxed mb-3">
        {pipelineSkills.length} Claude Code slash commands. Each is a markdown prompt file installed to{" "}
        <code className="font-mono text-[14px] bg-muted/60 px-1.5 py-0.5 rounded text-foreground">.claude/skills/</code>.
      </p>
      <p className="text-[14px] text-muted-foreground leading-relaxed mb-4">
        Start with the hypothesis-validation workflow — it covers the full founder loop from writing an experiment to closing it with evidence. Install with{" "}
        <code className="font-mono text-[13px] bg-muted/60 px-1.5 py-0.5 rounded text-foreground">npx systemix workflow add hypothesis-validation</code>.
        Or copy any prompt below and save it as a <code className="font-mono text-[13px] bg-muted/60 px-1.5 py-0.5 rounded text-foreground">.md</code> file manually.
      </p>
      <div className="rounded-xl border border-border/40 bg-muted/10 px-4 py-3 mb-8 flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-mono text-muted-foreground/50 uppercase tracking-widest mb-1.5">Available workflows</p>
          <div className="space-y-1">
            <div className="flex items-baseline gap-2 text-[12px]">
              <code className="font-mono text-foreground/70 shrink-0">hypothesis-validation</code>
              <span className="text-muted-foreground/60">— /init-experiment · /growth-audit · /write-variants · /close-experiment — <strong className="text-foreground/60">start here</strong></span>
            </div>
            <div className="flex items-baseline gap-2 text-[12px]">
              <code className="font-mono text-foreground/70 shrink-0">design-system</code>
              <span className="text-muted-foreground/60">— /figma · /tokens · /sync-to-figma · /drift-report · /check-parity · /contract-query</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex items-center gap-1 mb-8 border-b border-border/40 overflow-x-auto">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-3 py-2 text-[12px] font-medium whitespace-nowrap border-b-2 -mb-px transition-colors ${
              activeTab === tab.id
                ? "border-foreground text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground/70"
            }`}
          >
            {tab.label}
            <span className={`text-[10px] font-mono tabular-nums ${
              activeTab === tab.id ? "text-foreground/60" : "text-muted-foreground/40"
            }`}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {activeTab === "all"
        ? GROUP_ORDER.map(g => (
            <SkillSection key={g} groupKey={g} skills={byGroup[g]} />
          ))
        : <SkillSection groupKey={activeTab as SkillGroup} skills={byGroup[activeTab as SkillGroup]} />
      }
    </article>
  );
}
