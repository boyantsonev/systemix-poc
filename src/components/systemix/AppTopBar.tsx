"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { SLogo } from "./SLogo";
import { ThemeToggle } from "./ThemeToggle";

const APP_NAV = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Queue",     href: "/queue"     },
  { label: "Contract",  href: "/contract"  },
];

function PendingBadge() {
  const [count, setCount] = useState<number | null>(null);
  useEffect(() => {
    fetch("/api/queue")
      .then(r => r.json())
      .then(data => {
        const pending = (data.cards ?? []).filter((c: { status: string }) => c.status === "pending").length;
        if (pending > 0) setCount(pending);
      })
      .catch(() => {});
  }, []);
  if (!count) return null;
  return (
    <span className="ml-1 inline-flex items-center justify-center w-4 h-4 rounded-full bg-amber-500/20 text-amber-400 text-[9px] font-bold tabular-nums">
      {count}
    </span>
  );
}

const SECONDARY_NAV = [
  { label: "Docs",   href: "/docs",                                    external: false },
  { label: "GitHub", href: "https://github.com/boyantsonev/systemix",  external: true  },
];

function isActive(pathname: string, href: string) {
  if (href === "/design-system") return pathname.startsWith("/design-system") && !pathname.startsWith("/design-system/decisions");
  return pathname === href || pathname.startsWith(href + "/");
}

export function AppTopBar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <>
      <header className="h-11 shrink-0 border-b border-border flex items-center px-4 md:px-5 gap-1 bg-card sticky top-0 z-40">
        <Link href="/" className="flex items-center gap-2 mr-3 hover:opacity-70 transition-opacity">
          <SLogo size={14} className="text-foreground" />
          <span className="text-[12px] font-black tracking-tight">systemix</span>
        </Link>

        {/* Primary app nav — desktop */}
        <nav className="hidden md:flex items-center gap-0.5">
          {APP_NAV.map(({ label, href }) => {
            const active = isActive(pathname, href);
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center px-2.5 py-1.5 rounded text-[12px] transition-colors ${
                  active
                    ? "bg-muted text-foreground font-medium"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                }`}
              >
                {label}
                {href === "/queue" && <PendingBadge />}
              </Link>
            );
          })}
        </nav>

        {/* Secondary nav — desktop */}
        <div className="hidden md:flex items-center gap-0.5 ml-auto">
          {SECONDARY_NAV.map(({ label, href, external }) => (
            <Link
              key={href}
              href={href}
              target={external ? "_blank" : undefined}
              rel={external ? "noopener noreferrer" : undefined}
              className="px-2.5 py-1.5 rounded text-[12px] text-muted-foreground/50 hover:text-muted-foreground hover:bg-muted/40 transition-colors"
            >
              {label}
            </Link>
          ))}
          <ThemeToggle />
        </div>

        {/* Mobile right */}
        <div className="md:hidden ml-auto flex items-center gap-2">
          <ThemeToggle />
          <button
            onClick={() => setOpen(true)}
            className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
            aria-label="Open navigation"
          >
            <Menu size={15} />
          </button>
        </div>
      </header>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-50 bg-black/40 md:hidden" onClick={() => setOpen(false)} />
      )}
      <div className={`fixed inset-y-0 right-0 z-50 w-60 bg-card border-l border-border flex flex-col md:hidden transition-transform duration-200 ${open ? "translate-x-0" : "translate-x-full"}`}>
        <div className="h-11 flex items-center justify-between px-4 border-b border-border/50">
          <span className="text-[11px] font-mono text-muted-foreground">Menu</span>
          <button
            onClick={() => setOpen(false)}
            className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
            aria-label="Close menu"
          >
            <X size={14} />
          </button>
        </div>
        <nav className="flex-1 p-3 space-y-4 overflow-y-auto">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40 px-2 mb-1.5">App</p>
            <div className="space-y-0.5">
              {APP_NAV.map(({ label, href }) => {
                const active = isActive(pathname, href);
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setOpen(false)}
                    className={`flex items-center px-2 py-2 rounded-md text-[13px] transition-colors ${
                      active
                        ? "bg-muted text-foreground font-medium"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    }`}
                  >
                    {label}
                    {href === "/queue" && <PendingBadge />}
                  </Link>
                );
              })}
            </div>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40 px-2 mb-1.5">More</p>
            <div className="space-y-0.5">
              {SECONDARY_NAV.map(({ label, href, external }) => (
                <Link
                  key={href}
                  href={href}
                  target={external ? "_blank" : undefined}
                  rel={external ? "noopener noreferrer" : undefined}
                  onClick={() => setOpen(false)}
                  className="block px-2 py-2 rounded-md text-[13px] text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                >
                  {label}
                </Link>
              ))}
            </div>
          </div>
        </nav>
      </div>
    </>
  );
}
