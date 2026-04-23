"use client";

import { useState } from "react";
import { AppShell } from "@/components/systemix/AppShell";
import { ComponentCard } from "@/components/components-page/ComponentCard";
import { components } from "@/lib/data/components";
import type { Component, ComponentCategory } from "@/lib/data/components";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";

type IntegrationFilter = "all" | "missing-story" | "drifted-figma" | "open-pr" | "clean";

const CATEGORIES: { label: string; value: ComponentCategory | "all" }[] = [
  { label: "All",        value: "all"        },
  { label: "Primitives", value: "primitives" },
  { label: "Forms",      value: "forms"      },
  { label: "Layout",     value: "layout"     },
  { label: "Feedback",   value: "feedback"   },
  { label: "Navigation", value: "navigation" },
  { label: "Data",       value: "data"       },
];

const INTEGRATION_FILTERS: { label: string; value: IntegrationFilter }[] = [
  { label: "All",              value: "all"           },
  { label: "Missing Story",    value: "missing-story" },
  { label: "Drifted from Figma", value: "drifted-figma" },
  { label: "Open PR",          value: "open-pr"       },
  { label: "Clean",            value: "clean"         },
];

function matchesIntegration(c: Component, filter: IntegrationFilter): boolean {
  if (filter === "all") return true;
  if (filter === "missing-story") return c.integrations.storybook === "missing";
  if (filter === "drifted-figma") return c.integrations.figma === "drifted";
  if (filter === "open-pr") return c.integrations.github === "pr-open";
  if (filter === "clean")
    return (
      c.integrations.figma === "synced" &&
      c.integrations.storybook === "synced" &&
      c.integrations.github === "clean"
    );
  return true;
}

export default function ComponentsPage() {
  const [categoryFilter, setCategoryFilter] = useState<ComponentCategory | "all">("all");
  const [integrationFilter, setIntegrationFilter] = useState<IntegrationFilter>("all");

  const filtered = components.filter((c) => {
    const catMatch = categoryFilter === "all" || c.category === categoryFilter;
    const intMatch = matchesIntegration(c, integrationFilter);
    return catMatch && intMatch;
  });

  return (
    <AppShell fullWidth>
      {/* Header + filters grouped tightly */}
      <div className="space-y-4">
        {/* Top bar */}
        <div className="flex items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-foreground">Components</h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              {components.length} components in library
            </p>
          </div>
          <Button size="sm" className="gap-1.5 flex-shrink-0" disabled>
            <Sparkles size={13} />
            <span className="hidden sm:inline">Generate from Figma</span>
            <span className="sm:hidden">Generate</span>
          </Button>
        </div>

        {/* Integration filter bar */}
        <div className="flex items-center gap-2 flex-wrap">
          {INTEGRATION_FILTERS.map((f) => {
            const count =
              f.value === "all"
                ? components.length
                : components.filter((c) => matchesIntegration(c, f.value)).length;
            const isActive = integrationFilter === f.value;
            return (
              <button
                key={f.value}
                onClick={() => setIntegrationFilter(f.value)}
                className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                  isActive
                    ? "bg-foreground text-background border-foreground"
                    : "bg-muted text-foreground/70 border-border hover:text-foreground hover:bg-muted/80"
                }`}
              >
                {f.label}
                <span className={`ml-1.5 ${isActive ? "opacity-70" : "opacity-40"}`}>{count}</span>
              </button>
            );
          })}
        </div>

        {/* Mobile: horizontal category tabs */}
        <div className="md:hidden -mx-4 px-4 overflow-x-auto">
          <div className="flex gap-1.5 pb-1 min-w-max">
            {CATEGORIES.map((cat) => {
              const count =
                cat.value === "all"
                  ? components.length
                  : components.filter((c) => c.category === cat.value).length;
              const isActive = categoryFilter === cat.value;
              return (
                <button
                  key={cat.value}
                  onClick={() => setCategoryFilter(cat.value)}
                  className={`text-sm px-3 py-1.5 rounded-full border whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                    isActive
                      ? "bg-foreground text-background border-foreground"
                      : "bg-muted text-foreground/70 border-border hover:text-foreground"
                  }`}
                >
                  {cat.label}
                  <span className={`text-xs ${isActive ? "opacity-70" : "opacity-40"}`}>{count}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-dashed border-border/60 bg-muted/30 px-4 py-3 mb-6 flex items-start gap-3">
        <div className="size-1.5 rounded-full bg-[--color-drifted] mt-2 shrink-0" />
        <div>
          <p className="text-[12px] font-medium text-foreground">Demo data — no real components yet</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Run <code className="font-mono text-[10px] bg-muted px-1 py-0.5 rounded">/component</code> in Claude Code to generate your first component from Figma.
          </p>
        </div>
      </div>

      {/* Two-column layout: category sidebar + grid */}
      <div className="flex gap-8 items-start">
        {/* Category sidebar — desktop only */}
        <div className="hidden md:block w-40 flex-shrink-0 sticky top-8 space-y-0.5">
          {CATEGORIES.map((cat) => {
            const count =
              cat.value === "all"
                ? components.length
                : components.filter((c) => c.category === cat.value).length;
            const isActive = categoryFilter === cat.value;
            return (
              <button
                key={cat.value}
                onClick={() => setCategoryFilter(cat.value)}
                className={`w-full text-left text-sm px-2.5 py-1.5 rounded-md transition-colors flex items-center justify-between gap-2 ${
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                    : "text-muted-foreground hover:text-foreground hover:bg-sidebar-accent"
                }`}
              >
                <span>{cat.label}</span>
                <span className="text-xs opacity-60">{count}</span>
              </button>
            );
          })}
        </div>

        {/* Component grid */}
        <div className="flex-1 min-w-0">
          {filtered.length === 0 ? (
            <p className="text-muted-foreground text-sm py-8">No components match the selected filters.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filtered.map((component) => (
                <ComponentCard key={component.slug} component={component} />
              ))}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
