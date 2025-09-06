import { AmountCell } from "@/components/Table";
import { Transfer } from "@/models/Transfer";
import { formatDate } from "@/utils/formatting";
import { useLedger } from "@/utils/useLedger";
import { ArrowLeftRight, CheckCheck } from "lucide-react";

interface TransferRowProps {
  transfer: Transfer;
  onClick?: () => void;
  isInbound: boolean;
}

export const TransferRow = ({ transfer, isInbound, onClick }: TransferRowProps) => {
  const { ledger } = useLedger();
  return (
    <tr
      className="hover:bg-stone-100 rounded-md border-b border-stone-200"
      onClick={onClick}
    >
      <td className="p-1 pl-8 w-[64px] align-middle">
        <input type="checkbox" />
      </td>
      <td className="tabular-nums py-2">{formatDate(transfer.date!)}</td>
      <td>
        <div className="flex items-center gap-2">
          <ArrowLeftRight className="text-muted-foreground" size={12} />
          {transfer.toAccount?.name}
        </div>
      </td>
      <td className="text-muted-foreground font-normal italic">Transfer</td>
      <td>{transfer.note}</td>
      <td>
        <AmountCell
          amount={(isInbound ? -1 : 1) * transfer.amount}
          highlightPositiveAmount
        />
      </td>
      <td className="pr-8 text-center">
        {transfer.fromStatus === "cleared" ? (
          <CheckCheck width={20} className="inline-block" />
        ) : (
          <>&middot;</>
        )}
      </td>
    </tr>
  );
};
