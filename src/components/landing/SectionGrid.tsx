"use client";

import { useEffect, useRef, useState } from "react";
import { FlickeringGrid } from "@/components/ui/flickering-grid";
import { cn } from "@/lib/utils";

interface SectionGridProps {
  squareSize?: number;
  gridGap?: number;
  maxOpacity?: number;
  flickerChance?: number;
  /** Tailwind gradient mask applied over the grid */
  maskClass?: string;
  className?: string;
}

export function SectionGrid({
  squareSize = 8,
  gridGap = 6,
  maxOpacity = 0.14,
  flickerChance = 0.15,
  maskClass,
  className,
}: SectionGridProps) {
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
    const sync = () => setReduced(mq.matches);
    sync();
    mq.addEventListener("change", sync);

    return () => {
      obs.disconnect();
      mq.removeEventListener("change", sync);
    };
  }, []);

  return (
    <div className={cn("pointer-events-none absolute inset-0", className)}>
      <span ref={probe} className="sr-only text-foreground" aria-hidden />
      <FlickeringGrid
        className="absolute inset-0 h-full w-full"
        color={color}
        squareSize={squareSize}
        gridGap={gridGap}
        maxOpacity={maxOpacity}
        flickerChance={reduced ? 0 : flickerChance}
      />
      {maskClass && <div className={cn("absolute inset-0", maskClass)} />}
    </div>
  );
}
