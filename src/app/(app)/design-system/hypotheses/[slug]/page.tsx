import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { notFound } from "next/navigation";
import Link from "next/link";
import matter from "gray-matter";
import { MDXRemote } from "next-mdx-remote/rsc";
import { ContractAutoReload } from "@/components/contract/ContractAutoReload";

const HYPOTHESIS_DIR = join(process.cwd(), "contract", "hypotheses");

type SocialSignal = {
  platform:    string;
  url:         string;
  recorded_at: string;
  impressions?: number;
  clicks?:     number;
  likes?:      number;
  replies?:    number;
  shares?:     number;
};

type Fm = {
  id?:         string;
  section?:    string | null;
  hypothesis?: string;
  icp?:        string | null;
  status?:     string;
  created?:    string | null;
  variants?:   Record<string, string>;
  result?:     string | null;
  decision?:   string | null;
  confidence?: number | null;
  "evidence-posthog"?: unknown;
  "evidence-social"?:  SocialSignal[] | null;
};

export async function generateStaticParams() {
  const slugs: { slug: string }[] = [];
  try {
    for (const entry of readdirSync(HYPOTHESIS_DIR)) {
      if (entry.endsWith(".mdx")) slugs.push({ slug: entry.replace(".mdx", "") });
    }
  } catch {}
  return slugs;
}

function StatusPill({ status }: { status: string }) {
  const cls: Record<string, string> = {
    running:  "bg-blue-500/15 text-blue-400 border-blue-500/30",
    complete: "bg-green-500/15 text-green-400 border-green-500/30",
    archived: "bg-muted text-muted-foreground/50 border-border/40",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded border text-[11px] font-mono font-medium ${cls[status] ?? "bg-muted text-muted-foreground border-border"}`}>
      {status}
    </span>
  );
}

function DecisionPill({ decision }: { decision: string }) {
  const cls: Record<string, string> = {
    promote:     "bg-green-500/15 text-green-400 border-green-500/30",
    iterate:     "bg-amber-500/15 text-amber-400 border-amber-500/30",
    kill:        "bg-red-500/15 text-red-400 border-red-500/30",
    "no-action": "bg-muted text-muted-foreground/50 border-border/40",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded border text-[11px] font-mono font-medium ${cls[decision] ?? "bg-muted text-muted-foreground border-border"}`}>
      {decision}
    </span>
  );
}

function parseVariants(raw: string): Record<string, string> {
  const result: Record<string, string> = {};
  const lines = raw.split(/\r?\n/);
  let inVariants = false;
  for (const line of lines) {
    if (line.trim() === "variants:") { inVariants = true; continue; }
    if (inVariants) {
      if (/^\S/.test(line)) { inVariants = false; continue; }
      const m = line.match(/^\s{2}(\w+):\s+"?([^"]+)"?\s*$/);
      if (m) result[m[1]] = m[2];
    }
  }
  return result;
}

export default async function HypothesisDocPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const filePath = join(HYPOTHESIS_DIR, `${slug}.mdx`);

  let raw: string;
  try { raw = readFileSync(filePath, "utf8"); } catch { notFound(); return; }

  const { data: fm, content } = matter(raw) as { data: Fm; content: string };
  if (!fm.hypothesis) notFound();

  const id         = fm.id ?? slug;
  const status     = fm.status ?? "running";
  const variants   = parseVariants(raw);
  const hasContent = content.trim().length > 0;
  const isComplete = status === "complete";

  return (
    <article>
      <ContractAutoReload slug={slug} />

      {/* Breadcrumb */}
      <p className="text-[13px] font-mono text-muted-foreground mb-3">
        <Link href="/design-system" className="hover:text-foreground transition-colors">
          Design System
        </Link>
        <span className="text-muted-foreground/40"> · </span>
        <Link href="/design-system/hypotheses" className="hover:text-foreground transition-colors">
          Hypotheses
        </Link>
      </p>

      {/* Header */}
      <div className="flex items-start gap-3 flex-wrap mb-2">
        <h1 className="text-[1.6rem] font-black tracking-tight leading-[1.2] flex-1 min-w-0">
          {fm.hypothesis}
        </h1>
      </div>
      <div className="flex items-center gap-2 mb-8 flex-wrap">
        <StatusPill status={status} />
        {fm.decision && <DecisionPill decision={fm.decision} />}
        {fm.confidence != null && (
          <span className="text-[11px] font-mono text-muted-foreground/50">
            {Math.round(fm.confidence * 100)}% confidence
          </span>
        )}
      </div>

      {/* Result block — only when complete */}
      {isComplete && fm.result && (
        <div className="rounded-xl border border-green-500/25 bg-green-500/5 px-4 py-4 mb-8">
          <p className="text-[11px] font-mono text-green-400/70 uppercase tracking-widest mb-2">
            Experiment result
          </p>
          <p className="text-[14px] text-foreground leading-relaxed">{fm.result}</p>
        </div>
      )}

      {/* Variants */}
      {Object.keys(variants).length > 0 && (
        <div className="mb-8">
          <p className="text-[11px] font-mono text-muted-foreground/50 uppercase tracking-widest mb-3">Variants</p>
          <div className="space-y-2">
            {Object.entries(variants).map(([key, text]) => (
              <div key={key} className="rounded-xl border border-border/40 bg-muted/5 px-4 py-3">
                <p className="text-[10px] font-mono text-muted-foreground/50 uppercase tracking-widest mb-1.5">{key}</p>
                <p className="text-[14px] text-foreground leading-snug">&ldquo;{text}&rdquo;</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Social signals */}
      {fm["evidence-social"] && Array.isArray(fm["evidence-social"]) && fm["evidence-social"].length > 0 && (
        <div className="mb-8">
          <p className="text-[11px] font-mono text-muted-foreground/50 uppercase tracking-widest mb-3">Social signals</p>
          <div className="space-y-2">
            {fm["evidence-social"].map((s, i) => {
              const metrics = [
                s.impressions != null && `${s.impressions.toLocaleString()} impressions`,
                s.clicks      != null && `${s.clicks.toLocaleString()} clicks`,
                s.likes       != null && `${s.likes.toLocaleString()} likes`,
                s.replies     != null && `${s.replies.toLocaleString()} replies`,
                s.shares      != null && `${s.shares.toLocaleString()} shares`,
              ].filter(Boolean);
              return (
                <div key={i} className="rounded-xl border border-border/40 bg-muted/5 px-4 py-3 flex items-start gap-4">
                  <span className="text-[10px] font-mono text-muted-foreground/50 uppercase tracking-widest w-16 shrink-0 pt-0.5">{s.platform}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-mono text-muted-foreground/70 mb-1">{metrics.join("  ·  ") || "no metrics"}</p>
                    <a href={s.url} target="_blank" rel="noopener noreferrer"
                       className="text-[11px] font-mono text-muted-foreground/40 hover:text-muted-foreground truncate block transition-colors">
                      {s.url}
                    </a>
                  </div>
                  <span className="text-[10px] font-mono text-muted-foreground/30 shrink-0">{s.recorded_at}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <hr className="border-border/40 mb-8" />

      {/* Prose body */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-[11px] font-mono text-muted-foreground/50 uppercase tracking-widest">Rationale</p>
        <a
          href={`vscode://file/${filePath}`}
          className="text-[11px] font-mono text-muted-foreground/40 hover:text-muted-foreground border border-border/30 px-2 py-0.5 rounded hover:border-border/60 transition-colors"
        >
          Edit in editor
        </a>
      </div>

      {hasContent ? (
        <div className="prose prose-sm prose-invert max-w-none text-muted-foreground leading-relaxed mb-10 [&_code]:text-foreground/80 [&_code]:bg-muted/60 [&_code]:px-1 [&_code]:rounded [&_code]:text-[12px]">
          <MDXRemote source={content} />
        </div>
      ) : (
        <p className="font-mono text-[13px] text-muted-foreground/40 mb-10">
          No rationale yet. Run{" "}
          <code className="text-muted-foreground/60">/init-experiment</code>{" "}
          to have Hermes write this page.
        </p>
      )}

      {/* Metadata */}
      <div className="rounded-xl border border-border/40 bg-muted/10 px-4 py-2 divide-y divide-border/20">
        <div className="flex gap-3 py-2">
          <span className="text-[11px] font-mono text-muted-foreground/60 w-36 shrink-0">id</span>
          <span className="text-[12px] font-mono text-foreground">{id}</span>
        </div>
        {fm.section && (
          <div className="flex gap-3 py-2">
            <span className="text-[11px] font-mono text-muted-foreground/60 w-36 shrink-0">section</span>
            <span className="text-[12px] font-mono text-muted-foreground/70">{fm.section}</span>
          </div>
        )}
        {fm.icp && (
          <div className="flex gap-3 py-2">
            <span className="text-[11px] font-mono text-muted-foreground/60 w-36 shrink-0">icp</span>
            <span className="text-[12px] font-mono text-muted-foreground/70">{fm.icp}</span>
          </div>
        )}
        {fm.created && (
          <div className="flex gap-3 py-2">
            <span className="text-[11px] font-mono text-muted-foreground/60 w-36 shrink-0">created</span>
            <span className="text-[12px] font-mono text-foreground">{String(fm.created).slice(0, 10)}</span>
          </div>
        )}
      </div>
    </article>
  );
}
