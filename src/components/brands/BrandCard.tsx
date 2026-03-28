import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Brand } from "@/lib/data/brands";

const statusConfig: Record<Brand["status"], { cls: string; label: string }> = {
  "production":  { cls: "text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800", label: "Production"  },
  "staging":     { cls: "text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800",         label: "Staging"     },
  "in-progress": { cls: "text-violet-600 dark:text-violet-400 border-violet-200 dark:border-violet-800",     label: "In Progress" },
  "archived":    { cls: "text-muted-foreground border-border",                                                label: "Archived"    },
};

type BrandCardProps = {
  brand: Brand;
};

export function BrandCard({ brand }: BrandCardProps) {
  const s = statusConfig[brand.status];
  const coveredCount = brand.componentCoverage.filter(c => c.covered).length;

  return (
    <Link href={`/brands/${brand.slug}`}>
      <Card className="hover:bg-accent transition-colors cursor-pointer h-full">
        <CardContent className="pt-5 pb-5">
          {/* Color swatches */}
          <div className="flex gap-2 mb-4">
            <div className="w-10 h-10 rounded-lg border border-border" style={{ background: brand.primaryColor }} />
            <div className="w-10 h-10 rounded-lg border border-border" style={{ background: brand.secondaryColor }} />
            <div className="w-10 h-10 rounded-lg border border-border" style={{ background: brand.accentColor }} />
          </div>
          <div className="flex items-start justify-between gap-2 mb-3">
            <h3 className="text-foreground font-bold text-sm">{brand.name}</h3>
            <Badge variant="outline" className={`text-xs flex-shrink-0 ${s.cls}`}>{s.label}</Badge>
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Token coverage</span>
              <span className={brand.tokenCoverage >= 90 ? "text-emerald-600 dark:text-emerald-400 font-semibold" : brand.tokenCoverage >= 70 ? "text-amber-600 dark:text-amber-400 font-semibold" : "text-red-600 dark:text-red-400 font-semibold"}>
                {brand.tokenCoverage}%
              </span>
            </div>
            <div className="w-full bg-muted rounded-full h-1">
              <div
                className={`h-1 rounded-full ${brand.tokenCoverage >= 90 ? "bg-emerald-500" : brand.tokenCoverage >= 70 ? "bg-amber-500" : "bg-red-500"}`}
                style={{ width: `${brand.tokenCoverage}%` }}
              />
            </div>
          </div>
          <p className="text-muted-foreground text-xs mt-2">
            {coveredCount}/{brand.componentCoverage.length} components themed
          </p>
        </CardContent>
      </Card>
    </Link>
  );
}
