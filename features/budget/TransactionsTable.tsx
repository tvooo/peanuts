import { AmountCell, BudgetCell, HeaderCell } from "@/components/Table";
import { Account } from "@/models/Account";
import { Ledger } from "@/models/Ledger";
import { formatDate } from "@/utils/formatting";
import { sortBy } from "lodash";

interface TransactionsTableProps {
  ledger: Ledger;
  currentAccount: Account;
  l: (s: string) => string;
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
        </tr>
      </thead>
      <tbody>
        {sortBy(ledger.transactionsForAccount(currentAccount), "date")
          .reverse()
          .map((transaction, idx) => (
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
              <td className="py-2 pr-8">
                <AmountCell
                  amount={transaction.amount}
                  // highlightNegativeAmount
                  highlightPositiveAmount
                  //   chip
                />
              </td>
            </tr>
            // <Fragment key={idx}>
            //   <Cell>{formatDate(transaction.date)}</Cell>
            //   <Cell>{l(transaction.postings[0].payee)}</Cell>
            //   <Cell>{l(transaction.postings[0].budget.name)}</Cell>
            //   <Cell>{transaction.postings[0].note}</Cell>
            //   <AmountCell amount={transaction.amount} />
            // </Fragment>
          ))}
      </tbody>
    </table>
  );
}
