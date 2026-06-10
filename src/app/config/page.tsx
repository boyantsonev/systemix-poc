import Link from "next/link";
import { SLogo } from "@/components/systemix/SLogo";
import { ThemeToggle } from "@/components/systemix/ThemeToggle";
import { loadInstanceConfig } from "@/lib/state/instance-config";
import { loadRuntimeState } from "@/lib/state/runtime-state";
import { ConfigView } from "./ConfigView";

// Reads the local instance config at request time and writes it back on save.
export const dynamic = "force-dynamic";

export default function ConfigPage() {
  const cfg = loadInstanceConfig();
  const runtime = loadRuntimeState();

  return (
    <div className="w-screen h-screen overflow-hidden flex flex-col bg-background">
      <header className="h-11 shrink-0 flex items-center justify-between px-5 border-b border-border/30 z-10 bg-background">
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="flex items-center gap-2 text-muted-foreground/50 hover:text-muted-foreground transition-colors"
          >
            <SLogo size={13} className="text-current" />
            <span className="text-[11px] font-mono">systemix</span>
          </Link>
          <span className="text-muted-foreground/20 text-xs">/</span>
          <span className="text-[11px] font-mono text-muted-foreground/40">config</span>
        </div>
        <div className="flex items-center gap-4">
          <Link
            href="/contract"
            className="text-[11px] font-mono text-muted-foreground/40 hover:text-muted-foreground transition-colors"
          >
            Contract →
          </Link>
          <ThemeToggle />
        </div>
      </header>

      {cfg ? (
        <ConfigView cfg={cfg} runtime={runtime} />
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <div className="max-w-md text-center px-6">
            <p className="text-sm font-mono text-foreground/80 mb-2">No instance configured</p>
            <p className="text-[12px] font-mono text-muted-foreground/60 leading-relaxed mb-4">
              This repo has no <code className="text-foreground/70">systemix.config.yaml</code>. Run the setup
              wizard to scaffold a Systemix instance, then this layer lets you configure it and see its topology.
            </p>
            <code className="inline-block text-[12px] font-mono px-3 py-1.5 rounded-lg border border-border/50 text-foreground/70">
              npx systemix init
            </code>
          </div>
        </div>
      )}
    </div>
  );
}
