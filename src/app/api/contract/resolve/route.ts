import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { NextResponse } from "next/server";
import matter from "gray-matter";

const CONTRACT_DIR = join(process.cwd(), "contract");

function findMdxFile(slug: string): string | null {
  function scan(dir: string): string | null {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) { const f = scan(full); if (f) return f; }
      else if (entry === `${slug}.mdx`) return full;
    }
    return null;
  }
  try { return scan(CONTRACT_DIR); } catch { return null; }
}

export async function POST(req: Request) {
  const body = await req.json() as { slug?: string; decision?: string };
  const { slug, decision } = body;

  if (!slug || !["code-wins", "figma-wins"].includes(decision ?? "")) {
    return NextResponse.json({ error: "invalid params" }, { status: 400 });
  }

  const filePath = findMdxFile(slug);
  if (!filePath) return NextResponse.json({ error: "not found" }, { status: 404 });

  const raw = readFileSync(filePath, "utf8");
  const { data: fm, content } = matter(raw);

  fm.resolved = true;
  fm["last-resolver"] = "human";
  fm["last-updated"] = new Date().toISOString().slice(0, 10);
  fm["resolve-decision"] = decision;

  writeFileSync(filePath, matter.stringify(content, fm));
  return NextResponse.json({ ok: true });
}
