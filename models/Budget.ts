import { Balance } from "@/utils/types";
import { TransactionPosting } from "./Transaction";

export class Budget {
  name: string = "Some budget";

  balance: number = 0

  group?: string; // FIXME: for grouping budgets together, not sure about this

  get currentBalance(): Balance {
    return this.balance;
  }

  constructor(name: string, _?: Balance) {
    this.name = name;
    // this.bal = balance;
  }

  processPosting(posting: TransactionPosting) {
    this.balance += posting.amount;
  }
}
