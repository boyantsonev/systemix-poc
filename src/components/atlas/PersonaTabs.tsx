"use client";

import { PERSONAS, PERSONA_LABEL, type Persona } from "@/lib/ports/atlas";

interface PersonaTabsProps {
  active: Persona;
  onChange: (p: Persona) => void;
}

// Segmented switcher. Active segment is the only place the accent appears.
export function PersonaTabs({ active, onChange }: PersonaTabsProps) {
  return (
    <div className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/50 p-1">
      {PERSONAS.map((p) => {
        const isActive = p === active;
        return (
          <button
            key={p}
            onClick={() => onChange(p)}
            className={`px-4 py-1.5 rounded-full text-[13px] transition-colors ${
              isActive
                ? "bg-primary text-primary-foreground font-semibold"
                : "text-muted-foreground hover:text-foreground font-medium"
            }`}
          >
            {PERSONA_LABEL[p]}
          </button>
        );
      })}
    </div>
  );
}
