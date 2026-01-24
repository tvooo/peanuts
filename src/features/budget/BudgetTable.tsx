import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { isSameMonth } from "date-fns";
import { Archive } from "lucide-react";
import { observer } from "mobx-react-lite";
import { Fragment, useMemo, useState } from "react";
import { AmountCell, HeaderCell } from "@/components/Table";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Assignment } from "@/models/Assignment";
import type { Budget } from "@/models/Budget";
import type { Ledger } from "@/models/Ledger";
import { formatCurrencyInput, parseCurrencyInput } from "@/utils/formatting";
import { EditBudgetModal } from "./EditBudgetModal";

// Component for editing assignment amount with text parsing
function AssignmentInput({ assignment, onClose }: { assignment: Assignment; onClose: () => void }) {
  const [value, setValue] = useState(() => formatCurrencyInput(assignment.amount));

  const handleBlur = () => {
    const parsed = parseCurrencyInput(value);
    assignment.setAmount(parsed);
    setValue(formatCurrencyInput(parsed));
  };

  return (
    <Input
      autoFocus
      type="text"
      className="tabular-nums text-right"
      value={value}
      onChange={(e) => setValue(e.target.value)}
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
  const [envelope, setEnvelope] = useState<Budget | null>(null);
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [showArchived, setShowArchived] = useState(false);

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
    <>
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
                    className="hover:bg-stone-100 rounded-md border-b border-stone-200 group"
                    key={idx}
                  >
                    <td className="p-1 pl-8 w-[64px] align-middle">
                      <Checkbox />
                    </td>
                    <td className="py-2 px-3 pr-2 text-sm align-middle">
                      <div className="flex items-center">
                        {/* {budget.isTarget && <Goal className="mr-2 w-3" />} */}
                        {budget.name}
                        <Button
                          className="opacity-0 group-hover:opacity-100 py-0 h-auto"
                          variant="link"
                          size="sm"
                          onClick={() => setEnvelope(budget)}
                        >
                          Edit
                        </Button>
                      </div>
                    </td>
                    {assignment ===
                    ledger.assignments.find(
                      (a) => a.budget === budget && isSameMonth(a.date!, currentMonth)
                    ) ? (
                      <td className="py-2 px-3 pr-2">
                        <AssignmentInput
                          assignment={assignment}
                          onClose={() => setAssignment(null)}
                        />
                      </td>
                    ) : (
                      <td className="align-middle">
                        <button
                          type="button"
                          className="py-2 px-3 pr-2 text-sm "
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

                    <td className="py-2 px-3 pr-2 text-sm">
                      <AmountCell amount={ledger.budgetActivityForMonth(budget, currentMonth)} />
                    </td>
                    <td className="py-2 pr-2">
                      <AmountCell
                        amount={ledger.budgetAvailableForMonth(budget, currentMonth)}
                        highlightNegativeAmount
                        chip
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
                    className="hover:bg-stone-100 rounded-md border-b border-stone-200 group"
                    key={idx}
                  >
                    <td className="p-1 pl-8 w-[64px] align-middle">
                      <Checkbox />
                    </td>
                    <td className="py-2 px-3 pr-2 text-sm align-middle">
                      <div className="flex items-center">
                        {budget.name}
                        <Button
                          className="opacity-0 group-hover:opacity-100 py-0 h-auto"
                          variant="link"
                          size="sm"
                          onClick={() => setEnvelope(budget)}
                        >
                          Edit
                        </Button>
                      </div>
                    </td>
                    {assignment ===
                    ledger.assignments.find(
                      (a) => a.budget === budget && isSameMonth(a.date!, currentMonth)
                    ) ? (
                      <td className="py-2 px-3 pr-2">
                        <AssignmentInput
                          assignment={assignment}
                          onClose={() => setAssignment(null)}
                        />
                      </td>
                    ) : (
                      <td className="align-middle">
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

                    <td className="py-2 px-3 pr-2 text-sm">
                      <AmountCell amount={ledger.budgetActivityForMonth(budget, currentMonth)} />
                    </td>
                    <td className="py-2 pr-2">
                      <AmountCell
                        amount={ledger.budgetAvailableForMonth(budget, currentMonth)}
                        highlightNegativeAmount
                        chip
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
                    className="hover:bg-stone-100 rounded-md border-b border-stone-200 group bg-stone-50/50"
                    key={idx}
                  >
                    <td className="p-1 pl-8 w-[64px] align-middle">
                      <Checkbox />
                    </td>
                    <td className="py-2 px-3 pr-2 text-sm align-middle text-stone-500">
                      <div className="flex items-center">
                        {budget.name}
                        <Button
                          className="opacity-0 group-hover:opacity-100 py-0 h-auto"
                          variant="link"
                          size="sm"
                          onClick={() => setEnvelope(budget)}
                        >
                          Edit
                        </Button>
                      </div>
                    </td>
                    {assignment ===
                    ledger.assignments.find(
                      (a) => a.budget === budget && isSameMonth(a.date!, currentMonth)
                    ) ? (
                      <td className="py-2 px-3 pr-2">
                        <AssignmentInput
                          assignment={assignment}
                          onClose={() => setAssignment(null)}
                        />
                      </td>
                    ) : (
                      <td className="align-middle">
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
                    <td className="py-2 px-3 pr-2 text-sm">
                      <AmountCell amount={ledger.budgetActivityForMonth(budget, currentMonth)} />
                    </td>
                    <td className="py-2 pr-2">
                      <AmountCell
                        amount={ledger.budgetAvailableForMonth(budget, currentMonth)}
                        highlightNegativeAmount
                        chip
                      />
                    </td>
                  </tr>
                ))}
            </Fragment>
          )}
        </tbody>
      </table>
      <EditBudgetModal envelope={envelope} setEnvelope={setEnvelope} />
    </>
  );
});
