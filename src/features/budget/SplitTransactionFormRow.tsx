import { ArrowDownToLine, Plus, X } from "lucide-react";
import { observer } from "mobx-react-lite";
import * as React from "react";
import { Combobox, type ComboboxGroup } from "@/components/Combobox";
import { DatePicker } from "@/components/DatePicker";
import { FormInput } from "@/components/FormInput";
import { FormActionButtons } from "@/components/Table";
import { useBudgetCreator } from "@/hooks/useBudgetCreator";
import { useBudgetGroups } from "@/hooks/useBudgetGroups";
import { usePayeeAccountGroups } from "@/hooks/usePayeeAccountGroups";
import { usePayeeCreator } from "@/hooks/usePayeeCreator";
import { useTransactionFormKeyboard } from "@/hooks/useTransactionFormKeyboard";
import { cn } from "@/lib/utils";
import type { Transaction, TransactionPosting } from "@/models/Transaction";
import { formatCurrencyInput, parseCurrencyInput } from "@/utils/formatting";
import { useLedger } from "@/utils/useLedger";

const rowClasses = "bg-amber-50/50 border-amber-200";

// Inner component for posting rows to manage local state
interface PostingRowProps {
  posting: TransactionPosting;
  transaction: Transaction;
  budgetGroups: ComboboxGroup<any>[];
  createBudget: (name: string) => Promise<any>;
  handleKeyDown: (e: React.KeyboardEvent) => void;
}

const PostingRow = observer(function PostingRow({
  posting,
  transaction,
  budgetGroups,
  createBudget,
  handleKeyDown,
}: PostingRowProps) {
  // State for amount inputs (text-based for better UX)
  const [outValue, setOutValue] = React.useState(() =>
    posting.amount < 0 ? formatCurrencyInput(Math.abs(posting.amount)) : ""
  );
  const [inValue, setInValue] = React.useState(() =>
    posting.amount > 0 ? formatCurrencyInput(posting.amount) : ""
  );

  return (
    <tr className={rowClasses}>
      {/* Empty cells for checkbox and date columns */}
      <td colSpan={2} className={rowClasses} />
      <td className={cn("py-1 pr-2", rowClasses)} onKeyDown={handleKeyDown}>
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
          onCreateNew={createBudget}
          placeholder="Category..."
          emptyText="No categories found."
        />
      </td>
      <td className={cn("py-1 pr-2", rowClasses)} onKeyDown={handleKeyDown}>
        <FormInput
          type="text"
          value={posting.note}
          onChange={(e) => {
            posting.note = e.target.value;
          }}
          placeholder="Note..."
        />
      </td>
      <td className={cn("py-1 pr-2", rowClasses)} onKeyDown={handleKeyDown}>
        <FormInput
          type="text"
          className="tabular-nums text-right"
          value={outValue}
          onChange={(e) => {
            setOutValue(e.target.value);
            if (e.target.value) {
              setInValue("");
            }
          }}
          onBlur={() => {
            const parsed = parseCurrencyInput(outValue);
            if (parsed > 0) {
              posting.setAmount(-parsed);
              setOutValue(formatCurrencyInput(parsed));
            } else if (!outValue) {
              // Field is empty
            } else {
              setOutValue("");
            }
          }}
          placeholder="0,00"
        />
      </td>
      <td className={cn("py-1 pr-2", rowClasses)} onKeyDown={handleKeyDown}>
        <FormInput
          type="text"
          className="tabular-nums text-right"
          value={inValue}
          onChange={(e) => {
            setInValue(e.target.value);
            if (e.target.value) {
              setOutValue("");
            }
          }}
          onBlur={() => {
            const parsed = parseCurrencyInput(inValue);
            if (parsed > 0) {
              posting.setAmount(parsed);
              setInValue(formatCurrencyInput(parsed));
            } else if (!inValue) {
              // Field is empty
            } else {
              setInValue("");
            }
          }}
          placeholder="0,00"
        />
      </td>
      <td
        className={cn("py-1 pr-2 text-center align-middle", rowClasses)}
        onKeyDown={handleKeyDown}
      >
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
  );
});

interface SplitTransactionFormRowProps {
  transaction: Transaction;
  onSave: () => void;
  onCancel: () => void;
  onConvertToTransfer?: (accountId: string) => void;
}

export const SplitTransactionFormRow = observer(function SplitTransactionFormRow({
  transaction,
  onSave,
  onCancel,
  onConvertToTransfer,
}: SplitTransactionFormRowProps) {
  const { ledger } = useLedger();

  // Refs for required fields
  const dateInputRef = React.useRef<HTMLInputElement>(null);
  const payeeComboboxRef = React.useRef<HTMLInputElement>(null);

  // Use keyboard handling hook
  const { handleKeyDown, handleCancel, handleSave } = useTransactionFormKeyboard({
    onSave,
    onCancel,
    validate: () => {
      // Check required fields: date, payee
      if (!transaction.date) {
        return dateInputRef.current;
      }
      if (!transaction.payee) {
        return payeeComboboxRef.current;
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

  // Group budgets by category (without split option - already in split mode)
  const budgetGroups = useBudgetGroups(ledger!);

  // Creators for inline creation
  const createPayee = usePayeeCreator(ledger!);
  const createBudget = useBudgetCreator(ledger!);

  return (
    <>
      {/* Header row with date and shared payee */}
      <tr className={cn(rowClasses, "border-t-2")}>
        <td className="p-1 pl-8 align-top pt-3" onKeyDown={handleKeyDown}>
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
        <td className="py-2 pr-2" onKeyDown={handleKeyDown}>
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
            onCreateNew={createPayee}
            placeholder="Select payee..."
            emptyText="No payees found."
          />
        </td>
        {/* Empty cells for budget, note, out, in */}
        <td colSpan={4} />
        <td className="pr-2 text-center align-top pt-2" onKeyDown={handleKeyDown}>
          <FormActionButtons onSave={handleSave} onCancel={handleCancel} />
        </td>
      </tr>

      {/* Posting rows */}
      {transaction.postings.map((posting) => (
        <PostingRow
          key={posting.id}
          posting={posting}
          transaction={transaction}
          budgetGroups={budgetGroups}
          createBudget={createBudget}
          handleKeyDown={handleKeyDown}
        />
      ))}

      {/* Add split button row */}
      <tr className={cn(rowClasses, "border-b-2")}>
        <td colSpan={8} className="py-1 pl-8 pr-2">
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
