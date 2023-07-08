import { formatCurrency } from "@/utils/formatting";
import { CreditCard, PiggyBank, Settings } from "iconoir-react";
import { MenuItem } from "./Menu";

export function Sidebar({ ledger, l, currentAccount, setCurrentAccount }) {
  return (
    <div className="text-sm flex flex-col justify-between h-full">
      <div className="p-2 ">
        <MenuItem onClick={() => setCurrentAccount(null)} icon={<PiggyBank />}>
          Budget
        </MenuItem>
        <h2 className="p-2 text-stone-600 text-xs font-bold uppercase mt-3">
          Accounts
        </h2>
        <div className="flex flex-col justify-stretch">
          {ledger.accounts.map((account, idx) => (
            <MenuItem
              key={idx}
              onClick={() => setCurrentAccount(account)}
              icon={<CreditCard />}
              badge={
                <div className="font-mono ml-auto">
                  {formatCurrency(account.currentBalance)}
                </div>
              }
            >
              {l(account.name)}
            </MenuItem>
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
