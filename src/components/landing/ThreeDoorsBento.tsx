import { RiTerminalBoxLine, RiPlugLine, RiSparkling2Line } from "@remixicon/react";
import { BentoCard, BentoGrid } from "@/components/ui/bento-grid";
import { doors } from "@/lib/landing/content";
import { SectionGrid } from "./SectionGrid";

const ICONS: Record<string, React.ElementType> = {
  cli: RiTerminalBoxLine,
  mcp: RiPlugLine,
  skills: RiSparkling2Line,
};

const GRID_CONFIGS: Record<string, { squareSize: number; gridGap: number; maxOpacity: number; flickerChance: number }> = {
  cli:    { squareSize: 8,  gridGap: 5,  maxOpacity: 0.20, flickerChance: 0.15 },
  mcp:    { squareSize: 3,  gridGap: 2,  maxOpacity: 0.15, flickerChance: 0.35 },
  skills: { squareSize: 6,  gridGap: 6,  maxOpacity: 0.18, flickerChance: 0.20 },
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
            <div className="absolute inset-0 [mask-image:linear-gradient(to_top,transparent_36%,black_76%)]">
              <SectionGrid {...(GRID_CONFIGS[d.key] ?? GRID_CONFIGS.cli)} />
              <div className="relative flex flex-col gap-3 p-5">
                <code className="w-fit rounded-md bg-muted/60 px-2 py-1 font-mono text-[11px] text-muted-foreground">
                  {d.code}
                </code>
              </div>
            </div>
          }
        />
      ))}
    </BentoGrid>
  );
}
