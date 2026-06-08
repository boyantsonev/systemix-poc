import { DocsLayout as FumaDocsLayout } from "fumadocs-ui/layouts/docs";
import { RootProvider } from "fumadocs-ui/provider/next";
import type { ReactNode } from "react";
import { source } from "@/lib/source";
import { baseOptions } from "@/app/layout.config";

// Fumadocs docs shell. `theme` is disabled because the app root already provides
// next-themes (see src/components/systemix/Providers). Search is enabled and
// backed by src/app/api/search/route.ts (the default /api/search endpoint).
export default function DocsLayout({ children }: { children: ReactNode }) {
  return (
    <RootProvider theme={{ enabled: false }}>
      <FumaDocsLayout tree={source.pageTree} {...baseOptions}>
        {children}
      </FumaDocsLayout>
    </RootProvider>
  );
}
