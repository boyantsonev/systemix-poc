import { Zap, RefreshCw, AlertTriangle, Paintbrush } from "lucide-react";

const actions = [
  {
    command: "/figma",
    label: "Extract from Figma",
    desc: "Pull design context from a Figma node",
    icon: Zap,
    agent: "figma-to-code",
  },
  {
    command: "/tokens",
    label: "Sync Tokens",
    desc: "Diff Figma variables against globals.css",
    icon: RefreshCw,
    agent: "token-sync",
  },
  {
    command: "/drift-report",
    label: "Drift Report",
    desc: "Audit components for design-code drift",
    icon: AlertTriangle,
    agent: "design-drift-detector",
  },
  {
    command: "/apply-theme",
    label: "Apply Theme",
    desc: "Rebrand via token overrides only",
    icon: Paintbrush,
    agent: "component-themer",
  },
];

export function QuickActions() {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/60 mb-2">
        Quick Actions
      </p>
      <div className="flex flex-wrap gap-2">
        {actions.map(({ command, label, icon: Icon, agent }) => (
          <button
            key={command}
            className="h-8 px-3 text-[12px] font-medium rounded-md border border-border/60 bg-transparent hover:bg-muted/60 transition-colors inline-flex items-center gap-2 cursor-pointer"
            title={`${label} — ${agent}`}
          >
            <Icon className="size-3.5 text-muted-foreground" />
            <code className="font-mono text-muted-foreground">{command}</code>
          </button>
        ))}
      </div>
    </div>
  );
}
