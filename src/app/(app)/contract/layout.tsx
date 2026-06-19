import { DocsLayout as FumaDocsLayout } from "fumadocs-ui/layouts/docs";
import { RootProvider } from "fumadocs-ui/provider/next";
import type { ReactNode } from "react";
import { contractSource } from "@/lib/contract-source";

// The Contract layer renders INSIDE the (app) shell (Option B, ADR-022): its own
// fumadocs sidebar / nav / theme-switch are disabled, so it contributes only the
// MDX body + TOC. The page tree lives in the shell sidebar; theme defers to the
// app root (next-themes); search stays scoped to the contract index.
export default function ContractLayout({ children }: { children: ReactNode }) {
  return (
    <RootProvider theme={{ enabled: false }} search={{ options: { api: "/api/system-search" } }}>
      <FumaDocsLayout
        tree={contractSource.pageTree}
        sidebar={{ enabled: false }}
        nav={{ enabled: false }}
        themeSwitch={{ enabled: false }}
      >
        {children}
      </FumaDocsLayout>
    </RootProvider>
  );
}
