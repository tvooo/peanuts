import { isSameMonth } from "date-fns";
import { action, computed, observable } from "mobx";
import type { Amount } from "@/utils/types";
import type { Budget } from "./Budget";
import type { Ledger } from "./Ledger";
import { Model } from "./Model";

export type GoalType = "monthly_assignment" | "available";

export class Goal extends Model {
  @observable
  accessor type: GoalType = "available";

  @observable
  accessor targetAmount: Amount = 0;

  @observable
  accessor budget: Budget | null = null;

  @observable
  accessor isArchived: boolean = false;

  @observable
  accessor createdAt: Date = new Date();

  static fromJSON(json: any, ledger: Ledger): Goal {
    const goal = new Goal({ id: json.id, ledger });
    goal.type = json.type;
    goal.targetAmount = json.target_amount;
    goal.budget = ledger.getBudgetByIdFast(json.budget_id) || null;
    goal.isArchived = json.is_archived ?? false;
    goal.createdAt = json.created_at ? new Date(json.created_at) : new Date();
    return goal;
  }

  toJSON() {
    return {
      id: this.id,
      type: this.type,
      target_amount: this.targetAmount,
      budget_id: this.budget?.id || null,
      is_archived: this.isArchived,
      created_at: this.createdAt.toISOString(),
    };
  }

  /**
   * Compute progress based on goal type.
   * - For "available": tracks the budget's available balance towards the target
   * - For "monthly_assignment": tracks the current month's assignment towards the target
   */
  @computed
  get progress(): { current: Amount; target: Amount; percentage: number; isComplete: boolean } {
    const target = this.targetAmount;
    let current = 0;

    if (this.budget) {
      if (this.type === "available") {
        // For available goals, get the budget's current available balance
        current = this.ledger.budgetAvailableForMonth(this.budget, new Date());
      } else if (this.type === "monthly_assignment") {
        // For monthly assignment goals, get current month's assignment
        const currentMonth = new Date();
        const assignment = this.ledger.assignments.find(
          (a) => a.budget?.id === this.budget?.id && a.date && isSameMonth(a.date, currentMonth)
        );
        current = assignment?.amount ?? 0;
      }
    }

    // Don't let current go negative for percentage calculation
    const effectiveCurrent = Math.max(0, current);
    const percentage = target > 0 ? Math.min(100, (effectiveCurrent / target) * 100) : 0;
    const isComplete = current >= target;

    return { current, target, percentage, isComplete };
  }

  @action
  setType(type: GoalType) {
    this.type = type;
    this.notifyChange();
  }

  @action
  setTargetAmount(amount: Amount) {
    this.targetAmount = amount;
    this.notifyChange();
  }

  @action
  setBudget(budget: Budget | null) {
    this.budget = budget;
    this.notifyChange();
  }

  @action
  setIsArchived(archived: boolean) {
    this.isArchived = archived;
    this.notifyChange();
  }
}
