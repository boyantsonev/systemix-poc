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
    <div className="flex h-[100dvh] overflow-hidden bg-background text-foreground">
      <LeftSidebar />

      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <MobileHeader />

        {topBar && (
          <div className="bg-card border-b border-border px-4 md:px-6 py-4 shrink-0">
            {topBar}
          </div>
        )}

        <div className={`flex flex-1 min-h-0 overflow-auto ${hasAnchor ? "lg:grid lg:grid-cols-[1fr_200px]" : ""}`}>
          <main className="min-w-0 pt-4 px-4 md:pt-6 md:px-6 pb-10 flex-1">
            <div className={`space-y-10 ${fullWidth ? "" : "max-w-[920px]"}`}>
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
    </div>
  );
}
