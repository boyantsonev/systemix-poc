type ColorSwatchProps = {
  value: string;
  size?: "sm" | "md";
};

export function ColorSwatch({ value, size = "md" }: ColorSwatchProps) {
  const dim = size === "sm" ? "w-4 h-4" : "w-8 h-8";
  const isVar = value.startsWith("var(");

  return (
    <div
      className={`${dim} rounded border border-border flex-shrink-0`}
      style={isVar ? { background: "#374151" } : { background: value }}
      title={value}
    />
  );
}
