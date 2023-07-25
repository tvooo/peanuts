import Link from "next/link";

import { formatCurrency } from "@/utils/formatting";
import { useLedger } from "@/utils/useLedger";
import { CreditCard, GraphUp, Page, PiggyBank, Upload } from "iconoir-react";
import { usePathname } from "next/navigation";
import { MenuItem } from "./Menu";

export function Sidebar({
  fileHandle,
  onOpenLedgerClick,
}: {
  fileHandle: FileSystemFileHandle | null;
  onOpenLedgerClick: () => void;
}) {
  const pathname = usePathname();
  const ledger = useLedger();

  return (
    <div className="text-sm flex flex-col justify-between h-full p-2">
      {/* <div className="p-2 "> */}
      <Link href="/app/budget">
        <MenuItem
          isActive={pathname === "/app/budget"}
          icon={<PiggyBank className="text-yellow-700" />}
        >
          Budget
        </MenuItem>
      </Link>
      <Link href="/app/ledger">
        <MenuItem
          isActive={pathname === "/app/ledger"}
          icon={<Page className="text-indigo-700" />}
        >
          Ledger
        </MenuItem>
      </Link>
      <Link href="/app/reports">
        <MenuItem
          isActive={pathname === "/app/reports"}
          icon={<GraphUp className="text-indigo-700" />}
        >
          Reports
        </MenuItem>
      </Link>
      <h2 className="p-2 text-stone-600 text-xs font-bold uppercase mt-3">
        Accounts
      </h2>
      {ledger && (
        <div className="flex flex-col justify-stretch">
          {ledger.accounts.map((account, idx) => (
            <Link key={account.name} href={`/app/accounts/${account.name}`}>
              <MenuItem
                isActive={pathname === `/app/accounts/${account.name}`}
                icon={<CreditCard className="text-sky-700" />}
                badge={
                  <div className="font-mono ml-auto">
                    {formatCurrency(account.currentBalance)}
                  </div>
                }
              >
                {ledger.alias(account.name)}
              </MenuItem>
            </Link>
          ))}
        </div>
      )}
      {ledger && (
        <button onClick={onOpenLedgerClick} className="mt-auto">
          <MenuItem icon={<Upload />}>
            {ledger.source ? (
              <div className="flex flex-col items-start">
                <div className="text-lg font-semibold">{ledger.name}</div>
                <div className="text-sm font-mono text-stone-600">
                  {ledger.fileName}
                </div>
              </div>
            ) : (
              "Open ledger"
            )}
          </MenuItem>
        </button>
        // <button className="flex p-4">
        //   <div className="mr-auto">
        //     <h1 className="text-md font-bold">{ledger.name}</h1>
        //     <div className="font-mono text-xs font-bold text-stone-600">
        //       {ledger.fileName}
        //     </div>
        //   </div>
        //   {/* <Settings /> */}
        // </button>
      )}
      {/* </div> */}
    </div>
  );
}
