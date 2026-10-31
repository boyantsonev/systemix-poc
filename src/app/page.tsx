import type { Metadata } from "next";
import { SectionTrack } from "@/components/systemix/LandingEvents";
import {
  BottomCTA,
  FaqJsonLd,
  FaqSection,
  GridFrame,
  HeroRow,
  HowItWorks,
  LandingFooter,
  LandingNav,
  Pillars,
  Pricing,
  Proof,
} from "@/components/landing/sections";
import { faq } from "@/lib/landing/content";

// Six sections (G-002, copy deck docs/feature/ai-native-ds-kit-beta/copy-deck.md):
// hero · what it does · proof · how it works · pricing · FAQ, then the install again.
export const metadata: Metadata = {
  title: "Systemix: the design system agent for Claude Code",
  description:
    "Sets up your design system, keeps it from rotting and runs design sprints. Free AI-readiness score, computed on your machine.",
  alternates: { canonical: "/" },
};

export default function LandingPage() {
  return (
    <div className="min-h-screen text-foreground">
      <FaqJsonLd items={faq.items} />
      <LandingNav />
      <GridFrame>
        <main>
          <SectionTrack name="hero">
            <HeroRow />
          </SectionTrack>
          <SectionTrack name="what-it-does">
            <Pillars />
          </SectionTrack>
          <SectionTrack name="proof">
            <Proof />
          </SectionTrack>
          <SectionTrack name="how-it-works">
            <HowItWorks />
          </SectionTrack>
          <SectionTrack name="pricing">
            <Pricing />
          </SectionTrack>
          <SectionTrack name="faq">
            <FaqSection />
          </SectionTrack>
          <SectionTrack name="bottom-cta">
            <BottomCTA />
          </SectionTrack>
        </main>
      </GridFrame>
      <LandingFooter />
    </div>
  );
}
