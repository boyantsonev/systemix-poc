type CodeInlineProps = {
  children: React.ReactNode;
  color?: string;
};

export function CodeInline({ children, color }: CodeInlineProps) {
  return (
    <code className={`bg-muted px-1.5 py-0.5 rounded text-xs font-mono ${color ?? "text-foreground"}`}>
      {children}
    </code>
  );
}
