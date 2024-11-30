import { formatDateIsoShort } from "@/utils/formatting";
import { Amount } from "@/utils/types";
import { Account } from "./Account";
import { Budget } from "./Budget";

export class Transaction {
  date: Date;

  account: Account;

  postings: TransactionPosting[];

  amount: Amount;

  status: "open" | "cleared";

  constructor(
    date: Date,
    account: Account,
    status: "open" | "cleared",
    postings: TransactionPosting[]
  ) {
    if (postings.length < 1) {
      throw new Error("Transaction must have at least one posting");
    }

    this.date = date;
    this.account = account;
    this.amount = postings[0].amount;
    this.postings = postings;
    this.status = status;
  }

  toString() {
    return `${formatDateIsoShort(this.date)} * ${this.account.name} ${this.postings[0].payee} ${this.postings[0].budget.name} ${this.postings[0].amount}`;
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
