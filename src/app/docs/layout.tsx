import Link from "next/link";
import { SLogo } from "@/components/systemix/SLogo";
import { ThemeToggle } from "@/components/systemix/ThemeToggle";
import { DocsSidebar } from "@/components/systemix/DocsSidebar";

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground flex">
      <DocsSidebar />

      <div className="flex-1 min-w-0">
        {/* Mobile top bar */}
        <div className="md:hidden h-14 flex items-center justify-between px-5 border-b border-border/50 sticky top-0 bg-background/90 backdrop-blur-sm z-40">
          <Link href="/" className="flex items-center gap-2">
            <SLogo size={14} className="text-foreground/60" />
            <span className="text-[12px] font-black tracking-tight">systemix</span>
          </Link>
          <ThemeToggle />
        </div>

        <main className="max-w-2xl mx-auto px-6 md:px-10 py-12 md:py-16">
          {children}
        </main>
      </div>
    </div>
  );
}
