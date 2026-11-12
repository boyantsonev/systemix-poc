import { cn } from "@/lib/utils";

// A loop drawn as a circle: the steps sit on a ring in order, clockwise from the top, joined by
// arcs; the steps where a person decides are filled. The legend beside it carries each step's
// note in plain text, so the diagram stays small and the words stay readable on a phone.
// Server-rendered SVG: it reads without JavaScript. The motion layer (src/styles/motion.css)
// draws the arcs and brings the steps in, one after another, when the section is shown.

export type LoopStep = { label: string; note: string; person?: boolean };

const R = 190; // ring radius
const NODE = 20; // step dot radius
const LABEL = 238; // label radius
const GAP = 0.13; // radians kept clear at each end of an arc (so it stops short of the dot)

const at = (r: number, a: number) => [r * Math.cos(a), r * Math.sin(a)] as const;
const angle = (i: number, n: number) => -Math.PI / 2 + (2 * Math.PI * i) / n;
const f = (v: number) => Math.round(v * 10) / 10;

function arc(i: number, n: number) {
  const a0 = angle(i, n) + GAP;
  const a1 = angle(i + 1, n) - GAP;
  const [x0, y0] = at(R, a0);
  const [x1, y1] = at(R, a1);
  return `M ${f(x0)} ${f(y0)} A ${R} ${R} 0 0 1 ${f(x1)} ${f(y1)}`;
}

export function LoopDiagram({
  steps,
  center,
  centerNote,
  personLabel,
  loopBack,
  className,
}: {
  steps: LoopStep[];
  /** the word in the middle of the ring, e.g. "a goal" */
  center: string;
  centerNote: string;
  personLabel: string;
  loopBack: string;
  className?: string;
}) {
  const n = steps.length;
  return (
    <figure className={cn("grid items-center gap-10 lg:grid-cols-[minmax(0,6fr)_minmax(0,5fr)]", className)}>
      <svg
        viewBox="-370 -290 740 580"
        role="img"
        aria-label={`${center}: ${steps.map((s) => s.label).join(", then ")}, then back to the start.`}
        className="mx-auto block h-auto w-full max-w-[640px] overflow-visible"
      >
        <defs>
          <marker id={`loop-head-${n}`} viewBox="0 0 10 10" refX="7" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M0 1 L8 5 L0 9 z" style={{ fill: "var(--muted-foreground)" }} />
          </marker>
        </defs>

        {steps.map((_, i) => (
          <path
            key={`arc-${i}`}
            d={arc(i, n)}
            pathLength={1}
            data-loop-arc
            markerEnd={`url(#loop-head-${n})`}
            className={i === n - 1 ? "loop-arc loop-arc-back" : "loop-arc"}
            style={{ "--step": i } as React.CSSProperties}
          />
        ))}

        <text textAnchor="middle" y={-6} className="loop-center">{center}</text>
        <text textAnchor="middle" y={22} className="loop-center-note">{centerNote}</text>

        {steps.map((s, i) => {
          const a = angle(i, n);
          const [x, y] = at(R, a);
          const [lx, ly] = at(LABEL, a);
          const cos = Math.cos(a);
          const anchor = Math.abs(cos) < 0.2 ? "middle" : cos > 0 ? "start" : "end";
          const dy = Math.sin(a) < -0.9 ? -4 : Math.sin(a) > 0.9 ? 14 : 5;
          return (
            <g key={s.label} data-loop-step style={{ "--step": i } as React.CSSProperties}>
              <circle cx={f(x)} cy={f(y)} r={NODE} className={s.person ? "loop-node loop-node-person" : "loop-node"} />
              <text x={f(x)} y={f(y) + 5} textAnchor="middle" className={s.person ? "loop-num loop-num-person" : "loop-num"}>
                {i + 1}
              </text>
              <text x={f(lx)} y={f(ly) + dy} textAnchor={anchor} className={s.person ? "loop-label loop-label-person" : "loop-label"}>
                {s.label}
              </text>
            </g>
          );
        })}
      </svg>

      <figcaption className="min-w-0">
        <ol className="flex flex-col">
          {steps.map((s, i) => (
            <li
              key={s.label}
              data-reveal-step
              style={{ "--step": i } as React.CSSProperties}
              className="grid grid-cols-[2rem_minmax(0,1fr)] items-baseline gap-x-2 border-b border-border/50 py-2 last:border-b-0"
            >
              <span className={cn("font-mono text-[12px]", s.person ? "text-highlight" : "text-muted-foreground")}>{String(i + 1).padStart(2, "0")}</span>
              <span className="text-[13px] leading-snug text-muted-foreground">
                <span className="font-bold text-foreground">{s.label}</span> · {s.note}
                {s.person && <span className="tva-label ml-2 inline-block whitespace-nowrap rounded-sm border border-highlight px-1.5 py-px align-middle text-[9px] text-highlight">{personLabel}</span>}
              </span>
            </li>
          ))}
        </ol>
        <p data-reveal-step style={{ "--step": n } as React.CSSProperties} className="mt-4 flex gap-2 font-mono text-[12px] text-muted-foreground">
          <span aria-hidden className="text-highlight">↺</span>
          {loopBack}
        </p>
      </figcaption>
    </figure>
  );
}
