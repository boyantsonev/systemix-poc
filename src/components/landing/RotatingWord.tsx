"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export function RotatingWord({
  phrases,
  intervalMs = 2800,
  className,
}: {
  phrases: readonly string[];
  intervalMs?: number;
  className?: string;
}) {
  const [index, setIndex] = useState(0);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduced(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (reduced) return;
    const id = setInterval(() => setIndex((p) => (p + 1) % phrases.length), intervalMs);
    return () => clearInterval(id);
  }, [reduced, phrases.length, intervalMs]);

  if (reduced) {
    return (
      <span className={cn("whitespace-nowrap", className)}>
        {phrases[0]}
        <span aria-hidden className="agent-cursor ml-[3px]" />
      </span>
    );
  }

  return (
    // min-height keeps the line box stable during the wait-mode gap between exit and enter
    <span className={cn("inline-block", className)} style={{ minHeight: "1.05em" }}>
      <span className="sr-only">{phrases.join(", ")}</span>
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          aria-hidden
          key={index}
          className="inline-block whitespace-nowrap"
          initial={{ y: "30%", opacity: 0, filter: "blur(6px)" }}
          animate={{
            y: 0,
            opacity: 1,
            filter: "blur(0px)",
            transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] },
          }}
          exit={{
            y: "-20%",
            opacity: 0,
            filter: "blur(4px)",
            transition: { duration: 0.2, ease: "easeIn" },
          }}
        >
          {phrases[index]}
          <span aria-hidden className="agent-cursor ml-[3px]" />
        </motion.span>
      </AnimatePresence>
    </span>
  );
}
