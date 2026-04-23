"use client";

import { useState } from "react";
import { AppShell } from "@/components/systemix/AppShell";
import { FigmaSyncBanner } from "@/components/tokens/FigmaSyncBanner";
import { TokenTable } from "@/components/tokens/TokenTable";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { tokenRegistry, type TokenCollection } from "@/lib/data/tokens";
import type { AnchorItem } from "@/components/systemix/RightAnchorNav";

const anchorItems: AnchorItem[] = [
  { id: "sync",   label: "Sync Status" },
  { id: "tokens", label: "Tokens"      },
];

const collections: { key: TokenCollection | "all"; label: string }[] = [
  { key: "all",    label: "All"    },
  { key: "color",  label: "Color"  },
  { key: "status", label: "Status" },
  { key: "radius", label: "Radius" },
];

export default function TokensPage() {
  const [tab, setTab] = useState<string>("all");

  const filtered =
    tab === "all"
      ? tokenRegistry.tokens
      : tokenRegistry.tokens.filter((t) => t.collection === tab);

  return (
    <AppShell anchorItems={anchorItems}>

      <h1 className="text-2xl font-black text-foreground mb-1">Tokens</h1>
      <p className="text-sm text-muted-foreground mb-6 max-w-prose">
        31 design tokens sourced from{" "}
        <code className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded text-foreground">globals.css</code>{" "}
        and converted to Figma-ready hex via{" "}
        <code className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded text-foreground">npm run tokens</code>.
        Run{" "}
        <code className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded text-foreground">/sync-to-figma</code>{" "}
        to create these as Figma Variables (Light + Dark modes) in the Token Bridge file.
      </p>

      <section id="sync">
        <FigmaSyncBanner />
      </section>

      <section id="tokens">
        <Tabs defaultValue="all" onValueChange={setTab}>
          <TabsList className="mb-4">
            {collections.map(({ key, label }) => (
              <TabsTrigger key={key} value={key}>
                {label}
                <span className="ml-1.5 text-muted-foreground text-xs">
                  {key === "all"
                    ? tokenRegistry.tokens.length
                    : tokenRegistry.tokens.filter((t) => t.collection === key).length}
                </span>
              </TabsTrigger>
            ))}
          </TabsList>

          {collections.map(({ key }) => (
            <TabsContent key={key} value={key}>
              <TokenTable
                tokens={
                  key === "all"
                    ? tokenRegistry.tokens
                    : tokenRegistry.tokens.filter((t) => t.collection === key)
                }
              />
            </TabsContent>
          ))}
        </Tabs>
      </section>

    </AppShell>
  );
}
