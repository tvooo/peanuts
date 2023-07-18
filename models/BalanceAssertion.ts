import { Amount, Balance } from "@/utils/types";
import { Account } from "./Account";

export class BalanceAssertion {
  date: Date;

  account: Account;

  balance: Balance;

  constructor(date: Date, account: Account, balance: Balance) {
    this.date = date;
    this.account = account;
    this.balance = balance;
  }
}
