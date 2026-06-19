import { DocsLayout as FumaDocsLayout } from "fumadocs-ui/layouts/docs";
import { RootProvider } from "fumadocs-ui/provider/next";
import type { ReactNode } from "react";
import { experimentsSource } from "@/lib/experiments-source";

// The Loop layer renders INSIDE the (app) shell (Option B, ADR-022): fumadocs's
// own sidebar / nav / theme-switch are disabled (the page tree lives in the shell
// sidebar); it contributes only the MDX body + TOC. Search stays scoped.
export default function ExperimentsLayout({ children }: { children: ReactNode }) {
  return (
    <RootProvider theme={{ enabled: false }} search={{ options: { api: "/api/system-search" } }}>
      <FumaDocsLayout
        tree={experimentsSource.pageTree}
        sidebar={{ enabled: false }}
        nav={{ enabled: false }}
        themeSwitch={{ enabled: false }}
      >
        {children}
      </FumaDocsLayout>
    </RootProvider>
  );
}
