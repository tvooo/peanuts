import { ArrowDownToLine, Split } from "lucide-react";
import { observer } from "mobx-react-lite";
import * as React from "react";
import { Combobox } from "@/components/Combobox";
import { DatePicker } from "@/components/DatePicker";
import { FormInput } from "@/components/FormInput";
import { FormActionButtons } from "@/components/Table";
import { useBudgetCreator } from "@/hooks/useBudgetCreator";
import { useBudgetGroups } from "@/hooks/useBudgetGroups";
import { usePayeeAccountGroups } from "@/hooks/usePayeeAccountGroups";
import { usePayeeCreator } from "@/hooks/usePayeeCreator";
import { useTransactionFormKeyboard } from "@/hooks/useTransactionFormKeyboard";
import type { Transaction } from "@/models/Transaction";
import { formatCurrencyInput, parseCurrencyInput } from "@/utils/formatting";
import { useLedger } from "@/utils/useLedger";

interface TransactionFormRowProps {
  transaction: Transaction;
  onSave: () => void;
  onCancel: () => void;
  onConvertToTransfer?: (accountId: string) => void;
}

const rowClasses = "bg-amber-50/50 border-t-2 border-b-2 border-amber-200";

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
  const outInputRef = React.useRef<HTMLInputElement>(null);
  const inInputRef = React.useRef<HTMLInputElement>(null);

  // State for amount inputs (text-based for better UX)
  const [outValue, setOutValue] = React.useState(() =>
    posting.amount < 0 ? formatCurrencyInput(Math.abs(posting.amount)) : ""
  );
  const [inValue, setInValue] = React.useState(() =>
    posting.amount > 0 ? formatCurrencyInput(posting.amount) : ""
  );

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
      // Sync amount from input fields before checking (Enter may fire before blur)
      if (outValue) {
        const parsed = parseCurrencyInput(outValue);
        if (parsed > 0) {
          posting.amount = -parsed;
        }
      } else if (inValue) {
        const parsed = parseCurrencyInput(inValue);
        if (parsed > 0) {
          posting.amount = parsed;
        }
      }
      if (posting.amount === 0 || Number.isNaN(posting.amount)) {
        return outInputRef.current;
      }
      return null;
    },
  });

  // Auto-focus date input when entering edit mode
  React.useEffect(() => {
    dateInputRef.current?.focus();
  }, []);

  // Create payee/account groups
  const payeeGroups = usePayeeAccountGroups(ledger!, transaction.account?.id);

  // Group budgets by category (with split option)
  const budgetGroups = useBudgetGroups(ledger!, {
    includeSplitOption: true,
    includeNoneOption: true,
  });

  // Creators for inline creation
  const createPayee = usePayeeCreator(ledger!);
  const createBudget = useBudgetCreator(ledger!);

  return (
    <>
      {/* Main form row */}
      <tr className={rowClasses}>
        <td className="p-1 pl-8 align-middle" onKeyDown={handleKeyDown}>
          <input type="checkbox" className="rounded" />
        </td>
        <td className="py-2 pr-2" onKeyDown={handleKeyDown}>
          <DatePicker
            ref={dateInputRef}
            className="tabular-nums"
            value={transaction.date}
            onChange={(date) => {
              transaction.date = date;
            }}
          />
        </td>
        <td className="pr-2" onKeyDown={handleKeyDown}>
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
                // Pre-fill the category with the last one used for this payee,
                // so the user can tab straight through without picking it again.
                if (!posting.budget) {
                  const lastBudget = ledger?.getLastBudgetForPayee(option.payee.id);
                  if (lastBudget) {
                    posting.setBudget(lastBudget);
                  }
                }
              }
            }}
            onCreateNew={createPayee}
            placeholder="Select payee..."
            emptyText="No payees found."
          />
        </td>
        <td className="pr-2" onKeyDown={handleKeyDown}>
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
            onCreateNew={createBudget}
            placeholder="Select category..."
            emptyText="No categories found."
          />
        </td>
        <td className="pr-2" onKeyDown={handleKeyDown}>
          <FormInput
            type="text"
            value={posting.note}
            onChange={(e) => {
              posting.note = e.target.value;
            }}
          />
        </td>
        <td className="pr-2" onKeyDown={handleKeyDown}>
          <FormInput
            ref={outInputRef}
            type="text"
            className="tabular-nums text-right"
            value={outValue}
            onChange={(e) => {
              setOutValue(e.target.value);
              // Clear the other field when typing here
              if (e.target.value) {
                setInValue("");
              }
            }}
            onBlur={() => {
              const parsed = parseCurrencyInput(outValue);
              if (parsed > 0) {
                posting.amount = -parsed;
                setOutValue(formatCurrencyInput(parsed));
              } else if (!outValue) {
                // Field is empty, don't change anything
              } else {
                setOutValue("");
              }
            }}
            placeholder="0,00"
          />
        </td>
        <td className="pr-2" onKeyDown={handleKeyDown}>
          <FormInput
            ref={inInputRef}
            type="text"
            className="tabular-nums text-right"
            value={inValue}
            onChange={(e) => {
              setInValue(e.target.value);
              // Clear the other field when typing here
              if (e.target.value) {
                setOutValue("");
              }
            }}
            onBlur={() => {
              const parsed = parseCurrencyInput(inValue);
              if (parsed > 0) {
                posting.amount = parsed;
                setInValue(formatCurrencyInput(parsed));
              } else if (!inValue) {
                // Field is empty, don't change anything
              } else {
                setInValue("");
              }
            }}
            placeholder="0,00"
          />
        </td>
        <td className="pr-2 text-center" onKeyDown={handleKeyDown}>
          <FormActionButtons onSave={handleSave} onCancel={handleCancel} />
        </td>
      </tr>

      {/* Split button row - spans all columns */}
      <tr className="bg-amber-50/50 border-b-2 border-amber-200">
        <td colSpan={8} className="py-1 pl-8 pr-2">
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
