import { createId } from "@paralleldrive/cuid2";

/**
 * Creates an empty ledger JSON structure with a unique "To Be Budgeted" budget.
 * IDs are generated fresh each time to ensure uniqueness.
 */
export function createEmptyLedgerJSON(name: string = "My Budget") {
  return {
    name,
    accounts: [],
    budget_categories: [],
    budgets: [
      {
        id: createId(),
        name: "To Be Budgeted",
        budget_category_id: null,
        is_to_be_budgeted: true,
        is_archived: false,
      },
    ],
    payees: [],
    transactions: [],
    transaction_postings: [],
    recurring_templates: [],
    assignments: [],
    transfers: [],
    goals: [],
  };
}
