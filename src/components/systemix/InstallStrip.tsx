"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";
import Link from "next/link";

const INSTALL_CMD = "npx systemix init";

export function InstallStrip() {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(INSTALL_CMD);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-2">
      <p className="text-[11px] text-muted-foreground/60 font-medium">
        run this in your terminal
      </p>

      <div className="flex items-center gap-2 bg-muted/60 border border-border rounded-lg px-4 py-2.5 max-w-sm font-mono text-sm">
        <span className="flex-1 text-foreground/80 select-all">
          {INSTALL_CMD}
        </span>
        <button
          onClick={handleCopy}
          className="flex-shrink-0 p-1 rounded text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Copy install command"
        >
          {copied
            ? <Check size={13} className="text-teal-500" />
            : <Copy size={13} />}
        </button>
      </div>

      <p className="text-[11px] text-muted-foreground/50">
        Having trouble?{" "}
        <Link href="/setup" className="underline underline-offset-2 hover:text-muted-foreground transition-colors">
          See the guide.
        </Link>
      </p>
    </div>
  );
}
