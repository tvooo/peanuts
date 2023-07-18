import { AmountCell, BudgetCell, HeaderCell } from "@/components/Table";
import { Account } from "@/models/Account";
import { BalanceAssertion } from "@/models/BalanceAssertion";
import { Ledger } from "@/models/Ledger";
import { Transaction } from "@/models/Transaction";
import { formatCurrency, formatDate } from "@/utils/formatting";
import { DoubleCheck } from "iconoir-react";
import { sortBy } from "lodash";

interface TransactionsTableProps {
  ledger: Ledger;
  currentAccount: Account;
  l: (s: string) => string;
}

function isTransaction<T>(tr: Transaction | BalanceAssertion): tr is Transaction {
  return 'amount' in tr
}

export function TransactionsTable({ currentAccount, ledger, l }: TransactionsTableProps) {
  return (
    <table className="table w-full">
      <thead>
        <tr className="border-b border-stone-300">
          <th></th>
          <th>
            <HeaderCell>Date</HeaderCell>
          </th>
          <th>
            <HeaderCell>Payee</HeaderCell>
          </th>
          <th>
            <HeaderCell>Budget</HeaderCell>
          </th>
          <th>
            <HeaderCell>Note</HeaderCell>
          </th>
          <th className="pr-8">
            <HeaderCell alignRight>Amount</HeaderCell>
          </th>
          <th>
            <HeaderCell className="pr-8 text-center"><DoubleCheck width={20} className="inline-block" /></HeaderCell>
          </th>
        </tr>
      </thead>
      <tbody>
        {sortBy(ledger.transactionsAndBalancesForAccount(currentAccount), "date")
          .reverse()
          .map((transaction, idx) => isTransaction(transaction) ? (
            <tr
              className="hover:bg-stone-100 rounded-md border-b border-stone-200"
              key={idx}
            >
              <td className="p-1 pl-8 w-[64px] align-middle">
                <input type="checkbox" />
              </td>
              <td className="tabular-nums">{formatDate(transaction.date)}</td>
              <td>{l(transaction.postings[0].payee)}</td>
              <td>
                <BudgetCell>
                  {l(transaction.postings[0].budget.name)}
                </BudgetCell>
              
              </td>
              <td>{transaction.postings[0].note}</td>
              <td>
                <AmountCell
                  amount={transaction.amount}
                  // highlightNegativeAmount
                  highlightPositiveAmount
                  //   chip
                />
              </td>
              <td className="py-2 pr-8 text-center">{transaction.status === 'cleared' ? <DoubleCheck width={20} className="inline-block" /> : <>&middot;</>}</td>
            </tr>
          ) : (
            <tr
              className="hover:bg-stone-100 rounded-md border-b border-stone-200 bg-lime-50 text-lime-700 italic"
              key={idx}
            >
              <td className="p-1 pl-8 w-[64px] align-middle">
                <input type="checkbox" />
              </td>
              <td className="tabular-nums">{formatDate(transaction.date)}</td>
              {/* <td>{l(transaction.postings[0].payee)}</td> */}
              <td colSpan={4}>Account balance was <strong>{formatCurrency(transaction.balance)}</strong></td>
              {/* <td>
                <BudgetCell>
                  {l(transaction.postings[0].budget.name)}
                </BudgetCell>
              
              </td> */}
              {/* <td>{transaction.postings[0].note}</td> */}
              {/* <td>
                <AmountCell
                  amount={transaction.balance}
                  // highlightNegativeAmount
                  highlightPositiveAmount
                  //   chip
                />
              </td> */}
              {/* <td className="py-2 pr-8 text-center">{transaction.status === 'cleared' ? <DoubleCheck width={20} className="inline-block" /> : <>&middot;</>}</td> */}
              <td />
            </tr>
          ))}
      </tbody>
    </table>
  );
}
