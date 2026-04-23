"use client";

import Link from "next/link";
import { useTheme } from "next-themes";
import { Sun, Moon } from "lucide-react";
import { SLogo } from "./SLogo";

type LandingShellProps = {
  children: React.ReactNode;
};

export function LandingShell({ children }: LandingShellProps) {
  const { theme, setTheme } = useTheme();

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Thin top nav */}
      <header className="flex items-center justify-between px-6 md:px-10 py-4 border-b border-border/40">
        <Link href="/" className="flex items-center gap-2.5 hover:opacity-80 transition-opacity">
          <SLogo size={22} className="text-foreground" />
          <span className="font-black text-foreground text-sm tracking-tight">systemix</span>
        </Link>

        <div className="flex items-center gap-3">
          <Link
            href="/skills"
            className="text-xs text-muted-foreground hover:text-foreground transition-colors hidden sm:block"
          >
            Skills
          </Link>
          <Link
            href="/setup"
            className="text-xs text-muted-foreground hover:text-foreground transition-colors hidden sm:block"
          >
            Setup
          </Link>
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            aria-label="Toggle theme"
          >
            {theme === "dark" ? <Sun size={13} /> : <Moon size={13} />}
          </button>
        </div>
      </header>

      {/* Main content — full width */}
      <main className="flex-1 flex flex-col">
        {children}
      </main>
    </div>
  );
}
