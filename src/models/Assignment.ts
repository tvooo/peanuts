import { formatDateIsoShort } from "@/utils/formatting";
import { Amount } from "@/utils/types";
import { Budget } from "./Budget";

export class Assignment {
    date: Date
  budget: Budget;

  amount: Amount;

  constructor(date: Date, budget: Budget, amount: Amount) {
    this.date = date;
    this.budget = budget;
    this.amount = amount;
  }

  toString() {
    return `${formatDateIsoShort(this.date)} > ${this.budget.name} ${this.amount}`;
  }
}
