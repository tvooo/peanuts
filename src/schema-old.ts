import { sqlite as $, Table, Watch } from "litdb";

export class Account {
  uuid = "";
  name = "";
  kind = "";
}

export class Payee {
  uuid = "";
  name = "";
  // TODO: maybe color, icon, favicon, etc
}

export class Budget {
  uuid = "";
  name = "";
}

export class Transaction {
  uuid = ""
  accountUuid = "";
  status = "open"
}

export class TransactionPosting {
  uuid = "";
  transactionUuid = "";
  amount = 0;
  payeeUuid = "";
  budgetUuid = "";
  comment = "";
}

export class BudgetAssignment {
  uuid = "";
  fromBudgetUuid = "";
  toBudgetUuid = "";
  amount = 0;
}

// Maybe rather a posting?
export class AccountTransaction {
    uuid = "";
    fromAccountUuid = "";
    toAccountUuid = "";
    amount = 0;
    comment = "";
}

Table(Account, {
  columns: {
    uuid: { type: "TEXT", required: true, primaryKey: true },
    name: { type: "TEXT", required: true },
    kind: { type: "TEXT", required: true },
    // age: { type: "INTEGER" },
    // email: { type: "TEXT", required: true, index: true, unique: true },
    // city: { type: "TEXT" },
    // createdAt: { type: "DATETIME", defaultValue: "CURRENT_TIMESTAMP" },
  },
});

Table(Payee, {
  columns: {
    uuid: { type: "TEXT", required: true, primaryKey: true },
    name: { type: "TEXT", required: true },
    // age: { type: "INTEGER" },
    // email: { type: "TEXT", required: true, index: true, unique: true },
    // city: { type: "TEXT" },
    // createdAt: { type: "DATETIME", defaultValue: "CURRENT_TIMESTAMP" },
  },
});

Table(Budget, {
    columns: {
        uuid: { type: "TEXT", required: true, primaryKey: true },
        name: { type: "TEXT", required: true },
    }
});

Table(Transaction, {
  columns: {
    uuid: { type: "TEXT", required: true, primaryKey: true },
    accountUuid: { type: "TEXT", required: true, references: { table: Account }},
    status: { type: "TEXT", required: true, defaultValue: "open" }
  },
});

Table(TransactionPosting, {
  columns: {
    uuid: { type: "TEXT", required: true, primaryKey: true },
    transactionUuid: {
      type: "TEXT",
      required: true,
      references: { table: Transaction },
    },
    payeeUuid: {
      type: "TEXT",
      required: true,
      references: { table: Payee },
    },
    budgetUuid: {
      type: "TEXT",
      required: true,
      references: { table: Budget },
    },
    amount: {
        type: "INTEGER",
        required: true,
    }
  },
});

Table(BudgetAssignment, {
  columns: {
    uuid: { type: "TEXT", required: true, primaryKey: true },
    fromBudgetUuid: {
      type: "TEXT",
      required: true,
      references: { table: Budget },
    },
    toBudgetUuid: {
      type: "TEXT",
      required: true,
      references: { table: Budget },
    },
    amount: {
      type: "INTEGER",
      required: true,
    }
  },
});

Watch(() => {
    const sql = {
        accounts: $.schema.createTable(Account),
        payees: $.schema.createTable(Payee),
        budgets: $.schema.createTable(Budget),
        transactions: $.schema.createTable(Transaction),
        transactionPostings: $.schema.createTable(TransactionPosting)
    };

    // const insert = $`INSERT`

    return {...sql}
})