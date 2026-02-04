import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { isSameMonth, subMonths } from "date-fns";
import { Archive, CheckCircle2, Circle } from "lucide-react";
import { observer } from "mobx-react-lite";
import { Fragment, useEffect, useMemo, useState } from "react";
import { AmountCell, HeaderCell } from "@/components/Table";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Popover, PopoverAnchor, PopoverContent } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Assignment } from "@/models/Assignment";
import type { Budget } from "@/models/Budget";
import type { Goal } from "@/models/Goal";
import type { Ledger } from "@/models/Ledger";
import { formatCurrency, formatCurrencyInput, parseCurrencyInput } from "@/utils/formatting";
import { ActivityPopover } from "./ActivityPopover";
import { BudgetPanel } from "./BudgetPanel";
import { MoveMoneyPopover } from "./MoveMoneyPopover";

// Helper to stop event propagation (for cells that shouldn't trigger row selection)
const stopPropagation = {
  onClick: (e: React.MouseEvent) => e.stopPropagation(),
  onKeyDown: (e: React.KeyboardEvent) => e.stopPropagation(),
};

// Component for editing assignment amount with text parsing
// Allows negative numbers for moving money back to "to be budgeted"
// Shows a popover with quick budget options (goal, last month, average)
function AssignmentInput({
  assignment,
  budget,
  ledger,
  currentMonth,
  onClose,
}: {
  assignment: Assignment;
  budget: Budget;
  ledger: Ledger;
  currentMonth: Date;
  onClose: () => void;
}) {
  const [value, setValue] = useState(() => formatCurrencyInput(assignment.amount));
  const [popoverOpen, setPopoverOpen] = useState(true);

  const handleBlur = () => {
    const parsed = parseCurrencyInput(value, true);
    assignment.setAmount(parsed);
    setValue(formatCurrencyInput(parsed));
    setPopoverOpen(false);
  };

  const handleQuickBudget = (amount: number) => {
    assignment.setAmount(amount);
    onClose();
  };

  // Quick budget options
  const goal = budget.goal;
  const goalAmount = goal?.type === "monthly_assignment" ? goal.targetAmount : null;

  const lastMonth = subMonths(currentMonth, 1);
  const assignedLastMonth =
    ledger.assignments.find((a) => a.budget === budget && a.date && isSameMonth(a.date, lastMonth))
      ?.amount ?? 0;

  const pastAssignments = ledger.assignments.filter(
    (a) => a.budget === budget && a.date && !isSameMonth(a.date, currentMonth) && a.amount !== 0
  );
  const averageAssigned =
    pastAssignments.length > 0
      ? Math.round(pastAssignments.reduce((sum, a) => sum + a.amount, 0) / pastAssignments.length)
      : 0;

  const options: { label: string; amount: number }[] = [];
  if (goalAmount != null && goalAmount !== 0) options.push({ label: "Goal", amount: goalAmount });
  if (assignedLastMonth !== 0)
    options.push({ label: "Assigned last month", amount: assignedLastMonth });
  if (averageAssigned !== 0) options.push({ label: "Average assigned", amount: averageAssigned });

  return (
    <Popover open={popoverOpen && options.length > 0} onOpenChange={setPopoverOpen}>
      <PopoverAnchor asChild>
        <Input
          autoFocus
          type="text"
          className="tabular-nums text-right"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onFocus={() => setPopoverOpen(true)}
          onBlur={handleBlur}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              handleBlur();
              onClose();
            } else if (e.key === "Escape") {
              onClose();
            }
          }}
          placeholder="0,00"
        />
      </PopoverAnchor>
      <PopoverContent
        className="w-auto p-1"
        align="start"
        onOpenAutoFocus={(e) => e.preventDefault()}
        onCloseAutoFocus={(e) => e.preventDefault()}
        onMouseDown={(e) => e.preventDefault()}
      >
        <div className="flex flex-col">
          {options.map((option) => (
            <button
              key={option.label}
              type="button"
              className="flex items-center justify-between gap-4 rounded px-3 py-1.5 text-sm hover:bg-accent text-left"
              onClick={() => handleQuickBudget(option.amount)}
            >
              <span className="text-muted-foreground">{option.label}</span>
              <span className="tabular-nums font-medium">{formatCurrency(option.amount)}</span>
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

// Small indicator showing goal progress state
function GoalIndicator({
  goal,
  month,
  className,
}: {
  goal: Goal;
  month: Date;
  className?: string;
}) {
  const { percentage, isComplete } = goal.progressForMonth(month);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className={className}>
          {isComplete ? (
            <CheckCircle2 size={14} className="text-green-500" />
          ) : (
            <Circle size={14} className="text-amber-500" />
          )}
        </span>
      </TooltipTrigger>
      <TooltipContent>
        <p className="text-xs">
          {goal.type === "monthly_assignment" ? "Monthly: " : "Savings: "}
          {Math.round(percentage)}% of {formatCurrency(goal.targetAmount)}
        </p>
      </TooltipContent>
    </Tooltip>
  );
}

interface BudgetTableProps {
  ledger: Ledger;
  currentMonth: Date;
}

type BudgetRow = Budget;

const columnHelper = createColumnHelper<BudgetRow>();

export const BudgetTable = observer(function BudgetTable({
  currentMonth,
  ledger,
}: BudgetTableProps) {
  const [selectedBudget, setSelectedBudget] = useState<Budget | null>(null);
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [showArchived, setShowArchived] = useState(false);

  // Handle Escape key to close panel
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && selectedBudget) {
        setSelectedBudget(null);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [selectedBudget]);

  // Get all budgets excluding "To be budgeted" and optionally archived
  const data = ledger.budgets.filter((budget) => !budget.isToBeBudgeted && !budget.isArchived);
  const archivedData = ledger.budgets.filter(
    (budget) => !budget.isToBeBudgeted && budget.isArchived
  );

  // Define columns
  const columns = useMemo(
    () => [
      columnHelper.display({
        id: "checkbox",
        header: () => null,
        cell: () => null,
      }),
      columnHelper.display({
        id: "name",
        header: () => <HeaderCell>Budget</HeaderCell>,
        cell: () => null,
      }),
      columnHelper.display({
        id: "budgeted",
        header: () => <HeaderCell alignRight>Budgeted</HeaderCell>,
        cell: () => null,
      }),
      columnHelper.display({
        id: "activity",
        header: () => <HeaderCell alignRight>Activity</HeaderCell>,
        cell: () => null,
      }),
      columnHelper.display({
        id: "available",
        header: () => <HeaderCell alignRight>Available</HeaderCell>,
        cell: () => null,
      }),
    ],
    []
  );

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    autoResetAll: false,
  });

  return (
    <div className="flex h-full">
      <div className="flex-1 overflow-auto min-w-0">
        <table className="table w-full table-fixed">
          <thead className="sticky top-0 bg-white z-10">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id} className="border-b border-stone-300">
                {headerGroup.headers.map((header) => {
                  const widthClass =
                    header.id === "checkbox"
                      ? "w-[64px]"
                      : header.id === "budgeted" ||
                          header.id === "activity" ||
                          header.id === "available"
                        ? "w-[160px]"
                        : "";
                  const headerClasses =
                    header.id === "checkbox"
                      ? `p-1 pl-8 ${widthClass}`
                      : header.id === "available"
                        ? `pr-2 ${widthClass}`
                        : `px-3 pr-2 ${widthClass}`;
                  return (
                    <th key={header.id} className={headerClasses}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {/* Render budgets grouped by category */}
            {ledger.budgetCategories.map((budgetCategory) => (
              <Fragment key={budgetCategory.id}>
                <tr className="border-b border-stone-200 bg-stone-50">
                  <td className="p-1 pl-8 w-[64px]" />
                  <td colSpan={4} className="py-2 px-3 pr-2 text-sm font-bold">
                    {budgetCategory.name}
                  </td>
                </tr>
                {data
                  .filter((budget) => budget.budgetCategory === budgetCategory)
                  .map((budget, idx) => (
                    <tr
                      className={`hover:bg-stone-100 rounded-md border-b border-stone-200 cursor-pointer ${selectedBudget === budget ? "bg-blue-50 hover:bg-blue-50" : ""}`}
                      key={idx}
                      onClick={() => setSelectedBudget(budget)}
                    >
                      <td className="p-1 pl-8 w-[64px] align-middle" {...stopPropagation}>
                        <Checkbox />
                      </td>
                      <td className="py-2 px-3 pr-2 text-sm align-middle">
                        <div className="flex items-center">
                          {budget.goal && (
                            <GoalIndicator
                              goal={budget.goal}
                              month={currentMonth}
                              className="mr-2"
                            />
                          )}
                          {budget.name}
                        </div>
                      </td>
                      {assignment ===
                      ledger.assignments.find(
                        (a) => a.budget === budget && isSameMonth(a.date!, currentMonth)
                      ) ? (
                        <td className="py-2 px-3 pr-2" {...stopPropagation}>
                          <AssignmentInput
                            assignment={assignment}
                            budget={budget}
                            ledger={ledger}
                            currentMonth={currentMonth}
                            onClose={() => setAssignment(null)}
                          />
                        </td>
                      ) : (
                        <td className="align-middle" {...stopPropagation}>
                          <button
                            type="button"
                            className="py-2 px-3 pr-2 text-sm"
                            onClick={() => {
                              let assignment = ledger.assignments.find(
                                (a) => a.budget === budget && isSameMonth(a.date!, currentMonth)
                              );
                              if (!assignment) {
                                assignment = new Assignment({
                                  ledger: ledger!,
                                  id: null,
                                });
                                assignment.budget = budget;
                                assignment.date = currentMonth;
                                assignment.amount = 0;
                                ledger.assignments.push(assignment);
                              }
                              setAssignment(assignment);
                            }}
                          >
                            <AmountCell
                              amount={ledger.budgetAssignedForMonth(budget, currentMonth)}
                            />
                          </button>
                        </td>
                      )}

                      <td className="align-middle" {...stopPropagation}>
                        <ActivityPopover
                          budget={budget}
                          currentMonth={currentMonth}
                          ledger={ledger}
                        />
                      </td>
                      <td className="py-2 pr-2" {...stopPropagation}>
                        <MoveMoneyPopover
                          sourceBudget={budget}
                          currentMonth={currentMonth}
                          ledger={ledger}
                        />
                      </td>
                    </tr>
                  ))}
              </Fragment>
            ))}
            {/* Uncategorized budgets */}
            {data.filter((budget) => !budget.budgetCategory).length > 0 && (
              <Fragment>
                <tr className="border-b border-stone-200 bg-stone-50">
                  <td className="p-1 pl-8 w-[64px]" />
                  <td colSpan={4} className="py-2 px-3 pr-2 text-sm font-bold">
                    Uncategorized
                  </td>
                </tr>
                {data
                  .filter((budget) => !budget.budgetCategory)
                  .map((budget, idx) => (
                    <tr
                      className={`hover:bg-stone-100 rounded-md border-b border-stone-200 cursor-pointer ${selectedBudget === budget ? "bg-blue-50 hover:bg-blue-50" : ""}`}
                      key={idx}
                      onClick={() => setSelectedBudget(budget)}
                    >
                      <td className="p-1 pl-8 w-[64px] align-middle" {...stopPropagation}>
                        <Checkbox />
                      </td>
                      <td className="py-2 px-3 pr-2 text-sm align-middle">
                        <div className="flex items-center">
                          {budget.goal && (
                            <GoalIndicator
                              goal={budget.goal}
                              month={currentMonth}
                              className="mr-2"
                            />
                          )}
                          {budget.name}
                        </div>
                      </td>
                      {assignment ===
                      ledger.assignments.find(
                        (a) => a.budget === budget && isSameMonth(a.date!, currentMonth)
                      ) ? (
                        <td className="py-2 px-3 pr-2" {...stopPropagation}>
                          <AssignmentInput
                            assignment={assignment}
                            budget={budget}
                            ledger={ledger}
                            currentMonth={currentMonth}
                            onClose={() => setAssignment(null)}
                          />
                        </td>
                      ) : (
                        <td className="align-middle" {...stopPropagation}>
                          <button
                            type="button"
                            className="py-2 px-3 pr-2 text-sm"
                            onClick={() => {
                              let assignment = ledger.assignments.find(
                                (a) => a.budget === budget && isSameMonth(a.date!, currentMonth)
                              );
                              if (!assignment) {
                                assignment = new Assignment({
                                  ledger: ledger!,
                                  id: null,
                                });
                                assignment.budget = budget;
                                assignment.date = currentMonth;
                                assignment.amount = 0;
                                ledger.assignments.push(assignment);
                              }
                              setAssignment(assignment);
                            }}
                          >
                            <AmountCell
                              amount={ledger.budgetAssignedForMonth(budget, currentMonth)}
                            />
                          </button>
                        </td>
                      )}

                      <td className="align-middle" {...stopPropagation}>
                        <ActivityPopover
                          budget={budget}
                          currentMonth={currentMonth}
                          ledger={ledger}
                        />
                      </td>
                      <td className="py-2 pr-2" {...stopPropagation}>
                        <MoveMoneyPopover
                          sourceBudget={budget}
                          currentMonth={currentMonth}
                          ledger={ledger}
                        />
                      </td>
                    </tr>
                  ))}
              </Fragment>
            )}
            {/* Archived budgets toggle and section */}
            {archivedData.length > 0 && (
              <Fragment>
                <tr className="border-b border-stone-200">
                  <td className="p-1 pl-8 w-[64px]" />
                  <td colSpan={4} className="py-2 px-3 pr-2">
                    <button
                      type="button"
                      className="flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-700"
                      onClick={() => setShowArchived(!showArchived)}
                    >
                      <Archive size={14} />
                      {showArchived ? "Hide" : "Show"} archived ({archivedData.length})
                    </button>
                  </td>
                </tr>
                {showArchived &&
                  archivedData.map((budget, idx) => (
                    <tr
                      className={`hover:bg-stone-100 rounded-md border-b border-stone-200 cursor-pointer bg-stone-50/50 ${selectedBudget === budget ? "bg-blue-50 hover:bg-blue-50" : ""}`}
                      key={idx}
                      onClick={() => setSelectedBudget(budget)}
                    >
                      <td className="p-1 pl-8 w-[64px] align-middle" {...stopPropagation}>
                        <Checkbox />
                      </td>
                      <td className="py-2 px-3 pr-2 text-sm align-middle text-stone-500">
                        <div className="flex items-center">
                          {budget.goal && (
                            <GoalIndicator
                              goal={budget.goal}
                              month={currentMonth}
                              className="mr-2"
                            />
                          )}
                          {budget.name}
                        </div>
                      </td>
                      {assignment ===
                      ledger.assignments.find(
                        (a) => a.budget === budget && isSameMonth(a.date!, currentMonth)
                      ) ? (
                        <td className="py-2 px-3 pr-2" {...stopPropagation}>
                          <AssignmentInput
                            assignment={assignment}
                            budget={budget}
                            ledger={ledger}
                            currentMonth={currentMonth}
                            onClose={() => setAssignment(null)}
                          />
                        </td>
                      ) : (
                        <td className="align-middle" {...stopPropagation}>
                          <button
                            type="button"
                            className="py-2 px-3 pr-2 text-sm"
                            onClick={() => {
                              let assignment = ledger.assignments.find(
                                (a) => a.budget === budget && isSameMonth(a.date!, currentMonth)
                              );
                              if (!assignment) {
                                assignment = new Assignment({
                                  ledger: ledger!,
                                  id: null,
                                });
                                assignment.budget = budget;
                                assignment.date = currentMonth;
                                assignment.amount = 0;
                                ledger.assignments.push(assignment);
                              }
                              setAssignment(assignment);
                            }}
                          >
                            <AmountCell
                              amount={ledger.budgetAssignedForMonth(budget, currentMonth)}
                            />
                          </button>
                        </td>
                      )}
                      <td className="align-middle" {...stopPropagation}>
                        <ActivityPopover
                          budget={budget}
                          currentMonth={currentMonth}
                          ledger={ledger}
                        />
                      </td>
                      <td className="py-2 pr-2" {...stopPropagation}>
                        <MoveMoneyPopover
                          sourceBudget={budget}
                          currentMonth={currentMonth}
                          ledger={ledger}
                        />
                      </td>
                    </tr>
                  ))}
              </Fragment>
            )}
          </tbody>
        </table>
      </div>
      <BudgetPanel
        budget={selectedBudget}
        currentMonth={currentMonth}
        onClose={() => setSelectedBudget(null)}
      />
    </div>
  );
});
