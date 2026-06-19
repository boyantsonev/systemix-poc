"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import { Tree, Folder, File as FileNode, type TreeViewElement } from "@/components/ui/file-tree";
import { SLogo } from "@/components/systemix/SLogo";
import { PRIMARY_NAV, SECONDARY_NAV, isActive, collectFolderIds } from "@/lib/nav.config";

// The decision-queue depth, shown as a badge on Home. Real data from /api/queue.
function PendingBadge() {
  const [count, setCount] = useState<number | null>(null);
  useEffect(() => {
    fetch("/api/queue")
      .then((r) => r.json())
      .then((data) => {
        const pending = (data.cards ?? []).filter((c: { status: string }) => c.status === "pending").length;
        if (pending > 0) setCount(pending);
      })
      .catch(() => {});
  }, []);
  if (!count) return null;
  return <SidebarMenuBadge>{count}</SidebarMenuBadge>;
}

// A collapsible file-tree (magicui). Folders expand to reveal the items inside;
// files navigate; the current route stays highlighted.
function DocTree({
  elements,
  pathname,
  initialExpanded,
}: {
  elements: TreeViewElement[];
  pathname: string;
  initialExpanded: string[];
}) {
  const router = useRouter();

  const renderNodes = (els: TreeViewElement[]) =>
    els.map((el) =>
      el.children && el.children.length > 0 ? (
        <Folder key={el.id} value={el.id} element={el.name} className="text-sidebar-foreground/80">
          {renderNodes(el.children)}
        </Folder>
      ) : (
        <FileNode
          key={el.id}
          value={el.id}
          isSelect={pathname === el.id}
          onClick={() => router.push(el.id)}
          className="w-full min-w-0 py-1 text-sidebar-foreground/80"
        >
          <span className="truncate">{el.name}</span>
        </FileNode>
      ),
    );

  return (
    <Tree initialSelectedId={pathname} initialExpandedItems={initialExpanded} className="px-0">
      {renderNodes(elements)}
    </Tree>
  );
}

// The app shell sidebar (ADR-022): Home (the dashboard) on top, then Contract +
// Experiments as always-present, expandable folders over their page trees.
export function AppSidebar({
  contractTree = [],
  experimentsTree = [],
}: {
  contractTree?: TreeViewElement[];
  experimentsTree?: TreeViewElement[];
}) {
  const pathname = usePathname();
  const home = PRIMARY_NAV.find((i) => i.href === "/config");

  const surfaceTree = useMemo<TreeViewElement[]>(
    () => [
      { id: "folder:contract", name: "Contract", type: "folder", children: contractTree },
      { id: "folder:experiments", name: "Experiments", type: "folder", children: experimentsTree },
    ],
    [contractTree, experimentsTree],
  );

  // Open the folder for the surface you're on (+ its nested folders); the other stays closed.
  const initialExpanded = useMemo(() => {
    const top = pathname.startsWith("/contract")
      ? surfaceTree[0]
      : pathname.startsWith("/experiments")
        ? surfaceTree[1]
        : null;
    return top ? [top.id, ...collectFolderIds(top.children ?? [])] : [];
  }, [pathname, surfaceTree]);

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild size="lg" tooltip="systemix">
              <Link href="/">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                  <SLogo size={16} className="text-current" />
                </div>
                <span className="font-semibold tracking-tight">systemix</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup className="flex min-h-0 flex-1">
          <SidebarGroupLabel>Surfaces</SidebarGroupLabel>
          {home && (
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isActive(pathname, home.href)} tooltip={home.label}>
                  <Link href={home.href}>
                    <home.icon />
                    <span>{home.label}</span>
                  </Link>
                </SidebarMenuButton>
                <PendingBadge />
              </SidebarMenuItem>
            </SidebarMenu>
          )}
          <div className="mt-1 min-h-0 flex-1 group-data-[collapsible=icon]:hidden">
            <DocTree elements={surfaceTree} pathname={pathname} initialExpanded={initialExpanded} />
          </div>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          {SECONDARY_NAV.map((item) => (
            <SidebarMenuItem key={item.href}>
              <SidebarMenuButton asChild size="sm" tooltip={item.label}>
                <Link
                  href={item.href}
                  target={item.external ? "_blank" : undefined}
                  rel={item.external ? "noopener noreferrer" : undefined}
                >
                  <item.icon />
                  <span>{item.label}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
