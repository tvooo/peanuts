import { useLedger } from "@/utils/useLedger";
import { CalendarSync, ChevronDown, ChevronsUpDown, DoorClosedIcon, PiggyBank, SaveIcon, Wallet } from "lucide-react";

import {
  Sidebar,
  SidebarContent,
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
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@radix-ui/react-dropdown-menu";
import { Link, NavLink, useLocation } from "react-router";

// Menu items.
const items = [
  {
    title: "Budget",
    url: "/budget",
    icon: Wallet,
    indicator: <div className="w-2 h-2 rounded-md bg-green-600" />,
  },
  {
    title: "Ledger",
    url: "/ledger",
    icon: PiggyBank,
    indicator: null,
  },
  {
    title: "Subscriptions",
    url: "/subscriptions",
    icon: CalendarSync,
    indicator: null,
  },
];

export function AppSidebar() {
  const { ledger, openLedger } = useLedger()
  let location = useLocation();
  return (
    <Sidebar>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton>
                  <div className="w-7 h-7 my-2 rounded-2xl bg-green-600 flex items-center justify-center">
                    <PiggyBank size={16} color="white" />
                  </div>
                  <strong>Joint budget</strong>
                  {/* <span>joint.budget</span> */}
                  <ChevronsUpDown size={16} className="ml-auto" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
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
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          {/* <SidebarGroupLabel>Application</SidebarGroupLabel> */}
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
                    {/* <a href={item.url}>
                      <item.icon size={16} />
                      <span>{item.title}</span>
                    </a> */}
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
                    {ledger.accounts.map((account, idx) => (
                      <SidebarMenuItem key={account.name}>
                        <SidebarMenuButton
                          asChild
                          isActive={
                            location.pathname === `/ledger/${account.name}`
                          }
                        >
                          <Link to={`/ledger/${account.name}`}>
                            <span>{ledger.alias(account.name)}</span>
                          </Link>
                        </SidebarMenuButton>
                        <SidebarMenuBadge>
                          &euro; {formatCurrency(account.currentBalance)}
                        </SidebarMenuBadge>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </CollapsibleContent>
            </SidebarGroup>
          </Collapsible>
        )}
      </SidebarContent>
      {/* <SidebarFooter>
      </SidebarFooter> */}
    </Sidebar>
  );
}


export function AppSidebarxxx({
  fileHandle,
  onOpenLedgerClick,
}: {
  fileHandle: FileSystemFileHandle | null;
  onOpenLedgerClick: () => void;
}) {
  // const pathname = usePathname();
  const pathname = "nope"
  const ledger = useLedger();

  return (
    <Sidebar>
      <SidebarContent />
    </Sidebar>
    // <div className="text-sm flex flex-col justify-between h-full p-2">
    //   {/* <div className="p-2 "> */}
    //   <Link href="/app/budget">
    //     <MenuItem
    //       isActive={pathname === "/app/budget"}
    //       icon={<PiggyBank className="text-yellow-700" />}
    //     >
    //       Budget
    //     </MenuItem>
    //   </Link>
    //   <Link href="/app/ledger">
    //     <MenuItem
    //       isActive={pathname === "/app/ledger"}
    //       icon={<BookCopy className="text-indigo-700" />}
    //     >
    //       Ledger
    //     </MenuItem>
    //   </Link>
    //   <Link href="/app/reports">
    //     <MenuItem
    //       isActive={pathname === "/app/reports"}
    //       icon={<ChartLine className="text-indigo-700" />}
    //     >
    //       Reports
    //     </MenuItem>
    //   </Link>
    //   <h2 className="p-2 text-stone-600 text-xs font-bold uppercase mt-3">
    //     Accounts
    //   </h2>
    //   {ledger && (
    //     <div className="flex flex-col justify-stretch">
    //       <button
    //         onClick={() => console.log(ledger.toString())}
    //         className="mt-auto"
    //       >
    //         Save
    //       </button>
    //       {ledger.accounts.map((account, idx) => (
    //         <Link key={account.name} href={`/app/accounts/${account.name}`}>
    //           <MenuItem
    //             isActive={pathname === `/app/accounts/${account.name}`}
    //             icon={<CreditCard className="text-sky-700" />}
    //             badge={
    //               <div className="font-mono ml-auto">
    //                 {formatCurrency(account.currentBalance)}
    //               </div>
    //             }
    //           >
    //             {ledger.alias(account.name)}
    //           </MenuItem>
    //         </Link>
    //       ))}
    //     </div>
    //   )}
    //   {ledger && (
    //     <button onClick={onOpenLedgerClick} className="mt-auto">
    //       <MenuItem icon={<Upload />}>
    //         {ledger.source ? (
    //           <div className="flex flex-col items-start">
    //             <div className="text-lg font-semibold">{ledger.name}</div>
    //             <div className="text-sm font-mono text-stone-600">
    //               {ledger.fileName}
    //             </div>
    //           </div>
    //         ) : (
    //           "Open ledger"
    //         )}
    //       </MenuItem>
    //     </button>
    //     // <button className="flex p-4">
    //     //   <div className="mr-auto">
    //     //     <h1 className="text-md font-bold">{ledger.name}</h1>
    //     //     <div className="font-mono text-xs font-bold text-stone-600">
    //     //       {ledger.fileName}
    //     //     </div>
    //     //   </div>
    //     //   {/* <Settings /> */}
    //     // </button>
    //   )}
    //   {/* </div> */}
    // </div>
  );
}
