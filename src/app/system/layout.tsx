import { DocsLayout as FumaDocsLayout } from "fumadocs-ui/layouts/docs";
import { RootProvider } from "fumadocs-ui/provider/next";
import type { ReactNode } from "react";
import { systemSource } from "@/lib/system-source";

// The in-app System layer — the living styleguide over contract/*, rendered with
// the same Fumadocs shell + shared theme as /docs. Theme defers to next-themes
// (app root). Search is scoped to the System index (src/app/api/system-search)
// so it returns tokens / components / hypotheses, not marketing docs.
export default function SystemLayout({ children }: { children: ReactNode }) {
  return (
    <RootProvider
      theme={{ enabled: false }}
      search={{ options: { api: "/api/system-search" } }}
    >
      <FumaDocsLayout tree={systemSource.pageTree} nav={{ title: "systemix system" }}>
        {children}
      </FumaDocsLayout>
    </RootProvider>
  );
}
