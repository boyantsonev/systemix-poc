import { cn } from "@/lib/utils";

// A loop or process drawn as steps in reading order, with the steps where a person decides
// marked. Plain HTML, so it wraps on a phone and reads without JavaScript; the motion layer
// (src/styles/motion.css) brings the steps in one after another once the section is shown.

export type Step = { label: string; note: string; person?: boolean };

export function StepDiagram({
  steps,
  loopBack,
  personLabel,
  columns = 5,
  className,
}: {
  steps: Step[];
  loopBack: string;
  personLabel: string;
  /** steps per row on a wide screen: pick one the steps fill (10 → 5, 6 → 6) */
  columns?: 5 | 6;
  className?: string;
}) {
  return (
    <figure className={cn("min-w-0", className)}>
      <ol className={cn("grid gap-3 sm:grid-cols-2", columns === 6 ? "lg:grid-cols-6" : "lg:grid-cols-5")}>
        {steps.map((s, i) => (
          <li
            key={s.label}
            data-reveal-step
            style={{ "--step": i } as React.CSSProperties}
            className={cn(
              "relative flex flex-col rounded-[var(--radius-screen)] border bg-card p-4 shadow-[var(--shadow-panel)]",
              s.person ? "border-highlight" : "border-border",
            )}
          >
            <p className="flex items-center gap-2 font-mono text-[11px] text-muted-foreground">
              <span>{String(i + 1).padStart(2, "0")}</span>
              {s.person && <span className="tva-label rounded-sm border border-highlight px-1.5 py-px text-[9px] text-highlight">{personLabel}</span>}
            </p>
            <p className="mt-2 text-[14px] font-bold text-foreground">{s.label}</p>
            <p className="mt-1 text-[12px] leading-snug text-muted-foreground">{s.note}</p>
          </li>
        ))}
      </ol>
      <figcaption
        data-reveal-step
        style={{ "--step": steps.length } as React.CSSProperties}
        className="mt-4 flex items-center gap-2 font-mono text-[12px] text-muted-foreground"
      >
        <span aria-hidden className="text-highlight">↺</span>
        {loopBack}
      </figcaption>
    </figure>
  );
}
