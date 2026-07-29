import { endOfToday, isAfter } from "date-fns";
import { action, computed, observable } from "mobx";
import { deserializeDate, serializeDate } from "@/utils/dateSerialize";
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

  @observable
  accessor fromStatus: "open" | "cleared" = "open";

  @observable
  accessor toStatus: "open" | "cleared" = "open";

  /**
   * Import ids are per side: a transfer between two own accounts shows up on
   * both bank statements, with a different id in each.
   */
  @observable
  accessor fromImportId: string | null = null;

  @observable
  accessor toImportId: string | null = null;

  static fromJSON(json: any, ledger: Ledger) {
    const transfer = new Transfer({ id: json.id, ledger });
    transfer.fromAccount = ledger.getAccountByIdFast(json.from_account_id) || null;
    transfer.toAccount = ledger.getAccountByIdFast(json.to_account_id) || null;
    transfer.amount = json.amount;
    transfer.fromStatus = json.from_status;
    transfer.toStatus = json.to_status;
    transfer.date = json.date ? deserializeDate(json.date) : null;
    transfer.note = json.note;
    transfer.budget = json.budget_id ? ledger.getBudgetByIdFast(json.budget_id) || null : null;
    transfer.fromImportId = json.from_import_id ?? null;
    transfer.toImportId = json.to_import_id ?? null;
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
      date: this.date ? serializeDate(this.date) : null,
      note: this.note,
      budget_id: this.budget?.id || null,
      from_import_id: this.fromImportId,
      to_import_id: this.toImportId,
    };
  }

  @computed
  get isFuture(): boolean {
    if (!this.date) return false;
    return isAfter(this.date, endOfToday());
  }

  @action
  toggleFromStatus() {
    this.fromStatus = this.fromStatus === "cleared" ? "open" : "cleared";
    this.notifyChange();
  }

  @action
  toggleToStatus() {
    this.toStatus = this.toStatus === "cleared" ? "open" : "cleared";
    this.notifyChange();
  }

  /** Which side of this transfer the given account is on, if any. */
  sideFor(account: Account): "from" | "to" | null {
    if (this.fromAccount === account) return "from";
    if (this.toAccount === account) return "to";
    return null;
  }

  /**
   * The transfer amount as it appears on the given account's statement:
   * negative when money leaves the account, positive when it arrives.
   */
  signedAmountFor(account: Account): Amount {
    return this.sideFor(account) === "from" ? -this.amount : this.amount;
  }

  /** The import id recorded for the given account's side, if any. */
  importIdFor(account: Account): string | null {
    const side = this.sideFor(account);
    if (!side) return null;
    return side === "from" ? this.fromImportId : this.toImportId;
  }

  /**
   * Records that the given account's side of this transfer was seen on an
   * imported statement, which also means the bank has booked it.
   */
  @action
  markImported(account: Account, importId: string) {
    const side = this.sideFor(account);
    if (side === "from") {
      this.fromImportId = importId;
      this.fromStatus = "cleared";
    } else if (side === "to") {
      this.toImportId = importId;
      this.toStatus = "cleared";
    }
    this.notifyChange();
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
    draft.fromImportId = this.fromImportId;
    draft.toImportId = this.toImportId;
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
    this.fromImportId = draft.fromImportId;
    this.toImportId = draft.toImportId;
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
