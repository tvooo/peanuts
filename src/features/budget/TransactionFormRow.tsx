import { ArrowDownToLine, Check, Split, X } from "lucide-react";
import { runInAction } from "mobx";
import { observer } from "mobx-react-lite";
import * as React from "react";
import { Combobox, type ComboboxGroup } from "@/components/Combobox";
import { DatePicker } from "@/components/DatePicker";
import { useTransactionFormKeyboard } from "@/hooks/useTransactionFormKeyboard";
import { cn } from "@/lib/utils";
import { Budget } from "@/models/Budget";
import { Payee } from "@/models/Payee";
import type { Transaction } from "@/models/Transaction";
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

// Form Select component with white background
const FormSelect = React.forwardRef<HTMLSelectElement, React.ComponentProps<"select">>(
  ({ className, children, ...props }, ref) => {
    return (
      <select
        className={cn(
          "h-9 w-full rounded-md border border-input bg-white px-3 py-1",
          "text-sm shadow-sm transition-colors",
          "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
          "disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        {...props}
      >
        {children}
      </select>
    );
  }
);
FormSelect.displayName = "FormSelect";

interface TransactionFormRowProps {
  transaction: Transaction;
  onSave: () => void;
  onCancel: () => void;
  onConvertToTransfer?: (accountId: string) => void;
}

export const TransactionFormRow = observer(function TransactionFormRow({
  transaction,
  onSave,
  onCancel,
  onConvertToTransfer,
}: TransactionFormRowProps) {
  const { ledger } = useLedger();
  const posting = transaction.postings[0]!;

  // Refs for required fields
  const dateInputRef = React.useRef<HTMLInputElement>(null);
  const payeeComboboxRef = React.useRef<HTMLInputElement>(null);
  const budgetComboboxRef = React.useRef<HTMLInputElement>(null);
  const amountInputRef = React.useRef<HTMLInputElement>(null);

  // Use keyboard handling hook
  const { handleKeyDown, handleCancel, handleSave } = useTransactionFormKeyboard({
    onSave,
    onCancel,
    validate: () => {
      // Check required fields: date, payee, budget, amount
      if (!transaction.date) {
        return dateInputRef.current;
      }
      if (!transaction.payee) {
        return payeeComboboxRef.current;
      }
      if (!posting.budget) {
        return budgetComboboxRef.current;
      }
      if (posting.amount === 0 || Number.isNaN(posting.amount)) {
        return amountInputRef.current;
      }
      return null;
    },
  });

  // Auto-focus date input when entering edit mode
  React.useEffect(() => {
    dateInputRef.current?.focus();
  }, []);

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
          {
            label: "Split transaction",
            id: "split",
            budget: null,
            icon: <Split className="mr-1.5" size={14} />,
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
      <tr
        className="bg-amber-50/50 border-t-2 border-b-2 border-amber-200 group"
        onKeyDown={handleKeyDown}
      >
        <td className="p-1 pl-8 w-16 align-middle">
          <input type="checkbox" className="rounded" />
        </td>
        <td className="py-2 pr-2">
          <DatePicker
            ref={dateInputRef}
            className="tabular-nums"
            value={transaction.date}
            onChange={(date) => {
              transaction.date = date;
            }}
          />
        </td>

        <td className="pr-2">
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
        </td>
        <td className="pr-2">
          <Combobox
            ref={budgetComboboxRef}
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
            onValueChange={(option: any) => {
              if (option.id === "split") {
                // Do nothing for split option
                transaction.addPosting();
                return;
              }
              posting.setBudget(option.budget);
            }}
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
            placeholder="Select category..."
            emptyText="No categories found."
          />
        </td>
        <td className="pr-2">
          <FormInput
            type="text"
            value={posting.note}
            onChange={(e) => {
              posting.note = e.target.value;
            }}
          />
        </td>
        <td className="pr-2">
          <FormInput
            ref={amountInputRef}
            type="number"
            className="tabular-nums text-right"
            value={transaction.amount}
            onChange={(e) => {
              posting.amount = parseInt(e.target.value, 10);
            }}
          />
        </td>
        <td className="pr-2 text-center">
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
      {/* Split button row */}
      <tr className="bg-amber-50/50 border-b-2 border-amber-200">
        <td colSpan={7} className="py-1 pl-8 pr-2">
          <button
            type="button"
            onClick={() => transaction.addPosting()}
            className="flex items-center gap-2 text-xs text-stone-600 hover:text-stone-900 transition-colors"
          >
            <Split size={14} />
            Split Transaction
          </button>
        </td>
      </tr>
    </>
  );
});
