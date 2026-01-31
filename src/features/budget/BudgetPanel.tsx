import { X } from "lucide-react";
import { runInAction } from "mobx";
import { observer } from "mobx-react-lite";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Budget } from "@/models/Budget";
import { Goal, type GoalType } from "@/models/Goal";
import { formatCurrency, formatCurrencyInput, parseCurrencyInput } from "@/utils/formatting";
import { useLedger } from "@/utils/useLedger";

interface BudgetPanelProps {
  budget: Budget | null;
  onClose: () => void;
}

export const BudgetPanel = observer(function BudgetPanel({ budget, onClose }: BudgetPanelProps) {
  const { ledger } = useLedger();
  const [isEditingGoal, setIsEditingGoal] = useState(false);
  const [goalType, setGoalType] = useState<GoalType>("available");
  const [goalAmount, setGoalAmount] = useState("");

  const goal = budget?.goal;

  const handleStartEditGoal = () => {
    if (goal) {
      setGoalType(goal.type);
      setGoalAmount(formatCurrencyInput(goal.targetAmount));
    } else {
      setGoalType("available");
      setGoalAmount("");
    }
    setIsEditingGoal(true);
  };

  const handleSaveGoal = () => {
    if (!budget || !ledger) return;

    const targetAmount = parseCurrencyInput(goalAmount);
    if (targetAmount <= 0) return;

    runInAction(() => {
      if (goal) {
        // Update existing goal
        goal.setType(goalType);
        goal.setTargetAmount(targetAmount);
      } else {
        // Create new goal
        const newGoal = new Goal({ id: null, ledger });
        newGoal.type = goalType;
        newGoal.targetAmount = targetAmount;
        newGoal.budget = budget;
        ledger.goals.push(newGoal);
        ledger.incrementVersion();
      }
    });
    setIsEditingGoal(false);
  };

  const handleArchiveGoal = () => {
    if (!goal) return;
    goal.setIsArchived(true);
    setIsEditingGoal(false);
  };

  const handleCancelGoal = () => {
    setIsEditingGoal(false);
  };

  if (!budget) return null;

  return (
    <div className="w-80 shrink-0 border-l bg-white overflow-y-auto">
      <div className="p-4">
        {/* Header */}
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-lg font-semibold">Edit Budget</h2>
            <p className="text-sm text-muted-foreground">Configure budget settings and goals.</p>
          </div>
          <Button variant="ghost" size="icon" className="shrink-0 -mr-2 -mt-1" onClick={onClose}>
            <X size={16} />
          </Button>
        </div>

        <div className="space-y-6">
          {/* Budget Details Section */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-stone-500">Budget Details</h3>

            <div className="space-y-2">
              <Label htmlFor="budget-name">Name</Label>
              <Input
                id="budget-name"
                value={budget.name}
                onChange={(e) => {
                  runInAction(() => {
                    budget.name = e.target.value;
                  });
                }}
                placeholder="Budget name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="budget-category">Group</Label>
              <select
                id="budget-category"
                className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm"
                value={budget.budgetCategory?.id || ""}
                onChange={(e) => {
                  const budgetCategory = ledger?.getBudgetCategoryByID(e.target.value);
                  runInAction(() => {
                    budget.budgetCategory = budgetCategory || null;
                  });
                }}
              >
                <option value="">Uncategorized</option>
                {ledger?.budgetCategories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="budget-archived"
                checked={budget.isArchived}
                onCheckedChange={(checked) => {
                  runInAction(() => {
                    budget.isArchived = checked === true;
                  });
                }}
              />
              <Label htmlFor="budget-archived" className="text-sm text-stone-500">
                Archived (hide from budget list)
              </Label>
            </div>
          </div>

          {/* Goal Section */}
          <div className="space-y-4 border-t pt-6">
            <h3 className="text-sm font-medium text-stone-500">Goal</h3>

            {!isEditingGoal && !goal && (
              <Button variant="outline" className="w-full" onClick={handleStartEditGoal}>
                Set Goal
              </Button>
            )}

            {!isEditingGoal && goal && (
              <div className="space-y-4">
                <div className="rounded-lg bg-stone-50 p-4 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">
                      {goal.type === "monthly_assignment" ? "Monthly Assignment" : "Savings Target"}
                    </span>
                    <span className="text-sm text-stone-500">
                      {formatCurrency(goal.targetAmount)}
                    </span>
                  </div>

                  {/* Progress */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs text-stone-500">
                      <span>{formatCurrency(goal.progress.current)}</span>
                      <span>{Math.round(goal.progress.percentage)}%</span>
                    </div>
                    <div className="h-2 bg-stone-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all ${goal.progress.isComplete ? "bg-green-500" : "bg-amber-500"}`}
                        style={{ width: `${Math.min(100, goal.progress.percentage)}%` }}
                      />
                    </div>
                  </div>

                  {goal.progress.isComplete && (
                    <p className="text-xs text-green-600 font-medium">Goal complete!</p>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={handleStartEditGoal}>
                    Edit Goal
                  </Button>
                  <Button variant="ghost" size="sm" onClick={handleArchiveGoal}>
                    Archive Goal
                  </Button>
                </div>
              </div>
            )}

            {isEditingGoal && (
              <div className="space-y-4 rounded-lg border p-4">
                <div className="space-y-3">
                  <Label>Goal Type</Label>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="goal-type"
                        value="available"
                        checked={goalType === "available"}
                        onChange={() => setGoalType("available")}
                        className="w-4 h-4 text-green-600"
                      />
                      <div>
                        <span className="text-sm font-medium">Savings Target</span>
                        <p className="text-xs text-stone-500">
                          Track available balance over multiple months
                        </p>
                      </div>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="goal-type"
                        value="monthly_assignment"
                        checked={goalType === "monthly_assignment"}
                        onChange={() => setGoalType("monthly_assignment")}
                        className="w-4 h-4 text-green-600"
                      />
                      <div>
                        <span className="text-sm font-medium">Monthly Assignment</span>
                        <p className="text-xs text-stone-500">Target amount to assign each month</p>
                      </div>
                    </label>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="goal-amount">Target Amount</Label>
                  <Input
                    id="goal-amount"
                    type="text"
                    value={goalAmount}
                    onChange={(e) => setGoalAmount(e.target.value)}
                    placeholder="0,00"
                    className="tabular-nums"
                  />
                </div>

                <div className="flex gap-2">
                  <Button size="sm" onClick={handleSaveGoal}>
                    Save Goal
                  </Button>
                  <Button variant="ghost" size="sm" onClick={handleCancelGoal}>
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});
