import { Amount } from "@/utils/types";
import cuid from "cuid";
import { endOfToday, isAfter } from "date-fns";
import { action, computed, observable } from "mobx";
import { Account } from "./Account";
import { Budget } from "./Budget";
import { Ledger } from "./Ledger";
import { Model, ModelConstructorArgs } from "./Model";
import { Payee } from "./Payee";

export class Transaction extends Model {
  @observable
  accessor date: Date | null = null;

  account: Account | null = null;

  postings: TransactionPosting[] = [];

  // amount: Amount;

  status: "open" | "cleared" = "open";

  @observable
  accessor recurringTemplateId: string | null = null;

  constructor({ id, ledger }: ModelConstructorArgs) {
    super({ id: id || cuid(), ledger });
  }

  static fromJSON(json: any, ledger: Ledger) {
    const transaction = new Transaction({ id: json.id, ledger });
    transaction.account = ledger.accounts.find((a) => a.id === json.account_id) || null;
    transaction.postings = json.transaction_posting_ids.map(
      (p_id: string) => ledger.transactionPostings.find((pp) => pp.id === p_id) || null
    );
    transaction.status = json.status;
    transaction.date = new Date(json.date);
    transaction.recurringTemplateId = json.recurring_template_id || null;
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
      status: this.status,
      date: this.date?.toISOString() || null,
      recurring_template_id: this.recurringTemplateId,
    }
  }

  addsUp(): boolean {
    return (
      this.amount ===
      this.postings.reduce((sum, posting) => posting.amount + sum, 0)
    );
  }

  @computed
  get amount(): Amount {
    return this.postings[0].amount;
  }

  @computed
  get isFuture(): boolean {
    if (!this.date) return false;
    return isAfter(this.date, endOfToday());
  }
}

export class TransactionPosting extends Model {
  @observable
  accessor budget: Budget | null = null;

  @observable
  accessor amount: Amount = 0;

  @observable
  accessor note: string = "";

  @observable
  accessor payee: Payee | null = null;

  constructor({ id, ledger }: ModelConstructorArgs) {
    super({ id: id || cuid(), ledger });
  }

  static fromJSON(json: any, ledger: Ledger) {
    const posting = new TransactionPosting({ id: json.id, ledger });
    posting.budget = ledger.getBudgetByID(json.budget_id) || null;
    posting.amount = json.amount;
    posting.note = json.note;
    posting.payee = ledger.payees.find((p) => p.id === json.payee_id) || null;
    return posting;
  }

  toJSON() {
    return {
      id: this.id,
      budget_id: this.budget?.id,
      amount: this.amount,
      note: this.note,
      payee_id: this.payee?.id,
    };
  }

  @action
  setPayee(payee: Payee) {
    this.payee = payee;
  }

  @action
  setBudget(budget: Budget) {
    this.budget = budget;
  }

  @action
  setAmount(amount: Amount) {
    this.amount = amount;
  }

  @action
  setNote(note: string) {
    this.note = note;
  }
}
