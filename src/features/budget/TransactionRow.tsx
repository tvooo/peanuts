/** biome-ignore-all lint/a11y/noStaticElementInteractions: TODO: fix later */
/** biome-ignore-all lint/a11y/useKeyWithClickEvents: TODO: fix later */

import { ArrowDownToLine, CheckCheck, ChevronDown, ChevronRight, Dot, Repeat } from "lucide-react";
import { runInAction } from "mobx";
import { observer } from "mobx-react-lite";
import type * as React from "react";
import { twJoin } from "tailwind-merge";
import { BudgetCell, OutInAmountCells } from "@/components/Table";
import type { Transaction } from "@/models/Transaction";
import { formatDate } from "@/utils/formatting";

interface TransactionRowProps {
  transaction: Transaction;
  onClick?: () => void;
  selectedIds?: Set<string>;
  onToggleSelection?: (id: string) => void;
  isExpanded?: boolean;
  onToggleExpand?: (id: string) => void;
}

// Common cell styling
const cellBase = "py-2 px-3 pr-2 text-sm";

export const TransactionRow = observer(function TransactionRow({
  transaction,
  onClick,
  selectedIds,
  onToggleSelection,
  isExpanded,
  onToggleExpand,
}: TransactionRowProps) {
  const rowClasses = twJoin(
    "hover:bg-stone-100 border-b border-stone-200",
    transaction.isFuture && "bg-stone-50 text-stone-400",
    transaction.hasMissingCategory && "bg-amber-50"
  );

  // Single posting - render as before
  if (!transaction.isSplit) {
    return (
      <tr className={rowClasses}>
        <td className="p-1 pl-8 align-middle" onClick={onClick}>
          <input
            type="checkbox"
            checked={selectedIds?.has(transaction.id) || false}
            onChange={() => onToggleSelection?.(transaction.id)}
            onClick={(e) => e.stopPropagation()}
          />
        </td>
        <td className={twJoin("tabular-nums", cellBase)} onClick={onClick}>
          <span className="inline-flex items-center gap-1.5">
            {formatDate(transaction.date!)}
            {transaction.recurringTemplateId && (
              <span title="Created from recurring template">
                <Repeat size={12} className="text-stone-400" />
              </span>
            )}
          </span>
        </td>
        <td className={cellBase} onClick={onClick}>
          {transaction.payee?.name}
        </td>
        <td className={cellBase} onClick={onClick}>
          <BudgetCell isInflow={transaction.postings[0]?.budget?.isToBeBudgeted}>
            {transaction.postings[0]?.budget?.isToBeBudgeted && (
              <ArrowDownToLine className="inline-block mr-1.5" size={14} />
            )}
            {transaction.postings[0]?.budget?.isToBeBudgeted
              ? "Inflow"
              : transaction.postings[0]?.budget?.name}
          </BudgetCell>
        </td>
        <td className={cellBase} onClick={onClick}>
          {transaction.postings[0]?.note}
        </td>
        <OutInAmountCells amount={transaction.amount} highlightPositiveAmount onClick={onClick} />
        <td className="pr-2 text-center" onClick={onClick}>
          <button
            type="button"
            className="cursor-pointer hover:bg-stone-200 rounded-sm size-6 inline-flex items-center justify-center"
            onClick={(e) => {
              e.stopPropagation();
              runInAction(() => {
                transaction.status = transaction.status === "cleared" ? "open" : "cleared";
              });
            }}
          >
            {transaction.status === "cleared" ? (
              <CheckCheck width={16} className="inline-block" />
            ) : (
              <Dot width={16} className="inline-block" />
            )}
          </button>
        </td>
      </tr>
    );
  }

  // Split transaction - collapsed
  if (!isExpanded) {
    const handleClick = (e: React.MouseEvent) => {
      // If clicking checkbox, don't toggle expand
      if ((e.target as HTMLElement).tagName === "INPUT") return;
      onToggleExpand?.(transaction.id);
    };

    return (
      <tr className={rowClasses}>
        <td className="p-1 pl-8 align-middle cursor-pointer" onClick={handleClick}>
          <input
            type="checkbox"
            checked={selectedIds?.has(transaction.id) || false}
            onChange={() => onToggleSelection?.(transaction.id)}
            onClick={(e) => e.stopPropagation()}
          />
        </td>
        <td className={twJoin("tabular-nums cursor-pointer", cellBase)} onClick={handleClick}>
          <span className="inline-flex items-center gap-1.5">
            {formatDate(transaction.date!)}
            {transaction.recurringTemplateId && (
              <span title="Created from recurring template">
                <Repeat size={12} className="text-stone-400" />
              </span>
            )}
          </span>
        </td>
        <td className={twJoin("cursor-pointer", cellBase)} onClick={handleClick}>
          {transaction.payee?.name}
        </td>
        <td className={twJoin("cursor-pointer", cellBase)} onClick={handleClick}>
          <div className="flex items-center gap-1.5 text-stone-600">
            <ChevronRight size={14} />
            <span>Split ({transaction.postings.length})</span>
          </div>
        </td>
        <td className={twJoin("cursor-pointer", cellBase)} onClick={handleClick} />
        <OutInAmountCells
          amount={transaction.amount}
          highlightPositiveAmount
          className="cursor-pointer"
          onClick={handleClick}
        />
        <td className="pr-2 text-center cursor-pointer" onClick={handleClick}>
          {transaction.status === "cleared" ? (
            <CheckCheck width={20} className="inline-block" />
          ) : (
            <>&middot;</>
          )}
        </td>
      </tr>
    );
  }

  // Split transaction - expanded (returns multiple rows)
  const expandedRowClasses = twJoin(
    "hover:bg-stone-100",
    transaction.isFuture && "bg-stone-50 text-stone-400",
    transaction.hasMissingCategory && "bg-amber-50"
  );

  return (
    <>
      {/* Main header row */}
      <tr className={expandedRowClasses}>
        <td
          className="p-1 pl-8 align-middle cursor-pointer"
          onClick={(e) => {
            if ((e.target as HTMLElement).tagName === "INPUT") return;
            onClick?.();
          }}
        >
          <input
            type="checkbox"
            checked={selectedIds?.has(transaction.id) || false}
            onChange={() => onToggleSelection?.(transaction.id)}
            onClick={(e) => e.stopPropagation()}
          />
        </td>
        <td className={twJoin("tabular-nums cursor-pointer", cellBase)} onClick={onClick}>
          <span className="inline-flex items-center gap-1.5">
            {formatDate(transaction.date!)}
            {transaction.recurringTemplateId && (
              <span title="Created from recurring template">
                <Repeat size={12} className="text-stone-400" />
              </span>
            )}
          </span>
        </td>
        <td className={twJoin("cursor-pointer", cellBase)} onClick={onClick}>
          {transaction.payee?.name}
        </td>
        <td className={twJoin("cursor-pointer", cellBase)} onClick={onClick}>
          <div
            className="flex items-center gap-1.5 text-stone-600"
            onClick={(e) => {
              e.stopPropagation();
              onToggleExpand?.(transaction.id);
            }}
          >
            <ChevronDown size={14} />
            <span>Split Transaction</span>
          </div>
        </td>
        <td className={twJoin("cursor-pointer", cellBase)} onClick={onClick} />
        <OutInAmountCells
          amount={transaction.amount}
          highlightPositiveAmount
          className="cursor-pointer"
          onClick={onClick}
        />
        <td className="pr-2 text-center cursor-pointer" onClick={onClick}>
          {transaction.status === "cleared" ? (
            <CheckCheck width={20} className="inline-block" />
          ) : (
            <>&middot;</>
          )}
        </td>
      </tr>

      {/* Sub-rows for each posting */}
      {transaction.postings.map((posting, index) => {
        const subRowClasses = twJoin(
          "bg-stone-50/50",
          index === transaction.postings.length - 1 && "border-b border-stone-200",
          transaction.isFuture && "text-stone-400"
        );

        return (
          <tr key={posting.id} className={subRowClasses}>
            <td className="p-1 pl-8" onClick={onClick} />
            <td className="py-1 px-3 pr-2" onClick={onClick} />
            <td className="py-1 px-3 pr-2 pl-8" onClick={onClick}>
              <div className="flex items-center gap-2 text-stone-500 text-sm">
                <span>{index === transaction.postings.length - 1 ? "└─" : "├─"}</span>
              </div>
            </td>
            <td className="py-1 px-3 pr-2 text-sm" onClick={onClick}>
              <BudgetCell isInflow={posting.budget?.isToBeBudgeted}>
                {posting.budget?.isToBeBudgeted && (
                  <ArrowDownToLine className="inline-block mr-1.5" size={14} />
                )}
                {posting.budget?.isToBeBudgeted ? "Inflow" : posting.budget?.name}
              </BudgetCell>
            </td>
            <td className="py-1 px-3 pr-2 text-sm text-stone-600" onClick={onClick}>
              {posting.note}
            </td>
            <OutInAmountCells amount={posting.amount} highlightPositiveAmount onClick={onClick} />
            <td className="pr-2" onClick={onClick} />
          </tr>
        );
      })}
    </>
  );
});
