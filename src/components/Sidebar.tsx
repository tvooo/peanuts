import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@radix-ui/react-collapsible";
import {
  Archive,
  BarChart3,
  CalendarSync,
  ChartSpline,
  ChevronDown,
  Milestone,
  PiggyBank,
  Plus,
  Star,
  Users,
  Wallet,
} from "lucide-react";
import { observer } from "mobx-react-lite";
import { useState } from "react";
import { Link, NavLink, useLocation } from "react-router";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { formatCurrency } from "@/utils/formatting";
import { useLedger } from "@/utils/useLedger";
import { CreateAccountModal } from "./CreateAccountModal";

// Menu items.
const items = [
  {
    title: "Budget",
    url: "/budget",
    icon: Wallet,
    //indicator: <div className="w-2 h-2 rounded-md bg-green-600" />,
    indicator: null,
  },
  // {
  //   title: "Ledger",
  //   url: "/ledger",
  //   icon: PiggyBank,
  //   indicator: null,
  // },
  {
    title: "Recurring",
    url: "/recurring",
    icon: CalendarSync,
    indicator: null,
  },
  {
    title: "Reports",
    url: "/reports",
    icon: BarChart3,
    indicator: null,
  },
  {
    title: "Payees",
    url: "/payees",
    icon: Users,
    indicator: null,
  },
];

export const AppSidebar = observer(function AppSidebar() {
  const { ledger } = useLedger();
  const [createAccountType, setCreateAccountType] = useState<"budget" | "tracking" | null>(null);
  const location = useLocation();
  return (
    <Sidebar>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            {/* <DropdownMenu>
              <DropdownMenuTrigger asChild> */}
            <SidebarMenuButton>
              <div className="w-7 h-7 my-2 rounded-2xl bg-green-600 flex items-center justify-center">
                <PiggyBank size={16} color="white" />
              </div>
              <strong>{ledger?.name}</strong>
              {/* <ChevronsUpDown size={16} className="ml-auto" /> */}
            </SidebarMenuButton>
            {/* </DropdownMenuTrigger>
              <DropdownMenuContent className="w-(--radix-popper-anchor-width)">
                <DropdownMenuItem>
                  <SaveIcon size={16} />
                  <span>Save changes</span>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <DoorClosedIcon size={16} />
                  <span>Close ledger</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu> */}
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={location.pathname === item.url}>
                    <NavLink to={item.url} end>
                      <item.icon size={16} />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                  {item.indicator && <SidebarMenuBadge>{item.indicator}</SidebarMenuBadge>}
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        {ledger && (
          <>
            {/* Favorited Budgets */}
            {ledger.favoritedBudgets.length > 0 && (
              <Collapsible defaultOpen className="group/collapsible">
                <SidebarGroup>
                  <SidebarGroupLabel asChild>
                    <CollapsibleTrigger>
                      <Star size={14} className="mr-1" />
                      Favorites
                      <ChevronDown
                        size={16}
                        className="ml-auto transition-transform group-data-[state=open]/collapsible:rotate-180"
                      />
                    </CollapsibleTrigger>
                  </SidebarGroupLabel>
                  <CollapsibleContent>
                    <SidebarGroupContent>
                      <SidebarMenu>
                        {ledger.favoritedBudgets.map((budget) => {
                          const available = ledger.budgetAvailableForMonth(budget, new Date());
                          return (
                            <SidebarMenuItem key={budget.id}>
                              <div className="flex justify-between items-center px-2 py-1.5">
                                <span className="text-sm truncate" title={budget.name}>
                                  {budget.name}
                                </span>
                                <span
                                  className={`text-xs tabular-nums ml-2 shrink-0 ${
                                    available < 0
                                      ? "text-red-600"
                                      : available === 0
                                        ? "text-muted-foreground"
                                        : "text-sidebar-foreground/70"
                                  }`}
                                >
                                  {formatCurrency(available)}
                                </span>
                              </div>
                            </SidebarMenuItem>
                          );
                        })}
                      </SidebarMenu>
                    </SidebarGroupContent>
                  </CollapsibleContent>
                </SidebarGroup>
              </Collapsible>
            )}
            {/* Regular Accounts */}
            <Collapsible defaultOpen className="group/collapsible">
              <SidebarGroup className="group/accounts">
                <SidebarGroupLabel asChild>
                  <CollapsibleTrigger>
                    Accounts
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setCreateAccountType("budget");
                      }}
                      className="opacity-0 group-hover/accounts:opacity-100 transition-opacity ml-auto p-1 rounded-md hover:bg-sidebar-accent"
                    >
                      <Plus size={14} className="text-sidebar-foreground/70" />
                    </button>
                    <ChevronDown
                      size={16}
                      className="transition-transform group-data-[state=open]/collapsible:rotate-180"
                    />
                  </CollapsibleTrigger>
                </SidebarGroupLabel>
                <CollapsibleContent>
                  <SidebarGroupContent>
                    <SidebarMenu>
                      {ledger.accounts.filter((a) => !a.archived && a.type === "budget").length ===
                      0 ? (
                        <div className="px-2 py-4 text-center">
                          <p className="text-xs text-muted-foreground">No accounts yet.</p>
                          <button
                            type="button"
                            onClick={() => setCreateAccountType("budget")}
                            className="text-xs text-muted-foreground underline hover:text-foreground mt-1"
                          >
                            Add your first account
                          </button>
                        </div>
                      ) : (
                        ledger.accounts
                          .filter((a) => !a.archived && a.type === "budget")
                          .map((account) => (
                            <SidebarMenuItem key={account.name}>
                              <SidebarMenuButton
                                asChild
                                isActive={
                                  decodeURIComponent(location.pathname) ===
                                  `/ledger/${account.name}`
                                }
                              >
                                <Link to={`/ledger/${account.name}`} className="justify-between">
                                  <span
                                    className="truncate flex items-center gap-1.5"
                                    title={account.name}
                                  >
                                    {account.name}
                                    {account.uncategorizedTransactionCount > 0 && (
                                      <span
                                        className="w-2 h-2 rounded-full bg-amber-500 shrink-0"
                                        title={`${account.uncategorizedTransactionCount} uncategorized`}
                                      />
                                    )}
                                  </span>
                                  <span className="text-xs tabular-nums text-sidebar-foreground/70 ml-2 shrink-0">
                                    {formatCurrency(account.currentBalance)}
                                  </span>
                                </Link>
                              </SidebarMenuButton>
                            </SidebarMenuItem>
                          ))
                      )}
                    </SidebarMenu>
                  </SidebarGroupContent>
                </CollapsibleContent>
              </SidebarGroup>
            </Collapsible>
            {/* Tracking Accounts */}
            {ledger.accounts.some((a) => !a.archived && a.type === "tracking") && (
              <Collapsible defaultOpen className="group/collapsible">
                <SidebarGroup className="group/tracking">
                  <SidebarGroupLabel asChild>
                    <CollapsibleTrigger>
                      <ChartSpline size={14} className="mr-1" />
                      Tracking Accounts
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setCreateAccountType("tracking");
                        }}
                        className="opacity-0 group-hover/tracking:opacity-100 transition-opacity ml-auto p-1 rounded-md hover:bg-sidebar-accent"
                      >
                        <Plus size={14} className="text-sidebar-foreground/70" />
                      </button>
                      <ChevronDown
                        size={16}
                        className="transition-transform group-data-[state=open]/collapsible:rotate-180"
                      />
                    </CollapsibleTrigger>
                  </SidebarGroupLabel>
                  <CollapsibleContent>
                    <SidebarGroupContent>
                      <SidebarMenu>
                        {ledger.accounts
                          .filter((a) => !a.archived && a.type === "tracking")
                          .map((account) => (
                            <SidebarMenuItem key={account.name}>
                              <SidebarMenuButton
                                asChild
                                isActive={
                                  decodeURIComponent(location.pathname) ===
                                  `/ledger/${account.name}`
                                }
                              >
                                <Link to={`/ledger/${account.name}`} className="justify-between">
                                  <span
                                    className="truncate flex items-center gap-1.5"
                                    title={account.name}
                                  >
                                    {account.name}
                                    {account.uncategorizedTransactionCount > 0 && (
                                      <span
                                        className="w-2 h-2 rounded-full bg-amber-500 shrink-0"
                                        title={`${account.uncategorizedTransactionCount} uncategorized`}
                                      />
                                    )}
                                  </span>
                                  <span className="text-xs tabular-nums text-sidebar-foreground/70 ml-2 shrink-0">
                                    {formatCurrency(account.currentBalance)}
                                  </span>
                                </Link>
                              </SidebarMenuButton>
                            </SidebarMenuItem>
                          ))}
                      </SidebarMenu>
                    </SidebarGroupContent>
                  </CollapsibleContent>
                </SidebarGroup>
              </Collapsible>
            )}
            {/* Savings Goals */}
            {ledger.savingsGoals.length > 0 && (
              <Collapsible defaultOpen className="group/collapsible">
                <SidebarGroup>
                  <SidebarGroupLabel asChild>
                    <CollapsibleTrigger>
                      <Milestone size={14} className="mr-1" />
                      Savings Goals
                      <ChevronDown
                        size={16}
                        className="ml-auto transition-transform group-data-[state=open]/collapsible:rotate-180"
                      />
                    </CollapsibleTrigger>
                  </SidebarGroupLabel>
                  <CollapsibleContent>
                    <SidebarGroupContent>
                      <SidebarMenu>
                        {ledger.savingsGoals.map((goal) => (
                          <SidebarMenuItem key={goal.id}>
                            <div className="px-2 py-1.5">
                              <div className="flex justify-between items-center">
                                <span
                                  className="text-sm truncate"
                                  title={goal.budget?.name || "Unknown"}
                                >
                                  {goal.budget?.name || "Unknown"}
                                </span>
                                <span className="text-xs tabular-nums text-sidebar-foreground/70 ml-2 shrink-0">
                                  {formatCurrency(goal.progress.current)} /{" "}
                                  {formatCurrency(goal.targetAmount)}
                                </span>
                              </div>
                              <div className="mt-1 h-1.5 bg-stone-200 rounded-full overflow-hidden">
                                <div
                                  className={`h-full transition-all ${goal.progress.isComplete ? "bg-green-500" : "bg-green-500"}`}
                                  style={{
                                    width: `${Math.min(100, goal.progress.percentage)}%`,
                                  }}
                                />
                              </div>
                            </div>
                          </SidebarMenuItem>
                        ))}
                      </SidebarMenu>
                    </SidebarGroupContent>
                  </CollapsibleContent>
                </SidebarGroup>
              </Collapsible>
            )}
            {/* Archived Accounts */}
            {ledger.accounts.some((a) => a.archived) && (
              <Collapsible className="group/collapsible">
                <SidebarGroup>
                  <SidebarGroupLabel asChild>
                    <CollapsibleTrigger>
                      <Archive size={14} className="mr-1" />
                      Archived Accounts
                      <ChevronDown
                        size={16}
                        className="ml-auto transition-transform group-data-[state=open]/collapsible:rotate-180"
                      />
                    </CollapsibleTrigger>
                  </SidebarGroupLabel>
                  <CollapsibleContent>
                    <SidebarGroupContent>
                      <SidebarMenu>
                        {ledger.accounts
                          .filter((a) => a.archived)
                          .map((account) => (
                            <SidebarMenuItem key={account.name}>
                              <SidebarMenuButton
                                asChild
                                isActive={
                                  decodeURIComponent(location.pathname) ===
                                  `/ledger/${account.name}`
                                }
                              >
                                <Link
                                  to={`/ledger/${account.name}`}
                                  className="text-muted-foreground justify-between"
                                >
                                  <span className="truncate" title={account.name}>
                                    {account.name}
                                  </span>
                                  <span className="text-xs tabular-nums ml-2 shrink-0">
                                    {formatCurrency(account.currentBalance)}
                                  </span>
                                </Link>
                              </SidebarMenuButton>
                            </SidebarMenuItem>
                          ))}
                      </SidebarMenu>
                    </SidebarGroupContent>
                  </CollapsibleContent>
                </SidebarGroup>
              </Collapsible>
            )}
          </>
        )}
      </SidebarContent>
      <SidebarFooter />
      <CreateAccountModal
        open={createAccountType !== null}
        onOpenChange={(open) => {
          if (!open) setCreateAccountType(null);
        }}
        defaultType={createAccountType ?? "budget"}
      />
    </Sidebar>
  );
});
