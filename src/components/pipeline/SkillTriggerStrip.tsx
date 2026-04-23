"use client";
import { useState } from "react";
import { Copy, Check } from "lucide-react";

const QUICK_COMMANDS = [
  { command: "/design-to-code", label: "Full workflow" },
  { command: "/tokens", label: "Sync tokens" },
  { command: "/drift-report", label: "Drift report" },
  { command: "/sync", label: "Sync" },
  { command: "/component", label: "Generate component" },
];

export function SkillTriggerStrip() {
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null);

  const copy = (cmd: string) => {
    navigator.clipboard.writeText(cmd);
    setCopiedCmd(cmd);
    setTimeout(() => setCopiedCmd(null), 1500);
  };

  return (
    <div className="mb-6">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60 mb-2">
        Run in Claude Code
      </p>
      <div className="flex flex-wrap gap-2">
        {QUICK_COMMANDS.map(({ command, label }) => (
          <button
            key={command}
            onClick={() => copy(command)}
            className="h-8 px-3 text-[11px] font-mono border border-border/60 rounded-md bg-transparent hover:bg-muted/60 transition-colors inline-flex items-center gap-1.5"
          >
            <span>{command}</span>
            {copiedCmd === command ? (
              <Check className="size-3 text-[--color-synced]" />
            ) : (
              <Copy className="size-3 text-muted-foreground/40" />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
