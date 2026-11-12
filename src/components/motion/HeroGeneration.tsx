"use client";

import { useEffect, useRef } from "react";
import { motionAllowed } from "@/lib/motion/tokens";

// transitions.dev / UI generation, skeleton-texts mode: the hero's "What you get" card is drawn
// as a dotted wireframe with an agent log, then revealed. Once per visit (sessionStorage), loaded
// lazily so the first screen never waits for the runtime (G-002 E5). Without JavaScript or with
// reduced motion the card is simply there (motion.css holds it only under html.motion-ready).

const SEEN = "sx-hero-generated";

export function HeroGeneration({ children, className }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const show = () => el.classList.add("is-generated");
    let seen = false;
    try {
      seen = sessionStorage.getItem(SEEN) === "1";
    } catch {
      seen = true; // storage blocked: don't replay on every page view
    }
    if (!motionAllowed() || seen) return show();

    let run: { cancel: () => void } | null = null;
    let cancelled = false;
    (async () => {
      try {
        await document.fonts.ready;
        const { generate } = await import("@/vendor/transitions/ui-generation.js");
        if (cancelled) return;
        // in the same tick as generate(), which takes the element's opacity from here on
        show();
        run = generate(el, { mode: "skeleton-texts" });
        try {
          sessionStorage.setItem(SEEN, "1");
        } catch {
          /* private mode: it may play again next visit */
        }
      } catch {
        show();
      }
    })();
    return () => {
      cancelled = true;
      run?.cancel();
      show();
    };
  }, []);

  return (
    <div ref={ref} data-generate className={className}>
      {children}
    </div>
  );
}
