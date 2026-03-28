import { LeftSidebar } from "./LeftSidebar";
import { MobileHeader } from "./MobileHeader";
import { RightAnchorNav, type AnchorItem } from "./RightAnchorNav";

type AppShellProps = {
  children: React.ReactNode;
  anchorItems?: AnchorItem[];
  topBar?: React.ReactNode;
  fullWidth?: boolean;
};

export function AppShell({ children, anchorItems = [], topBar, fullWidth = false }: AppShellProps) {
  const hasAnchor = anchorItems.length > 0;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <MobileHeader />

      {topBar && (
        <div className="bg-card border-b border-border px-4 md:px-8 py-5">
          {topBar}
        </div>
      )}

      <div
        className={
          hasAnchor
            ? "md:grid md:grid-cols-[240px_1fr] lg:grid-cols-[240px_1fr_200px]"
            : "md:grid md:grid-cols-[240px_1fr]"
        }
      >
        <LeftSidebar />

        <main className="min-w-0 px-5 md:px-8 lg:px-10 py-6 md:py-10">
          <div className={`space-y-10 ${fullWidth ? "" : "max-w-[760px] mx-auto"}`}>
            {children}
          </div>
        </main>

        {hasAnchor && (
          <div className="hidden lg:block">
            <RightAnchorNav items={anchorItems} />
          </div>
        )}
      </div>
    </div>
  );
}
