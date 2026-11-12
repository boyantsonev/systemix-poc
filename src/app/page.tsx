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
  Commands,
  Improves,
  Roles,
  Pricing,
  Proof,
  Rules,
} from "@/components/landing/sections";
import { faq } from "@/lib/landing/content";

// The product studio (docs/feature/product-studio/copy-deck.md): hero · who uses it · the five
// commands · rules as data · it improves itself · proof · how it works · pricing (free studio,
// sponsor, setup by a designer) · FAQ, then the install again.
export const metadata: Metadata = {
  title: "Systemix: a product studio built on your design system",
  description:
    "A free Claude Code plugin. A designer sets it up once; engineers, product and marketing ship through it. The agent reads your rules, code checks the work, and a person makes every call.",
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
          <SectionTrack name="roles">
            <Roles />
          </SectionTrack>
          <SectionTrack name="commands">
            <Commands />
          </SectionTrack>
          <SectionTrack name="rules">
            <Rules />
          </SectionTrack>
          <SectionTrack name="improves">
            <Improves />
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
