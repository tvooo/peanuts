import { Button } from "@/components/ui/button";
import { TransactionsTable } from "@/features/budget/TransactionsTable";
import { Transaction, TransactionPosting } from "@/models/Transaction";
import type { Transfer } from "@/models/Transfer";
import { PageLayout } from "@/PageLayout";
import { formatCurrency } from "@/utils/formatting";
import { useLedger } from "@/utils/useLedger";
import { startOfToday } from "date-fns";
import { Archive, Eye } from "lucide-react";
import { runInAction } from "mobx";
import { observer } from "mobx-react-lite";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";

export const AccountPage = observer(function AccountPage() {
  const { ledger } = useLedger();
  const params = useParams();
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const navigate = useNavigate();
  const currentAccount = ledger?.getAccount(params.accountName || "");

  useEffect(() => {
    if (!ledger) {
      navigate("/");
      return;
    }

    if (!currentAccount) {
      navigate("/");
      return;
    }
  }, [ledger, currentAccount, navigate]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: Clear selection when account changes. TODO: Claude-generated issue, need to fix later
  useEffect(() => {
    setSelectedIds(new Set());
  }, [currentAccount]);

  if (!ledger || !currentAccount) {
    return null;
  }

  // Get all selectable items (transactions + transfers, not balance assertions)
  const allSelectableItems = ledger
    .transactionsAndBalancesForAccount(currentAccount)
    .filter((item) => item instanceof Transaction || Object.hasOwn(item, "fromAccount"));

  const allSelectableIds = allSelectableItems
    .filter((item): item is Transaction | Transfer => "id" in item)
    .map((item) => item.id);

  const handleSelectAll = () => {
    if (selectedIds.size === allSelectableIds.length) {
      // All selected, clear selection
      setSelectedIds(new Set());
    } else {
      // Select all
      setSelectedIds(new Set(allSelectableIds));
    }
  };

  const handleDelete = () => {
    if (!ledger || selectedIds.size === 0) return;

    runInAction(() => {
      selectedIds.forEach((id) => {
        // Check if it's a transaction
        const transaction = ledger.transactions.find((t) => t.id === id);
        if (transaction) {
          // Remove associated postings
          transaction.postings.forEach((posting) => {
            const postingIndex = ledger.transactionPostings.findIndex((p) => p.id === posting.id);
            if (postingIndex !== -1) {
              ledger.transactionPostings.splice(postingIndex, 1);
            }
          });
          // Remove transaction
          const transactionIndex = ledger.transactions.findIndex((t) => t.id === id);
          if (transactionIndex !== -1) {
            ledger.transactions.splice(transactionIndex, 1);
          }
          return;
        }

        // Check if it's a transfer
        const transfer = ledger.transfers.find((t) => t.id === id);
        if (transfer) {
          const transferIndex = ledger.transfers.findIndex((t) => t.id === id);
          if (transferIndex !== -1) {
            ledger.transfers.splice(transferIndex, 1);
          }
        }
      });

      // Clear selection after deletion
      setSelectedIds(new Set());
    });
  };

  const handleToggleSelection = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  return (
    <PageLayout>
      <div className="flex flex-col h-full">
        {/* Fixed header - Account info */}
        <div className="flex justify-between items-center px-8 py-4 shrink-0">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold">{currentAccount.name}</h2>
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

        {/* Fixed header - Bulk actions and new transaction button */}
        <div className="flex justify-between items-center px-8 py-4 shrink-0">
          <div className="flex gap-2">
            <Button variant="secondary" onClick={handleSelectAll}>
              Select All
            </Button>
            <Button variant="destructive" disabled={selectedIds.size === 0} onClick={handleDelete}>
              Delete
            </Button>
          </div>
          <Button
            onClick={() => {
              if (editingTransaction) {
                return;
              }

              const transactionPosting = new TransactionPosting({
                ledger: ledger!,
                id: null,
              });
              transactionPosting.budget = null;
              transactionPosting.amount = 0;
              transactionPosting.note = "";
              transactionPosting.payee = null;
              ledger.transactionPostings.push(transactionPosting);

              const transaction = new Transaction({
                ledger: ledger!,
                id: null,
              });
              transaction.account = currentAccount;
              transaction.postings.push(transactionPosting);
              transaction.date = startOfToday();
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
            selectedIds={selectedIds}
            onToggleSelection={handleToggleSelection}
          />
        </div>
      </div>
    </PageLayout>
  );
});
