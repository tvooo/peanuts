
export type Database = {
  accounts: AccountsTable
  payees: PayeesTable
  budget_categories: BudgetCategoriesTable
  budgets: BudgetTable
  transactions: TransactionsTable
  transaction_postings: TransactionPostingsTable
  transfers: TransfersTable
};

export type AccountsTable = {
  uuid: string;
  name: string;
  type: "budget" | "tracking";
};

export type PayeesTable = {
  uuid: string;
  name: string;
};

export type BudgetTable = {
  uuid: string;
  name: string;
  budget_category_uuid: string;
};

export type BudgetCategoriesTable = {
  uuid: string;
  name: string;
};

export type TransactionsTable = {
  uuid: string;
  date: Date
  account_uuid: string;
  status: "open" | "cleared"
};

export type TransactionPostingsTable = {
  uuid: string;
  transaction_uuid: string;
  payee_uuid: string;
  budget_uuid: string;
  amount: number
  comment: string
};

export type TransfersTable = {
  uuid: string;
  date: Date;
  from_account_uuid: string;
  to_account_uuid: string;
  from_status: "open" | "cleared";
  to_status: "open" | "cleared";
};

// import { sqliteTable, text } from "drizzle-orm/sqlite-core";

// export const accounts = sqliteTable(
//   "accounts",
//   {
//     uuid: text().primaryKey(),
//     name: text().notNull(),
//     type: text({ enum: ["budget", "tracking"] }).notNull(),
//   },
//   () => []
// );

// export const payees = sqliteTable(
//   "payees",
//   {
//     uuid: text().primaryKey(),
//     name: text().notNull(),
//   },
//   () => []
// );

export class Transaction {
  uuid = "";
  accountUuid = "";
  status = "open";
}

export class TransactionPosting {
  uuid = "";
  transactionUuid = "";
  amount = 0;
  payeeUuid = "";
  budgetUuid = "";
  comment = "";
}