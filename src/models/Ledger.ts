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
  @observable
  accessor isDirty = false;

  /** Version counter for change detection - incremented on every mutation */
  @observable
  accessor _version = 0;

  lastSavedSnapshot: string = "";

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

  /** Maps payee ID to the last used budget for that payee (not persisted) */
  payeeBudgetMap: Map<string, Budget> = new Map();

  /** Cache for budget calculations - invalidated on version change */
  private _budgetCacheVersion = -1;
  private _budgetValuesCache: Map<
    string,
    Map<string, { available: Balance; activity: Balance; assigned: Balance }>
  > = new Map();

  /** Cache for account balance calculations - invalidated on version change */
  private _accountBalanceCacheVersion = -1;
  private _accountBalanceCache: Map<string, Balance> = new Map();

  /** Temporary lookup maps used during deserialization for O(1) lookups */
  private _accountsById?: Map<string, Account>;
  private _payeesById?: Map<string, Payee>;
  private _budgetsById?: Map<string, Budget>;
  private _postingsById?: Map<string, TransactionPosting>;
  private _budgetCategoriesById?: Map<string, BudgetCategory>;

  /** O(1) account lookup during deserialization */
  getAccountByIdFast(id: string): Account | undefined {
    return this._accountsById?.get(id) ?? this.accounts.find((a) => a.id === id);
  }

  /** O(1) payee lookup during deserialization */
  getPayeeByIdFast(id: string): Payee | undefined {
    return this._payeesById?.get(id) ?? this.payees.find((p) => p.id === id);
  }

  /** O(1) budget lookup during deserialization */
  getBudgetByIdFast(id: string): Budget | undefined {
    return this._budgetsById?.get(id) ?? this._budgets.find((b) => b.id === id);
  }

  /** O(1) posting lookup during deserialization */
  getPostingByIdFast(id: string): TransactionPosting | undefined {
    return this._postingsById?.get(id) ?? this.transactionPostings.find((p) => p.id === id);
  }

  /** O(1) budget category lookup during deserialization */
  getBudgetCategoryByIdFast(id: string): BudgetCategory | undefined {
    return this._budgetCategoriesById?.get(id) ?? this.budgetCategories.find((c) => c.id === id);
  }

  static async fromJSON(json: string): Promise<Ledger> {
    const ledger = new Ledger();
    ledger.source = json;

    const collections = JSON.parse(json);

    ledger.name = collections.name || "Untitled Ledger";

    // Phase 1: Parse entities that have no dependencies
    collections.accounts.forEach((a: any) => {
      ledger.accounts.push(Account.fromJSON(a, ledger));
    });
    // Build lookup map for O(1) access
    ledger._accountsById = new Map(ledger.accounts.map((a) => [a.id, a]));

    collections.payees.forEach((a: any) => {
      ledger.payees.push(Payee.fromJSON(a, ledger));
    });
    ledger._payeesById = new Map(ledger.payees.map((p) => [p.id, p]));

    collections.budget_categories.forEach((b: any) => {
      ledger.budgetCategories.push(BudgetCategory.fromJSON(b, ledger));
    });
    ledger._budgetCategoriesById = new Map(ledger.budgetCategories.map((c) => [c.id, c]));

    collections.budgets.forEach((b: any) => {
      ledger._budgets.push(Budget.fromJSON(b, ledger));
    });
    ledger._budgetsById = new Map(ledger._budgets.map((b) => [b.id, b]));

    // Phase 2: Parse entities that depend on budgets
    collections.transaction_postings.forEach((p: any) => {
      ledger.transactionPostings.push(TransactionPosting.fromJSON(p, ledger));
    });
    ledger._postingsById = new Map(ledger.transactionPostings.map((p) => [p.id, p]));

    // Phase 3: Parse entities that depend on accounts, payees, postings
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

    // Clear temporary lookup maps to free memory
    ledger._accountsById = undefined;
    ledger._payeesById = undefined;
    ledger._budgetsById = undefined;
    ledger._postingsById = undefined;
    ledger._budgetCategoriesById = undefined;

    // Build payee -> budget map from transactions (sorted by date so most recent wins)
    ledger.buildPayeeBudgetMap();

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
    this.incrementVersion();
  }

  @action
  incrementVersion() {
    this._version++;
  }

  @action
  markClean() {
    this.isDirty = false;
  }

  @action
  markDirty() {
    this.isDirty = true;
    this.incrementVersion();
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
    this.incrementVersion();
  }

  @action
  deleteTransfer(transfer: Transfer) {
    const transferIndex = this.transfers.findIndex((t) => t.id === transfer.id);
    if (transferIndex !== -1) {
      this.transfers.splice(transferIndex, 1);
    }
    this.incrementVersion();
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

  @computed
  get activeBudgets(): Budget[] {
    return this._budgets.filter((b) => !b.isToBeBudgeted && !b.isArchived);
  }

  @computed
  get archivedBudgets(): Budget[] {
    return this._budgets.filter((b) => !b.isToBeBudgeted && b.isArchived);
  }

  /**
   * Compute all account balances in a single pass.
   * Returns a Map from account ID to balance.
   */
  getAllAccountBalances(): Map<string, Balance> {
    // Check cache validity
    if (this._accountBalanceCacheVersion === this._version) {
      return this._accountBalanceCache;
    }

    // Clear and recompute
    const result = new Map<string, Balance>();

    // Initialize all accounts to 0
    for (const account of this.accounts) {
      result.set(account.id, 0);
    }

    // Single pass through transactions
    for (const t of this.transactions) {
      if (t.isFuture || !t.account) continue;
      const current = result.get(t.account.id) ?? 0;
      result.set(t.account.id, current + t.amount);
    }

    // Single pass through transfers
    for (const t of this.transfers) {
      if (t.isFuture) continue;

      if (t.fromAccount) {
        const current = result.get(t.fromAccount.id) ?? 0;
        result.set(t.fromAccount.id, current - t.amount);
      }
      if (t.toAccount) {
        const current = result.get(t.toAccount.id) ?? 0;
        result.set(t.toAccount.id, current + t.amount);
      }
    }

    // Cache the result
    this._accountBalanceCache = result;
    this._accountBalanceCacheVersion = this._version;

    return result;
  }

  /**
   * Get the balance for a specific account using cached computation.
   */
  getAccountBalance(account: Account): Balance {
    return this.getAllAccountBalances().get(account.id) ?? 0;
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
      // Include transactions up to end of month, but exclude future (after today)
      .filter((t) => isBefore(t.date!, endOfMonth(date)) && !t.isFuture)
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

  /**
   * Get the month key for caching
   */
  private getMonthKey(date: Date): string {
    return `${date.getFullYear()}-${date.getMonth()}`;
  }

  /**
   * Compute all budget values for a month in a single pass.
   * Returns a Map from budget ID to { available, activity, assigned }
   */
  getAllBudgetValuesForMonth(
    date: Date
  ): Map<string, { available: Balance; activity: Balance; assigned: Balance }> {
    const monthKey = this.getMonthKey(date);

    // Check cache validity
    if (this._budgetCacheVersion === this._version) {
      const cached = this._budgetValuesCache.get(monthKey);
      if (cached) {
        return cached;
      }
    } else {
      // Version changed, clear entire cache
      this._budgetValuesCache.clear();
      this._budgetCacheVersion = this._version;
    }

    const endOfMonthDate = endOfMonth(date);
    const toBeBudgeted = this.getInflowBudget();

    // Initialize accumulators for all budgets
    const result = new Map<
      string,
      {
        available: Balance;
        activity: Balance;
        assigned: Balance;
        activityThrough: Balance; // Activity through end of month (for available calc)
      }
    >();

    for (const budget of this._budgets) {
      result.set(budget.id, { available: 0, activity: 0, assigned: 0, activityThrough: 0 });
    }

    // Single pass through transactions
    for (const t of this.transactions) {
      if (t.isFuture || t.account?.type === "tracking") continue;
      if (!t.date) continue;

      const isInMonth = isSameMonth(t.date, date);
      const isThroughMonth = isBefore(t.date, endOfMonthDate);

      for (const p of t.postings) {
        if (!p.budget) continue;
        const acc = result.get(p.budget.id);
        if (!acc) continue;

        if (isInMonth) {
          acc.activity += p.amount;
        }
        if (isThroughMonth) {
          acc.activityThrough += p.amount;
        }
      }
    }

    // Single pass through cross-type transfers
    for (const t of this.transfers) {
      if (t.isFuture) continue;
      if (!t.date) continue;
      if (t.toAccount?.type === t.fromAccount?.type) continue; // Not cross-type

      const isInMonth = isSameMonth(t.date, date);
      const isThroughMonth = isBefore(t.date, endOfMonthDate);

      // Determine which budget this affects
      const targetBudget = t.budget ?? toBeBudgeted;
      if (!targetBudget) continue;

      const acc = result.get(targetBudget.id);
      if (!acc) continue;

      const amount = t.toAccount?.type === "budget" ? t.amount : -t.amount;

      if (isInMonth) {
        acc.activity += amount;
      }
      if (isThroughMonth) {
        acc.activityThrough += amount;
      }
    }

    // Single pass through assignments for assigned amounts
    let totalAssignedThroughMonth = 0;
    for (const a of this.assignments) {
      if (!a.date || !a.budget) continue;

      const isInMonth = isSameMonth(a.date, date);
      const isThroughMonth = isBefore(a.date, endOfMonthDate);

      const acc = result.get(a.budget.id);
      if (!acc) continue;

      if (isInMonth) {
        acc.assigned += a.amount;
      }
      if (isThroughMonth && !a.budget.isToBeBudgeted) {
        // For available calculation: add to budget's assigned
        acc.available += a.amount;
        totalAssignedThroughMonth += a.amount;
      }
    }

    // Finalize available calculations
    for (const [budgetId, acc] of result) {
      const budget = this._budgets.find((b) => b.id === budgetId);
      if (budget?.isToBeBudgeted) {
        // "To Be Budgeted" = all activity - all assignments to other budgets
        acc.available = acc.activityThrough - totalAssignedThroughMonth;
      } else {
        // Regular budget: available = assigned + activity
        acc.available += acc.activityThrough;
      }
    }

    // Convert to final format (remove activityThrough)
    const finalResult = new Map<
      string,
      { available: Balance; activity: Balance; assigned: Balance }
    >();
    for (const [budgetId, acc] of result) {
      finalResult.set(budgetId, {
        available: acc.available,
        activity: acc.activity,
        assigned: acc.assigned,
      });
    }

    // Cache the result
    this._budgetValuesCache.set(monthKey, finalResult);

    return finalResult;
  }

  budgetAvailableForMonth(budget: Budget, date: Date): Balance {
    const values = this.getAllBudgetValuesForMonth(date);
    return values.get(budget.id)?.available ?? 0;
  }

  budgetActivityForMonth(budget: Budget, date: Date): Balance {
    const values = this.getAllBudgetValuesForMonth(date);
    return values.get(budget.id)?.activity ?? 0;
  }

  budgetAssignedForMonth(budget: Budget, date: Date): Balance {
    const values = this.getAllBudgetValuesForMonth(date);
    return values.get(budget.id)?.assigned ?? 0;
  }

  /**
   * Builds the payee -> budget map from existing transactions.
   * Transactions are sorted by date so the most recent budget wins.
   */
  buildPayeeBudgetMap() {
    this.payeeBudgetMap.clear();

    // Sort transactions by date (oldest first so newest overwrites)
    const sortedTransactions = [...this.transactions].sort((a, b) => {
      if (!a.date || !b.date) return 0;
      return a.date.getTime() - b.date.getTime();
    });

    sortedTransactions.forEach((t) => {
      if (t.payee && t.postings.length > 0 && t.postings[0].budget) {
        this.payeeBudgetMap.set(t.payee.id, t.postings[0].budget);
      }
    });
  }

  /**
   * Updates the payee -> budget mapping for a transaction.
   * Call this when a transaction is saved.
   */
  updatePayeeBudget(transaction: Transaction) {
    if (transaction.payee && transaction.postings.length > 0 && transaction.postings[0].budget) {
      this.payeeBudgetMap.set(transaction.payee.id, transaction.postings[0].budget);
    }
  }

  /**
   * Gets the last used budget for a payee, if any.
   */
  getLastBudgetForPayee(payeeId: string): Budget | undefined {
    return this.payeeBudgetMap.get(payeeId);
  }
}
