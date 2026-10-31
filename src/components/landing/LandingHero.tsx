"use client";

import { usePostHog } from "posthog-js/react";
import { useVariant } from "@/lib/useVariant";
import { hero, GITHUB_URL } from "@/lib/landing/content";
import { PluginInstall } from "@/components/systemix/LandingEvents";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// The hero's copy cell — rendered as the left column of the HeroRow grid
// (sections.tsx). Clean paper/ink per spec v1.1: no CRT on text surfaces.
export function LandingHero() {
  const ph = usePostHog();
  // A/B seam: a `landing-hero` multivariate flag in PostHog splits control vs B.
  const variantKey = useVariant("landing-hero", "variant_b");
  const v = hero.variants[variantKey === "control" ? "control" : "variant_b"];

  return (
    <div className="flex flex-col justify-center p-6 py-16 sm:p-10 sm:py-20">
      {/* SEO: "design system" stays in the H1 (seo-gtm-brief §3) */}
      <h1 className="mb-6 max-w-xl text-[2rem] font-bold leading-[1.08] sm:text-[2.9rem] sm:leading-[1.06] [text-shadow:var(--glow-head)]">
        {v.h1}
      </h1>

      <p className="mb-9 max-w-lg text-[16px] leading-relaxed text-muted-foreground">{v.body}</p>

      <div className="flex flex-col items-start gap-4">
        <div className="flex flex-col items-start gap-3">
          <PluginInstall location="hero" />
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => ph.capture("hero_cta_click", { cta: "github", variant: variantKey })}
            className={cn(buttonVariants({ size: "lg" }))}
          >
            View on GitHub
          </a>
        </div>
        <p className="font-mono text-[12px] text-muted-foreground/70">{hero.fineprint}</p>
      </div>
    </div>
  );
}
