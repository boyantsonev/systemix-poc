"use client";

import Link from "next/link";
import { HitlQueue } from "@/components/systemix/HitlQueue";

export default function QueuePage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="border-b border-border/50 px-4 md:px-8 py-5 flex items-center justify-between">
        <div>
          <h1 className="text-[1.1rem] font-black tracking-tight">Decision Queue</h1>
          <p className="text-[12px] text-muted-foreground mt-0.5">
            Pending HITL cards from Hermes — approve, reject, or defer. Every decision writes back to the contract.
          </p>
        </div>
        <Link
          href="/docs/concepts/hitl"
          className="text-[11px] font-mono text-muted-foreground/40 hover:text-muted-foreground transition-colors hidden md:block"
        >
          How this works →
        </Link>
      </div>

      <div className="px-4 md:px-8 py-6">
        <HitlQueue className="w-full max-w-3xl" />
      </div>
    </div>
  );
}
