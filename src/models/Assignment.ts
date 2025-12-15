import cuid from "cuid";
import { action, observable } from "mobx";
import type { Amount } from "@/utils/types";
import type { Budget } from "./Budget";
import type { Ledger } from "./Ledger";
import { Model, type ModelConstructorArgs } from "./Model";

export class Assignment extends Model {
  @observable
  accessor date: Date | null = null;

  @observable
  accessor budget: Budget | null = null;

  @observable
  accessor amount: Amount = 0;

  constructor({ id, ledger }: ModelConstructorArgs) {
    super({ id: id || cuid(), ledger });
  }

  static fromJSON(json: any, ledger: Ledger) {
    const assignment = new Assignment({ id: json.id, ledger });
    assignment.date = new Date(json.date);
    assignment.budget = ledger.getBudgetByID(json.budget_id) || null;
    assignment.amount = json.amount;
    return assignment;
  }

  toJSON() {
    return {
      id: this.id,
      date: this.date?.toISOString() || null,
      budget_id: this.budget!.id,
      amount: this.amount,
    };
  }

  @action
  setDate(date: Date) {
    this.date = date;
  }

  @action
  setBudget(budget: Budget) {
    this.budget = budget;
  }

  @action
  setAmount(amount: Amount) {
    this.amount = amount;
  }
}
