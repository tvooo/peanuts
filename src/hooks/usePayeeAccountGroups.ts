import * as React from "react";
import type { ComboboxGroup } from "@/components/Combobox";
import type { Account } from "@/models/Account";
import type { Ledger } from "@/models/Ledger";
import type { Payee } from "@/models/Payee";

export interface PayeeAccountOption {
  id: string;
  label: string;
  account?: Account;
  payee?: Payee;
}

/**
 * Creates combobox groups for payees and accounts (for transfer selection).
 * @param ledger - The ledger containing payees and accounts
 * @param excludeAccountId - Optional account ID to exclude (e.g., current transaction's account)
 */
export function usePayeeAccountGroups(
  ledger: Ledger,
  excludeAccountId?: string | null
): ComboboxGroup<PayeeAccountOption>[] {
  // Read the observable lengths outside the memo so callers (which are MobX
  // observers) re-render — and the memo recomputes — when a payee is created
  // inline in a combobox. The arrays keep their identity when pushed to.
  const payeeCount = ledger?.payees.length ?? 0;
  const accountCount = ledger?.accounts.length ?? 0;

  // biome-ignore lint/correctness/useExhaustiveDependencies: see above
  return React.useMemo(() => {
    const groups: ComboboxGroup<PayeeAccountOption>[] = [];

    // Get non-archived accounts, optionally excluding one
    const otherAccounts = ledger.accounts.filter(
      (acc) => !acc.archived && acc.id !== excludeAccountId
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
      options: ledger.payees
        .slice()
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((p) => ({
          id: `payee-${p.id}`,
          label: p.name,
          payee: p,
        })),
    });

    return groups;
  }, [ledger, payeeCount, accountCount, excludeAccountId]);
}
