import { AmountCell, HeaderCell } from "@/components/Table";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Assignment } from "@/models/Assignment";
import { Budget } from "@/models/Budget";
import { Ledger } from "@/models/Ledger";
import { isSameMonth } from "date-fns";
import { observer } from "mobx-react-lite";
import { Fragment, useState } from "react";
import { EditBudgetModal } from "./EditBudgetModal";

interface BudgetTableProps {
  ledger: Ledger;
  currentMonth: Date;
}

export const BudgetTable = observer(function BudgetTable({ currentMonth, ledger }: BudgetTableProps) {
  const [envelope, setEnvelope] = useState<Budget | null>(null);
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  return (
    <>
      <table className="table w-full">
        <thead>
          <tr className="border-b border-stone-300">
            <th></th>
            <th>
              <HeaderCell>Budget</HeaderCell>
            </th>
            <th>
              <HeaderCell alignRight>Budgeted</HeaderCell>
            </th>
            <th>
              <HeaderCell alignRight>Activity</HeaderCell>
            </th>
            <th className="pr-8">
              <HeaderCell alignRight>Available</HeaderCell>
            </th>
          </tr>
        </thead>
        <tbody>
          {ledger.budgetCategories.map((budgetCategory) => (
            <Fragment key={budgetCategory.id}>
              <tr className="border-b border-stone-200 bg-stone-50">
                <td />
                <td colSpan={4} className="text-md pt-2 pb-2 font-bold">
                  {budgetCategory.name}
                </td>
              </tr>
              {ledger.budgets
                .filter((budget) => budget.budgetCategory === budgetCategory)
                .map((budget, idx) => (
                  <tr
                    className="hover:bg-stone-100 rounded-md border-b border-stone-200 group"
                    key={idx}
                  >
                    <td className="p-1 pl-8 w-[64px] align-middle">
                      <Checkbox />
                    </td>
                    <td className="align-middle">
                      <div className="p-0.5 flex items-center">
                        {/* {budget.isTarget && <Goal className="mr-2 w-3" />} */}
                        {budget.name}
                        <Button
                          className="hidden group-hover:inline-block"
                          variant="link"
                          size="sm"
                          onClick={() => setEnvelope(budget)}
                        >
                          Edit
                        </Button>
                      </div>
                    </td>
                    {assignment === ledger.assignments.find(
                            (a) =>
                              a.budget === budget &&
                              isSameMonth(a.date!, currentMonth)
                          ) ? (
                      <td>
                        <Input
                          autoFocus
                          type="number"
                          value={assignment.amount}
                          onChange={(e) => assignment.setAmount(parseInt(e.target.value, 10))}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === "Escape") {
                              setAssignment(null);
                            }
                          }}
                        />
                      </td>
                    ) : (
                      <td
                        className="align-middle"
                        onClick={() => {
                          let assignment = ledger.assignments.find(
                            (a) =>
                              a.budget === budget &&
                              isSameMonth(a.date!, currentMonth)
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
                          amount={ledger.budgetAssignedForMonth(
                            budget,
                            currentMonth
                          )}
                        />
                      </td>
                    )}

                    <td>
                      <AmountCell
                        amount={ledger.budgetActivityForMonth(
                          budget,
                          currentMonth
                        )}
                      />
                    </td>
                    <td className="py-2 pr-8">
                      <AmountCell
                        amount={ledger.budgetAvailableForMonth(
                          budget,
                          currentMonth
                        )}
                        highlightNegativeAmount
                        chip
                      />
                    </td>
                  </tr>
                ))}
            </Fragment>
          ))}
        </tbody>
      </table>
      <EditBudgetModal envelope={envelope} setEnvelope={setEnvelope} />
    </>
  );
})
