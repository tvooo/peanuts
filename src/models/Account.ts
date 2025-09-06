import { Balance } from "@/utils/types";
import cuid from 'cuid';
import { computed, observable } from "mobx";
import { Ledger } from "./Ledger";
import { Model } from "./Model";
import { Transaction } from "./Transaction";

export class Account extends Model {
  @observable
  accessor name: string = "My account";

  @observable
  accessor type: "budget" | "tracking" = "budget";

  private balance: number = 0;

  constructor({ id, ledger }: { id: string | null, ledger: Ledger }) {
    super({
      id: id || cuid(),
      ledger
    })
  }

  static fromJSON(json: any, ledger: Ledger): Account {
    const account = new Account({ id: json.id, ledger });  
    account.name = json.name;
    account.balance = 0
    return account;
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      type: this.type,
    }
  }

  toString() {
    return `2020-01-01 open ${this.name} ${this.balance}`;
  }

  processTransaction(transaction: Transaction) {
    this.balance += transaction.amount
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
