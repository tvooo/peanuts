# Peanuts Scripts

This directory contains utility scripts for Peanuts Budget.

## Migration Scripts

### Payee Migration (migrate-payee-to-transaction.ts)

Migrates Peanuts Budget JSON files from the old format where `payee` was stored on each `TransactionPosting` to the new format where `payee` is stored on the `Transaction` itself.

**Usage:**
```bash
npm run migrate-payee <input-file.json> [output-file.json]
```

If output-file is not specified, creates a backup with `.bak` extension and overwrites the input file.

**Example:**
```bash
# Migrate in-place (creates backup)
npm run migrate-payee my-budget.json

# Migrate to new file
npm run migrate-payee my-budget.json my-budget-migrated.json
```

**What it does:**
- Takes the `payee_id` from the first posting of each transaction
- Moves it to the transaction's `payee_id` field
- Removes `payee_id` from all postings
- Warns if a transaction has postings with different payees

---

## YNAB to Peanuts Converter

This script converts YNAB (You Need A Budget) export files to the Peanuts JSON format.

## Usage

1. Export your budget from YNAB (File → Export Budget Data)
2. Extract the ZIP file to a folder
3. Run the conversion script:

```bash
npx tsx scripts/convert-ynab-export.ts <extracted-folder> <output.json>
```

### Example

```bash
# Extract the YNAB zip file
unzip "YNAB Export - My Budget.zip" -d ynab-export

# Convert to Peanuts format
npx tsx scripts/convert-ynab-export.ts ynab-export my-peanuts-budget.json

# Clean up
rm -rf ynab-export
```

## What Gets Converted

### ✅ Fully Supported
- **Accounts** - On-budget accounts become "budget" type, off-budget accounts become "tracking" type
- **Budget Categories** - Mapped to Peanuts budget categories
- **Budgets/Categories** - Each YNAB category becomes a Peanuts budget
- **Payees** - All payees are preserved
- **Transactions** - Regular income/expense transactions, including future-dated scheduled transactions
- **Transfers** - Inter-account transfers are detected and converted, including cross-type transfers (budget ↔ tracking) with budget categories
- **Budget Assignments** - Monthly budget allocations from the Plan file
- **Cleared Status** - Transaction cleared/reconciled/uncleared status (reconciled and cleared are treated the same)
- **Dates** - All dates are preserved
- **Amounts** - Converted from euros to cents (internal format)
- **Memos** - Transaction memos/notes

### ⚠️ Partially Supported
- **"To Be Budgeted"** - Created automatically, inflows without categories go here
- **Inflows** - Treated as positive amounts (income)
- **Outflows** - Treated as negative amounts (expenses)

### ❌ Not Supported (Not in YNAB Export)
- **Budget Goals** - Goal targets, types, and progress are not included in the export
- **Reconciliation History** - Only cleared/reconciled status is exported per transaction, not reconciliation events or history
- **Recurring Transaction Templates** - Scheduled transaction instances appear as future-dated transactions, but recurrence patterns/templates are not included
- **Account Closed/Archived Status** - No information about whether accounts are closed or archived

### ✅ Recently Added
- **Split Transactions** - Transactions with multiple budget allocations are now fully supported! The script detects consecutive rows with the same account, date, and payee, and groups them into a single transaction with multiple postings.
- **Cross-Type Transfer Budgets** - Transfers between budget and tracking accounts can have a budget category assigned, just like in YNAB. This ensures money flowing to/from tracking accounts (like mortgage payments) is properly categorized.
- **Overspending Reconciliation** - See below for details.

### ❌ Not Yet Supported (In Export, Not Implemented)
- **Flags/Colors** - Transaction flags are included but ignored
- **Budget Notes** - Category notes not imported
- **Account Notes** - Account notes not imported
- **Hidden/Archived Categories** - All categories imported as active
- **Multiple Currencies** - Only single currency supported (€)
- **Starting Balances** - Not imported (would need separate handling)

## File Structure

The YNAB export contains two TSV files:

- **Register.tsv** - All transactions with account, payee, category, memo, amounts
- **Plan.tsv** - Budget assignments per month per category

## Overspending Reconciliation

YNAB and Peanuts handle overspending differently:

- **YNAB**: When a category ends the month with a negative balance, YNAB automatically resets it to zero and deducts the overspent amount from "To Be Budgeted" in the following month.
- **Peanuts**: Negative balances carry forward in the category itself.

This difference means that after a straightforward import, category "Available" amounts would not match YNAB, even though all transactions and assignments are correct.

### Automatic Reconciliation

The import script performs **automatic reconciliation** to match YNAB's available amounts:

1. After importing all data, it calculates what Peanuts would show as "Available" for each budget
2. It compares this to YNAB's "Available" column from the Plan.tsv (excluding future/scheduled transactions)
3. For any differences due to overspending resets, it adjusts the assignment in the latest month to match YNAB's available amount

This ensures that imported budgets show the same available amounts as YNAB.

### What to expect

- **"Available to Budget"** will match YNAB (minus the reconciliation amount, which represents overspending YNAB absorbed over time)
- **Individual category balances** will match YNAB's current available amounts
- The script reports all reconciliation adjustments made during import

## Implementation Notes

- IDs are generated using `cuid` to match Peanuts' ID system
- Amounts are stored in cents (multiply by 100)
- Dates use ISO 8601 format (YYYY-MM-DDTHH:mm:ss.sssZ)
- Transfers are detected by payee name starting with "Transfer : "
- Empty categories on inflows default to "To Be Budgeted"
- Only one side of transfers creates a transfer record to avoid duplicates:
  - Same-type transfers (budget ↔ budget): created from the outflow side
  - Cross-type transfers (budget ↔ tracking): created from the budget account side (which has the category in YNAB)
- Cross-type transfers preserve the budget category from YNAB, allowing proper categorization of money flowing to/from tracking accounts
- Tracking accounts are detected by identifying accounts with transactions that have no categories (off-budget accounts in YNAB)
