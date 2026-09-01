import { ArrowDownToLine, ArrowLeftRight } from "lucide-react";
import { runInAction } from "mobx";
import { observer } from "mobx-react-lite";
import { useEffect, useState } from "react";
import { Combobox } from "@/components/Combobox";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useBudgetCreator } from "@/hooks/useBudgetCreator";
import { type BudgetOption, useBudgetGroups } from "@/hooks/useBudgetGroups";
import { type PayeeAccountOption, usePayeeAccountGroups } from "@/hooks/usePayeeAccountGroups";
import { usePayeeCreator } from "@/hooks/usePayeeCreator";
import type { Account } from "@/models/Account";
import type { Budget } from "@/models/Budget";
import type { Ledger } from "@/models/Ledger";
import { Payee } from "@/models/Payee";
import { Transaction, TransactionPosting } from "@/models/Transaction";
import { Transfer } from "@/models/Transfer";
import { formatCurrency, formatDate } from "@/utils/formatting";
import {
  type DuplicateMatch,
  findDuplicate,
  isAlreadyImported,
  normalizePayeeName,
  resolvePayee,
  suggestBudget,
} from "@/utils/import/matching";
import { FORMAT_LABELS, type ParsedStatement, type StatementRow } from "@/utils/import/types";
import { useLedger } from "@/utils/useLedger";

interface ReviewRow {
  row: StatementRow;
  include: boolean;
  /** Target of the row: either a payee, or another account (making it a transfer) */
  payee: Payee | null;
  transferAccount: Account | null;
  budget: Budget | null;
  duplicate: DuplicateMatch | null;
}

interface ImportStatementModalProps {
  account: Account;
  statement: ParsedStatement | null;
  fileName: string;
  onClose: () => void;
}

/**
 * Turn an all-caps/all-lowercase bank counterparty name into something
 * presentable as a payee name. Mixed-case names pass through untouched.
 */
export function cleanPayeeName(rawName: string): string {
  const trimmed = rawName.replace(/\s+/g, " ").trim();
  if (trimmed !== trimmed.toLowerCase() && trimmed !== trimmed.toUpperCase()) {
    return trimmed;
  }
  return trimmed.toLowerCase().replace(/(^|[\s\-.&/])\p{L}/gu, (c) => c.toUpperCase());
}

/** The row's target as a combobox value: an account (transfer) or a payee. */
function payeeCellValue(reviewRow: ReviewRow): PayeeAccountOption | null {
  if (reviewRow.transferAccount) {
    return {
      id: `account-${reviewRow.transferAccount.id}`,
      label: reviewRow.transferAccount.name,
      account: reviewRow.transferAccount,
    };
  }
  if (reviewRow.payee) {
    return {
      id: `payee-${reviewRow.payee.id}`,
      label: reviewRow.payee.name,
      payee: reviewRow.payee,
    };
  }
  return null;
}

function buildReviewRows(ledger: Ledger, account: Account, statement: ParsedStatement) {
  const claimed = new Set<string>();
  return statement.rows.map((row): ReviewRow => {
    const duplicate = findDuplicate(ledger, account, row, claimed);
    if (duplicate?.kind === "manual") {
      claimed.add(duplicate.transaction.id);
    } else if (duplicate?.kind === "manual-transfer") {
      claimed.add(duplicate.transfer.id);
    }
    const match = resolvePayee(ledger, row.rawPayee);
    const payee = match?.payee ?? null;
    // No history for the payee? Money coming in is almost always Inflow.
    const budget =
      suggestBudget(ledger, payee) ?? (row.amount > 0 ? (ledger.getInflowBudget() ?? null) : null);
    return {
      row,
      include: !isAlreadyImported(duplicate),
      payee,
      transferAccount: null,
      budget,
      duplicate,
    };
  });
}

export const ImportStatementModal = observer(function ImportStatementModal({
  account,
  statement,
  fileName,
  onClose,
}: ImportStatementModalProps) {
  const { ledger } = useLedger();
  const [rows, setRows] = useState<ReviewRow[]>([]);

  useEffect(() => {
    if (ledger && statement) {
      setRows(buildReviewRows(ledger, account, statement));
    } else {
      setRows([]);
    }
  }, [ledger, account, statement]);

  const budgetGroups = useBudgetGroups(ledger, { includeNoneOption: true });
  const payeeGroups = usePayeeAccountGroups(ledger!, account.id);
  const createPayee = usePayeeCreator(ledger!);
  const createBudget = useBudgetCreator(ledger!);

  const updateRow = (index: number, patch: Partial<ReviewRow>) => {
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  };

  if (!ledger || !statement) return null;

  const included = rows.filter((r) => r.include);
  const newCount = included.filter((r) => r.duplicate === null).length;
  const transferCount = included.filter((r) => r.duplicate === null && r.transferAccount).length;
  const matchedCount = included.filter(
    (r) => r.duplicate?.kind === "manual" || r.duplicate?.kind === "manual-transfer"
  ).length;
  const skippedCount = rows.length - included.length;
  const newPayeeCount = new Set(
    included
      .filter((r) => r.duplicate === null && !r.payee && !r.transferAccount && r.row.rawPayee)
      .map((r) => normalizePayeeName(r.row.rawPayee))
  ).size;

  const handleImport = () => {
    runInAction(() => {
      // Payees auto-created during this import, keyed by normalized raw name
      const createdPayees = new Map<string, Payee>();

      for (const reviewRow of rows) {
        if (!reviewRow.include) continue;
        const { row } = reviewRow;

        if (isAlreadyImported(reviewRow.duplicate)) continue;

        if (reviewRow.duplicate?.kind === "manual") {
          // Link the statement row to the manually entered transaction
          // instead of creating a second one.
          const existing = reviewRow.duplicate.transaction;
          existing.importId = row.importId;
          existing.importPayee = row.rawPayee || null;
          existing.status = "cleared";
          continue;
        }

        if (reviewRow.duplicate?.kind === "manual-transfer") {
          // Same, for a transfer entered by hand: only this account's side of
          // it is on this statement.
          reviewRow.duplicate.transfer.markImported(account, row.importId);
          continue;
        }

        if (reviewRow.transferAccount) {
          const transfer = new Transfer({ ledger, id: null });
          transfer.date = row.date;
          transfer.amount = Math.abs(row.amount);
          transfer.note = row.memo;
          if (row.amount < 0) {
            transfer.fromAccount = account;
            transfer.toAccount = reviewRow.transferAccount;
          } else {
            transfer.fromAccount = reviewRow.transferAccount;
            transfer.toAccount = account;
          }
          // Only cross-type transfers move money in or out of the budget
          if (transfer.isCrossType) {
            transfer.budget = reviewRow.budget;
          }
          ledger.transfers.push(transfer);
          transfer.markImported(account, row.importId);
          continue;
        }

        let payee = reviewRow.payee;
        if (!payee && row.rawPayee) {
          const key = normalizePayeeName(row.rawPayee);
          payee = createdPayees.get(key) ?? null;
          if (!payee) {
            payee = new Payee({ ledger, id: null });
            payee.name = cleanPayeeName(row.rawPayee);
            ledger.payees.push(payee);
            createdPayees.set(key, payee);
          }
        }
        // Remember the raw bank name so the next import matches directly
        if (
          payee &&
          row.rawPayee &&
          normalizePayeeName(payee.name) !== normalizePayeeName(row.rawPayee)
        ) {
          payee.addImportName(row.rawPayee);
        }

        const posting = new TransactionPosting({ ledger, id: null });
        posting.amount = row.amount;
        posting.note = row.memo;
        posting.budget = reviewRow.budget;
        ledger.transactionPostings.push(posting);

        const transaction = new Transaction({ ledger, id: null });
        transaction.account = account;
        transaction.date = row.date;
        transaction.payee = payee;
        transaction.status = "cleared";
        transaction.importId = row.importId;
        transaction.importPayee = row.rawPayee || null;
        transaction.postings.push(posting);
        ledger.transactions.push(transaction);
        ledger.updatePayeeBudget(transaction);
      }
      ledger.incrementVersion();
    });
    onClose();
  };

  return (
    <Dialog open={!!statement} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-6xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Import transactions</DialogTitle>
          <DialogDescription>
            {fileName} · {FORMAT_LABELS[statement.format]} · {statement.rows.length} transactions
            into {account.name}
            {statement.accountIban ? ` (${statement.accountIban})` : ""}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto min-h-0 -mx-6 px-6">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-white z-10">
              <tr className="text-left text-muted-foreground border-b">
                <th className="py-2 pr-2 font-medium w-8">
                  <input
                    type="checkbox"
                    className="rounded"
                    checked={included.length === rows.length && rows.length > 0}
                    onChange={(e) =>
                      setRows((prev) =>
                        prev.map((r) => ({
                          ...r,
                          include: r.duplicate?.kind === "imported" ? false : e.target.checked,
                        }))
                      )
                    }
                  />
                </th>
                <th className="py-2 pr-4 font-medium w-24">Date</th>
                <th className="py-2 pr-4 font-medium">Statement</th>
                <th className="py-2 pr-4 font-medium w-48">Payee</th>
                <th className="py-2 pr-4 font-medium w-48">Category</th>
                <th className="py-2 pr-2 font-medium text-right w-28">Amount</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((reviewRow, index) => {
                const { row, duplicate } = reviewRow;
                const alreadyImported = isAlreadyImported(duplicate);
                const dimmed = alreadyImported || !reviewRow.include;
                const matchedManually =
                  duplicate?.kind === "manual" || duplicate?.kind === "manual-transfer";
                // Same-type transfers never carry a category
                const needsCategory =
                  !reviewRow.transferAccount || reviewRow.transferAccount.type !== account.type;
                return (
                  <tr
                    key={row.importId}
                    className={`border-b align-top ${dimmed ? "opacity-50" : ""}`}
                  >
                    <td className="py-2 pr-2">
                      <input
                        type="checkbox"
                        className="rounded"
                        checked={reviewRow.include}
                        disabled={alreadyImported}
                        onChange={(e) => updateRow(index, { include: e.target.checked })}
                      />
                    </td>
                    <td className="py-2 pr-4 whitespace-nowrap tabular-nums">
                      {formatDate(row.date)}
                    </td>
                    <td className="py-2 pr-4">
                      <div className="font-medium">{row.rawPayee || "—"}</div>
                      {row.memo && (
                        <div
                          className="text-xs text-muted-foreground line-clamp-2"
                          title={row.memo}
                        >
                          {row.memo}
                        </div>
                      )}
                      {alreadyImported && (
                        <span className="inline-block mt-1 px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 text-xs font-medium">
                          Already imported
                          {duplicate?.kind === "imported-transfer" && " as a transfer"}
                        </span>
                      )}
                      {matchedManually && (
                        <span className="inline-block mt-1 px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 text-xs font-medium">
                          Matches existing{" "}
                          {duplicate?.kind === "manual-transfer" ? "transfer" : "entry"} — will be
                          marked cleared
                        </span>
                      )}
                    </td>
                    <td className="py-2 pr-4">
                      {duplicate === null && (
                        <Combobox
                          groups={payeeGroups}
                          value={payeeCellValue(reviewRow)}
                          onValueChange={(option: PayeeAccountOption) => {
                            if (option.account) {
                              // Turn the row into a transfer to/from that account
                              updateRow(index, {
                                transferAccount: option.account,
                                payee: null,
                                budget:
                                  option.account.type === account.type ? null : reviewRow.budget,
                              });
                            } else if (option.payee) {
                              updateRow(index, {
                                payee: option.payee,
                                transferAccount: null,
                                // Refresh the category suggestion unless already set
                                budget: reviewRow.budget ?? suggestBudget(ledger, option.payee),
                              });
                            }
                          }}
                          onCreateNew={createPayee}
                          placeholder={
                            row.rawPayee ? `Create "${cleanPayeeName(row.rawPayee)}"` : "No payee"
                          }
                          emptyText="No payees found."
                        />
                      )}
                    </td>
                    <td className="py-2 pr-4">
                      {duplicate === null && !needsCategory && (
                        <div className="flex items-center gap-1.5 h-9 text-muted-foreground italic">
                          <ArrowLeftRight size={12} />
                          Transfer
                        </div>
                      )}
                      {duplicate === null && needsCategory && (
                        <Combobox
                          groups={budgetGroups}
                          value={
                            reviewRow.budget
                              ? {
                                  id: reviewRow.budget.id,
                                  label: reviewRow.budget.isToBeBudgeted
                                    ? "Inflow"
                                    : reviewRow.budget.name,
                                  budget: reviewRow.budget,
                                  icon: reviewRow.budget.isToBeBudgeted ? (
                                    <ArrowDownToLine className="mr-1.5" size={14} />
                                  ) : undefined,
                                }
                              : null
                          }
                          onValueChange={(option: BudgetOption) =>
                            updateRow(index, { budget: option.budget })
                          }
                          onCreateNew={createBudget}
                          placeholder="No category"
                          emptyText="No categories found."
                        />
                      )}
                    </td>
                    <td
                      className={`py-2 pr-2 text-right whitespace-nowrap font-mono tabular-nums ${
                        row.amount >= 0 ? "text-green-700" : ""
                      }`}
                    >
                      {formatCurrency(row.amount)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <DialogFooter className="flex items-center !justify-between border-t pt-4">
          <div className="text-sm text-muted-foreground">
            {newCount} new
            {transferCount > 0 && <> ({transferCount} as transfers)</>}
            {matchedCount > 0 && <> · {matchedCount} matched to existing entries</>}
            {skippedCount > 0 && <> · {skippedCount} skipped</>}
            {newPayeeCount > 0 && <> · {newPayeeCount} new payees will be created</>}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleImport} disabled={included.length === 0}>
              Import {included.length} transaction{included.length === 1 ? "" : "s"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
});
