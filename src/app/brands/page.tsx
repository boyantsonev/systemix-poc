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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {brands.map((brand) => (
            <BrandCard key={brand.slug} brand={brand} />
          ))}
        </div>
      </section>
    </AppShell>
  );
}
