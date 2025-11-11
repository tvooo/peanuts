import { BalanceAssertion } from "@/models/BalanceAssertion";
import { formatCurrency, formatDate } from "@/utils/formatting";
import { useLedger } from "@/utils/useLedger";

interface BalanceAssertionRowProps {
  transaction: BalanceAssertion;
}

export const BalanceAssertionRow = ({ transaction }: BalanceAssertionRowProps) => {
  const { ledger } = useLedger();
  return (
    <tr className="hover:bg-stone-100 rounded-md border-b border-stone-200 bg-lime-50 text-lime-700 italic">
      <td className="p-1 pl-8 w-[64px] align-middle">
        <input type="checkbox" />
      </td>
      <td className="tabular-nums py-2 px-3 pr-2 text-sm">{formatDate(transaction.date)}</td>
      <td colSpan={4} className="py-2 px-3 pr-2 text-sm">
        Account balance was{" "}
        <strong>{formatCurrency(transaction.balance)}</strong>
      </td>
      <td />
    </tr>
  );
};

