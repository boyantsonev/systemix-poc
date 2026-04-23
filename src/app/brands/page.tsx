import { AppShell } from "@/components/systemix/AppShell";
import { SectionHeading } from "@/components/docs/SectionHeading";
import { ThemeReadinessScore } from "@/components/brands/ThemeReadinessScore";
import { BrandCard } from "@/components/brands/BrandCard";
import { brands, brandsMeta } from "@/lib/data/brands";
import type { AnchorItem } from "@/components/systemix/RightAnchorNav";

const anchorItems: AnchorItem[] = [
  { id: "readiness", label: "Readiness Score" },
  { id: "brands", label: "Brand Catalog" },
];

export default function BrandsPage() {
  return (
    <AppShell anchorItems={anchorItems}>
      <section id="readiness">
        <SectionHeading accent="#f59e0b">Brand Management</SectionHeading>
        <p className="text-muted-foreground text-sm mb-6">
          {brandsMeta.totalBrands} brands · {brandsMeta.productionBrands} in production · Avg. token coverage {brandsMeta.avgTokenCoverage}%
        </p>
        <ThemeReadinessScore />
      </section>

      <section id="brands">
        <SectionHeading accent="#a855f7">Brand Catalog</SectionHeading>
        <div className="rounded-lg border border-dashed border-border/60 bg-muted/30 px-4 py-3 mb-6 flex items-start gap-3">
          <div className="size-1.5 rounded-full bg-[--color-drifted] mt-2 shrink-0" />
          <div>
            <p className="text-[12px] font-medium text-foreground">Demo data — no real brands yet</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Run <code className="font-mono text-[10px] bg-muted px-1 py-0.5 rounded">/apply-theme</code> in Claude Code to create your first client theme.
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {brands.map((brand) => (
            <BrandCard key={brand.slug} brand={brand} />
          ))}
        </div>
      </section>
    </AppShell>
  );
}
