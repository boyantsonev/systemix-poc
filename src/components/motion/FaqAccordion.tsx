"use client";

import { useState } from "react";

// transitions.dev / Accordion expand (21): the FAQ. Without JavaScript every answer is open
// (motion.css closes them only under html.js); with it, each question toggles its answer.

export function FaqAccordion({ items }: { items: { q: string; a: string }[] }) {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <div className="mt-10 flex flex-col divide-y divide-border/60 border-y border-border/60">
      {items.map((f, i) => {
        const isOpen = open === i;
        const id = `faq-${i}`;
        return (
          <div key={f.q} className="t-acc py-4" data-open={isOpen ? "true" : "false"}>
            <button
              type="button"
              className="t-acc-head flex w-full cursor-pointer items-center justify-between gap-4 text-left text-[15px] font-bold text-foreground"
              aria-expanded={isOpen}
              aria-controls={id}
              onClick={() => setOpen(isOpen ? null : i)}
            >
              {f.q}
              <span className="t-acc-chevron text-muted-foreground" aria-hidden="true">
                <svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M4 6.5L8 10.5L12 6.5" />
                </svg>
              </span>
            </button>
            <div className="t-acc-panel" id={id}>
              <div className="t-acc-panel-inner">
                <p className="mt-3 max-w-2xl text-[14px] leading-relaxed text-muted-foreground">{f.a}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
