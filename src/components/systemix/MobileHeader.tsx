"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { Menu, X, Sun, Moon } from "lucide-react";
import { nav } from "@/lib/nav";
import { SLogo } from "./SLogo";

export function MobileHeader() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();

  return (
    <>
      {/* Top bar — mobile only */}
      <header className="md:hidden sticky top-0 z-40 bg-sidebar border-b border-sidebar-border flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2.5">
          <SLogo size={20} className="flex-shrink-0 text-foreground" />
          <div>
            <span className="font-black text-foreground text-sm tracking-tight">Systemix</span>
            <p className="text-muted-foreground text-[10px] -mt-0.5">Design System Hub</p>
          </div>
        </div>
        <button
          onClick={() => setOpen(true)}
          className="p-2.5 min-h-[44px] min-w-[44px] rounded-md text-muted-foreground hover:text-foreground hover:bg-sidebar-accent transition-colors"
          aria-label="Open navigation"
        >
          <Menu size={18} />
        </button>
      </header>

      {/* Overlay backdrop */}
      {open && (
        <div
          className="md:hidden fixed inset-0 z-50 bg-black/50"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Slide-in drawer */}
      <div
        className={`md:hidden fixed inset-y-0 left-0 z-50 w-64 bg-sidebar border-r border-sidebar-border flex flex-col transition-transform duration-200 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Drawer header */}
        <div className="px-5 py-4 border-b border-sidebar-border flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <SLogo size={22} className="flex-shrink-0 text-foreground" />
            <div>
              <span className="font-black text-foreground text-sm tracking-tight">Systemix</span>
              <p className="text-muted-foreground text-xs -mt-0.5">Design System Hub</p>
            </div>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="p-2.5 min-h-[44px] min-w-[44px] rounded-md text-muted-foreground hover:text-foreground hover:bg-sidebar-accent transition-colors"
            aria-label="Close navigation"
          >
            <X size={16} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-5 overflow-y-auto">
          {nav.map(({ section, items }) => (
            <div key={section}>
              <p className="text-muted-foreground text-[10px] font-semibold tracking-widest uppercase mb-1 px-2">
                {section}
              </p>
              <div className="space-y-0.5">
                {items.map(({ label, href }) => {
                  const isActive = href === "/" ? pathname === "/" : pathname.startsWith(href);
                  return (
                    <Link
                      key={href}
                      href={href}
                      onClick={() => setOpen(false)}
                      className={`flex items-center gap-2 px-2 py-2 rounded-md text-sm transition-colors duration-100 ${
                        isActive
                          ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                          : "text-muted-foreground hover:text-foreground hover:bg-sidebar-accent"
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

        {/* Footer */}
        <div className="p-3 border-t border-sidebar-border">
          <div className="flex items-center justify-end px-2 py-1.5">
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-sidebar-accent transition-colors"
              aria-label="Toggle theme"
            >
              {theme === "dark" ? <Sun size={14} /> : <Moon size={14} />}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
