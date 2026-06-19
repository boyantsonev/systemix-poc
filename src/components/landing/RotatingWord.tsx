"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * The hero's rotating phrase — defines what Systemix is, one phrase at a time.
 * Terminal slot (nothing follows on the line) so phrase-width changes don't
 * reflow the rest of the headline. Reduced-motion freezes to the first phrase;
 * the full set is read once for screen readers, the animated span is hidden.
 */
export function RotatingWord({
  phrases,
  intervalMs = 2400,
  className,
}: {
  phrases: readonly string[];
  intervalMs?: number;
  className?: string;
}) {
  const [i, setI] = useState(0);
  const [show, setShow] = useState(true);
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
    const id = setInterval(() => {
      setShow(false);
      window.setTimeout(() => {
        setI((p) => (p + 1) % phrases.length);
        setShow(true);
      }, 220);
    }, intervalMs);
    return () => clearInterval(id);
  }, [reduced, phrases.length, intervalMs]);

  return (
    <span className={cn("whitespace-nowrap", className)}>
      <span className="sr-only">{phrases.join(", ")}</span>
      <span
        aria-hidden
        className="inline-block transition-opacity duration-200"
        style={{ opacity: reduced ? 1 : show ? 1 : 0 }}
      >
        {phrases[reduced ? 0 : i]}
      </span>
      <span aria-hidden className="agent-cursor ml-1" />
    </span>
  );
}
