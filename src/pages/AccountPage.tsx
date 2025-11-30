import { Button } from "@/components/ui/button";
import { TransactionsTable } from "@/features/budget/TransactionsTable";
import { Transaction, TransactionPosting } from "@/models/Transaction";
import { PageLayout } from "@/PageLayout";
import { formatCurrency } from "@/utils/formatting";
import { useLedger } from "@/utils/useLedger";
import { startOfToday } from "date-fns";
import { Archive, Eye } from "lucide-react";
import { observer } from "mobx-react-lite";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";

export const AccountPage = observer(function AccountPage() {
  const {ledger} = useLedger();
  const params = useParams();
  const [editingTransaction, setEditingTransaction] =
    useState<Transaction | null>(null);
  const navigate = useNavigate();
    const currentAccount = ledger?.getAccount(params.accountName || "");

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
      <div className="flex flex-col h-full">
        {/* Fixed header - Account info */}
        <div className="flex justify-between items-center px-8 py-4 shrink-0">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold">
              {currentAccount.name}
            </h2>
            {currentAccount.type === "tracking" && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 text-slate-600 text-sm font-medium">
                <Eye size={14} />
                Tracking
              </span>
            )}
            {currentAccount.archived && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 text-slate-600 text-sm font-medium">
                <Archive size={14} />
                Archived
              </span>
            )}
          </div>
          <div className="flex items-center gap-4">
            <div>
              <div className="text-sm">Balance</div>
              <div className="text-md font-bold">
                {formatCurrency(currentAccount.currentBalance)}
              </div>
            </div>
            <Button
              variant={currentAccount.archived ? "default" : "outline"}
              size="sm"
              onClick={() => {
                currentAccount.archived = !currentAccount.archived;
              }}
            >
              <Archive size={16} />
              {currentAccount.archived ? "Unarchive" : "Archive"}
            </Button>
          </div>
        </div>

        {/* Fixed header - New transaction button */}
        <div className="flex justify-between items-center px-8 py-4 shrink-0">
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

        {/* Scrollable table container */}
        <div className="flex-1 overflow-auto min-h-0">
          <TransactionsTable
            currentAccount={currentAccount}
            ledger={ledger}
            setEditingTransaction={setEditingTransaction}
            editingTransaction={editingTransaction || undefined}
          />
        </div>
      </div>
    </PageLayout>
  );
})
