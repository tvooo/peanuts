import { describe, expect, it } from "vitest";
import { Account } from "./Account";
import { Budget } from "./Budget";
import { Ledger } from "./Ledger";
import { Payee } from "./Payee";
import { RecurringTemplate } from "./RecurringTemplate";
import { Transaction, TransactionPosting } from "./Transaction";

function addPayee(ledger: Ledger, name: string, importNames: string[] = []) {
  const payee = new Payee({ ledger, id: null });
  payee.name = name;
  payee.importNames = importNames;
  ledger.payees.push(payee);
  return payee;
}

function addTransaction(
  ledger: Ledger,
  account: Account,
  opts: { date: Date; amount: number; payee: Payee; budget?: Budget }
) {
  const posting = new TransactionPosting({ ledger, id: null });
  posting.amount = opts.amount;
  posting.budget = opts.budget ?? null;
  ledger.transactionPostings.push(posting);
  const transaction = new Transaction({ ledger, id: null });
  transaction.account = account;
  transaction.date = opts.date;
  transaction.payee = opts.payee;
  transaction.postings.push(posting);
  ledger.transactions.push(transaction);
  return transaction;
}

describe("mergePayees", () => {
  it("repoints usages, moves import aliases, and deletes the sources", () => {
    const ledger = new Ledger();
    const account = new Account({ ledger, id: null });
    ledger.accounts.push(account);
    const budget = new Budget({ ledger, id: null });
    ledger._budgets.push(budget);

    const target = addPayee(ledger, "Starbucks");
    const source1 = addPayee(ledger, "STARBUCKS 1234 BERLIN", ["STARBUCKS COFFEE 1234"]);
    const source2 = addPayee(ledger, "Starbucks Hbf");
    const other = addPayee(ledger, "REWE");

    const t1 = addTransaction(ledger, account, {
      date: new Date(2025, 0, 1),
      amount: -500,
      payee: source1,
      budget,
    });
    const t2 = addTransaction(ledger, account, {
      date: new Date(2025, 0, 2),
      amount: -300,
      payee: other,
    });
    const template = new RecurringTemplate({ ledger, id: null });
    template.payee = source2;
    ledger.recurringTemplates.push(template);

    ledger.mergePayees(target, [source1, source2]);

    expect(t1.payee).toBe(target);
    expect(t2.payee).toBe(other);
    expect(template.payee).toBe(target);
    expect(target.importNames).toEqual([
      "STARBUCKS 1234 BERLIN",
      "STARBUCKS COFFEE 1234",
      "Starbucks Hbf",
    ]);
    expect(ledger.payees).toEqual([target, other]);
    // The budget suggestion follows the merged transactions
    expect(ledger.getLastBudgetForPayee(target.id)).toBe(budget);
    expect(ledger.getLastBudgetForPayee(source1.id)).toBeUndefined();
  });

  it("ignores the target when included in the sources", () => {
    const ledger = new Ledger();
    const target = addPayee(ledger, "Starbucks");
    const source = addPayee(ledger, "Starbucks Hbf");

    ledger.mergePayees(target, [target, source]);

    expect(ledger.payees).toEqual([target]);
    expect(target.importNames).toEqual(["Starbucks Hbf"]);
  });
});
