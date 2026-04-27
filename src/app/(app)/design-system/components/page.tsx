import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import Link from "next/link";
import matter from "gray-matter";

const COMPONENT_DIR = join(process.cwd(), "contract", "components");

type Component = {
  slug:          string;
  name:          string;
  parity:        string;
  path?:         string;
  hasStorybook:  boolean;
  "last-updated"?: string;
};

function readComponents(): Component[] {
  const rows: Component[] = [];
  try {
    for (const entry of readdirSync(COMPONENT_DIR)) {
      if (!entry.endsWith(".mdx")) continue;
      const full = join(COMPONENT_DIR, entry);
      if (statSync(full).isDirectory()) continue;
      const { data: fm } = matter(readFileSync(full, "utf8"));
      if (!fm.component) continue;
      rows.push({
        slug:          entry.replace(".mdx", ""),
        name:          fm.component as string,
        parity:        (fm.parity as string) ?? "unknown",
        path:          fm.path as string | undefined,
        hasStorybook:  Boolean(fm["evidence-storybook"] ?? fm["storybook-story"]),
        "last-updated": fm["last-updated"] as string | undefined,
      });
    }
  } catch {}
  return rows.sort((a, b) => a.name.localeCompare(b.name));
}

function ParityPill({ parity }: { parity: string }) {
  const cls: Record<string, string> = {
    clean:   "bg-green-500/15 text-green-400 border-green-500/30",
    drifted: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
  };
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded border text-[10px] font-mono font-medium ${cls[parity] ?? "bg-muted text-muted-foreground border-border"}`}>
      {parity}
    </span>
  );
}

export default function ComponentsDocIndexPage() {
  const components = readComponents();
  const drifted = components.filter(c => c.parity !== "clean").length;

  return (
    <article>
      <p className="text-[13px] font-mono text-muted-foreground mb-3">Design System</p>
      <h1 className="text-[2rem] font-black tracking-tight leading-[1.15] mb-4">Components</h1>
      <p className="text-[16px] text-muted-foreground leading-relaxed mb-2">
        {components.length} components — contracts authored by Hermes, stories managed by the /storybook skill.
      </p>
      {drifted > 0 && (
        <div className="flex gap-3 mb-10 text-[12px] font-mono">
          <span className="text-yellow-400/80">{drifted} drifted</span>
          <Link href="/contract" className="text-muted-foreground/50 hover:text-muted-foreground transition-colors">
            → resolve in contract triage
          </Link>
        </div>
      )}
      {components.length > 0 && drifted === 0 && <div className="mb-10" />}

      <hr className="border-border/40 mb-10" />

      {components.length === 0 ? (
        <div className="rounded-xl border border-border/40 px-6 py-12 text-center">
          <p className="text-[14px] text-muted-foreground mb-2">No component contracts yet</p>
          <p className="text-[13px] text-muted-foreground/60">
            Run Hermes to author component contracts into{" "}
            <code className="font-mono text-[12px]">contract/components/</code>
          </p>
        </div>
      ) : (
        <div className="space-y-px rounded-xl overflow-hidden border border-border/40">
          {components.map((c) => (
            <Link
              key={c.slug}
              href={`/design-system/components/${c.slug}`}
              className="flex items-center gap-4 px-4 py-4 bg-background hover:bg-muted/20 transition-colors border-b border-border/30 last:border-0"
            >
              {/* Parity dot */}
              <span className={`shrink-0 w-2 h-2 rounded-full ${
                c.parity === "clean" ? "bg-green-500" :
                c.parity === "drifted" ? "bg-yellow-500" : "bg-muted-foreground/30"
              }`} />

              <span className="flex-1 font-mono text-[13px] text-foreground">{c.name}</span>

              {c.path && (
                <span className="text-[11px] font-mono text-muted-foreground/40 hidden sm:block truncate max-w-[200px]">
                  {c.path}
                </span>
              )}

              {c.hasStorybook && (
                <span className="text-[10px] font-mono text-muted-foreground/50 border border-border/40 px-1.5 py-0.5 rounded">
                  SB
                </span>
              )}

              <ParityPill parity={c.parity} />
              <span className="text-muted-foreground/30 text-[11px]">→</span>
            </Link>
          ))}
        </div>
      )}
    </article>
  );
}
