import Link from "next/link";
import { SLogo } from "@/components/systemix/SLogo";
import { ThemeToggle } from "@/components/systemix/ThemeToggle";

function LandingNav() {
  return (
    <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-sm">
      <div className="max-w-4xl mx-auto px-6 h-14 flex items-center gap-6">
        <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <SLogo size={16} className="text-foreground" />
          <span className="text-[13px] font-black tracking-tight">systemix</span>
        </Link>

        <nav className="flex items-center gap-1 ml-4">
          <Link href="/docs" className="text-[13px] text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 rounded-md hover:bg-muted/50">
            Docs
          </Link>
          <a
            href="https://github.com/boyantsonev/systemix"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[13px] text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 rounded-md hover:bg-muted/50"
          >
            GitHub
          </a>
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle />
          <Link
            href="/docs/quick-install"
            className="text-[12px] font-medium bg-foreground text-background px-3 py-1.5 rounded-md hover:opacity-90 transition-opacity"
          >
            Get started →
          </Link>
        </div>
      </div>
    </header>
  );
}

function LandingFooter() {
  return (
    <footer className="border-t border-border/50 mt-32">
      <div className="max-w-4xl mx-auto px-6 py-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <div className="flex items-center gap-2">
          <SLogo size={14} className="text-muted-foreground/50" />
          <span className="text-[12px] text-muted-foreground/50 font-mono">
            The design contract layer for agents and teams.
          </span>
        </div>
        <div className="flex items-center gap-4 text-[12px] text-muted-foreground/40 font-mono">
          <a
            href="https://github.com/boyantsonev/systemix"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-muted-foreground transition-colors"
          >
            GitHub
          </a>
          <Link href="/docs" className="hover:text-muted-foreground transition-colors">
            Docs
          </Link>
          <span className="border border-border/50 text-[10px] px-1.5 py-0.5 rounded uppercase tracking-wide font-bold text-muted-foreground/30">
            Open source
          </span>
        </div>
      </div>
    </footer>
  );
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <LandingNav />

      {/* Content sections — populated in SYSTMIX-192 and SYSTMIX-193 */}
      <main className="max-w-4xl mx-auto px-6">
        {/* Hero placeholder */}
        <section className="pt-24 pb-20 text-center">
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight leading-tight mb-6">
            Your design tokens are<br />
            <span className="text-muted-foreground">lying to your agents.</span>
          </h1>
          <p className="text-[16px] text-muted-foreground leading-relaxed max-w-xl mx-auto mb-10">
            Systemix builds a verified contract between Figma, your codebase, and every AI tool in your workflow — so agents stop hallucinating design decisions.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <div className="flex items-center gap-2 bg-muted/60 border border-border rounded-lg px-4 py-2.5 font-mono text-[13px]">
              <span className="text-muted-foreground/50 select-none">$</span>
              <span>npx @systemix/init</span>
            </div>
            <Link
              href="/docs/quick-install"
              className="text-[13px] text-muted-foreground hover:text-foreground transition-colors"
            >
              Read the docs →
            </Link>
          </div>
        </section>

        {/* Divider */}
        <div className="border-t border-border/40" />

        {/* Remaining sections placeholder — SYSTMIX-192, SYSTMIX-193 */}
        <section className="py-20 text-center">
          <p className="text-[11px] font-mono text-muted-foreground/30 uppercase tracking-widest">
            Problem · How it works · Use cases · GIGO score · CTA
          </p>
          <p className="text-[11px] font-mono text-muted-foreground/20 mt-2">
            SYSTMIX-192 · SYSTMIX-193
          </p>
        </section>
      </main>

      <LandingFooter />
    </div>
  );
}
