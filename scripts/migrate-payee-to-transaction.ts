#!/usr/bin/env tsx

/**
 * Migration Script: Move Payee from TransactionPosting to Transaction
 *
 * This script migrates Peanuts Budget JSON files from the old format where
 * payee was stored on each TransactionPosting to the new format where payee
 * is stored on the Transaction itself.
 *
 * Usage:
 *   npm run migrate-payee <input-file.json> [output-file.json]
 *
 * If output-file is not specified, creates a backup with .bak extension
 * and overwrites the input file.
 *
 * Example:
 *   npm run migrate-payee my-budget.json
 *   npm run migrate-payee my-budget.json my-budget-migrated.json
 */

import fs from "node:fs";

interface TransactionPostingJSON {
  id: string;
  budget_id?: string;
  amount: number;
  note: string;
  payee_id?: string;
}

interface TransactionJSON {
  id: string;
  account_id?: string;
  payee_id?: string;
  transaction_posting_ids: string[];
  status: string;
  date: string;
  recurring_template_id?: string | null;
}

interface LedgerJSON {
  accounts: any[];
  budgets: any[];
  budget_categories: any[];
  payees: any[];
  transactions: TransactionJSON[];
  transaction_postings: TransactionPostingJSON[];
  transfers: any[];
  recurring_templates: any[];
  balance_assertions: any[];
}

function migratePayeeToTransaction(ledgerData: LedgerJSON): LedgerJSON {
  console.log("Starting migration...");

  // Create a map of posting ID to payee ID for quick lookup
  const postingPayeeMap = new Map<string, string>();

  // Extract payee_id from each posting
  for (const posting of ledgerData.transaction_postings) {
    if (posting.payee_id) {
      postingPayeeMap.set(posting.id, posting.payee_id);
    }
  }

  console.log(`Found ${postingPayeeMap.size} postings with payee information`);

  // Migrate transactions
  let transactionsMigrated = 0;
  let transactionsWithMultiplePayees = 0;

  for (const transaction of ledgerData.transactions) {
    // Get the first posting's payee
    const firstPostingId = transaction.transaction_posting_ids[0];
    if (firstPostingId) {
      const payeeId = postingPayeeMap.get(firstPostingId);

      if (payeeId) {
        // Check if all postings have the same payee (or no payee)
        const postingPayees = transaction.transaction_posting_ids
          .map((pid) => postingPayeeMap.get(pid))
          .filter(Boolean);

        const uniquePayees = new Set(postingPayees);

        if (uniquePayees.size > 1) {
          console.warn(
            `Warning: Transaction ${transaction.id} has multiple different payees across postings. ` +
              `Using payee from first posting (${payeeId}).`
          );
          transactionsWithMultiplePayees++;
        }

        // Set the payee on the transaction
        transaction.payee_id = payeeId;
        transactionsMigrated++;
      }
    }
  }

  console.log(`Migrated ${transactionsMigrated} transactions`);
  if (transactionsWithMultiplePayees > 0) {
    console.warn(
      `${transactionsWithMultiplePayees} transactions had conflicting payees across postings`
    );
  }

  // Remove payee_id from all postings
  let postingsUpdated = 0;
  for (const posting of ledgerData.transaction_postings) {
    if (posting.payee_id) {
      delete posting.payee_id;
      postingsUpdated++;
    }
  }

  console.log(`Removed payee_id from ${postingsUpdated} postings`);

  return ledgerData;
}

function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error("Error: No input file specified");
    console.log("\nUsage:");
    console.log("  npm run migrate-payee <input-file.json> [output-file.json]");
    console.log("\nExample:");
    console.log("  npm run migrate-payee my-budget.json");
    console.log("  npm run migrate-payee my-budget.json my-budget-migrated.json");
    process.exit(1);
  }

  const inputFile = args[0];
  let outputFile = args[1];

  // Check if input file exists
  if (!fs.existsSync(inputFile)) {
    console.error(`Error: Input file not found: ${inputFile}`);
    process.exit(1);
  }

  // If no output file specified, create backup and use input file as output
  if (!outputFile) {
    const backupFile = `${inputFile}.bak`;
    console.log(`Creating backup: ${backupFile}`);
    fs.copyFileSync(inputFile, backupFile);
    outputFile = inputFile;
  }

  console.log(`Reading ledger from: ${inputFile}`);

  // Read and parse JSON
  let ledgerData: LedgerJSON;
  try {
    const fileContents = fs.readFileSync(inputFile, "utf-8");
    ledgerData = JSON.parse(fileContents);
  } catch (error) {
    console.error(`Error reading or parsing JSON file: ${error}`);
    process.exit(1);
  }

  // Validate structure
  if (!ledgerData.transactions || !ledgerData.transaction_postings) {
    console.error("Error: Invalid ledger structure - missing transactions or transaction_postings");
    process.exit(1);
  }

  console.log(
    `Loaded ledger with ${ledgerData.transactions.length} transactions and ${ledgerData.transaction_postings.length} postings`
  );

  // Perform migration
  const migratedData = migratePayeeToTransaction(ledgerData);

  // Write output
  console.log(`Writing migrated ledger to: ${outputFile}`);
  try {
    fs.writeFileSync(outputFile, JSON.stringify(migratedData, null, 2), "utf-8");
  } catch (error) {
    console.error(`Error writing output file: ${error}`);
    process.exit(1);
  }

  console.log("\n✅ Migration completed successfully!");
  console.log(`\nSummary:`);
  console.log(`  Input file:  ${inputFile}`);
  console.log(`  Output file: ${outputFile}`);
  if (args[1] === undefined) {
    console.log(`  Backup file: ${inputFile}.bak`);
  }
}

main();
