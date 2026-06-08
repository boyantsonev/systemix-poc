import Link from "next/link";
import { getNavSections } from "@/lib/docs-manifest";

// "Start here for…" — role-accented entry points (docs-ia.md role chooser).
const ROLE_PATHS = [
  {
    role: "Operator",
    line: "Run the loops, work the HITL queue, read decisions.",
    href: "/docs/concepts/hypothesis-validation",
    cta: "Start with the loop →",
  },
  {
    role: "Designer",
    line: "Tokens, components, drift, and prototypes in the System surface.",
    href: "/design-system",
    cta: "Open the System surface →",
  },
  {
    role: "Engineer",
    line: "Install, wire skills + MCP, own config and CI.",
    href: "/docs/quick-install",
    cta: "Start with quick install →",
  },
];

export default function DocsIndex() {
  const sections = getNavSections();

  return (
    <article className="prose-custom max-w-3xl">
      <p className="text-[13px] font-mono text-muted-foreground mb-3">Docs</p>
      <h1 className="text-[2rem] font-black tracking-tight mb-3">
        Systemix documentation
      </h1>
      <p className="text-[15px] text-muted-foreground leading-relaxed mb-10 max-w-xl">
        Install Systemix into your repo, configure the loop to your goals, run the
        surfaces, and extend it with skills. Pick a path by your role, or browse
        the sections below.
      </p>

      {/* Start here for… */}
      <p className="text-[11px] font-mono text-muted-foreground/60 uppercase tracking-widest mb-3">
        Start here for…
      </p>
      <div className="grid sm:grid-cols-3 gap-3 mb-12 not-prose">
        {ROLE_PATHS.map(({ role, line, href, cta }) => (
          <Link
            key={role}
            href={href}
            className="group border border-border/40 rounded-xl px-4 py-4 bg-background hover:border-border transition-colors flex flex-col"
          >
            <p className="text-[14px] font-bold text-foreground mb-1.5">{role}</p>
            <p className="text-[12px] text-muted-foreground leading-relaxed mb-3">{line}</p>
            <span className="mt-auto text-[12px] font-mono text-muted-foreground/40 group-hover:text-muted-foreground transition-colors">
              {cta}
            </span>
          </Link>
        ))}
      </div>

      {/* Section overview */}
      <div className="space-y-6 not-prose">
        {sections.map(({ section, items }) => (
          <div key={section}>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50 mb-2">
              {section}
            </p>
            <div className="flex flex-wrap gap-x-4 gap-y-1.5">
              {items.map(({ title, href, external }) => (
                <Link
                  key={href}
                  href={href}
                  className="text-[13px] text-muted-foreground hover:text-foreground transition-colors"
                >
                  {title}
                  {external && <span className="text-[10px] text-muted-foreground/30"> ↗</span>}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </article>
  );
}
