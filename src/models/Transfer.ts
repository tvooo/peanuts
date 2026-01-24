import { endOfToday, isAfter } from "date-fns";
import { action, computed, observable } from "mobx";
import type { Amount } from "@/utils/types";
import type { Account } from "./Account";
import type { Budget } from "./Budget";
import type { Ledger } from "./Ledger";
import { Model } from "./Model";

export class Transfer extends Model {
  @observable
  accessor date: Date | null = null;

  @observable
  accessor fromAccount: Account | null = null;

  @observable
  accessor toAccount: Account | null = null;

  @observable
  accessor amount: Amount = 0;

  @observable
  accessor note: string = "";

  @observable
  accessor budget: Budget | null = null;

  fromStatus: "open" | "cleared" = "open";
  toStatus: "open" | "cleared" = "open";

  static fromJSON(json: any, ledger: Ledger) {
    const transfer = new Transfer({ id: json.id, ledger });
    transfer.fromAccount = ledger.getAccountByIdFast(json.from_account_id) || null;
    transfer.toAccount = ledger.getAccountByIdFast(json.to_account_id) || null;
    transfer.amount = json.amount;
    transfer.fromStatus = json.from_status;
    transfer.toStatus = json.to_status;
    transfer.date = new Date(json.date);
    transfer.note = json.note;
    transfer.budget = json.budget_id ? ledger.getBudgetByIdFast(json.budget_id) || null : null;
    return transfer;
  }

  toJSON() {
    return {
      id: this.id,
      from_account_id: this.fromAccount?.id,
      to_account_id: this.toAccount?.id,
      amount: this.amount,
      from_status: this.fromStatus,
      to_status: this.toStatus,
      date: this.date?.toISOString() || null,
      note: this.note,
      budget_id: this.budget?.id || null,
    };
  }

  @computed
  get isFuture(): boolean {
    if (!this.date) return false;
    return isAfter(this.date, endOfToday());
  }

  /**
   * Creates a draft copy of this transfer for editing.
   */
  clone(): Transfer {
    const draft = new Transfer({ id: this.id, ledger: this.ledger! });
    draft.date = this.date;
    draft.fromAccount = this.fromAccount;
    draft.toAccount = this.toAccount;
    draft.amount = this.amount;
    draft.note = this.note;
    draft.fromStatus = this.fromStatus;
    draft.toStatus = this.toStatus;
    draft.budget = this.budget;
    return draft;
  }

  /**
   * Copies properties from a draft transfer to this transfer.
   */
  @action
  copyFrom(draft: Transfer) {
    this.date = draft.date;
    this.fromAccount = draft.fromAccount;
    this.toAccount = draft.toAccount;
    this.amount = draft.amount;
    this.note = draft.note;
    this.fromStatus = draft.fromStatus;
    this.toStatus = draft.toStatus;
    this.budget = draft.budget;
    this.notifyChange();
  }

  /**
   * Returns true if this is a cross-type transfer (budget ↔ tracking).
   */
  @computed
  get isCrossType(): boolean {
    if (!this.fromAccount || !this.toAccount) return false;
    return this.fromAccount.type !== this.toAccount.type;
  }
}
