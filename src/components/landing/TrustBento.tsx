import { RiGitRepositoryLine, RiLoopRightLine } from "@remixicon/react";
import { SiGithub, SiClaude } from "@icons-pack/react-simple-icons";
import { BentoCard, BentoGrid } from "@/components/ui/bento-grid";
import { trust } from "@/lib/landing/content";
import { MediaSlot } from "./MediaSlot";

const ICONS: Record<string, React.ElementType> = {
  oss: SiGithub,
  engine: SiClaude,
  repo: RiGitRepositoryLine,
  dogfood: RiLoopRightLine,
};

export function TrustBento() {
  return (
    <BentoGrid className="auto-rows-[18rem] gap-4 sm:gap-5">
      {trust.items.map((t) => (
        <BentoCard
          key={t.key}
          name={t.name}
          description={t.body}
          Icon={ICONS[t.key] ?? SiGithub}
          href={t.cta.href}
          cta={t.cta.label}
          className={t.span === 2 ? "col-span-3 lg:col-span-2" : "col-span-3 lg:col-span-1"}
          background={
            t.media ? (
              <div className="absolute inset-0 p-5 [mask-image:linear-gradient(to_top,transparent_42%,black_82%)]">
                <MediaSlot label={t.media} className="h-full w-full" />
              </div>
            ) : (
              <div className="absolute inset-0" />
            )
          }
        />
      ))}
    </BentoGrid>
  );
}
