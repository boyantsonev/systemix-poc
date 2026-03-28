import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { IntegrationStatus } from "@/components/library/IntegrationStatus";
import type { Component } from "@/lib/data/components";

type ComponentCardProps = { component: Component };

export function ComponentCard({ component }: ComponentCardProps) {
  const driftCount = component.driftInstances.length;
  const shownVariants = component.variants.slice(0, 3);
  const extraVariants = component.variants.length - 3;

  return (
    <Link href={`/components/${component.slug}`} className="block h-full">
      <Card className="hover:bg-accent transition-colors cursor-pointer h-full">
        <CardContent className="pt-4 pb-4 flex flex-col gap-3">
          {/* Header */}
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="text-foreground font-semibold text-sm leading-tight">{component.name}</h3>
              <span className="text-muted-foreground text-xs capitalize mt-0.5 inline-block">
                {component.category}
              </span>
            </div>
            <Badge
              variant="outline"
              className={`text-[10px] flex-shrink-0 px-1.5 py-0 ${
                driftCount === 0
                  ? "text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800"
                  : "text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800"
              }`}
            >
              {driftCount === 0 ? "0 drift" : `${driftCount} drift`}
            </Badge>
          </div>

          {/* Variants */}
          <div className="flex flex-wrap gap-1">
            {shownVariants.map((v) => (
              <span
                key={v}
                className="text-[10px] font-mono bg-muted text-muted-foreground rounded px-1.5 py-0.5 border border-border"
              >
                {v}
              </span>
            ))}
            {extraVariants > 0 && (
              <span className="text-[10px] font-mono text-muted-foreground/70 px-1 py-0.5">
                +{extraVariants} more
              </span>
            )}
          </div>

          {/* Integration dots */}
          <IntegrationStatus integrations={component.integrations} size="sm" />

          {/* GitHub info */}
          <div className="text-xs text-muted-foreground leading-tight">
            {component.openPR ? (
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-violet-500 flex-shrink-0" />
                <span className="truncate">
                  {component.openPR.skill && (
                    <span className="text-violet-500 font-mono text-[10px] font-medium mr-1">{component.openPR.skill}:</span>
                  )}
                  <span className="truncate">{component.openPR.title}</span>
                </span>
              </span>
            ) : component.githubLastCommit ? (
              <span className="truncate text-muted-foreground/70 block">
                {component.githubLastCommit.message}
              </span>
            ) : null}
          </div>

          {/* Actions */}
          <div className="flex gap-1.5 mt-auto pt-1">
            <button
              disabled
              className="flex-1 text-[10px] font-medium rounded border border-border bg-card text-muted-foreground px-2 py-1 cursor-not-allowed opacity-60"
            >
              Verify
            </button>
            <button
              disabled
              className="flex-1 text-[10px] font-medium rounded border border-violet-300 dark:border-violet-800 bg-violet-50 dark:bg-violet-950 text-violet-600 dark:text-violet-400 px-2 py-1 cursor-not-allowed opacity-60"
            >
              Fix
            </button>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
