import { Ledger } from "@/models/Ledger";
import { RecurringTemplate } from "@/models/RecurringTemplate";
import { Transaction, TransactionPosting } from "@/models/Transaction";
import cuid from "cuid";
import { isAfter, isSameDay, startOfDay } from "date-fns";
import { runInAction } from "mobx";

export function processRecurringTemplates(ledger: Ledger) {
  console.log("Processing recurring templates...");
  const today = startOfDay(new Date());

  runInAction(() => {
    for (const template of ledger.recurringTemplates) {
      // Normalize nextScheduledDate to start of day
      template.nextScheduledDate = startOfDay(template.nextScheduledDate);

      // Check if we have a transaction scheduled for nextScheduledDate or later
      const hasFutureInstance = ledger.transactions.some(
        t => t.recurringTemplateId === template.id &&
             t.date &&
             (isSameDay(t.date, template.nextScheduledDate) || isAfter(t.date, template.nextScheduledDate))
      );

      // If no future instance exists, create one
      if (!hasFutureInstance) {
        // Check end date
        if (template.endDate && isAfter(template.nextScheduledDate, startOfDay(template.endDate))) {
          continue; // Template has ended
        }

        // Create transaction at nextScheduledDate
        createTransactionFromTemplate(ledger, template);

        // Advance nextScheduledDate to the occurrence AFTER the one we just created
        const newNextDate = template.calculateNextOccurrence(template.nextScheduledDate);
        template.nextScheduledDate = startOfDay(newNextDate);
      }
    }
  });
}

function createTransactionFromTemplate(ledger: Ledger, template: RecurringTemplate) {
  // Create posting
  const posting = new TransactionPosting({ ledger, id: cuid() });
  posting.amount = template.amount;
  posting.budget = template.budget;
  posting.payee = template.payee;
  posting.note = template.note;
  ledger.transactionPostings.push(posting);

  // Create transaction with date normalized to start of day
  const transaction = new Transaction({ ledger, id: cuid() });
  transaction.date = startOfDay(template.nextScheduledDate);
  transaction.account = template.account;
  transaction.postings.push(posting);
  transaction.recurringTemplateId = template.id;
  transaction.status = "open";
  ledger.transactions.push(transaction);

  console.log(`Created recurring transaction for ${template.account?.name} on ${transaction.date.toDateString()}`);
}
