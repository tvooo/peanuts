/** biome-ignore-all lint/a11y/noStaticElementInteractions: TODO: fix later */
/** biome-ignore-all lint/a11y/useKeyWithClickEvents: TODO: fix later */

import { ArrowDownToLine, ChevronDown, ChevronRight } from "lucide-react";
import { observer } from "mobx-react-lite";
import type * as React from "react";
import { twJoin } from "tailwind-merge";
import {
  BudgetCell,
  DateCell,
  OutInAmountCells,
  rowStyles,
  SelectionCheckboxCell,
  StatusToggleCell,
} from "@/components/Table";
import type { Transaction } from "@/models/Transaction";

interface TransactionRowProps {
  transaction: Transaction;
  onClick?: () => void;
  selectedIds?: Set<string>;
  onToggleSelection?: (id: string) => void;
  isExpanded?: boolean;
  onToggleExpand?: (id: string) => void;
}

export const TransactionRow = observer(function TransactionRow({
  transaction,
  onClick,
  selectedIds,
  onToggleSelection,
  isExpanded,
  onToggleExpand,
}: TransactionRowProps) {
  const rowClasses = twJoin(
    rowStyles.displayRow,
    transaction.isFuture && rowStyles.futureRow,
    transaction.hasMissingCategory && rowStyles.missingCategory
  );

  // Single posting - render as before
  if (!transaction.isSplit) {
    return (
      <tr className={rowClasses}>
        <SelectionCheckboxCell
          id={transaction.id}
          selectedIds={selectedIds}
          onToggleSelection={onToggleSelection}
          onClick={onClick}
        />
        <DateCell
          date={transaction.date!}
          recurringTemplateId={transaction.recurringTemplateId}
          onClick={onClick}
        />
        <td className={twJoin(rowStyles.cellBase, "truncate")} onClick={onClick}>
          {transaction.payee?.name}
        </td>
        <td className={twJoin(rowStyles.cellBase, "truncate")} onClick={onClick}>
          <BudgetCell isInflow={transaction.postings[0]?.budget?.isToBeBudgeted}>
            {transaction.postings[0]?.budget?.isToBeBudgeted && (
              <ArrowDownToLine className="inline-block mr-1.5" size={14} />
            )}
            {transaction.postings[0]?.budget?.isToBeBudgeted
              ? "Inflow"
              : transaction.postings[0]?.budget?.name}
          </BudgetCell>
        </td>
        <td className={twJoin(rowStyles.cellBase, "truncate")} onClick={onClick}>
          {transaction.postings[0]?.note}
        </td>
        <OutInAmountCells amount={transaction.amount} highlightPositiveAmount onClick={onClick} />
        <StatusToggleCell
          status={transaction.status}
          onToggle={() => transaction.toggleStatus()}
          onClick={onClick}
        />
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
        <SelectionCheckboxCell
          id={transaction.id}
          selectedIds={selectedIds}
          onToggleSelection={onToggleSelection}
          onClick={handleClick}
          className="cursor-pointer"
        />
        <DateCell
          date={transaction.date!}
          recurringTemplateId={transaction.recurringTemplateId}
          onClick={handleClick}
          className="cursor-pointer"
        />
        <td className={twJoin("cursor-pointer truncate", rowStyles.cellBase)} onClick={handleClick}>
          {transaction.payee?.name}
        </td>
        <td className={twJoin("cursor-pointer truncate", rowStyles.cellBase)} onClick={handleClick}>
          <div className="flex items-center gap-1.5 text-stone-600">
            <ChevronRight size={14} className="shrink-0" />
            <span className="truncate">Split ({transaction.postings.length})</span>
          </div>
        </td>
        <td
          className={twJoin("cursor-pointer truncate", rowStyles.cellBase)}
          onClick={handleClick}
        />
        <OutInAmountCells
          amount={transaction.amount}
          highlightPositiveAmount
          className="cursor-pointer"
          onClick={handleClick}
        />
        <StatusToggleCell status={transaction.status} onToggle={() => transaction.toggleStatus()} />
      </tr>
    );
  }

  // Split transaction - expanded (returns multiple rows)
  const expandedRowClasses = twJoin(
    "hover:bg-stone-100",
    transaction.isFuture && rowStyles.futureRow,
    transaction.hasMissingCategory && rowStyles.missingCategory
  );

  return (
    <>
      {/* Main header row */}
      <tr className={expandedRowClasses}>
        <SelectionCheckboxCell
          id={transaction.id}
          selectedIds={selectedIds}
          onToggleSelection={onToggleSelection}
          onClick={(e) => {
            if ((e.target as HTMLElement).tagName === "INPUT") return;
            onClick?.();
          }}
          className="cursor-pointer"
        />
        <DateCell
          date={transaction.date!}
          recurringTemplateId={transaction.recurringTemplateId}
          onClick={onClick}
          className="cursor-pointer"
        />
        <td className={twJoin("cursor-pointer truncate", rowStyles.cellBase)} onClick={onClick}>
          {transaction.payee?.name}
        </td>
        <td className={twJoin("cursor-pointer truncate", rowStyles.cellBase)} onClick={onClick}>
          <div
            className="flex items-center gap-1.5 text-stone-600"
            onClick={(e) => {
              e.stopPropagation();
              onToggleExpand?.(transaction.id);
            }}
          >
            <ChevronDown size={14} className="shrink-0" />
            <span className="truncate">Split Transaction</span>
          </div>
        </td>
        <td className={twJoin("cursor-pointer truncate", rowStyles.cellBase)} onClick={onClick} />
        <OutInAmountCells
          amount={transaction.amount}
          highlightPositiveAmount
          className="cursor-pointer"
          onClick={onClick}
        />
        <StatusToggleCell status={transaction.status} onToggle={() => transaction.toggleStatus()} />
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
            <td className="py-1 px-3 pr-2 text-sm truncate" onClick={onClick}>
              <BudgetCell isInflow={posting.budget?.isToBeBudgeted}>
                {posting.budget?.isToBeBudgeted && (
                  <ArrowDownToLine className="inline-block mr-1.5" size={14} />
                )}
                {posting.budget?.isToBeBudgeted ? "Inflow" : posting.budget?.name}
              </BudgetCell>
            </td>
            <td className="py-1 px-3 pr-2 text-sm text-stone-600 truncate" onClick={onClick}>
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
