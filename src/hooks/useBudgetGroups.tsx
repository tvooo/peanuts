import { ArrowDownToLine, Split } from "lucide-react";
import * as React from "react";
import type { ComboboxGroup } from "@/components/Combobox";
import type { Budget } from "@/models/Budget";
import type { Ledger } from "@/models/Ledger";

export interface BudgetOption {
  id: string;
  label: string;
  budget: Budget | null;
  icon?: React.ReactNode;
}

interface UseBudgetGroupsOptions {
  /** Include "Split transaction" option in the first group */
  includeSplitOption?: boolean;
}

/**
 * Creates combobox groups for budget selection, organized by category.
 * @param ledger - The ledger containing budgets and categories (can be null)
 * @param options - Configuration options
 */
export function useBudgetGroups(
  ledger: Ledger | null | undefined,
  options: UseBudgetGroupsOptions = {}
): ComboboxGroup<BudgetOption>[] {
  const { includeSplitOption = false } = options;

  return React.useMemo(() => {
    if (!ledger) return [];

    const groups: ComboboxGroup<BudgetOption>[] = [];
    const categorizedBudgets = new Map<string, Budget[]>();
    const uncategorized: Budget[] = [];

    // Find the inflow budget separately
    const inflowBudget = ledger._budgets.find((b) => b.isToBeBudgeted);

    // Group budgets by their category
    ledger._budgets.forEach((budget) => {
      if (budget.isToBeBudgeted) {
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
      const firstGroupOptions: BudgetOption[] = [
        {
          id: inflowBudget.id,
          label: "Inflow",
          budget: inflowBudget,
          icon: <ArrowDownToLine className="mr-1.5" size={14} />,
        },
      ];

      // Optionally add split transaction option
      if (includeSplitOption) {
        firstGroupOptions.push({
          label: "Split transaction",
          id: "split",
          budget: null,
          icon: <Split className="mr-1.5" size={14} />,
        });
      }

      groups.push({
        label: "",
        options: firstGroupOptions,
      });
    }

    // Create groups from categorized budgets
    ledger.budgetCategories.forEach((category) => {
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
  }, [ledger, includeSplitOption]);
}
