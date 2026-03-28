type SLogoProps = {
  size?: number;
  className?: string;
};

export function SLogo({ size = 24, className }: SLogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-label="Systemix"
    >
      {/*
        Angular S — traced as a single 10-point polygon.

        The two diagonal edges (12,11)→(21,16) and (12,13)→(3,8) run parallel,
        creating the characteristic S "waist" with 45° angular cuts.

        Upper C block:  top-right corner → right side → step left → diagonal up-left
        Lower C block:  bottom-left corner → left side → step right → diagonal down-right
      */}
      <polygon
        points="3,4 21,4 21,11 12,11 21,16 21,21 3,21 3,13 12,13 3,8"
        fill="currentColor"
      />

      {/* Central depth shadow — parallelogram between the two diagonal edges */}
      <polygon
        points="3,8 12,11 21,16 12,13"
        fill="black"
        fillOpacity="0.18"
      />
    </svg>
  );
}
