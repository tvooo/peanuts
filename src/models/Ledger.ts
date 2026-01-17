import { endOfMonth, isBefore, isSameMonth } from "date-fns";
import { action, computed, observable } from "mobx";
import { Account } from "@/models/Account";
import { Budget, BudgetCategory } from "@/models/Budget";
import { Transaction, TransactionPosting } from "@/models/Transaction";
import type { Balance } from "@/utils/types";
import { Assignment } from "./Assignment";
import type { BalanceAssertion } from "./BalanceAssertion";
import { Payee } from "./Payee";
import { RecurringTemplate } from "./RecurringTemplate";
import { Transfer } from "./Transfer";

export class Ledger {
  accounts: Account[] = [];

  @observable
  accessor _budgets: Budget[] = [];

  @observable
  accessor payees: Payee[] = [];

  @observable
  accessor transactions: Transaction[] = [];

  @observable
  accessor recurringTemplates: RecurringTemplate[] = [];

  @observable
  accessor assignments: Assignment[] = [];

  balanceAssertions: BalanceAssertion[] = [];

  @observable
  accessor transactionPostings: TransactionPosting[] = [];

  @observable
  accessor transfers: Transfer[] = [];

  source: string = "";
  name: string = "";
  fileName: string = "";
  currency: string = "EUR";
  currencyFormat = "{amount} {code}";

  budgetCategories: BudgetCategory[] = [];

  static async fromJSON(json: string): Promise<Ledger> {
    const ledger = new Ledger();
    ledger.source = json;

    const collections = JSON.parse(json);

    ledger.name = collections.name || "Untitled Ledger";

    collections.accounts.forEach((a: any) => {
      ledger.accounts.push(Account.fromJSON(a, ledger));
    });

    collections.payees.forEach((a: any) => {
      ledger.payees.push(Payee.fromJSON(a, ledger));
    });

    collections.budget_categories.forEach((b: any) => {
      ledger.budgetCategories.push(BudgetCategory.fromJSON(b, ledger));
    });

    collections.budgets.forEach((b: any) => {
      // const budgetCategory = ledger.budgetCategories.find(
      //   (c) => c.uuid === b.budget_category_uuid
      // );
      // if(!budgetCategory) {
      //   throw new Error(`Budget category ${b.budget_category_uuid} not found`);
      // }
      ledger._budgets.push(Budget.fromJSON(b, ledger));
    });

    collections.transaction_postings.forEach((p: any) => {
      ledger.transactionPostings.push(TransactionPosting.fromJSON(p, ledger));
    });

    collections.transactions.forEach((t: any) => {
      ledger.transactions.push(Transaction.fromJSON(t, ledger));
    });

    if (collections.recurring_templates) {
      collections.recurring_templates.forEach((t: any) => {
        ledger.recurringTemplates.push(RecurringTemplate.fromJSON(t, ledger));
      });
    }

    collections.assignments.forEach((t: any) => {
      ledger.assignments.push(Assignment.fromJSON(t, ledger));
    });

    collections.transfers.forEach((t: any) => {
      ledger.transfers.push(Transfer.fromJSON(t, ledger));
    });

    return ledger;
  }

  toJSON() {
    return {
      name: this.name,
      accounts: this.accounts.map((a) => a.toJSON()),
      budget_categories: this.budgetCategories.map((a) => a.toJSON()),
      budgets: this._budgets.map((a) => a.toJSON()),
      payees: this.payees.map((a) => a.toJSON()),
      transactions: this.transactions.map((a) => a.toJSON()),
      transaction_postings: this.transactionPostings.map((a) => a.toJSON()),
      recurring_templates: this.recurringTemplates.map((a) => a.toJSON()),
      assignments: this.assignments.map((a) => a.toJSON()),
      transfers: this.transfers.map((a) => a.toJSON()),
    };
  }

  getAccount(name: string): Account | undefined {
    return this.accounts.find((a) => a.name === name);
  }

  getBudget(name: string): Budget | undefined {
    return this._budgets.find((a) => a.name === name);
  }

  getBudgetByID(id: string): Budget | undefined {
    return this._budgets.find((a) => a.id === id);
  }

  getBudgetCategoryByID(id: string): BudgetCategory | undefined {
    return this.budgetCategories.find((a) => a.id === id);
  }

  getInflowBudget(): Budget | undefined {
    return this._budgets.find((a) => a.isToBeBudgeted);
  }

  getPayeeByID(id: string): Payee | undefined {
    return this.payees.find((a) => a.id === id);
  }

  @action
  addBudget(budget: Budget) {
    this._budgets.push(budget);
  }

  @action
  deleteTransaction(transaction: Transaction) {
    // Remove associated postings
    transaction.postings.forEach((posting) => {
      const postingIndex = this.transactionPostings.findIndex((p) => p.id === posting.id);
      if (postingIndex !== -1) {
        this.transactionPostings.splice(postingIndex, 1);
      }
    });
    // Remove transaction
    const transactionIndex = this.transactions.findIndex((t) => t.id === transaction.id);
    if (transactionIndex !== -1) {
      this.transactions.splice(transactionIndex, 1);
    }
  }

  @action
  deleteTransfer(transfer: Transfer) {
    const transferIndex = this.transfers.findIndex((t) => t.id === transfer.id);
    if (transferIndex !== -1) {
      this.transfers.splice(transferIndex, 1);
    }
  }

  /**
   * Returns transactions up to and including the given month, excluding tracking accounts.
   */
  budgetTransactionsThroughMonth(date: Date): Transaction[] {
    return this.transactions
      .filter((t) => isBefore(t.date!, endOfMonth(date)))
      .filter((t) => t.account?.type !== "tracking");
  }

  /**
   * Returns transactions in the given month, excluding tracking accounts.
   */
  budgetTransactionsInMonth(date: Date): Transaction[] {
    return this.transactions
      .filter((t) => isSameMonth(t.date!, date))
      .filter((t) => t.account?.type !== "tracking");
  }

  @computed
  get budgets(): Budget[] {
    return this._budgets.filter((b) => !b.isToBeBudgeted);
  }

  transactionsForAccount(account: Account) {
    return this.transactions.filter((tr) => tr.account === account);
  }

  transactionsAndBalancesForAccount(account: Account) {
    return [
      ...this.transactions.filter((tr) => tr.account === account),
      ...this.balanceAssertions.filter((tr) => tr.account === account),
      ...this.transfers.filter((tr) => tr.fromAccount === account || tr.toAccount === account),
    ];
  }

  activityForMonth(date: Date): Balance {
    const activity = this.transactions
      .filter((t) => isBefore(t.date!, endOfMonth(date)))
      // Exclude tracking accounts from budget calculations
      .filter((t) => t.account?.type !== "tracking")
      .reduce((sum, t) => sum + t.amount, 0);

    return activity;
  }

  assignedForMonth(date: Date): Balance {
    return this.assignments
      .filter((t) => isSameMonth(t.date!, date))
      .reduce((sum, t) => sum + t.amount, 0);
  }

  budgetAvailableForMonth(budget: Budget, date: Date): Balance {
    let activity: Balance = 0;
    this.transactions
      // Exclude future transactions
      .filter((t) => isBefore(t.date!, endOfMonth(date)))
      // Exclude tracking accounts from budget calculations
      .filter((t) => t.account?.type !== "tracking")
      .forEach((t) => {
        //   t.account.processTransaction(t);
        // t.budgets.forEach((b) => b.processTransaction(t));
        t.postings
          .filter((p) => p.budget === budget)
          .forEach((p) => {
            // if (budget.name === "inflow") {
            // }
            activity += p.amount;
          });
      });

    if (budget.isToBeBudgeted) {
      this.transfers
        .filter((t) => isBefore(t.date!, endOfMonth(date)))
        .filter((t) => t.toAccount?.type !== t.fromAccount?.type)
        .forEach((t) => {
          if (t.toAccount?.type === "budget") {
            activity += t.amount;
          } else {
            activity -= t.amount;
          }
        });
    }

    let assigned: Balance = 0;
    if (budget.isToBeBudgeted) {
      this.assignments
        .filter((t) => isBefore(t.date!, endOfMonth(date)))
        .filter((p) => p.budget !== budget)
        .forEach((a) => {
          assigned -= a.amount;
        });
    } else {
      this.assignments
        .filter((t) => isBefore(t.date!, endOfMonth(date)))
        .filter((p) => p.budget === budget)
        .forEach((a) => {
          assigned += a.amount;
        });
    }

    return assigned + activity;
  }

  budgetActivityForMonth(budget: Budget, date: Date): Balance {
    let activity: Balance = 0;
    this.transactions
      .filter((t) => isSameMonth(t.date!, date))
      // Exclude tracking accounts from budget calculations
      .filter((t) => t.account?.type !== "tracking")
      .forEach((t) => {
        t.postings
          .filter((p) => p.budget === budget)
          .forEach((p) => {
            activity += p.amount;
          });
      });
    return activity;
  }

  budgetAssignedForMonth(budget: Budget, date: Date): Balance {
    let assigned: Balance = 0;
    this.assignments
      .filter((t) => isSameMonth(t.date!, date))
      .filter((p) => p.budget === budget)
      .forEach((a) => {
        assigned += a.amount;
      });

    return assigned;
  }
}
