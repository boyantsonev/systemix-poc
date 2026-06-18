import { DocsLayout as FumaDocsLayout } from "fumadocs-ui/layouts/docs";
import { RootProvider } from "fumadocs-ui/provider/next";
import type { ReactNode } from "react";
import { experimentsSource } from "@/lib/experiments-source";

// The loop layer — the experiments/* records + goals/, rendered with the same
// Fumadocs shell + shared theme as /contract and /docs.
export default function ExperimentsLayout({ children }: { children: ReactNode }) {
  return (
    <RootProvider
      theme={{ enabled: false }}
      search={{ options: { api: "/api/system-search" } }}
    >
      <FumaDocsLayout
        tree={experimentsSource.pageTree}
        nav={{ title: "systemix loop" }}
        links={[
          { text: "Home", url: "/config" },
          { text: "Contract", url: "/contract" },
        ]}
      >
        {children}
      </FumaDocsLayout>
    </RootProvider>
  );
}
