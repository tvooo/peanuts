import { Separator } from "@radix-ui/react-separator";
import { AppSidebar } from "./components/Sidebar";
import { SidebarTrigger } from "./components/ui/sidebar";

export const PageLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <>
      <AppSidebar />
      <main className="flex grow flex-col h-screen">
        <header className="flex h-16 shrink-0 items-center gap-2 px-4 border-b">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
        </header>
        <div className="flex grow flex-col shrink overflow-auto">{children}</div>
      </main>
    </>
  );
};
