// Central navigation config — the single source of truth for the app shell
// (ADR-022). Replaces the dead src/lib/nav.ts and the hardcoded APP_NAV that was
// scattered in AppTopBar / the /config header. Consumed by the shell sidebar,
// header breadcrumb, and command palette.

import { LayoutDashboard, ScrollText, FlaskConical, BookOpen, Github, type LucideIcon } from "lucide-react";
import type { TreeViewElement } from "@/components/ui/file-tree";

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  external?: boolean;
};

// The three product surfaces.
export const PRIMARY_NAV: NavItem[] = [
  { label: "Home", href: "/config", icon: LayoutDashboard },
  { label: "Contract", href: "/contract", icon: ScrollText },
  { label: "Experiments", href: "/experiments", icon: FlaskConical },
];

export const SECONDARY_NAV: NavItem[] = [
  { label: "Docs", href: "/docs", icon: BookOpen },
  { label: "GitHub", href: "https://github.com/boyantsonev/systemix", icon: Github, external: true },
];

/** Active when the path equals the href or is nested beneath it. */
export function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(href + "/");
}

/** Map the first path segment to its surface label (for breadcrumbs). */
export function surfaceLabel(pathname: string): string | null {
  return PRIMARY_NAV.find((n) => isActive(pathname, n.href))?.label ?? null;
}

// ── fumadocs page-tree → file-tree elements (runs server-side; the output is
// serializable so it can cross to the client AppSidebar's magicui file-tree) ──

type PageTreeNode = {
  type: string;
  name?: unknown; // fumadocs allows a ReactNode; we coerce to a string
  url?: string;
  index?: { url?: string; name?: unknown };
  children?: PageTreeNode[];
};

function nodeTitle(node: { name?: unknown; url?: string; index?: { url?: string } }): string {
  if (typeof node.name === "string" && node.name.trim()) return node.name;
  const url = node.url ?? node.index?.url ?? "";
  const last = url.split("/").filter(Boolean).pop();
  return last ? last.replace(/[-_]/g, " ") : "Untitled";
}

/** Map a fumadocs PageTree into nested file-tree elements. `id` on a file is its
 * route (the AppSidebar navigates to it on click); folders use a `folder:` id. */
export function pageTreeToElements(tree: { children?: PageTreeNode[] } | undefined): TreeViewElement[] {
  const toEl = (node: PageTreeNode): TreeViewElement | null => {
    if (node.type === "page" && node.url) {
      return { id: node.url, name: nodeTitle(node), type: "file" };
    }
    if (node.type === "folder") {
      const children: TreeViewElement[] = [];
      if (node.index?.url) children.push({ id: node.index.url, name: "overview", type: "file" });
      for (const child of node.children ?? []) {
        const el = toEl(child);
        if (el) children.push(el);
      }
      return { id: `folder:${nodeTitle(node)}`, name: nodeTitle(node), type: "folder", children };
    }
    return null;
  };
  return (tree?.children ?? []).map(toEl).filter((e): e is TreeViewElement => e !== null);
}

/** Every folder id in the tree — used as `initialExpandedItems` (start open). */
export function collectFolderIds(elements: TreeViewElement[]): string[] {
  const ids: string[] = [];
  const walk = (els: TreeViewElement[]) => {
    for (const el of els) {
      if (el.children && el.children.length > 0) {
        ids.push(el.id);
        walk(el.children);
      }
    }
  };
  walk(elements);
  return ids;
}
