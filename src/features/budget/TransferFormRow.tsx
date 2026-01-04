import { Check, X } from "lucide-react";
import { observer } from "mobx-react-lite";
import * as React from "react";
import { Combobox, type ComboboxGroup } from "@/components/Combobox";
import { cn } from "@/lib/utils";
import type { Transfer } from "@/models/Transfer";
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

interface TransferFormRowProps {
  transfer: Transfer;
  currentAccountId: string;
  onDone: () => void;
  onConvertToTransaction?: () => void;
}

export const TransferFormRow = observer(function TransferFormRow({
  transfer,
  currentAccountId,
  onDone,
  onConvertToTransaction,
}: TransferFormRowProps) {
  const { ledger } = useLedger();

  // Determine which account is the "other" account (not the current one)
  const isFromAccount = transfer.fromAccount?.id === currentAccountId;
  const otherAccount = isFromAccount ? transfer.toAccount : transfer.fromAccount;

  // Create account/payee groups
  const accountPayeeGroups = React.useMemo(() => {
    const groups: ComboboxGroup<any>[] = [];

    // Get accounts that aren't the current account
    const otherAccounts = ledger!.accounts.filter(
      (acc) => !acc.archived && acc.id !== currentAccountId
    );

    // Add accounts group
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
  }, [ledger, currentAccountId]);

  return (
    <tr className="bg-amber-50/50 border-t-2 border-b-2 border-amber-200 group">
      <td className="p-1 pl-8 w-[64px] align-middle">
        <input type="checkbox" className="rounded" />
      </td>
      <td className="py-2 pr-2">
        <FormInput
          type="date"
          className="tabular-nums"
          value={transfer.date ? formatDateIsoShort(transfer.date) : ""}
          onChange={(e) => {
            transfer.date = new Date(e.target.value);
          }}
        />
      </td>

      <td className="pr-2">
        <Combobox
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
          type="number"
          className="tabular-nums text-right"
          value={transfer.amount}
          onChange={(e) => {
            transfer.amount = parseInt(e.target.value, 10);
          }}
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
