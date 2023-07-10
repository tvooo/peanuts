"use client"

import { useParams } from "next/navigation";

import { TransactionsTable } from "@/features/budget/TransactionsTable";
import { formatCurrency } from "@/utils/formatting";
import { useLedger } from "@/utils/useLedger";

export default function AccountPage() {
  const ledger = useLedger();
  const params = useParams();
 
  if(!ledger) {
    return <h1>No ledger opened</h1>
  }

   const currentAccount = ledger.getAccount(params.accountName)!;
   const l = ledger.alias.bind(ledger);

  return (
    <div className="">
      <div className="flex justify-between items-center mb-6 p-8">
        <h2 className="text-2xl font-bold">{ledger.alias(currentAccount.name)}</h2>
        <div>
          <div className="text-sm">Balance</div>
          <div className="text-md font-bold">
            {formatCurrency(currentAccount.currentBalance)}
          </div>
        </div>
      </div>
      <TransactionsTable
        currentAccount={currentAccount}
        ledger={ledger}
        l={l}
      />
    </div>
  );
}
