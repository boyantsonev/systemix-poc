import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import Link from "next/link";
import matter from "gray-matter";
import { HypothesisCreateButton } from "@/components/hypothesis/HypothesisCreateButton";

const HYPOTHESIS_DIR = join(process.cwd(), "contract", "hypotheses");

type Hypothesis = {
  slug:       string;
  id:         string;
  section:    string | null;
  hypothesis: string;
  icp:        string | null;
  status:     string;
  decision:   string | null;
  confidence: number | null;
};

function readHypotheses(): Hypothesis[] {
  const rows: Hypothesis[] = [];
  try {
    for (const entry of readdirSync(HYPOTHESIS_DIR)) {
      if (!entry.endsWith(".mdx")) continue;
      const { data: fm } = matter(readFileSync(join(HYPOTHESIS_DIR, entry), "utf8"));
      rows.push({
        slug:       entry.replace(".mdx", ""),
        id:         String(fm.id         ?? entry.replace(".mdx", "")),
        section:    fm.section    ? String(fm.section)    : null,
        hypothesis: String(fm.hypothesis ?? ""),
        icp:        fm.icp        ? String(fm.icp)        : null,
        status:     String(fm.status     ?? "running"),
        decision:   fm.decision   ? String(fm.decision)   : null,
        confidence: fm.confidence != null ? Number(fm.confidence) : null,
      });
    }
  } catch {}
  return rows.sort((a, b) => (a.section ?? "").localeCompare(b.section ?? ""));
}

function StatusPill({ status }: { status: string }) {
  const cls: Record<string, string> = {
    running:  "bg-blue-500/15 text-blue-400 border-blue-500/30",
    complete: "bg-green-500/15 text-green-400 border-green-500/30",
    archived: "bg-muted text-muted-foreground/50 border-border/40",
  };
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded border text-[10px] font-mono font-medium ${cls[status] ?? "bg-muted text-muted-foreground border-border"}`}>
      {status}
    </span>
  );
}

function DecisionPill({ decision }: { decision: string }) {
  const cls: Record<string, string> = {
    promote:   "bg-green-500/15 text-green-400 border-green-500/30",
    iterate:   "bg-amber-500/15 text-amber-400 border-amber-500/30",
    kill:      "bg-red-500/15 text-red-400 border-red-500/30",
    "no-action": "bg-muted text-muted-foreground/50 border-border/40",
  };
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded border text-[10px] font-mono font-medium ${cls[decision] ?? "bg-muted text-muted-foreground border-border"}`}>
      {decision}
    </span>
  );
}

export default function HypothesesPage() {
  const hypotheses = readHypotheses();

  const sections: Record<string, Hypothesis[]> = {};
  for (const h of hypotheses) {
    const key = h.section ?? "Uncategorised";
    (sections[key] ??= []).push(h);
  }

  const running  = hypotheses.filter(h => h.status === "running").length;
  const complete = hypotheses.filter(h => h.status === "complete").length;

  return (
    <article>
      <p className="text-[13px] font-mono text-muted-foreground mb-3">Design System</p>
      <div className="flex items-start justify-between gap-4 mb-4">
        <h1 className="text-[2rem] font-black tracking-tight leading-[1.15]">Hypotheses</h1>
        <div className="pt-1.5">
          <HypothesisCreateButton />
        </div>
      </div>
      <p className="text-[16px] text-muted-foreground leading-relaxed mb-2">
        {hypotheses.length} hypothesis contract{hypotheses.length !== 1 ? "s" : ""} — every test, variant, and decision written by Hermes.
      </p>
      {hypotheses.length > 0 && (
        <div className="flex gap-3 mb-10 text-[12px] font-mono">
          {running > 0  && <span className="text-blue-400/80">{running} running</span>}
          {complete > 0 && <span className="text-green-400/80">{complete} complete</span>}
          <a
            href="/docs/concepts/hypothesis-validation"
            className="text-muted-foreground/50 hover:text-muted-foreground transition-colors"
          >
            → how the loop works
          </a>
        </div>
      )}

      <hr className="border-border/40 mb-10" />

      {hypotheses.length === 0 ? (
        <div className="rounded-xl border border-border/40 px-6 py-12 text-center">
          <p className="text-[14px] text-muted-foreground mb-2">No hypothesis contracts yet</p>
          <p className="text-[13px] text-muted-foreground/60">
            Run <code className="font-mono text-[12px]">/init-experiment</code> to create the first one in{" "}
            <code className="font-mono text-[12px]">contract/hypotheses/</code>
          </p>
        </div>
      ) : (
        <div className="space-y-10">
          {Object.entries(sections).map(([section, items]) => (
            <section key={section}>
              <h2 className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/50 mb-4">
                {section.replace(/-/g, " ")}
              </h2>
              <div className="space-y-px rounded-xl overflow-hidden border border-border/40">
                {items.map((h) => (
                  <Link
                    key={h.slug}
                    href={`/design-system/hypotheses/${h.slug}`}
                    className="flex items-start gap-4 px-4 py-3.5 bg-background hover:bg-muted/20 transition-colors border-b border-border/30 last:border-0"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-mono text-[12px] text-muted-foreground/50 mb-0.5 truncate">{h.id}</p>
                      <p className="text-[13px] text-foreground leading-snug line-clamp-2">{h.hypothesis}</p>
                      {h.icp && (
                        <p className="text-[11px] font-mono text-muted-foreground/50 mt-1">ICP: {h.icp}</p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1.5 shrink-0 pt-0.5">
                      <StatusPill status={h.status} />
                      {h.decision && <DecisionPill decision={h.decision} />}
                      {h.confidence != null && (
                        <span className="text-[10px] font-mono text-muted-foreground/40">
                          {Math.round(h.confidence * 100)}% conf
                        </span>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </article>
  );
}
