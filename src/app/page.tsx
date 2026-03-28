import Link from "next/link";
import { AppShell } from "@/components/systemix/AppShell";
import { ChevronRight, Zap } from "lucide-react";

const FAQ: { q: string; a: string }[] = [
  {
    q: "What is a skill?",
    a: "A markdown file in ~/.claude/commands/. Claude Code loads it as a /command slash command. Type /sync-tokens and the full token sync workflow starts — no other setup needed.",
  },
  {
    q: "What is drift?",
    a: "Drift is accumulated divergence between design and code — a designer changes a color in Figma, a developer hardcodes a value to ship fast. /drift-report surfaces every instance with the exact file, line, and the token it should be using.",
  },
  {
    q: "What is a HITL review?",
    a: "Human-in-the-Loop. Before any agent writes to your codebase, it pauses and surfaces the proposed change as a diff. You approve or reject — agents never act unilaterally.",
  },
  {
    q: "Do I need to write code?",
    a: "No. Trigger a skill, review the diff, approve or reject. The agent writes the code.",
  },
  {
    q: "Which Claude model does this use?",
    a: "Skills spawn sub-agents via Claude Code's Task tool. They use whichever model Claude Code is configured with — claude-sonnet-4-6 or claude-opus-4-6.",
  },
];

export default function IntroPage() {
  return (
    <AppShell>

      <section>
        <h1 className="text-4xl font-black text-foreground tracking-tight leading-tight mb-4">
          Design ↔ code,<br />one source of truth.
        </h1>
        <p className="text-muted-foreground leading-relaxed max-w-prose mb-6">
          Systemix is a set of Claude Code slash commands that keep Figma and your codebase in sync — in both directions.
          Run <code className="font-mono text-sm text-foreground">/drift-report</code> to surface every mismatch.
          Run <code className="font-mono text-sm text-foreground">/sync-tokens</code> to pull the latest Figma variables.
          Run <code className="font-mono text-sm text-foreground">/figma-push</code> to push a screenshot of your localhost back to the Figma canvas.
          Nothing writes without your approval.
        </p>
        <div className="flex items-center gap-3">
          <Link
            href="/skills"
            className="inline-flex items-center gap-2 bg-foreground text-background text-sm font-semibold px-4 py-2 rounded-lg hover:opacity-90 transition-opacity"
          >
            <Zap size={13} /> View Skills
          </Link>
          <Link
            href="/pipeline"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground border border-border rounded-lg px-4 py-2 transition-colors"
          >
            How It Works <ChevronRight size={14} />
          </Link>
        </div>
      </section>

      <section>
        <h2 className="text-sm font-semibold text-foreground mb-3">FAQ</h2>
        <div className="divide-y divide-border border border-border rounded-xl overflow-hidden">
          {FAQ.map(({ q, a }) => (
            <div key={q} className="px-4 py-3.5 bg-card">
              <p className="text-sm font-semibold text-foreground mb-1">{q}</p>
              <p className="text-xs text-muted-foreground leading-relaxed">{a}</p>
            </div>
          ))}
        </div>
      </section>

    </AppShell>
  );
}
