import { Balance } from "@/utils/types";
import { TransactionPosting } from "./Transaction";

export class Budget {
  name: string = "Some budget";

  balance: Balance = 0;

  group?: string; // FIXME: for grouping budgets together, not sure about this

  isTarget?: boolean = false;

  toString() {
    return `2020-01-01 budget ${this.name} ${this.group}`;
  }

  get currentBalance(): Balance {
    return this.balance;
  }

  constructor(
    name: string,
    group: string = "",
    isTarget: boolean = false,
    _?: Balance
  ) {
    this.name = name;
    this.isTarget = isTarget;
    this.group = group;
  }

  processPosting(posting: TransactionPosting) {
    this.balance += posting.amount;
  }
}
