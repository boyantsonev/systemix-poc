"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

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

  // Use IntersectionObserver — works regardless of which element is the scroll container
  useEffect(() => {
    if (items.length === 0) return;

    const observers: IntersectionObserver[] = [];

    for (const { id } of items) {
      const el = document.getElementById(id);
      if (!el) continue;

      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) setActive(id);
        },
        { rootMargin: "-10% 0px -80% 0px", threshold: 0 },
      );
      observer.observe(el);
      observers.push(observer);
    }

    return () => observers.forEach((o) => o.disconnect());
  }, [items]);

  // scrollIntoView works regardless of which element is the scroll container
  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  if (items.length === 0) return null;

  return (
    <aside
      aria-label="On this page"
      className="flex-shrink-0 hidden lg:block"
      style={{ width: "200px", position: "sticky", top: 0, height: "100vh", overflowY: "auto" }}
    >
      <div className="px-4 pt-8">
        <p className="text-xs font-semibold tracking-widest uppercase text-muted-foreground mb-4">
          On this page
        </p>
        <nav>
          <ul className="border-l-2 border-border/40 space-y-0.5" role="list">
            {items.map(({ id, label, level = 1 }) => {
              const isActive = active === id;
              return (
                <li key={id}>
                  <button
                    onClick={() => scrollTo(id)}
                    aria-current={isActive ? "location" : undefined}
                    className={cn(
                      "w-full text-left py-1.5 text-sm transition-colors block",
                      "-ml-px border-l-2",
                      level === 2 ? "pl-5" : "pl-3",
                      isActive
                        ? "border-teal-500 text-foreground font-medium"
                        : "border-transparent text-muted-foreground hover:text-foreground hover:border-border",
                    )}
                  >
                    {label}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </aside>
  );
}
