import { computed, observable } from "mobx";
import type { Balance } from "@/utils/types";
import type { Ledger } from "./Ledger";
import { Model } from "./Model";

export class Budget extends Model {
  @observable
  accessor name: string = "Some budget";

  balance: Balance = 0;

  budgetCategory: BudgetCategory | null = null;

  isToBeBudgeted: boolean = false;

  static fromJSON(json: any, ledger: Ledger): Budget {
    const budget = new Budget({ id: json.id, ledger });
    budget.name = json.name;
    budget.budgetCategory =
      budget.ledger.budgetCategories.find((c) => c.id === json.budget_category_id) || null;
    budget.isToBeBudgeted = json.is_to_be_budgeted;
    return budget;
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      budget_category_id: this.budgetCategory?.id || null,
      is_to_be_budgeted: this.isToBeBudgeted,
    };
  }

  get currentBalance(): Balance {
    return this.balance;
  }

  @computed
  get goal() {
    return null;
  }
}

export class BudgetCategory extends Model {
  @observable
  accessor name: string = "Unnamed budget category";

  static fromJSON(json: any, ledger: Ledger): BudgetCategory {
    const budgetCategory = new BudgetCategory({ id: json.id, ledger });
    budgetCategory.name = json.name;
    return budgetCategory;
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
    };
  }
}
