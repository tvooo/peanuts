import { formatCurrency } from "@/utils/formatting";
import { Amount } from "@/utils/types";
import { twJoin } from "tailwind-merge";

export function AmountCell({
  amount,
  highlightNegativeAmount,
  highlightPositiveAmount,
  chip,
}: {
  amount: Amount;
  highlightNegativeAmount?: boolean;
  highlightPositiveAmount?: boolean;
  chip?: boolean;
}) {
  return (
    <div className="text-right">
      <span
        className={twJoin(
          "font-mono text-right self-end py-1 px-2 text-sm",
          amount > 0 && "text-stone-700",
          highlightNegativeAmount && amount < 0 && "text-red-600",
          highlightPositiveAmount && amount > 0 && "text-emerald-700",
          amount === 0 && "text-stone-500",
          chip && "bg-stone-50 rounded-full ring-1 ring-stone-200"
        )}
      >
        {formatCurrency(amount)}
      </span>
    </div>
  );
}

interface HeaderCellProps extends React.ComponentProps<'div'> {
    alignRight?: boolean
}

export const HeaderCell = ({ alignRight, ...props }: HeaderCellProps) => (
  <div
    className={twJoin("py-1 uppercase text-xs font-bold text-stone-400", alignRight ? 'text-right' : 'text-left')}
    {...props}
  />
);

export const BudgetCell = ({ children, ...props }: HeaderCellProps) => (
  <div
    className={twJoin(
    //   "py-1 uppercase text-xs font-bold text-stone-400",
      children === 'inflow' && "italic text-stone-400"
    )}
    {...props}
  >{children === 'inflow' ? 'To budget' : children}</div>
);


export const Cell = (props) => (
  <div className="px-2 py-1" {...props} />
);