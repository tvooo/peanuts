import { AmountCell, BudgetCell } from "@/components/Table"
import { Transaction } from "@/models/Transaction"
import { formatDate } from "@/utils/formatting"
import { useLedger } from "@/utils/useLedger"
import { CheckCheck, MailPlus } from "lucide-react"

interface TransactionRowProps {
  transaction: Transaction
  onClick?: () => void
}

export const TransactionRow = ({ transaction, onClick }: TransactionRowProps) => {
    const { ledger } = useLedger();
  return (
    (
                <tr
                  className="hover:bg-stone-100 rounded-md border-b border-stone-200"
                  onClick={onClick}
                >
                  <td className="p-1 pl-8 w-[64px] align-middle">
                    <input type="checkbox" />
                  </td>
                  <td className="tabular-nums py-2">
                    {formatDate(transaction.date!)}
                  </td>
                  <td>{transaction.postings[0].payee?.name}</td>
                  <td>
                    <BudgetCell>
                      {transaction.postings[0].budget?.isToBeBudgeted && <MailPlus />}{transaction.postings[0].budget?.name} 
                    </BudgetCell>
                  </td>
                  <td>{transaction.postings[0].note}</td>
                  <td>
                    <AmountCell
                      amount={transaction.amount}
                      highlightPositiveAmount
                    />
                  </td>
                  <td className="pr-8 text-center">
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