type LoopMarkProps = {
  size?: number;
  className?: string;
};

/**
 * The Systemix loop mark — an open cycle (ship → measure → learn → decide)
 * wrapping a single node: the instance/repo the loop runs on. The gap at the
 * top + the arrowhead read as a never-stopping clockwise loop, echoing the
 * rotating-words hero. Same prop API as SLogo, so it's a drop-in swap.
 */
export function LoopMark({ size = 24, className }: LoopMarkProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-label="Systemix"
    >
      {/* the loop — open ring with a gap at the top */}
      <path
        d="M15.38 4.75 A8 8 0 1 1 8.62 4.75"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      {/* arrowhead — clockwise flow continuing through the gap */}
      <path d="M10.6 3.82 L9.3 6.2 L7.94 3.3 Z" fill="currentColor" />
      {/* the node — the instance the loop runs on */}
      <circle cx="12" cy="12" r="2.3" fill="currentColor" />
    </svg>
  );
}
