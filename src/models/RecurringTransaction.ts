import { Amount } from "@/utils/types";
import cuid from "cuid";
import { computed, observable } from "mobx";
import { Account } from "./Account";
import { Ledger } from "./Ledger";
import { Model, ModelConstructorArgs } from "./Model";
import { TransactionPosting } from "./Transaction";

export class RecurringTransaction extends Model {
  // @observable
  // accessor date: Date;

  @observable
  accessor account: Account | null = null;

  postings: TransactionPosting[] = [];

  // amount: Amount;

  period: "yearly" | "monthly" | null = null;

  constructor({ id, ledger }: ModelConstructorArgs) {
    super({ id: id || cuid(), ledger });
  }

  static fromJSON(json: any, ledger: Ledger) {
      const transaction = new RecurringTransaction({ id: json.id, ledger });
      transaction.account = ledger.accounts.find((a) => a.id === json.account_id) || null;
      transaction.postings = json.transaction_posting_ids.map(
        (p_id: string) => ledger.transactionPostings.find((pp) => pp.id === p_id) || null
      );
      // transaction.status = json.status;
      // transaction.date = new Date(json.date);
      // posting.amount = json.amount;
      // posting.note = json.note;
      // posting.payee = json.payee;
      return transaction;
    }
  
    toJSON() {
      return {
        id: this.id,
        account_id: this.account?.id,
        transaction_posting_ids: this.postings.map((p) => p.id),
        // status: this.status,
        // date: this.date?.toISOString() || null,
      }
    }

  @computed
  get amount(): Amount {
    return this.postings[0].amount;
  }
}
