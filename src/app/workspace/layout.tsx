"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { ChevronLeft, ChevronRight, Boxes, Palette, Shield } from "lucide-react";
import { cn } from "@/lib/utils";
import { SLogo } from "@/components/systemix/SLogo";

const NAV = [
  {
    label: "Design System",
    icon: <Palette size={13} />,
    items: [
      { href: "/workspace/variables", label: "Variables", badge: "47" },
    ],
  },
  {
    label: "Components",
    icon: <Boxes size={13} />,
    items: [
      { href: "/workspace/combobox", label: "Combobox", badge: null },
    ],
  },
  {
    label: "Token Intelligence",
    icon: <Shield size={13} />,
    items: [
      { href: "/workspace/token-guard", label: "TokenGuard", badge: null },
    ],
  },
];

function WorkspaceNav({ collapsed }: { collapsed: boolean }) {
  const pathname = usePathname();

  return (
    <nav className="flex-1 overflow-y-auto py-3">
      {NAV.map((section) => (
        <div key={section.label} className="mb-4">
          {!collapsed && (
            <div className="flex items-center gap-1.5 px-3 mb-1">
              <span className="text-muted-foreground/40">{section.icon}</span>
              <p className="text-[10px] font-black tracking-widest uppercase text-muted-foreground/40">
                {section.label}
              </p>
            </div>
          )}
          {section.items.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-2 mx-1.5 px-2.5 h-8 rounded-md text-xs transition-colors",
                  active
                    ? "bg-accent text-accent-foreground font-medium"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
                )}
                title={collapsed ? item.label : undefined}
              >
                {collapsed ? (
                  <span className="font-mono text-[10px] w-full text-center truncate">
                    {item.label.slice(0, 2)}
                  </span>
                ) : (
                  <>
                    <span className="flex-1 truncate">{item.label}</span>
                    {item.badge && (
                      <span className="text-[10px] text-muted-foreground/50 font-mono tabular-nums">
                        {item.badge}
                      </span>
                    )}
                  </>
                )}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}

function WorkspaceShell({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-background text-foreground flex">
      {/* Left sidebar */}
      <aside
        className={cn(
          "flex-shrink-0 border-r border-border bg-card flex flex-col h-screen sticky top-0 transition-all duration-200",
          collapsed ? "w-12" : "w-48",
        )}
      >
        {/* Logo */}
        <div className={cn(
          "flex items-center h-12 border-b border-border flex-shrink-0",
          collapsed ? "justify-center px-0" : "gap-2 px-3",
        )}>
          <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <SLogo size={18} className="text-foreground flex-shrink-0" />
            {!collapsed && (
              <span className="font-black text-sm tracking-tight">systemix</span>
            )}
          </Link>
        </div>

        {/* Nav */}
        <WorkspaceNav collapsed={collapsed} />

        {/* Collapse toggle */}
        <div className="border-t border-border p-2 flex-shrink-0">
          <button
            onClick={() => setCollapsed((v) => !v)}
            className={cn(
              "flex items-center gap-1.5 w-full rounded-md px-2 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors",
              collapsed && "justify-center",
            )}
          >
            {collapsed ? <ChevronRight size={13} /> : (
              <>
                <ChevronLeft size={13} />
                <span>Collapse</span>
              </>
            )}
          </button>
        </div>
      </aside>

      {/* Canvas main */}
      <main className="flex-1 overflow-y-auto min-h-screen">
        {children}
      </main>
    </div>
  );
}

export default function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  return <WorkspaceShell>{children}</WorkspaceShell>;
}
