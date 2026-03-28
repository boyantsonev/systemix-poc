"use client";

import { useEffect, useState } from "react";

export type AnchorItem = {
  id: string;
  label: string;
  level?: 1 | 2;
};

type RightAnchorNavProps = {
  items: AnchorItem[];
};

export function RightAnchorNav({ items }: RightAnchorNavProps) {
  const [active, setActive] = useState(items[0]?.id ?? "");

  useEffect(() => {
    const onScroll = () => {
      const offset = 120;
      for (const { id } of [...items].reverse()) {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top <= offset) {
          setActive(id);
          return;
        }
      }
      if (items[0]) setActive(items[0].id);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [items]);

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (!el) return;
    const y = el.getBoundingClientRect().top + window.scrollY - 80;
    window.scrollTo({ top: y, behavior: "smooth" });
  };

  if (items.length === 0) return null;

  return (
    <aside
      className="flex-shrink-0 hidden lg:block"
      style={{ width: "200px", position: "sticky", top: 0, height: "100vh", overflowY: "auto" }}
    >
      <div className="p-5 pt-8">
        <p className="text-muted-foreground text-[10px] font-semibold tracking-widest uppercase mb-4">
          On this page
        </p>
        <nav className="space-y-0.5">
          {items.map(({ id, label, level = 1 }) => {
            const isActive = active === id;
            return (
              <button
                key={id}
                onClick={() => scrollTo(id)}
                className={`w-full text-left py-1 text-xs transition-colors ${
                  level === 2 ? "pl-3" : "pl-0"
                } ${
                  isActive
                    ? "text-foreground font-medium"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {isActive && (
                  <span className="inline-block w-px h-3 bg-foreground rounded-full mr-2 align-middle -mt-0.5" />
                )}
                {label}
              </button>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
