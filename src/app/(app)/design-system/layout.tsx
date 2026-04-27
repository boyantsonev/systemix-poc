import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import matter from "gray-matter";
import { DesignSystemSidebar } from "@/components/systemix/DesignSystemSidebar";
import { DesignSystemMobileHeader } from "@/components/systemix/DesignSystemSidebar";
import type { TokenNav, ComponentNav } from "@/components/systemix/DesignSystemSidebar";

const TOKEN_DIR     = join(process.cwd(), "contract", "tokens");
const COMPONENT_DIR = join(process.cwd(), "contract", "components");

function readTokensForNav(): TokenNav[] {
  const rows: TokenNav[] = [];
  try {
    for (const entry of readdirSync(TOKEN_DIR)) {
      if (!entry.endsWith(".mdx")) continue;
      const { data: fm } = matter(readFileSync(join(TOKEN_DIR, entry), "utf8"));
      if (!fm.token) continue;
      rows.push({
        slug:       entry.replace(".mdx", ""),
        name:       fm.token as string,
        status:     (fm.status as string) ?? "unknown",
        collection: (fm.collection as string) ?? "Other",
      });
    }
  } catch {}
  return rows.sort((a, b) => a.name.localeCompare(b.name));
}

function readComponentsForNav(): ComponentNav[] {
  const rows: ComponentNav[] = [];
  try {
    for (const entry of readdirSync(COMPONENT_DIR)) {
      if (!entry.endsWith(".mdx")) continue;
      const { data: fm } = matter(readFileSync(join(COMPONENT_DIR, entry), "utf8"));
      if (!fm.component) continue;
      rows.push({
        slug:        entry.replace(".mdx", ""),
        name:        fm.component as string,
        parity:      (fm.parity as string) ?? "unknown",
        hasStorybook: Boolean(fm["evidence-storybook"] ?? fm["storybook-story"]),
      });
    }
  } catch {}
  return rows.sort((a, b) => a.name.localeCompare(b.name));
}

export default function DesignSystemLayout({ children }: { children: React.ReactNode }) {
  const tokens     = readTokensForNav();
  const components = readComponentsForNav();

  return (
    <div className="flex bg-background text-foreground" style={{ minHeight: "calc(100vh - 44px)" }}>
      <DesignSystemSidebar tokens={tokens} components={components} />
      <div className="flex-1 min-w-0">
        {/* Mobile section header — shows current section name + hamburger for sidebar */}
        <DesignSystemMobileHeader tokens={tokens} components={components} />
        <main className="max-w-2xl mx-auto px-6 md:px-10 py-10 md:py-14">
          {children}
        </main>
      </div>
    </div>
  );
}
