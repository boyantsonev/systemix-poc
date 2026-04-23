"use client";

import { cn } from "@/lib/utils";
import { pipelineSkills } from "@/lib/data/pipeline";

export type LibrarySkill = {
  command: string;
  name: string;
  description: string;
  mcp: "official" | "console" | "both" | "none";
  group: "pipeline" | "tools";
};

const MCP_MAP: Record<string, LibrarySkill["mcp"]> = {
  "/figma":           "official",
  "/tokens":          "official",
  "/component":       "official",
  "/storybook":       "none",
  "/deploy":          "none",
  "/sync-to-figma":   "console",
  "/figma-push":      "console",
  "/figma-inspect":   "official",
  "/sync":            "both",
  "/design-to-code":  "official",
  "/drift-report":    "none",
  "/apply-theme":     "official",
  "/connect":         "official",
  "/check-parity":    "official",
  "/deploy-annotate": "both",
  "/sync-docs":       "none",
};

const PIPELINE_COMMANDS = ["/figma", "/tokens", "/component", "/storybook", "/deploy"];

const LIBRARY: LibrarySkill[] = pipelineSkills.map(s => {
  const cmd = s.command.split(" ")[0];
  return {
    command: cmd,
    name: s.name,
    description: s.description,
    mcp: MCP_MAP[cmd] ?? "none",
    group: PIPELINE_COMMANDS.includes(cmd) ? "pipeline" : "tools",
  };
});

type SkillLibraryProps = {
  onAdd: (skill: LibrarySkill) => void;
};

export function SkillLibrary({ onAdd }: SkillLibraryProps) {
  const pipeline = LIBRARY.filter(s => s.group === "pipeline");
  const tools = LIBRARY.filter(s => s.group === "tools");

  return (
    <aside className="w-56 flex-shrink-0 border-r border-border bg-card flex flex-col h-full overflow-hidden">
      <div className="px-3 py-3 border-b border-border">
        <p className="text-xs font-black tracking-widest uppercase text-muted-foreground/70 mb-0.5">Skills</p>
        <p className="text-[11px] text-muted-foreground/50">Click to add to workflow</p>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-4">

        <div>
          <p className="text-[10px] font-black tracking-widest uppercase text-teal-500/60 px-2 mb-1.5">Workflow</p>
          {pipeline.map(skill => (
            <SkillLibraryItem key={skill.command} skill={skill} onAdd={onAdd} />
          ))}
        </div>

        <div>
          <p className="text-[10px] font-black tracking-widest uppercase text-violet-500/60 px-2 mb-1.5">Tools</p>
          {tools.map(skill => (
            <SkillLibraryItem key={skill.command} skill={skill} onAdd={onAdd} />
          ))}
        </div>

      </div>
    </aside>
  );
}

function SkillLibraryItem({ skill, onAdd }: { skill: LibrarySkill; onAdd: (s: LibrarySkill) => void }) {
  return (
    <button
      onClick={() => onAdd(skill)}
      className="w-full text-left px-2 py-2 rounded-md hover:bg-muted/50 transition-colors"
    >
      <code className={cn(
        "font-mono text-xs font-semibold block mb-0.5",
        skill.group === "pipeline" ? "text-teal-400" : "text-violet-400",
      )}>
        {skill.command}
      </code>
      <p className="text-[11px] text-muted-foreground leading-snug line-clamp-1">
        {skill.description}
      </p>
    </button>
  );
}
