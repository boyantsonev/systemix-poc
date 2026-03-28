import { Card, CardContent } from "@/components/ui/card";

type TraitProps = {
  label: string;
  desc: string;
  accent?: string; // Tailwind bg class, kept for semantic usage
};

export function Trait({ label, desc, accent }: TraitProps) {
  return (
    <Card>
      <CardContent className="pt-4">
        <div className="flex gap-3">
          <div className={`w-0.5 rounded-full flex-shrink-0 ${accent ?? "bg-border"}`} style={{ minHeight: "2rem" }} />
          <div>
            <div className="font-medium text-foreground text-sm mb-0.5">{label}</div>
            <div className="text-muted-foreground text-sm leading-relaxed">{desc}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
