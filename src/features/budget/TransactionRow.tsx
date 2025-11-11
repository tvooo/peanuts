import { AmountCell, BudgetCell } from "@/components/Table"
import { Transaction } from "@/models/Transaction"
import { formatDate } from "@/utils/formatting"
import { useLedger } from "@/utils/useLedger"
import { ArrowDownToLine, CheckCheck } from "lucide-react"
import { twJoin } from "tailwind-merge"

interface TransactionRowProps {
  transaction: Transaction
  onClick?: () => void
}

export const TransactionRow = ({ transaction, onClick }: TransactionRowProps) => {
    const { ledger } = useLedger();
  return (
    (
                <tr
                  className={twJoin(
                    "hover:bg-stone-100 rounded-md border-b border-stone-200",
                    transaction.isFuture && "bg-stone-50 text-stone-400"
                  )}
                  onClick={onClick}
                >
                  <td className="p-1 pl-8 w-[64px] align-middle">
                    <input type="checkbox" />
                  </td>
                  <td className="tabular-nums py-2 px-3 pr-2 text-sm">
                    {formatDate(transaction.date!)}
                  </td>
                  <td className="py-2 px-3 pr-2 text-sm">{transaction.postings[0].payee?.name}</td>
                  <td className="py-2 px-3 pr-2 text-sm">
                    <BudgetCell isInflow={transaction.postings[0].budget?.isToBeBudgeted}>
                      {transaction.postings[0].budget?.isToBeBudgeted && (
                        <ArrowDownToLine className="inline-block mr-1.5" size={14} />
                      )}
                      {transaction.postings[0].budget?.isToBeBudgeted ? "Inflow" : transaction.postings[0].budget?.name}
                    </BudgetCell>
                  </td>
                  <td className="py-2 px-3 pr-2 text-sm">{transaction.postings[0].note}</td>
                  <td className="py-2 pr-2">
                    <AmountCell
                      amount={transaction.amount}
                      highlightPositiveAmount
                    />
                  </td>
                  <td className="pr-2 text-center">
                    {transaction.status === "cleared" ? (
                      <CheckCheck width={20} className="inline-block" />
                    ) : (
                      <>&middot;</>
                    )}
                  </td>
                </tr>
              )
            )
        }