// Keep semantic colors here — purple=trigger, teal=worker, amber=result are intentional
import { FlowVariant, type FlowVariantKey } from "@/components/docs/FlowVariant";

type FlowStep = {
  label: string;
  code: string;
  variant: FlowVariantKey;
  role?: string;
};

const flow: FlowStep[] = [
  { label: "You type",        code: "/generate-from-figma\nhttps://figma.com/...", variant: "purple", role: "TRIGGER"  },
  { label: "Skill injected",  code: "Prompt loaded into\nconversation",           variant: "slate"                     },
  { label: "Claude decides",  code: "Needs figma-to-code\nagent",                 variant: "slate"                     },
  { label: "Agent spawns",    code: "Reads codebase\nFetches Figma\nGenerates",   variant: "teal",   role: "WORKER"   },
  { label: "Result returned", code: "Finished component\nback in main chat",       variant: "amber"                     },
];

export function WorkflowDiagram() {
  return (
    <div className="flex flex-wrap gap-1 items-stretch">
      {flow.flatMap(({ label, code, variant, role }, i) => {
        const s = FlowVariant[variant];
        return [
          <div key={label} className={`rounded-lg border p-3 flex-1 min-w-28 flex flex-col ${s.card}`}>
            <div className={`font-medium text-xs mb-2 uppercase tracking-wider ${s.label}`}>{label}</div>
            <div className={`text-xs font-mono whitespace-pre-line flex-1 leading-relaxed ${s.code}`}>{code}</div>
            {role && <div className={`mt-2 text-xs font-semibold tracking-wider ${s.role}`}>{role}</div>}
          </div>,
          ...(i < flow.length - 1
            ? [<div key={`arr-${i}`} className="text-muted-foreground text-base font-medium hidden md:flex items-center">→</div>]
            : []),
        ];
      })}
    </div>
  );
}
