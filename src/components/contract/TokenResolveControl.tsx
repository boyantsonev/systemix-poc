"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Decision = "code-wins" | "figma-wins";

export function TokenResolveControl({ slug }: { slug: string }) {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "loading" | "done">("idle");
  const [chosen, setChosen] = useState<Decision | null>(null);

  async function resolve(decision: Decision) {
    setState("loading");
    setChosen(decision);
    await fetch("/api/contract/resolve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug, decision }),
    });
    setState("done");
    router.refresh();
  }

  if (state === "done") {
    return (
      <p className="text-[12px] font-mono text-green-400">
        ✓ Resolved — {chosen === "code-wins" ? "code value accepted, Figma to update" : "Figma value accepted, code to update"}
      </p>
    );
  }

  return (
    <div>
      <p className="text-[11px] font-mono text-muted-foreground mb-3">
        This drift is unresolved. Accept one side to mark it resolved.
      </p>
      <div className="flex gap-2">
        <button
          disabled={state === "loading"}
          onClick={() => resolve("code-wins")}
          className="px-3 py-1.5 rounded border border-border text-[11px] font-mono text-foreground hover:border-foreground/50 hover:bg-muted/30 transition-colors disabled:opacity-40 cursor-pointer"
        >
          code wins
        </button>
        <button
          disabled={state === "loading"}
          onClick={() => resolve("figma-wins")}
          className="px-3 py-1.5 rounded border border-yellow-500/40 text-[11px] font-mono text-yellow-400 hover:border-yellow-500/70 hover:bg-yellow-500/10 transition-colors disabled:opacity-40 cursor-pointer"
        >
          figma wins
        </button>
      </div>
    </div>
  );
}
