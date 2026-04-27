import { AppTopBar } from "@/components/systemix/AppTopBar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AppTopBar />
      {children}
    </>
  );
}
