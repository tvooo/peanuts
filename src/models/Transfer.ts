import { Amount } from "@/utils/types";
import cuid from "cuid";
import { observable } from "mobx";
import { Account } from "./Account";
import { Ledger } from "./Ledger";
import { Model, ModelConstructorArgs } from "./Model";

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

  fromStatus: "open" | "cleared" = "open";
  toStatus: "open" | "cleared" = "open";

  constructor({ id, ledger }: ModelConstructorArgs) {
    super({ id: id || cuid(), ledger });
  }

  static fromJSON(json: any, ledger: Ledger) {
    const transfer = new Transfer({ id: json.id, ledger });
    transfer.fromAccount =
      ledger.accounts.find((a) => a.id === json.from_account_id) || null;
    transfer.toAccount =
      ledger.accounts.find((a) => a.id === json.to_account_id) || null;
    transfer.amount = json.amount;
    transfer.fromStatus = json.from_status;
    transfer.toStatus = json.to_status;
    transfer.date = new Date(json.date);
    transfer.note = json.note;
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
    };
  }
}

