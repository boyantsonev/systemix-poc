// transitions.dev / Donut chart (35): one ring sector from angle a0 to a1, inset by the corner
// radius (the round-joined stroke adds it back) and by half the gap measured straight across,
// so both gap edges stay parallel. Angles run clockwise from the top. Pure, so the server can
// draw the final ring (visible without JavaScript) and the client can tween it.

export function ringPath(cx: number, cy: number, ro: number, ri: number, a0: number, a1: number, gap: number, cr: number): string {
  const Ro = ro - cr;
  const Ri = ri + cr;
  const h = gap / 2 + cr;
  if (Ro <= Ri) return "";
  const dO = Math.asin(Math.min(1, h / Ro));
  const dI = Math.asin(Math.min(1, h / Ri));
  const o0 = a0 + dO;
  const o1 = a1 - dO;
  const i0 = a0 + dI;
  const i1 = a1 - dI;
  if (i1 - i0 <= 0 || o1 - o0 <= 0) return ""; // too small to draw
  const pt = (r: number, a: number) => (cx + r * Math.sin(a)).toFixed(3) + " " + (cy - r * Math.cos(a)).toFixed(3);
  const lo = o1 - o0 > Math.PI ? 1 : 0;
  const li = i1 - i0 > Math.PI ? 1 : 0;
  return (
    "M" + pt(Ro, o0) + "A" + Ro + " " + Ro + " 0 " + lo + " 1 " + pt(Ro, o1) +
    "L" + pt(Ri, i1) + "A" + Ri + " " + Ri + " 0 " + li + " 0 " + pt(Ri, i0) + "Z"
  );
}

/** The segment paths for values, in order, on a square ring of the given size and thickness. */
export function ringPaths(values: number[], size: number, thickness: number, gap: number, corner: number): string[] {
  const c = size / 2;
  const total = values.reduce((a, b) => a + b, 0) || 1;
  let a = 0;
  return values.map((v) => {
    const span = (v / total) * Math.PI * 2;
    const d = ringPath(c, c, c, c - thickness, a, a + span, gap, corner);
    a += span;
    return d;
  });
}
