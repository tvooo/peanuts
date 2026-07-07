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
  lastGeneratedDate: Date | null = null
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
  template.lastGeneratedDate = lastGeneratedDate ? startOfDay(lastGeneratedDate) : null;
  template.account = account;
  template.budget = budget;
  template.payee = payee;
  template.amount = -5000; // -50.00 (in cents)
  template.note = "Test recurring transaction";
  ledger.recurringTemplates.push(template);

  return { ledger, template, account };
}

const txnDates = (ledger: Ledger): Date[] =>
  ledger.transactions.map((t) => t.date!).sort((a, b) => a.getTime() - b.getTime());

describe("processRecurringTemplates", () => {
  describe("basic lifecycle", () => {
    it("creates exactly one upcoming transaction", () => {
      // "now" is Jan 10; next occurrence after today is Jan 15.
      const { ledger } = createTestLedger("FREQ=MONTHLY;BYMONTHDAY=15", new Date(2024, 0, 1));

      processRecurringTemplates(ledger, new Date(2024, 0, 10));

      expect(ledger.transactions.length).toBe(1);
      expect(isSameDay(ledger.transactions[0].date!, new Date(2024, 0, 15))).toBe(true);
      expect(ledger.transactions[0].recurringTemplateId).toBe("template-1");
    });

    it("advances the watermark to the generated occurrence", () => {
      const { ledger, template } = createTestLedger(
        "FREQ=MONTHLY;BYMONTHDAY=15",
        new Date(2024, 0, 1)
      );

      processRecurringTemplates(ledger, new Date(2024, 0, 10));

      expect(template.lastGeneratedDate).not.toBeNull();
      expect(isSameDay(template.lastGeneratedDate!, new Date(2024, 0, 15))).toBe(true);
    });
  });

  describe("idempotency (the regression)", () => {
    it("does NOT create a new transaction when run repeatedly on the same day", () => {
      const { ledger } = createTestLedger("FREQ=MONTHLY;BYMONTHDAY=15", new Date(2024, 0, 1));
      const now = new Date(2024, 0, 10);

      processRecurringTemplates(ledger, now);
      expect(ledger.transactions.length).toBe(1);

      // Re-run several times simulating repeated ledger loads on the same day.
      processRecurringTemplates(ledger, now);
      processRecurringTemplates(ledger, now);
      processRecurringTemplates(ledger, now);

      expect(ledger.transactions.length).toBe(1);
    });

    it("does not regenerate after the watermark has passed the next occurrence", () => {
      // Watermark already at Jan 15; today is Jan 12 so horizon is also Jan 15.
      const { ledger } = createTestLedger(
        "FREQ=MONTHLY;BYMONTHDAY=15",
        new Date(2024, 0, 1),
        new Date(2024, 0, 15)
      );

      processRecurringTemplates(ledger, new Date(2024, 0, 12));

      expect(ledger.transactions.length).toBe(0);
    });
  });

  describe("advancing over time", () => {
    it("creates the next occurrence once the previous one is due", () => {
      const { ledger, template } = createTestLedger(
        "FREQ=MONTHLY;BYMONTHDAY=15",
        new Date(2024, 0, 1)
      );

      // Jan 10: generates Jan 15.
      processRecurringTemplates(ledger, new Date(2024, 0, 10));
      expect(ledger.transactions.length).toBe(1);

      // Feb 1 (Jan 15 now in the past): generates Feb 15.
      processRecurringTemplates(ledger, new Date(2024, 1, 1));
      expect(ledger.transactions.length).toBe(2);
      expect(isSameDay(txnDates(ledger)[1], new Date(2024, 1, 15))).toBe(true);
      expect(isSameDay(template.lastGeneratedDate!, new Date(2024, 1, 15))).toBe(true);
    });
  });

  describe("backfill of missed occurrences", () => {
    it("creates all occurrences from start up to the next upcoming one", () => {
      // Start Jan 15; app first opened on Apr 1. Expect Jan, Feb, Mar (past/today)
      // plus Apr 15 (the single upcoming occurrence) = 4 transactions.
      const { ledger, template } = createTestLedger(
        "FREQ=MONTHLY;BYMONTHDAY=15",
        new Date(2024, 0, 15)
      );

      processRecurringTemplates(ledger, new Date(2024, 3, 1));

      const dates = txnDates(ledger);
      expect(dates.length).toBe(4);
      expect(isSameDay(dates[0], new Date(2024, 0, 15))).toBe(true);
      expect(isSameDay(dates[1], new Date(2024, 1, 15))).toBe(true);
      expect(isSameDay(dates[2], new Date(2024, 2, 15))).toBe(true);
      expect(isSameDay(dates[3], new Date(2024, 3, 15))).toBe(true);
      expect(isSameDay(template.lastGeneratedDate!, new Date(2024, 3, 15))).toBe(true);
    });
  });

  describe("biweekly recurrence (interval-based)", () => {
    it("respects startDate for interval calculation", () => {
      // Start Jan 8; biweekly Mondays => Jan 8, Jan 22, Feb 5, ...
      const { ledger } = createTestLedger("FREQ=WEEKLY;INTERVAL=2;BYDAY=MO", new Date(2024, 0, 8));

      // now = Jan 10: occurrences <= today are Jan 8; next upcoming is Jan 22.
      processRecurringTemplates(ledger, new Date(2024, 0, 10));

      const dates = txnDates(ledger);
      expect(dates.length).toBe(2);
      expect(isSameDay(dates[0], new Date(2024, 0, 8))).toBe(true);
      expect(isSameDay(dates[1], new Date(2024, 0, 22))).toBe(true); // NOT Jan 15
    });
  });

  describe("end date handling", () => {
    it("does not create occurrences after the end date", () => {
      const { ledger } = createTestLedger("FREQ=MONTHLY;BYMONTHDAY=15", new Date(2024, 0, 15));
      // End date Jan 20: only Jan 15 is valid, even though horizon would be Feb 15.
      ledger.recurringTemplates[0].endDate = new Date(2024, 0, 20);

      processRecurringTemplates(ledger, new Date(2024, 1, 1));

      expect(ledger.transactions.length).toBe(1);
      expect(isSameDay(ledger.transactions[0].date!, new Date(2024, 0, 15))).toBe(true);
    });
  });

  describe("user edits to generated transactions", () => {
    it("does not regenerate a deleted past occurrence", () => {
      const { ledger, template } = createTestLedger(
        "FREQ=MONTHLY;BYMONTHDAY=15",
        new Date(2024, 0, 1)
      );

      processRecurringTemplates(ledger, new Date(2024, 0, 10));
      expect(ledger.transactions.length).toBe(1);

      // User deletes the generated transaction. The watermark stays put.
      ledger.transactions.length = 0;
      ledger.transactionPostings.length = 0;

      // Re-run on the same day: the occurrence is at/behind the watermark, so it
      // is considered done and is NOT recreated.
      processRecurringTemplates(ledger, new Date(2024, 0, 10));
      expect(ledger.transactions.length).toBe(0);
      expect(isSameDay(template.lastGeneratedDate!, new Date(2024, 0, 15))).toBe(true);
    });
  });

  describe("transaction properties", () => {
    it("creates transaction with correct properties from template", () => {
      const { ledger } = createTestLedger("FREQ=MONTHLY;BYMONTHDAY=15", new Date(2024, 0, 1));

      processRecurringTemplates(ledger, new Date(2024, 0, 10));

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

    it("registers the posting in the ledger collection", () => {
      const { ledger } = createTestLedger("FREQ=MONTHLY;BYMONTHDAY=15", new Date(2024, 0, 1));

      processRecurringTemplates(ledger, new Date(2024, 0, 10));

      expect(ledger.transactionPostings.length).toBe(1);
    });
  });

  describe("pre-existing transactions", () => {
    it("does not double-generate when a matching transaction already exists", () => {
      // Simulates a freshly-migrated ledger: watermark seeded from the latest
      // existing transaction.
      const { ledger } = createTestLedger(
        "FREQ=MONTHLY;BYMONTHDAY=15",
        new Date(2024, 0, 1),
        new Date(2024, 0, 15)
      );

      const posting = new TransactionPosting({ id: "p-1", ledger });
      posting.amount = -5000;
      ledger.transactionPostings.push(posting);

      const transaction = new Transaction({ id: "t-1", ledger });
      transaction.date = new Date(2024, 0, 15);
      transaction.recurringTemplateId = "template-1";
      transaction.postings.push(posting);
      ledger.transactions.push(transaction);

      // now = Jan 12 so horizon is Jan 15, which equals the watermark -> nothing.
      processRecurringTemplates(ledger, new Date(2024, 0, 12));
      expect(ledger.transactions.length).toBe(1);
    });
  });
});
