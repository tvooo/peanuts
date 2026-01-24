import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import { sortBy } from "lodash";
import { CheckCheck } from "lucide-react";
import { runInAction } from "mobx";
import { observer } from "mobx-react-lite";
import * as React from "react";
import { useCallback, useMemo, useRef, useState } from "react";
import { twJoin } from "tailwind-merge";
import { HeaderCell } from "@/components/Table";
import type { Account } from "@/models/Account";
import type { BalanceAssertion } from "@/models/BalanceAssertion";
import type { Ledger } from "@/models/Ledger";
import { Transaction } from "@/models/Transaction";
import { Transfer } from "@/models/Transfer";
import { BalanceAssertionRow } from "./BalanceAssertionRow";
import { SplitTransactionFormRow } from "./SplitTransactionFormRow";
import { TransactionFormRow } from "./TransactionFormRow";
import { TransactionRow } from "./TransactionRow";
import { TransferFormRow } from "./TransferFormRow";
import { TransferRow } from "./TransferRow";

const ROW_HEIGHT = 44; // Approximate height of a normal row
const FORM_ROW_HEIGHT = 52; // Height of form rows (slightly taller)
const SPLIT_FORM_ROW_HEIGHT = 120; // Height of split transaction form

interface TransactionsTableProps {
  ledger: Ledger;
  currentAccount: Account;
  selectedIds?: Set<string>;
  onToggleSelection?: (id: string) => void;
  onConvertTransactionToTransfer?: (transaction: Transaction, accountId: string) => void;
  onConvertTransferToTransaction?: (transfer: Transfer) => void;
  /** ID of transaction to automatically enter edit mode for (e.g., newly created) */
  autoEditTransactionId?: string | null;
  /** ID of transfer to automatically enter edit mode for (e.g., newly created) */
  autoEditTransferId?: string | null;
  /** Called when auto-edit is processed so parent can clear the ID */
  onAutoEditProcessed?: () => void;
  /** Called after saving a new transaction to enable rapid entry. Receives the date from the saved item. */
  onRequestNewTransaction?: (lastDate: Date) => void;
}

// Discriminated union type for row data
type TableRow = Transaction | Transfer | BalanceAssertion;

function isTransaction(tr: TableRow): tr is Transaction {
  return tr instanceof Transaction;
}

function isTransfer(tr: TableRow): tr is Transfer {
  return tr instanceof Transfer;
}

// function isBalanceAssertion(tr: TableRow): tr is BalanceAssertion {
//   return !isTransaction(tr) && !isTransfer(tr);
// }

const columnHelper = createColumnHelper<TableRow>();

export const TransactionsTable = observer(function TransactionsTable({
  currentAccount,
  ledger,
  selectedIds,
  onToggleSelection,
  onConvertTransactionToTransfer,
  onConvertTransferToTransaction,
  autoEditTransactionId,
  autoEditTransferId,
  onAutoEditProcessed,
  onRequestNewTransaction,
}: TransactionsTableProps) {
  // Expand/collapse state for split transactions
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  // Draft editing state - tracks which original is being edited and its draft
  const [editingState, setEditingState] = useState<
    | {
        type: "transaction";
        original: Transaction;
        draft: Transaction;
        isNew?: boolean;
      }
    | { type: "transfer"; original: Transfer; draft: Transfer; isNew?: boolean }
    | null
  >(null);

  // Auto-enter edit mode for newly created transactions/transfers
  React.useEffect(() => {
    if (autoEditTransactionId && !editingState) {
      const transaction = ledger.transactions.find((t) => t.id === autoEditTransactionId);
      if (transaction) {
        setEditingState({
          type: "transaction",
          original: transaction,
          draft: transaction.clone(),
          isNew: true, // Mark as new so we can delete on cancel
        });
        onAutoEditProcessed?.();
      }
    }
  }, [autoEditTransactionId, editingState, ledger.transactions, onAutoEditProcessed]);

  React.useEffect(() => {
    if (autoEditTransferId && !editingState) {
      const transfer = ledger.transfers.find((t) => t.id === autoEditTransferId);
      if (transfer) {
        setEditingState({
          type: "transfer",
          original: transfer,
          draft: transfer.clone(),
          isNew: true, // Mark as new so we can delete on cancel
        });
        onAutoEditProcessed?.();
      }
    }
  }, [autoEditTransferId, editingState, ledger.transfers, onAutoEditProcessed]);

  const handleToggleExpand = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  // Get and sort data - memoized for performance
  // MobX reactivity still works because observer() tracks observable access within the render
  // biome-ignore lint/correctness/useExhaustiveDependencies: Indirect dependencies
  const data = useMemo(
    () => sortBy(ledger.transactionsAndBalancesForAccount(currentAccount), "date").reverse(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ledger.transactions, ledger.transfers, ledger.balanceAssertions, currentAccount]
  );

  // Define columns - we'll use custom row rendering, so columns are mainly for structure
  const columns = useMemo(
    () => [
      columnHelper.display({
        id: "checkbox",
        header: () => null,
        cell: () => null,
      }),
      columnHelper.display({
        id: "date",
        header: () => <HeaderCell>Date</HeaderCell>,
        cell: () => null,
      }),
      columnHelper.display({
        id: "payee",
        header: () => <HeaderCell>Payee</HeaderCell>,
        cell: () => null,
      }),
      columnHelper.display({
        id: "budget",
        header: () => <HeaderCell>Budget</HeaderCell>,
        cell: () => null,
      }),
      columnHelper.display({
        id: "note",
        header: () => <HeaderCell>Note</HeaderCell>,
        cell: () => null,
      }),
      columnHelper.display({
        id: "out",
        header: () => <HeaderCell alignRight>Out</HeaderCell>,
        cell: () => null,
      }),
      columnHelper.display({
        id: "in",
        header: () => <HeaderCell alignRight>In</HeaderCell>,
        cell: () => null,
      }),
      columnHelper.display({
        id: "cleared",
        header: () => (
          <HeaderCell className="text-center">
            <CheckCheck width={20} className="inline-block" />
          </HeaderCell>
        ),
        cell: () => null,
      }),
    ],
    []
  );

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    // Prevent infinite loop - don't auto-reset state when data array reference changes
    autoResetAll: false,
  });

  const rows = table.getRowModel().rows;

  // Scroll container ref for virtualization
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Estimate row height based on editing state
  const estimateSize = useCallback(
    (index: number) => {
      const row = rows[index];
      if (!row) return ROW_HEIGHT;

      const rowData = row.original;

      // Check if this row is being edited
      if (isTransaction(rowData)) {
        if (editingState?.type === "transaction" && editingState.original === rowData) {
          return editingState.draft.isSplit ? SPLIT_FORM_ROW_HEIGHT : FORM_ROW_HEIGHT;
        }
        // Expanded split transactions are taller
        if (rowData.isSplit && expandedIds.has(rowData.id)) {
          return ROW_HEIGHT + rowData.postings.length * 32;
        }
      } else if (isTransfer(rowData)) {
        if (editingState?.type === "transfer" && editingState.original === rowData) {
          return FORM_ROW_HEIGHT;
        }
      }

      return ROW_HEIGHT;
    },
    [rows, editingState, expandedIds]
  );

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollContainerRef.current,
    estimateSize,
    overscan: 10, // Render 10 extra rows above/below viewport
  });

  // Render a single row based on its data type and editing state
  const renderRow = useCallback(
    (row: (typeof rows)[0]) => {
      const rowData = row.original;

      // Use existing row components for rendering
      if (isTransaction(rowData)) {
        // Check if this transaction is being edited
        if (editingState?.type === "transaction" && editingState.original === rowData) {
          const draft = editingState.draft;
          // Use SplitTransactionFormRow for split transactions, TransactionFormRow for regular
          if (draft.isSplit) {
            return (
              <SplitTransactionFormRow
                transaction={draft}
                key={row.id}
                onSave={() => {
                  // Copy draft back to original
                  rowData.copyFrom(draft);
                  // Update payee -> budget mapping
                  ledger.updatePayeeBudget(rowData);
                  const wasNew = editingState.isNew;
                  const savedDate = draft.date;
                  setEditingState(null);
                  // If this was a new transaction, create another for rapid entry
                  if (wasNew && savedDate) {
                    onRequestNewTransaction?.(savedDate);
                  }
                }}
                onCancel={() => {
                  // If this is a new transaction, delete it from the ledger
                  if (editingState.isNew) {
                    ledger.deleteTransaction(rowData);
                  }
                  // Discard draft
                  setEditingState(null);
                }}
                onConvertToTransfer={(accountId) => {
                  // Copy draft to original first, then convert
                  rowData.copyFrom(draft);
                  setEditingState(null);
                  onConvertTransactionToTransfer?.(rowData, accountId);
                }}
              />
            );
          } else {
            return (
              <TransactionFormRow
                transaction={draft}
                key={row.id}
                onSave={() => {
                  // Copy draft back to original
                  rowData.copyFrom(draft);
                  // Update payee -> budget mapping
                  ledger.updatePayeeBudget(rowData);
                  const wasNew = editingState.isNew;
                  const savedDate = draft.date;
                  setEditingState(null);
                  // If this was a new transaction, create another for rapid entry
                  if (wasNew && savedDate) {
                    onRequestNewTransaction?.(savedDate);
                  }
                }}
                onCancel={() => {
                  // If this is a new transaction, delete it from the ledger
                  if (editingState.isNew) {
                    ledger.deleteTransaction(rowData);
                  }
                  // Discard draft
                  setEditingState(null);
                }}
                onConvertToTransfer={(accountId) => {
                  // Copy draft to original first, then convert
                  rowData.copyFrom(draft);
                  setEditingState(null);
                  onConvertTransactionToTransfer?.(rowData, accountId);
                }}
              />
            );
          }
        }
        return (
          <TransactionRow
            transaction={rowData}
            key={row.id}
            onClick={() => {
              if (!editingState) {
                // Auto-collapse when entering edit mode
                setExpandedIds((prev) => {
                  const next = new Set(prev);
                  next.delete(rowData.id);
                  return next;
                });
                // Create draft
                setEditingState({
                  type: "transaction",
                  original: rowData,
                  draft: rowData.clone(),
                });
              }
            }}
            selectedIds={selectedIds}
            onToggleSelection={onToggleSelection}
            isExpanded={expandedIds.has(rowData.id)}
            onToggleExpand={handleToggleExpand}
          />
        );
      } else if (isTransfer(rowData)) {
        // Check if this transfer is being edited
        if (editingState?.type === "transfer" && editingState.original === rowData) {
          const draft = editingState.draft;
          return (
            <TransferFormRow
              transfer={draft}
              currentAccountId={currentAccount.id}
              key={row.id}
              onSave={() => {
                // Copy draft back to original
                rowData.copyFrom(draft);
                const wasNew = editingState.isNew;
                const savedDate = draft.date;
                setEditingState(null);
                // If this was a new transfer, create a new transaction for rapid entry
                if (wasNew && savedDate) {
                  onRequestNewTransaction?.(savedDate);
                }
              }}
              onCancel={() => {
                // If this is a new transfer, delete it from the ledger
                if (editingState.isNew) {
                  runInAction(() => {
                    // Remove transfer
                    const transferIndex = ledger.transfers.findIndex((t) => t.id === rowData.id);
                    if (transferIndex !== -1) {
                      ledger.transfers.splice(transferIndex, 1);
                    }
                  });
                }
                // Discard draft
                setEditingState(null);
              }}
              onConvertToTransaction={() => {
                // Copy draft to original first, then convert
                rowData.copyFrom(draft);
                setEditingState(null);
                onConvertTransferToTransaction?.(rowData);
              }}
            />
          );
        }
        return (
          <TransferRow
            transfer={rowData}
            isInbound={rowData.toAccount?.id === currentAccount.id}
            key={row.id}
            onClick={() => {
              if (!editingState) {
                // Create draft
                setEditingState({
                  type: "transfer",
                  original: rowData,
                  draft: rowData.clone(),
                });
              }
            }}
            selectedIds={selectedIds}
            onToggleSelection={onToggleSelection}
          />
        );
      } else {
        return <BalanceAssertionRow transaction={rowData} key={row.id} />;
      }
    },
    [
      editingState,
      expandedIds,
      selectedIds,
      ledger,
      currentAccount.id,
      onToggleSelection,
      onConvertTransactionToTransfer,
      onConvertTransferToTransaction,
      onRequestNewTransaction,
      handleToggleExpand,
    ]
  );

  return (
    <div ref={scrollContainerRef} className="h-full overflow-auto" style={{ contain: "strict" }}>
      {/* Header table */}
      <table className="table w-full table-fixed">
        <thead className="sticky top-0 bg-slate-50 z-10">
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => {
                const widthClass =
                  header.id === "checkbox"
                    ? "w-[64px]"
                    : header.id === "date"
                      ? "w-[110px]"
                      : header.id === "budget"
                        ? "w-[150px]"
                        : header.id === "out" || header.id === "in"
                          ? "w-[100px]"
                          : header.id === "cleared"
                            ? "w-[50px]"
                            : "";
                const headerClasses =
                  header.id === "checkbox"
                    ? `p-1 pl-8 ${widthClass}`
                    : header.id === "cleared"
                      ? `pr-2 ${widthClass}`
                      : `px-3 pr-2 ${widthClass}`;
                return (
                  <th key={header.id} className={twJoin("", headerClasses)}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                );
              })}
            </tr>
          ))}
        </thead>
      </table>

      {/* Virtualized body */}
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          position: "relative",
        }}
      >
        {virtualizer.getVirtualItems().map((virtualRow) => {
          const row = rows[virtualRow.index];
          return (
            <div
              key={row.id}
              data-index={virtualRow.index}
              ref={(node) => virtualizer.measureElement(node)}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              <table className="table w-full table-fixed">
                <tbody>{renderRow(row)}</tbody>
              </table>
            </div>
          );
        })}
      </div>
    </div>
  );
});
