import { notFound } from "next/navigation";
import { AppShell } from "@/components/systemix/AppShell";
import { SectionHeading } from "@/components/docs/SectionHeading";
import { TokenOverridesTable } from "@/components/brands/TokenOverridesTable";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { brands } from "@/lib/data/brands";
import type { AnchorItem } from "@/components/systemix/RightAnchorNav";

export async function generateStaticParams() {
  return brands.map((b) => ({ slug: b.slug }));
}

export default async function BrandDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const brand = brands.find((b) => b.slug === slug);
  if (!brand) notFound();

  const anchorItems: AnchorItem[] = [
    { id: "overview", label: "Overview" },
    { id: "overrides", label: "Token Overrides" },
    { id: "coverage", label: "Component Coverage" },
    { id: "integration", label: "Integration" },
  ];

  const integrationCode = brand.slug === "default"
    ? `/* Default theme is applied via globals.css */
/* No additional configuration needed */`
    : `/* 1. Import the theme file in your layout */
import "@/tokens/themes/${brand.slug}.css"

/* 2. Apply to the root element */
<html data-theme="${brand.slug}">

/* 3. Or switch dynamically */
document.documentElement.setAttribute('data-theme', '${brand.slug}')`;

  return (
    <AppShell anchorItems={anchorItems}>
      <section id="overview">
        <div className="flex items-start justify-between mb-6 gap-4">
          <div>
            <h1 className="text-3xl font-black text-foreground mb-1">{brand.name}</h1>
            <p className="text-muted-foreground text-sm capitalize">{brand.status.replace("-", " ")}</p>
          </div>
          <div className="flex gap-2">
            <div className="w-10 h-10 rounded-lg border border-border" style={{ background: brand.primaryColor }} />
            <div className="w-10 h-10 rounded-lg border border-border" style={{ background: brand.secondaryColor }} />
            <div className="w-10 h-10 rounded-lg border border-border" style={{ background: brand.accentColor }} />
          </div>
        </div>
        <p className="text-muted-foreground leading-relaxed mb-6">{brand.description}</p>

        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-4 pb-4 text-center">
              <p className="text-3xl font-black text-foreground">{brand.tokenCoverage}%</p>
              <p className="text-muted-foreground text-xs mt-1">Token Coverage</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4 text-center">
              <p className="text-3xl font-black text-foreground">{brand.tokenOverrides.length}</p>
              <p className="text-muted-foreground text-xs mt-1">Token Overrides</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4 text-center">
              <p className="text-3xl font-black text-foreground">
                {brand.componentCoverage.filter(c => c.covered).length}/{brand.componentCoverage.length}
              </p>
              <p className="text-muted-foreground text-xs mt-1">Components</p>
            </CardContent>
          </Card>
        </div>
      </section>

      <section id="overrides">
        <SectionHeading accent="#a855f7">Token Overrides</SectionHeading>
        <TokenOverridesTable overrides={brand.tokenOverrides} />
      </section>

      <section id="coverage">
        <SectionHeading accent="#14b8a6">Component Coverage</SectionHeading>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {brand.componentCoverage.map(({ component, covered }) => (
            <div
              key={component}
              className={`flex items-center gap-2 p-3 rounded-lg border text-sm ${
                covered
                  ? "bg-emerald-500/10 border-emerald-200/50 dark:border-emerald-800/50 text-emerald-700 dark:text-emerald-300"
                  : "bg-muted border-border text-muted-foreground"
              }`}
            >
              <div className={`w-2 h-2 rounded-full flex-shrink-0 ${covered ? "bg-emerald-500" : "bg-muted-foreground/40"}`} />
              {component}
            </div>
          ))}
        </div>
      </section>

      <section id="integration">
        <SectionHeading accent="#f59e0b">Integration</SectionHeading>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Activation Code</CardTitle>
          </CardHeader>
          <CardContent>
            {brand.themeFile && (
              <p className="text-muted-foreground text-xs mb-3 font-mono">
                Theme file: <span className="text-foreground/70">{brand.themeFile}</span>
              </p>
            )}
            <div className="bg-muted rounded-lg p-4">
              <pre className="text-foreground text-xs font-mono leading-relaxed overflow-x-auto">
                {integrationCode}
              </pre>
            </div>
          </CardContent>
        </Card>
      </section>
    </AppShell>
  );
}
