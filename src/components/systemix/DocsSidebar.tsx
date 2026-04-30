"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { usePostHog } from "posthog-js/react";
import { SLogo } from "./SLogo";
import { ThemeToggle } from "./ThemeToggle";

const NAV: { section: string; items: { label: string; href: string; external?: boolean }[] }[] = [
  {
    section: "Getting Started",
    items: [
      { label: "Introduction",  href: "/docs/introduction"  },
      { label: "Quick Install", href: "/docs/quick-install" },
      { label: "Setup Guide",   href: "/docs/guides/setup"  },
    ],
  },
  {
    section: "The loop",
    items: [
      { label: "Hypothesis Validation",    href: "/docs/concepts/hypothesis-validation"  },
      { label: "Hermes",                   href: "/docs/concepts/hermes"                 },
      { label: "HITL & Decision Queue",    href: "/docs/concepts/hitl"                   },
      { label: "Evidence Layer",           href: "/docs/concepts/evidence-layer"         },
    ],
  },
  {
    section: "The stack",
    items: [
      { label: "MDX contracts",            href: "/docs/concepts/contract"               },
      { label: "Drift & Reconciliation",   href: "/docs/concepts/drift"                  },
      { label: "Quality Score",            href: "/docs/concepts/quality-score"          },
    ],
  },
  {
    section: "Reference",
    items: [
      { label: "Skills library",  href: "/docs/skills",      external: false },
      { label: "Architecture",    href: "/docs/architecture", external: false },
      { label: "Design System",   href: "/design-system",    external: true  },
      { label: "Dashboard",       href: "/dashboard",        external: true  },
    ],
  },
];

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
        {NAV.map(({ section, items }) => (
          <div key={section}>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50 px-2 mb-1.5">
              {section}
            </p>
            <div className="space-y-0.5">
              {items.map(({ label, href, external }) => {
                const active = !external && (pathname === href || pathname.startsWith(href + "/"));
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => ph.capture("docs_nav_click", { label, href, section })}
                    className={`flex items-center justify-between px-2 py-1.5 rounded-md text-[13px] transition-colors ${
                      active
                        ? "bg-muted text-foreground font-medium"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    }`}
                  >
                    {label}
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
          href="https://github.com/boyantsonev/systemix"
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
