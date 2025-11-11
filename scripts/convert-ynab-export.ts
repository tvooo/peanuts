#!/usr/bin/env tsx
/**
 * YNAB to Peanuts Converter
 *
 * Converts YNAB export files (.tsv format) to Peanuts JSON format
 *
 * Usage: tsx scripts/convert-ynab-export.ts <path-to-ynab-export-folder> <output-file.json>
 */

import * as fs from 'fs';
import * as path from 'path';
import cuid from 'cuid';

interface YNABRegisterRow {
  Account: string;
  Flag: string;
  Date: string;
  Payee: string;
  'Category Group/Category': string;
  'Category Group': string;
  Category: string;
  Memo: string;
  Outflow: string;
  Inflow: string;
  Cleared: string;
}

interface YNABPlanRow {
  Month: string;
  'Category Group/Category': string;
  'Category Group': string;
  Category: string;
  Assigned: string;
  Activity: string;
  Available: string;
}

interface PeanutsJSON {
  accounts: Array<{
    id: string;
    name: string;
    type: 'budget' | 'tracking';
  }>;
  budget_categories: Array<{
    id: string;
    name: string;
  }>;
  budgets: Array<{
    id: string;
    name: string;
    budget_category_id: string | null;
    is_to_be_budgeted: boolean;
  }>;
  payees: Array<{
    id: string;
    name: string;
  }>;
  transactions: Array<{
    id: string;
    account_id: string;
    transaction_posting_ids: string[];
    status: 'open' | 'cleared';
    date: string;
  }>;
  transaction_postings: Array<{
    id: string;
    budget_id: string | null;
    amount: number;
    note: string;
    payee_id: string | null;
  }>;
  recurring_transactions: Array<any>;
  assignments: Array<{
    id: string;
    date: string;
    budget_id: string;
    amount: number;
  }>;
  transfers: Array<{
    id: string;
    date: string;
    from_account_id: string;
    to_account_id: string;
    amount: number;
    from_status: 'open' | 'cleared';
    to_status: 'open' | 'cleared';
    note: string;
  }>;
}

function parseTSV(content: string): any[] {
  const lines = content.trim().split('\n');
  const headers = lines[0].split('\t').map(h => h.replace(/^"|"$/g, ''));

  return lines.slice(1).map(line => {
    const values = line.split('\t').map(v => v.replace(/^"|"$/g, ''));
    const row: any = {};
    headers.forEach((header, i) => {
      row[header] = values[i] || '';
    });
    return row;
  });
}

function parseYNABAmount(amount: string): number {
  // Convert "123,45€" to cents (12345)
  // Remove currency symbol and convert comma to dot
  const cleaned = amount.replace(/[€\s]/g, '').replace(',', '.');
  return Math.round(parseFloat(cleaned || '0') * 100);
}

function parseYNABDate(dateStr: string): Date {
  // Parse "dd.MM.yyyy" format
  const [day, month, year] = dateStr.split('.');
  return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
}

function parseYNABMonth(monthStr: string): Date {
  // Parse "Jan 2016" format
  const [monthName, year] = monthStr.split(' ');
  const months: Record<string, number> = {
    'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
    'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11
  };
  return new Date(parseInt(year), months[monthName], 1);
}

function convertYNABExport(registerPath: string, planPath: string): PeanutsJSON {
  const registerContent = fs.readFileSync(registerPath, 'utf-8');
  const planContent = fs.readFileSync(planPath, 'utf-8');

  const registerRows = parseTSV(registerContent) as YNABRegisterRow[];
  const planRows = parseTSV(planContent) as YNABPlanRow[];

  const result: PeanutsJSON = {
    accounts: [],
    budget_categories: [],
    budgets: [],
    payees: [],
    transactions: [],
    transaction_postings: [],
    recurring_transactions: [],
    assignments: [],
    transfers: [],
  };

  // Maps for deduplication
  const accountMap = new Map<string, string>();
  const categoryGroupMap = new Map<string, string>();
  const budgetMap = new Map<string, string>();
  const payeeMap = new Map<string, string>();
  const trackingAccounts = new Set<string>();

  // First pass: identify tracking accounts (off-budget)
  // Tracking accounts have transactions with no categories
  registerRows.forEach(row => {
    if (row.Account && !row.Category && !row['Category Group'] && !row.Payee.startsWith('Transfer :')) {
      trackingAccounts.add(row.Account);
    }
  });

  // Extract unique accounts
  registerRows.forEach(row => {
    if (row.Account && !accountMap.has(row.Account)) {
      const id = cuid();
      accountMap.set(row.Account, id);
      result.accounts.push({
        id,
        name: row.Account,
        type: trackingAccounts.has(row.Account) ? 'tracking' : 'budget',
      });
    }
  });

  // Extract unique category groups
  planRows.forEach(row => {
    if (row['Category Group'] && !categoryGroupMap.has(row['Category Group'])) {
      const id = cuid();
      categoryGroupMap.set(row['Category Group'], id);
      result.budget_categories.push({
        id,
        name: row['Category Group'],
      });
    }
  });

  // Create "To Be Budgeted" budget (Inflow)
  const inflowId = cuid();
  result.budgets.push({
    id: inflowId,
    name: 'To Be Budgeted',
    budget_category_id: null,
    is_to_be_budgeted: true,
  });
  budgetMap.set('__INFLOW__', inflowId);

  // Extract unique budgets/categories
  planRows.forEach(row => {
    if (row.Category && !budgetMap.has(row.Category)) {
      const id = cuid();
      const categoryGroupId = categoryGroupMap.get(row['Category Group']) || null;
      budgetMap.set(row.Category, id);
      result.budgets.push({
        id,
        name: row.Category,
        budget_category_id: categoryGroupId,
        is_to_be_budgeted: false,
      });
    }
  });

  // Extract unique payees
  registerRows.forEach(row => {
    if (row.Payee && !payeeMap.has(row.Payee)) {
      const id = cuid();
      payeeMap.set(row.Payee, id);
      result.payees.push({
        id,
        name: row.Payee,
      });
    }
  });

  // Convert transactions
  registerRows.forEach(row => {
    const accountId = accountMap.get(row.Account);
    if (!accountId) return;

    // Check if this is a transfer
    const isTransfer = row.Payee.startsWith('Transfer : ');

    if (isTransfer) {
      // Handle transfers
      const toAccountName = row.Payee.replace('Transfer : ', '');
      const toAccountId = accountMap.get(toAccountName);

      if (toAccountId) {
        const inflow = parseYNABAmount(row.Inflow);
        const outflow = parseYNABAmount(row.Outflow);
        const amount = inflow > 0 ? inflow : outflow;

        // Only create transfer once (from the outflow side)
        if (outflow > 0) {
          result.transfers.push({
            id: cuid(),
            date: parseYNABDate(row.Date).toISOString(),
            from_account_id: accountId,
            to_account_id: toAccountId,
            amount,
            from_status: row.Cleared === 'Cleared' ? 'cleared' : 'open',
            to_status: row.Cleared === 'Cleared' ? 'cleared' : 'open',
            note: row.Memo || '',
          });
        }
      }
    } else {
      // Handle regular transactions
      const postingId = cuid();
      const transactionId = cuid();

      const inflow = parseYNABAmount(row.Inflow);
      const outflow = parseYNABAmount(row.Outflow);

      // In Peanuts, negative is outflow, positive is inflow
      const amount = inflow > 0 ? inflow : -outflow;

      // Determine budget
      let budgetId: string | null = null;
      if (row.Category) {
        budgetId = budgetMap.get(row.Category) || null;
      } else if (inflow > 0) {
        // Inflow without category goes to "To Be Budgeted"
        budgetId = inflowId;
      }

      result.transaction_postings.push({
        id: postingId,
        budget_id: budgetId,
        amount,
        note: row.Memo || '',
        payee_id: payeeMap.get(row.Payee) || null,
      });

      result.transactions.push({
        id: transactionId,
        account_id: accountId,
        transaction_posting_ids: [postingId],
        status: row.Cleared === 'Cleared' ? 'cleared' : 'open',
        date: parseYNABDate(row.Date).toISOString(),
      });
    }
  });

  // Convert budget assignments (from Plan)
  planRows.forEach(row => {
    const assigned = parseYNABAmount(row.Assigned);
    if (assigned === 0) return;

    const budgetId = budgetMap.get(row.Category);
    if (!budgetId) return;

    result.assignments.push({
      id: cuid(),
      date: parseYNABMonth(row.Month).toISOString(),
      budget_id: budgetId,
      amount: assigned,
    });
  });

  return result;
}

// Main execution
const args = process.argv.slice(2);
if (args.length < 2) {
  console.error('Usage: tsx scripts/convert-ynab-export.ts <path-to-extracted-folder> <output.json>');
  console.error('');
  console.error('Example:');
  console.error('  tsx scripts/convert-ynab-export.ts ./ynab-export-temp output.json');
  process.exit(1);
}

const [inputFolder, outputFile] = args;

// Find Register and Plan files
const files = fs.readdirSync(inputFolder);
const registerFile = files.find(f => f.includes('Register.tsv'));
const planFile = files.find(f => f.includes('Plan.tsv'));

if (!registerFile || !planFile) {
  console.error('Error: Could not find Register.tsv and Plan.tsv in the input folder');
  process.exit(1);
}

const registerPath = path.join(inputFolder, registerFile);
const planPath = path.join(inputFolder, planFile);

console.log('Converting YNAB export...');
console.log(`  Register: ${registerFile}`);
console.log(`  Plan: ${planFile}`);

const result = convertYNABExport(registerPath, planPath);

fs.writeFileSync(outputFile, JSON.stringify(result, null, 2));

console.log(`\n✅ Conversion complete!`);
console.log(`   Output: ${outputFile}`);
console.log(`\n📊 Summary:`);
console.log(`   Accounts: ${result.accounts.length}`);
console.log(`   Budget Categories: ${result.budget_categories.length}`);
console.log(`   Budgets: ${result.budgets.length - 1} (+ 1 "To Be Budgeted")`);
console.log(`   Payees: ${result.payees.length}`);
console.log(`   Transactions: ${result.transactions.length}`);
console.log(`   Transfers: ${result.transfers.length}`);
console.log(`   Assignments: ${result.assignments.length}`);

console.log(`\n⚠️  Missing Features (not yet supported in Peanuts):`);
console.log(`   - Flags/colors on transactions`);
console.log(`   - Split transactions (multiple postings per transaction)`);
console.log(`   - Goals on budgets`);
console.log(`   - Reconciliation/balance assertions`);
console.log(`   - Scheduled/recurring transactions`);
console.log(`   - Budget notes`);
console.log(`   - Account notes`);
console.log(`   - Hidden/archived categories`);
console.log(`   - Multiple currencies`);
