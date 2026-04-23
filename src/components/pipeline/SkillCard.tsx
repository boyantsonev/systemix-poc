"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Terminal } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { CopyButton } from "./CopyButton";
import type { Skill } from "@/lib/data/pipeline";

// Map agent names to CSS token names
const AGENT_TOKEN: Record<string, string> = {
  "figma-to-code":          "--agent-ada",
  "token-sync":             "--agent-flux",
  "design-drift-detector":  "--agent-scout",
  "component-themer":       "--agent-prism",
  "doc-sync":               "--agent-echo",
  "storybook-agent":        "--agent-sage",
  "deploy-agent":           "--agent-ship",
};

type SkillCardProps = { skill: Skill };

export function SkillCard({ skill }: SkillCardProps) {
  const [expanded, setExpanded] = useState(false);

  const agentToken = skill.triggersAgent ? (AGENT_TOKEN[skill.triggersAgent] ?? "--agent-ship") : null;

  return (
    <Card className="rounded-md border border-border/60 bg-card hover:border-border transition-colors shadow-none">
      <CardHeader className="pb-2 pt-3 px-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1.5">
              <code className="text-[11px] font-mono font-semibold text-foreground bg-muted px-1.5 py-0.5 rounded border border-border/60">
                {skill.command}
              </code>
              {skill.triggersAgent && agentToken && (
                <span className="text-muted-foreground/50 text-[10px]">
                  →
                </span>
              )}
              {skill.triggersAgent && agentToken && (
                <span
                  className="text-[10px] font-medium font-mono"
                  style={{ color: `var(${agentToken})` }}
                >
                  {skill.triggersAgent}
                </span>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-2">{skill.description}</p>
          </div>
          <CopyButton text={skill.promptContent} label="Copy prompt" />
        </div>
      </CardHeader>
      <CardContent className="pt-0 px-3 pb-3">
        {/* File path bar */}
        <div className="flex items-center justify-between px-3 py-1.5 bg-muted rounded-t-md border border-border/60 border-b-0">
          <div className="flex items-center gap-1.5">
            <Terminal size={10} className="text-muted-foreground/50" />
            <span className="text-[10px] font-mono text-muted-foreground/50">{skill.file}</span>
          </div>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded border border-border/60 bg-muted text-muted-foreground">
            markdown
          </span>
        </div>

        {/* Prompt content */}
        <div className="relative border border-border/60 rounded-b-md overflow-hidden">
          <pre
            className={`text-[11px] font-mono text-foreground bg-muted p-3 overflow-x-auto leading-relaxed whitespace-pre-wrap transition-all ${
              expanded ? "max-h-none" : "max-h-52 overflow-y-hidden"
            }`}
          >
            {skill.promptContent}
          </pre>

          {/* Fade + expand */}
          {!expanded && (
            <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-muted to-transparent pointer-events-none" />
          )}
          <button
            onClick={() => setExpanded(!expanded)}
            className="w-full flex items-center justify-center gap-1.5 py-1.5 text-[11px] text-muted-foreground hover:text-foreground bg-muted border-t border-border/60 transition-colors"
          >
            {expanded ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
            {expanded ? "Show less" : "Show full prompt"}
          </button>
        </div>
      </CardContent>
    </Card>
  );
}
