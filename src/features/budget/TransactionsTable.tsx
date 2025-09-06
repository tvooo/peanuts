import { HeaderCell } from "@/components/Table";
import { Account } from "@/models/Account";
import { BalanceAssertion } from "@/models/BalanceAssertion";
import { Ledger } from "@/models/Ledger";
import { Transaction } from "@/models/Transaction";
import { Transfer } from "@/models/Transfer";
import { sortBy } from "lodash";
import { CheckCheck } from "lucide-react";
import { observer } from "mobx-react-lite";
import { BalanceAssertionRow } from "./BalanceAssertionRow";
import { TransactionFormRow } from "./TransactionFormRow";
import { TransactionRow } from "./TransactionRow";
import { TransferRow } from "./TransferRow";

interface TransactionsTableProps {
  ledger: Ledger;
  currentAccount: Account;
  editingTransaction?: Transaction;
  setEditingTransaction: (transaction: Transaction | null) => void;
}

function isTransaction<T>(tr: Transaction | BalanceAssertion | Transfer): tr is Transaction {
  return tr instanceof Transaction
}

export const TransactionsTable = observer(function TransactionsTable({
  currentAccount,
  ledger,
  editingTransaction,
  setEditingTransaction,
}: TransactionsTableProps) {
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
            <HeaderCell className="pr-8 text-center">
              <CheckCheck width={20} className="inline-block" />
            </HeaderCell>
          </th>
        </tr>
      </thead>
      <tbody>
        {sortBy(
          ledger.transactionsAndBalancesForAccount(currentAccount),
          "date"
        )
          .reverse()
          .map((transaction, idx) => {
            if (isTransaction(transaction)) {
              if (transaction === editingTransaction) {
                return (
                  <TransactionFormRow
                    transaction={transaction}
                    key={idx}
                    onDone={() => setEditingTransaction(null)}
                  />
                );
              }
              return (
                <TransactionRow
                  transaction={transaction}
                  key={idx}
                  onClick={() => {
                    if(!editingTransaction) {
                      setEditingTransaction(transaction);
                    }
                  }}
                />
              );
            } else {
              if(transaction instanceof Transfer) {
                return (
                  <TransferRow transfer={transaction} isInbound={transaction.toAccount?.id === currentAccount.id} key={idx} />
                )
              }
              return (
                <BalanceAssertionRow transaction={transaction} key={idx} />
              );
            }
          })}
      </tbody>
    </table>
  );
});
