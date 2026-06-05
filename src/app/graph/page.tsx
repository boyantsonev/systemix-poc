import Link from "next/link";
import { SLogo } from "@/components/systemix/SLogo";
import { ThemeToggle } from "@/components/systemix/ThemeToggle";
import { ForceGraph3D } from "@/components/graph/ForceGraph3D";

export default function GraphPage() {
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
          <span className="text-[11px] font-mono text-muted-foreground/40">architecture</span>
        </div>
        <div className="flex items-center gap-4">
          <Link
            href="/docs/skills"
            className="text-[11px] font-mono text-muted-foreground/40 hover:text-muted-foreground transition-colors"
          >
            Skills →
          </Link>
          <ThemeToggle />
        </div>
      </header>

      <div className="flex-1 relative">
        <ForceGraph3D />
      </div>
    </div>
  );
}
