/** biome-ignore-all lint/a11y/noStaticElementInteractions: TODO: fix later */
/** biome-ignore-all lint/a11y/useKeyWithClickEvents: TODO: fix later */

import { twJoin } from "tailwind-merge";
import { formatCurrency, formatCurrencyInput } from "@/utils/formatting";
import type { Amount } from "@/utils/types";

/**
 * Single-cell amount display (for Budget table and other single-value displays)
 */
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

/**
 * Two-cell amount display for transactions table (Out and In columns)
 */
export function OutInAmountCells({
  amount,
  highlightPositiveAmount,
  className,
  onClick,
}: {
  amount: Amount;
  highlightPositiveAmount?: boolean;
  className?: string;
  onClick?: (e: React.MouseEvent) => void;
}) {
  const outAmount = amount < 0 ? Math.abs(amount) : 0;
  const inAmount = amount > 0 ? amount : 0;

  return (
    <>
      <td className={twJoin("py-2 pr-2", className)} onClick={onClick}>
        <div className="text-right px-3">
          <span
            className={twJoin(
              "font-mono text-right self-end text-sm",
              outAmount > 0 && "text-foreground",
              outAmount === 0 && "text-muted-foreground"
            )}
          >
            {outAmount > 0 ? formatCurrencyInput(outAmount) : ""}
          </span>
        </div>
      </td>
      <td className={twJoin("py-2 pr-2", className)} onClick={onClick}>
        <div className="text-right px-3">
          <span
            className={twJoin(
              "font-mono text-right self-end text-sm",
              inAmount > 0 && "text-foreground",
              highlightPositiveAmount && inAmount > 0 && "text-green-700",
              inAmount === 0 && "text-muted-foreground"
            )}
          >
            {inAmount > 0 ? formatCurrencyInput(inAmount) : ""}
          </span>
        </div>
      </td>
    </>
  );
}

interface HeaderCellProps extends React.ComponentProps<"div"> {
  alignRight?: boolean;
}

export const HeaderCell = ({ alignRight, ...props }: HeaderCellProps) => (
  <div
    className={twJoin(
      "py-1 uppercase text-xs font-bold text-muted-foreground",
      alignRight ? "text-right" : "text-left"
    )}
    {...props}
  />
);

interface BudgetCellProps extends React.ComponentProps<"div"> {
  isInflow?: boolean;
}

export const BudgetCell = ({ children, isInflow, ...props }: BudgetCellProps) => (
  <div
    className={twJoin("inline-flex items-center", isInflow && "text-emerald-700 font-medium")}
    {...props}
  >
    {children}
  </div>
);

export const Cell = (props: React.ComponentProps<"div">) => (
  <div className="px-2 py-1" {...props} />
);
