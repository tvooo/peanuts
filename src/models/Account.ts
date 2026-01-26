import { computed, observable } from "mobx";
import type { Balance } from "@/utils/types";
import type { Ledger } from "./Ledger";
import { Model } from "./Model";

export class Account extends Model {
  @observable
  accessor name: string = "My account";

  @observable
  accessor type: "budget" | "tracking" = "budget";

  @observable
  accessor archived: boolean = false;

  static fromJSON(json: any, ledger: Ledger): Account {
    const account = new Account({ id: json.id, ledger });
    account.name = json.name;
    account.type = json.type || "budget";
    account.archived = json.archived || false;
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

  @computed
  get balance(): Balance {
    if (!this.ledger) return 0;
    return this.ledger.getAccountBalance(this);
  }

  @computed
  get currentBalance(): Balance {
    return this.balance;
  }

  @computed
  get clearedBalance(): Balance {
    if (!this.ledger) return 0;
    return this.ledger.getClearedAccountBalance(this);
  }

  @computed
  get unclearedBalance(): Balance {
    return this.balance - this.clearedBalance;
  }

  @computed
  get uncategorizedTransactionCount(): number {
    if (!this.ledger) return 0;
    return this.ledger.transactions.filter((t) => t.account === this && t.hasMissingCategory)
      .length;
  }
}
