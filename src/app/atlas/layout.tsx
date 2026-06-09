import { AppTopBar } from "@/components/systemix/AppTopBar";

// Full-height shell: top bar + a flex-1 region the canvas / prototype frame fills.
export default function AtlasLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col h-dvh">
      <AppTopBar />
      <div className="flex-1 min-h-0">{children}</div>
    </div>
  );
}
