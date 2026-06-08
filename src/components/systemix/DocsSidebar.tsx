"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { usePostHog } from "posthog-js/react";
import { SLogo } from "./SLogo";
import { ThemeToggle } from "./ThemeToggle";
import { getNavSections } from "@/lib/docs-manifest";
import { siteConfig } from "@/lib/site-config";

export function DocsSidebar() {
  const pathname = usePathname();
  const ph = usePostHog();

  return (
    <aside className="hidden md:flex w-[220px] shrink-0 flex-col border-r border-border/50 sticky top-0 h-screen overflow-y-auto bg-background">
      <div className="h-14 flex items-center px-5 border-b border-border/50 gap-3">
        <Link href="/" className="flex items-center gap-2 text-foreground hover:opacity-70 transition-opacity shrink-0">
          <SLogo size={14} className="text-foreground/60" />
          <span className="text-[12px] font-black tracking-tight">systemix</span>
        </Link>
        <span className="text-muted-foreground/25 text-[12px]">/</span>
        <span className="text-[11px] font-mono text-muted-foreground/40">docs</span>
      </div>

      <nav className="flex-1 py-4 px-3 space-y-5">
        {getNavSections().map(({ section, items }) => (
          <div key={section}>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50 px-2 mb-1.5">
              {section}
            </p>
            <div className="space-y-0.5">
              {items.map(({ title, href, external, status }) => {
                const active = !external && (pathname === href || pathname.startsWith(href + "/"));
                const isMissing = status === "missing";
                return (
                  <Link
                    key={href}
                    href={isMissing ? "#" : href}
                    onClick={() => !isMissing && ph.capture("docs_nav_click", { label: title, href, section })}
                    aria-disabled={isMissing}
                    className={`flex items-center justify-between px-2 py-1.5 rounded-md text-[13px] transition-colors ${
                      isMissing
                        ? "text-muted-foreground/30 cursor-default pointer-events-none"
                        : active
                        ? "bg-muted text-foreground font-medium"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    }`}
                  >
                    {title}
                    {external && (
                      <span className="text-[10px] text-muted-foreground/30">↗</span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="h-12 border-t border-border/50 flex items-center justify-between px-5">
        <a
          href={siteConfig.githubUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[11px] text-muted-foreground/40 hover:text-muted-foreground transition-colors font-mono"
        >
          GitHub
        </a>
        <ThemeToggle />
      </div>
    </aside>
  );
}
