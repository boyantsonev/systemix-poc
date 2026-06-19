import { RiFilmLine } from "@remixicon/react";
import { cn } from "@/lib/utils";

/**
 * Placeholder for media (gif / video / image) the founder swaps in later.
 * Renders a faint dashed panel with a labelled icon. Decorative only.
 */
export function MediaSlot({
  label = "media",
  className,
  icon: Icon = RiFilmLine,
}: {
  label?: string;
  className?: string;
  icon?: React.ElementType;
}) {
  return (
    <div
      aria-hidden
      className={cn(
        "flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border/60 bg-muted/20 text-muted-foreground/45",
        className,
      )}
    >
      <Icon className="h-5 w-5" />
      <span className="font-mono text-[10px] uppercase tracking-[0.2em]">{label}</span>
    </div>
  );
}
