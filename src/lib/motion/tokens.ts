// Read the --motion-* tokens (src/app/globals.css) at run time, so components carry no
// raw durations or easings (G-002 E6). A missing token reads as 0: the motion is skipped.

export function token(name: string): string {
  if (typeof window === "undefined") return "";
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

/** A duration token in ms ("400ms" → 400, "2s" → 2000). */
export function ms(name: string): number {
  const v = token(name);
  const n = parseFloat(v);
  if (!Number.isFinite(n)) return 0;
  return /\ds$/.test(v) && !v.endsWith("ms") ? n * 1000 : n;
}

/** True when this visit may animate: JavaScript ran and the reader allows motion. */
export function motionAllowed(): boolean {
  if (typeof window === "undefined") return false;
  return document.documentElement.classList.contains("motion-ready") && !matchMedia("(prefers-reduced-motion: reduce)").matches;
}

// transitions.dev / Donut chart (35): the CSS cubic-bezier, for a JS tween.
function bezier(x1: number, y1: number, x2: number, y2: number) {
  return (t: number) => {
    let lo = 0;
    let hi = 1;
    let u = t;
    for (let i = 0; i < 24; i++) {
      u = (lo + hi) / 2;
      const x = 3 * u * (1 - u) * (1 - u) * x1 + 3 * u * u * (1 - u) * x2 + u * u * u;
      if (x < t) lo = u;
      else hi = u;
    }
    return 3 * u * (1 - u) * (1 - u) * y1 + 3 * u * u * (1 - u) * y2 + u * u * u;
  };
}

/** An easing token as a function of t in [0, 1]. */
export function ease(name: string): (t: number) => number {
  const m = /cubic-bezier\(([^)]+)\)/.exec(token(name));
  if (!m) return (t) => t;
  const [a, b, c, d] = m[1].split(",").map(parseFloat);
  return bezier(a, b, c, d);
}
