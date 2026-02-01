import { runInAction } from "mobx";
import { Budget } from "@/models/Budget";
import type { Ledger } from "@/models/Ledger";

export interface BudgetCreatorOption {
  id: string;
  label: string;
  budget: Budget;
}

/**
 * Creates a function that creates a new budget and returns it as a combobox option.
 * Used by TransactionFormRow and SplitTransactionFormRow for creating budgets inline.
 */
export function useBudgetCreator(ledger: Ledger) {
  return (name: string): Promise<BudgetCreatorOption> => {
    return new Promise((resolve) => {
      runInAction(() => {
        const newBudget = new Budget({ ledger, id: null });
        newBudget.name = name;
        ledger._budgets.push(newBudget);
        resolve({
          id: newBudget.id,
          label: newBudget.name,
          budget: newBudget,
        });
      });
    });
  };
}
