import { twMerge } from "tailwind-merge";
import { formatCurrency } from "@/utils/formatting";
import type { Amount } from "@/utils/types";

/**
 * Typographic treatment for every amount in the app: monospace with tabular
 * figures so digits line up in columns and don't jitter while values change.
 * Use the class directly when the amount is baked into a larger string; use
 * <Currency> when rendering a single value.
 */
export const currencyClass = "font-mono tabular-nums";

interface CurrencyProps extends React.ComponentProps<"span"> {
  amount: Amount;
}

export function Currency({ amount, className, ...props }: CurrencyProps) {
  return (
    <span className={twMerge(currencyClass, className)} {...props}>
      {formatCurrency(amount)}
    </span>
  );
}
