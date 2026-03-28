import { Card, CardContent } from "@/components/ui/card";
import { Zap, RefreshCw, AlertTriangle, Paintbrush } from "lucide-react";

const actions = [
  {
    command: "/generate-from-figma",
    label: "Generate Component",
    desc: "Turn a Figma node into production code",
    icon: Zap,
    agent: "figma-to-code",
  },
  {
    command: "/sync-tokens",
    label: "Sync Tokens",
    desc: "Pull latest Figma variables to codebase",
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
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      {actions.map(({ command, label, desc, icon: Icon, agent }) => (
        <Card key={command} className="hover:bg-accent transition-colors cursor-pointer">
          <CardContent className="pt-4 pb-4">
            <Icon size={16} className="text-muted-foreground mb-3" />
            <code className="text-xs font-mono text-muted-foreground block mb-1.5">{command}</code>
            <div className="font-medium text-foreground text-sm mb-1">{label}</div>
            <div className="text-muted-foreground text-xs leading-relaxed mb-2">{desc}</div>
            <div className="text-muted-foreground text-xs border-t border-border pt-2 mt-2">
              {agent}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
