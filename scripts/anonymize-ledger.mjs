#!/usr/bin/env node
/**
 * Anonymise a ledger JSON file for sharing / debugging.
 *
 * Preserves: dates, amounts, ids, structure, version, statuses, notes' length
 * Replaces:  ledger name, account names, budget category names, budget names,
 *            payee names, transaction/transfer notes
 *
 * Consistency: same id always maps to same anonymised name within a run.
 * Payees are renamed with a suffix tied to their dominant budget so that the
 * payee→budget relationship is still inspectable (e.g. "Payee-3 (Groceries-like)").
 *
 * Usage:
 *   node scripts/anonymize-ledger.mjs input.json output.json
 */

import { readFileSync, writeFileSync } from "node:fs";

const [, , inputPath, outputPath] = process.argv;
if (!inputPath || !outputPath) {
  console.error("Usage: node scripts/anonymize-ledger.mjs <input.json> <output.json>");
  process.exit(1);
}

const data = JSON.parse(readFileSync(inputPath, "utf8"));

// --- Rename accounts ---
const accountNameById = new Map();
data.accounts.forEach((a, i) => {
  const type = a.type === "tracking" ? "Tracking" : "Budget";
  const archived = a.archived ? " (archived)" : "";
  const newName = `${type} Account ${i + 1}${archived}`;
  accountNameById.set(a.id, newName);
  a.name = newName;
});

// --- Rename budget categories ---
const categoryNameById = new Map();
data.budget_categories.forEach((c, i) => {
  const newName = `Category ${i + 1}`;
  categoryNameById.set(c.id, newName);
  c.name = newName;
});

// --- Rename budgets ---
// Keep "To Be Budgeted" / inflow budget names intact if the app relies on them.
// Peanuts identifies the inflow budget by a flag/name — check the source if unsure.
// For safety here: preserve any budget whose name looks like a reserved inflow label.
const RESERVED_BUDGET_NAMES = new Set(["To Be Budgeted", "Inflow", "Ready to Assign"]);
const budgetNameById = new Map();
data.budgets.forEach((b, i) => {
  if (RESERVED_BUDGET_NAMES.has(b.name)) {
    budgetNameById.set(b.id, b.name);
    return;
  }
  const newName = `Budget ${i + 1}`;
  budgetNameById.set(b.id, newName);
  b.name = newName;
});

// --- Build payee → dominant-budget map from transaction postings ---
// For each payee, find which budget their postings most often touch.
const postingById = new Map(data.transaction_postings.map((p) => [p.id, p]));

const payeeBudgetCounts = new Map(); // payeeId -> Map(budgetId -> count)
for (const t of data.transactions) {
  if (!t.payee_id) continue;
  const counts = payeeBudgetCounts.get(t.payee_id) ?? new Map();
  for (const pid of t.transaction_posting_ids ?? []) {
    const p = postingById.get(pid);
    if (!p?.budget_id) continue;
    counts.set(p.budget_id, (counts.get(p.budget_id) ?? 0) + 1);
  }
  payeeBudgetCounts.set(t.payee_id, counts);
}

function dominantBudgetId(payeeId) {
  const counts = payeeBudgetCounts.get(payeeId);
  if (!counts || counts.size === 0) return null;
  let best = null;
  let bestCount = -1;
  for (const [bid, c] of counts) {
    if (c > bestCount) {
      best = bid;
      bestCount = c;
    }
  }
  return best;
}

// --- Rename payees, tagging with their dominant budget's new name ---
data.payees.forEach((p, i) => {
  const domBudgetId = dominantBudgetId(p.id);
  const domBudgetName = domBudgetId ? budgetNameById.get(domBudgetId) : null;
  p.name = domBudgetName ? `Payee ${i + 1} (${domBudgetName}-like)` : `Payee ${i + 1}`;
});

// --- Scrub free-text note fields (preserve rough length so UI looks realistic) ---
function scrubNote(note) {
  if (typeof note !== "string" || note.length === 0) return note;
  return "note".padEnd(Math.min(note.length, 20), ".");
}

for (const p of data.transaction_postings) {
  if (p.note) p.note = scrubNote(p.note);
}
for (const t of data.transfers) {
  if (t.note) t.note = scrubNote(t.note);
}
for (const r of data.recurring_templates ?? []) {
  if (r.note) r.note = scrubNote(r.note);
}

// --- Ledger name ---
data.name = "Anonymised Ledger";

writeFileSync(outputPath, JSON.stringify(data, null, 2));
console.log(`Wrote anonymised ledger to ${outputPath}`);
console.log(
  `  accounts: ${data.accounts.length}, budgets: ${data.budgets.length}, payees: ${data.payees.length}, transactions: ${data.transactions.length}`
);
