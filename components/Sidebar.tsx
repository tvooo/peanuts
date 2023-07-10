import Link from "next/link";

import { formatCurrency } from "@/utils/formatting";
import { useLedger } from "@/utils/useLedger";
import { CreditCard, Page, PiggyBank, Settings } from "iconoir-react";
import { usePathname } from "next/navigation";
import { MenuItem } from "./Menu";

export function Sidebar() {
  const pathname = usePathname()
  const ledger = useLedger()

  return (
    <div className="text-sm flex flex-col justify-between h-full">
      <div className="p-2 ">
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
        <h2 className="p-2 text-stone-600 text-xs font-bold uppercase mt-3">
          Accounts
        </h2>
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
      </div>
      <div className="flex p-4">
        <div className="mr-auto">
          <h1 className="text-md font-bold">Tim&apos;s budget</h1>
          <div className="font-mono text-xs font-bold text-stone-600">
            tim.pbj
          </div>
        </div>
        <Settings />
      </div>
    </div>
  );
}
