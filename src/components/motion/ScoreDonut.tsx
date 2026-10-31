"use client";

import { useEffect, useRef } from "react";
import { ringPaths } from "@/lib/motion/donut";
import { ease, ms, motionAllowed, token } from "@/lib/motion/tokens";

// transitions.dev / Donut chart (35) + Number pop-in (02): this repo's overall score as a ring
// (scored | left) with the number in the middle. The server draws the final ring, so it is there
// without JavaScript; when the section scrolls into view the ring grows from 0 and the digits pop.

const SIZE = 168;
const THICKNESS = 16;

export function ScoreDonut({ score, label }: { score: number; label: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const values = [score, 100 - score];
  // server-side geometry uses the token defaults in globals.css (3px gap, 2px corner)
  const initial = ringPaths(values, SIZE, THICKNESS, 3, 2);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const segs = Array.from(el.querySelectorAll<SVGPathElement>(".t-donut-seg"));
    const digits = el.querySelector(".t-digit-group");
    const finish = () => {
      el.classList.add("is-drawn");
      digits?.classList.add("is-animating");
    };
    if (!motionAllowed()) return finish();

    const gap = parseFloat(token("--motion-chart-gap")) || 0;
    const corner = parseFloat(token("--motion-chart-corner")) || 0;
    const draw = (v: number[]) => ringPaths(v, SIZE, THICKNESS, gap, corner).forEach((d, i) => segs[i]?.setAttribute("d", d));
    let raf = 0;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        obs.disconnect();
        draw([0, 100]);
        finish();
        const dur = ms("--motion-reveal");
        const e = ease("--motion-ease-smooth-out");
        const t0 = performance.now();
        const step = (now: number) => {
          const t = dur ? Math.min(1, (now - t0) / dur) : 1;
          const k = e(t);
          draw([score * k, 100 - score * k]);
          if (t < 1) raf = requestAnimationFrame(step);
        };
        raf = requestAnimationFrame(step);
      },
      { threshold: 0.4 },
    );
    obs.observe(el);
    return () => {
      obs.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [score]);

  const chars = String(score).split("");
  return (
    <div ref={ref} className="t-donut" style={{ width: SIZE, height: SIZE }}>
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} aria-hidden="true">
        {initial.map((d, i) => (
          <path
            key={i}
            className="t-donut-seg"
            d={d}
            style={{
              fill: i === 0 ? "var(--primary)" : "var(--muted)",
              stroke: i === 0 ? "var(--primary)" : "var(--muted)",
              strokeWidth: 4,
            }}
          />
        ))}
      </svg>
      <div className="t-donut-center">
        <span className="t-digit-group text-[2.25rem] font-bold leading-none" aria-label={`${score} out of 100`}>
          {chars.map((c, i) => (
            <span
              key={i}
              aria-hidden="true"
              className="t-digit"
              data-stagger={i === chars.length - 2 ? "1" : i === chars.length - 1 ? "2" : undefined}
            >
              {c}
            </span>
          ))}
        </span>
        <span className="mt-1 font-mono text-[11px] text-muted-foreground">{label}</span>
      </div>
    </div>
  );
}
