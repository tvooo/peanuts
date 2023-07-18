import { Amount } from "@/utils/types";
import { Account } from "./Account";
import { Budget } from "./Budget";

export class Transaction {
  date: Date;

  account: Account;

  postings: TransactionPosting[];

  amount: Amount;

  status: 'open' | 'cleared';

  constructor(date: Date, account: Account, status: 'open' | 'cleared', postings: TransactionPosting[]) {
    if (postings.length < 1) {
      throw new Error("Transaction must have at least one posting");
    }

    this.date = date;
    this.account = account;
    this.amount = postings[0].amount;
    this.postings = postings;
    this.status = status;
  }

  addsUp(): boolean {
    return (
      this.amount ===
      this.postings.reduce((sum, posting) => posting.amount + sum, 0)
    );
  }
}

export class TransactionPosting {
  budget: Budget;

  amount: Amount;

  note?: string;

  payee: string;

  constructor(payee: string, budget: Budget, amount: Amount, note?: string) {
    this.payee = payee;
    this.budget = budget;
    this.amount = amount;
    this.note = note;
  }
}
