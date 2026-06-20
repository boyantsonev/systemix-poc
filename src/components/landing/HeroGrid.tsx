"use client";

import { useEffect, useRef, useState } from "react";
import { FlickeringGrid } from "@/components/ui/flickering-grid";

// Theme-aware wrapper around magicui's FlickeringGrid: the dots take the
// resolved `--foreground` color, re-read whenever the theme (html class) flips,
// and freeze under prefers-reduced-motion. Used as the hero's ambient background
// so it follows light/dark with the rest of the page.
export function HeroGrid({ className }: { className?: string }) {
  const probe = useRef<HTMLSpanElement>(null);
  const [color, setColor] = useState("rgb(120,120,120)");
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const read = () => {
      if (probe.current) setColor(getComputedStyle(probe.current).color);
    };
    read();
    const obs = new MutationObserver(read);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });

    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const syncReduced = () => setReduced(mq.matches);
    syncReduced();
    mq.addEventListener("change", syncReduced);

    return () => {
      obs.disconnect();
      mq.removeEventListener("change", syncReduced);
    };
  }, []);

  return (
    <>
      {/* invisible probe to resolve the current theme's foreground color */}
      <span ref={probe} className="sr-only text-foreground" aria-hidden />
      <FlickeringGrid
        className={className}
        color={color}
        squareSize={8}
        gridGap={6}
        maxOpacity={0.22}
        flickerChance={reduced ? 0 : 0.18}
      />
    </>
  );
}
