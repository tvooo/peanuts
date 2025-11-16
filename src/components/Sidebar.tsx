import { useLedger } from "@/utils/useLedger";
import { Archive, CalendarSync, ChartSpline, ChevronDown, PiggyBank, Save, Users, Wallet } from "lucide-react";

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
  SidebarMenuItem
} from "@/components/ui/sidebar";
import { formatCurrency } from "@/utils/formatting";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@radix-ui/react-collapsible";
import { Link, NavLink, useLocation } from "react-router";
import { Button } from "./ui/button";

// Menu items.
const items = [
  {
    title: "Budget",
    url: "/budget",
    icon: Wallet,
    //indicator: <div className="w-2 h-2 rounded-md bg-green-600" />,
    indicator: null,},
  // {
  //   title: "Ledger",
  //   url: "/ledger",
  //   icon: PiggyBank,
  //   indicator: null,
  // },
  {
    title: "Subscriptions",
    url: "/subscriptions",
    icon: CalendarSync,
    indicator: null,
  },
  {
    title: "Payees",
    url: "/payees",
    icon: Users,
    indicator: null,
  },
];

export function AppSidebar() {
  const { ledger, openLedger, fileHandle } = useLedger()
  let location = useLocation();
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
              <DropdownMenuContent className="w-[--radix-popper-anchor-width]">
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
                  <SidebarMenuButton
                    asChild
                    isActive={location.pathname === item.url}
                  >
                    <NavLink to={item.url} end>
                      <item.icon size={16} />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                  {item.indicator && (
                    <SidebarMenuBadge>{item.indicator}</SidebarMenuBadge>
                  )}
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        {ledger && (
          <>
            {/* Regular Accounts */}
            <Collapsible defaultOpen className="group/collapsible">
              <SidebarGroup>
                <SidebarGroupLabel asChild>
                  <CollapsibleTrigger>
                    Accounts
                    <ChevronDown
                      size={16}
                      className="ml-auto transition-transform group-data-[state=open]/collapsible:rotate-180"
                    />
                  </CollapsibleTrigger>
                </SidebarGroupLabel>
                <CollapsibleContent>
                  <SidebarGroupContent>
                    <SidebarMenu>
                      {ledger.accounts.filter(a => !a.archived && a.type === "budget").map((account, idx) => (
                        <SidebarMenuItem key={account.name}>
                          <SidebarMenuButton
                            asChild
                            isActive={
                              decodeURIComponent(location.pathname) === `/ledger/${account.name}`
                            }
                          >
                            <Link to={`/ledger/${account.name}`} className="justify-between">
                              <span className="truncate" title={account.name}>{account.name}</span>
                              <span className="text-xs tabular-nums text-sidebar-foreground/70 ml-2 flex-shrink-0">
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
            {/* Tracking Accounts */}
            {ledger.accounts.some(a => !a.archived && a.type === "tracking") && (
              <Collapsible defaultOpen className="group/collapsible">
                <SidebarGroup>
                  <SidebarGroupLabel asChild>
                    <CollapsibleTrigger>
                      <ChartSpline size={14} className="mr-1" />
                      Tracking Accounts
                      <ChevronDown
                        size={16}
                        className="ml-auto transition-transform group-data-[state=open]/collapsible:rotate-180"
                      />
                    </CollapsibleTrigger>
                  </SidebarGroupLabel>
                  <CollapsibleContent>
                    <SidebarGroupContent>
                      <SidebarMenu>
                        {ledger.accounts.filter(a => !a.archived && a.type === "tracking").map((account, idx) => (
                          <SidebarMenuItem key={account.name}>
                            <SidebarMenuButton
                              asChild
                              isActive={
                                decodeURIComponent(location.pathname) === `/ledger/${account.name}`
                              }
                            >
                              <Link to={`/ledger/${account.name}`} className="justify-between">
                                <span className="truncate" title={account.name}>{account.name}</span>
                                <span className="text-xs tabular-nums text-sidebar-foreground/70 ml-2 flex-shrink-0">
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
            {/* Archived Accounts */}
            {ledger.accounts.some(a => a.archived) && (
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
                        {ledger.accounts.filter(a => a.archived).map((account, idx) => (
                          <SidebarMenuItem key={account.name}>
                            <SidebarMenuButton
                              asChild
                              isActive={
                                decodeURIComponent(location.pathname) === `/ledger/${account.name}`
                              }
                            >
                              <Link to={`/ledger/${account.name}`} className="text-muted-foreground justify-between">
                                <span className="truncate" title={account.name}>{account.name}</span>
                                <span className="text-xs tabular-nums ml-2 flex-shrink-0">
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
      <SidebarFooter>
        <Button
        variant="secondary"
          onClick={async () => {
            console.log(ledger!.toJSON());
          }}
        >
          Debug
        </Button>
        <Button
          onClick={async () => {
            const writableStream = await fileHandle!.createWritable();
            await writableStream.write(JSON.stringify(ledger!.toJSON(), null, 2));
            await writableStream.close();
          }}
        >
          <Save size={16} /> Save
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
