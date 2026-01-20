import { Check, X } from "lucide-react";
import { observer } from "mobx-react-lite";
import * as React from "react";
import { Combobox } from "@/components/Combobox";
import { DatePicker } from "@/components/DatePicker";
import { FormInput } from "@/components/FormInput";
import { usePayeeAccountGroups } from "@/hooks/usePayeeAccountGroups";
import { useTransactionFormKeyboard } from "@/hooks/useTransactionFormKeyboard";
import { cn } from "@/lib/utils";
import type { Transfer } from "@/models/Transfer";
import { formatCurrencyInput, parseCurrencyInput } from "@/utils/formatting";
import { useLedger } from "@/utils/useLedger";

interface TransferFormRowProps {
  transfer: Transfer;
  currentAccountId: string;
  onSave: () => void;
  onCancel: () => void;
  onConvertToTransaction?: () => void;
}

export const TransferFormRow = observer(function TransferFormRow({
  transfer,
  currentAccountId,
  onSave,
  onCancel,
  onConvertToTransaction,
}: TransferFormRowProps) {
  const { ledger } = useLedger();

  // Determine which account is the "other" account (not the current one)
  const isFromAccount = transfer.fromAccount?.id === currentAccountId;
  const otherAccount = isFromAccount ? transfer.toAccount : transfer.fromAccount;

  // Refs for required fields
  const dateInputRef = React.useRef<HTMLInputElement>(null);
  const accountComboboxRef = React.useRef<HTMLInputElement>(null);
  const outInputRef = React.useRef<HTMLInputElement>(null);
  const inInputRef = React.useRef<HTMLInputElement>(null);

  // State for amount inputs (text-based for better UX)
  // For transfers: Out = sending from current account, In = receiving to current account
  const [outValue, setOutValue] = React.useState(() =>
    isFromAccount && transfer.amount > 0 ? formatCurrencyInput(transfer.amount) : ""
  );
  const [inValue, setInValue] = React.useState(() =>
    !isFromAccount && transfer.amount > 0 ? formatCurrencyInput(transfer.amount) : ""
  );

  // Use keyboard handling hook
  const { handleKeyDown, handleCancel, handleSave } = useTransactionFormKeyboard({
    onSave,
    onCancel,
    validate: () => {
      // Check required fields: date, other account, amount
      if (!transfer.date) {
        return dateInputRef.current;
      }
      if (!otherAccount) {
        return accountComboboxRef.current;
      }
      // Sync amount from input fields before checking (Enter may fire before blur)
      if (outValue) {
        const parsed = parseCurrencyInput(outValue);
        if (parsed > 0) {
          transfer.amount = parsed;
          // If entering in Out, ensure current account is the fromAccount
          if (!isFromAccount && otherAccount) {
            const currentAccount = ledger!.accounts.find((a) => a.id === currentAccountId);
            transfer.fromAccount = currentAccount ?? null;
            transfer.toAccount = otherAccount;
          }
        }
      } else if (inValue) {
        const parsed = parseCurrencyInput(inValue);
        if (parsed > 0) {
          transfer.amount = parsed;
          // If entering in In, ensure current account is the toAccount
          if (isFromAccount && otherAccount) {
            const currentAccount = ledger!.accounts.find((a) => a.id === currentAccountId);
            transfer.toAccount = currentAccount ?? null;
            transfer.fromAccount = otherAccount;
          }
        }
      }
      if (transfer.amount === 0 || Number.isNaN(transfer.amount)) {
        return outInputRef.current;
      }
      return null;
    },
  });

  // Auto-focus date input when entering edit mode
  React.useEffect(() => {
    dateInputRef.current?.focus();
  }, []);

  // Create account/payee groups
  const accountPayeeGroups = usePayeeAccountGroups(ledger!, currentAccountId);

  return (
    <tr
      className="bg-amber-50/50 border-t-2 border-b-2 border-amber-200 group"
      onKeyDown={handleKeyDown}
    >
      <td className="p-1 pl-8 w-[64px] align-middle">
        <input type="checkbox" className="rounded" />
      </td>
      <td className="py-2 pr-2">
        <DatePicker
          ref={dateInputRef}
          className="tabular-nums"
          value={transfer.date}
          onChange={(date) => {
            transfer.date = date;
          }}
        />
      </td>

      <td className="pr-2">
        <Combobox
          ref={accountComboboxRef}
          groups={accountPayeeGroups}
          value={
            otherAccount
              ? {
                  id: `account-${otherAccount.id}`,
                  label: otherAccount.name,
                  account: otherAccount,
                }
              : null
          }
          onValueChange={(option: any) => {
            // Check if an account was selected
            if (option.account) {
              // Update the transfer's to/from account
              if (isFromAccount) {
                transfer.toAccount = option.account;
              } else {
                transfer.fromAccount = option.account;
              }
            } else if (option.payee) {
              // Convert to transaction
              onConvertToTransaction?.();
            }
          }}
          placeholder="Select account..."
          emptyText="No accounts found."
        />
      </td>
      <td className="pr-2">
        <div className="h-9 px-3 py-1 text-sm text-muted-foreground italic flex items-center">
          Transfer
        </div>
      </td>
      <td className="pr-2">
        <FormInput
          type="text"
          value={transfer.note}
          onChange={(e) => {
            transfer.note = e.target.value;
          }}
        />
      </td>
      <td className="pr-2">
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
              transfer.amount = parsed;
              // If entering in Out, ensure current account is the fromAccount
              if (!isFromAccount && otherAccount) {
                // Swap the accounts
                const currentAccount = ledger!.accounts.find((a) => a.id === currentAccountId);
                transfer.fromAccount = currentAccount ?? null;
                transfer.toAccount = otherAccount;
              }
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
      <td className="pr-2">
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
              transfer.amount = parsed;
              // If entering in In, ensure current account is the toAccount
              if (isFromAccount && otherAccount) {
                // Swap the accounts
                const currentAccount = ledger!.accounts.find((a) => a.id === currentAccountId);
                transfer.toAccount = currentAccount ?? null;
                transfer.fromAccount = otherAccount;
              }
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
  );
});
