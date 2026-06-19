"use client";

import { useEffect, useRef, useState } from "react";
import { RiLoopRightLine } from "@remixicon/react";
import { OrbitingCircles } from "@/components/ui/orbiting-circles";
import { cn } from "@/lib/utils";
import { RINGS, BrandChip } from "./brand-nodes";

// Design size at scale 1; the orbit scales down to fit narrower containers so
// the constellation never overflows on mobile.
const BASE = 660;
const RING = [
  { radius: 112, chip: 56, duration: 32, reverse: false }, // core
  { radius: 196, chip: 50, duration: 48, reverse: true }, // mid
  { radius: 280, chip: 44, duration: 66, reverse: false }, // outer (fades at edge)
];

export function LoopOrbit({ className }: { className?: string }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(BASE);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    setW(el.clientWidth);
    const ro = new ResizeObserver(([e]) => setW(e.contentRect.width));
    ro.observe(el);

    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduced(mq.matches);
    sync();
    mq.addEventListener("change", sync);

    return () => {
      ro.disconnect();
      mq.removeEventListener("change", sync);
    };
  }, []);

  const D = Math.min(BASE, Math.max(280, w - 16));
  const scale = D / BASE;

  return (
    <div ref={wrapRef} className={cn("relative w-full", className)}>
      <div className="relative mx-auto" style={{ width: D, height: D }}>
        {/* soft central glow */}
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
          style={{
            width: D * 0.55,
            height: D * 0.55,
            background: "radial-gradient(circle, var(--foreground) 0%, transparent 70%)",
            opacity: 0.06,
          }}
        />

        {/* masked constellation — dissolves toward the edges */}
        <div className="absolute inset-0 flex items-center justify-center [mask-image:radial-gradient(circle_closest-side,#000_66%,transparent_100%)]">
          {RING.map((cfg, i) => {
            const chip = Math.round(cfg.chip * scale);
            return (
              <OrbitingCircles
                key={i}
                radius={Math.round(cfg.radius * scale)}
                iconSize={chip}
                duration={cfg.duration}
                reverse={cfg.reverse}
                className={cn(reduced && "[animation-play-state:paused]")}
              >
                {RINGS[i].map((node) => (
                  <BrandChip key={node.label} node={node} size={chip} />
                ))}
              </OrbitingCircles>
            );
          })}
        </div>

        {/* center hub — the loop */}
        <div
          className="absolute left-1/2 top-1/2 z-10 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center gap-1 rounded-full border border-border bg-card"
          style={{
            width: Math.round(96 * scale),
            height: Math.round(96 * scale),
            boxShadow: "0 0 44px -10px var(--foreground)",
          }}
        >
          <RiLoopRightLine size={Math.round(26 * scale)} className="text-foreground" />
          <span
            className="font-mono uppercase tracking-widest text-muted-foreground"
            style={{ fontSize: Math.max(8, Math.round(9 * scale)) }}
          >
            loop
          </span>
        </div>
      </div>
    </div>
  );
}
