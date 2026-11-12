import { hero } from "@/lib/landing/content";
import { PluginInstall } from "@/components/systemix/LandingEvents";

// The hero's copy cell: the left column of the HeroRow grid (sections.tsx).
// The H1 and subline are the approved G-002 copy, word for word (eval E1).
export function LandingHero() {
  return (
    <div data-reveal-onload className="flex flex-col justify-center p-6 py-16 sm:p-10 sm:py-20">
      {/* SEO: "design system" stays in the H1 */}
      <h1 data-reveal-line="0" className="mb-6 max-w-xl text-[2rem] font-bold leading-[1.08] sm:text-[2.9rem] sm:leading-[1.06] [text-shadow:var(--glow-head)]">
        {hero.h1}
      </h1>
      <p data-reveal-line="1" className="mb-9 max-w-lg text-[16px] leading-relaxed text-muted-foreground">{hero.body}</p>
      <div data-reveal-line="2" className="flex flex-col items-start gap-4">
        <PluginInstall location="hero" />
        <p className="font-mono text-[12px] text-muted-foreground/70">{hero.fineprint}</p>
      </div>
    </div>
  );
}
