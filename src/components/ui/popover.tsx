"use client";

import { Popover as PopoverRoot } from "radix-ui";
import { cn } from "@/lib/utils";

export const Popover = PopoverRoot.Root;
export const PopoverTrigger = PopoverRoot.Trigger;

export function PopoverContent({
  className,
  align = "center",
  sideOffset = 4,
  container,
  children,
  ...props
}: React.ComponentProps<typeof PopoverRoot.Content> & {
  /** Portal container — pass the preview div ref to inherit scoped CSS vars */
  container?: HTMLElement | null;
}) {
  return (
    <PopoverRoot.Portal container={container ?? undefined}>
      <PopoverRoot.Content
        align={align}
        sideOffset={sideOffset}
        className={cn(
          "z-50 w-72 rounded-md border border-border bg-popover p-4 text-popover-foreground shadow-md outline-none",
          "data-[state=open]:animate-in data-[state=closed]:animate-out",
          "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
          "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
          "data-[side=bottom]:slide-in-from-top-2 data-[side=top]:slide-in-from-bottom-2",
          className,
        )}
        {...props}
      >
        {children}
      </PopoverRoot.Content>
    </PopoverRoot.Portal>
  );
}
