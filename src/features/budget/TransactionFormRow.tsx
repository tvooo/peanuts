import { Transaction } from "@/models/Transaction";
import { formatDateIsoShort } from "@/utils/formatting";
import { useLedger } from "@/utils/useLedger";
import { Check } from "lucide-react";
import { observer } from "mobx-react-lite";
import { cn } from "@/lib/utils";
import * as React from "react";
import { Combobox } from "@/components/Combobox";
import { Payee } from "@/models/Payee";
import { runInAction } from "mobx";

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
          options={ledger!.payees.map(p => ({ id: p.id, label: p.name, payee: p }))}
          value={posting.payee ? { id: posting.payee.id, label: posting.payee.name, payee: posting.payee } : null}
          onValueChange={(option: any) => posting.setPayee(option.payee)}
          onCreateNew={(name) => {
            return new Promise<any>((resolve) => {
              runInAction(() => {
                const newPayee = new Payee({ ledger: ledger!, id: null });
                newPayee.name = name;
                ledger!.payees.push(newPayee);
                resolve({ id: newPayee.id, label: newPayee.name, payee: newPayee });
              });
            });
          }}
          placeholder="Select payee..."
          emptyText="No payees found."
        />
      </td>
      <td className="pr-2">
        <FormSelect
          value={posting.budget?.id}
          onChange={(e) => {
            const budget = ledger!.getBudgetByID(e.target.value);
            if (budget) {
              posting.setBudget(budget);
            }
          }}
        >
          {ledger!._budgets.map((budget) => (
            <option key={budget.id} value={budget.id}>
              {budget.name}
            </option>
          ))}
        </FormSelect>
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
        <div className="flex items-center justify-center gap-2">
          <button
            type="button"
            onClick={() => onDone()}
            className={cn(
              "inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-sm font-medium",
              "bg-primary text-primary-foreground shadow-sm",
              "hover:bg-primary/90 transition-colors",
              "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            )}
          >
            <Check className="h-4 w-4" />
            Done
          </button>
        </div>
      </td>
    </tr>
  );
});
