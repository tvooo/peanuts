import { Account } from "@/models/Account";
import { Budget } from "@/models/Budget";
import { Transaction, TransactionPosting } from "@/models/Transaction";
import { Balance } from "@/utils/types";
import { endOfMonth, isBefore, isSameMonth, parseISO } from "date-fns";
import { groupBy } from "lodash";
import { Assignment } from "./Assignment";

`2023-01-01 open dkb
2023-01-01 open asn

2023-01-01 open dkb

alias dkb "DKB"
alias asn "ASN Bank"

2023-07-06 > dkb Apple 
`;

export class Ledger {
  accounts: Account[] = [];
  _budgets: Budget[] = [new Budget("inflow")];
  transactions: Transaction[] = [];
  assignments: Assignment[] = [];
  aliases: Map<string, string> = new Map<string, string>();
  source: string = ""

  static fromSource(source: string): Ledger {
    const ledger = new Ledger();
    ledger.source = source
    
    source
      .split("\n") // Split into lines
      .map((t) => t.trim()) // Trim whitespace
      .filter((t) => t !== "") // Skip empty lines
      .forEach((statement) => {
        if (statement[0] === "#") {
          // It's a comment!
          return;
        }

        // Poor man's directive detection
        if (statement.length < 12) {
          return;
        }
        switch (statement[11]) {
          case "*":
          case "!":
            // Statement
            ledger.addTransactionStatement(statement);
            break;
          case "o":
            // Account opening
            ledger.addAccountStatement(statement);
            return;
          case "c":
            // Account closing
            return;
          case "b":
            // Budget
            ledger.addBudgetStatement(statement);
            return;
          case ">":
            // Budget assignment
            ledger.addAssignmentStatement(statement)
            return;
          default:
            return;
        }
      });

    return ledger;
  }

  alias(s: string): string {
    if (this.aliases.has(s)) {
      return this.aliases.get(s)!;
    }
    return s;
  }

  addTransaction(transaction: Transaction) {
    this.transactions.push(transaction);
  }

  addAccountStatement(source: string) {
    const tokens = source.split(" ");
    const [dateStr, chipStr, accountStr, amountStr] = tokens;
    const date = parseISO(dateStr);
    // const account = this.getAccount(accountStr);
    const amount = parseInt(amountStr, 10);

    // if (!account) {
    //   throw new Error(`Account '${accountStr}' not found`);
    // }

    const account = new Account(accountStr, 0);
    this.accounts.push(account);
    // this.assignments.push(new Assignment(date, this.getBudget("inflow")!, amount))
    this.transactions.push(
      new Transaction(date, account, [
        new TransactionPosting(
          "Opening balance",
          this.getBudget("inflow")!,
          amount
        ),
      ])
    );
  }

  addBudgetStatement(source: string) {
    const tokens = source.split(" ");
    const [dateStr, chipStr, budgetStr, groupStr] = tokens;
    const date = parseISO(dateStr);
    // const account = this.getAccount(accountStr);
    // const amount = parseInt(amountStr, 10);

    // if (!account) {
    //   throw new Error(`Account '${accountStr}' not found`);
    // }

    // const account = new Account(accountStr, 0);
    this._budgets.push(new Budget(budgetStr, groupStr));
    // this.assignments.push(new Assignment(date, this.getBudget("inflow")!, amount))
    // this.transactions.push(
    //   new Transaction(date, account, [
    //     new TransactionPosting(
    //       "Opening balance",
    //       this.getBudget("inflow")!,
    //       amount
    //     ),
    //   ])
    // );
  }

  addTransactionStatement(source: string) {
    const tokens = source.split(" ");
    const [dateStr, chipStr, accountStr, payeeStr, budgetStr, amountStr] =
      tokens;
    const date = parseISO(dateStr);
    const account = this.getAccount(accountStr);
    const payee = payeeStr;
    const budget = this.getBudget(budgetStr);
    const amount = parseInt(amountStr, 10);
    console.log(amount);

    if (!account) {
      throw new Error(`Account '${accountStr}' not found`);
    }
    if (!budget) {
      throw new Error(`Budget '${budgetStr}' not found`);
    }

    this.addTransaction(
      new Transaction(date, account, [
        new TransactionPosting(payee, budget, amount),
      ])
    );
  }

  addAssignmentStatement(source: string) {
    const tokens = source.split(" ");
    const [dateStr, chipStr, budgetStr, amountStr] = tokens;
    const date = parseISO(dateStr);
    const budget = this.getBudget(budgetStr);
    const amount = parseInt(amountStr, 10);
    
    if(isNaN(amount)) {
      debugger
    }

    if (!budget) {
      throw new Error(`Budget '${budgetStr}' not found`);
    }

    // Process
    budget.balance += amount;
    const inflow = this.getBudget("inflow");
    if (inflow) {
      inflow.balance -= amount;
    }

    this.assignments.push(new Assignment(date, budget, amount));

    // this.addTransaction(
    //   new Transaction(date, account, [
    //     new TransactionPosting(payee, budget, amount),
    //   ])
    // );
  }

  getAccount(name: string): Account | undefined {
    return this.accounts.find((a) => a.name === name);
  }

  getBudget(name: string): Budget | undefined {
    return this._budgets.find((a) => a.name === name);
  }

  get budgets(): Budget[] {
    return this._budgets.filter((b) => b.name !== "inflow");
  }

  get budgetGroups(): Record<string, Budget[]> {
    return groupBy(this.budgets, "group");
  }

  transactionsForAccount(account: Account) {
    return this.transactions.filter((tr) => tr.account === account);
  }

  get payees(): string[] {
    let payees: string[] = [];
    this.transactions.forEach((tr) => {
      tr.postings.forEach((posting) => {
        payees.push(posting.payee);
      });
    });
    return payees;
  }

  renamePayee(oldName: string, newName: string) {
    // TODO: Go through all postings with old name and replace with new name
  }

  budgetAvailableForMonth(budget: Budget, date: Date): Balance {
    let activity: Balance = 0;
    this.transactions
      .filter((t) => isBefore(t.date, endOfMonth(date)))
      .forEach((t) => {
        //   t.account.processTransaction(t);
        // t.budgets.forEach((b) => b.processTransaction(t));
        t.postings
          .filter((p) => p.budget === budget)
          .forEach((p) => {
            if (budget.name === "inflow") {
              console.log(t);
            }
            activity += p.amount;
          });
      });

    let assigned: Balance = 0;
    if (budget.name === "inflow") {
      this.assignments
        .filter((t) => isBefore(t.date, endOfMonth(date)))
        .filter((p) => p.budget !== budget)
        .forEach((a) => {
          assigned -= a.amount;
          if (budget.name === "inflow") {
            console.log(a);
          }
        });
    } else {
      this.assignments
        .filter((t) => isBefore(t.date, endOfMonth(date)))
        .filter((p) => p.budget === budget)
        .forEach((a) => {
          assigned += a.amount;
        });
    }

    return assigned + activity;
  }

  budgetActivityForMonth(budget: Budget, date: Date): Balance {
    let activity: Balance = 0;
    this.transactions
      .filter((t) => isSameMonth(t.date, date))
      .forEach((t) => {
        //   t.account.processTransaction(t);
        // t.budgets.forEach((b) => b.processTransaction(t));
        t.postings
          .filter((p) => p.budget === budget)
          .forEach((p) => {
            activity += p.amount;
          });
      });
    return activity;
  }

  budgetAssignedForMonth(budget: Budget, date: Date): Balance {
    let assigned: Balance = 0;
    this.assignments
      .filter((t) => isSameMonth(t.date, date))
      .filter((p) => p.budget === budget)
      .forEach((a) => {
        //   t.account.processTransaction(t);
        // t.budgets.forEach((b) => b.processTransaction(t));

        assigned += a.amount;
      });

    return assigned;
  }
}

// const accounts = [new Account("DKB", 12345), new Account("ASN Bank", 95021)];
// const budgets = [new Budget("Software"), new Budget("Coffee")];
// const transactions = [
//   new Transaction(new Date(), accounts[0], [
//     new TransactionPosting("Apple", budgets[0], 99, "iCloud+"),
//   ]),
//   new Transaction(new Date(), accounts[0], [
//     new TransactionPosting("The Village", budgets[1], 1299),
//   ]),
// ];

// export const ledger = {
//   accounts,
//   budgets,
//   transactions,
// };
