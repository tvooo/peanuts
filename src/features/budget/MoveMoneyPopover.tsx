import { isSameMonth } from "date-fns";
import { observer } from "mobx-react-lite";
import { useState } from "react";
import { Combobox } from "@/components/Combobox";
import { Currency } from "@/components/Currency";
import { AmountCell } from "@/components/Table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { type BudgetOption, useBudgetGroups } from "@/hooks/useBudgetGroups";
import { Assignment } from "@/models/Assignment";
import type { Budget } from "@/models/Budget";
import type { Ledger } from "@/models/Ledger";
import { formatCurrencyInput, parseCurrencyInput } from "@/utils/formatting";

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
  const [selectedBudget, setSelectedBudget] = useState<BudgetOption | null>(null);

  const budgetGroups = useBudgetGroups(ledger, { excludeBudgetId: sourceBudget.id });
  const availableAmount = ledger.budgetAvailableForMonth(sourceBudget, currentMonth);
  const isOverspent = availableAmount < 0;
  const overspentAmount = Math.abs(availableAmount);

  // When covering an overspend, never pull more than the source budget actually has
  // available — otherwise we'd just push the source into overspending instead.
  const selectedAvailable =
    selectedBudget?.budget != null
      ? ledger.budgetAvailableForMonth(selectedBudget.budget, currentMonth)
      : 0;
  const coverAmount = Math.min(overspentAmount, Math.max(0, selectedAvailable));

  const handleMove = () => {
    if (!selectedBudget?.budget) return;

    // In overspent mode, amount is capped to the source's available; otherwise parse input
    const amount = isOverspent ? coverAmount : parseCurrencyInput(amountInput);
    if (amount <= 0) return;

    // Determine actual source and target based on mode
    // Normal mode: sourceBudget -> selectedBudget
    // Overspent mode: selectedBudget -> sourceBudget (cover the overspending)
    const actualSource = isOverspent ? selectedBudget.budget : sourceBudget;
    const actualTarget = isOverspent ? sourceBudget : selectedBudget.budget;

    // Get or create source assignment
    let sourceAssignment = ledger.assignments.find(
      (a) => a.budget === actualSource && isSameMonth(a.date!, currentMonth)
    );
    if (!sourceAssignment) {
      sourceAssignment = new Assignment({ ledger, id: null });
      sourceAssignment.budget = actualSource;
      sourceAssignment.date = currentMonth;
      sourceAssignment.amount = 0;
      ledger.assignments.push(sourceAssignment);
    }

    // Get or create target assignment
    let targetAssignment = ledger.assignments.find(
      (a) => a.budget === actualTarget && isSameMonth(a.date!, currentMonth)
    );
    if (!targetAssignment) {
      targetAssignment = new Assignment({ ledger, id: null });
      targetAssignment.budget = actualTarget;
      targetAssignment.date = currentMonth;
      targetAssignment.amount = 0;
      ledger.assignments.push(targetAssignment);
    }

    // Move money: decrease source, increase target
    sourceAssignment.setAmount(sourceAssignment.amount - amount);
    targetAssignment.setAmount(targetAssignment.amount + amount);

    // Reset and close
    setAmountInput("");
    setSelectedBudget(null);
    setOpen(false);
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (newOpen) {
      // Prefill the amount with everything currently available to move
      if (!isOverspent) {
        setAmountInput(formatCurrencyInput(availableAmount));
      }
    } else {
      // Reset state when closing
      setAmountInput("");
      setSelectedBudget(null);
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
          {isOverspent ? (
            <>
              <div className="space-y-2">
                <h4 className="font-medium text-sm">Cover overspending</h4>
                <p className="text-sm text-muted-foreground">
                  <Currency amount={overspentAmount} /> needed for{" "}
                  <span className="font-medium text-foreground">{sourceBudget.name}</span>
                </p>
              </div>

              <div className="space-y-2">
                <Label>From budget</Label>
                <Combobox
                  groups={budgetGroups}
                  value={selectedBudget}
                  onValueChange={setSelectedBudget}
                  placeholder="Select budget..."
                  autoFocus
                />
                {selectedBudget?.budget && coverAmount < overspentAmount && (
                  <p className="text-xs text-muted-foreground">
                    {coverAmount > 0 ? (
                      <>
                        Only <Currency amount={coverAmount} /> available here —{" "}
                        <Currency amount={overspentAmount - coverAmount} /> will stay overspent.
                      </>
                    ) : (
                      <>Nothing available in this budget to move.</>
                    )}
                  </p>
                )}
              </div>

              <Button
                className="w-full"
                onClick={handleMove}
                disabled={!selectedBudget || coverAmount <= 0}
              >
                {coverAmount > 0 && coverAmount < overspentAmount ? (
                  <>
                    Cover <Currency amount={coverAmount} />
                  </>
                ) : (
                  "Cover"
                )}
              </Button>
            </>
          ) : (
            <>
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
                  value={selectedBudget}
                  onValueChange={setSelectedBudget}
                  placeholder="Select budget..."
                />
              </div>

              <Button
                className="w-full"
                onClick={handleMove}
                disabled={!selectedBudget || parseCurrencyInput(amountInput) === 0}
              >
                Move
              </Button>
            </>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
});
