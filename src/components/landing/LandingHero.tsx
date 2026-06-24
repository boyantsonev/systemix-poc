"use client";

import { usePostHog } from "posthog-js/react";
import { useVariant } from "@/lib/useVariant";
import { hero, GITHUB_URL } from "@/lib/landing/content";
import { InstallCommand } from "@/components/systemix/LandingEvents";
import { RotatingWord } from "./RotatingWord";
import { HeroGrid } from "./HeroGrid";

export function LandingHero() {
  const ph = usePostHog();
  // A/B seam: a `landing-hero` multivariate flag in PostHog splits control vs B.
  const variantKey = useVariant("landing-hero", "variant_b");
  const v = hero.variants[variantKey === "control" ? "control" : "variant_b"];

  return (
    <section className="relative overflow-hidden">
      {/* magicui FlickeringGrid — theme-aware ambient dots behind the copy */}
      <div className="pointer-events-none absolute inset-0">
        <HeroGrid className="absolute inset-0 h-full w-full" />
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 80% 70% at 50% 46%, var(--background) 24%, transparent 78%)",
          }}
        />
      </div>

      <div className="relative max-w-3xl mx-auto px-6 pt-28 pb-24 text-center">
        <p className="text-[11px] font-semibold text-muted-foreground/70 uppercase tracking-[0.18em] mb-6">
          {v.eyebrow}
        </p>

        <h1 className="text-[2.75rem] sm:text-[3.75rem] font-black tracking-tight leading-[1.05] mb-7">
          <span className="block">{hero.lead}</span>
          <RotatingWord phrases={hero.phrases} className="text-foreground" />
        </h1>

        {/* the spine */}
        <div className="flex items-center justify-center gap-2 font-mono text-[12px] text-muted-foreground/70 mb-7">
          {hero.spine.map((s, i) => (
            <span key={s} className="flex items-center gap-2">
              <span>{s}</span>
              {i < hero.spine.length - 1 && (
                <span aria-hidden className="text-muted-foreground/30">
                  →
                </span>
              )}
            </span>
          ))}
        </div>

        <p className="text-[17px] text-muted-foreground leading-relaxed max-w-xl mx-auto mb-10">
          {v.body}
        </p>

        <div className="flex flex-col items-center gap-4">
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <InstallCommand />
            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => ph.capture("hero_cta_click", { cta: "github" })}
              className="text-[13px] text-muted-foreground hover:text-foreground transition-colors"
            >
              or star on GitHub →
            </a>
          </div>
          <p className="text-[12px] font-mono text-muted-foreground/50">{hero.fineprint}</p>
        </div>
      </div>
    </section>
  );
}
