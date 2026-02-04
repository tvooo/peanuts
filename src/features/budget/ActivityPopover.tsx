import { format, isSameMonth } from "date-fns";
import { observer } from "mobx-react-lite";
import { useState } from "react";
import { AmountCell } from "@/components/Table";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { Budget } from "@/models/Budget";
import type { Ledger } from "@/models/Ledger";
import { formatCurrency } from "@/utils/formatting";

interface ActivityItem {
  date: Date;
  payee: string;
  notes: string;
  amount: number;
}

interface ActivityPopoverProps {
  budget: Budget;
  currentMonth: Date;
  ledger: Ledger;
}

export const ActivityPopover = observer(function ActivityPopover({
  budget,
  currentMonth,
  ledger,
}: ActivityPopoverProps) {
  const [open, setOpen] = useState(false);
  const activityAmount = ledger.budgetActivityForMonth(budget, currentMonth);

  const items: ActivityItem[] = [];

  if (open) {
    // Transactions with postings for this budget
    for (const t of ledger.transactions) {
      if (t.isFuture || t.account?.type === "tracking") continue;
      if (!t.date || !isSameMonth(t.date, currentMonth)) continue;

      for (const p of t.postings) {
        if (p.budget?.id !== budget.id) continue;
        items.push({
          date: t.date,
          payee: t.payee?.name ?? "",
          notes: p.note,
          amount: p.amount,
        });
      }
    }

    // Cross-type transfers affecting this budget
    for (const t of ledger.transfers) {
      if (t.isFuture) continue;
      if (!t.date || !isSameMonth(t.date, currentMonth)) continue;
      if (t.fromAccount?.type === t.toAccount?.type) continue;

      const targetBudget = t.budget ?? ledger.budgets.find((b) => b.isToBeBudgeted) ?? null;
      if (targetBudget?.id !== budget.id) continue;

      const trackingAccount = t.toAccount?.type === "budget" ? t.fromAccount : t.toAccount;
      const amount = t.toAccount?.type === "budget" ? t.amount : -t.amount;

      items.push({
        date: t.date,
        payee: trackingAccount?.name ?? "",
        notes: t.note,
        amount,
      });
    }

    items.sort((a, b) => a.date.getTime() - b.date.getTime());
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="py-2 px-3 pr-2 text-sm w-full text-left"
          onClick={(e) => e.stopPropagation()}
        >
          <AmountCell amount={activityAmount} />
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-96 p-0"
        align="end"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        {items.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">No activity this month.</p>
        ) : (
          <div className="max-h-64 overflow-auto">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-popover border-b">
                <tr className="text-muted-foreground">
                  <th className="text-left font-medium px-3 py-2">Date</th>
                  <th className="text-left font-medium px-3 py-2">Payee</th>
                  <th className="text-left font-medium px-3 py-2">Notes</th>
                  <th className="text-right font-medium px-3 py-2">Amount</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, i) => (
                  <tr key={i} className="border-b last:border-b-0">
                    <td className="px-3 py-1.5 tabular-nums whitespace-nowrap">
                      {format(item.date, "dd.MM.")}
                    </td>
                    <td className="px-3 py-1.5 truncate max-w-[120px]">{item.payee}</td>
                    <td className="px-3 py-1.5 truncate max-w-[100px] text-muted-foreground">
                      {item.notes}
                    </td>
                    <td className="px-3 py-1.5 text-right tabular-nums whitespace-nowrap">
                      {formatCurrency(item.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
});
