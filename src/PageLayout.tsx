import { Separator } from "@radix-ui/react-separator";
import { Save } from "lucide-react";
import { observer } from "mobx-react-lite";
import { AppSidebar } from "./components/Sidebar";
import { Button } from "./components/ui/button";
import { SidebarTrigger } from "./components/ui/sidebar";
import { useLedger } from "./utils/useLedger";

export const PageLayout = observer(({ children }: { children: React.ReactNode }) => {
  const { ledger, saveLedger } = useLedger();

  return (
    <>
      <AppSidebar />
      <main className="flex grow flex-col h-screen">
        <header className="flex h-16 shrink-0 items-center gap-2 px-4 border-b">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <div className="ml-auto">
            <Button onClick={saveLedger} disabled={!ledger?.isDirty} size="sm" className="relative">
              <Save size={16} /> Save
              {ledger?.isDirty && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-orange-500 rounded-full" />
              )}
            </Button>
          </div>
        </header>
        <div className="flex grow flex-col shrink overflow-auto">{children}</div>
      </main>
    </>
  );
});
