import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Transaction } from "@/models/Transaction";
import { formatDateIsoShort } from "@/utils/formatting";
import { useLedger } from "@/utils/useLedger";
import { CheckCheck } from "lucide-react";
import { observer } from "mobx-react-lite";

interface TransactionFormRowProps {
  transaction: Transaction;
  onDone: () => void;
}

export const TransactionFormRow = observer(function TransactionFormRow({
  transaction,
  onDone,
}: TransactionFormRowProps) {
  const { ledger } = useLedger();
  const posting = transaction.postings[0]!;
  return (
    <>
      <tr className="rounded-md border-none bg-blue-300">
        <td className="p-1 pl-8 w-[64px] align-middle">
          <input type="checkbox" />
        </td>
        <td className="tabular-nums py-2">
          <input
            type="date"
            value={transaction.date ? formatDateIsoShort(transaction.date) : ""}
            onChange={(e) => {
              transaction.date = new Date(e.target.value);
            }}
          />
        </td>

        <td>
          <select
            value={posting.payee?.id}
            onChange={(e) => {
              const payee = ledger!.getPayeeByID(e.target.value);
              if (payee) {
                posting.setPayee(payee);
              }
            }}
          >
            {ledger!.payees.map((payee, idx) => (
              <option key={payee.id} value={payee.id}>
                {payee.name}
              </option>
            ))}
          </select>
        </td>
        <td>
          <select
          value={posting.budget?.id}
            onChange={(e) => {
              const budget = ledger!.getBudgetByID(e.target.value);
              if (budget) {
                posting.setBudget(budget);
              }
            }}
          >
            {ledger!._budgets.map((budget) => (
              <option key={budget.id} value={budget.id}>
                {budget.name}
              </option>
            ))}
          </select>
        </td>
        <td>
          <Input
            type="text"
            value={posting.note}
            onChange={(e) => (posting.note = e.target.value)}
          />
        </td>
        <td>
          <Input
            type="number"
            value={transaction.amount}
            onChange={(e) => (posting.amount = parseInt(e.target.value, 10))}
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
      <tr className="bg-blue-300 border-b">
        <td className="p-1 pl-8 w-[64px] align-middle">
          {/* <input type="checkbox" /> */}
        </td>
        <td colSpan={4}></td>
        <td colSpan={2} style={{ textAlign: "right" }}>
          <Button size="sm" variant="default" onClick={() => onDone()}>
            Done
          </Button>
        </td>
      </tr>
    </>
  );
});
