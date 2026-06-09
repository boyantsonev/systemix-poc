import Link from "next/link";
import { DeviceFrame } from "./DeviceFrame";
import { PATTERN_LABEL, SURFACE_LABEL, type Persona, type Workflow } from "@/lib/ports/atlas";

// Resolves a workflow + step to its in-app route, rendered inside the device
// frame — the Systemix app is its own prototype. Server component (links + iframe).
export function PrototypeView({
  persona,
  workflow,
  activeStep,
}: {
  persona: Persona;
  workflow: Workflow;
  activeStep: string;
}) {
  const step = workflow.steps.find((s) => s.id === activeStep) ?? workflow.steps[0];
  const screen = step?.screen;

  return (
    <div className="flex flex-col h-full bg-muted/30">
      {/* Header */}
      <div className="flex items-center gap-4 px-5 py-3 border-b border-border bg-background shrink-0">
        <Link
          href="/atlas"
          className="px-3 py-1.5 rounded-full border border-border text-[13px] text-foreground hover:border-foreground/60 transition-colors shrink-0"
        >
          ← Atlas
        </Link>
        <div className="flex-1 min-w-0">
          <p className="text-[15px] font-black leading-tight text-foreground truncate">{workflow.title}</p>
          <p className="text-[12px] text-muted-foreground truncate">
            {PATTERN_LABEL[workflow.pattern]} · {SURFACE_LABEL[workflow.surface]} · {step?.label ?? activeStep}
          </p>
        </div>
        <div className="hidden md:flex flex-wrap gap-1.5 justify-end max-w-[460px]">
          {workflow.steps.map((s) => {
            const active = s.id === activeStep;
            return (
              <Link
                key={s.id}
                href={`/atlas/p/${persona}/${workflow.id}/${s.id}`}
                className={`px-2.5 py-1 rounded-full border text-[11px] transition-colors ${
                  active
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                {s.label}
              </Link>
            );
          })}
        </div>
      </div>

      {/* Prototype frame */}
      <div className="flex-1 min-h-0 overflow-auto flex items-center justify-center p-7">
        <DeviceFrame surface={workflow.surface}>
          {screen ? (
            <iframe
              src={screen}
              title={step?.label ?? workflow.title}
              className="w-full h-full border-0 bg-background"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center gap-2 p-8 text-center">
              <p className="text-[15px] font-bold text-foreground">{step?.label}</p>
              <p className="text-[13px] text-muted-foreground">{step?.note}</p>
            </div>
          )}
        </DeviceFrame>
      </div>

      {/* Footer */}
      {screen && (
        <div className="shrink-0 px-5 py-2 border-t border-border bg-background flex items-center gap-2">
          <span className="text-[11px] font-mono text-muted-foreground/60 truncate">{step?.note}</span>
          <div className="flex-1" />
          <Link
            href={screen}
            target="_blank"
            className="text-[11px] font-mono text-muted-foreground hover:text-foreground transition-colors shrink-0"
          >
            open {screen} ↗
          </Link>
        </div>
      )}
    </div>
  );
}
