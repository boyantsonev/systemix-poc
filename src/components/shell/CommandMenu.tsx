"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import {
  Command,
  CommandInputField,
  CommandListBox,
  CommandEmptyState,
  CommandGroupSection,
  CommandOptionItem,
} from "@/components/ui/command";
import { PRIMARY_NAV, SECONDARY_NAV } from "@/lib/nav.config";

// ⌘K palette — jump between surfaces. Composes the new Dialog with the existing
// cmdk-backed command parts. (Content search can fold in later via the
// /api/system-search endpoint the docs surfaces already use.)
export function CommandMenu() {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const go = (href: string, external?: boolean) => {
    setOpen(false);
    if (external) window.open(href, "_blank", "noopener,noreferrer");
    else router.push(href);
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="h-8 gap-2 text-muted-foreground"
        aria-label="Open command menu"
      >
        <Search className="size-3.5" />
        <span className="hidden sm:inline">Search…</span>
        <kbd className="hidden sm:inline-flex pointer-events-none h-5 items-center gap-1 rounded border bg-muted px-1.5 text-xs font-medium">
          ⌘K
        </kbd>
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="overflow-hidden p-0">
          <DialogTitle className="sr-only">Command menu</DialogTitle>
          <Command>
            <CommandInputField placeholder="Jump to a surface…" />
            <CommandListBox>
              <CommandEmptyState>No results.</CommandEmptyState>
              <CommandGroupSection heading="Surfaces">
                {PRIMARY_NAV.map((item) => (
                  <CommandOptionItem key={item.href} value={item.label} onSelect={() => go(item.href)}>
                    <item.icon />
                    {item.label}
                  </CommandOptionItem>
                ))}
              </CommandGroupSection>
              <CommandGroupSection heading="More">
                {SECONDARY_NAV.map((item) => (
                  <CommandOptionItem
                    key={item.href}
                    value={item.label}
                    onSelect={() => go(item.href, item.external)}
                  >
                    <item.icon />
                    {item.label}
                  </CommandOptionItem>
                ))}
              </CommandGroupSection>
            </CommandListBox>
          </Command>
        </DialogContent>
      </Dialog>
    </>
  );
}
