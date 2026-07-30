import {
  BarChart3,
  CalendarSync,
  LayoutDashboard,
  PiggyBank,
  Save,
  Users,
  Wallet,
} from "lucide-react";
import { observer } from "mobx-react-lite";
import { NavLink } from "react-router";
import { Button } from "@/components/ui/button";
import { containerClass } from "@/lib/layout";
import { cn } from "@/lib/utils";
import { useLedger } from "@/utils/useLedger";

const navItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Budget", url: "/budget", icon: Wallet },
  { title: "Recurring", url: "/recurring", icon: CalendarSync },
  { title: "Reports", url: "/reports", icon: BarChart3 },
  { title: "Payees", url: "/payees", icon: Users },
];

export const TopNav = observer(function TopNav() {
  const { ledger, saveLedger } = useLedger();

  return (
    <header className="shrink-0 border-b bg-card">
      <div className={cn(containerClass, "flex h-16 items-center gap-4")}>
        <div className="flex items-center gap-2 pr-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-2xl bg-primary">
            <PiggyBank size={18} color="white" />
          </div>
          <strong className="hidden whitespace-nowrap text-sm sm:inline">{ledger?.name}</strong>
        </div>

        <nav className="flex items-center gap-1">
          {navItems.map((item) => (
            <NavLink
              key={item.url}
              to={item.url}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-secondary text-secondary-foreground"
                    : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
                )
              }
            >
              <item.icon size={16} />
              <span className="hidden md:inline">{item.title}</span>
            </NavLink>
          ))}
        </nav>

        <div className="ml-auto">
          <Button onClick={saveLedger} disabled={!ledger?.isDirty} size="sm" className="relative">
            <Save size={16} /> Save
            {ledger?.isDirty && (
              <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-orange-500" />
            )}
          </Button>
        </div>
      </div>
    </header>
  );
});
