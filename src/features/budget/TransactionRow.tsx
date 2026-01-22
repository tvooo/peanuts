/** biome-ignore-all lint/a11y/noStaticElementInteractions: TODO: fix later */
/** biome-ignore-all lint/a11y/useKeyWithClickEvents: TODO: fix later */

import { ArrowDownToLine, CheckCheck, ChevronDown, ChevronRight, Repeat } from "lucide-react";
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

export const TransactionRow = ({
  transaction,
  onClick,
  selectedIds,
  onToggleSelection,
  isExpanded,
  onToggleExpand,
}: TransactionRowProps) => {
  // Single posting - render as before
  if (!transaction.isSplit) {
    return (
      <tr
        className={twJoin(
          "hover:bg-stone-100 rounded-md border-b border-stone-200",
          transaction.isFuture && "bg-stone-50 text-stone-400",
          transaction.hasMissingCategory && "bg-amber-50"
        )}
        onClick={onClick}
      >
        <td className="p-1 pl-8 w-[64px] align-middle">
          <input
            type="checkbox"
            checked={selectedIds?.has(transaction.id) || false}
            onChange={() => onToggleSelection?.(transaction.id)}
            onClick={(e) => e.stopPropagation()}
          />
        </td>
        <td className="tabular-nums py-2 px-3 pr-2 text-sm">
          <span className="inline-flex items-center gap-1.5">
            {formatDate(transaction.date!)}
            {transaction.recurringTemplateId && (
              <span title="Created from recurring template">
                <Repeat size={12} className="text-stone-400" />
              </span>
            )}
          </span>
        </td>
        <td className="py-2 px-3 pr-2 text-sm">{transaction.payee?.name}</td>
        <td className="py-2 px-3 pr-2 text-sm">
          <BudgetCell isInflow={transaction.postings[0]?.budget?.isToBeBudgeted}>
            {transaction.postings[0]?.budget?.isToBeBudgeted && (
              <ArrowDownToLine className="inline-block mr-1.5" size={14} />
            )}
            {transaction.postings[0]?.budget?.isToBeBudgeted
              ? "Inflow"
              : transaction.postings[0]?.budget?.name}
          </BudgetCell>
        </td>
        <td className="py-2 px-3 pr-2 text-sm">{transaction.postings[0]?.note}</td>
        <OutInAmountCells amount={transaction.amount} highlightPositiveAmount />
        <td className="pr-2 text-center">
          {transaction.status === "cleared" ? (
            <CheckCheck width={20} className="inline-block" />
          ) : (
            <>&middot;</>
          )}
        </td>
      </tr>
    );
  }

  // Split transaction - collapsed
  if (!isExpanded) {
    return (
      <tr
        className={twJoin(
          "hover:bg-stone-100 rounded-md border-b border-stone-200 cursor-pointer",
          transaction.isFuture && "bg-stone-50 text-stone-400",
          transaction.hasMissingCategory && "bg-amber-50"
        )}
        onClick={(e) => {
          // If clicking checkbox, don't toggle expand
          if ((e.target as HTMLElement).tagName === "INPUT") return;
          onToggleExpand?.(transaction.id);
        }}
      >
        <td className="p-1 pl-8 w-[64px] align-middle">
          <input
            type="checkbox"
            checked={selectedIds?.has(transaction.id) || false}
            onChange={() => onToggleSelection?.(transaction.id)}
            onClick={(e) => e.stopPropagation()}
          />
        </td>
        <td className="tabular-nums py-2 px-3 pr-2 text-sm">
          <span className="inline-flex items-center gap-1.5">
            {formatDate(transaction.date!)}
            {transaction.recurringTemplateId && (
              <span title="Created from recurring template">
                <Repeat size={12} className="text-stone-400" />
              </span>
            )}
          </span>
        </td>
        <td className="py-2 px-3 pr-2 text-sm">{transaction.payee?.name}</td>
        <td className="py-2 px-3 pr-2 text-sm">
          <div className="flex items-center gap-1.5 text-stone-600">
            <ChevronRight size={14} />
            <span>Split ({transaction.postings.length})</span>
          </div>
        </td>
        <td className="py-2 px-3 pr-2 text-sm"></td>
        <OutInAmountCells amount={transaction.amount} highlightPositiveAmount />
        <td className="pr-2 text-center">
          {transaction.status === "cleared" ? (
            <CheckCheck width={20} className="inline-block" />
          ) : (
            <>&middot;</>
          )}
        </td>
      </tr>
    );
  }

  // Split transaction - expanded
  return (
    <>
      {/* Main header row */}
      <tr
        className={twJoin(
          "hover:bg-stone-100 border-b-0 cursor-pointer",
          transaction.isFuture && "bg-stone-50 text-stone-400",
          transaction.hasMissingCategory && "bg-amber-50"
        )}
        onClick={(e) => {
          // If clicking checkbox or edit icon, don't toggle expand
          if ((e.target as HTMLElement).tagName === "INPUT") return;
          // Allow click on row to edit
          onClick?.();
        }}
      >
        <td className="p-1 pl-8 w-[64px] align-middle">
          <input
            type="checkbox"
            checked={selectedIds?.has(transaction.id) || false}
            onChange={() => onToggleSelection?.(transaction.id)}
            onClick={(e) => e.stopPropagation()}
          />
        </td>
        <td className="tabular-nums py-2 px-3 pr-2 text-sm">
          <span className="inline-flex items-center gap-1.5">
            {formatDate(transaction.date!)}
            {transaction.recurringTemplateId && (
              <span title="Created from recurring template">
                <Repeat size={12} className="text-stone-400" />
              </span>
            )}
          </span>
        </td>
        <td className="py-2 px-3 pr-2 text-sm">{transaction.payee?.name}</td>
        <td className="py-2 px-3 pr-2 text-sm">
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
        <td className="py-2 px-3 pr-2 text-sm"></td>
        <OutInAmountCells amount={transaction.amount} highlightPositiveAmount />
        <td className="pr-2 text-center">
          {transaction.status === "cleared" ? (
            <CheckCheck width={20} className="inline-block" />
          ) : (
            <>&middot;</>
          )}
        </td>
      </tr>

      {/* Sub-rows for each posting */}
      {transaction.postings.map((posting, index) => (
        <tr
          key={posting.id}
          className={twJoin(
            "bg-stone-50/50 border-b-0",
            index === transaction.postings.length - 1 && "border-b border-stone-200",
            transaction.isFuture && "text-stone-400"
          )}
          onClick={onClick}
        >
          <td className="p-1 pl-8 w-[64px]"></td>
          <td className="py-1 px-3 pr-2"></td>
          <td className="py-1 px-3 pr-2 pl-8">
            <div className="flex items-center gap-2 text-stone-500 text-sm">
              <span>{index === transaction.postings.length - 1 ? "└─" : "├─"}</span>
            </div>
          </td>
          <td className="py-1 px-3 pr-2 text-sm">
            <BudgetCell isInflow={posting.budget?.isToBeBudgeted}>
              {posting.budget?.isToBeBudgeted && (
                <ArrowDownToLine className="inline-block mr-1.5" size={14} />
              )}
              {posting.budget?.isToBeBudgeted ? "Inflow" : posting.budget?.name}
            </BudgetCell>
          </td>
          <td className="py-1 px-3 pr-2 text-sm text-stone-600">{posting.note}</td>
          <OutInAmountCells amount={posting.amount} highlightPositiveAmount />
          <td className="pr-2"></td>
        </tr>
      ))}
    </>
  );
};
