import { Balance } from "@/utils/types";
import { Transaction } from "./Transaction";

export class Account {
  name: string = "My account";

  private balance: number = 0;

  constructor(name: string, balance: Balance) {
    this.balance = balance;
    this.name = name;
  }

  toString() {
    return `2020-01-01 open ${this.name} ${this.balance}`;
  }

  // static fromOpenStatement(statement: string) {
  //   // Example: `2020-04-18 open dkb`
  //   const [ dateStr, chip, nameStr ] = statement.split(' ')
  //   const date = parseISO(dateStr)
  //   return new Account(nameStr, 0)
  // }

  processTransaction(transaction: Transaction) {
    this.balance += transaction.amount
  }

  get currentBalance(): Balance {
    return this.balance;
  }
  get clearedBalance(): Balance {
    return this.balance;
  }
}
