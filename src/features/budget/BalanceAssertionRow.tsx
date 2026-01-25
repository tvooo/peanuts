import { twJoin } from "tailwind-merge";
import type { BalanceAssertion } from "@/models/BalanceAssertion";
import { formatCurrency, formatDate } from "@/utils/formatting";

interface BalanceAssertionRowProps {
  transaction: BalanceAssertion;
}

const rowClasses = "hover:bg-stone-100 border-b border-stone-200 bg-lime-50 text-lime-700 italic";
const cellBase = "py-2 px-3 pr-2 text-sm";

export const BalanceAssertionRow = ({ transaction }: BalanceAssertionRowProps) => {
  return (
    <tr className={rowClasses}>
      <td className="p-1 pl-8 align-middle">
        <input type="checkbox" disabled />
      </td>
      <td className={twJoin("tabular-nums", cellBase)}>{formatDate(transaction.date)}</td>
      {/* Span the remaining columns with the balance message */}
      <td colSpan={5} className={cellBase}>
        Account balance was <strong>{formatCurrency(transaction.balance)}</strong>
      </td>
      <td />
    </tr>
  );
};
