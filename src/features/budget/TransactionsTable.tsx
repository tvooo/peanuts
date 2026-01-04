import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { sortBy } from "lodash";
import { CheckCheck } from "lucide-react";
import { observer } from "mobx-react-lite";
import { useMemo, useState } from "react";
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

interface TransactionsTableProps {
  ledger: Ledger;
  currentAccount: Account;
  editingTransaction?: Transaction;
  setEditingTransaction: (transaction: Transaction | null) => void;
  editingTransfer?: Transfer;
  setEditingTransfer: (transfer: Transfer | null) => void;
  selectedIds?: Set<string>;
  onToggleSelection?: (id: string) => void;
  onConvertTransactionToTransfer?: (transaction: Transaction, accountId: string) => void;
  onConvertTransferToTransaction?: (transfer: Transfer) => void;
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
  editingTransaction,
  setEditingTransaction,
  editingTransfer,
  setEditingTransfer,
  selectedIds,
  onToggleSelection,
  onConvertTransactionToTransfer,
  onConvertTransferToTransaction,
}: TransactionsTableProps) {
  // Expand/collapse state for split transactions
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const handleToggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Get and sort data - no useMemo to allow MobX reactivity
  const data = sortBy(ledger.transactionsAndBalancesForAccount(currentAccount), "date").reverse();

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
        id: "amount",
        header: () => <HeaderCell alignRight>Amount</HeaderCell>,
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

  return (
    <table className="table w-full">
      <thead className="sticky top-0 bg-slate-50 z-10 ">
        {table.getHeaderGroups().map((headerGroup) => (
          <tr key={headerGroup.id}>
            {headerGroup.headers.map((header) => {
              const headerClasses =
                header.id === "checkbox"
                  ? "p-1 pl-8 w-[64px]"
                  : header.id === "cleared"
                    ? "pr-2"
                    : "px-3 pr-2";
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
      <tbody>
        {table.getRowModel().rows.map((row) => {
          const rowData = row.original;

          // Use existing row components for rendering
          if (isTransaction(rowData)) {
            if (rowData === editingTransaction) {
              // Use SplitTransactionFormRow for split transactions, TransactionFormRow for regular
              if (rowData.isSplit) {
                return (
                  <SplitTransactionFormRow
                    transaction={rowData}
                    key={row.id}
                    onDone={() => setEditingTransaction(null)}
                    onConvertToTransfer={(accountId) =>
                      onConvertTransactionToTransfer?.(rowData, accountId)
                    }
                  />
                );
              } else {
                return (
                  <TransactionFormRow
                    transaction={rowData}
                    key={row.id}
                    onDone={() => setEditingTransaction(null)}
                    onConvertToTransfer={(accountId) =>
                      onConvertTransactionToTransfer?.(rowData, accountId)
                    }
                  />
                );
              }
            }
            return (
              <TransactionRow
                transaction={rowData}
                key={row.id}
                onClick={() => {
                  if (!editingTransaction && !editingTransfer) {
                    // Auto-collapse when entering edit mode
                    setExpandedIds((prev) => {
                      const next = new Set(prev);
                      next.delete(rowData.id);
                      return next;
                    });
                    setEditingTransaction(rowData);
                  }
                }}
                selectedIds={selectedIds}
                onToggleSelection={onToggleSelection}
                isExpanded={expandedIds.has(rowData.id)}
                onToggleExpand={handleToggleExpand}
              />
            );
          } else if (isTransfer(rowData)) {
            if (rowData === editingTransfer) {
              return (
                <TransferFormRow
                  transfer={rowData}
                  currentAccountId={currentAccount.id}
                  key={row.id}
                  onDone={() => setEditingTransfer(null)}
                  onConvertToTransaction={() => onConvertTransferToTransaction?.(rowData)}
                />
              );
            }
            return (
              <TransferRow
                transfer={rowData}
                isInbound={rowData.toAccount?.id === currentAccount.id}
                key={row.id}
                onClick={() => {
                  if (!editingTransaction && !editingTransfer) {
                    setEditingTransfer(rowData);
                  }
                }}
                selectedIds={selectedIds}
                onToggleSelection={onToggleSelection}
              />
            );
          } else {
            return <BalanceAssertionRow transaction={rowData} key={row.id} />;
          }
        })}
      </tbody>
    </table>
  );
});
