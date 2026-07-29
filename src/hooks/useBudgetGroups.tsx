import { ArrowDownToLine, Ban, Split } from "lucide-react";
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
  /** Include "No category" option in the first group, to clear the selection */
  includeNoneOption?: boolean;
  /** Filter out this budget from results */
  excludeBudgetId?: string;
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
  const { includeSplitOption = false, includeNoneOption = false, excludeBudgetId } = options;

  // Read the observable length outside the memo so callers (which are MobX
  // observers) re-render — and the memo recomputes — when a budget is created
  // inline in a combobox.
  const budgetCount = ledger?._budgets.length ?? 0;

  // budgetCount is an intentional extra dependency: ledger._budgets keeps its
  // identity when a budget is pushed onto it, so it is what makes the memo
  // recompute after a budget is created inline.
  // biome-ignore lint/correctness/useExhaustiveDependencies: see above
  return React.useMemo(() => {
    if (!ledger) return [];

    const groups: ComboboxGroup<BudgetOption>[] = [];
    const categorizedBudgets = new Map<string, Budget[]>();
    const uncategorized: Budget[] = [];

    // Find the inflow budget separately
    const inflowBudget = ledger._budgets.find((b) => b.isToBeBudgeted);

    // Group budgets by their category (exclude archived and optionally a specific budget)
    ledger._budgets.forEach((budget) => {
      if (budget.isToBeBudgeted || budget.isArchived || budget.id === excludeBudgetId) {
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

    // Add Inflow budget and the special options as first group (without a
    // category header)
    const firstGroupOptions: BudgetOption[] = [];

    if (inflowBudget) {
      firstGroupOptions.push({
        id: inflowBudget.id,
        label: "Inflow",
        budget: inflowBudget,
        icon: <ArrowDownToLine className="mr-1.5" size={14} />,
      });
    }

    // Optionally add split transaction option
    if (includeSplitOption) {
      firstGroupOptions.push({
        label: "Split transaction",
        id: "split",
        budget: null,
        icon: <Split className="mr-1.5" size={14} />,
      });
    }

    // Optionally add an option to clear the category again
    if (includeNoneOption) {
      firstGroupOptions.push({
        label: "No category",
        id: "none",
        budget: null,
        icon: <Ban className="mr-1.5" size={14} />,
      });
    }

    if (firstGroupOptions.length > 0) {
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
  }, [ledger, budgetCount, includeSplitOption, includeNoneOption, excludeBudgetId]);
}
