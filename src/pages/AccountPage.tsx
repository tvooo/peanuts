import { Button } from "@/components/ui/button";
import { TransactionsTable } from "@/features/budget/TransactionsTable";
import { Transaction, TransactionPosting } from "@/models/Transaction";
import { PageLayout } from "@/PageLayout";
import { formatCurrency } from "@/utils/formatting";
import { useLedger } from "@/utils/useLedger";
import { startOfToday } from "date-fns";
import { observer } from "mobx-react-lite";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";

export const AccountPage = observer(function AccountPage() {
  const {ledger} = useLedger();
  const params = useParams();
  const [editingTransaction, setEditingTransaction] =
    useState<Transaction | null>(null);
  const navigate = useNavigate();

    const currentAccount = ledger?.getAccount(params.accountName);

    useEffect(() => {
      if(!ledger) {
        navigate("/");
        return
      }
      
      if(!currentAccount) {
        navigate("/");
        return
      }
    }, [ledger, currentAccount, navigate])

  if (!ledger || !currentAccount) {
    return null
  }

  return (
    <PageLayout>
        <div className="flex justify-between items-center px-8 py-4">
          <h2 className="text-2xl font-bold">
            {currentAccount.name}
          </h2>
          <div>
            <div className="text-sm">Balance</div>
            <div className="text-md font-bold">
              {formatCurrency(currentAccount.currentBalance)}
            </div>
          </div>
        </div>
        <div className="flex justify-between items-center px-8 py-4">
          <Button
            onClick={() => {
              if(editingTransaction) {
                return
              }
              
              const transactionPosting = new TransactionPosting(
                { ledger: ledger!, id: null },
              );
              transactionPosting.budget = null
              transactionPosting.amount = 0;
              transactionPosting.note = "";
              transactionPosting.payee = null
              ledger.transactionPostings.push(transactionPosting);


              const transaction = new Transaction(
                { ledger: ledger!, id: null },
              );
              transaction.account = currentAccount;
              transaction.postings.push(transactionPosting);
              transaction.date = startOfToday()
              ledger.transactions.push(transaction);


              setEditingTransaction(transaction);
            }}
          >
            New Transaction
          </Button>
        </div>
        <TransactionsTable
          currentAccount={currentAccount}
          ledger={ledger}
          setEditingTransaction={setEditingTransaction}
          editingTransaction={editingTransaction}
        />
    </PageLayout>
  );
})
