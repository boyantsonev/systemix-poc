type SectionHeadingProps = {
  children: React.ReactNode;
  accent?: string; // kept for semantic-only uses (status colors); defaults to foreground
  level?: "h2" | "h3";
};

export function SectionHeading({ children, accent, level = "h2" }: SectionHeadingProps) {
  const Tag = level;
  return (
    <div className="flex items-center gap-3 mb-6">
      <div
        className="w-0.5 h-6 rounded-full flex-shrink-0 bg-border"
        style={accent ? { backgroundColor: accent } : undefined}
      />
      <Tag className={level === "h2" ? "text-xl font-semibold text-foreground tracking-tight" : "text-base font-semibold text-foreground"}>
        {children}
      </Tag>
    </div>
  );
}
