import { Account } from "@/models/Account";
import { Budget } from "@/models/Budget";
import { Transaction, TransactionPosting } from "@/models/Transaction";
import { parseISO } from "date-fns";

`2023-01-01 open dkb
2023-01-01 open asn

2023-01-01 open dkb

alias dkb "DKB"
alias asn "ASN Bank"

2023-07-06 > dkb Apple 
`;

export class Ledger {
  accounts: Account[] = [];
  budgets: Budget[] = [];
  transactions: Transaction[] = [];
  aliases: Map<string, string> = new Map<string, string>();

  alias(s: string) {
    if (this.aliases.has(s)) {
      return this.aliases.get(s);
    }
    return s;
  }

  addTransaction(transaction: Transaction) {
    this.transactions.push(transaction);
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
    const [dateStr, chipStr, budgetStr, amountStr] =
      tokens;
    const date = parseISO(dateStr);
    const budget = this.getBudget(budgetStr);
    const amount = parseInt(amountStr, 10);
    console.log(amount);

    if (!budget) {
      throw new Error(`Budget '${budgetStr}' not found`);
    }

    // Process
    budget.balance += amount
    const inflow = this.getBudget('inflow')
    if(inflow) { inflow.balance -= amount }

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
    return this.budgets.find((a) => a.name === name);
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
