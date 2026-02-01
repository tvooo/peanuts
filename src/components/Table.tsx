/** biome-ignore-all lint/a11y/noStaticElementInteractions: TODO: fix later */
/** biome-ignore-all lint/a11y/useKeyWithClickEvents: TODO: fix later */

import { Check, CheckCheck, Dot, Repeat, X } from "lucide-react";
import { twJoin } from "tailwind-merge";
import { cn } from "@/lib/utils";
import { formatCurrency, formatCurrencyInput, formatDate } from "@/utils/formatting";
import type { Amount } from "@/utils/types";

/**
 * Shared row styling constants
 */
export const rowStyles = {
  cellBase: "py-2 px-3 pr-2 text-sm",
  displayRow: "hover:bg-stone-100 border-b border-stone-200",
  formRow: "bg-amber-50/50 border-t-2 border-b-2 border-amber-200",
  futureRow: "bg-stone-50 text-stone-400",
  missingCategory: "bg-amber-50",
};

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

/**
 * Status toggle button cell for transactions and transfers
 */
interface StatusToggleCellProps {
  status: "open" | "cleared";
  onToggle: () => void;
  onClick?: (e: React.MouseEvent) => void;
}

export function StatusToggleCell({ status, onToggle, onClick }: StatusToggleCellProps) {
  return (
    <td className="pr-2 text-center" onClick={onClick}>
      <button
        type="button"
        className="cursor-pointer hover:bg-stone-200 rounded-sm size-6 inline-flex items-center justify-center"
        onClick={(e) => {
          e.stopPropagation();
          onToggle();
        }}
      >
        {status === "cleared" ? (
          <CheckCheck width={16} className="inline-block" />
        ) : (
          <Dot width={16} className="inline-block" />
        )}
      </button>
    </td>
  );
}

/**
 * Selection checkbox cell for row selection
 */
interface SelectionCheckboxCellProps {
  id: string;
  selectedIds?: Set<string>;
  onToggleSelection?: (id: string) => void;
  onClick?: (e: React.MouseEvent) => void;
  className?: string;
}

export function SelectionCheckboxCell({
  id,
  selectedIds,
  onToggleSelection,
  onClick,
  className,
}: SelectionCheckboxCellProps) {
  return (
    <td className={twJoin("p-1 pl-8 align-middle", className)} onClick={onClick}>
      <input
        type="checkbox"
        checked={selectedIds?.has(id) || false}
        onChange={() => onToggleSelection?.(id)}
        onClick={(e) => e.stopPropagation()}
      />
    </td>
  );
}

/**
 * Date cell with optional recurring icon
 */
interface DateCellProps {
  date: Date;
  recurringTemplateId?: string | null;
  onClick?: (e: React.MouseEvent) => void;
  className?: string;
}

export function DateCell({ date, recurringTemplateId, onClick, className }: DateCellProps) {
  return (
    <td className={twJoin("tabular-nums", rowStyles.cellBase, className)} onClick={onClick}>
      <span className="inline-flex items-center gap-1.5">
        {formatDate(date)}
        {recurringTemplateId && (
          <span title="Created from recurring template">
            <Repeat size={12} className="text-stone-400" />
          </span>
        )}
      </span>
    </td>
  );
}

/**
 * Save/Cancel button group for form rows
 */
interface FormActionButtonsProps {
  onSave: () => void;
  onCancel: () => void;
}

const formButtonClass = cn(
  "inline-flex h-8 w-8 items-center gap-1.5 rounded-md px-0 justify-center text-sm font-medium",
  "bg-primary text-primary-foreground shadow-sm",
  "hover:bg-primary/90 transition-colors",
  "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
);

export function FormActionButtons({ onSave, onCancel }: FormActionButtonsProps) {
  return (
    <div className="flex items-center justify-center gap-1">
      <button type="button" onClick={onCancel} className={formButtonClass}>
        <X className="h-4 w-4" />
      </button>
      <button type="button" onClick={onSave} className={formButtonClass}>
        <Check className="h-4 w-4" />
      </button>
    </div>
  );
}
