"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { Sun, Moon } from "lucide-react";
import { nav } from "@/lib/nav";
import { SLogo } from "./SLogo";

export function LeftSidebar() {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();

  return (
    <aside className="hidden md:flex bg-sidebar border-r border-sidebar-border flex-shrink-0 flex-col"
      style={{ width: "240px", position: "sticky", top: 0, height: "100vh", overflowY: "auto" }}
    >
      {/* Logo */}
      <div className="px-5 py-4 border-b border-sidebar-border">
        <div className="flex items-center gap-2.5">
          <SLogo size={24} className="flex-shrink-0 text-foreground" />
          <div>
            <span className="font-black text-foreground text-sm tracking-tight">Systemix</span>
            <p className="text-muted-foreground text-xs -mt-0.5">Design System Hub</p>
          </div>
        </div>
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
                    className={`flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors ${
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

      {/* Footer: theme toggle */}
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
    </aside>
  );
}
