import { formatDateIsoShort } from "@/utils/formatting";
import type { Balance } from "@/utils/types";
import type { Account } from "./Account";

export class BalanceAssertion {
  date: Date;

  account: Account;

  balance: Balance;

  constructor(date: Date, account: Account, balance: Balance) {
    this.date = date;
    this.account = account;
    this.balance = balance;
  }

  toString() {
    return `${formatDateIsoShort(this.date)}} = ${this.account.name} ${this.balance}`;
  }
}
