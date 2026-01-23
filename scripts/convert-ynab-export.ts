#!/usr/bin/env tsx

/**
 * YNAB to Peanuts Converter
 *
 * Converts YNAB export files (.tsv format) to Peanuts JSON format.
 *
 * Usage: tsx scripts/convert-ynab-export.ts <path-to-ynab-export-folder> <output-file.json>
 *
 * Features:
 * - Imports accounts (budget and tracking types)
 * - Imports transactions including split transactions
 * - Imports transfers, including cross-type transfers with budget categories
 * - Imports budget categories and assignments
 *
 * Reconciliation:
 * YNAB handles overspending by automatically resetting negative category balances
 * at month-end and deducting from "To Be Budgeted". Peanuts does not do this.
 * To ensure imported data matches YNAB's final available amounts, this script
 * adds reconciliation assignments to adjust for any differences caused by
 * YNAB's overspending behavior.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { createId } from "@paralleldrive/cuid2";

interface YNABRegisterRow {
  Account: string;
  Flag: string;
  Date: string;
  Payee: string;
  "Category Group/Category": string;
  "Category Group": string;
  Category: string;
  Memo: string;
  Outflow: string;
  Inflow: string;
  Cleared: string;
}

interface YNABPlanRow {
  Month: string;
  "Category Group/Category": string;
  "Category Group": string;
  Category: string;
  Assigned: string;
  Activity: string;
  Available: string;
}

interface PeanutsJSON {
  accounts: Array<{
    id: string;
    name: string;
    type: "budget" | "tracking";
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
    is_archived: boolean;
  }>;
  payees: Array<{
    id: string;
    name: string;
  }>;
  transactions: Array<{
    id: string;
    account_id: string;
    payee_id: string | null;
    transaction_posting_ids: string[];
    status: "open" | "cleared";
    date: string;
  }>;
  transaction_postings: Array<{
    id: string;
    budget_id: string | null;
    amount: number;
    note: string;
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
    from_status: "open" | "cleared";
    to_status: "open" | "cleared";
    note: string;
    budget_id: string | null;
  }>;
}

function parseTSV(content: string): any[] {
  // Remove BOM and normalize line endings (Windows \r\n → \n)
  const normalizedContent = content
    .replace(/^\uFEFF/, "") // Remove BOM
    .replace(/\r\n/g, "\n") // Windows line endings
    .replace(/\r/g, "\n"); // Old Mac line endings

  const lines = normalizedContent.trim().split("\n");
  const headers = lines[0].split("\t").map((h) => h.replace(/^"|"$/g, ""));

  return lines.slice(1).map((line) => {
    const values = line.split("\t").map((v) => v.replace(/^"|"$/g, ""));
    const row: any = {};
    headers.forEach((header, i) => {
      row[header] = values[i] || "";
    });
    return row;
  });
}

function parseYNABAmount(amount: string): number {
  // Convert "123,45€" to cents (12345)
  // Remove currency symbol and convert comma to dot
  const cleaned = amount.replace(/[€\s]/g, "").replace(",", ".");
  return Math.round(parseFloat(cleaned || "0") * 100);
}

function parseYNABDate(dateStr: string): Date {
  // Parse "dd.MM.yyyy" format
  const [day, month, year] = dateStr.split(".");
  return new Date(parseInt(year, 10), parseInt(month, 10) - 1, parseInt(day, 10));
}

function parseYNABMonth(monthStr: string): Date {
  // Parse "Jan 2016" format
  const [monthName, year] = monthStr.split(" ");
  const months: Record<string, number> = {
    Jan: 0,
    Feb: 1,
    Mar: 2,
    Apr: 3,
    May: 4,
    Jun: 5,
    Jul: 6,
    Aug: 7,
    Sep: 8,
    Oct: 9,
    Nov: 10,
    Dec: 11,
  };
  return new Date(parseInt(year, 10), months[monthName], 1);
}

function convertYNABExport(registerPath: string, planPath: string): PeanutsJSON {
  const registerContent = fs.readFileSync(registerPath, "utf-8");
  const planContent = fs.readFileSync(planPath, "utf-8");

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
  registerRows.forEach((row) => {
    if (
      row.Account &&
      !row.Category &&
      !row["Category Group"] &&
      !row.Payee.startsWith("Transfer :")
    ) {
      trackingAccounts.add(row.Account);
    }
  });

  // Extract unique accounts
  registerRows.forEach((row) => {
    if (row.Account && !accountMap.has(row.Account)) {
      const id = createId();
      accountMap.set(row.Account, id);
      result.accounts.push({
        id,
        name: row.Account,
        type: trackingAccounts.has(row.Account) ? "tracking" : "budget",
      });
    }
  });

  // Extract unique category groups
  planRows.forEach((row) => {
    if (row["Category Group"] && !categoryGroupMap.has(row["Category Group"])) {
      const id = createId();
      categoryGroupMap.set(row["Category Group"], id);
      result.budget_categories.push({
        id,
        name: row["Category Group"],
      });
    }
  });

  // Create "To Be Budgeted" budget (Inflow)
  const inflowId = createId();
  result.budgets.push({
    id: inflowId,
    name: "To Be Budgeted",
    budget_category_id: null,
    is_to_be_budgeted: true,
    is_archived: false,
  });
  budgetMap.set("__INFLOW__", inflowId);

  // Extract unique budgets/categories
  // Use "Category Group/Category" as key to handle duplicate category names in different groups
  planRows.forEach((row) => {
    const fullKey = row["Category Group/Category"] || `${row["Category Group"]}: ${row.Category}`;
    if (row.Category && !budgetMap.has(fullKey)) {
      const id = createId();
      const categoryGroupId = categoryGroupMap.get(row["Category Group"]) || null;
      // YNAB "Hidden Categories" group contains archived budgets
      const isArchived = row["Category Group"] === "Hidden Categories";
      budgetMap.set(fullKey, id);
      result.budgets.push({
        id,
        name: row.Category,
        budget_category_id: categoryGroupId,
        is_to_be_budgeted: false,
        is_archived: isArchived,
      });
    }
  });

  // Extract unique payees
  registerRows.forEach((row) => {
    if (row.Payee && !payeeMap.has(row.Payee)) {
      const id = createId();
      payeeMap.set(row.Payee, id);
      result.payees.push({
        id,
        name: row.Payee,
      });
    }
  });

  // Group consecutive rows that form split transactions
  // Split transactions have the same account, date, and payee
  const transactionGroups: YNABRegisterRow[][] = [];
  let currentGroup: YNABRegisterRow[] = [];

  for (let i = 0; i < registerRows.length; i++) {
    const row = registerRows[i];
    const prevRow = i > 0 ? registerRows[i - 1] : null;

    // Check if this row continues a split transaction
    // Split transactions must have matching account, date, payee AND contain "Split (x/y)" in memo
    const isContinuation =
      prevRow &&
      row.Account === prevRow.Account &&
      row.Date === prevRow.Date &&
      row.Payee === prevRow.Payee &&
      !row.Payee.startsWith("Transfer :") && // Transfers are never split
      /Split \(\d+\/\d+\)/.test(row.Memo); // Must have "Split (x/y)" pattern in memo

    if (isContinuation) {
      // Add to current group
      currentGroup.push(row);
    } else {
      // Start new group
      if (currentGroup.length > 0) {
        transactionGroups.push(currentGroup);
      }
      currentGroup = [row];
    }
  }

  // Don't forget the last group
  if (currentGroup.length > 0) {
    transactionGroups.push(currentGroup);
  }

  // Convert transaction groups
  let splitCount = 0;
  transactionGroups.forEach((group) => {
    const firstRow = group[0];
    const accountId = accountMap.get(firstRow.Account);
    if (!accountId) return;

    // Check if this is a transfer
    const isTransfer = firstRow.Payee.startsWith("Transfer : ");
    const toAccountName = isTransfer ? firstRow.Payee.replace("Transfer : ", "") : null;
    const toAccountId = toAccountName ? accountMap.get(toAccountName) : null;

    // Check if this is a cross-type transfer (budget ↔ tracking)
    const isCrossTypeTransfer =
      isTransfer && trackingAccounts.has(firstRow.Account) !== trackingAccounts.has(toAccountName!);

    if (isTransfer) {
      // Handle all transfers
      if (toAccountId) {
        const inflow = parseYNABAmount(firstRow.Inflow);
        const outflow = parseYNABAmount(firstRow.Outflow);
        const amount = inflow > 0 ? inflow : outflow;

        // For cross-type transfers, get the budget from the category
        let transferBudgetId: string | null = null;
        if (isCrossTypeTransfer && firstRow.Category) {
          const fullKey =
            firstRow["Category Group/Category"] ||
            `${firstRow["Category Group"]}: ${firstRow.Category}`;
          transferBudgetId = budgetMap.get(fullKey) || null;
        } else if (isCrossTypeTransfer && firstRow["Category Group"] === "Inflow") {
          // Inflows from tracking accounts go to "To Be Budgeted"
          transferBudgetId = inflowId;
        }

        // Only create transfer once:
        // - Same-type transfers: from outflow side only
        // - Cross-type transfers: from budget account side only (which has the category in YNAB)
        const shouldCreateTransfer =
          (!isCrossTypeTransfer && outflow > 0) ||
          (isCrossTypeTransfer && !trackingAccounts.has(firstRow.Account));

        if (shouldCreateTransfer) {
          result.transfers.push({
            id: createId(),
            date: parseYNABDate(firstRow.Date).toISOString(),
            from_account_id: inflow > 0 ? toAccountId : accountId,
            to_account_id: inflow > 0 ? accountId : toAccountId,
            amount,
            from_status:
              firstRow.Cleared === "Cleared" || firstRow.Cleared === "Reconciled"
                ? "cleared"
                : "open",
            to_status:
              firstRow.Cleared === "Cleared" || firstRow.Cleared === "Reconciled"
                ? "cleared"
                : "open",
            note: firstRow.Memo || "",
            budget_id: transferBudgetId,
          });
        }
      }
    } else {
      // Handle regular transactions (including splits)
      const transactionId = createId();
      const postingIds: string[] = [];

      // Create a posting for each row in the group
      group.forEach((row) => {
        const postingId = createId();
        postingIds.push(postingId);

        const inflow = parseYNABAmount(row.Inflow);
        const outflow = parseYNABAmount(row.Outflow);

        // In Peanuts, negative is outflow, positive is inflow
        const amount = inflow > 0 ? inflow : -outflow;

        // Determine budget
        let budgetId: string | null = null;
        if (row["Category Group"] === "Inflow") {
          // YNAB income transactions (Category Group "Inflow") go to "To Be Budgeted"
          budgetId = inflowId;
        } else if (row.Category) {
          const fullKey =
            row["Category Group/Category"] || `${row["Category Group"]}: ${row.Category}`;
          budgetId = budgetMap.get(fullKey) || null;
        } else if (inflow > 0) {
          // Fallback: inflow without category goes to "To Be Budgeted"
          budgetId = inflowId;
        }

        result.transaction_postings.push({
          id: postingId,
          budget_id: budgetId,
          amount,
          note: row.Memo || "",
        });
      });

      result.transactions.push({
        id: transactionId,
        account_id: accountId,
        payee_id: payeeMap.get(firstRow.Payee) || null,
        transaction_posting_ids: postingIds,
        status:
          firstRow.Cleared === "Cleared" || firstRow.Cleared === "Reconciled" ? "cleared" : "open",
        date: parseYNABDate(firstRow.Date).toISOString(),
      });

      if (group.length > 1) {
        splitCount++;
      }
    }
  });

  console.log(`Found ${splitCount} split transactions`);

  // Convert budget assignments (from Plan)
  planRows.forEach((row) => {
    const assigned = parseYNABAmount(row.Assigned);
    if (assigned === 0) return;

    const fullKey = row["Category Group/Category"] || `${row["Category Group"]}: ${row.Category}`;
    const budgetId = budgetMap.get(fullKey);
    if (!budgetId) return;

    result.assignments.push({
      id: createId(),
      date: parseYNABMonth(row.Month).toISOString(),
      budget_id: budgetId,
      amount: assigned,
    });
  });

  // Analysis: Compare YNAB "Available" amounts with what Peanuts calculates
  // Note: YNAB resets negative category balances at month-end, deducting from "To Be Budgeted".
  // Peanuts does NOT do this, so category balances may differ. This is expected behavior.
  // We log the differences but do NOT adjust assignments, as that would incorrectly deplete TBB.
  const latestYnabAvailable = new Map<string, number>();
  const latestYnabMonth = new Map<string, string>();

  // Get the latest available amount for each category from YNAB
  // Use "Category Group/Category" as key to handle duplicate category names in different groups
  planRows.forEach((row) => {
    if (!row.Category) return;

    const fullKey = row["Category Group/Category"] || `${row["Category Group"]}: ${row.Category}`;
    const budgetId = budgetMap.get(fullKey);
    if (!budgetId) return;

    const available = parseYNABAmount(row.Available || "0");
    latestYnabAvailable.set(budgetId, available);
    latestYnabMonth.set(budgetId, row.Month);
  });

  // Build a set of posting IDs from future transactions (to exclude from comparison)
  // Future = after today. YNAB's "Available" column excludes future scheduled transactions.
  const today = new Date();
  today.setHours(23, 59, 59, 999); // End of today
  const futurePostingIds = new Set<string>();
  const futureTransferIds = new Set<string>();

  result.transactions.forEach((t) => {
    const txDate = new Date(t.date);
    if (txDate > today) {
      t.transaction_posting_ids.forEach((id) => {
        futurePostingIds.add(id);
      });
    }
  });

  result.transfers.forEach((t) => {
    const txDate = new Date(t.date);
    if (txDate > today) {
      futureTransferIds.add(t.id);
    }
  });

  console.log(
    `\n📅 Excluding ${futurePostingIds.size} postings from ${result.transactions.filter((t) => new Date(t.date) > today).length} future transactions from comparison`
  );

  // Calculate what Peanuts would show as available for each budget
  const differences: Array<{
    budgetId: string;
    budgetName: string;
    ynabAvailable: number;
    peanutsAvailable: number;
    difference: number;
    month: string;
  }> = [];

  for (const [budgetId, ynabAvailable] of latestYnabAvailable) {
    // Skip "To Be Budgeted" - it will balance out automatically
    if (budgetId === inflowId) continue;

    // Sum all assignments for this budget
    const totalAssigned = result.assignments
      .filter((a) => a.budget_id === budgetId)
      .reduce((sum, a) => sum + a.amount, 0);

    // Sum all transaction postings for this budget (excluding future transactions)
    const totalActivity = result.transaction_postings
      .filter((p) => p.budget_id === budgetId && !futurePostingIds.has(p.id))
      .reduce((sum, p) => sum + p.amount, 0);

    // Sum all transfer activity for this budget (cross-type transfers, excluding future)
    const transferActivity = result.transfers
      .filter((t) => t.budget_id === budgetId && !futureTransferIds.has(t.id))
      .reduce((sum, t) => {
        // Find account types
        const fromAccount = result.accounts.find((a) => a.id === t.from_account_id);
        const toAccount = result.accounts.find((a) => a.id === t.to_account_id);
        if (fromAccount?.type === toAccount?.type) return sum; // Same type, no budget impact
        // Money entering budget system = positive, leaving = negative
        return sum + (toAccount?.type === "budget" ? t.amount : -t.amount);
      }, 0);

    const peanutsAvailable = totalAssigned + totalActivity + transferActivity;
    const difference = ynabAvailable - peanutsAvailable;

    // Only reconcile if difference is significant (> 1 cent, to avoid floating point issues)
    if (Math.abs(difference) > 1) {
      const monthStr = latestYnabMonth.get(budgetId)!;
      const budgetName = result.budgets.find((b) => b.id === budgetId)?.name || "Unknown";

      differences.push({
        budgetId,
        budgetName,
        ynabAvailable,
        peanutsAvailable,
        difference,
        month: monthStr,
      });
    }
  }

  // Print and reconcile differences
  if (differences.length > 0) {
    console.log(`\n📊 Reconciling category balance differences (YNAB vs Peanuts):`);
    console.log(`   Note: These differences are due to YNAB's overspending reset behavior.`);
    console.log(`   YNAB resets negative balances at month-end; Peanuts carries them forward.`);
    console.log(`   Adding reconciliation assignments to match YNAB's available amounts.\n`);

    differences
      .sort((a, b) => Math.abs(b.difference) - Math.abs(a.difference))
      .forEach((d) => {
        const sign = d.difference > 0 ? "+" : "";
        const monthDate = parseYNABMonth(d.month).toISOString();

        // Check if there's already an assignment for this budget in this month
        const existingAssignment = result.assignments.find(
          (a) => a.budget_id === d.budgetId && a.date === monthDate
        );

        if (existingAssignment) {
          // Adjust the existing assignment
          existingAssignment.amount += d.difference;
          console.log(
            `   ${d.budgetName}: ${sign}${(d.difference / 100).toFixed(2)}€ ` +
              `(adjusted existing ${d.month} assignment)`
          );
        } else {
          // Create a new reconciliation assignment
          result.assignments.push({
            id: createId(),
            date: monthDate,
            budget_id: d.budgetId,
            amount: d.difference,
          });
          console.log(
            `   ${d.budgetName}: ${sign}${(d.difference / 100).toFixed(2)}€ ` +
              `(new ${d.month} assignment)`
          );
        }
      });

    const totalDiff = differences.reduce((sum, d) => sum + d.difference, 0);
    console.log(
      `\n   Total reconciled: ${(totalDiff / 100).toFixed(2)}€ across ${differences.length} categories`
    );
  }

  return result;
}

// Main execution
const args = process.argv.slice(2);
if (args.length < 2) {
  console.error(
    "Usage: tsx scripts/convert-ynab-export.ts <path-to-extracted-folder> <output.json>"
  );
  console.error("");
  console.error("Example:");
  console.error("  tsx scripts/convert-ynab-export.ts ./ynab-export-temp output.json");
  process.exit(1);
}

const [inputFolder, outputFile] = args;

// Find Register and Plan files
const files = fs.readdirSync(inputFolder);
const registerFile = files.find((f) => f.includes("Register.tsv"));
const planFile = files.find((f) => f.includes("Plan.tsv"));

if (!registerFile || !planFile) {
  console.error("Error: Could not find Register.tsv and Plan.tsv in the input folder");
  process.exit(1);
}

const registerPath = path.join(inputFolder, registerFile);
const planPath = path.join(inputFolder, planFile);

console.log("Converting YNAB export...");
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
console.log(`   - Goals on budgets`);
console.log(`   - Reconciliation/balance assertions`);
console.log(`   - Scheduled/recurring transactions`);
console.log(`   - Budget notes`);
console.log(`   - Account notes`);
console.log(`   - Multiple currencies`);
