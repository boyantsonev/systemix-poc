"use client";

import { useState } from "react";
import { useTheme } from "next-themes";
import { pipelineSkills } from "@/lib/data/pipeline";
import {
  systemNodes,
  NODE_META,
  TYPE_LABEL,
  TYPE_COLOR_DARK,
  TYPE_COLOR_LIGHT,
  type NodeType,
} from "@/lib/data/system-graph";

const TYPE_NAME: Record<NodeType, string> = {
  source: "source",
  skill: "skill",
  agent: "agent",
  artifact: "artifact",
  infra: "infra",
  concept: "concept",
  tool: "tool",
};

function CopyBtn({ text, isDark }: { text: string; isDark: boolean }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-mono rounded border transition-colors ${
        isDark
          ? "border-white/10 text-white/40 hover:text-white/70 hover:border-white/20"
          : "border-border/50 text-muted-foreground hover:text-foreground hover:border-border"
      }`}
    >
      {copied ? "✓ copied" : "copy"}
    </button>
  );
}

/** Detail panel for a selected graph node. Used by the 3D Config-layer graph. */
export function NodeInfoPanel({ nodeId, onClose }: { nodeId: string; onClose: () => void }) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme !== "light";

  const node = systemNodes.find((n) => n.id === nodeId);
  const meta = NODE_META[nodeId];
  if (!node || !meta) return null;

  const { type, sub, label } = node;
  const col = (isDark ? TYPE_COLOR_DARK : TYPE_COLOR_LIGHT)[type];
  const skillPrompt = meta.command
    ? pipelineSkills.find((s) => s.command === meta.command)?.promptContent ?? meta.command
    : undefined;

  return (
    <div
      className="w-64 rounded-xl p-3.5"
      style={{
        background: isDark ? "rgba(8,8,22,0.92)" : "rgba(255,255,255,0.97)",
        backdropFilter: "blur(16px)",
        border: `1px solid ${col.stroke}40`,
        boxShadow: isDark ? undefined : "0 4px 20px rgba(0,0,0,0.08)",
      }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-2.5">
        <div className="flex items-start gap-2 min-w-0">
          <svg width={8} height={8} className="mt-1 shrink-0">
            <circle cx={4} cy={4} r={3.5} fill={col.fill} stroke={col.stroke} strokeWidth={1.5} />
          </svg>
          <div className="min-w-0">
            <p className={`text-[11px] font-mono font-semibold leading-tight ${isDark ? "text-white/80" : "text-foreground"}`}>
              {label}
            </p>
            {sub && (
              <p className={`text-[10px] font-mono mt-0.5 ${isDark ? "text-white/30" : "text-muted-foreground"}`}>
                {sub}
              </p>
            )}
            <p className="text-[9px] font-mono uppercase tracking-widest mt-0.5" style={{ color: col.stroke }}>
              {TYPE_NAME[type]} · {TYPE_LABEL[type]}
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className={`shrink-0 text-[11px] leading-none mt-0.5 p-1 -mr-1 -mt-0.5 transition-opacity ${
            isDark ? "text-white/20 hover:text-white/60" : "text-muted-foreground/40 hover:text-muted-foreground"
          }`}
          aria-label="Close"
        >
          ✕
        </button>
      </div>

      {/* Description */}
      <p className={`text-[11px] leading-relaxed font-mono mb-3 ${isDark ? "text-white/45" : "text-muted-foreground"}`}>
        {meta.desc}
      </p>

      {/* Command copy (skills only) */}
      {meta.command && (
        <div
          className={`flex items-center gap-2 mb-2.5 p-2 rounded-lg border ${
            isDark ? "border-white/6 bg-white/3" : "border-border/40 bg-muted/30"
          }`}
        >
          <code className="text-[11px] font-mono flex-1" style={{ color: col.text }}>
            {meta.command}
          </code>
          <CopyBtn text={skillPrompt ?? meta.command} isDark={isDark} />
        </div>
      )}

      {/* Doc links */}
      {meta.docHrefs && meta.docHrefs.length > 0 && (
        <div className="flex flex-col gap-1">
          {meta.docHrefs.map(({ label: linkLabel, href }) => (
            <a
              key={href}
              href={href}
              className={`text-[10px] font-mono transition-colors ${
                isDark ? "text-white/25 hover:text-white/55" : "text-muted-foreground/50 hover:text-muted-foreground"
              }`}
            >
              {linkLabel}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
