"use client";

import { useState } from "react";
import { AppShell } from "@/components/systemix/AppShell";
import { SectionHeading } from "@/components/docs/SectionHeading";
import { RoleSetupTabs } from "@/components/pipeline/RoleSetupTabs";
import type { AnchorItem } from "@/components/systemix/RightAnchorNav";

type RoleId = "developer" | "designer" | "product";

const ANCHOR_ITEMS: Record<RoleId, AnchorItem[]> = {
  developer: [
    { id: "dev-step-1", label: "Install Claude Code"       },
    { id: "dev-step-2", label: "Figma Desktop + Plugin"    },
    { id: "dev-step-3", label: "Figma Access Token"        },
    { id: "dev-step-4", label: "Add MCP to Claude"         },
    { id: "dev-step-5", label: "Verify Connection"         },
    { id: "dev-step-6", label: "Install Skills"            },
    { id: "dev-step-7", label: "Configure Sub-Agents"      },
    { id: "dev-step-8", label: "Run First Workflow"        },
  ],
  designer: [
    { id: "des-step-1", label: "Install Figma Desktop"    },
    { id: "des-step-2", label: "Bridge Plugin"            },
    { id: "des-step-3", label: "Token Structure"          },
    { id: "des-step-4", label: "Share File URL"           },
    { id: "des-step-5", label: "What the Pipeline Does"   },
  ],
  product: [
    { id: "prod-step-1", label: "Approve Changes"      },
    { id: "prod-step-2", label: "Token & Drift Health"  },
  ],
};

export default function SetupPage() {
  const [role, setRole] = useState<RoleId>("developer");

  return (
    <AppShell anchorItems={ANCHOR_ITEMS[role]}>
      <SectionHeading accent="#6366f1">Setup Guide</SectionHeading>
      <p className="text-muted-foreground mb-8 leading-relaxed max-w-prose">
        Step-by-step setup for every role. Select your role below — each guide covers exactly
        what you need, nothing more.
      </p>
      <RoleSetupTabs onRoleChange={setRole} />
    </AppShell>
  );
}
