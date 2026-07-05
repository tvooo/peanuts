import { createId } from "@paralleldrive/cuid2";
import { endOfDay, startOfDay } from "date-fns";
import { runInAction } from "mobx";
import type { Ledger } from "@/models/Ledger";
import type { RecurringTemplate } from "@/models/RecurringTemplate";
import { Transaction, TransactionPosting } from "@/models/Transaction";

/**
 * Materialize recurring templates into transactions.
 *
 * For each template we generate every occurrence in the half-open range
 * `(lastGeneratedDate, horizon]`, where `horizon` is the first occurrence
 * strictly after today (the single upcoming instance the user should see).
 * `lastGeneratedDate` is the watermark / run log: the source of truth for what
 * has already been created. This makes the function idempotent — running it
 * repeatedly on the same day creates nothing new — and decouples generated
 * transactions from the template once created (editing or deleting a generated
 * transaction never regenerates it).
 *
 * See docs/recurring-transactions.md for the full design.
 */
export function processRecurringTemplates(ledger: Ledger, now: Date = new Date()) {
  runInAction(() => {
    let createdAny = false;

    for (const template of ledger.recurringTemplates) {
      // Horizon: the first occurrence strictly after today. Everything up to and
      // including today (backfill of missed occurrences) plus this single future
      // occurrence will be generated.
      const horizon = template.calculateNextOccurrence(endOfDay(now));
      if (!horizon) continue; // schedule exhausted

      const endDate = template.endDate ? startOfDay(template.endDate) : null;

      // Walk occurrences strictly after the watermark, up to the horizon.
      let cursor = template.lastGeneratedDate
        ? startOfDay(template.lastGeneratedDate)
        : // Start just before the first scheduled occurrence so it is included.
          startOfDay(new Date(template.startDate.getTime() - 24 * 60 * 60 * 1000));

      while (true) {
        const occ = template.calculateNextOccurrence(cursor);
        if (!occ || occ > horizon) break;
        if (endDate && occ > endDate) break;

        createTransactionFromTemplate(ledger, template, occ);
        template.lastGeneratedDate = occ;
        createdAny = true;
        cursor = occ;
      }
    }

    // Only mark the ledger dirty if we actually created something, so a plain
    // load with no new occurrences does not trigger a save.
    if (createdAny) {
      ledger.incrementVersion();
    }
  });
}

function createTransactionFromTemplate(
  ledger: Ledger,
  template: RecurringTemplate,
  date: Date
) {
  // Create posting
  const posting = new TransactionPosting({ ledger, id: createId() });
  posting.amount = template.amount;
  posting.budget = template.budget;
  posting.note = template.note;
  ledger.transactionPostings.push(posting);

  // Create transaction with date normalized to start of day
  const transaction = new Transaction({ ledger, id: createId() });
  transaction.date = startOfDay(date);
  transaction.account = template.account;
  transaction.payee = template.payee;
  transaction.postings.push(posting);
  transaction.recurringTemplateId = template.id;
  transaction.status = "open";
  ledger.transactions.push(transaction);

  console.log(
    `Created recurring transaction for ${template.account?.name} on ${transaction.date.toDateString()}`
  );
}
