import { AmountCell, HeaderCell } from "@/components/Table";
import { Ledger } from "@/models/Ledger";
import { Archery } from "iconoir-react";
import { Fragment } from "react";

interface BudgetTableProps {
  ledger: Ledger;
  currentMonth: Date;
  l: (s: string) => string
}

export function BudgetTable({ currentMonth, ledger, l }: BudgetTableProps) {
  return (
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
          <th>
            <HeaderCell alignRight>Available</HeaderCell>
          </th>
        </tr>
      </thead>
      <tbody>
        {Object.keys(ledger.budgetGroups).map((group) => (
          <Fragment key={group}>
            <tr>
                <td />
              <td colSpan={4} className="text-lg font-bold">{group}</td>
            </tr>
            {ledger.budgetGroups[group].map((budget, idx) => (
              <tr className="hover:bg-stone-100 rounded-md" key={idx}>
                <td className="p-1 px-2">
                  <input type="checkbox" />
                </td>
                <td className="p-0.5 flex items-center">
                  {budget.isTarget && <Archery className="mr-2 w-3" />}
                  {l(budget.name)}
                </td>
                <td>
                  <AmountCell
                    amount={ledger.budgetAssignedForMonth(budget, currentMonth)}
                  />
                </td>

                <td>
                  <AmountCell
                    amount={ledger.budgetActivityForMonth(budget, currentMonth)}
                  />
                </td>
                <td>
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
  );
}
