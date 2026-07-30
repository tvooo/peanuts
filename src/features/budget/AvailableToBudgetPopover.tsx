import { subMonths } from "date-fns";
import { observer } from "mobx-react-lite";
import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { Ledger } from "@/models/Ledger";
import { formatCurrency } from "@/utils/formatting";

interface AvailableToBudgetPopoverProps {
  currentMonth: Date;
  ledger: Ledger;
}

export const AvailableToBudgetPopover = observer(function AvailableToBudgetPopover({
  currentMonth,
  ledger,
}: AvailableToBudgetPopoverProps) {
  const [open, setOpen] = useState(false);

  const inflowBudget = ledger.getInflowBudget()!;
  const lastMonthAvailable = ledger.budgetAvailableForMonth(
    inflowBudget,
    subMonths(currentMonth, 1)
  );
  const inflow = ledger.budgetActivityForMonth(inflowBudget, currentMonth);
  const assignedThisMonth = ledger.assignedForMonth(currentMonth);
  const futureInflow = ledger.inflowAfterMonth(currentMonth);
  const futureAssigned = ledger.assignedAfterMonth(currentMonth);
  const futureNet = futureInflow - futureAssigned;
  const futureDeduction = Math.max(0, -futureNet);

  const availableToBudget =
    ledger.budgetAvailableForMonth(inflowBudget, currentMonth) - futureDeduction;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="text-right cursor-pointer hover:bg-muted/50 rounded px-2 py-1 -mx-2 -my-1"
        >
          <div className="text-xs text-muted-foreground">Available to budget</div>
          <div className="text-xl font-bold font-mono tabular-nums">
            {formatCurrency(availableToBudget)}
          </div>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0" align="end">
        <div className="p-3 space-y-2 text-sm">
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Rollover from last month</span>
            <span className="font-mono tabular-nums text-green-600">
              +{formatCurrency(lastMonthAvailable)}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Inflow this month</span>
            <span className="font-mono tabular-nums text-green-600">+{formatCurrency(inflow)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Assigned this month</span>
            <span className="font-mono tabular-nums text-orange-600">
              -{formatCurrency(assignedThisMonth)}
            </span>
          </div>
          {futureNet !== 0 && (
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Assigned in the future</span>
              <span
                className={`font-mono tabular-nums ${futureNet >= 0 ? "text-green-600" : "text-orange-600"}`}
              >
                {futureNet >= 0 ? "+" : ""}
                {formatCurrency(futureNet)}
              </span>
            </div>
          )}
          <div className="border-t pt-2 flex justify-between items-center font-medium">
            <span>Available</span>
            <span className="font-mono tabular-nums">{formatCurrency(availableToBudget)}</span>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
});
