"use client";

type DiffViewerProps = {
  added: { key: string; value: string }[];
  changed: { key: string; from: string; to: string }[];
  removed: { key: string; lastValue: string }[];
  affectedFiles?: string[];
  affectedComponents?: string[];
};

function padKey(key: string, len = 32): string {
  return key.length >= len ? key : key + " ".repeat(len - key.length);
}

export function DiffViewer({
  added,
  changed,
  removed,
  affectedFiles,
  affectedComponents,
}: DiffViewerProps) {
  const hasFiles = affectedFiles && affectedFiles.length > 0;
  const hasComponents = affectedComponents && affectedComponents.length > 0;

  return (
    <div className="space-y-2">
      <div className="bg-muted/60 dark:bg-black/40 rounded-lg p-3 font-mono text-[11px] leading-relaxed">
        {added.map((line, i) => (
          <div key={`a-${i}`} className="flex gap-2 items-baseline">
            <span className="text-emerald-700 dark:text-emerald-400 flex-shrink-0">+</span>
            <span className="text-emerald-700 dark:text-emerald-400">
              {padKey(line.key)}&nbsp;{line.value}
            </span>
          </div>
        ))}
        {changed.map((line, i) => (
          <div key={`c-${i}`} className="flex gap-2 items-baseline">
            <span className="text-amber-700 dark:text-amber-300 flex-shrink-0">~</span>
            <span className="text-amber-700 dark:text-amber-300">
              {padKey(line.key)}&nbsp;{line.from}
            </span>
            <span className="text-muted-foreground">&rarr;</span>
            <span className="text-amber-700 dark:text-amber-300">{line.to}</span>
          </div>
        ))}
        {removed.map((line, i) => (
          <div key={`r-${i}`} className="flex gap-2 items-baseline">
            <span className="text-red-600 dark:text-red-400 flex-shrink-0">-</span>
            <span className="text-red-600 dark:text-red-400">
              {padKey(line.key)}&nbsp;{line.lastValue}
            </span>
          </div>
        ))}
      </div>

      {(hasFiles || hasComponents) && (
        <div className="flex flex-col gap-0.5 px-0.5">
          {hasFiles && (
            <p className="text-[10px] text-muted-foreground">
              Affects: {affectedFiles!.join(", ")}
            </p>
          )}
          {hasComponents && (
            <p className="text-[10px] text-muted-foreground">
              Components:{" "}
              {affectedComponents!.map((c, i) => (
                <span key={i}>
                  <span className="text-teal-700 dark:text-teal-400">{c}</span>
                  {i < affectedComponents!.length - 1 ? ", " : ""}
                </span>
              ))}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
