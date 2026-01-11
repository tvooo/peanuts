import { ArrowDownToLine, Check, Plus, X } from "lucide-react";
import { runInAction } from "mobx";
import { observer } from "mobx-react-lite";
import * as React from "react";
import { Combobox, type ComboboxGroup } from "@/components/Combobox";
import { useTransactionFormKeyboard } from "@/hooks/useTransactionFormKeyboard";
import { cn } from "@/lib/utils";
import { Budget } from "@/models/Budget";
import { Payee } from "@/models/Payee";
import type { Transaction } from "@/models/Transaction";
import { formatDateIsoShort } from "@/utils/formatting";
import { useLedger } from "@/utils/useLedger";

// Form Input component with white background
const FormInput = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, ...props }, ref) => {
    return (
      <input
        className={cn(
          "h-9 w-full rounded-md border border-input bg-white px-3 py-1",
          "text-sm shadow-sm transition-colors",
          "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
          "disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
FormInput.displayName = "FormInput";

interface SplitTransactionFormRowProps {
  transaction: Transaction;
  onDone: () => void;
  onConvertToTransfer?: (accountId: string) => void;
}

export const SplitTransactionFormRow = observer(function SplitTransactionFormRow({
  transaction,
  onDone,
  onConvertToTransfer,
}: SplitTransactionFormRowProps) {
  const { ledger } = useLedger();

  // Refs for required fields
  const dateInputRef = React.useRef<HTMLInputElement>(null);
  const payeeComboboxRef = React.useRef<HTMLInputElement>(null);

  // Use keyboard handling hook
  const { handleKeyDown, handleCancel, handleSave } = useTransactionFormKeyboard({
    onDone,
    getSnapshot: () => ({
      date: transaction.date,
      payee: transaction.payee,
      postings: transaction.postings.map((p) => ({
        id: p.id,
        budget: p.budget,
        note: p.note,
        amount: p.amount,
      })),
    }),
    restoreSnapshot: (snapshot) => {
      transaction.date = snapshot.date;
      transaction.payee = snapshot.payee;

      // Remove any postings that were added during editing
      const originalPostingIds = new Set(snapshot.postings.map((p) => p.id));
      const postingsToRemove = transaction.postings.filter((p) => !originalPostingIds.has(p.id));
      postingsToRemove.forEach((p) => {
        transaction.removePosting(p);
      });

      // Restore original posting values
      snapshot.postings.forEach((originalPosting) => {
        const posting = transaction.postings.find((p) => p.id === originalPosting.id);
        if (posting) {
          posting.budget = originalPosting.budget;
          posting.note = originalPosting.note;
          posting.amount = originalPosting.amount;
        }
      });
    },
    validate: () => {
      // Check required fields: date, payee
      if (!transaction.date) {
        return dateInputRef.current;
      }
      if (!transaction.payee) {
        return payeeComboboxRef.current;
      }
      // For split transactions, all postings must have budgets (checked by transaction.isValid)
      if (!transaction.isValid) {
        // Find first posting without a budget and focus it
        // We don't have refs for individual posting budgets, so just return null
        return null;
      }
      return null;
    },
  });

  // Create payee/account groups
  const payeeGroups = React.useMemo(() => {
    const groups: ComboboxGroup<any>[] = [];

    // Get non-tracking accounts that aren't the current transaction's account
    const otherAccounts = ledger!.accounts.filter(
      (acc) => !acc.archived && acc.id !== transaction.account?.id
    );

    // Add accounts group at the top
    if (otherAccounts.length > 0) {
      groups.push({
        label: "Transfer to/from",
        options: otherAccounts.map((acc) => ({
          id: `account-${acc.id}`,
          label: acc.name,
          account: acc,
        })),
      });
    }

    // Add payees group
    groups.push({
      label: "Payees",
      options: ledger!.payees.map((p) => ({
        id: `payee-${p.id}`,
        label: p.name,
        payee: p,
      })),
    });

    return groups;
  }, [ledger, transaction.account]);

  // Group budgets by category
  const budgetGroups = React.useMemo(() => {
    const groups: ComboboxGroup<any>[] = [];
    const categorizedBudgets = new Map<string, Budget[]>();
    const uncategorized: Budget[] = [];
    let inflowBudget: Budget | null = null;

    // Group budgets by their category, filtering out the inflow budget
    ledger!._budgets.forEach((budget) => {
      if (budget.isToBeBudgeted) {
        inflowBudget = budget;
        return;
      }

      if (budget.budgetCategory) {
        const categoryId = budget.budgetCategory.id;
        if (!categorizedBudgets.has(categoryId)) {
          categorizedBudgets.set(categoryId, []);
        }
        categorizedBudgets.get(categoryId)!.push(budget);
      } else {
        uncategorized.push(budget);
      }
    });

    // Add Inflow budget as first group (without a category header)
    if (inflowBudget) {
      groups.push({
        label: "",
        options: [
          {
            id: (inflowBudget as Budget).id,
            label: "Inflow",
            budget: inflowBudget,
            icon: <ArrowDownToLine className="mr-1.5" size={14} />,
          },
        ],
      });
    }

    // Create groups from categorized budgets
    ledger!.budgetCategories.forEach((category) => {
      const budgets = categorizedBudgets.get(category.id);
      if (budgets && budgets.length > 0) {
        groups.push({
          label: category.name,
          options: budgets.map((b) => ({
            id: b.id,
            label: b.name,
            budget: b,
          })),
        });
      }
    });

    // Add uncategorized group if there are any
    if (uncategorized.length > 0) {
      groups.push({
        label: "Uncategorized",
        options: uncategorized.map((b) => ({
          id: b.id,
          label: b.name,
          budget: b,
        })),
      });
    }

    return groups;
  }, [ledger]);

  return (
    <>
      {/* Header row with date and shared payee */}
      <tr className="bg-amber-50/50 border-t-2 border-amber-200" onKeyDown={handleKeyDown}>
        <td rowSpan={transaction.postings.length + 2} className="p-1 pl-8 w-[64px] align-top pt-3">
          <input type="checkbox" className="rounded" />
        </td>
        <td className="py-2 pr-2">
          <FormInput
            ref={dateInputRef}
            type="date"
            className="tabular-nums"
            value={transaction.date ? formatDateIsoShort(transaction.date) : ""}
            onChange={(e) => {
              transaction.date = new Date(e.target.value);
            }}
          />
        </td>
        <td className="py-2 pr-2">
          <div className="flex items-center gap-2">
            {/* <label className="text-sm font-medium w-16 shrink-0">Payee:</label> */}
            <Combobox
              ref={payeeComboboxRef}
              groups={payeeGroups}
              value={
                transaction.payee
                  ? {
                      id: `payee-${transaction.payee.id}`,
                      label: transaction.payee.name,
                      payee: transaction.payee,
                    }
                  : null
              }
              onValueChange={(option: any) => {
                // Check if an account was selected
                if (option.account) {
                  // Convert to transfer
                  onConvertToTransfer?.(option.account.id);
                } else if (option.payee) {
                  // Set payee
                  transaction.payee = option.payee;
                }
              }}
              onCreateNew={(name) => {
                return new Promise<any>((resolve) => {
                  runInAction(() => {
                    const newPayee = new Payee({ ledger: ledger!, id: null });
                    newPayee.name = name;
                    ledger!.payees.push(newPayee);
                    resolve({
                      id: `payee-${newPayee.id}`,
                      label: newPayee.name,
                      payee: newPayee,
                    });
                  });
                });
              }}
              placeholder="Select payee..."
              emptyText="No payees found."
            />
          </div>
        </td>
        <td colSpan={3}></td>
        <td className="pr-2 text-center align-top pt-2">
          <div className="flex items-center justify-center gap-1">
            <button
              type="button"
              onClick={handleCancel}
              className={cn(
                "inline-flex h-8 w-8 items-center gap-1.5 rounded-md px-0 justify-center text-sm font-medium",
                "bg-primary text-primary-foreground shadow-sm",
                "hover:bg-primary/90 transition-colors",
                "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              )}
            >
              <X className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={handleSave}
              className={cn(
                "inline-flex h-8 w-8 items-center gap-1.5 rounded-md px-0 justify-center text-sm font-medium",
                "bg-primary text-primary-foreground shadow-sm",
                "hover:bg-primary/90 transition-colors",
                "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              )}
            >
              <Check className="h-4 w-4" />
            </button>
          </div>
        </td>
      </tr>

      {/* Posting rows */}
      {transaction.postings.map((posting, _index) => (
        <tr key={posting.id} className="bg-amber-50/50 border-amber-200" onKeyDown={handleKeyDown}>
          {/* <td className="py-1 pr-2 pl-8 text-sm text-stone-600 align-middle w-[100px]">
            {index === 0 ? "Splits:" : ""}
          </td> */}
          <td colSpan={2} />
          <td className="py-1 pr-2">
            <Combobox
              groups={budgetGroups}
              value={
                posting.budget
                  ? {
                      id: posting.budget.id,
                      label: posting.budget.isToBeBudgeted ? "Inflow" : posting.budget.name,
                      budget: posting.budget,
                      icon: posting.budget.isToBeBudgeted ? (
                        <ArrowDownToLine className="mr-1.5" size={14} />
                      ) : undefined,
                    }
                  : null
              }
              onValueChange={(option: any) => posting.setBudget(option.budget)}
              onCreateNew={(name) => {
                return new Promise<any>((resolve) => {
                  runInAction(() => {
                    const newBudget = new Budget({ ledger: ledger!, id: null });
                    newBudget.name = name;
                    ledger!._budgets.push(newBudget);
                    resolve({
                      id: newBudget.id,
                      label: newBudget.name,
                      budget: newBudget,
                    });
                  });
                });
              }}
              placeholder="Category..."
              emptyText="No categories found."
            />
          </td>
          <td className="py-1 pr-2">
            <FormInput
              type="text"
              value={posting.note}
              onChange={(e) => {
                posting.note = e.target.value;
              }}
              placeholder="Note..."
            />
          </td>
          <td className="py-1 pr-2">
            <FormInput
              type="number"
              className="tabular-nums text-right"
              value={posting.amount}
              onChange={(e) => {
                posting.setAmount(parseInt(e.target.value, 10) || 0);
              }}
            />
          </td>
          <td className="py-1 pr-2 text-center align-middle">
            {transaction.postings.length > 1 && (
              <button
                type="button"
                onClick={() => transaction.removePosting(posting)}
                className="text-stone-400 hover:text-red-600 transition-colors"
                title="Remove split"
              >
                <X size={16} />
              </button>
            )}
          </td>
        </tr>
      ))}

      {/* Add split button row */}
      <tr className="bg-amber-50/50 border-b-2 border-amber-200">
        <td colSpan={2}> </td>
        <td colSpan={4} className="py-1 pl-2 pr-2">
          <button
            type="button"
            onClick={() => transaction.addPosting()}
            className="flex items-center gap-2 text-xs text-stone-600 hover:text-stone-900 transition-colors"
          >
            <Plus size={14} />
            Add Split
          </button>
        </td>
      </tr>
    </>
  );
});
