"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SLogo } from "./SLogo";
import { ThemeToggle } from "./ThemeToggle";

const NAV = [
  {
    section: "Getting Started",
    items: [
      { label: "Introduction",  href: "/docs/introduction"  },
      { label: "Quick Install", href: "/docs/quick-install" },
    ],
  },
  {
    section: "Concepts",
    items: [
      { label: "contract.json",          href: "/docs/concepts/contract"   },
      { label: "GIGO Score",             href: "/docs/concepts/gigo-score" },
      { label: "Drift & Reconciliation", href: "/docs/concepts/drift"      },
    ],
  },
  {
    section: "Guides",
    items: [
      { label: "Setup Guide", href: "/docs/guides/setup" },
    ],
  },
];

export function DocsSidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex w-[220px] shrink-0 flex-col border-r border-border/50 sticky top-0 h-screen overflow-y-auto bg-background">
      <div className="h-14 flex items-center px-5 border-b border-border/50">
        <Link href="/" className="flex items-center gap-2 text-foreground hover:opacity-70 transition-opacity">
          <SLogo size={14} className="text-foreground/60" />
          <span className="text-[12px] font-black tracking-tight">systemix</span>
        </Link>
      </div>

      <nav className="flex-1 py-4 px-3 space-y-5">
        {NAV.map(({ section, items }) => (
          <div key={section}>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50 px-2 mb-1.5">
              {section}
            </p>
            <div className="space-y-0.5">
              {items.map(({ label, href }) => {
                const active = pathname === href || pathname.startsWith(href + "/");
                return (
                  <Link
                    key={href}
                    href={href}
                    className={`block px-2 py-1.5 rounded-md text-[13px] transition-colors ${
                      active
                        ? "bg-muted text-foreground font-medium"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    }`}
                  >
                    {label}
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
