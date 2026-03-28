type Step = {
  n: number;
  title: string;
  detail: string;
};

type StepFlowProps = {
  steps: Step[];
  circleColor: string;
  textColor: string;
  arrowColor: string;
};

export function StepFlow({ steps, circleColor, textColor, arrowColor }: StepFlowProps) {
  return (
    <div className="flex flex-wrap items-start gap-2">
      {steps.flatMap(({ n, title, detail }, i) => [
        <div key={n} className="bg-muted rounded-xl p-4 text-center flex-1 min-w-28">
          <div className={`w-9 h-9 ${circleColor} rounded-full flex items-center justify-center font-black text-sm mx-auto mb-3`}>
            {n}
          </div>
          <div className={`font-semibold text-sm mb-1 ${textColor}`}>{title}</div>
          <div className="text-muted-foreground text-xs font-mono whitespace-pre-line leading-relaxed">{detail}</div>
        </div>,
        ...(i < steps.length - 1
          ? [
              <div key={`a${i}`} className={`text-2xl font-black self-center hidden md:block ${arrowColor}`}>
                →
              </div>,
            ]
          : []),
      ])}
    </div>
  );
}
