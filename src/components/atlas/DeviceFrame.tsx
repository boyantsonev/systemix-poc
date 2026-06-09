import type { ReactNode } from "react";
import type { Surface } from "@/lib/ports/atlas";

const SIZE: Record<Surface, { width: number; height: number; radius: number }> = {
  phone: { width: 390, height: 800, radius: 44 },
  tablet: { width: 768, height: 1024, radius: 32 },
  desktop: { width: 1280, height: 800, radius: 16 },
};

// Renders a prototype screen inside the device chrome for its primary surface —
// making the surface a visible, testable choice. Ported from Connecta DeviceFrame.
export function DeviceFrame({ surface, children }: { surface: Surface; children: ReactNode }) {
  const s = SIZE[surface];
  const isDesktop = surface === "desktop";

  return (
    <div
      className="flex flex-col overflow-hidden bg-background shadow-[0_24px_60px_-24px_rgba(0,0,0,0.35)]"
      style={{
        width: s.width,
        maxWidth: "100%",
        height: s.height,
        maxHeight: "86vh",
        borderRadius: s.radius,
        borderStyle: "solid",
        borderWidth: isDesktop ? 1 : 10,
        borderColor: isDesktop ? "var(--border)" : "#0a0a0a",
      }}
    >
      {isDesktop ? (
        <div className="h-9 shrink-0 flex items-center gap-1.5 px-3.5 border-b border-border bg-muted">
          <Dot />
          <Dot />
          <Dot />
        </div>
      ) : (
        <div className="h-[30px] shrink-0 flex items-center justify-center bg-[#0a0a0a]">
          <span
            className="h-1.5 rounded-full bg-border"
            style={{ width: surface === "phone" ? 120 : 90 }}
          />
        </div>
      )}
      <div className="flex-1 overflow-hidden">{children}</div>
    </div>
  );
}

function Dot() {
  return <span className="w-[9px] h-[9px] rounded-full bg-border" />;
}
