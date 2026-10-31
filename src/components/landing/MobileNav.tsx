"use client";

// Mobile marketing nav — a Sheet drawer holding the links that the desktop bar
// shows inline (hidden below `md`). Lives in a client file because Sheet is a
// Radix Dialog; LandingNav (a server module, reads fs) renders it the same way
// it already renders <ThemeToggle />.

import { useState } from "react";
import Link from "next/link";
import { Menu } from "lucide-react";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { TrackedLink } from "@/components/systemix/LandingEvents";
import { nav } from "@/lib/landing/content";
import { cn } from "@/lib/utils";

export function MobileNav({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Open menu"
          className={cn(className)}
        >
          <Menu className="size-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-72 gap-0">
        <SheetTitle className="px-5 pt-5 text-[13px] font-semibold uppercase tracking-widest text-muted-foreground">
          Menu
        </SheetTitle>
        <nav className="mt-2 flex flex-col px-3">
          {nav.links.map((l) => (
            <SheetClose asChild key={l.href}>
              <Link
                href={l.href}
                className="rounded-md px-3 py-3 text-[15px] font-medium text-foreground transition-colors hover:bg-accent"
              >
                {l.label}
              </Link>
            </SheetClose>
          ))}
        </nav>
        <div className="mt-auto border-t border-border/60 p-4">
          <SheetClose asChild>
            <Button variant="secondary" size="sm" asChild className="w-full">
              <TrackedLink href={nav.cta.href} event="free_score_clicked" location="nav-mobile">
                {nav.cta.label}
              </TrackedLink>
            </Button>
          </SheetClose>
        </div>
      </SheetContent>
    </Sheet>
  );
}
