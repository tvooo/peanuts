"use client";

import { redirect, useParams } from "next/navigation";

import { Button } from "@/components/Button";
import { TransactionsTable } from "@/features/budget/TransactionsTable";
import { Transaction, TransactionPosting } from "@/models/Transaction";
import { formatCurrency } from "@/utils/formatting";
import { useLedger } from "@/utils/useLedger";
import { useState } from "react";

export default function AccountPage() {
  const ledger = useLedger();
  const params = useParams();
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null)

  if (!ledger) {
    redirect("/app");
  }

  const currentAccount = ledger.getAccount(params.accountName);

  if(!currentAccount) {
    redirect('/app')
  }
  const l = ledger.alias.bind(ledger);

  return (
    <div className="">
      <div className="flex justify-between items-center px-8 py-4">
        <h2 className="text-2xl font-bold">
          {ledger.alias(currentAccount.name)}
        </h2>
        <div>
          <div className="text-sm">Balance</div>
          <div className="text-md font-bold">
            {formatCurrency(currentAccount.currentBalance)}
          </div>
        </div>
      </div>
      <div className="flex justify-between items-center px-8 py-4">
        <Button onClick={() => {
          const budget = ledger.getBudget("coffee")!
          const transaction = new Transaction(
            new Date(),
            currentAccount,
            "open",
            [new TransactionPosting("", budget, 0)]
          );
          setEditingTransaction(transaction)
          ledger.addTransaction(transaction)
        }}>New Transaction</Button>
      </div>
      <TransactionsTable
        currentAccount={currentAccount}
        ledger={ledger}
        l={l}
        editingTransaction={editingTransaction}
      />
    </div>
  );
}
