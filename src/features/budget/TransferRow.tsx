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
  return (
    <tr
      className={twJoin(
        "hover:bg-stone-100 rounded-md border-b border-stone-200",
        transfer.isFuture && "bg-stone-50 text-stone-400"
      )}
      onClick={onClick}
    >
      <td className="p-1 pl-8 w-[64px] align-middle">
        <input
          type="checkbox"
          checked={selectedIds?.has(transfer.id) || false}
          onChange={() => onToggleSelection?.(transfer.id)}
          onClick={(e) => e.stopPropagation()}
        />
      </td>
      <td className="tabular-nums py-2 px-3 pr-2 text-sm">{formatDate(transfer.date!)}</td>
      <td className="py-2 px-3 pr-2 text-sm">
        <div className="flex items-center gap-2">
          <ArrowLeftRight className="text-muted-foreground" size={12} />
          {transfer.toAccount?.name}
        </div>
      </td>
      <td className="py-2 px-3 pr-2 text-sm text-muted-foreground font-normal italic">
        <TransferBudgetCell transfer={transfer} />
      </td>
      <td className="py-2 px-3 pr-2 text-sm">{transfer.note}</td>
      <OutInAmountCells amount={(isInbound ? 1 : -1) * transfer.amount} highlightPositiveAmount />
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
