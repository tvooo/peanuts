import { endOfToday, isAfter } from "date-fns";
import { action, computed, observable } from "mobx";
import { deserializeDate, serializeDate } from "@/utils/dateSerialize";
import type { Amount } from "@/utils/types";
import type { Account } from "./Account";
import type { Budget } from "./Budget";
import type { Ledger } from "./Ledger";
import { Model } from "./Model";
import type { Payee } from "./Payee";

export class Transaction extends Model {
  @observable
  accessor date: Date | null = null;

  account: Account | null = null;

  @observable
  accessor payee: Payee | null = null;

  @observable
  accessor postings: TransactionPosting[] = [];

  @observable
  accessor status: "open" | "cleared" = "open";

  @observable
  accessor recurringTemplateId: string | null = null;

  /** Stable identifier from a bank statement import, used to detect duplicates */
  @observable
  accessor importId: string | null = null;

  /** Raw counterparty name as it appeared in the imported statement */
  @observable
  accessor importPayee: string | null = null;

  static fromJSON(json: any, ledger: Ledger) {
    const transaction = new Transaction({ id: json.id, ledger });
    transaction.account = ledger.getAccountByIdFast(json.account_id) || null;
    transaction.payee = ledger.getPayeeByIdFast(json.payee_id) || null;
    transaction.postings = json.transaction_posting_ids.map(
      (p_id: string) => ledger.getPostingByIdFast(p_id) || null
    );
    transaction.status = json.status;
    transaction.date = json.date ? deserializeDate(json.date) : null;
    transaction.recurringTemplateId = json.recurring_template_id || null;
    transaction.importId = json.import_id || null;
    transaction.importPayee = json.import_payee || null;
    return transaction;
  }

  toJSON() {
    return {
      id: this.id,
      account_id: this.account?.id,
      payee_id: this.payee?.id,
      transaction_posting_ids: this.postings.map((p) => p.id),
      status: this.status,
      date: this.date ? serializeDate(this.date) : null,
      recurring_template_id: this.recurringTemplateId,
      import_id: this.importId,
      import_payee: this.importPayee,
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

    return true;
  }

  @computed
  get hasMissingCategory(): boolean {
    if (this.postings.length === 0) return true;
    return this.postings.some((p) => !p.budget);
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

  @action
  setStatus(status: "open" | "cleared") {
    this.status = status;
    this.notifyChange();
  }

  @action
  toggleStatus() {
    this.status = this.status === "cleared" ? "open" : "cleared";
    this.notifyChange();
  }

  /**
   * Creates a draft copy of this transaction for editing.
   * The draft is not added to the ledger's collections.
   */
  clone(): Transaction {
    const draft = new Transaction({ id: this.id, ledger: this.ledger! });
    draft.date = this.date;
    draft.account = this.account;
    draft.payee = this.payee;
    draft.status = this.status;
    draft.recurringTemplateId = this.recurringTemplateId;
    draft.importId = this.importId;
    draft.importPayee = this.importPayee;

    // Clone postings (not added to ledger)
    draft.postings = this.postings.map((posting) => posting.clone());

    return draft;
  }

  /**
   * Copies properties from a draft transaction to this transaction.
   * Used when saving edits.
   */
  @action
  copyFrom(draft: Transaction) {
    this.date = draft.date;
    this.payee = draft.payee;
    this.status = draft.status;
    this.recurringTemplateId = draft.recurringTemplateId;
    this.importId = draft.importId;
    this.importPayee = draft.importPayee;

    // Handle postings: remove deleted ones, update existing, add new
    const draftPostingIds = new Set(draft.postings.map((p) => p.id));

    // Remove postings that are in original but not in draft
    const postingsToRemove = this.postings.filter((p) => !draftPostingIds.has(p.id));
    postingsToRemove.forEach((p) => {
      this.removePosting(p);
    });

    // Update or add postings from draft
    draft.postings.forEach((draftPosting) => {
      const existingPosting = this.postings.find((p) => p.id === draftPosting.id);
      if (existingPosting) {
        // Update existing posting
        existingPosting.copyFrom(draftPosting);
      } else {
        // Add new posting (was added during editing)
        const newPosting = new TransactionPosting({
          id: draftPosting.id,
          ledger: this.ledger!,
        });
        newPosting.copyFrom(draftPosting);
        this.ledger!.transactionPostings.push(newPosting);
        this.postings.push(newPosting);
      }
    });
    this.notifyChange();
  }
}

export class TransactionPosting extends Model {
  @observable
  accessor budget: Budget | null = null;

  @observable
  accessor amount: Amount = 0;

  @observable
  accessor note: string = "";

  static fromJSON(json: any, ledger: Ledger) {
    const posting = new TransactionPosting({ id: json.id, ledger });
    posting.budget = ledger.getBudgetByIdFast(json.budget_id) || null;
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
    this.notifyChange();
  }

  @action
  setAmount(amount: Amount) {
    this.amount = amount;
    this.notifyChange();
  }

  @action
  setNote(note: string) {
    this.note = note;
    this.notifyChange();
  }

  /**
   * Creates a draft copy of this posting for editing.
   */
  clone(): TransactionPosting {
    const draft = new TransactionPosting({ id: this.id, ledger: this.ledger! });
    draft.budget = this.budget;
    draft.amount = this.amount;
    draft.note = this.note;
    return draft;
  }

  /**
   * Copies properties from a draft posting to this posting.
   */
  @action
  copyFrom(draft: TransactionPosting) {
    this.budget = draft.budget;
    this.amount = draft.amount;
    this.note = draft.note;
    this.notifyChange();
  }
}
