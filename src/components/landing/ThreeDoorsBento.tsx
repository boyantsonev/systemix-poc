import { RiTerminalBoxLine, RiPlugLine, RiSparkling2Line } from "@remixicon/react";
import { BentoCard, BentoGrid } from "@/components/ui/bento-grid";
import { doors } from "@/lib/landing/content";
import { MediaSlot } from "./MediaSlot";

const ICONS: Record<string, React.ElementType> = {
  cli: RiTerminalBoxLine,
  mcp: RiPlugLine,
  skills: RiSparkling2Line,
};

export function ThreeDoorsBento() {
  return (
    <BentoGrid className="auto-rows-[22rem] gap-4 sm:gap-5">
      {doors.items.map((d) => (
        <BentoCard
          key={d.key}
          name={d.name}
          description={d.body}
          Icon={ICONS[d.key] ?? RiTerminalBoxLine}
          href={doors.cta.href}
          cta={doors.cta.label}
          className="col-span-3 lg:col-span-1"
          background={
            <div className="absolute inset-0 flex flex-col gap-3 p-5 [mask-image:linear-gradient(to_top,transparent_36%,black_76%)]">
              <code className="w-fit rounded-md bg-muted/60 px-2 py-1 font-mono text-[11px] text-muted-foreground">
                {d.code}
              </code>
              <MediaSlot label={d.media} className="min-h-0 flex-1" />
            </div>
          }
        />
      ))}
    </BentoGrid>
  );
}
