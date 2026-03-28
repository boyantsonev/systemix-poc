import { Card, CardContent } from "@/components/ui/card";

type MetricCardProps = {
  label: string;
  value: string | number;
  sub?: string;
  accent?: string; // hex for left border — only pass for semantic status colors
  icon?: React.ReactNode;
};

export function MetricCard({ label, value, sub, accent, icon }: MetricCardProps) {
  return (
    <Card style={accent ? { borderLeftWidth: "2px", borderLeftColor: accent } : undefined}>
      <CardContent className="pt-4 pb-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-muted-foreground text-xs font-medium uppercase tracking-wider mb-1">{label}</p>
            <p className="text-2xl font-bold text-foreground leading-none">{value}</p>
            {sub && <p className="text-muted-foreground text-xs mt-1">{sub}</p>}
          </div>
          {icon && <div className="text-muted-foreground mt-0.5">{icon}</div>}
        </div>
      </CardContent>
    </Card>
  );
}
