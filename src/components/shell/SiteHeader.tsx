"use client";

import { Fragment } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { ThemeToggle } from "@/components/systemix/ThemeToggle";
import { CommandMenu } from "./CommandMenu";
import { surfaceLabel } from "@/lib/nav.config";

function prettify(seg: string): string {
  return seg.replace(/[-_]/g, " ");
}

function buildCrumbs(pathname: string): { label: string; href: string }[] {
  const segs = pathname.split("/").filter(Boolean);
  if (segs.length === 0) return [];
  let href = "";
  return segs.map((seg, i) => {
    href += "/" + seg;
    return { label: i === 0 ? surfaceLabel(pathname) ?? prettify(seg) : prettify(seg), href };
  });
}

// The app shell header (ADR-022): sidebar toggle + breadcrumb + command + theme.
// Consistent across every surface.
export function SiteHeader() {
  const pathname = usePathname();
  const crumbs = buildCrumbs(pathname);

  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-2 border-b bg-background px-4">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-1 h-4" />
      <Breadcrumb>
        <BreadcrumbList>
          {crumbs.map((c, i) => {
            const last = i === crumbs.length - 1;
            return (
              <Fragment key={c.href}>
                <BreadcrumbItem>
                  {last ? (
                    <BreadcrumbPage>{c.label}</BreadcrumbPage>
                  ) : i === 0 ? (
                    <BreadcrumbLink asChild>
                      <Link href={c.href}>{c.label}</Link>
                    </BreadcrumbLink>
                  ) : (
                    <span className="text-muted-foreground">{c.label}</span>
                  )}
                </BreadcrumbItem>
                {!last && <BreadcrumbSeparator />}
              </Fragment>
            );
          })}
        </BreadcrumbList>
      </Breadcrumb>
      <div className="ml-auto flex items-center gap-1.5">
        <CommandMenu />
        <ThemeToggle />
      </div>
    </header>
  );
}
