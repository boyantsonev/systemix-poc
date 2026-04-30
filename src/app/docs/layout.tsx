"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { SLogo } from "@/components/systemix/SLogo";
import { ThemeToggle } from "@/components/systemix/ThemeToggle";
import { DocsSidebar } from "@/components/systemix/DocsSidebar";

const MOBILE_NAV = [
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
      { label: "Hypothesis Validation",  href: "/docs/concepts/hypothesis-validation" },
      { label: "Hermes",                 href: "/docs/concepts/hermes"                },
      { label: "HITL & Decision Queue",  href: "/docs/concepts/hitl"                  },
      { label: "Evidence Layer",         href: "/docs/concepts/evidence-layer"        },
    ],
  },
  {
    section: "The stack",
    items: [
      { label: "MDX contracts",          href: "/docs/concepts/contract"      },
      { label: "Drift & Reconciliation", href: "/docs/concepts/drift"         },
      { label: "Quality Score",          href: "/docs/concepts/quality-score" },
    ],
  },
  {
    section: "Reference",
    items: [
      { label: "Skills library",  href: "/docs/skills"       },
      { label: "Architecture",    href: "/docs/architecture"  },
      { label: "Design System ↗", href: "/design-system"     },
      { label: "Dashboard ↗",     href: "/dashboard"         },
    ],
  },
];

function MobileDocNav({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pathname = usePathname();
  return (
    <>
      {open && (
        <div className="fixed inset-0 z-50 bg-black/40 md:hidden" onClick={onClose} />
      )}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-background border-r border-border/50 flex flex-col md:hidden transition-transform duration-200 ${open ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="h-14 flex items-center justify-between px-5 border-b border-border/50">
          <Link href="/" onClick={onClose} className="flex items-center gap-2">
            <SLogo size={14} className="text-foreground/60" />
            <span className="text-[12px] font-black tracking-tight">systemix</span>
          </Link>
          <button onClick={onClose} className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors" aria-label="Close menu">
            <X size={14} />
          </button>
        </div>
        <nav className="flex-1 py-4 px-3 space-y-5 overflow-y-auto">
          {MOBILE_NAV.map(({ section, items }) => (
            <div key={section}>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50 px-2 mb-1.5">
                {section}
              </p>
              <div className="space-y-0.5">
                {items.map(({ label, href }) => {
                  const active = !href.startsWith("/design-system") && (pathname === href || pathname.startsWith(href + "/"));
                  return (
                    <Link
                      key={href}
                      href={href}
                      onClick={onClose}
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
      </div>
    </>
  );
}

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  const [navOpen, setNavOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background text-foreground flex">
      <DocsSidebar />

      <div className="flex-1 min-w-0">
        {/* Mobile top bar */}
        <div className="md:hidden h-14 flex items-center justify-between px-5 border-b border-border/50 sticky top-0 bg-background/90 backdrop-blur-sm z-40">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setNavOpen(true)}
              className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
              aria-label="Open navigation"
            >
              <Menu size={16} />
            </button>
            <Link href="/" className="flex items-center gap-2">
              <SLogo size={14} className="text-foreground/60" />
              <span className="text-[12px] font-black tracking-tight">systemix</span>
            </Link>
          </div>
          <ThemeToggle />
        </div>

        <MobileDocNav open={navOpen} onClose={() => setNavOpen(false)} />

        <main className="max-w-2xl mx-auto px-6 md:px-10 py-12 md:py-16">
          {children}
        </main>
      </div>
    </div>
  );
}
