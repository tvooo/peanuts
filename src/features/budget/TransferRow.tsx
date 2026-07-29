/** biome-ignore-all lint/a11y/noStaticElementInteractions: TODO: fix later */
/** biome-ignore-all lint/a11y/useKeyWithClickEvents: TODO: fix later */

import { AlertTriangle, ArrowLeftRight } from "lucide-react";
import { observer } from "mobx-react-lite";
import type * as React from "react";
import { twJoin } from "tailwind-merge";
import {
  OutInAmountCells,
  rowStyles,
  SelectionCheckboxCell,
  StatusToggleCell,
} from "@/components/Table";
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

interface TransferRowProps {
  transfer: Transfer;
  onClick?: () => void;
  onContextMenu?: (e: React.MouseEvent) => void;
  isInbound: boolean;
  selectedIds?: Set<string>;
  onToggleSelection?: (id: string) => void;
}

export const TransferRow = observer(function TransferRow({
  transfer,
  isInbound,
  onClick,
  onContextMenu,
  selectedIds,
  onToggleSelection,
}: TransferRowProps) {
  const rowClasses = twJoin(rowStyles.displayRow, transfer.isFuture && rowStyles.futureRow);
  // Show the other side of the transfer, relative to the account being viewed
  const otherAccount = isInbound ? transfer.fromAccount : transfer.toAccount;

  return (
    <tr className={rowClasses} onClick={onClick} onContextMenu={onContextMenu}>
      <SelectionCheckboxCell
        id={transfer.id}
        selectedIds={selectedIds}
        onToggleSelection={onToggleSelection}
      />
      <td className={twJoin("tabular-nums", rowStyles.cellBase)}>{formatDate(transfer.date!)}</td>
      <td className={twJoin(rowStyles.cellBase, "truncate")}>
        <div className="flex items-center gap-2">
          <ArrowLeftRight className="text-muted-foreground shrink-0" size={12} />
          <span className="truncate">{otherAccount?.name}</span>
        </div>
      </td>
      <td
        className={twJoin(rowStyles.cellBase, "text-muted-foreground font-normal italic truncate")}
      >
        <TransferBudgetCell transfer={transfer} />
      </td>
      <td className={twJoin(rowStyles.cellBase, "truncate")}>{transfer.note}</td>
      <OutInAmountCells
        amount={(isInbound ? 1 : -1) * transfer.amount}
        highlightPositiveAmount
        onClick={onClick}
      />
      <StatusToggleCell
        status={isInbound ? transfer.toStatus : transfer.fromStatus}
        onToggle={() => {
          if (isInbound) {
            transfer.toggleToStatus();
          } else {
            transfer.toggleFromStatus();
          }
        }}
      />
    </tr>
  );
});
