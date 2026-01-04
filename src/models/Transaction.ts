import cuid from "cuid";
import { endOfToday, isAfter } from "date-fns";
import { action, computed, observable } from "mobx";
import type { Amount } from "@/utils/types";
import type { Account } from "./Account";
import type { Budget } from "./Budget";
import type { Ledger } from "./Ledger";
import { Model, type ModelConstructorArgs } from "./Model";
import type { Payee } from "./Payee";

export class Transaction extends Model {
  @observable
  accessor date: Date | null = null;

  account: Account | null = null;

  @observable
  accessor payee: Payee | null = null;

  @observable
  accessor postings: TransactionPosting[] = [];

  status: "open" | "cleared" = "open";

  @observable
  accessor recurringTemplateId: string | null = null;

  constructor({ id, ledger }: ModelConstructorArgs) {
    super({ id: id || cuid(), ledger });
  }

  static fromJSON(json: any, ledger: Ledger) {
    const transaction = new Transaction({ id: json.id, ledger });
    transaction.account = ledger.accounts.find((a) => a.id === json.account_id) || null;
    transaction.payee = ledger.payees.find((p) => p.id === json.payee_id) || null;
    transaction.postings = json.transaction_posting_ids.map(
      (p_id: string) => ledger.transactionPostings.find((pp) => pp.id === p_id) || null
    );
    transaction.status = json.status;
    transaction.date = new Date(json.date);
    transaction.recurringTemplateId = json.recurring_template_id || null;
    return transaction;
  }

  toJSON() {
    return {
      id: this.id,
      account_id: this.account?.id,
      payee_id: this.payee?.id,
      transaction_posting_ids: this.postings.map((p) => p.id),
      status: this.status,
      date: this.date?.toISOString() || null,
      recurring_template_id: this.recurringTemplateId,
    };
  }

  addsUp(): boolean {
    return this.amount === this.postings.reduce((sum, posting) => posting.amount + sum, 0);
  }

  @computed
  get amount(): Amount {
    if (this.postings.length === 0) return 0;
    return this.postings.reduce((sum, posting) => sum + posting.amount, 0);
  }

  @computed
  get isSplit(): boolean {
    return this.postings.length > 1;
  }

  @computed
  get isValid(): boolean {
    // At least one posting required
    if (this.postings.length === 0) return false;

    // All postings must have a budget
    if (this.postings.some((p) => !p.budget)) return false;

    return true;
  }

  @action
  addPosting() {
    const posting = new TransactionPosting({ ledger: this.ledger!, id: null });
    posting.amount = 0;
    this.ledger!.transactionPostings.push(posting);
    this.postings.push(posting);
  }

  @action
  removePosting(posting: TransactionPosting) {
    const index = this.postings.indexOf(posting);
    if (index !== -1) {
      this.postings.splice(index, 1);
    }
    const ledgerIndex = this.ledger!.transactionPostings.indexOf(posting);
    if (ledgerIndex !== -1) {
      this.ledger!.transactionPostings.splice(ledgerIndex, 1);
    }
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

  constructor({ id, ledger }: ModelConstructorArgs) {
    super({ id: id || cuid(), ledger });
  }

  static fromJSON(json: any, ledger: Ledger) {
    const posting = new TransactionPosting({ id: json.id, ledger });
    posting.budget = ledger.getBudgetByID(json.budget_id) || null;
    posting.amount = json.amount;
    posting.note = json.note;
    return posting;
  }

  toJSON() {
    return {
      id: this.id,
      budget_id: this.budget?.id,
      amount: this.amount,
      note: this.note,
    };
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
