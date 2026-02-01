import { runInAction } from "mobx";
import type { Ledger } from "@/models/Ledger";
import { Payee } from "@/models/Payee";

export interface PayeeOption {
  id: string;
  label: string;
  payee: Payee;
}

/**
 * Creates a function that creates a new payee and returns it as a combobox option.
 * Used by TransactionFormRow and SplitTransactionFormRow for creating payees inline.
 */
export function usePayeeCreator(ledger: Ledger) {
  return (name: string): Promise<PayeeOption> => {
    return new Promise((resolve) => {
      runInAction(() => {
        const newPayee = new Payee({ ledger, id: null });
        newPayee.name = name;
        ledger.payees.push(newPayee);
        resolve({
          id: `payee-${newPayee.id}`,
          label: newPayee.name,
          payee: newPayee,
        });
      });
    });
  };
}
