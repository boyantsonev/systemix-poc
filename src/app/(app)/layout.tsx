import type { ReactNode } from "react";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/shell/AppSidebar";
import { SiteHeader } from "@/components/shell/SiteHeader";
import { pageTreeToElements } from "@/lib/nav.config";
import { contractSource } from "@/lib/contract-source";
import { experimentsSource } from "@/lib/experiments-source";

// The unified app shell (ADR-022): one sidebar + one header across the three
// product surfaces (Home / Contract / Experiments). The fumadocs surfaces render
// their bodies inside this shell with their own chrome disabled (see their
// layouts); their page trees are fed into the sidebar's file-tree here.
export default function AppLayout({ children }: { children: ReactNode }) {
  const contractTree = pageTreeToElements(contractSource.pageTree);
  const experimentsTree = pageTreeToElements(experimentsSource.pageTree);

  return (
    <SidebarProvider>
      <AppSidebar contractTree={contractTree} experimentsTree={experimentsTree} />
      {/* min-w-0 lets the inset shrink beside the sidebar instead of overflowing
          the viewport (flexbox min-width:auto default) — keeps the header + panels
          within bounds so Search/theme aren't pushed off-screen. */}
      <SidebarInset className="min-w-0">
        <SiteHeader />
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
