// Types for the vendored transitions.dev runtime (ui-generation.js), the part this site uses.
export function generate(
  element: Element,
  options?: { variant?: string; mode?: "skeleton" | "skeleton-texts"; duration?: number; delay?: number; steps?: string[]; done?: string },
): { finished: Promise<void>; cancel: () => void; element: Element };
export function auto(root?: Document | Element): void;
