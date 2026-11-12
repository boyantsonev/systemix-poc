"use client";

import { useEffect, useRef } from "react";
import { ms, motionAllowed } from "@/lib/motion/tokens";

// transitions.dev / Thinking states (28): what /systemix:score does, one step at a time. The
// first state is a summary, so the line reads whole without JavaScript or with reduced motion.

export function ThinkingStates({ states, className }: { states: string[]; className?: string }) {
  const box = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = box.current;
    if (!el || !motionAllowed() || states.length < 2) return;
    let live = el.querySelector<HTMLSpanElement>(".t-think-text");
    let i = 0;
    let timer: ReturnType<typeof setTimeout>;
    const cycle = () => {
      timer = setTimeout(() => {
        const swap = ms("--motion-quick");
        const gap = ms("--motion-gap");
        const leaving = live;
        i = (i + 1) % states.length;
        leaving?.classList.add("is-exit");
        const next = document.createElement("span");
        next.className = "t-think-text is-enter-start";
        next.textContent = states[i];
        next.setAttribute("data-text", states[i]);
        el.appendChild(next);
        live = next;
        setTimeout(() => {
          void next.offsetWidth; // flush the enter-start rest state
          next.classList.remove("is-enter-start");
        }, gap);
        setTimeout(() => {
          leaving?.remove();
          cycle();
        }, swap + gap);
      }, ms("--motion-hold"));
    };
    cycle();
    return () => clearTimeout(timer);
  }, [states]);

  const longest = states.reduce((a, b) => (b.length > a.length ? b : a), "");
  return (
    // the cycling steps are decoration; screen readers get the summary once
    <span ref={box} className={`t-think ${className ?? ""}`} aria-label={states[0]}>
      <span className="t-think-sizer" aria-hidden="true">
        {longest}
      </span>
      <span className="t-think-text" data-text={states[0]}>
        {states[0]}
      </span>
    </span>
  );
}
