// SYSTMIX-201: Spike 2 — rendering test for Hermes-written MDX contracts
// Reads MDX from /contract/{type}/{name}.mdx at the project root,
// parses frontmatter with gray-matter, renders prose with next-mdx-remote/rsc

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { notFound } from "next/navigation";
import matter from "gray-matter";
import { MDXRemote } from "next-mdx-remote/rsc";

const CONTRACT_DIR = join(process.cwd(), "contract");

function findMdxFile(slug: string): string | null {
  function scan(dir: string): string | null {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) {
        const found = scan(full);
        if (found) return found;
      } else if (entry === `${slug}.mdx`) {
        return full;
      }
    }
    return null;
  }
  try { return scan(CONTRACT_DIR); } catch { return null; }
}

export async function generateStaticParams() {
  const slugs: { slug: string }[] = [];
  function scan(dir: string) {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) scan(full);
      else if (entry.endsWith(".mdx")) slugs.push({ slug: entry.replace(".mdx", "") });
    }
  }
  try { scan(CONTRACT_DIR); } catch {}
  return slugs;
}

type Fm = {
  token?: string;
  component?: string;
  value?: string;
  "figma-value"?: string | null;
  status?: string;
  parity?: string;
  resolved?: boolean;
  collection?: string;
  "last-updated"?: string;
  "last-resolver"?: string | null;
  "usage-count-30d"?: number | null;
};

function StatusBadge({ status }: { status: string }) {
  const colours: Record<string, string> = {
    clean:            "bg-green-500/15 text-green-400 border-green-500/30",
    drifted:          "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
    "missing-in-figma": "bg-blue-500/15 text-blue-400 border-blue-500/30",
    blocked:          "bg-red-500/15 text-red-400 border-red-500/30",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded border text-[11px] font-mono font-medium ${colours[status] ?? "bg-muted text-muted-foreground border-border"}`}>
      {status}
    </span>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex gap-3 py-1.5 border-b border-border/30 last:border-0">
      <span className="text-[11px] font-mono text-muted-foreground w-32 shrink-0 pt-0.5">{label}</span>
      <span className="text-[13px] font-mono text-foreground break-all">{value}</span>
    </div>
  );
}

export default async function ContractPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const filePath = findMdxFile(slug);
  if (!filePath) notFound();

  const raw = readFileSync(filePath, "utf8");
  const { data: fm, content } = matter(raw) as { data: Fm; content: string };
  const name = fm.token ?? fm.component ?? slug;
  const status = fm.status ?? fm.parity;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-2xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="mb-8">
          <p className="text-[11px] font-mono text-muted-foreground uppercase tracking-widest mb-2">
            {fm.token ? `Token · ${fm.collection}` : "Component"}
          </p>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-mono font-bold text-foreground">{name}</h1>
            {status && <StatusBadge status={status} />}
          </div>
        </div>

        {/* Frontmatter table */}
        <div className="rounded-lg border border-border/50 bg-muted/20 px-4 py-2 mb-8 divide-y divide-border/20">
          {fm.value     && <Field label="value"         value={fm.value} />}
          {("figma-value" in fm) && <Field label="figma-value"   value={fm["figma-value"] ?? "null"} />}
          {fm.collection && <Field label="collection"    value={fm.collection} />}
          {"resolved" in fm && <Field label="resolved"     value={String(fm.resolved)} />}
          {fm["last-updated"] && <Field label="last-updated"  value={String(fm["last-updated"]).slice(0, 10)} />}
          {fm["last-resolver"] && <Field label="last-resolver" value={String(fm["last-resolver"])} />}
          {fm["usage-count-30d"] != null && <Field label="usage-30d"    value={String(fm["usage-count-30d"])} />}
        </div>

        {/* Hermes rationale prose */}
        <div className="prose prose-sm prose-invert max-w-none text-muted-foreground leading-relaxed [&_code]:text-foreground/80 [&_code]:bg-muted/60 [&_code]:px-1 [&_code]:rounded [&_code]:text-[12px]">
          <MDXRemote source={content} />
        </div>

        <p className="mt-10 text-[10px] font-mono text-muted-foreground/40">
          {filePath.replace(process.cwd(), "")}
        </p>
      </div>
    </div>
  );
}
