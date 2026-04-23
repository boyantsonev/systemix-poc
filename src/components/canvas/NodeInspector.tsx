"use client";

import { X, Copy, Check, Eye, Settings } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import type { SkillNodeData } from "./SkillNode";

type NodeInspectorProps = {
  node: { id: string; data: SkillNodeData } | null;
  onClose: () => void;
  onUpdate: (id: string, patch: Partial<SkillNodeData>) => void;
};

function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={async () => { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className="p-1 rounded text-muted-foreground hover:text-foreground transition-colors"
    >
      {copied ? <Check size={12} className="text-teal-500" /> : <Copy size={12} />}
    </button>
  );
}

function SectionLabel({ icon, label, sub, variant = "default" }: {
  icon: React.ReactNode;
  label: string;
  sub?: string;
  variant?: "default" | "canvas-only" | "real";
}) {
  return (
    <div className={cn(
      "flex items-center gap-1.5 px-2 py-1 rounded-md mb-2",
      variant === "canvas-only" && "bg-blue-500/5 border border-blue-500/10",
      variant === "real" && "bg-teal-500/5 border border-teal-500/10",
    )}>
      <span className={cn(
        "flex-shrink-0",
        variant === "canvas-only" ? "text-blue-400/60" : variant === "real" ? "text-teal-400/60" : "text-muted-foreground/40",
      )}>
        {icon}
      </span>
      <div className="min-w-0">
        <p className={cn(
          "text-[10px] font-black tracking-widest uppercase",
          variant === "canvas-only" ? "text-blue-400/70" : variant === "real" ? "text-teal-400/70" : "text-muted-foreground/60",
        )}>
          {label}
        </p>
        {sub && <p className="text-[10px] text-muted-foreground/50 leading-snug">{sub}</p>}
      </div>
    </div>
  );
}

export function NodeInspector({ node, onClose, onUpdate }: NodeInspectorProps) {
  if (!node) return null;
  const d = node.data;
  const skillSlug = d.command.replace("/", "").split(" ")[0];
  const skillPath = `~/.claude/skills/${skillSlug}/SKILL.md`;

  return (
    <aside className="w-72 flex-shrink-0 border-l border-border bg-card flex flex-col h-full overflow-hidden">

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div>
          <code className="font-mono text-sm font-semibold text-teal-400">{d.command}</code>
          <p className="text-xs text-muted-foreground mt-0.5">{d.name}</p>
        </div>
        <button onClick={onClose} className="p-1 rounded text-muted-foreground hover:text-foreground">
          <X size={14} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-5">

        {/* ── Canvas-only section ── */}
        <div>
          <SectionLabel
            icon={<Eye size={10} />}
            label="Canvas preview"
            sub="Visual only — changes do not affect real execution"
            variant="canvas-only"
          />

          {/* Simulated status */}
          <div className="mb-3">
            <p className="text-[10px] text-muted-foreground/50 mb-1.5 px-1">Preview node state</p>
            <div className="flex flex-wrap gap-1">
              {(["idle", "running", "success", "error", "awaiting"] as SkillNodeData["status"][]).map(s => (
                <button
                  key={s}
                  onClick={() => onUpdate(node.id, { status: s })}
                  className={cn(
                    "text-[10px] font-mono px-2 py-0.5 rounded border transition-colors",
                    d.status === s
                      ? "bg-blue-500/10 text-blue-400 border-blue-500/30"
                      : "text-muted-foreground border-border hover:border-border/80",
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── Real config section ── */}
        <div>
          <SectionLabel
            icon={<Settings size={10} />}
            label="Workflow config"
            sub="Saved to your workflow — affects real execution"
            variant="real"
          />

          {/* HITL toggle */}
          <div className="mb-4">
            <p className="text-xs font-semibold text-foreground/80 mb-1 px-1">Approval gate</p>
            <p className="text-[11px] text-muted-foreground/60 mb-2 px-1">
              When enabled, Claude pauses here and waits for your <code className="font-mono text-[10px]">approve</code> or <code className="font-mono text-[10px]">reject</code> before continuing.
            </p>
            <button
              onClick={() => onUpdate(node.id, { hitl: !d.hitl })}
              className={cn(
                "flex items-center gap-2.5 w-full px-3 py-2 rounded-lg border text-xs transition-colors",
                d.hitl
                  ? "bg-amber-500/10 border-amber-500/30 text-amber-400"
                  : "border-border text-muted-foreground hover:text-foreground",
              )}
            >
              <div className={cn("w-3 h-3 rounded-full border-2 transition-colors flex-shrink-0", d.hitl ? "bg-amber-400 border-amber-400" : "border-muted-foreground/30")} />
              {d.hitl ? "Pauses for approval" : "Runs automatically"}
            </button>
          </div>

          {/* MCP */}
          <div className="mb-4">
            <p className="text-xs font-semibold text-foreground/80 mb-1 px-1">Figma access required</p>
            <p className="text-[11px] text-muted-foreground/60 mb-2 px-1">Which MCP server this skill uses at runtime</p>
            <div className="flex flex-col gap-1">
              {([
                { value: "none",     label: "None",              sub: "reads/writes code only" },
                { value: "official", label: "Figma REST API",    sub: "read design context, tokens" },
                { value: "console",  label: "Figma Plugin API",  sub: "write variables, capture frames" },
                { value: "both",     label: "Both APIs",         sub: "full read + write" },
              ] as { value: SkillNodeData["mcp"]; label: string; sub: string }[]).map(({ value, label, sub }) => (
                <button
                  key={value}
                  onClick={() => onUpdate(node.id, { mcp: value })}
                  className={cn(
                    "flex items-center gap-2 w-full text-left px-2.5 py-1.5 rounded-lg border text-xs transition-colors",
                    d.mcp === value
                      ? "bg-teal-500/10 border-teal-500/30 text-teal-400"
                      : "border-border text-muted-foreground hover:text-foreground hover:border-border/80",
                  )}
                >
                  <div className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", d.mcp === value ? "bg-teal-400" : "bg-muted-foreground/30")} />
                  <span className="font-semibold text-[11px]">{label}</span>
                  <span className="text-[10px] text-muted-foreground/50 ml-auto">{sub}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Skill file */}
          <div>
            <p className="text-xs font-semibold text-foreground/80 mb-1 px-1">Skill file on disk</p>
            <p className="text-[11px] text-muted-foreground/60 mb-2 px-1">
              This is the SKILL.md Claude Code reads when you run this command.
            </p>
            <div className="flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-2">
              <code className="flex-1 text-[10px] font-mono text-muted-foreground break-all">{skillPath}</code>
              <CopyBtn text={skillPath} />
            </div>
          </div>
        </div>

        {/* Description */}
        <div>
          <p className="text-[10px] font-black tracking-widest uppercase text-muted-foreground/40 mb-1.5">About</p>
          <p className="text-xs text-muted-foreground leading-relaxed">{d.description}</p>
        </div>

      </div>
    </aside>
  );
}
