import { DocsLayout as FumaDocsLayout } from "fumadocs-ui/layouts/docs";
import { RootProvider } from "fumadocs-ui/provider/next";
import type { ReactNode } from "react";
import { contractSource } from "@/lib/contract-source";

// The in-app Contract layer — the living agreement over contract/*, rendered
// with the same Fumadocs shell + shared theme as /docs. Theme defers to
// next-themes (app root). Search is scoped to the contract index
// (src/app/api/system-search) so it returns hypotheses / tokens / components,
// not marketing docs.
export default function ContractLayout({ children }: { children: ReactNode }) {
  return (
    <RootProvider
      theme={{ enabled: false }}
      search={{ options: { api: "/api/system-search" } }}
    >
      <FumaDocsLayout
        tree={contractSource.pageTree}
        nav={{ title: "systemix contract" }}
        links={[
          { text: "Config", url: "/config" },
          { text: "Atlas", url: "/atlas" },
        ]}
      >
        {children}
      </FumaDocsLayout>
    </RootProvider>
  );
}
