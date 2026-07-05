import { startOfToday } from "date-fns";
import { Archive, Eye, FileDown } from "lucide-react";
import { runInAction } from "mobx";
import { observer } from "mobx-react-lite";
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TransactionsTable } from "@/features/budget/TransactionsTable";
import { ImportStatementModal } from "@/features/import/ImportStatementModal";
import { Transaction, TransactionPosting } from "@/models/Transaction";
import { Transfer } from "@/models/Transfer";
import { PageLayout } from "@/PageLayout";
import { formatCurrency } from "@/utils/formatting";
import { type ParsedStatement, parseStatementFile, StatementParseError } from "@/utils/import";
import { useLedger } from "@/utils/useLedger";

export const AccountPage = observer(function AccountPage() {
  const { ledger } = useLedger();
  const params = useParams();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [autoEditTransactionId, setAutoEditTransactionId] = useState<string | null>(null);
  const [lastUsedDate, setLastUsedDate] = useState<Date>(startOfToday());
  const [searchQuery, setSearchQuery] = useState("");
  const [pendingImport, setPendingImport] = useState<{
    statement: ParsedStatement;
    fileName: string;
  } | null>(null);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const dragDepth = useRef(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const currentAccount = ledger?.getAccount(params.accountName || "");

  const handleImportFile = useCallback(async (file: File) => {
    try {
      const statement = parseStatementFile(await file.arrayBuffer());
      setPendingImport({ statement, fileName: file.name });
    } catch (e) {
      const message =
        e instanceof StatementParseError ? e.message : "Could not read the statement file.";
      window.alert(`Import failed: ${message}`);
    }
  }, []);

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

  // biome-ignore lint/correctness/useExhaustiveDependencies: Clear selection and auto-edit state when account changes. TODO: Claude-generated issue, need to fix later
  useEffect(() => {
    setSelectedIds(new Set());
    setAutoEditTransactionId(null);
  }, [currentAccount]);

  const createNewTransaction = useCallback(
    (dateFromPrevious?: Date) => {
      if (!ledger || !currentAccount) return;

      // Update last used date if provided
      const dateToUse = dateFromPrevious ?? lastUsedDate;
      if (dateFromPrevious) {
        setLastUsedDate(dateFromPrevious);
      }

      let newTransactionId: string | null = null;
      runInAction(() => {
        const transactionPosting = new TransactionPosting({
          ledger: ledger,
          id: null,
        });
        transactionPosting.budget = null;
        transactionPosting.amount = 0;
        transactionPosting.note = "";
        ledger.transactionPostings.push(transactionPosting);

        const transaction = new Transaction({
          ledger: ledger,
          id: null,
        });
        transaction.account = currentAccount;
        transaction.postings.push(transactionPosting);
        transaction.date = dateToUse;
        transaction.payee = null;
        ledger.transactions.push(transaction);
        newTransactionId = transaction.id;
      });
      setAutoEditTransactionId(newTransactionId);
    },
    [ledger, currentAccount, lastUsedDate]
  );

  const handleCreateNewTransaction = useCallback(() => {
    createNewTransaction();
  }, [createNewTransaction]);

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
          ledger.deleteTransaction(transaction);
          return;
        }

        // Check if it's a transfer
        const transfer = ledger.transfers.find((t) => t.id === id);
        if (transfer) {
          ledger.deleteTransfer(transfer);
        }
      });

      // Clear selection after deletion
      setSelectedIds(new Set());
    });
  };

  const handleConvertTransactionToTransfer = (
    transaction: Transaction,
    targetAccountId: string
  ) => {
    // Check if transaction has multiple postings
    if (transaction.isSplit) {
      const confirmed = window.confirm(
        "This split transaction has multiple budget categories. Converting to transfer will lose this split information. Continue?"
      );
      if (!confirmed) return;
    }

    runInAction(() => {
      // Get the posting and target account
      const posting = transaction.postings[0];
      const targetAccount = ledger.accounts.find((a) => a.id === targetAccountId);
      if (!posting || !targetAccount) return;

      // Create a new transfer
      const transfer = new Transfer({ ledger, id: null });
      transfer.date = transaction.date;
      transfer.amount = Math.abs(posting.amount);
      transfer.note = posting.note;

      // Set from/to accounts based on amount sign
      if (posting.amount >= 0) {
        // Positive amount = money coming in = transfer TO this account FROM target
        transfer.fromAccount = targetAccount;
        transfer.toAccount = currentAccount;
      } else {
        // Negative amount = money going out = transfer FROM this account TO target
        transfer.fromAccount = currentAccount;
        transfer.toAccount = targetAccount;
      }

      // Add transfer to ledger
      ledger.transfers.push(transfer);

      // Remove the transaction and its postings
      ledger.deleteTransaction(transaction);
    });
  };

  const handleConvertTransferToTransaction = (transfer: Transfer) => {
    runInAction(() => {
      // Create a new transaction
      const transaction = new Transaction({ ledger, id: null });
      transaction.account = currentAccount;
      transaction.date = transfer.date;

      // Create a posting
      const posting = new TransactionPosting({ ledger, id: null });
      posting.note = transfer.note;

      // Determine amount based on whether this is from or to the current account
      const isFromAccount = transfer.fromAccount?.id === currentAccount.id;
      posting.amount = isFromAccount ? -Math.abs(transfer.amount) : Math.abs(transfer.amount);

      transaction.postings.push(posting);
      ledger.transactionPostings.push(posting);
      ledger.transactions.push(transaction);

      // Remove the transfer
      ledger.deleteTransfer(transfer);
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
      {/* biome-ignore lint/a11y/noStaticElementInteractions: page-level drop target; the Import button is the accessible path */}
      <div
        className="flex flex-col h-full relative"
        onDragEnter={(e) => {
          if (!e.dataTransfer.types.includes("Files")) return;
          e.preventDefault();
          dragDepth.current++;
          setIsDraggingFile(true);
        }}
        onDragOver={(e) => {
          if (!e.dataTransfer.types.includes("Files")) return;
          e.preventDefault();
        }}
        onDragLeave={(e) => {
          if (!e.dataTransfer.types.includes("Files")) return;
          dragDepth.current = Math.max(0, dragDepth.current - 1);
          if (dragDepth.current === 0) setIsDraggingFile(false);
        }}
        onDrop={(e) => {
          if (!e.dataTransfer.types.includes("Files")) return;
          e.preventDefault();
          dragDepth.current = 0;
          setIsDraggingFile(false);
          const file = e.dataTransfer.files[0];
          if (file) handleImportFile(file);
        }}
      >
        {isDraggingFile && (
          <div className="absolute inset-0 z-20 flex items-center justify-center rounded-lg border-2 border-dashed border-primary bg-white/80 pointer-events-none">
            <div className="flex items-center gap-2 text-primary font-medium">
              <FileDown size={20} />
              Drop bank statement to import
            </div>
          </div>
        )}
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
            <div className="text-right">
              <div className="text-sm text-muted-foreground">Cleared</div>
              <div className="text-md">{formatCurrency(currentAccount.clearedBalance)}</div>
            </div>
            <div className="text-muted-foreground">+</div>
            <div className="text-right">
              <div className="text-sm text-muted-foreground">Uncleared</div>
              <div className="text-md">{formatCurrency(currentAccount.unclearedBalance)}</div>
            </div>
            <div className="text-muted-foreground">=</div>
            <div className="text-right">
              <div className="text-sm text-muted-foreground">Total</div>
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
            <Input
              type="text"
              placeholder="Search transactions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-64"
            />
          </div>
          <div className="flex gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleImportFile(file);
                e.target.value = "";
              }}
            />
            <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
              <FileDown size={16} />
              Import
            </Button>
            <Button onClick={handleCreateNewTransaction}>New Transaction</Button>
          </div>
        </div>

        {/* Scrollable table container */}
        <div className="flex-1 overflow-auto min-h-0">
          <TransactionsTable
            currentAccount={currentAccount}
            ledger={ledger}
            selectedIds={selectedIds}
            onToggleSelection={handleToggleSelection}
            onConvertTransactionToTransfer={handleConvertTransactionToTransfer}
            onConvertTransferToTransaction={handleConvertTransferToTransaction}
            autoEditTransactionId={autoEditTransactionId}
            onAutoEditProcessed={() => setAutoEditTransactionId(null)}
            onDeleteItem={(item) => {
              runInAction(() => {
                if (item instanceof Transaction) {
                  ledger.deleteTransaction(item);
                } else if (item instanceof Transfer) {
                  ledger.deleteTransfer(item);
                }
              });
            }}
            onRequestNewTransaction={createNewTransaction}
            searchQuery={searchQuery}
          />
        </div>

        <ImportStatementModal
          account={currentAccount}
          statement={pendingImport?.statement ?? null}
          fileName={pendingImport?.fileName ?? ""}
          onClose={() => setPendingImport(null)}
        />
      </div>
    </PageLayout>
  );
});
