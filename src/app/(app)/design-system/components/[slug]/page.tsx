import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { notFound } from "next/navigation";
import Link from "next/link";
import matter from "gray-matter";
import { MDXRemote } from "next-mdx-remote/rsc";

const COMPONENT_DIR = join(process.cwd(), "contract", "components");

type Fm = {
  component?:          string;
  parity?:             string;
  path?:               string;
  "figma-node"?:       string | null;
  "evidence-storybook"?: string | null;
  "storybook-story"?:  string | null;
  "storybook-drift"?:  boolean;
  "last-updated"?:     string;
  "last-resolver"?:    string | null;
  "usage-count-30d"?:  number | null;
};

export async function generateStaticParams() {
  const slugs: { slug: string }[] = [];
  try {
    for (const entry of readdirSync(COMPONENT_DIR)) {
      if (entry.endsWith(".mdx")) slugs.push({ slug: entry.replace(".mdx", "") });
    }
  } catch {}
  return slugs;
}

function ParityPill({ parity }: { parity: string }) {
  const cls: Record<string, string> = {
    clean:   "bg-green-500/15 text-green-400 border-green-500/30",
    drifted: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded border text-[11px] font-mono font-medium ${cls[parity] ?? "bg-muted text-muted-foreground border-border"}`}>
      {parity}
    </span>
  );
}

function isUrl(s: string): boolean {
  return s.startsWith("http://") || s.startsWith("https://");
}

export default async function ComponentDocPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const filePath = join(COMPONENT_DIR, `${slug}.mdx`);

  let raw: string;
  try { raw = readFileSync(filePath, "utf8"); } catch { notFound(); return; }

  const { data: fm, content } = matter(raw) as { data: Fm; content: string };
  if (!fm.component) notFound();

  const name          = fm.component!;
  const parity        = fm.parity ?? "unknown";
  const storybookHref = fm["evidence-storybook"] ?? fm["storybook-story"] ?? null;
  const hasStorybook  = Boolean(storybookHref);
  const storybookIsUrl = hasStorybook && isUrl(storybookHref!);

  return (
    <article>
      {/* Breadcrumb */}
      <p className="text-[13px] font-mono text-muted-foreground mb-3">
        <Link href="/design-system/components" className="hover:text-foreground transition-colors">
          Components
        </Link>
      </p>

      {/* Header */}
      <div className="flex items-center gap-3 flex-wrap mb-8">
        <h1 className="text-[2rem] font-black tracking-tight leading-[1.15]">{name}</h1>
        <ParityPill parity={parity} />
        {fm["storybook-drift"] && (
          <span className="inline-flex items-center px-2 py-0.5 rounded border text-[11px] font-mono font-medium bg-orange-500/15 text-orange-400 border-orange-500/30">
            storybook drift
          </span>
        )}
      </div>

      {/* Storybook embed / link */}
      {hasStorybook ? (
        <div className="mb-10">
          {storybookIsUrl ? (
            <iframe
              src={storybookHref!}
              className="w-full rounded-xl border border-border/40 bg-muted/10"
              style={{ height: 400 }}
              title={`${name} Storybook story`}
            />
          ) : (
            <div className="rounded-xl border border-border/40 bg-muted/10 px-4 py-4 flex items-center gap-4">
              <span className="text-[12px] font-mono text-muted-foreground/60 flex-1 truncate">
                {storybookHref}
              </span>
              <span className="text-[11px] font-mono text-muted-foreground/40 border border-border/40 px-2 py-1 rounded">
                story path — run Storybook to preview
              </span>
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-xl border border-border/40 bg-muted/5 px-4 py-4 mb-10 flex items-center gap-3">
          <span className="text-[13px] text-muted-foreground/40">No story linked</span>
          <span className="text-[12px] font-mono text-muted-foreground/30">
            Run /storybook to link or scaffold a story
          </span>
        </div>
      )}

      <hr className="border-border/40 mb-8" />

      {/* Prose body — primary content */}
      <div className="prose prose-sm prose-invert max-w-none text-muted-foreground leading-relaxed mb-10 [&_code]:text-foreground/80 [&_code]:bg-muted/60 [&_code]:px-1 [&_code]:rounded [&_code]:text-[12px]">
        <MDXRemote source={content} />
      </div>

      {/* Metadata */}
      <div className="rounded-xl border border-border/40 bg-muted/10 px-4 py-2 mb-8 divide-y divide-border/20">
        {fm.path && (
          <div className="flex gap-3 py-2">
            <span className="text-[11px] font-mono text-muted-foreground/60 w-36 shrink-0">source</span>
            <span className="text-[12px] font-mono text-foreground break-all">{fm.path}</span>
          </div>
        )}
        {fm["figma-node"] && (
          <div className="flex gap-3 py-2">
            <span className="text-[11px] font-mono text-muted-foreground/60 w-36 shrink-0">figma-node</span>
            <span className="text-[12px] font-mono text-muted-foreground/70">{fm["figma-node"]}</span>
          </div>
        )}
        {storybookHref && (
          <div className="flex gap-3 py-2">
            <span className="text-[11px] font-mono text-muted-foreground/60 w-36 shrink-0">storybook</span>
            <span className="text-[12px] font-mono text-foreground break-all">{storybookHref}</span>
          </div>
        )}
        {fm["usage-count-30d"] != null && (
          <div className="flex gap-3 py-2">
            <span className="text-[11px] font-mono text-muted-foreground/60 w-36 shrink-0">usage-30d</span>
            <span className="text-[12px] font-mono text-foreground">{fm["usage-count-30d"]!.toLocaleString()} renders</span>
          </div>
        )}
        {fm["last-updated"] && (
          <div className="flex gap-3 py-2">
            <span className="text-[11px] font-mono text-muted-foreground/60 w-36 shrink-0">last-updated</span>
            <span className="text-[12px] font-mono text-foreground">{String(fm["last-updated"]).slice(0, 10)}</span>
          </div>
        )}
      </div>

      <Link
        href="/contract"
        className="inline-block text-[11px] font-mono text-muted-foreground/40 hover:text-muted-foreground transition-colors"
      >
        → resolve in contract triage
      </Link>
    </article>
  );
}
