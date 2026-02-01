import { isSameMonth } from "date-fns";
import { observer } from "mobx-react-lite";
import { useState } from "react";
import { Combobox } from "@/components/Combobox";
import { AmountCell } from "@/components/Table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { type BudgetOption, useBudgetGroups } from "@/hooks/useBudgetGroups";
import { Assignment } from "@/models/Assignment";
import type { Budget } from "@/models/Budget";
import type { Ledger } from "@/models/Ledger";
import { parseCurrencyInput } from "@/utils/formatting";

interface MoveMoneyPopoverProps {
  sourceBudget: Budget;
  currentMonth: Date;
  ledger: Ledger;
}

export const MoveMoneyPopover = observer(function MoveMoneyPopover({
  sourceBudget,
  currentMonth,
  ledger,
}: MoveMoneyPopoverProps) {
  const [open, setOpen] = useState(false);
  const [amountInput, setAmountInput] = useState("");
  const [targetBudget, setTargetBudget] = useState<BudgetOption | null>(null);

  const budgetGroups = useBudgetGroups(ledger, { excludeBudgetId: sourceBudget.id });
  const availableAmount = ledger.budgetAvailableForMonth(sourceBudget, currentMonth);

  const handleMove = () => {
    if (!targetBudget?.budget) return;

    const amount = parseCurrencyInput(amountInput);
    if (amount === 0) return;

    // Get or create source assignment
    let sourceAssignment = ledger.assignments.find(
      (a) => a.budget === sourceBudget && isSameMonth(a.date!, currentMonth)
    );
    if (!sourceAssignment) {
      sourceAssignment = new Assignment({ ledger, id: null });
      sourceAssignment.budget = sourceBudget;
      sourceAssignment.date = currentMonth;
      sourceAssignment.amount = 0;
      ledger.assignments.push(sourceAssignment);
    }

    // Get or create target assignment
    let targetAssignment = ledger.assignments.find(
      (a) => a.budget === targetBudget.budget && isSameMonth(a.date!, currentMonth)
    );
    if (!targetAssignment) {
      targetAssignment = new Assignment({ ledger, id: null });
      targetAssignment.budget = targetBudget.budget;
      targetAssignment.date = currentMonth;
      targetAssignment.amount = 0;
      ledger.assignments.push(targetAssignment);
    }

    // Move money: decrease source, increase target
    sourceAssignment.setAmount(sourceAssignment.amount - amount);
    targetAssignment.setAmount(targetAssignment.amount + amount);

    // Reset and close
    setAmountInput("");
    setTargetBudget(null);
    setOpen(false);
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      // Reset state when closing
      setAmountInput("");
      setTargetBudget(null);
    }
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <button type="button" className="w-full text-left" onClick={(e) => e.stopPropagation()}>
          <AmountCell amount={availableAmount} highlightNegativeAmount chip />
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-72"
        align="end"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <h4 className="font-medium text-sm">Move money from</h4>
            <p className="text-sm text-muted-foreground truncate">{sourceBudget.name}</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Amount</Label>
            <Input
              id="amount"
              type="text"
              className="tabular-nums"
              value={amountInput}
              onChange={(e) => setAmountInput(e.target.value)}
              placeholder="0,00"
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label>To budget</Label>
            <Combobox
              groups={budgetGroups}
              value={targetBudget}
              onValueChange={setTargetBudget}
              placeholder="Select budget..."
            />
          </div>

          <Button
            className="w-full"
            onClick={handleMove}
            disabled={!targetBudget || parseCurrencyInput(amountInput) === 0}
          >
            Move
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
});
