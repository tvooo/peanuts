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
    <div className="text-right px-3">
      <span
        className={twJoin(
          "font-mono text-right self-end text-sm",
          amount > 0 && "text-foreground",
          highlightNegativeAmount && amount < 0 && "text-red-600",
          highlightPositiveAmount && amount > 0 && "text-green-700",
          amount === 0 && "text-muted-foreground",
          chip && "bg-stone-50 rounded-full py-1 px-2 ring-1 ring-stone-200"
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
    className={twJoin("py-1 uppercase text-xs font-bold text-muted-foreground", alignRight ? 'text-right' : 'text-left')}
    {...props}
  />
);

interface BudgetCellProps extends React.ComponentProps<'div'> {
    isInflow?: boolean
}

export const BudgetCell = ({ children, isInflow, ...props }: BudgetCellProps) => (
  <div
    className={twJoin(
      "inline-flex items-center",
      isInflow && "text-emerald-700 font-medium"
    )}
    {...props}
  >{children}</div>
);


export const Cell = (props: React.ComponentProps<"div">) => (
  <div className="px-2 py-1" {...props} />
);