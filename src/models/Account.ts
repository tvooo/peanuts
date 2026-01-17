import { computed, observable } from "mobx";
import type { Balance } from "@/utils/types";
import type { Ledger } from "./Ledger";
import { Model } from "./Model";
import type { Transaction } from "./Transaction";

export class Account extends Model {
  @observable
  accessor name: string = "My account";

  @observable
  accessor type: "budget" | "tracking" = "budget";

  @observable
  accessor archived: boolean = false;

  private balance: number = 0;

  static fromJSON(json: any, ledger: Ledger): Account {
    const account = new Account({ id: json.id, ledger });
    account.name = json.name;
    account.type = json.type || "budget";
    account.archived = json.archived || false;
    account.balance = 0;
    return account;
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      type: this.type,
      archived: this.archived,
    };
  }

  toString() {
    return `2020-01-01 open ${this.name} ${this.balance}`;
  }

  processTransaction(transaction: Transaction) {
    this.balance += transaction.amount;
  }

  @computed
  get currentBalance(): Balance {
    return this.balance;
  }

  @computed
  get clearedBalance(): Balance {
    return this.balance;
  }
}
