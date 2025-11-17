import { Combobox, ComboboxGroup } from "@/components/Combobox";
import { cn } from "@/lib/utils";
import { Budget } from "@/models/Budget";
import { Payee } from "@/models/Payee";
import { Transaction } from "@/models/Transaction";
import { formatDateIsoShort } from "@/utils/formatting";
import { useLedger } from "@/utils/useLedger";
import { ArrowDownToLine, Check, X } from "lucide-react";
import { runInAction } from "mobx";
import { observer } from "mobx-react-lite";
import * as React from "react";

// Form Input component with white background
const FormInput = React.forwardRef<
  HTMLInputElement,
  React.ComponentProps<"input">
>(({ className, ...props }, ref) => {
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
});
FormInput.displayName = "FormInput";

// Form Select component with white background
const FormSelect = React.forwardRef<
  HTMLSelectElement,
  React.ComponentProps<"select">
>(({ className, children, ...props }, ref) => {
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
});
FormSelect.displayName = "FormSelect";

interface TransactionFormRowProps {
  transaction: Transaction;
  onDone: () => void;
}

export const TransactionFormRow = observer(function TransactionFormRow({
  transaction,
  onDone,
}: TransactionFormRowProps) {
  const { ledger } = useLedger();
  const posting = transaction.postings[0]!;

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
        options: [{
          id: inflowBudget.id,
          label: "Inflow",
          budget: inflowBudget,
          icon: <ArrowDownToLine className="mr-1.5" size={14} />,
        }],
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
    <tr className="bg-amber-50/50 border-t-2 border-b-2 border-amber-200 group">
      <td className="p-1 pl-8 w-[64px] align-middle">
        <input type="checkbox" className="rounded" />
      </td>
      <td className="py-2 pr-2">
        <FormInput
          type="date"
          className="tabular-nums"
          value={transaction.date ? formatDateIsoShort(transaction.date) : ""}
          onChange={(e) => {
            transaction.date = new Date(e.target.value);
          }}
        />
      </td>

      <td className="pr-2">
        <Combobox
          options={ledger!.payees.map((p) => ({
            id: p.id,
            label: p.name,
            payee: p,
          }))}
          value={
            posting.payee
              ? {
                  id: posting.payee.id,
                  label: posting.payee.name,
                  payee: posting.payee,
                }
              : null
          }
          onValueChange={(option: any) => posting.setPayee(option.payee)}
          onCreateNew={(name) => {
            return new Promise<any>((resolve) => {
              runInAction(() => {
                const newPayee = new Payee({ ledger: ledger!, id: null });
                newPayee.name = name;
                ledger!.payees.push(newPayee);
                resolve({
                  id: newPayee.id,
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
          groups={budgetGroups}
          value={
            posting.budget
              ? {
                  id: posting.budget.id,
                  label: posting.budget.isToBeBudgeted ? "Inflow" : posting.budget.name,
                  budget: posting.budget,
                  icon: posting.budget.isToBeBudgeted ? <ArrowDownToLine className="mr-1.5" size={14} /> : undefined,
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
          placeholder="Select category..."
          emptyText="No categories found."
        />
      </td>
      <td className="pr-2">
        <FormInput
          type="text"
          value={posting.note}
          onChange={(e) => (posting.note = e.target.value)}
        />
      </td>
      <td className="pr-2">
        <FormInput
          type="number"
          className="tabular-nums text-right"
          value={transaction.amount}
          onChange={(e) => (posting.amount = parseInt(e.target.value, 10))}
        />
      </td>
      <td className="pr-2 text-center">
        <div className="flex items-center justify-center gap-1">
          <button
            type="button"
            onClick={() => onDone()}
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
            onClick={() => onDone()}
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
  );
});
