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
- **Transfers** - Inter-account transfers are detected and converted
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

## Implementation Notes

- IDs are generated using `cuid` to match Peanuts' ID system
- Amounts are stored in cents (multiply by 100)
- Dates use ISO 8601 format (YYYY-MM-DDTHH:mm:ss.sssZ)
- Transfers are detected by payee name starting with "Transfer : "
- Empty categories on inflows default to "To Be Budgeted"
- Only the "outflow" side of transfers creates a transfer record to avoid duplicates
- Tracking accounts are detected by identifying accounts with transactions that have no categories (off-budget accounts in YNAB)
