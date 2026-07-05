import { observer } from "mobx-react-lite";
import { TopNav } from "./components/TopNav";

export const PageLayout = observer(({ children }: { children: React.ReactNode }) => {
  return (
    <main className="flex h-screen grow flex-col">
      <TopNav />
      <div className="flex grow shrink flex-col overflow-auto">{children}</div>
    </main>
  );
});
