/** biome-ignore-all lint/a11y/noStaticElementInteractions: TODO: fix later */
/** biome-ignore-all lint/a11y/useKeyWithClickEvents: TODO: fix later */

import { AlertTriangle, ArrowLeftRight, CheckCheck } from "lucide-react";
import { twJoin } from "tailwind-merge";
import { OutInAmountCells } from "@/components/Table";
import type { Transfer } from "@/models/Transfer";
import { formatDate } from "@/utils/formatting";

function TransferBudgetCell({ transfer }: { transfer: Transfer }) {
  // Show budget name for cross-type transfers
  if (transfer.isCrossType) {
    if (transfer.budget) {
      return <span>{transfer.budget.name}</span>;
    }
    // Warning: cross-type transfer without budget
    return (
      <span className="flex items-center gap-1 text-amber-600">
        <AlertTriangle size={14} />
        Uncategorized
      </span>
    );
  }
  // Same-type transfer: no budget needed
  return <span>Transfer</span>;
}

// Common cell styling
const cellBase = "py-2 px-3 pr-2 text-sm";

interface TransferRowProps {
  transfer: Transfer;
  onClick?: () => void;
  isInbound: boolean;
  selectedIds?: Set<string>;
  onToggleSelection?: (id: string) => void;
}

export const TransferRow = ({
  transfer,
  isInbound,
  onClick,
  selectedIds,
  onToggleSelection,
}: TransferRowProps) => {
  const rowClasses = twJoin(
    "hover:bg-stone-100 border-b border-stone-200",
    transfer.isFuture && "bg-stone-50 text-stone-400"
  );

  return (
    <tr className={rowClasses} onClick={onClick}>
      <td className="p-1 pl-8 align-middle">
        <input
          type="checkbox"
          checked={selectedIds?.has(transfer.id) || false}
          onChange={() => onToggleSelection?.(transfer.id)}
          onClick={(e) => e.stopPropagation()}
        />
      </td>
      <td className={twJoin("tabular-nums", cellBase)}>{formatDate(transfer.date!)}</td>
      <td className={cellBase}>
        <div className="flex items-center gap-2">
          <ArrowLeftRight className="text-muted-foreground" size={12} />
          {transfer.toAccount?.name}
        </div>
      </td>
      <td className={twJoin(cellBase, "text-muted-foreground font-normal italic")}>
        <TransferBudgetCell transfer={transfer} />
      </td>
      <td className={cellBase}>{transfer.note}</td>
      <OutInAmountCells
        amount={(isInbound ? 1 : -1) * transfer.amount}
        highlightPositiveAmount
        onClick={onClick}
      />
      <td className="pr-2 text-center">
        {transfer.fromStatus === "cleared" ? (
          <CheckCheck width={20} className="inline-block" />
        ) : (
          <>&middot;</>
        )}
      </td>
    </tr>
  );
};
