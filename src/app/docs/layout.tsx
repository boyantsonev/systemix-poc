import { DocsLayout as FumaDocsLayout } from "fumadocs-ui/layouts/docs";
import { RootProvider } from "fumadocs-ui/provider/next";
import type { ReactNode } from "react";
import { source } from "@/lib/source";
import { baseOptions } from "@/app/layout.config";

// Fumadocs docs shell. Theme + search providers are scoped here:
// `theme` is disabled because the app root already provides next-themes
// (see src/components/systemix/Providers); `search` is off until the search
// API route is wired (Phase 1b).
export default function DocsLayout({ children }: { children: ReactNode }) {
  return (
    <RootProvider theme={{ enabled: false }} search={{ enabled: false }}>
      <FumaDocsLayout tree={source.pageTree} {...baseOptions}>
        {children}
      </FumaDocsLayout>
    </RootProvider>
  );
}
