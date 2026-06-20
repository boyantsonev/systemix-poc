import { promises as fs } from "fs";
import path from "path";
import matter from "gray-matter";

// Server component: reads the POC's own live experiment at build time so the
// "running on itself" section shows real values, not a mockup. Falls back to a
// static snapshot if the file can't be read in the build environment.

type LiveExperiment = {
  id: string;
  status: string;
  section: string;
  hypothesis: string;
  control: string;
  variantB: string;
};

const FALLBACK: LiveExperiment = {
  id: "landing-velocity-gap-2026-06",
  status: "running",
  section: "hero",
  hypothesis:
    "Reframing the hero around the velocity gap converts the daily-shipping founder better than the memory-loss framing.",
  control: "You shipped a hypothesis. Now close the loop.",
  variantB: "You ship every day. Your system should learn every day too.",
};

async function readLiveExperiment(): Promise<LiveExperiment> {
  try {
    const file = path.join(
      process.cwd(),
      "contract/hypotheses/landing-velocity-gap-2026-06.mdx",
    );
    const { data } = matter(await fs.readFile(file, "utf8"));
    return {
      id: String(data.id ?? FALLBACK.id),
      status: String(data.status ?? FALLBACK.status),
      section: String(data.section ?? FALLBACK.section),
      hypothesis: String(data.hypothesis ?? FALLBACK.hypothesis),
      control: String(data.variants?.control ?? FALLBACK.control),
      variantB: String(data.variants?.variant_b ?? FALLBACK.variantB),
    };
  } catch {
    return FALLBACK;
  }
}

function Field({ k, v, accent }: { k: string; v: string; accent?: boolean }) {
  return (
    <div className="flex gap-2">
      <span className="shrink-0 text-muted-foreground/50">{k}:</span>
      <span className={accent ? "text-emerald-500" : "text-foreground/80"}>{v}</span>
    </div>
  );
}

export async function DemoOfItself() {
  const exp = await readLiveExperiment();

  return (
    <div className="grid gap-3 md:grid-cols-2">
      {/* the live experiment file */}
      <div className="rounded-xl border border-border/50 bg-card overflow-hidden">
        <div className="flex items-center justify-between border-b border-border/40 px-4 py-2.5">
          <span className="font-mono text-[11px] text-muted-foreground/60">
            experiments/{exp.id}.mdx
          </span>
          <span className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-mono uppercase tracking-wide text-emerald-500">
            {exp.status}
          </span>
        </div>
        <div className="space-y-1.5 px-4 py-4 font-mono text-[11.5px] leading-relaxed">
          <Field k="section" v={exp.section} />
          <div className="flex gap-2">
            <span className="shrink-0 text-muted-foreground/50">hypothesis:</span>
            <span className="text-foreground/80">{exp.hypothesis}</span>
          </div>
          <Field k="control" v={exp.control} />
          <div className="flex gap-2">
            <span className="shrink-0 text-muted-foreground/50">variant_b:</span>
            <span className="text-foreground/80">
              {exp.variantB}{" "}
              <span className="text-muted-foreground/50">← served by default</span>
            </span>
          </div>
          <Field k="decision" v="pending evidence" />
        </div>
      </div>

      {/* the ledger it writes back to */}
      <div className="rounded-xl border border-border/50 bg-card overflow-hidden">
        <div className="border-b border-border/40 px-4 py-2.5">
          <span className="font-mono text-[11px] text-muted-foreground/60">
            experiments/LEARNINGS.md
          </span>
        </div>
        <div className="px-4 py-4 font-mono text-[11.5px] leading-relaxed">
          <p className="mb-3 text-muted-foreground/50">## Memory</p>
          <p className="text-muted-foreground">
            <span className="text-muted-foreground/40">—</span> No entries yet. The first one lands
            the day this experiment closes: earned, cited back to{" "}
            <span className="text-foreground/70">{exp.id}</span>, with a confidence and a review-by
            date.
          </p>
          <p className="mt-4 text-[11px] not-italic text-muted-foreground/50">
            An empty ledger is the honest state — nothing here is hand-written.
          </p>
        </div>
      </div>
    </div>
  );
}
