import { isSameDay, startOfDay } from "date-fns";
import { describe, expect, it } from "vitest";
import { Account } from "@/models/Account";
import { Budget } from "@/models/Budget";
import { Ledger } from "@/models/Ledger";
import { Payee } from "@/models/Payee";
import { RecurringTemplate } from "@/models/RecurringTemplate";
import { Transaction, TransactionPosting } from "@/models/Transaction";
import { processRecurringTemplates } from "./recurringTransactions";

// Helper to create a fully configured ledger with a recurring template
function createTestLedger(
  rruleString: string,
  startDate: Date,
  nextScheduledDate?: Date
): { ledger: Ledger; template: RecurringTemplate; account: Account } {
  const ledger = new Ledger();

  // Create required entities
  const account = new Account({ id: "acc-1", ledger });
  account.name = "Test Account";
  ledger.accounts.push(account);

  const budget = new Budget({ id: "budget-1", ledger });
  budget.name = "Test Budget";
  ledger._budgets.push(budget);

  const payee = new Payee({ id: "payee-1", ledger });
  payee.name = "Test Payee";
  ledger.payees.push(payee);

  // Create recurring template
  const template = new RecurringTemplate({ id: "template-1", ledger });
  template.rruleString = rruleString;
  template.startDate = startOfDay(startDate);
  template.nextScheduledDate = startOfDay(nextScheduledDate || startDate);
  template.account = account;
  template.budget = budget;
  template.payee = payee;
  template.amount = -5000; // -50.00 (in cents)
  template.note = "Test recurring transaction";
  ledger.recurringTemplates.push(template);

  return { ledger, template, account };
}

describe("processRecurringTemplates", () => {
  describe("basic lifecycle", () => {
    it("creates a transaction at nextScheduledDate", () => {
      const jan15 = new Date(2024, 0, 15);
      const { ledger } = createTestLedger(
        "FREQ=MONTHLY;BYMONTHDAY=15",
        new Date(2024, 0, 1),
        jan15
      );

      expect(ledger.transactions.length).toBe(0);

      processRecurringTemplates(ledger);

      expect(ledger.transactions.length).toBe(1);
      expect(isSameDay(ledger.transactions[0].date!, jan15)).toBe(true);
      expect(ledger.transactions[0].recurringTemplateId).toBe("template-1");
    });

    it("advances nextScheduledDate after creating a transaction", () => {
      const jan15 = new Date(2024, 0, 15);
      const { ledger, template } = createTestLedger(
        "FREQ=MONTHLY;BYMONTHDAY=15",
        new Date(2024, 0, 1),
        jan15
      );

      processRecurringTemplates(ledger);

      // nextScheduledDate should now be Feb 15
      const expectedNext = new Date(2024, 1, 15);
      expect(isSameDay(template.nextScheduledDate, expectedNext)).toBe(true);
    });

    it("does not create duplicate transactions for the same scheduled date", () => {
      const jan15 = new Date(2024, 0, 15);
      const { ledger, template } = createTestLedger(
        "FREQ=MONTHLY;BYMONTHDAY=15",
        new Date(2024, 0, 1),
        jan15
      );

      // First run - should create transaction and advance nextScheduledDate
      processRecurringTemplates(ledger);
      expect(ledger.transactions.length).toBe(1);
      const _nextAfterFirstRun = template.nextScheduledDate;

      // Reset nextScheduledDate to the same date as the existing transaction
      // to simulate re-processing the same date (e.g., after reload without save)
      template.nextScheduledDate = jan15;

      // Second run - should NOT create another transaction because one already exists
      processRecurringTemplates(ledger);
      expect(ledger.transactions.length).toBe(1);
    });
  });

  describe("multiple occurrences lifecycle", () => {
    it("creates next transaction after first one is processed", () => {
      const jan15 = new Date(2024, 0, 15);
      const { ledger, template } = createTestLedger(
        "FREQ=MONTHLY;BYMONTHDAY=15",
        new Date(2024, 0, 1),
        jan15
      );

      // First run - creates Jan 15 transaction
      processRecurringTemplates(ledger);
      expect(ledger.transactions.length).toBe(1);
      expect(isSameDay(ledger.transactions[0].date!, jan15)).toBe(true);

      // Verify nextScheduledDate was advanced to Feb 15
      expect(isSameDay(template.nextScheduledDate, new Date(2024, 1, 15))).toBe(true);

      // Second run - should create Feb 15 transaction
      processRecurringTemplates(ledger);
      expect(ledger.transactions.length).toBe(2);
      expect(isSameDay(ledger.transactions[1].date!, new Date(2024, 1, 15))).toBe(true);

      // Verify nextScheduledDate was advanced to Mar 15
      expect(isSameDay(template.nextScheduledDate, new Date(2024, 2, 15))).toBe(true);
    });
  });

  describe("biweekly recurrence (interval-based)", () => {
    it("creates transactions at correct 2-week intervals", () => {
      const jan1 = new Date(2024, 0, 1); // Monday
      const { ledger, template } = createTestLedger("FREQ=WEEKLY;INTERVAL=2;BYDAY=MO", jan1, jan1);

      // First run - creates Jan 1 transaction
      processRecurringTemplates(ledger);
      expect(ledger.transactions.length).toBe(1);
      expect(isSameDay(ledger.transactions[0].date!, jan1)).toBe(true);

      // Verify nextScheduledDate was advanced to Jan 15 (2 weeks later)
      expect(isSameDay(template.nextScheduledDate, new Date(2024, 0, 15))).toBe(true);

      // Second run - creates Jan 15 transaction
      processRecurringTemplates(ledger);
      expect(ledger.transactions.length).toBe(2);
      expect(isSameDay(ledger.transactions[1].date!, new Date(2024, 0, 15))).toBe(true);

      // Verify nextScheduledDate was advanced to Jan 29 (2 more weeks)
      expect(isSameDay(template.nextScheduledDate, new Date(2024, 0, 29))).toBe(true);
    });

    it("respects startDate for interval calculation", () => {
      // Start on Jan 8 (second Monday of the month)
      const jan8 = new Date(2024, 0, 8);
      const { ledger, template } = createTestLedger("FREQ=WEEKLY;INTERVAL=2;BYDAY=MO", jan8, jan8);

      // First run - creates Jan 8 transaction
      processRecurringTemplates(ledger);
      expect(ledger.transactions.length).toBe(1);

      // Verify nextScheduledDate is Jan 22 (NOT Jan 15!)
      expect(isSameDay(template.nextScheduledDate, new Date(2024, 0, 22))).toBe(true);
    });
  });

  describe("end date handling", () => {
    it("does not create transactions after end date", () => {
      const jan15 = new Date(2024, 0, 15);
      const { ledger, template } = createTestLedger(
        "FREQ=MONTHLY;BYMONTHDAY=15",
        new Date(2024, 0, 1),
        jan15
      );

      // Set end date to Jan 20 (before Feb 15)
      template.endDate = new Date(2024, 0, 20);

      // First run - creates Jan 15 transaction (before end date)
      processRecurringTemplates(ledger);
      expect(ledger.transactions.length).toBe(1);

      // Now nextScheduledDate is Feb 15, which is after end date
      // Second run - should NOT create another transaction
      processRecurringTemplates(ledger);
      expect(ledger.transactions.length).toBe(1);
    });
  });

  describe("future instance detection", () => {
    it("skips creation if a transaction already exists at nextScheduledDate", () => {
      const jan15 = new Date(2024, 0, 15);
      const { ledger } = createTestLedger(
        "FREQ=MONTHLY;BYMONTHDAY=15",
        new Date(2024, 0, 1),
        jan15
      );

      // Manually create a transaction at nextScheduledDate
      const posting = new TransactionPosting({ id: "p-1", ledger });
      posting.amount = -5000;
      ledger.transactionPostings.push(posting);

      const transaction = new Transaction({ id: "t-1", ledger });
      transaction.date = jan15;
      transaction.recurringTemplateId = "template-1";
      transaction.postings.push(posting);
      ledger.transactions.push(transaction);

      // Run processing - should NOT create another transaction
      processRecurringTemplates(ledger);
      expect(ledger.transactions.length).toBe(1);
    });

    it("skips creation if a transaction exists AFTER nextScheduledDate", () => {
      const jan15 = new Date(2024, 0, 15);
      const { ledger } = createTestLedger(
        "FREQ=MONTHLY;BYMONTHDAY=15",
        new Date(2024, 0, 1),
        jan15
      );

      // Manually create a transaction AFTER nextScheduledDate (e.g., user moved it)
      const posting = new TransactionPosting({ id: "p-1", ledger });
      posting.amount = -5000;
      ledger.transactionPostings.push(posting);

      const transaction = new Transaction({ id: "t-1", ledger });
      transaction.date = new Date(2024, 0, 20); // 5 days after scheduled
      transaction.recurringTemplateId = "template-1";
      transaction.postings.push(posting);
      ledger.transactions.push(transaction);

      // Run processing - should NOT create another transaction
      processRecurringTemplates(ledger);
      expect(ledger.transactions.length).toBe(1);
    });
  });

  describe("transaction properties", () => {
    it("creates transaction with correct properties from template", () => {
      const jan15 = new Date(2024, 0, 15);
      const { ledger } = createTestLedger(
        "FREQ=MONTHLY;BYMONTHDAY=15",
        new Date(2024, 0, 1),
        jan15
      );

      processRecurringTemplates(ledger);

      const transaction = ledger.transactions[0];
      expect(transaction.account?.id).toBe("acc-1");
      expect(transaction.payee?.id).toBe("payee-1");
      expect(transaction.status).toBe("open");
      expect(transaction.recurringTemplateId).toBe("template-1");
      expect(transaction.postings.length).toBe(1);
      expect(transaction.postings[0].amount).toBe(-5000);
      expect(transaction.postings[0].budget?.id).toBe("budget-1");
      expect(transaction.postings[0].note).toBe("Test recurring transaction");
    });
  });
});
