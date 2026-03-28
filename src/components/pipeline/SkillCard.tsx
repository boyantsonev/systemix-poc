"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Terminal } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CopyButton } from "./CopyButton";
import type { Skill } from "@/lib/data/pipeline";

type SkillCardProps = { skill: Skill };

export function SkillCard({ skill }: SkillCardProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1.5">
              <code className="bg-violet-500/10 text-violet-700 dark:text-violet-300 border border-violet-200 dark:border-violet-800 px-2 py-0.5 rounded text-xs font-mono font-semibold">
                {skill.command}
              </code>
              {skill.triggersAgent && (
                <span className="text-muted-foreground/60 text-xs flex items-center gap-1">
                  → <Badge variant="outline" className="text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800 text-xs font-mono px-1.5 py-0">
                    {skill.triggersAgent}
                  </Badge>
                </span>
              )}
            </div>
            <p className="text-muted-foreground text-xs leading-relaxed">{skill.description}</p>
          </div>
          <CopyButton text={skill.promptContent} label="Copy prompt" />
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {/* File path bar */}
        <div className="flex items-center justify-between px-3 py-1.5 bg-muted rounded-t-lg border border-border border-b-0">
          <div className="flex items-center gap-1.5">
            <Terminal size={11} className="text-muted-foreground/60" />
            <span className="text-muted-foreground/60 text-xs font-mono">{skill.file}</span>
          </div>
          <span className="text-muted-foreground/40 text-xs">markdown</span>
        </div>

        {/* Prompt content */}
        <div className="relative border border-border rounded-b-lg overflow-hidden">
          <pre
            className={`text-xs font-mono text-foreground bg-muted p-4 overflow-x-auto leading-relaxed whitespace-pre-wrap transition-all ${
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
            className="w-full flex items-center justify-center gap-1.5 py-2 text-xs text-muted-foreground hover:text-foreground bg-muted border-t border-border transition-colors"
          >
            {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            {expanded ? "Show less" : "Show full prompt"}
          </button>
        </div>
      </CardContent>
    </Card>
  );
}
