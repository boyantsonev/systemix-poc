"use client";

import { useState } from "react";
import { AppShell } from "@/components/systemix/AppShell";
import { SectionHeading } from "@/components/docs/SectionHeading";
import { CodeInline } from "@/components/docs/CodeInline";
import { Card, CardContent } from "@/components/ui/card";
import { ExternalLink, Settings } from "lucide-react";
import type { AnchorItem } from "@/components/systemix/RightAnchorNav";

const anchorItems: AnchorItem[] = [
  { id: "connections", label: "Connections" },
];

export default function AdminPage() {
  const [figmaUrl, setFigmaUrl] = useState("https://figma.com/design/Xk9p2mAbCdEfGh/Design-System");
  const [githubRepo, setGithubRepo] = useState("acme-corp/design-system");
  const [saved, setSaved] = useState(false);

  function handleSave() {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <AppShell anchorItems={anchorItems}>
      <div className="flex items-center gap-3 mb-1">
        <Settings size={18} className="text-muted-foreground" />
        <SectionHeading accent="#6366f1">Admin</SectionHeading>
      </div>
      <p className="text-muted-foreground mb-8 leading-relaxed max-w-prose">
        Configure the Figma file and GitHub repo that skills use by default.
      </p>

      {/* ── Connections ── */}
      <section id="connections">
        <h2 className="text-sm font-semibold text-foreground mb-4">Connections</h2>
        <Card>
          <CardContent className="pt-5 pb-5 space-y-5">
            {/* Figma URL */}
            <div>
              <label className="text-xs font-semibold text-foreground block mb-1.5">
                Figma file URL
              </label>
              <p className="text-xs text-muted-foreground mb-2">
                The main design system file. Skills like{" "}
                <CodeInline>/sync-tokens</CodeInline> and{" "}
                <CodeInline>/generate-from-figma</CodeInline> use this as the default source.
              </p>
              <div className="flex gap-2">
                <input
                  type="url"
                  value={figmaUrl}
                  onChange={(e) => setFigmaUrl(e.target.value)}
                  className="flex-1 text-sm bg-muted border border-border rounded-lg px-3 py-2 text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-ring font-mono"
                  placeholder="https://figma.com/design/..."
                />
                <a
                  href={figmaUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground border border-border rounded-lg px-3 py-2 transition-colors"
                >
                  <ExternalLink size={12} />
                  Open
                </a>
              </div>
            </div>

            {/* GitHub repo */}
            <div>
              <label className="text-xs font-semibold text-foreground block mb-1.5">
                GitHub repository
              </label>
              <p className="text-xs text-muted-foreground mb-2">
                The codebase where components and tokens live.{" "}
                <CodeInline>/drift-report</CodeInline> and{" "}
                <CodeInline>/generate-from-figma</CodeInline> write files here.
              </p>
              <input
                type="text"
                value={githubRepo}
                onChange={(e) => setGithubRepo(e.target.value)}
                className="w-full text-sm bg-muted border border-border rounded-lg px-3 py-2 text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-ring font-mono"
                placeholder="owner/repo"
              />
            </div>

            <div className="pt-1">
              <button
                onClick={handleSave}
                className="text-sm font-semibold bg-foreground text-background px-4 py-2 rounded-lg hover:opacity-90 transition-opacity"
              >
                {saved ? "Saved" : "Save changes"}
              </button>
              <p className="text-xs text-muted-foreground mt-2">
                In production, these would be stored in <CodeInline>~/.claude/systemix.json</CodeInline> and
                read by skills at runtime.
              </p>
            </div>
          </CardContent>
        </Card>
      </section>
    </AppShell>
  );
}
