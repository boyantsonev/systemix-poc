"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { Sun, Moon } from "lucide-react";
import { useEffect, useState } from "react";
import { nav } from "@/lib/nav";
import { SLogo } from "./SLogo";

export function LeftSidebar() {
  const pathname = usePathname();
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <aside
      className="hidden md:flex w-[200px] shrink-0 bg-[oklch(13%_0.006_250)] dark:bg-[oklch(13%_0.006_250)] border-r border-border/50 flex-col overflow-y-auto"
    >
      {/* Logo */}
      <div className="h-10 px-3 flex items-center border-b border-border/40">
        <div className="flex items-center gap-2">
          <SLogo size={16} className="shrink-0 text-foreground" />
          <span className="text-xs font-black tracking-tight text-foreground">Systemix</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto">
        {nav.map(({ section, items }) => (
          <div key={section}>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60 px-3 pt-4 pb-1">
              {section}
            </p>
            <div className="px-1.5 space-y-0.5">
              {items.map(({ label, href }) => {
                const isActive = href === "/" ? pathname === "/" : pathname.startsWith(href);
                return (
                  <Link
                    key={href}
                    href={href}
                    aria-current={isActive ? "page" : undefined}
                    className={`flex items-center h-8 px-3 rounded-md text-xs font-medium transition-colors duration-100 ${
                      isActive
                        ? "bg-muted text-foreground"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
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
      <div className="h-10 border-t border-border/40 flex items-center justify-end px-3">
        {mounted && (
          <button
            onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
            aria-label="Toggle theme"
          >
            {resolvedTheme === "dark" ? <Sun size={12} /> : <Moon size={12} />}
          </button>
        )}
      </div>
    </aside>
  );
}
