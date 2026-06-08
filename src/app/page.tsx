import type { Metadata } from "next"
import { SLogo } from "@/components/systemix/SLogo"
import { ThemeToggle } from "@/components/systemix/ThemeToggle"
import { siteConfig } from "@/lib/site-config"
import { HeroReasoning } from "@/components/landing/HeroReasoning"
import { SubscribeForm } from "@/components/landing/SubscribeForm"

export const metadata: Metadata = {
  title: "Systemix — The design system that learns from what you ship.",
  description:
    "One loop. Design aligns. Engineering ships. Marketing measures. Business decides.",
}

const LOOP_ITEMS = [
  { label: "Design", body: "Proposals grounded in tokens" },
  { label: "Engineering", body: "Components that match the spec" },
  { label: "Marketing", body: "Copy tied to live experiments" },
  { label: "Business", body: "Decisions backed by evidence" },
]

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* ── Nav ─────────────────────────────────────────────── */}
      <header className="fixed top-0 inset-x-0 z-50 border-b border-border/40 bg-background/70 backdrop-blur-md">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <SLogo size={15} className="text-foreground" />
            <span className="text-[13px] font-black tracking-tight">systemix</span>
          </div>
          <ThemeToggle />
        </div>
      </header>

      {/* ── Hero ─────────────────────────────────────────────── */}
      <section className="min-h-screen flex items-center justify-center px-6 pt-14">
        <HeroReasoning />
      </section>

      {/* ── The Loop ─────────────────────────────────────────── */}
      <section className="py-24 px-6 border-t border-border/50">
        <div className="max-w-5xl mx-auto">
          <p className="text-[11px] font-mono uppercase tracking-[0.14em] text-muted-foreground mb-12 text-center">
            The learning loop
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-border/40">
            {LOOP_ITEMS.map(({ label, body }) => (
              <div key={label} className="bg-background px-6 py-8">
                <p className="text-[11px] font-mono uppercase tracking-[0.12em] text-muted-foreground mb-3">
                  {label}
                </p>
                <p className="text-[15px] font-semibold leading-snug">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Subscribe ────────────────────────────────────────── */}
      <section id="subscribe" className="py-24 px-6 border-t border-border/50">
        <div className="max-w-md mx-auto text-center">
          <h2 className="text-[1.75rem] font-black tracking-tight mb-3">
            Get early access.
          </h2>
          <p className="text-[15px] text-muted-foreground mb-8">
            Closed beta — we&apos;ll reach out when your stack is ready.
          </p>
          <SubscribeForm />
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────── */}
      <footer className="border-t border-border/50 py-8 px-6">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <SLogo size={13} className="text-muted-foreground" />
            <span className="text-[12px] text-muted-foreground font-mono">
              © Systemix
            </span>
          </div>
          <a
            href={siteConfig.githubUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[12px] text-muted-foreground hover:text-foreground transition-colors font-mono"
          >
            GitHub ↗
          </a>
        </div>
      </footer>
    </div>
  )
}
