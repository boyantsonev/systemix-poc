"use client";

import { useState } from "react";
import { AppShell } from "@/components/systemix/AppShell";
import { SectionHeading } from "@/components/docs/SectionHeading";
import { FigmaSyncBanner } from "@/components/tokens/FigmaSyncBanner";
import { TokenTable } from "@/components/tokens/TokenTable";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { tokenRegistry, type TokenCollection } from "@/lib/data/tokens";
import type { AnchorItem } from "@/components/systemix/RightAnchorNav";

const anchorItems: AnchorItem[] = [
  { id: "sync", label: "Sync Status" },
  { id: "color", label: "Color Tokens" },
  { id: "spacing", label: "Spacing" },
  { id: "typography", label: "Typography" },
  { id: "radius", label: "Radius" },
];

const collections: { key: TokenCollection | "all"; label: string }[] = [
  { key: "all", label: "All" },
  { key: "color", label: "Color" },
  { key: "spacing", label: "Spacing" },
  { key: "typography", label: "Typography" },
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
      <section id="sync">
        <SectionHeading accent="#a855f7">Token Explorer</SectionHeading>
        <FigmaSyncBanner />
      </section>

      <section id="color">
        <Tabs defaultValue="all" onValueChange={setTab}>
          <TabsList className="mb-6">
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
              <TokenTable tokens={key === "all" ? tokenRegistry.tokens : tokenRegistry.tokens.filter(t => t.collection === key)} />
            </TabsContent>
          ))}
        </Tabs>
      </section>
    </AppShell>
  );
}
